/**
 * Shopify Controller
 * OAuth flow, connection status, and publish to Shopify blog.
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import {
	verifyShopifyHmac,
	getShopifyAuthUrl,
	exchangeShopifyCode,
	saveShopifyConnection,
	savePendingShopifyToken,
	getAndConsumePendingShopifyToken,
	getShopifyToken,
	disconnectShopify,
	listShopifyBlogs,
	createShopifyArticle
} from '../services/shopifyService.js';
import { generateRandomString } from '../utils/helpers.js';

const STATE_TTL_MS = 20 * 60 * 1000; // 20 minutes (covers slow install, cold starts)

/** Normalize shop param to *.myshopify.com (lowercase) for DB lookups */
function normalizeShopifyShopDomain(shop: string): string {
	const shopDomain = (shop || '')
		.replace(/^https?:\/\//, '')
		.replace(/\/.*$/, '')
		.toLowerCase();
	return shopDomain.endsWith('.myshopify.com')
		? shopDomain
		: `${shopDomain}.myshopify.com`;
}

function getShopifyRedirectUri(): string {
	const uri = process.env.SHOPIFY_REDIRECT_URI;
	if (uri) return uri;
	const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
	return `${backendUrl}/auth/shopify/callback`;
}

async function saveOAuthState(state: string, siteId: string | null): Promise<void> {
	await supabase.from('shopify_oauth_states').insert({ state, site_id: siteId });
	// Clean up expired rows occasionally (fire-and-forget)
	supabase.from('shopify_oauth_states').delete().lt('created_at', new Date(Date.now() - STATE_TTL_MS).toISOString()).then(() => {});
}

async function consumeOAuthState(state: string): Promise<{ siteId: string | null } | null> {
	const cutoff = new Date(Date.now() - STATE_TTL_MS).toISOString();
	const { data, error } = await supabase
		.from('shopify_oauth_states')
		.select('site_id')
		.eq('state', state)
		.gte('created_at', cutoff)
		.maybeSingle();
	if (error || !data) return null;
	await supabase.from('shopify_oauth_states').delete().eq('state', state);
	return { siteId: (data.site_id as string | null) ?? null };
}

/**
 * GET /api/shopify/oauth/start
 * Start Shopify OAuth. Requires siteId and shop (e.g. mystore or mystore.myshopify.com).
 */
export async function startShopifyOAuth(req: Request, res: Response): Promise<void> {
	try {
		const { siteId, shop } = req.query;

		if (!siteId || typeof siteId !== 'string') {
			res.status(400).json({ error: 'Missing siteId' });
			return;
		}

		if (!shop || typeof shop !== 'string') {
			res.status(400).json({ error: 'Missing shop. Provide your Shopify store (e.g. mystore or mystore.myshopify.com)' });
			return;
		}

		const state = generateRandomString(32);
		await saveOAuthState(state, siteId);

		const redirectUri = getShopifyRedirectUri();
		const authUrl = getShopifyAuthUrl(shop, state, redirectUri);
		res.redirect(authUrl);
	} catch (error) {
		console.error('[Shopify] OAuth start error:', error);
		res.status(500).json({ error: error instanceof Error ? error.message : 'OAuth failed' });
	}
}

/**
 * GET /auth/shopify/install?shop=store.myshopify.com
 * Companion app: start OAuth without siteId. Callback stores pending token and redirects to app.sharkly.co/auth/shopify.
 */
export async function startShopifyOAuthInstall(req: Request, res: Response): Promise<void> {
	try {
		const shop = (req.query.shop as string)?.trim();
		if (!shop) {
			const appUrl = process.env.FRONTEND_URL || 'https://app.sharkly.co';
			res.redirect(`${appUrl}/signup`);
			return;
		}

		const state = generateRandomString(32);
		await saveOAuthState(state, null);

		const redirectUri = getShopifyRedirectUri();
		const authUrl = getShopifyAuthUrl(shop, state, redirectUri);
		res.redirect(authUrl);
	} catch (error) {
		console.error('[Shopify] OAuth install error:', error);
		const appUrl = process.env.FRONTEND_URL || 'https://app.sharkly.co';
		res.redirect(`${appUrl}/signup?shopify_error=oauth_failed`);
	}
}

/**
 * GET /api/shopify/oauth/callback
 * Shopify OAuth callback. Verifies HMAC, exchanges code for token, saves to site.
 */
export async function handleShopifyOAuthCallback(req: Request, res: Response): Promise<void> {
	const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

	try {
		const { code, shop, hmac, state } = req.query as Record<string, string>;

		if (!code || !shop || !hmac || !state) {
			res.redirect(`${frontendUrl}/sites?shopify_error=missing_params`);
			return;
		}

		const stateData = await consumeOAuthState(state);
		if (!stateData) {
			const appUrl = process.env.FRONTEND_URL || 'https://app.sharkly.co';
			const shopDomain = (shop || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
			const finalDomain = shopDomain.endsWith('.myshopify.com') ? shopDomain : `${shopDomain}.myshopify.com`;
			const query = new URLSearchParams({ shopify_error: 'invalid_state' });
			if (finalDomain) query.set('shopify_store', finalDomain);
			res.redirect(`${appUrl}/signup?${query.toString()}`);
			return;
		}

		const secret = process.env.SHOPIFY_API_SECRET;
		if (!secret) {
			console.error('[Shopify] SHOPIFY_API_SECRET not configured');
			res.redirect(`${frontendUrl}/sites?shopify_error=config`);
			return;
		}

		const params = { code, shop, state, ...(req.query as Record<string, string>) };
		if (!verifyShopifyHmac(params, hmac, secret)) {
			res.redirect(`${frontendUrl}/sites?shopify_error=hmac_invalid`);
			return;
		}

		const { access_token } = await exchangeShopifyCode(shop, code);

		const shopDomain = shop.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
		const finalDomain = shopDomain.endsWith('.myshopify.com') ? shopDomain : `${shopDomain}.myshopify.com`;

		const appUrl = process.env.FRONTEND_URL || 'https://app.sharkly.co';

		// Companion flow: no siteId → store pending token, redirect to auth/shopify for login/signup
		if (!stateData.siteId) {
			const { error } = await savePendingShopifyToken(finalDomain, access_token);
			if (error) {
				res.redirect(`${appUrl}/signup?shopify_error=save_failed`);
				return;
			}
			res.redirect(`${appUrl}/auth/shopify?shop=${encodeURIComponent(finalDomain)}`);
			return;
		}

		const { error } = await saveShopifyConnection(stateData.siteId, finalDomain, access_token);
		if (error) {
			res.redirect(`${frontendUrl}/sites?shopify_error=save_failed`);
			return;
		}

		res.redirect(`${frontendUrl}/sites?shopify_success=1&siteId=${stateData.siteId}`);
	} catch (error) {
		console.error('[Shopify] OAuth callback error:', error);
		const msg = encodeURIComponent(error instanceof Error ? error.message : 'Unknown error');
		res.redirect(`${frontendUrl}/sites?shopify_error=${msg}`);
	}
}

/**
 * GET /api/shopify/app-redirect?shop=store.myshopify.com
 * For new App Store installs: when merchant opens the app in Shopify Admin (no embedded UI),
 * redirect them to signup so they can create a Sharkly account and connect.
 */
export async function shopifyAppRedirect(req: Request, res: Response): Promise<void> {
	const shop = (req.query.shop as string)?.trim();
	const marketingUrl = process.env.MARKETING_URL || process.env.FRONTEND_URL || 'https://sharkly.co';
	const signupUrl = shop
		? `${marketingUrl.replace(/\/$/, '')}/signup?shopify_store=${encodeURIComponent(shop)}`
		: `${marketingUrl.replace(/\/$/, '')}/signup`;
	res.redirect(302, signupUrl);
}

/**
 * GET /api/shopify/site-for-shop?shop=store.myshopify.com
 * If the user's org already has a site linked to this Shopify domain, return its id (skip OAuth / site picker).
 */
export async function getShopifySiteForShop(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const shop = (req.query.shop as string)?.trim();
		const finalDomain = normalizeShopifyShopDomain(shop);
		if (!finalDomain) {
			res.status(400).json({ error: 'Missing shop' });
			return;
		}

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg?.organization_id) {
			res.json({ siteId: null });
			return;
		}

		const { data: site } = await supabase
			.from('sites')
			.select('id')
			.eq('organization_id', userOrg.organization_id)
			.ilike('shopify_domain', finalDomain)
			.maybeSingle();

		res.json({ siteId: site ? (site as { id: string }).id : null });
	} catch (error) {
		console.error('[Shopify] site-for-shop error:', error);
		res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
	}
}

