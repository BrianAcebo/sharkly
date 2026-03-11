/**
 * Shopify Admin API service
 * Handles OAuth token exchange and Admin API calls (blogs, articles).
 */

import crypto from 'crypto';
import { supabase } from '../utils/supabaseClient.js';

const SHOPIFY_SCOPES =
	'read_products,write_products,read_product_listings,' +
	'read_collections,write_collections,' +
	'read_online_store_pages,write_online_store_pages,' +
	'read_content,write_content';

/**
 * Verify HMAC from Shopify OAuth callback.
 * Message = sorted query params (excluding hmac) as key=value&key=value
 */
export function verifyShopifyHmac(
	params: Record<string, string>,
	hmac: string,
	secret: string
): boolean {
	const message = Object.keys(params)
		.filter((k) => k !== 'hmac')
		.sort()
		.map((k) => `${k}=${params[k]}`)
		.join('&');
	const computed = crypto.createHmac('sha256', secret).update(message).digest('hex');
	return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(computed, 'hex'));
}

/**
 * Redirect URL for Shopify OAuth authorize
 */
export function getShopifyAuthUrl(shop: string, state: string, redirectUri: string): string {
	const clientId = process.env.SHOPIFY_API_KEY || '';
	const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
	const shopDomain = cleanShop.endsWith('.myshopify.com') ? cleanShop : `${cleanShop}.myshopify.com`;
	const params = new URLSearchParams({
		client_id: clientId,
		scope: SHOPIFY_SCOPES,
		redirect_uri: redirectUri,
		state
	});
	return `https://${shopDomain}/admin/oauth/authorize?${params}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeShopifyCode(
	shop: string,
	code: string
): Promise<{ access_token: string }> {
	const cleanShop = shop.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
	const shopDomain = cleanShop.endsWith('.myshopify.com') ? cleanShop : `${cleanShop}.myshopify.com`;

	const res = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			client_id: process.env.SHOPIFY_API_KEY,
			client_secret: process.env.SHOPIFY_API_SECRET,
			code
		})
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Shopify token exchange failed: ${err}`);
	}

	const data = (await res.json()) as { access_token: string };
	if (!data.access_token) throw new Error('No access_token in Shopify response');
	return data;
}

/**
 * Save Shopify connection to site
 */
export async function saveShopifyConnection(
	siteId: string,
	shopDomain: string,
	accessToken: string
): Promise<{ error?: string }> {
	const { error } = await supabase
		.from('sites')
		.update({
			shopify_domain: shopDomain,
			shopify_access_token: accessToken,
			updated_at: new Date().toISOString()
		})
		.eq('id', siteId);

	if (error) {
		console.error('[Shopify] Failed to save connection:', error);
		return { error: error.message };
	}
	return {};
}

/**
 * Get Shopify access token for a site
 */
export async function getShopifyToken(siteId: string): Promise<{
	shopDomain: string | null;
	accessToken: string | null;
}> {
	const { data, error } = await supabase
		.from('sites')
		.select('shopify_domain, shopify_access_token')
		.eq('id', siteId)
		.single();

	if (error || !data) return { shopDomain: null, accessToken: null };
	return {
		shopDomain: (data as { shopify_domain?: string }).shopify_domain ?? null,
		accessToken: (data as { shopify_access_token?: string }).shopify_access_token ?? null
	};
}

/**
 * Disconnect Shopify from site
 */
export async function disconnectShopify(siteId: string): Promise<{ error?: string }> {
	const { error } = await supabase
		.from('sites')
		.update({
			shopify_domain: null,
			shopify_access_token: null,
			updated_at: new Date().toISOString()
		})
		.eq('id', siteId);

	if (error) return { error: error.message };
	return {};
}

/**
 * Shopify Admin API request helper
 */
async function shopifyAdminRequest<T>(
	shopDomain: string,
	accessToken: string,
	path: string,
	options: RequestInit = {}
): Promise<T> {
	const url = `https://${shopDomain}/admin/api/2024-01${path}`;
	const res = await fetch(url, {
		...options,
		headers: {
			'X-Shopify-Access-Token': accessToken,
			'Content-Type': 'application/json',
			...(options.headers as Record<string, string>)
		}
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Shopify API error: ${res.status} ${err}`);
	}

	return res.json() as Promise<T>;
}

/**
 * List blogs for a Shopify store
 */
export async function listShopifyBlogs(
	shopDomain: string,
	accessToken: string
): Promise<{ id: string; title: string; handle: string }[]> {
	const data = (await shopifyAdminRequest<{ blogs: Array<{ id: string; title: string; handle: string }> }>(
		shopDomain,
		accessToken,
		'/blogs.json?limit=250'
	)) as { blogs?: Array<{ id: string; title: string; handle: string }> };
	return data.blogs ?? [];
}

/**
 * Create a blog article in Shopify
 */
export async function createShopifyArticle(
	shopDomain: string,
	accessToken: string,
	blogId: string,
	article: {
		title: string;
		body_html: string;
		author?: string;
		tags?: string;
		metafields_global_title_tag?: string;
		metafields_global_description_tag?: string;
		published?: boolean;
	}
): Promise<{ id: string; title: string; admin_graphql_api_id: string }> {
	const payload = {
		article: {
			title: article.title,
			body_html: article.body_html,
			author: article.author ?? 'Sharkly',
			tags: article.tags ?? '',
			metafields_global_title_tag: article.metafields_global_title_tag,
			metafields_global_description_tag: article.metafields_global_description_tag,
			published: article.published ?? true
		}
	};

	const data = (await shopifyAdminRequest<{
		article: { id: string; title: string; admin_graphql_api_id: string };
	}>(shopDomain, accessToken, `/blogs/${blogId}/articles.json`, {
		method: 'POST',
		body: JSON.stringify(payload)
	})) as { article?: { id: string; title: string; admin_graphql_api_id: string } };

	if (!data.article) throw new Error('No article in Shopify response');
	return data.article;
}
