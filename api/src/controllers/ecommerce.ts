/**
 * Ecommerce SEO Controller (L6b)
 * Product and collection page SEO: generate descriptions, schema, publish to Shopify.
 * Isolated — does not touch pages.ts or Workspace. New file only.
 */

import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import { supabase } from '../utils/supabaseClient.js';
import { CREDIT_COSTS } from '../utils/credits.js';
import { serperSearch } from '../utils/serper.js';
import { fetchCompetitorPages, fetchPageForSeoChecks } from '../utils/competitorFetch.js';
import {
	getShopifyToken,
	listShopifyProducts,
	listShopifyCollections,
	getShopifyProductByGid,
	getShopifyCollectionByGid,
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
		const text = inner
			.replace(/<strong>([\s\S]*?)<\/strong>/gi, '$1')
			.replace(/<[^>]+>/g, '')
			.trim();
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
			if (t)
				items.push({
					type: 'listItem',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }]
				});
		}
		if (items.length > 0) content.push({ type: 'bulletList', content: items });
	}
	if (content.length === 0) content.push({ type: 'paragraph', content: [] });
	return { type: 'doc', content };
}

/** Word count from HTML (strip tags, count tokens) */
function wordCountFromHtml(html: string): number {
	if (!html || typeof html !== 'string') return 0;
	const text = html
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	return text ? text.split(/\s+/).length : 0;
}

