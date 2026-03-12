/**
 * Ecommerce SEO Controller (L6b)
 * Product and collection page SEO: generate descriptions, schema, publish to Shopify.
 * Isolated — does not touch pages.ts or Workspace. New file only.
 */

import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import { supabase } from '../utils/supabaseClient.js';
import { CREDIT_COSTS } from '../../../shared/credits.mjs';
import { serperSearch } from '../utils/serper.js';
import { fetchCompetitorPages } from '../utils/competitorFetch.js';
import {
	getShopifyToken,
	listShopifyProducts,
	listShopifyCollections,
	updateShopifyProduct,
	updateShopifyCollection
} from '../services/shopifyService.js';
import { maybeNotifyCreditsLow } from '../utils/notifications.js';

const GPT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Minimal HTML -> Tiptap JSON (p, ul, li, strong) for ecommerce descriptions */
function htmlToTiptap(html: string): { type: 'doc'; content: unknown[] } {
	const content: unknown[] = [];
	const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
	let m;
	while ((m = pRegex.exec(html)) !== null) {
		const inner = (m[1] ?? '').replace(/<br\s*\/?>/gi, '\n');
		const text = inner.replace(/<strong>([\s\S]*?)<\/strong>/gi, '$1').replace(/<[^>]+>/g, '').trim();
		if (text) content.push({ type: 'paragraph', content: [{ type: 'text', text }] });
	}
	const ulRegex = /<ul[^>]*>([\s\S]*?)<\/ul>/gi;
	while ((m = ulRegex.exec(html)) !== null) {
		const inner = m[1] ?? '';
		const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
		const items: unknown[] = [];
		let liM;
		while ((liM = liRegex.exec(inner)) !== null) {
			const t = (liM[1] ?? '').replace(/<[^>]+>/g, ' ').trim();
			if (t) items.push({ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] });
		}
		if (items.length > 0) content.push({ type: 'bulletList', content: items });
	}
	if (content.length === 0) content.push({ type: 'paragraph', content: [] });
	return { type: 'doc', content };
}

/** Extract HTML from Tiptap doc for publish (minimal: paragraph text and list items) */
function tiptapToHtml(doc: unknown): string {
	if (!doc || typeof doc !== 'object') return '';
	const d = doc as { content?: unknown[] };
	if (!Array.isArray(d.content)) return '';
	const parts: string[] = [];
	for (const node of d.content) {
		const n = node as { type?: string; content?: unknown[] };
		if (n.type === 'paragraph') {
			const text = (n.content ?? []).map((c) => ((c as { text?: string }).text ?? '')).join('');
			if (text) parts.push(`<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`);
		} else if (n.type === 'bulletList') {
			parts.push('<ul>');
			for (const li of n.content ?? []) {
				const lic = (li as { content?: unknown[] }).content ?? [];
				const p = lic.find((x) => (x as { type?: string }).type === 'paragraph');
				const text = Array.isArray((p as { content?: unknown[] })?.content)
					? ((p as { content?: unknown[] }).content ?? []).map((c) => ((c as { text?: string }).text ?? '')).join('')
					: '';
				parts.push(`<li>${text}</li>`);
			}
			parts.push('</ul>');
		}
	}
	return parts.join('');
}

type EcommercePageRow = {
	id: string;
	site_id: string;
	organization_id: string;
	type: string;
	name: string;
	keyword: string | null;
	url: string | null;
	existing_content: string | null;
	content: unknown;
	schema_json: string | null;
	word_count: number;
	meta_title: string | null;
	meta_description: string | null;
	seo_checks: unknown;
	status: string;
	shopify_product_id: string | null;
	shopify_collection_id: string | null;
	published_url: string | null;
	published_at: string | null;
};

/** Get current user's organization id (first org from user_organizations) */
async function getOrgIdForUser(userId: string): Promise<string | null> {
	const { data } = await supabase
		.from('user_organizations')
		.select('organization_id')
		.eq('user_id', userId)
		.limit(1)
		.maybeSingle();
	return (data as { organization_id?: string } | null)?.organization_id ?? null;
}