/**
 * POST /api/shopify/reconcile-companion
 * After companion OAuth: if this shop is already linked to a site in the user's org, apply pending token (if any) and return siteId.
 * Otherwise { siteId: null } — client shows site picker for a new shop.
 */
export async function reconcileCompanionShopify(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const { shop } = req.body as { shop?: string };
		const finalDomain = normalizeShopifyShopDomain(shop || '');
		if (!finalDomain) {
			res.status(400).json({ error: 'Missing shop' });
			return;
		}

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg?.organization_id) {
			res.json({ siteId: null });
			return;
		}

		const { data: site } = await supabase
			.from('sites')
			.select('id')
			.eq('organization_id', userOrg.organization_id)
			.ilike('shopify_domain', finalDomain)
			.maybeSingle();

		if (!site) {
			res.json({ siteId: null });
			return;
		}

		const siteId = (site as { id: string }).id;
		const accessToken = await getAndConsumePendingShopifyToken(finalDomain);
		if (accessToken) {
			const { error } = await saveShopifyConnection(siteId, finalDomain, accessToken);
			if (error) {
				res.status(500).json({ error });
				return;
			}
		}

		res.json({ siteId });
	} catch (error) {
		console.error('[Shopify] reconcile-companion error:', error);
		res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
	}
}