/** Extract Shopify handle from page URL (products/xxx or collections/xxx) */
function extractHandleFromUrl(url: string | null, type: 'product' | 'collection'): string | null {
	if (!url || typeof url !== 'string') return null;
	const path = url
		.replace(/^https?:\/\/[^/]+/, '')
		.replace(/\?.*$/, '')
		.replace(/#.*$/, '')
		.trim();
	const prefix = type === 'product' ? 'products/' : 'collections/';
	// Match /products/handle or products/handle (with or without leading slash)
	const normalized = path.startsWith('/') ? path.slice(1) : path;
	const idx = normalized.indexOf(prefix);
	if (idx !== 0) return null;
	const after = normalized.slice(prefix.length);
	const slash = after.indexOf('/');
	const handle = slash === -1 ? after : after.slice(0, slash);
	return handle.trim() || null;
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
			const text = (n.content ?? []).map((c) => (c as { text?: string }).text ?? '').join('');
			if (text)
				parts.push(
					`<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`
				);
		} else if (n.type === 'bulletList') {
			parts.push('<ul>');
			for (const li of n.content ?? []) {
				const lic = (li as { content?: unknown[] }).content ?? [];
				const p = lic.find((x) => (x as { type?: string }).type === 'paragraph');
				const text = Array.isArray((p as { content?: unknown[] })?.content)
					? ((p as { content?: unknown[] }).content ?? [])
							.map((c) => (c as { text?: string }).text ?? '')
							.join('')
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
	display_meta?: unknown;
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
async function verifySiteAccess(req: Request, res: Response, siteId: string): Promise<boolean> {
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

	const additionalContext =
		(req.body as { additional_context?: string })?.additional_context?.trim() || undefined;

	const {
		keyword,
		name,
		existing_content,
		site_id,
		organization_id,
		meta_title,
		meta_description
	} = page;
	const displayMeta = page.display_meta as
		| { product_type?: string; vendor?: string; tags?: string[] }
		| null
		| undefined;
	const aiContextLines: string[] = [];
	if (displayMeta?.product_type) aiContextLines.push(`Product type: ${displayMeta.product_type}`);
	if (displayMeta?.vendor) aiContextLines.push(`Vendor: ${displayMeta.vendor}`);
	if (displayMeta?.tags?.length) aiContextLines.push(`Tags: ${displayMeta.tags.join(', ')}`);
	if (meta_title) aiContextLines.push(`Current meta title: ${meta_title}`);
	if (meta_description) aiContextLines.push(`Current meta description: ${meta_description}`);
	const aiContextBlock = aiContextLines.length
		? `\n\nContext (use for category/brand, do not repeat verbatim):\n${aiContextLines.join('\n')}`
		: '';

	if (!keyword) {
		res.status(400).json({ error: 'Assign a target keyword first' });
		return;
	}

	// Charge credits before any API calls (Serper, competitor fetch, OpenAI)
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
	const { data: site } = await supabase
		.from('sites')
		.select('name, url')
		.eq('id', site_id)
		.single();
	const siteName = (site as { name?: string } | null)?.name ?? 'Store';
	const niche = (site as { url?: string } | null)?.url ?? '';

	const systemPrompt = `You are an ecommerce copywriter specializing in SEO and conversions.
Return ONLY valid JSON (no markdown, no extra text):
{
  "html": "<p>...</p>",
  "schema_json": "{ ... JSON-LD string ... }"
}
- html: 350-400 words, HTML only: <p>, <ul>, <li>, <strong>. No headings.
- schema_json: Product schema as a single-line JSON string (escape quotes). Include @context, @type, name, description, brand (if known), offers with priceCurrency and availability.${aiContextBlock}`;

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
${additionalContext ? `\nADDITIONAL CONTEXT FROM MERCHANT (features, benefits, materials, specs, what's included — weave these into the copy):\n${additionalContext}` : ''}

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

	const tipTapContent = htmlToTiptap(html);
	const wordCount = html
		.replace(/<[^>]+>/g, ' ')
		.split(/\s+/)
		.filter(Boolean).length;

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
		data: {
			html,
			schema_json: schemaJson,
			word_count: wordCount,
			creditsUsed: CREDIT_COSTS.PRODUCT_DESCRIPTION
		}
	});
}

/**
 * POST /api/ecommerce/:id/generate-collection
 * Generate collection intro + CollectionPage schema (10 credits)
 */
export async function generateCollection(req: Request, res: Response): Promise<void> {
	const page = await loadPageAndVerifyOrg(req, res, req.params.id);
	if (!page) return;

	const additionalContext =
		(req.body as { additional_context?: string })?.additional_context?.trim() || undefined;

	const {
		keyword,
		name,
		existing_content,
		site_id,
		organization_id,
		meta_title,
		meta_description
	} = page;
	const dm = page.display_meta as {
		product_type?: string;
		vendor?: string;
		tags?: string[];
	} | null;
	const contextLines: string[] = [];
	if (dm?.product_type) contextLines.push(`Product type: ${dm.product_type}`);
	if (dm?.vendor) contextLines.push(`Vendor: ${dm.vendor}`);
	if (dm?.tags?.length) contextLines.push(`Tags: ${dm.tags.join(', ')}`);
	if (meta_title) contextLines.push(`Current meta title: ${meta_title}`);
	if (meta_description) contextLines.push(`Current meta description: ${meta_description}`);

	if (!keyword) {
		res.status(400).json({ error: 'Assign a target keyword first' });
		return;
	}

	// Charge credits before any API calls (Serper, competitor fetch, OpenAI)
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

	const serper = await serperSearch(keyword, 10);
	const urls = (serper.organic ?? []).slice(0, 5).map((o) => o.link);
	const competitors = await fetchCompetitorPages(urls, 3);
	const competitorBlock = competitors
		.map(
			(c) =>
				`URL: ${c.url}\nTitle: ${c.title ?? 'N/A'}\nWord count: ${c.word_count}\nH2s: ${c.h2s.join('; ')}`
		)
		.join('\n\n');

	const { data: site } = await supabase
		.from('sites')
		.select('name, url')
		.eq('id', site_id)
		.single();
	const siteName = (site as { name?: string } | null)?.name ?? 'Store';
	const siteUrl = (site as { url?: string } | null)?.url ?? '';

	const contextBlock = contextLines.length
		? `\n\nAdditional context:\n${contextLines.join('\n')}`
		: '';
	const systemPrompt = `You are an ecommerce copywriter. Return ONLY valid JSON:
{
  "html": "<p>...</p>",
  "schema_json": "{ ... JSON-LD CollectionPage string ... }"
}
- html: max 200 words, <p>, <ul>, <li> only. No headings.
- schema_json: CollectionPage with name, description, url, breadcrumb. Single-line JSON string.${contextBlock}`;

	const userPrompt = `PAGE TYPE: Collection Page Intro

COLLECTION CONTEXT:
Collection name: ${name}
Target keyword: ${keyword}
Business: ${siteName} — ${siteUrl}
Existing intro: ${existing_content ?? 'None'}
${additionalContext ? `\nADDITIONAL CONTEXT FROM MERCHANT (product types, themes, what's in the collection, who it's for — weave these in):\n${additionalContext}` : ''}

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

	const wordCount = html
		.replace(/<[^>]+>/g, ' ')
		.split(/\s+/)
		.filter(Boolean).length;
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
		data: {
			html,
			schema_json: schemaJson,
			word_count: wordCount,
			creditsUsed: CREDIT_COSTS.COLLECTION_INTRO
		}
	});
}

/**
 * POST /api/ecommerce/:id/generate-meta
 * Generate meta title and meta description (3 credits)
 */
export async function generateEcommerceMeta(req: Request, res: Response): Promise<void> {
	const page = await loadPageAndVerifyOrg(req, res, req.params.id);
	if (!page) return;

	const additionalContext =
		(req.body as { additional_context?: string })?.additional_context?.trim() || undefined;

	const { keyword, name, type, content, display_meta, organization_id } = page;
	const dm = display_meta as
		| { product_type?: string; vendor?: string; price?: string }
		| null
		| undefined;

	if (!keyword) {
		res.status(400).json({ error: 'Assign a target keyword first' });
		return;
	}

	const { data: spendResult, error: spendError } = await supabase.rpc('spend_credits', {
		p_org_id: organization_id,
		p_credits: CREDIT_COSTS.META_GENERATION,
		p_reference_type: 'content_generation',
		p_reference_id: page.id,
		p_description: `Meta title/description: ${name}`
	});

	if (spendError || !spendResult?.ok) {
		res.status(402).json({
			error: 'Insufficient credits',
			required: CREDIT_COSTS.META_GENERATION,
			needs_topup: (spendResult as { reason?: string })?.reason?.includes('insufficient') ?? false
		});
		return;
	}

	const remaining = (spendResult as { included_remaining?: number })?.included_remaining ?? null;
	if (remaining !== null) {
		await maybeNotifyCreditsLow(organization_id, remaining);
	}

	const contentExcerpt =
		content && typeof content === 'object'
			? tiptapToHtml(content)
					.replace(/<[^>]+>/g, ' ')
					.slice(0, 400)
					.trim()
			: '';

	const completion = await openai.chat.completions.create({
		model: GPT_MODEL,
		messages: [
			{
				role: 'system',
				content: `You are an SEO and CRO (conversion rate optimization) expert writing meta titles and descriptions for ecommerce product and collection pages. You follow strict guidelines:

Return ONLY valid JSON (no markdown, no extra text):
{
  "meta_title": "...",
  "meta_description": "..."
}

META TITLE (50-60 chars max — seoScore Module 1):
- Place target keyword in the first half of the title for best CTR.
- Keep under 60 characters (Google truncates).
- NO brand suffix: never add "by [Brand]", "| [Brand]", "- [Brand]", or similar. Product/collection name is enough.
- Make it compelling and specific — highlight a key differentiator, benefit, or use case, not a generic template.
- Avoid filler: "Shop", "Buy", "The Best" unless they add real value.

META DESCRIPTION (150-155 chars — seoScore Module 5 optimal; REQUIRED):
- CRITICAL: MUST be 150-155 characters. Count characters before returning. Shorter descriptions fail our SEO checks.
- If your draft is under 150 chars, expand with another specific benefit, use case, or stronger CTA.
- Include target keyword naturally in the first half.
- CRO (conversion-focused): lead with a clear value prop, 1-2 specific benefits from the actual product/collection, end with a soft CTA (e.g. "Shop now" or "Explore the collection").
- AVOID generic phrases: "Discover", "Get yours today", "Perfect for beginners and pros alike", "unmatched versatility" — these read like filler.
- Pull unique differentiators from the content: materials, features, use case, what makes it stand out.
- No misleading claims. Accurate to the product/collection.`
			},
			{
				role: 'user',
				content: `Generate meta title and meta description for:
Type: ${type}
Name: ${name}
Target keyword: ${keyword}
${dm?.vendor ? `Brand/Vendor: ${dm.vendor} (do NOT add "by ${dm.vendor}" to title)` : ''}
${dm?.product_type ? `Category: ${dm.product_type}` : ''}
${dm?.price ? `Price: ${dm.price}` : ''}
${contentExcerpt ? `\nContent excerpt (use specific details here — materials, features, use cases — in your meta, not generic claims):\n${contentExcerpt}` : ''}
${additionalContext ? `\nADDITIONAL CONTEXT FROM MERCHANT (audience, tone, benefits to emphasize):\n${additionalContext}` : ''}

Deliver: One meta_title (50-60 chars, keyword front-loaded, no brand suffix) and one meta_description — MUST be 150-155 characters (count before returning; our checks flag anything shorter).`
			}
		],
		temperature: 0.6,
		max_tokens: 300
	});

	const raw = completion.choices[0].message.content?.trim() ?? '{}';
	let parsed: { meta_title?: string; meta_description?: string };
	try {
		parsed = JSON.parse(raw) as { meta_title?: string; meta_description?: string };
	} catch {
		res.status(500).json({ error: 'Invalid AI response' });
		return;
	}

	// Post-process: strip "by [Brand]" suffix only (user requested no "by X" in title; store names like "Sharkly - DEV" are fine)
	let metaTitle: string | null = (parsed.meta_title ?? '').trim();
	metaTitle = metaTitle
		.replace(/\s*[-–—|]\s*(by|from)\s+[\w\s]+$/i, '')
		.replace(/\s+by\s+[\w\s]+$/i, '')
		.trim();
	metaTitle = (metaTitle.slice(0, 60) || '').trim() || null;
	let metaDescription: string | null = (parsed.meta_description ?? '').trim();
	// Meta desc 150-155 chars optimal (seoScore Module 5); allow 150-165
	if (metaDescription.length > 0) {
		if (metaDescription.length < 150) {
			metaDescription = metaDescription; // keep as-is; user can edit
		} else if (metaDescription.length > 165) {
			metaDescription = metaDescription.slice(0, 162) + '…';
		}
	}
	metaDescription = metaDescription.slice(0, 320) || null;

	const { error: updateErr } = await supabase
		.from('ecommerce_pages')
		.update({
			meta_title: (metaTitle ?? '') as string,
			meta_description: (metaDescription ?? '') as string,
			updated_at: new Date().toISOString()
		})
		.eq('id', page.id);

	if (updateErr) {
		console.error('[Ecommerce] Update meta error:', updateErr);
		res.status(500).json({ error: 'Failed to save generated meta' });
		return;
	}

	res.json({
		success: true,
		data: {
			meta_title: metaTitle,
			meta_description: metaDescription,
			creditsUsed: CREDIT_COSTS.META_GENERATION
		}
	});
}

type SeoCheckResult = {
	status: 'pass' | 'fail' | 'warning';
	message: string;
	weight?: number;
};

/** Normalize keyword for comparison (lowercase, collapse whitespace) */
function normalizeKeyword(kw: string): string {
	return kw.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Check if keyword (or close variant) appears in text. Uses word overlap. */
function keywordInText(keyword: string, text: string): boolean {
	if (!keyword || !text) return false;
	const kwNorm = normalizeKeyword(keyword);
	const textNorm = normalizeKeyword(text);
	const kwWords = kwNorm.split(/\s+/).filter(Boolean);
	if (kwWords.length === 0) return false;
	// All significant keyword words must appear in text (order-independent)
	return kwWords.every((w) => w.length >= 2 && textNorm.includes(w));
}

/** Common manufacturer copy phrases — if these dominate, flag as likely duplicate content */
const MANUFACTURER_PHRASES = [
	'crafted for',
	'designed to',
	'designed for',
	'premium quality',
	'brings you',
	'features include',
	'product features',
	'key features',
	'constructed from',
	'built for',
	'engineered to',
	'made with'
];

function looksLikeManufacturerCopy(text: string): boolean {
	if (!text || text.length < 50) return false;
	const lower = text.toLowerCase();
	const matches = MANUFACTURER_PHRASES.filter((p) => lower.includes(p));
	return matches.length >= 2;
}

/** Extract first H1 text from Tiptap content JSON. Returns null if none. */
function extractFirstH1FromContent(content: unknown): string | null {
	if (!content || typeof content !== 'object') return null;
	const doc = content as { content?: unknown[] };
	if (!Array.isArray(doc.content)) return null;
	for (const node of doc.content) {
		const n = node as { type?: string; attrs?: { level?: number }; content?: unknown[] };
		if (n.type === 'heading' && (n.attrs?.level ?? 1) === 1) {
			const texts = (n.content ?? []).map((c) => (c as { text?: string }).text ?? '');
			return texts.join('').trim() || null;
		}
	}
	return null;
}

/**
 * POST /api/ecommerce/:id/run-seo-checks
 * Run 6 basic SEO checks against the live page URL. No credits. Results stored in seo_checks.
 */
export async function runSeoChecks(req: Request, res: Response): Promise<void> {
	const page = await loadPageAndVerifyOrg(req, res, req.params.id);
	if (!page) return;

	const {
		keyword,
		url,
		existing_content,
		content,
		schema_json,
		word_count,
		type,
		meta_title,
		meta_description,
		variant_count,
		product_count,
		platform_status
	} = page as EcommercePageRow & {
		variant_count?: number | null;
		product_count?: number | null;
		platform_status?: string | null;
	};

	if (!keyword) {
		res.status(400).json({ error: 'Assign a target keyword first' });
		return;
	}
	if (!url) {
		res.status(400).json({ error: 'Set the page URL to run checks against the live page' });
		return;
	}

	const checks: Record<string, SeoCheckResult> = {};

	// Check 1 — Keyword in page title (source: meta_title)
	const titleToCheck = meta_title ?? page.name ?? '';
	if (keywordInText(keyword, titleToCheck)) {
		checks.keyword_in_title = {
			status: 'pass',
			message: 'Keyword found in page title.',
			weight: 1.0
		};
	} else {
		checks.keyword_in_title = {
			status: 'fail',
			message:
				'Add your keyword to the meta title. For Shopify products, edit the SEO title field under Search Engine Listing in the product editor.',
			weight: 1.0
		};
	}

	// Check 2 — Keyword in H1 (source: first <h1> in content or name)
	const h1Text = extractFirstH1FromContent(content) ?? page.name ?? '';
	if (keywordInText(keyword, h1Text)) {
		checks.keyword_in_h1 = { status: 'pass', message: 'Keyword found in H1.', weight: 0.95 };
	} else {
		checks.keyword_in_h1 = {
			status: 'fail',
			message:
				"Your H1 doesn't contain the target keyword. For Shopify products, the product title becomes the H1 — update the product title.",
			weight: 0.95
		};
	}

	// Check 3 — Keyword in URL slug (source: url)
	let urlSlug = '';
	try {
		urlSlug = new URL(url).pathname.toLowerCase().split('/').filter(Boolean).pop() ?? '';
	} catch {
		urlSlug = url.split('/').filter(Boolean).pop() ?? '';
	}
	if (keywordInText(keyword, urlSlug.replace(/[-_]/g, ' '))) {
		checks.keyword_in_url = {
			status: 'pass',
			message: 'Keyword reflected in URL slug.',
			weight: 0.85
		};
	} else {
		checks.keyword_in_url = {
			status: 'fail',
			message: "URL doesn't reflect your target keyword.",
			weight: 0.85
		};
	}

	// Check 4 — Meta description 150–160 chars (source: meta_description)
	const metaDesc = meta_description ?? '';
	const len = metaDesc.length;
	if (!metaDesc.trim()) {
		checks.meta_description = {
			status: 'fail',
			message: 'No meta description. Add one to improve click-through rate from search results.'
		};
	} else if (len >= 150 && len <= 160) {
		checks.meta_description = { status: 'pass', message: `Meta description OK (${len} chars).` };
	} else if (len < 150) {
		checks.meta_description = {
			status: 'warning',
			message: `Meta description too short (${len} chars). Aim for 150–160.`
		};
	} else {
		checks.meta_description = {
			status: 'warning',
			message: `Meta description too long (${len} chars). Aim for 150–160.`
		};
	}

	// Check 5 — Description originality (source: existing_content vs content)
	const hasGeneratedContent = content && word_count > 50;
	if (hasGeneratedContent) {
		checks.description_originality = {
			status: 'pass',
			message: 'Generated description is original.'
		};
	} else {
		const existing = (existing_content ?? '').trim();
		const wordCount = existing.split(/\s+/).filter(Boolean).length;
		if (wordCount < 80 || looksLikeManufacturerCopy(existing)) {
			checks.description_originality = {
				status: 'fail',
				message:
					'Your current description appears to be manufacturer copy — it likely appears on many other sites, which hurts rankings. Use the Generate button to create an original description.'
			};
		} else {
			checks.description_originality = { status: 'pass', message: 'Description appears original.' };
		}
	}

	// Check 6 — Schema present (source: schema_json)
	const expectedType = type === 'product' ? 'Product' : 'CollectionPage';
	const hasSchema = !!schema_json && schema_json.trim().length > 0;
	if (hasSchema) {
		checks.schema = { status: 'pass', message: `${expectedType} schema configured.` };
	} else {
		checks.schema = {
			status: 'fail',
			message:
				'No Product schema. Generate a description to produce schema, then copy the JSON-LD block below and paste it into your Shopify theme.'
		};
	}

	// Additional warnings
	if (type === 'product' && (variant_count ?? 0) > 3) {
		checks.duplicate_variants = {
			status: 'warning',
			message: `Product has ${variant_count} variants — consider consolidating to reduce thin content risk.`,
			weight: 0.5
		};
	}
	if (type === 'collection' && (product_count ?? 0) > 50) {
		checks.pagination_canonical = {
			status: 'warning',
			message: `Collection has ${product_count} products — ensure pagination uses rel="canonical" to avoid duplicate content.`,
			weight: 0.5
		};
	}
	if (platform_status === 'draft' || platform_status === 'archived') {
		checks.page_not_live = {
			status: 'warning',
			message: `Page is ${platform_status} on the platform — it may not be live for customers.`,
			weight: 0.5
		};
	}

	const seoChecksPayload = {
		checks,
		fetched_at: new Date().toISOString(),
		fetch_error: false
	};

	const { error: updateErr } = await supabase
		.from('ecommerce_pages')
		.update({
			seo_checks: seoChecksPayload,
			updated_at: new Date().toISOString()
		})
		.eq('id', page.id);

	if (updateErr) {
		console.error('[Ecommerce] Update seo_checks error:', updateErr);
		res.status(500).json({ error: 'Failed to save SEO checks' });
		return;
	}

	res.json({ success: true, seo_checks: seoChecksPayload });
}

/**
 * POST /api/ecommerce/:id/publish-shopify
 * Publish body_html + meta + optional handle to Shopify (no credits)
 */
export async function publishToShopify(req: Request, res: Response): Promise<void> {
	try {
		const page = await loadPageAndVerifyOrg(req, res, req.params.id);
		if (!page) return;

		const {
			overwriteDescription,
			updateMeta,
			meta_title: bodyMetaTitle,
			meta_description: bodyMetaDesc
		} = req.body as {
			overwriteDescription?: boolean;
			updateMeta?: boolean;
			meta_title?: string;
			meta_description?: string;
		};
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

		// Use body overrides when provided (ensures form values are used even before blur-save)
		const metaTitle =
			updateMeta !== false
				? bodyMetaTitle !== undefined && bodyMetaTitle !== null
					? String(bodyMetaTitle).trim() || null
					: (page.meta_title ?? page.name)
				: undefined;
		const metaDesc =
			updateMeta !== false
				? ((bodyMetaDesc !== undefined && bodyMetaDesc !== null
						? String(bodyMetaDesc).trim()
						: (page.meta_description ?? '')) ?? '')
				: undefined;
		const handle = extractHandleFromUrl(page.url ?? null, page.type as 'product' | 'collection');

		if (page.type === 'product' && page.shopify_product_id) {
			await updateShopifyProduct(shopDomain, accessToken, page.shopify_product_id, {
				body_html: bodyHtml,
				meta_title: metaTitle ?? undefined,
				meta_description: metaDesc ?? undefined,
				handle: handle ?? undefined
			});
		} else if (page.type === 'collection' && page.shopify_collection_id) {
			await updateShopifyCollection(shopDomain, accessToken, page.shopify_collection_id, {
				body_html: bodyHtml,
				meta_title: metaTitle ?? undefined,
				meta_description: metaDesc ?? undefined,
				handle: handle ?? undefined
			});
		} else {
			res.status(400).json({ error: 'Page not linked to a Shopify product or collection' });
			return;
		}

		const publishedUrl = page.url || undefined;
		const dbUpdate: Record<string, unknown> = {
			status: 'published',
			published_at: new Date().toISOString(),
			published_url: publishedUrl,
			updated_at: new Date().toISOString()
		};
		if (bodyMetaTitle !== undefined)
			dbUpdate.meta_title = (String(bodyMetaTitle).trim() || null) as unknown;
		if (bodyMetaDesc !== undefined)
			dbUpdate.meta_description = (String(bodyMetaDesc).trim() || null) as unknown;
		const { error: updateErr } = await supabase
			.from('ecommerce_pages')
			.update(dbUpdate)
			.eq('id', page.id);

		if (updateErr) console.error('[Ecommerce] Update status error:', updateErr);

		res.json({ success: true, published_url: publishedUrl });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Publish failed';
		console.error('[Ecommerce] publishToShopify error:', err);
		res.status(500).json({ error: msg });
	}
}

/**
 * POST /api/ecommerce/import-shopify
 * Import products or collections; body: { siteId, type: 'product'|'collection', ids: number[] }
 */
export async function importFromShopify(req: Request, res: Response): Promise<void> {
	const { siteId, type, ids } = req.body as {
		siteId: string;
		type: 'product' | 'collection';
		ids: number[];
	};
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

	const { shopDomain, accessToken } = await getShopifyToken(siteId);
	if (!shopDomain || !accessToken) {
		res.status(400).json({ error: 'Shopify not connected for this site' });
		return;
	}

	// Product/collection URLs must use the connected Shopify store domain (e.g. store.myshopify.com),
	// not the Sharkly site domain. SEO checks crawl the live Shopify URLs.
	const shopifyBaseUrl = `https://${shopDomain.replace(/\/$/, '')}`;

	if (type === 'product') {
		const products = await listShopifyProducts(shopDomain, accessToken);
		const toImport = products.filter((p) => ids.includes(p.id));
		for (const p of toImport) {
			const existing = await supabase
				.from('ecommerce_pages')
				.select('id, content')
				.eq('site_id', siteId)
				.eq('shopify_product_id', String(p.id))
				.maybeSingle();
			const url = p.online_store_url ?? `${shopifyBaseUrl}/products/${p.handle}`;
			const displayMeta: Record<string, unknown> = {};
			if (p.featured_image_url) displayMeta.image_url = p.featured_image_url;
			if (p.featured_image_alt) displayMeta.image_alt = p.featured_image_alt;
			if (p.price) displayMeta.price = p.price;
			if (p.currency) displayMeta.currency = p.currency;
			if (p.vendor) displayMeta.vendor = p.vendor;
			if (p.product_type) displayMeta.product_type = p.product_type;
			if (p.tags?.length) displayMeta.tags = p.tags;

			const productPayload: Record<string, unknown> = {
				existing_content: p.body_html ?? null,
				name: p.title,
				url,
				meta_title: p.seo_title ?? null,
				meta_description: p.seo_description ?? null,
				display_meta: Object.keys(displayMeta).length ? displayMeta : null,
				platform: 'shopify',
				platform_id: p.id_gid,
				variant_count: p.variant_count ?? null,
				platform_status: p.status?.toLowerCase() ?? null,
				updated_at: new Date().toISOString()
			};
			const hasShopifyDesc = (p.body_html ?? '').trim().length > 0;
			if (existing.data) {
				const row = existing.data as { id: string; content?: unknown };
				const needsContent =
					!row.content ||
					(typeof row.content === 'object' &&
						row.content !== null &&
						!(row.content as { content?: unknown[] }).content?.length);
				if (needsContent && hasShopifyDesc) {
					productPayload.content = htmlToTiptap(p.body_html ?? '');
					productPayload.status = 'draft';
					productPayload.word_count = (p.body_html ?? '')
						.replace(/<[^>]+>/g, ' ')
						.trim()
						.split(/\s+/)
						.filter(Boolean).length;
				}
				await supabase.from('ecommerce_pages').update(productPayload).eq('id', row.id);
			} else {
				if (hasShopifyDesc) {
					productPayload.content = htmlToTiptap(p.body_html ?? '');
					productPayload.status = 'draft';
					productPayload.word_count = (p.body_html ?? '')
						.replace(/<[^>]+>/g, ' ')
						.trim()
						.split(/\s+/)
						.filter(Boolean).length;
				} else {
					productPayload.status = 'no_content';
				}
				await supabase.from('ecommerce_pages').insert({
					site_id: siteId,
					organization_id: orgId,
					type: 'product',
					shopify_product_id: String(p.id),
					...productPayload
				});
			}
		}
	} else {
		const collections = await listShopifyCollections(shopDomain, accessToken);
		const toImport = collections.filter((c) => ids.includes(c.id));
		for (const c of toImport) {
			const existing = await supabase
				.from('ecommerce_pages')
				.select('id, content')
				.eq('site_id', siteId)
				.eq('shopify_collection_id', String(c.id))
				.maybeSingle();
			const url = `${shopifyBaseUrl}/collections/${c.handle}`;
			const displayMeta: Record<string, unknown> = {};
			if (c.featured_image_url) displayMeta.image_url = c.featured_image_url;
			if (c.featured_image_alt) displayMeta.image_alt = c.featured_image_alt;

			const collectionPayload: Record<string, unknown> = {
				existing_content: c.body_html ?? null,
				name: c.title,
				url,
				meta_title: c.seo_title ?? null,
				meta_description: c.seo_description ?? null,
				display_meta: Object.keys(displayMeta).length ? displayMeta : null,
				platform: 'shopify',
				platform_id: c.id_gid,
				product_count: c.products_count ?? null,
				updated_at: new Date().toISOString()
			};
			const hasShopifyDesc = (c.body_html ?? '').trim().length > 0;
			if (existing.data) {
				const row = existing.data as { id: string; content?: unknown };
				const needsContent =
					!row.content ||
					(typeof row.content === 'object' &&
						row.content !== null &&
						!(row.content as { content?: unknown[] }).content?.length);
				if (needsContent && hasShopifyDesc) {
					collectionPayload.content = htmlToTiptap(c.body_html ?? '');
					collectionPayload.status = 'draft';
					collectionPayload.word_count = (c.body_html ?? '')
						.replace(/<[^>]+>/g, ' ')
						.trim()
						.split(/\s+/)
						.filter(Boolean).length;
				}
				await supabase.from('ecommerce_pages').update(collectionPayload).eq('id', row.id);
			} else {
				if (hasShopifyDesc) {
					collectionPayload.content = htmlToTiptap(c.body_html ?? '');
					collectionPayload.status = 'draft';
					collectionPayload.word_count = (c.body_html ?? '')
						.replace(/<[^>]+>/g, ' ')
						.trim()
						.split(/\s+/)
						.filter(Boolean).length;
				} else {
					collectionPayload.status = 'no_content';
				}
				await supabase.from('ecommerce_pages').insert({
					site_id: siteId,
					organization_id: orgId,
					type: 'collection',
					shopify_collection_id: String(c.id),
					...collectionPayload
				});
			}
		}
	}

	res.json({ success: true, imported: ids.length });
}

/**
 * POST /api/ecommerce
 * Create a new product or collection page. Body: { siteId, type: 'product'|'collection', name, url? }
 */
export async function createEcommercePage(req: Request, res: Response): Promise<void> {
	const userId = (req as Request & { user?: { id: string } }).user?.id;
	if (!userId) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}
	const { siteId, type, name, url } = req.body as {
		siteId?: string;
		type?: string;
		name?: string;
		url?: string;
	};
	if (!siteId || !type || !name || typeof name !== 'string' || !name.trim()) {
		res.status(400).json({ error: 'siteId, type, and name required' });
		return;
	}
	if (type !== 'product' && type !== 'collection') {
		res.status(400).json({ error: 'type must be product or collection' });
		return;
	}
	const ok = await verifySiteAccess(req, res, siteId);
	if (!ok) return;

	const { data: site } = await supabase
		.from('sites')
		.select('id, organization_id')
		.eq('id', siteId)
		.single();
	if (!site) {
		res.status(404).json({ error: 'Site not found' });
		return;
	}
	const orgId = (site as { organization_id: string }).organization_id;

	const { data: created, error } = await supabase
		.from('ecommerce_pages')
		.insert({
			site_id: siteId,
			organization_id: orgId,
			type,
			name: name.trim(),
			url: url && typeof url === 'string' ? url.trim() || null : null,
			status: 'no_content',
			platform: 'manual',
			platform_id: null
		})
		.select('id')
		.single();

	if (error) {
		console.error('[Ecommerce] Create error:', error);
		res.status(500).json({ error: 'Failed to create page' });
		return;
	}
	res.status(201).json({ page: { id: (created as { id: string }).id } });
}