/** Load ecommerce page by id and verify user's org has access. Returns page or sends 403/404 and null. */
async function loadPageAndVerifyOrg(
	req: Request,
	res: Response,
	pageId: string
): Promise<EcommercePageRow | null> {
	const userId = (req as Request & { user?: { id: string } }).user?.id;
	if (!userId) {
		res.status(401).json({ error: 'Unauthorized' });
		return null;
	}
	const orgId = await getOrgIdForUser(userId);
	if (!orgId) {
		res.status(400).json({ error: 'No organization found' });
		return null;
	}
	const { data: page, error } = await supabase
		.from('ecommerce_pages')
		.select('*')
		.eq('id', pageId)
		.single();
	if (error || !page) {
		res.status(404).json({ error: 'Page not found' });
		return null;
	}
	const row = page as EcommercePageRow;
	if (row.organization_id !== orgId) {
		res.status(403).json({ error: 'Access denied' });
		return null;
	}
	return row;
}

/** Verify user has access to site (for import and Shopify list endpoints) */
async function verifySiteAccess(
	req: Request,
	res: Response,
	siteId: string
): Promise<boolean> {
	const userId = (req as Request & { user?: { id: string } }).user?.id;
	if (!userId) {
		res.status(401).json({ error: 'Unauthorized' });
		return false;
	}
	const orgId = await getOrgIdForUser(userId);
	if (!orgId) {
		res.status(400).json({ error: 'No organization found' });
		return false;
	}
	const { data: site } = await supabase
		.from('sites')
		.select('id')
		.eq('id', siteId)
		.eq('organization_id', orgId)
		.maybeSingle();
	if (!site) {
		res.status(404).json({ error: 'Site not found' });
		return false;
	}
	return true;
}

/**
 * POST /api/ecommerce/:id/generate-product
 * Generate product description + Product schema (10 credits)
 */
