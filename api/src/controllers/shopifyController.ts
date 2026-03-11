/**
 * Shopify Controller
 * OAuth flow, connection status, and publish to Shopify blog.
 */

import { Request, Response } from 'express';
import {
	verifyShopifyHmac,
	getShopifyAuthUrl,
	exchangeShopifyCode,
	saveShopifyConnection,
	getShopifyToken,
	disconnectShopify,
	listShopifyBlogs,
	createShopifyArticle
} from '../services/shopifyService.js';
import { generateRandomString } from '../utils/helpers.js';

const oauthStates = new Map<string, { siteId: string; createdAt: number }>();

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanupExpiredStates() {
	for (const [key, value] of oauthStates.entries()) {
		if (Date.now() - value.createdAt > STATE_TTL_MS) oauthStates.delete(key);
	}
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
		oauthStates.set(state, { siteId, createdAt: Date.now() });
		cleanupExpiredStates();

		const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
		const redirectUri = `${backendUrl}/api/shopify/oauth/callback`;

		const authUrl = getShopifyAuthUrl(shop, state, redirectUri);
		res.redirect(authUrl);
	} catch (error) {
		console.error('[Shopify] OAuth start error:', error);
		res.status(500).json({ error: error instanceof Error ? error.message : 'OAuth failed' });
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
			res.redirect(`${frontendUrl}/settings/integrations?shopify_error=missing_params`);
			return;
		}

		const stateData = oauthStates.get(state);
		if (!stateData) {
			res.redirect(`${frontendUrl}/settings/integrations?shopify_error=invalid_state`);
			return;
		}
		oauthStates.delete(state);

		const secret = process.env.SHOPIFY_API_SECRET;
		if (!secret) {
			console.error('[Shopify] SHOPIFY_API_SECRET not configured');
			res.redirect(`${frontendUrl}/settings/integrations?shopify_error=config`);
			return;
		}

		const params = { code, shop, state, ...(req.query as Record<string, string>) };
		if (!verifyShopifyHmac(params, hmac, secret)) {
			res.redirect(`${frontendUrl}/settings/integrations?shopify_error=hmac_invalid`);
			return;
		}

		const { access_token } = await exchangeShopifyCode(shop, code);

		const shopDomain = shop.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
		const finalDomain = shopDomain.endsWith('.myshopify.com') ? shopDomain : `${shopDomain}.myshopify.com`;

		const { error } = await saveShopifyConnection(stateData.siteId, finalDomain, access_token);
		if (error) {
			res.redirect(`${frontendUrl}/settings/integrations?shopify_error=save_failed`);
			return;
		}

		res.redirect(`${frontendUrl}/settings/integrations?shopify_success=1&siteId=${stateData.siteId}`);
	} catch (error) {
		console.error('[Shopify] OAuth callback error:', error);
		const msg = encodeURIComponent(error instanceof Error ? error.message : 'Unknown error');
		res.redirect(`${frontendUrl}/settings/integrations?shopify_error=${msg}`);
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