/** Count words in text */
function countWords(text: string): number {
	return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

/**
 * PATCH /api/ecommerce/:id
 * Update ecommerce page. Body: { name?, keyword?, url?, meta_title?, meta_description?, content? }
 */
export async function updateEcommercePage(req: Request, res: Response): Promise<void> {
	const page = await loadPageAndVerifyOrg(req, res, req.params.id);
	if (!page) return;

	const { name, keyword, url, meta_title, meta_description, content } = req.body as {
		name?: string;
		keyword?: string;
		url?: string;
		meta_title?: string;
		meta_description?: string;
		content?: unknown;
	};

	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (name !== undefined && typeof name === 'string') updates.name = name.trim();
	if (keyword !== undefined)
		updates.keyword = keyword === '' || keyword === null ? null : String(keyword).trim();
	if (url !== undefined) updates.url = url === '' || url === null ? null : String(url).trim();
	if (meta_title !== undefined)
		updates.meta_title =
			meta_title === '' || meta_title === null ? null : String(meta_title).trim();
	if (meta_description !== undefined)
		updates.meta_description =
			meta_description === '' || meta_description === null ? null : String(meta_description).trim();
	if (content !== undefined && content !== null) {
		const doc =
			typeof content === 'string'
				? (JSON.parse(content) as { type?: string; content?: unknown[] })
				: (content as { type?: string; content?: unknown[] });
		if (doc && (doc.type === 'doc' || Array.isArray(doc.content))) {
			updates.content = doc;
			const wc = countWords(tiptapToHtml(doc));
			updates.word_count = wc;
			if (wc > 0) updates.status = 'draft';
		}
	}

	if (Object.keys(updates).length <= 1) {
		res.status(400).json({ error: 'No fields to update' });
		return;
	}

	const { error } = await supabase.from('ecommerce_pages').update(updates).eq('id', page.id);

	if (error) {
		console.error('[Ecommerce] Update error:', error);
		res.status(500).json({ error: 'Failed to update page' });
		return;
	}
	res.json({ success: true });
}

/**
 * DELETE /api/ecommerce/:id
 * Delete an ecommerce page.
 */
export async function deleteEcommercePage(req: Request, res: Response): Promise<void> {
	const page = await loadPageAndVerifyOrg(req, res, req.params.id);
	if (!page) return;

	const { error } = await supabase.from('ecommerce_pages').delete().eq('id', page.id);
	if (error) {
		console.error('[Ecommerce] Delete error:', error);
		res.status(500).json({ error: 'Failed to delete page' });
		return;
	}
	res.json({ success: true });
}

/**
 * POST /api/ecommerce/bulk-delete
 * Delete multiple ecommerce pages. Body: { ids: string[] }
 * Only deletes pages belonging to the user's organization.
 */
export async function bulkDeleteEcommercePages(req: Request, res: Response): Promise<void> {
	const userId = (req as Request & { user?: { id: string } }).user?.id;
	if (!userId) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}
	const orgId = await getOrgIdForUser(userId);
	if (!orgId) {
		res.status(400).json({ error: 'No organization found' });
		return;
	}
	const { ids } = req.body as { ids?: string[] };
	if (!Array.isArray(ids) || ids.length === 0) {
		res.status(400).json({ error: 'ids array required' });
		return;
	}
	const validIds = ids.filter((id): id is string => typeof id === 'string' && id.length > 0);
	if (validIds.length === 0) {
		res.json({ deleted: 0 });
		return;
	}

	const { data, error } = await supabase
		.from('ecommerce_pages')
		.delete()
		.eq('organization_id', orgId)
		.in('id', validIds)
		.select('id');
	if (error) {
		console.error('[Ecommerce] Bulk delete error:', error);
		res.status(500).json({ error: 'Failed to delete pages' });
		return;
	}
	const deleted = Array.isArray(data) ? data.length : 0;
	res.json({ deleted });
}

