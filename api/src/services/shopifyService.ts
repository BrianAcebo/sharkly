/**
 * Shopify Admin API service
 * Handles OAuth token exchange and Admin API calls (blogs, articles).
 */

import crypto from 'crypto';
import { supabase } from '../utils/supabaseClient.js';

/** Collections are covered by read_products/write_products. read_collections/write_collections do not exist. */
const SHOPIFY_SCOPES = 'read_products,write_products,read_content,write_content';

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
	const shopDomain = cleanShop.endsWith('.myshopify.com')
		? cleanShop
		: `${cleanShop}.myshopify.com`;
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
	const shopDomain = cleanShop.endsWith('.myshopify.com')
		? cleanShop
		: `${cleanShop}.myshopify.com`;

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

const PENDING_TOKEN_TTL_MINUTES = 15;

/**
 * Store a pending Shopify token (companion app flow). Keyed by shop domain, 15 min TTL.
 * Used when OAuth completes before user has a Sharkly account — React page at /auth/shopify attaches it after login/signup.
 */
export async function savePendingShopifyToken(
	shopDomain: string,
	accessToken: string
): Promise<{ error?: string }> {
	const expiresAt = new Date(Date.now() + PENDING_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
	const { error } = await supabase
		.from('shopify_pending_tokens')
		.upsert(
			{ shop_domain: shopDomain, access_token: accessToken, expires_at: expiresAt },
			{ onConflict: 'shop_domain' }
		);
	if (error) {
		console.error('[Shopify] Failed to save pending token:', error);
		return { error: error.message };
	}
	return {};
}

/**
 * Consume a pending Shopify token for a shop (deletes after read). Returns token or null if expired/not found.
 */
export async function getAndConsumePendingShopifyToken(shopDomain: string): Promise<string | null> {
	const normalized = (shopDomain || '')
		.replace(/^https?:\/\//, '')
		.replace(/\/.*$/, '')
		.toLowerCase();
	const withMyshopify = normalized.endsWith('.myshopify.com')
		? normalized
		: `${normalized}.myshopify.com`;

	const { data, error } = await supabase
		.from('shopify_pending_tokens')
		.select('access_token, expires_at')
		.eq('shop_domain', withMyshopify)
		.single();

	if (error || !data) return null;
	if (new Date((data as { expires_at: string }).expires_at) < new Date()) return null;

	await supabase.from('shopify_pending_tokens').delete().eq('shop_domain', withMyshopify);

	return (data as { access_token: string }).access_token;
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
 * Clear Shopify connection by shop domain (for app uninstall / shop redact webhooks).
 * Preserves site and content; only nulls shopify_domain and shopify_access_token.
 */
export async function clearShopifyConnectionByDomain(
	shopDomain: string
): Promise<{ error?: string }> {
	const normalized = (shopDomain || '')
		.replace(/^https?:\/\//, '')
		.replace(/\/.*$/, '')
		.toLowerCase();
	const withMyshopify = normalized.endsWith('.myshopify.com')
		? normalized
		: `${normalized}.myshopify.com`;

	const { error } = await supabase
		.from('sites')
		.update({
			shopify_domain: null,
			shopify_access_token: null,
			updated_at: new Date().toISOString()
		})
		.eq('shopify_domain', withMyshopify);

	if (error) {
		console.error('[Shopify] clearShopifyConnectionByDomain error:', error);
		return { error: error.message };
	}
	return {};
}

/**
 * Shopify GraphQL Admin API (2024-01).
 * All Admin API calls use GraphQL only — required for App Store submission (April 2025+).
 */
async function shopifyGraphql<T>(
	shopDomain: string,
	accessToken: string,
	query: string,
	variables?: Record<string, unknown>
): Promise<T> {
	const url = `https://${shopDomain}/admin/api/2024-01/graphql.json`;
	const res = await fetch(url, {
		method: 'POST',
		headers: {
			'X-Shopify-Access-Token': accessToken,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ query, variables })
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Shopify GraphQL error: ${res.status} ${err}`);
	}

	const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
	if (json.errors?.length) {
		throw new Error(`Shopify GraphQL: ${json.errors.map((e) => e.message).join('; ')}`);
	}
	return json.data as T;
}

/** Parse GID to numeric id (e.g. gid://shopify/Product/123 -> 123) for backward compatibility */
function gidToId(gid: string): number {
	const m = /(\d+)$/.exec(gid);
	return m ? parseInt(m[1], 10) : 0;
}

/**
 * List blogs for a Shopify store (GraphQL)
 */
export async function listShopifyBlogs(
	shopDomain: string,
	accessToken: string
): Promise<{ id: string; title: string; handle: string }[]> {
	const data = await shopifyGraphql<{
		blogs: { nodes: Array<{ id: string; title: string; handle: string }> };
	}>(shopDomain, accessToken, `query { blogs(first: 250) { nodes { id title handle } } }`);
	return data.blogs?.nodes ?? [];
}

/**
 * Create a blog article in Shopify (GraphQL articleCreate)
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
	const blogGid = blogId.startsWith('gid://') ? blogId : `gid://shopify/Blog/${blogId}`;
	const data = await shopifyGraphql<{
		articleCreate: {
			article: { id: string; title: string; adminGraphqlApiId?: string } | null;
			userErrors: Array<{ message: string }>;
		};
	}>(
		shopDomain,
		accessToken,
		`mutation ArticleCreate($article: ArticleCreateInput!) {
      articleCreate(article: $article) {
        article { id title }
        userErrors { message }
      }
    }`,
		{
			article: {
				blogId: blogGid,
				title: article.title,
				body: article.body_html,
				author: { name: article.author ?? 'Sharkly' },
				tags: article.tags ?? undefined,
				metafields: [
					...(article.metafields_global_title_tag
						? [
								{
									namespace: 'global',
									key: 'title_tag',
									value: article.metafields_global_title_tag,
									type: 'single_line_text_field'
								}
							]
						: []),
					...(article.metafields_global_description_tag
						? [
								{
									namespace: 'global',
									key: 'description_tag',
									value: article.metafields_global_description_tag,
									type: 'single_line_text_field'
								}
							]
						: [])
				].filter(Boolean),
				isPublished: article.published ?? true
			}
		}
	);

	const result = data.articleCreate;
	if (result?.userErrors?.length) {
		throw new Error(result.userErrors.map((e) => e.message).join('; '));
	}
	if (!result?.article) throw new Error('No article in Shopify response');
	return {
		id: String(gidToId(result.article.id)),
		title: result.article.title,
		admin_graphql_api_id: result.article.id
	};
}

// --- Ecommerce SEO: products & collections (GraphQL) ---

export type DisplayMeta = {
	image_url?: string | null;
	image_alt?: string | null;
	price?: string | null;
	currency?: string | null;
	vendor?: string | null;
	product_type?: string | null;
	tags?: string[] | null;
};

export type ShopifyProductRow = {
	id: number;
	id_gid: string;
	title: string;
	body_html: string | null;
	handle: string;
	status: string;
	tags: string[];
	vendor: string | null;
	product_type: string | null;
	featured_image_url: string | null;
	featured_image_alt: string | null;
	price: string | null;
	currency: string | null;
	online_store_url: string | null;
	seo_title: string | null;
	seo_description: string | null;
	variant_count: number;
};

/**
 * List products for ecommerce import (GraphQL, first 250)
 */
export async function listShopifyProducts(
	shopDomain: string,
	accessToken: string
): Promise<ShopifyProductRow[]> {
	const data = await shopifyGraphql<{
		products: {
			edges: Array<{
				node: {
					id: string;
					title: string;
					descriptionHtml: string | null;
					handle: string;
					status: string;
					tags: string[];
					vendor: string | null;
					productType: string | null;
					featuredImage: { url: string; altText: string | null } | null;
					priceRangeV2: {
						minVariantPrice: { amount: string; currencyCode: string } | null;
					} | null;
					onlineStoreUrl: string | null;
					seo: { title: string | null; description: string | null };
					variantsCount: { count: number } | null;
				};
			}>;
		};
	}>(
		shopDomain,
		accessToken,
		`query { products(first: 250) { edges { node { id title descriptionHtml handle status tags vendor productType featuredImage { url altText } priceRangeV2 { minVariantPrice { amount currencyCode } } onlineStoreUrl seo { title description } variantsCount { count } } } } }`
	);
	const edges = data.products?.edges ?? [];
	return edges.map(({ node }) => ({
		id: gidToId(node.id),
		id_gid: node.id,
		title: node.title,
		body_html: node.descriptionHtml ?? null,
		handle: node.handle,
		status: node.status,
		tags: node.tags ?? [],
		vendor: node.vendor ?? null,
		product_type: node.productType ?? null,
		featured_image_url: node.featuredImage?.url ?? null,
		featured_image_alt: node.featuredImage?.altText ?? null,
		price: node.priceRangeV2?.minVariantPrice?.amount ?? null,
		currency: node.priceRangeV2?.minVariantPrice?.currencyCode ?? null,
		online_store_url: node.onlineStoreUrl ?? null,
		seo_title: node.seo?.title ?? null,
		seo_description: node.seo?.description ?? null,
		variant_count: node.variantsCount?.count ?? 0
	}));
}

export type ShopifyCollectionRow = {
	id: number;
	id_gid: string;
	title: string;
	body_html: string | null;
	handle: string;
	products_count: number;
	featured_image_url: string | null;
	featured_image_alt: string | null;
	seo_title: string | null;
	seo_description: string | null;
};

/**
 * List collections for ecommerce import (GraphQL unified collections, first 250)
 */
export async function listShopifyCollections(
	shopDomain: string,
	accessToken: string
): Promise<ShopifyCollectionRow[]> {
	const data = await shopifyGraphql<{
		collections: {
			edges: Array<{
				node: {
					id: string;
					title: string;
					descriptionHtml: string | null;
					handle: string;
					productsCount: { count: number } | null;
					image: { url: string; altText: string | null } | null;
					seo: { title: string | null; description: string | null };
				};
			}>;
		};
	}>(
		shopDomain,
		accessToken,
		`query { collections(first: 250) { edges { node { id title descriptionHtml handle productsCount { count } image { url altText } seo { title description } } } } }`
	);
	const edges = data.collections?.edges ?? [];
	return edges.map(({ node }) => ({
		id: gidToId(node.id),
		id_gid: node.id,
		title: node.title,
		body_html: node.descriptionHtml ?? null,
		handle: node.handle,
		products_count: node.productsCount?.count ?? 0,
		featured_image_url: node.image?.url ?? null,
		featured_image_alt: node.image?.altText ?? null,
		seo_title: node.seo?.title ?? null,
		seo_description: node.seo?.description ?? null
	}));
}

/** Product GID from numeric or string id */
function productGid(id: string): string {
	return id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`;
}

/** Collection GID from numeric or string id */
function collectionGid(id: string): string {
	return id.startsWith('gid://') ? id : `gid://shopify/Collection/${id}`;
}

/**
 * Fetch a single product by GID (for sync)
 */
export async function getShopifyProductByGid(
	shopDomain: string,
	accessToken: string,
	gid: string
): Promise<ShopifyProductRow | null> {
	const data = await shopifyGraphql<{
		product: {
			id: string;
			title: string;
			descriptionHtml: string | null;
			handle: string;
			status: string;
			tags: string[];
			vendor: string | null;
			productType: string | null;
			featuredImage: { url: string; altText: string | null } | null;
			priceRangeV2: { minVariantPrice: { amount: string; currencyCode: string } | null } | null;
			onlineStoreUrl: string | null;
			seo: { title: string | null; description: string | null };
			variantsCount: { count: number } | null;
		} | null;
	}>(
		shopDomain,
		accessToken,
		`query($id: ID!) { product(id: $id) { id title descriptionHtml handle status tags vendor productType featuredImage { url altText } priceRangeV2 { minVariantPrice { amount currencyCode } } onlineStoreUrl seo { title description } variantsCount { count } } }`,
		{ id: gid.startsWith('gid://') ? gid : productGid(gid) }
	);
	const node = data.product;
	if (!node) return null;
	return {
		id: gidToId(node.id),
		id_gid: node.id,
		title: node.title,
		body_html: node.descriptionHtml ?? null,
		handle: node.handle,
		status: node.status,
		tags: node.tags ?? [],
		vendor: node.vendor ?? null,
		product_type: node.productType ?? null,
		featured_image_url: node.featuredImage?.url ?? null,
		featured_image_alt: node.featuredImage?.altText ?? null,
		price: node.priceRangeV2?.minVariantPrice?.amount ?? null,
		currency: node.priceRangeV2?.minVariantPrice?.currencyCode ?? null,
		online_store_url: node.onlineStoreUrl ?? null,
		seo_title: node.seo?.title ?? null,
		seo_description: node.seo?.description ?? null,
		variant_count: node.variantsCount?.count ?? 0
	};
}

/**
 * Fetch a single collection by GID (for sync)
 */
export async function getShopifyCollectionByGid(
	shopDomain: string,
	accessToken: string,
	gid: string
): Promise<ShopifyCollectionRow | null> {
	const data = await shopifyGraphql<{
		collection: {
			id: string;
			title: string;
			descriptionHtml: string | null;
			handle: string;
			productsCount: { count: number } | null;
			image: { url: string; altText: string | null } | null;
			seo: { title: string | null; description: string | null };
		} | null;
	}>(
		shopDomain,
		accessToken,
		`query($id: ID!) { collection(id: $id) { id title descriptionHtml handle productsCount { count } image { url altText } seo { title description } } }`,
		{ id: gid.startsWith('gid://') ? gid : collectionGid(gid) }
	);
	const node = data.collection;
	if (!node) return null;
	return {
		id: gidToId(node.id),
		id_gid: node.id,
		title: node.title,
		body_html: node.descriptionHtml ?? null,
		handle: node.handle,
		products_count: node.productsCount?.count ?? 0,
		featured_image_url: node.image?.url ?? null,
		featured_image_alt: node.image?.altText ?? null,
		seo_title: node.seo?.title ?? null,
		seo_description: node.seo?.description ?? null
	};
}

/**
 * Update product descriptionHtml, SEO, and optional handle (GraphQL productUpdate)
 */
export async function updateShopifyProduct(
	shopDomain: string,
	accessToken: string,
	productId: string,
	payload: {
		body_html: string;
		meta_title?: string | null;
		meta_description?: string | null;
		handle?: string;
	}
): Promise<void> {
	const product: Record<string, unknown> = {
		id: productGid(productId),
		descriptionHtml: payload.body_html
	};
	if (payload.handle != null && payload.handle.trim()) {
		product.handle = payload.handle.trim();
		product.redirectNewHandle = true;
	}
	if (payload.meta_title != null || payload.meta_description != null) {
		product.seo = {
			title: payload.meta_title ?? '',
			description: payload.meta_description ?? ''
		};
	}
	const data = await shopifyGraphql<{
		productUpdate: {
			product: {
				id: string;
				handle: string;
				descriptionHtml: string | null;
				seo: { title: string | null; description: string | null } | null;
				updatedAt: string;
			} | null;
			userErrors: Array<{ message: string }>;
		};
	}>(
		shopDomain,
		accessToken,
		`mutation ProductUpdate($product: ProductUpdateInput!) {
		  productUpdate(product: $product) {
			product {
			  id
			  handle
			  descriptionHtml
			  seo {
				title
				description
			  }
			  updatedAt
			}
			userErrors {
			  message
			}
		  }
		}`,
		{ product }
	);
	if (data.productUpdate?.userErrors?.length) {
		throw new Error(data.productUpdate.userErrors.map((e) => e.message).join('; '));
	}
}

/**
 * Update collection descriptionHtml, SEO, and optional handle (GraphQL collectionUpdate)
 */
export async function updateShopifyCollection(
	shopDomain: string,
	accessToken: string,
	collectionId: string,
	payload: {
		body_html: string;
		meta_title?: string;
		meta_description?: string;
		handle?: string;
	}
): Promise<void> {
	const collection: Record<string, unknown> = {
		id: collectionGid(collectionId),
		descriptionHtml: payload.body_html
	};
	if (payload.handle != null && payload.handle.trim()) {
		collection.handle = payload.handle.trim();
		collection.redirectNewHandle = true;
	}
	if (payload.meta_title != null || payload.meta_description != null) {
		collection.seo = {
			title: payload.meta_title ?? '',
			description: payload.meta_description ?? ''
		};
	}
	const data = await shopifyGraphql<{
		collectionUpdate: { userErrors: Array<{ message: string }> };
	}>(
		shopDomain,
		accessToken,
		`mutation CollectionUpdate($collection: CollectionInput!) {
      collectionUpdate(collection: $collection) {
        userErrors { message }
      }
    }`,
		{ collection }
	);
	if (data.collectionUpdate?.userErrors?.length) {
		throw new Error(data.collectionUpdate.userErrors.map((e) => e.message).join('; '));
	}
}