/**
 * POST /api/shopify/attach-pending
 * Consume a pending Shopify token (from companion app install) and attach to a site.
 * Body: { shop: string, siteId?: string, createNew?: boolean }
 * - If siteId provided: must belong to user's org
 * - If createNew: create a new site for the Shopify store (user chose "Create new site")
 * - If no siteId and no createNew: use first site, or create one if user has org but no sites
 * - If no org: returns needs_onboarding
 */
export async function attachPendingShopifyToken(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const { shop, siteId: providedSiteId, createNew } = req.body as {
			shop?: string;
			siteId?: string;
			createNew?: boolean;
		};
		const shopDomain = (shop || '')
			.replace(/^https?:\/\//, '')
			.replace(/\/.*$/, '')
			.toLowerCase();
		const finalDomain = shopDomain.endsWith('.myshopify.com')
			? shopDomain
			: `${shopDomain}.myshopify.com`;

		if (!finalDomain) {
			res.status(400).json({ error: 'Missing shop' });
			return;
		}

		const accessToken = await getAndConsumePendingShopifyToken(finalDomain);
		if (!accessToken) {
			res.status(400).json({
				error: 'Token expired or not found. Please reconnect from Settings → Integrations.',
				code: 'token_expired'
			});
			return;
		}

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg?.organization_id) {
			res.status(403).json({
				error: 'Complete billing setup first to connect your store.',
				needs_onboarding: true
			});
			return;
		}

		const orgId = userOrg.organization_id;
		let targetSiteId: string | null = null;

		if (providedSiteId) {
			const { data: site } = await supabase
				.from('sites')
				.select('id')
				.eq('id', providedSiteId)
				.eq('organization_id', orgId)
				.single();
			if (site) targetSiteId = site.id;
		}

		if (!targetSiteId && !createNew) {
			const { data: sites } = await supabase
				.from('sites')
				.select('id')
				.eq('organization_id', orgId)
				.limit(1);
			if (sites && sites.length > 0) {
				targetSiteId = (sites[0] as { id: string }).id;
			}
		}

		if (!targetSiteId) {
			const { data: newSite, error: createErr } = await supabase
				.from('sites')
				.insert({
					organization_id: orgId,
					name: finalDomain.replace('.myshopify.com', ''),
					url: `https://${finalDomain}`,
					platform: 'shopify'
				})
				.select('id')
				.single();

			if (createErr || !newSite) {
				console.error('[Shopify] Failed to create site for attach:', createErr);
				res.status(500).json({ error: 'Failed to create site' });
				return;
			}
			targetSiteId = (newSite as { id: string }).id;
		}

		const { error } = await saveShopifyConnection(targetSiteId!, finalDomain, accessToken);
		if (error) {
			res.status(500).json({ error });
			return;
		}

		res.json({ success: true, siteId: targetSiteId });
	} catch (error) {
		console.error('[Shopify] Attach pending error:', error);
		res.status(500).json({
			error: error instanceof Error ? error.message : 'Failed to attach token'
		});
	}
}