/**
 * POST /api/ecommerce/:id/sync
 * Sync single record from Shopify. Updates only: display_meta, existing_content, meta_title, meta_description,
 * platform_status, variant_count, product_count. Never touches content, keyword, schema_json, platform, platform_id.
 */
export async function syncEcommercePage(req: Request, res: Response): Promise<void> {
	const page = await loadPageAndVerifyOrg(req, res, req.params.id);
	if (!page) return;

	const platform = (page as { platform?: string }).platform;
	const platform_id = (page as { platform_id?: string | null }).platform_id;
	if (platform !== 'shopify' || !platform_id) {
		res.status(400).json({ error: 'Not a Shopify-connected record' });
		return;
	}

	const siteId = page.site_id;
	const { shopDomain, accessToken } = await getShopifyToken(siteId);
	if (!shopDomain || !accessToken) {
		res.status(400).json({ error: 'Shopify not connected for this site' });
		return;
	}

	const shopifyBaseUrl = `https://${shopDomain.replace(/\/$/, '')}`;
	let displayMeta: Record<string, unknown> = {};
	let existing_content: string | null = null;
	let meta_title: string | null = null;
	let meta_description: string | null = null;
	let platform_status: string | null = null;
	let variant_count: number | null = null;
	let product_count: number | null = null;

	if (page.type === 'product') {
		const p = await getShopifyProductByGid(shopDomain, accessToken, platform_id);
		if (!p) {
			res.status(404).json({ error: 'Product not found in Shopify' });
			return;
		}
		if (p.featured_image_url) displayMeta.image_url = p.featured_image_url;
		if (p.featured_image_alt) displayMeta.image_alt = p.featured_image_alt;
		if (p.price) displayMeta.price = p.price;
		if (p.currency) displayMeta.currency = p.currency;
		if (p.vendor) displayMeta.vendor = p.vendor;
		if (p.product_type) displayMeta.product_type = p.product_type;
		if (p.tags?.length) displayMeta.tags = p.tags;
		existing_content = p.body_html ?? null;
		meta_title = p.seo_title ?? null;
		meta_description = p.seo_description ?? null;
		platform_status = p.status?.toLowerCase() ?? null;
		variant_count = p.variant_count ?? null;
	} else if (page.type === 'collection') {
		const c = await getShopifyCollectionByGid(shopDomain, accessToken, platform_id);
		if (!c) {
			res.status(404).json({ error: 'Collection not found in Shopify' });
			return;
		}
		if (c.featured_image_url) displayMeta.image_url = c.featured_image_url;
		if (c.featured_image_alt) displayMeta.image_alt = c.featured_image_alt;
		existing_content = c.body_html ?? null;
		meta_title = c.seo_title ?? null;
		meta_description = c.seo_description ?? null;
		product_count = c.products_count ?? null;
	} else {
		res.status(400).json({ error: 'Unknown page type' });
		return;
	}

	const updates: Record<string, unknown> = {
		display_meta: Object.keys(displayMeta).length ? displayMeta : null,
		existing_content,
		meta_title,
		meta_description,
		platform_status,
		variant_count: variant_count ?? null,
		product_count: product_count ?? null,
		updated_at: new Date().toISOString()
	};

	const { data: updated, error } = await supabase
		.from('ecommerce_pages')
		.update(updates)
		.eq('id', page.id)
		.select()
		.single();

	if (error) {
		console.error('[Ecommerce] Sync update error:', error);
		res.status(500).json({ error: 'Failed to sync' });
		return;
	}
	res.json({ page: updated });
}