export async function generateProduct(req: Request, res: Response): Promise<void> {
	const page = await loadPageAndVerifyOrg(req, res, req.params.id);
	if (!page) return;

	const { keyword, name, existing_content, site_id, organization_id } = page;
	if (!keyword) {
		res.status(400).json({ error: 'Assign a target keyword first' });
		return;
	}

	// Serper + competitor fetch
	const serper = await serperSearch(keyword, 10);
	const urls = (serper.organic ?? []).slice(0, 5).map((o) => o.link);
	const competitors = await fetchCompetitorPages(urls, 3);
	const competitorBlock = competitors
		.map(
			(c) =>
				`URL: ${c.url}\nTitle: ${c.title ?? 'N/A'}\nWord count: ${c.word_count}\nH2s: ${c.h2s.join('; ')}`
		)
		.join('\n\n');

	// Site name / niche for prompt (optional)
	const { data: site } = await supabase.from('sites').select('name, url').eq('id', site_id).single();
	const siteName = (site as { name?: string } | null)?.name ?? 'Store';
	const niche = (site as { url?: string } | null)?.url ?? '';

	const systemPrompt = `You are an ecommerce copywriter specializing in SEO and conversions.
Return ONLY valid JSON (no markdown, no extra text):
{
  "html": "<p>...</p>",
  "schema_json": "{ ... JSON-LD string ... }"
}
- html: 350-400 words, HTML only: <p>, <ul>, <li>, <strong>. No headings.
- schema_json: Product schema as a single-line JSON string (escape quotes). Include @context, @type, name, description, brand (if known), offers with priceCurrency and availability.`;

	const userPrompt = `PAGE TYPE: Product Description

EXISTING DESCRIPTION TO REWRITE (do not copy — rewrite completely):
${existing_content ?? 'None provided.'}

DUPLICATE CONTENT RULE: Manufacturer descriptions appear on thousands of sites.
Every sentence must be completely original. Zero phrases from the existing
description should survive.

PRODUCT CONTEXT:
Product name: ${name}
Target keyword: ${keyword}
Business: ${siteName} — ${niche}
Brand tone: professional

COMPETITOR PRODUCT PAGES (identify entity gaps — do not copy structure):
${competitorBlock || 'None fetched.'}

REQUIREMENTS:
- Keyword in first sentence, naturally
- Lead with the single most important benefit
- Include 1–2 specific use cases
- 350–400 words. Do NOT exceed 440 words.
- No vague superlatives without backing
- End with a benefit-summary sentence — no explicit CTA
- Output HTML only in "html"; Product schema in "schema_json"`;

	const completion = await openai.chat.completions.create({
		model: GPT_MODEL,
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt }
		],
		temperature: 0.7,
		max_tokens: 1600
	});

	const raw = completion.choices[0].message.content?.trim() ?? '{}';
	let parsed: { html?: string; schema_json?: string };
	try {
		parsed = JSON.parse(raw) as { html?: string; schema_json?: string };
	} catch {
		res.status(500).json({ error: 'Invalid AI response' });
		return;
	}

	const html = parsed.html ?? '';
	const schemaJson = parsed.schema_json ?? '';

	// Spend credits after successful generation
	const { data: spendResult, error: spendError } = await supabase.rpc('spend_credits', {
		p_org_id: organization_id,
		p_credits: CREDIT_COSTS.PRODUCT_DESCRIPTION,
		p_reference_type: 'content_generation',
		p_reference_id: page.id,
		p_description: `Product description: ${name}`
	});

	if (spendError || !spendResult?.ok) {
		res.status(402).json({
			error: 'Insufficient credits',
			required: CREDIT_COSTS.PRODUCT_DESCRIPTION,
			needs_topup: (spendResult as { reason?: string })?.reason?.includes('insufficient') ?? false
		});
		return;
	}

	const remaining = (spendResult as { included_remaining?: number })?.included_remaining ?? null;
	if (remaining !== null) {
		await maybeNotifyCreditsLow(organization_id, remaining);
	}

	const tipTapContent = htmlToTiptap(html);
	const wordCount = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

	const { error: updateErr } = await supabase
		.from('ecommerce_pages')
		.update({
			content: tipTapContent,
			schema_json: schemaJson,
			word_count: wordCount,
			status: 'draft',
			updated_at: new Date().toISOString()
		})
		.eq('id', page.id);

	if (updateErr) {
		console.error('[Ecommerce] Update page error:', updateErr);
		res.status(500).json({ error: 'Failed to save generated content' });
		return;
	}

	res.json({
		success: true,
		data: { html, schema_json: schemaJson, word_count: wordCount, creditsUsed: CREDIT_COSTS.PRODUCT_DESCRIPTION }
	});
}

/**
 * POST /api/ecommerce/:id/generate-collection
 * Generate collection intro + CollectionPage schema (10 credits)
 */