/**
 * GET /api/shopify/status/:siteId
 * Get Shopify connection status for a site. Requires auth + org access.
 */
export async function getShopifyStatus(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;
		if (!siteId) {
			res.status(400).json({ error: 'Missing siteId' });
			return;
		}

		const { shopDomain } = await getShopifyToken(siteId);
		res.json({ connected: !!shopDomain, shopDomain: shopDomain ?? null });
	} catch (error) {
		console.error('[Shopify] Status error:', error);
		res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
	}
}

/**
 * POST /api/shopify/disconnect/:siteId
 * Disconnect Shopify from a site.
 */
export async function postShopifyDisconnect(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;
		if (!siteId) {
			res.status(400).json({ error: 'Missing siteId' });
			return;
		}

		const { error } = await disconnectShopify(siteId);
		if (error) {
			res.status(500).json({ error });
			return;
		}
		res.json({ success: true });
	} catch (error) {
		console.error('[Shopify] Disconnect error:', error);
		res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
	}
}

/**
 * GET /api/shopify/blogs/:siteId
 * List blogs for a connected Shopify store.
 */
export async function getShopifyBlogs(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;
		const { shopDomain, accessToken } = await getShopifyToken(siteId);

		if (!shopDomain || !accessToken) {
			res.status(400).json({ error: 'Shopify not connected for this site' });
			return;
		}

		const blogs = await listShopifyBlogs(shopDomain, accessToken);
		res.json({ blogs });
	} catch (error) {
		console.error('[Shopify] List blogs error:', error);
		res.status(500).json({ error: error instanceof Error ? error.message : 'Failed' });
	}
}

/**
 * POST /api/shopify/publish/:siteId
 * Publish an article to Shopify blog.
 * Body: { blogId, title, body_html, author?, tags?, meta_title?, meta_description?, published? }
 */
export async function publishToShopify(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;
		const { shopDomain, accessToken } = await getShopifyToken(siteId);

		if (!shopDomain || !accessToken) {
			res.status(400).json({ error: 'Shopify not connected for this site' });
			return;
		}

		const {
			blogId,
			title,
			body_html,
			author,
			tags,
			meta_title,
			meta_description,
			published = true
		} = req.body;

		if (!blogId || !title || !body_html) {
			res.status(400).json({ error: 'Missing blogId, title, or body_html' });
			return;
		}

		const article = await createShopifyArticle(shopDomain, accessToken, blogId, {
			title,
			body_html,
			author: author ?? undefined,
			tags: tags ?? undefined,
			metafields_global_title_tag: meta_title,
			metafields_global_description_tag: meta_description,
			published
		});

		res.json({
			success: true,
			article: {
				id: article.id,
				title: article.title,
				admin_graphql_api_id: article.admin_graphql_api_id
			}
		});
	} catch (error) {
		console.error('[Shopify] Publish error:', error);
		res.status(500).json({ error: error instanceof Error ? error.message : 'Publish failed' });
	}
}