/**
 * POST /api/ecommerce/sync-all
 * Sync all Shopify-connected records for the org. Returns { synced, skipped, errors }.
 */
export async function syncAllEcommercePages(req: Request, res: Response): Promise<void> {
	const userId = (req as Request & { user?: { id: string } }).user?.id;
	if (!userId) {
		res.status(401).json({ error: 'Unauthorized' });
		return;
	}
	const orgId = await getOrgIdForUser(userId);
	if (!orgId) {
		res.status(400).json({ error: 'No organization found' });
		return;
	}

	const { data: rows, error } = await supabase
		.from('ecommerce_pages')
		.select('id, site_id, type, platform, platform_id')
		.eq('organization_id', orgId)
		.eq('platform', 'shopify')
		.not('platform_id', 'is', null);

	if (error) {
		console.error('[Ecommerce] Sync-all fetch error:', error);
		res.status(500).json({ error: 'Failed to fetch records' });
		return;
	}

	const toSync = (rows ?? []) as Array<{
		id: string;
		site_id: string;
		type: string;
		platform_id: string;
	}>;
	let synced = 0;
	const errors: string[] = [];

	for (const row of toSync) {
		try {
			const { shopDomain, accessToken } = await getShopifyToken(row.site_id);
			if (!shopDomain || !accessToken) {
				errors.push(`Site ${row.site_id} not connected to Shopify`);
				continue;
			}

			let displayMeta: Record<string, unknown> = {};
			let existing_content: string | null = null;
			let meta_title: string | null = null;
			let meta_description: string | null = null;
			let platform_status: string | null = null;
			let variant_count: number | null = null;
			let product_count: number | null = null;

			if (row.type === 'product') {
				const p = await getShopifyProductByGid(shopDomain, accessToken, row.platform_id);
				if (!p) {
					errors.push(`Product ${row.id} not found in Shopify`);
					continue;
				}
				if (p.featured_image_url) displayMeta.image_url = p.featured_image_url;
				if (p.featured_image_alt) displayMeta.image_alt = p.featured_image_alt;
				if (p.price) displayMeta.price = p.price;
				if (p.currency) displayMeta.currency = p.currency;
				if (p.vendor) displayMeta.vendor = p.vendor;
				if (p.product_type) displayMeta.product_type = p.product_type;
				if (p.tags?.length) displayMeta.tags = p.tags;
				existing_content = p.body_html ?? null;
				meta_title = p.seo_title ?? null;
				meta_description = p.seo_description ?? null;
				platform_status = p.status?.toLowerCase() ?? null;
				variant_count = p.variant_count ?? null;
			} else if (row.type === 'collection') {
				const c = await getShopifyCollectionByGid(shopDomain, accessToken, row.platform_id);
				if (!c) {
					errors.push(`Collection ${row.id} not found in Shopify`);
					continue;
				}
				if (c.featured_image_url) displayMeta.image_url = c.featured_image_url;
				if (c.featured_image_alt) displayMeta.image_alt = c.featured_image_alt;
				existing_content = c.body_html ?? null;
				meta_title = c.seo_title ?? null;
				meta_description = c.seo_description ?? null;
				product_count = c.products_count ?? null;
			}

			const updates: Record<string, unknown> = {
				display_meta: Object.keys(displayMeta).length ? displayMeta : null,
				existing_content,
				meta_title,
				meta_description,
				platform_status,
				variant_count: variant_count ?? null,
				product_count: product_count ?? null,
				updated_at: new Date().toISOString()
			};

			const { error: updateErr } = await supabase
				.from('ecommerce_pages')
				.update(updates)
				.eq('id', row.id);

			if (updateErr) {
				errors.push(`Update failed for ${row.id}: ${updateErr.message}`);
			} else {
				synced++;
			}
		} catch (err) {
			errors.push(`Sync failed for ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	const skipped = toSync.length - synced - errors.length;
	res.json({ synced, skipped: Math.max(0, skipped), errors });
}

/**
 * GET /api/ecommerce?siteId=...&type=product|collection&limit=25&offset=0 (optional)
 * List ecommerce pages for hub table with pagination.
 */
export async function listEcommercePages(req: Request, res: Response): Promise<void> {
	const siteId = req.query.siteId as string;
	const type = req.query.type as string | undefined;
	const limit = Math.min(Math.max(1, parseInt(String(req.query.limit || 25), 10)), 100);
	const offset = Math.max(0, parseInt(String(req.query.offset || 0), 10));
	if (!siteId) {
		res.status(400).json({ error: 'siteId required' });
		return;
	}
	const ok = await verifySiteAccess(req, res, siteId);
	if (!ok) return;

	let q = supabase
		.from('ecommerce_pages')
		.select(
			'id, site_id, type, name, keyword, url, existing_content, content, schema_json, word_count, meta_title, meta_description, seo_checks, status, shopify_product_id, shopify_collection_id, featured_image_url, display_meta, platform, platform_id, variant_count, product_count, platform_status, published_url, published_at, created_at, updated_at',
			{ count: 'exact' }
		)
		.eq('site_id', siteId)
		.order('updated_at', { ascending: false });
	if (type === 'product' || type === 'collection') q = q.eq('type', type);
	q = q.range(offset, offset + limit - 1);
	const { data, error, count } = await q;
	if (error) {
		console.error('[Ecommerce] List error:', error);
		res.status(500).json({ error: 'Failed to list pages' });
		return;
	}
	res.json({ pages: data ?? [], total: count ?? 0 });
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
			variants_count: p.variant_count,
			featured_image_url: p.featured_image_url ?? null
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
			products_count: c.products_count,
			featured_image_url: c.featured_image_url ?? null
		}))
	});
}