export async function generateCollection(req: Request, res: Response): Promise<void> {
	const page = await loadPageAndVerifyOrg(req, res, req.params.id);
	if (!page) return;

	const { keyword, name, existing_content, site_id, organization_id } = page;
	if (!keyword) {
		res.status(400).json({ error: 'Assign a target keyword first' });
		return;
	}

	const serper = await serperSearch(keyword, 10);
	const urls = (serper.organic ?? []).slice(0, 5).map((o) => o.link);
	const competitors = await fetchCompetitorPages(urls, 3);
	const competitorBlock = competitors
		.map(
			(c) =>
				`URL: ${c.url}\nTitle: ${c.title ?? 'N/A'}\nWord count: ${c.word_count}\nH2s: ${c.h2s.join('; ')}`
		)
		.join('\n\n');

	const { data: site } = await supabase.from('sites').select('name, url').eq('id', site_id).single();
	const siteName = (site as { name?: string } | null)?.name ?? 'Store';
	const siteUrl = (site as { url?: string } | null)?.url ?? '';

	const systemPrompt = `You are an ecommerce copywriter. Return ONLY valid JSON:
{
  "html": "<p>...</p>",
  "schema_json": "{ ... JSON-LD CollectionPage string ... }"
}
- html: max 200 words, <p>, <ul>, <li> only. No headings.
- schema_json: CollectionPage with name, description, url, breadcrumb. Single-line JSON string.`;

	const userPrompt = `PAGE TYPE: Collection Page Intro

COLLECTION CONTEXT:
Collection name: ${name}
Target keyword: ${keyword}
Business: ${siteName} — ${siteUrl}
Existing intro: ${existing_content ?? 'None'}

HARD LIMIT: 200 words maximum.

REQUIREMENTS:
- Keyword in first sentence
- Mention 2–3 specific product types or use cases
- No generic "Welcome to our collection" openers
- Suggest one internal link: [LINK: related collection name]
- Output HTML only

COMPETITORS (for reference only):
${competitorBlock || 'None'}`;

	const completion = await openai.chat.completions.create({
		model: GPT_MODEL,
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt }
		],
		temperature: 0.7,
		max_tokens: 1000
	});

	const raw = completion.choices[0].message.content?.trim() ?? '{}';
	let parsed: { html?: string; schema_json?: string };
	try {
		parsed = JSON.parse(raw) as { html?: string; schema_json?: string };
	} catch {
		res.status(500).json({ error: 'Invalid AI response' });
		return;
	}

	const html = parsed.html ?? '';
	const schemaJson = parsed.schema_json ?? '';

	const { data: spendResult, error: spendError } = await supabase.rpc('spend_credits', {
		p_org_id: organization_id,
		p_credits: CREDIT_COSTS.COLLECTION_INTRO,
		p_reference_type: 'content_generation',
		p_reference_id: page.id,
		p_description: `Collection intro: ${name}`
	});

	if (spendError || !spendResult?.ok) {
		res.status(402).json({
			error: 'Insufficient credits',
			required: CREDIT_COSTS.COLLECTION_INTRO,
			needs_topup: (spendResult as { reason?: string })?.reason?.includes('insufficient') ?? false
		});
		return;
	}

	const remaining = (spendResult as { included_remaining?: number })?.included_remaining ?? null;
	if (remaining !== null) {
		await maybeNotifyCreditsLow(organization_id, remaining);
	}

	const wordCount = html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
	const tipTapContent = htmlToTiptap(html);

	const { error: updateErr } = await supabase
		.from('ecommerce_pages')
		.update({
			content: tipTapContent,
			schema_json: schemaJson,
			word_count: wordCount,
			status: 'draft',
			updated_at: new Date().toISOString()
		})
		.eq('id', page.id);

	if (updateErr) {
		console.error('[Ecommerce] Update page error:', updateErr);
		res.status(500).json({ error: 'Failed to save generated content' });
		return;
	}

	res.json({
		success: true,
		data: { html, schema_json: schemaJson, word_count: wordCount, creditsUsed: CREDIT_COSTS.COLLECTION_INTRO }
	});
}

/**
 * POST /api/ecommerce/:id/publish-shopify
 * Publish body_html + meta to Shopify (no credits)
 */
export async function publishToShopify(req: Request, res: Response): Promise<void> {
	const page = await loadPageAndVerifyOrg(req, res, req.params.id);
	if (!page) return;

	const { overwriteDescription, updateMeta } = req.body as { overwriteDescription?: boolean; updateMeta?: boolean };
	const siteId = page.site_id;
	const { shopDomain, accessToken } = await getShopifyToken(siteId);
	if (!shopDomain || !accessToken) {
		res.status(400).json({ error: 'Shopify not connected for this site' });
		return;
	}

	const bodyHtml = tiptapToHtml(page.content);
	if (!bodyHtml || !bodyHtml.trim()) {
		res.status(400).json({ error: 'No generated content to publish' });
		return;
	}

	const metaTitle = updateMeta !== false ? (page.meta_title ?? page.name) : undefined;
	const metaDesc = updateMeta !== false ? (page.meta_description ?? '') : undefined;

	if (page.type === 'product' && page.shopify_product_id) {
		await updateShopifyProduct(shopDomain, accessToken, page.shopify_product_id, {
			body_html: bodyHtml,
			meta_title: metaTitle,
			meta_description: metaDesc
		});
	} else if (page.type === 'collection' && page.shopify_collection_id) {
		await updateShopifyCollection(shopDomain, accessToken, page.shopify_collection_id, {
			body_html: bodyHtml,
			meta_title: metaTitle,
			meta_description: metaDesc
		});
	} else {
		res.status(400).json({ error: 'Page not linked to a Shopify product or collection' });
		return;
	}

	const publishedUrl = page.url || undefined;
	const { error: updateErr } = await supabase
		.from('ecommerce_pages')
		.update({
			status: 'published',
			published_at: new Date().toISOString(),
			published_url: publishedUrl,
			updated_at: new Date().toISOString()
		})
		.eq('id', page.id);

	if (updateErr) console.error('[Ecommerce] Update status error:', updateErr);

	res.json({ success: true, published_url: publishedUrl });
}

/**
 * POST /api/ecommerce/import-shopify
 * Import products or collections; body: { siteId, type: 'product'|'collection', ids: number[] }
 */
export async function importFromShopify(req: Request, res: Response): Promise<void> {
	const { siteId, type, ids } = req.body as { siteId: string; type: 'product' | 'collection'; ids: number[] };
	if (!siteId || !type || !Array.isArray(ids)) {
		res.status(400).json({ error: 'siteId, type, and ids required' });
		return;
	}
	if (!(type === 'product' || type === 'collection')) {
		res.status(400).json({ error: 'type must be product or collection' });
		return;
	}
	const ok = await verifySiteAccess(req, res, siteId);
	if (!ok) return;

	const { data: site } = await supabase
		.from('sites')
		.select('id, organization_id, url')
		.eq('id', siteId)
		.single();
	if (!site) {
		res.status(404).json({ error: 'Site not found' });
		return;
	}
	const orgId = (site as { organization_id: string }).organization_id;
	const baseUrl = (site as { url?: string }).url ?? '';

	const { shopDomain, accessToken } = await getShopifyToken(siteId);
	if (!shopDomain || !accessToken) {
		res.status(400).json({ error: 'Shopify not connected for this site' });
		return;
	}

	if (type === 'product') {
		const products = await listShopifyProducts(shopDomain, accessToken);
		const toImport = products.filter((p) => ids.includes(p.id));
		for (const p of toImport) {
			const existing = await supabase
				.from('ecommerce_pages')
				.select('id')
				.eq('site_id', siteId)
				.eq('shopify_product_id', String(p.id))
				.maybeSingle();
			const url = `${baseUrl.replace(/\/$/, '')}/products/${p.handle}`;
			if (existing.data) {
				await supabase
					.from('ecommerce_pages')
					.update({
						existing_content: p.body_html ?? null,
						name: p.title,
						url,
						updated_at: new Date().toISOString()
					})
					.eq('id', (existing.data as { id: string }).id);
			} else {
				await supabase.from('ecommerce_pages').insert({
					site_id: siteId,
					organization_id: orgId,
					type: 'product',
					name: p.title,
					url,
					existing_content: p.body_html ?? null,
					shopify_product_id: String(p.id)
				});
			}
		}
	} else {
		const collections = await listShopifyCollections(shopDomain, accessToken);
		const toImport = collections.filter((c) => ids.includes(c.id));
		for (const c of toImport) {
			const existing = await supabase
				.from('ecommerce_pages')
				.select('id')
				.eq('site_id', siteId)
				.eq('shopify_collection_id', String(c.id))
				.maybeSingle();
			const url = `${baseUrl.replace(/\/$/, '')}/collections/${c.handle}`;
			if (existing.data) {
				await supabase
					.from('ecommerce_pages')
					.update({
						existing_content: c.body_html ?? null,
						name: c.title,
						url,
						updated_at: new Date().toISOString()
					})
					.eq('id', (existing.data as { id: string }).id);
			} else {
				await supabase.from('ecommerce_pages').insert({
					site_id: siteId,
					organization_id: orgId,
					type: 'collection',
					name: c.title,
					url,
					existing_content: c.body_html ?? null,
					shopify_collection_id: String(c.id)
				});
			}
		}
	}

	res.json({ success: true, imported: ids.length });
}

/**
 * GET /api/ecommerce?siteId=...&type=product|collection (optional)
 * List ecommerce pages for hub table.
 */
export async function listEcommercePages(req: Request, res: Response): Promise<void> {
	const siteId = req.query.siteId as string;
	const type = req.query.type as string | undefined; // 'product' | 'collection'
	if (!siteId) {
		res.status(400).json({ error: 'siteId required' });
		return;
	}
	const ok = await verifySiteAccess(req, res, siteId);
	if (!ok) return;

	let q = supabase
		.from('ecommerce_pages')
		.select('id, site_id, type, name, keyword, url, existing_content, content, schema_json, word_count, meta_title, meta_description, seo_checks, status, shopify_product_id, shopify_collection_id, published_url, published_at, created_at, updated_at')
		.eq('site_id', siteId)
		.order('updated_at', { ascending: false });
	if (type === 'product' || type === 'collection') q = q.eq('type', type);
	const { data, error } = await q;
	if (error) {
		console.error('[Ecommerce] List error:', error);
		res.status(500).json({ error: 'Failed to list pages' });
		return;
	}
	res.json({ pages: data ?? [] });
}

/**
 * GET /api/ecommerce/:id
 * Get one ecommerce page for workspace.
 */
export async function getEcommercePage(req: Request, res: Response): Promise<void> {
	const page = await loadPageAndVerifyOrg(req, res, req.params.id);
	if (!page) return;
	res.json({ page });
}

/**
 * GET /api/ecommerce/shopify-products?siteId=...
 */
export async function getShopifyProducts(req: Request, res: Response): Promise<void> {
	const siteId = req.query.siteId as string;
	if (!siteId) {
		res.status(400).json({ error: 'siteId required' });
		return;
	}
	const ok = await verifySiteAccess(req, res, siteId);
	if (!ok) return;

	const { shopDomain, accessToken } = await getShopifyToken(siteId);
	if (!shopDomain || !accessToken) {
		res.status(400).json({ error: 'Shopify not connected for this site' });
		return;
	}
	const products = await listShopifyProducts(shopDomain, accessToken);
	res.json({
		products: products.map((p) => ({
			id: p.id,
			title: p.title,
			body_html: p.body_html,
			handle: p.handle,
			status: p.status,
			variants_count: Array.isArray(p.variants) ? p.variants.length : 0
		}))
	});
}

/**
 * GET /api/ecommerce/shopify-collections?siteId=...
 */
export async function getShopifyCollections(req: Request, res: Response): Promise<void> {
	const siteId = req.query.siteId as string;
	if (!siteId) {
		res.status(400).json({ error: 'siteId required' });
		return;
	}
	const ok = await verifySiteAccess(req, res, siteId);
	if (!ok) return;

	const { shopDomain, accessToken } = await getShopifyToken(siteId);
	if (!shopDomain || !accessToken) {
		res.status(400).json({ error: 'Shopify not connected for this site' });
		return;
	}
	const collections = await listShopifyCollections(shopDomain, accessToken);
	res.json({
		collections: collections.map((c) => ({
			id: c.id,
			title: c.title,
			body_html: c.body_html,
			handle: c.handle,
			products_count: c.products_count
		}))
	});
}
