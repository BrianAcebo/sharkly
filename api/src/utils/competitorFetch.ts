/**
 * Deep competitor page fetch — extracts 12+ on-page signals per competitor.
 *
 * Phase 1 upgrade: was title + H2s + word_count only.
 * Now collects the full signal set that POP's Page Structure tab shows,
 * enabling per-element competitor benchmarks in Phase 2.
 *
 * Signals collected per page:
 *   Headings   : h1, h2s[], h3s[], h2_count, h3_count
 *   Content    : word_count, paragraph_count
 *   Links      : internal_link_count, external_link_count
 *   Media      : image_count, image_alt_count
 *   Formatting : bold_count
 *   Schema     : schema_types[] (from JSON-LD)
 *   Semantics  : lsi_term_freq{} (top-25 content words, for Phase 2 targets)
 *
 * All extractions are pure DOM queries — no extra HTTP calls.
 * Timeout unchanged at 12s. Parallel limit unchanged at 5.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (compatible; SharklyBot/1.0; +https://sharkly.co)';
const TIMEOUT_MS = 12_000;

// ---------------------------------------------------------------------------
// CompetitorPage — full signal set (Phase 1+)
// ---------------------------------------------------------------------------

export interface CompetitorPage {
	// ── Core (unchanged) ──────────────────────────────────────────────────
	title: string | null;
	url: string;
	word_count: number;
	h2s: string[];

	// ── Headings ──────────────────────────────────────────────────────────
	h1: string | null;
	h3s: string[];
	h2_count: number;
	h3_count: number;

	// ── Content structure ─────────────────────────────────────────────────
	paragraph_count: number;

	// ── Links ─────────────────────────────────────────────────────────────
	/** <a href> pointing to same domain or relative */
	internal_link_count: number;
	/** <a href> pointing to a different domain */
	external_link_count: number;

	// ── Media ─────────────────────────────────────────────────────────────
	image_count: number;
	/** Images that have a non-empty alt attribute */
	image_alt_count: number;

	// ── Formatting ────────────────────────────────────────────────────────
	bold_count: number;

	// ── Schema ────────────────────────────────────────────────────────────
	schema_types: string[];

	// ── Semantic frequency ────────────────────────────────────────────────
	/**
	 * Top-25 content words by raw frequency in the page body.
	 * Keys are lowercase words ≥4 chars (stop-words stripped).
	 * Used in Phase 2 to compute per-element LSI term targets.
	 */
	lsi_term_freq: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Stop words — excluded from lsi_term_freq
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
	'that',
	'this',
	'with',
	'from',
	'have',
	'been',
	'will',
	'your',
	'they',
	'their',
	'what',
	'when',
	'where',
	'which',
	'there',
	'more',
	'also',
	'about',
	'into',
	'some',
	'than',
	'then',
	'these',
	'those',
	'such',
	'each',
	'both',
	'very',
	'just',
	'over',
	'back',
	'after',
	'before',
	'through',
	'during',
	'without',
	'between',
	'because',
	'while',
	'make',
	'most',
	'other',
	'many',
	'time',
	'like',
	'only',
	'well',
	'even',
	'should',
	'could',
	'would',
	'being',
	'were',
	'does',
	'doing',
	'used',
	'using',
	'help',
	'need',
	'want',
	'know',
	'look',
	'come',
	'take',
	'work',
	'find',
	'give',
	'tell',
	'keep',
	'come',
	'made',
	'good',
	'great',
	'best',
	'free',
	'home',
	'page',
	'site',
	'website',
	'http',
	'https',
	'www',
	'html',
	'read',
	'more',
	'click',
	'here'
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract top-N content words from plain text.
 * Returns { word: count } sorted by frequency, capped at topN entries.
 */
function extractLsiTermFreq(text: string, topN = 25): Record<string, number> {
	const freq: Record<string, number> = {};
	const words = text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter((w) => w.length >= 4 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));

	for (const word of words) {
		freq[word] = (freq[word] ?? 0) + 1;
	}

	// Sort by frequency, keep top N
	return Object.fromEntries(
		Object.entries(freq)
			.sort((a, b) => b[1] - a[1])
			.slice(0, topN)
	);
}

/**
 * Classify a link href as internal or external relative to the page origin.
 */
function classifyLink(href: string, pageOrigin: string): 'internal' | 'external' | 'ignore' {
	if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
		return 'ignore';
	}
	if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
		return 'internal';
	}
	try {
		const url = new URL(href);
		return url.origin === pageOrigin ? 'internal' : 'external';
	} catch {
		// Relative href that doesn't start with / — treat as internal
		return 'internal';
	}
}

/**
 * Parse JSON-LD blocks and extract @type values.
 */
function extractSchemaTypes($: cheerio.CheerioAPI): string[] {
	const types: string[] = [];
	$('script[type="application/ld+json"]').each((_, el) => {
		const raw = $(el).html();
		if (!raw) return;
		try {
			const parsed = JSON.parse(raw);
			const items = Array.isArray(parsed)
				? parsed
				: Array.isArray(parsed['@graph'])
					? parsed['@graph']
					: [parsed];
			for (const item of items) {
				const t = (item as { '@type'?: string | string[] })['@type'];
				if (typeof t === 'string') types.push(t);
				else if (Array.isArray(t)) types.push(...t);
			}
		} catch {
			// skip invalid JSON-LD
		}
	});
	return [...new Set(types)]; // deduplicate
}

// ---------------------------------------------------------------------------
// Core fetch
// ---------------------------------------------------------------------------

/**
 * Fetch a URL and extract the full signal set for competitor analysis.
 * Returns null on fetch/parse error (timeout, non-200, invalid HTML).
 */
export async function fetchCompetitorPage(url: string): Promise<CompetitorPage | null> {
	try {
		const res = await axios.get(url, {
			timeout: TIMEOUT_MS,
			maxRedirects: 3,
			headers: { 'User-Agent': USER_AGENT },
			validateStatus: (s) => s < 500,
			responseType: 'text'
		});
		if (res.status >= 400 || !res.data) return null;

		const html = typeof res.data === 'string' ? res.data : String(res.data ?? '');
		const $ = cheerio.load(html);

		// ── Derive page origin for link classification ─────────────────────
		let pageOrigin = '';
		try {
			pageOrigin = new URL(url).origin;
		} catch {
			pageOrigin = '';
		}

		// ── Title ──────────────────────────────────────────────────────────
		const title = $('title').first().text().trim() || null;

		// ── H1 ─────────────────────────────────────────────────────────────
		const h1 = $('h1').first().text().trim() || null;

		// ── H2s ────────────────────────────────────────────────────────────
		const h2s: string[] = [];
		$('h2').each((_, el) => {
			const text = $(el).text().trim();
			if (text) h2s.push(text);
		});

		// ── H3s ────────────────────────────────────────────────────────────
		const h3s: string[] = [];
		$('h3').each((_, el) => {
			const text = $(el).text().trim();
			if (text) h3s.push(text);
		});

		// ── Clean body clone for text-based counts ─────────────────────────
		const bodyClone = $('body').clone();
		bodyClone.find('script, style, noscript, svg, header, footer, nav').remove();

		// ── Word count ─────────────────────────────────────────────────────
		const textContent = bodyClone.text().replace(/\s+/g, ' ').trim();
		const wordCount = textContent.split(/\s+/).filter(Boolean).length;

		// ── Paragraph count ────────────────────────────────────────────────
		const paragraphCount = bodyClone.find('p').length;

		// ── Links ──────────────────────────────────────────────────────────
		let internalLinkCount = 0;
		let externalLinkCount = 0;
		$('a[href]').each((_, el) => {
			const href = ($(el).attr('href') ?? '').trim();
			const type = classifyLink(href, pageOrigin);
			if (type === 'internal') internalLinkCount++;
			else if (type === 'external') externalLinkCount++;
		});

		// ── Images ─────────────────────────────────────────────────────────
		let imageCount = 0;
		let imageAltCount = 0;
		$('img').each((_, el) => {
			imageCount++;
			const alt = ($(el).attr('alt') ?? '').trim();
			if (alt) imageAltCount++;
		});

		// ── Bold tags (<b> and <strong>) ───────────────────────────────────
		const boldCount = $('b, strong').length;

		// ── Schema types ───────────────────────────────────────────────────
		const schemaTypes = extractSchemaTypes($);

		// ── LSI term frequency (top-25 content words) ──────────────────────
		const lsiTermFreq = extractLsiTermFreq(textContent);

		return {
			title,
			url,
			word_count: wordCount,
			h2s,
			// Phase 1 additions
			h1,
			h3s,
			h2_count: h2s.length,
			h3_count: h3s.length,
			paragraph_count: paragraphCount,
			internal_link_count: internalLinkCount,
			external_link_count: externalLinkCount,
			image_count: imageCount,
			image_alt_count: imageAltCount,
			bold_count: boldCount,
			schema_types: schemaTypes,
			lsi_term_freq: lsiTermFreq
		};
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Bulk fetch
// ---------------------------------------------------------------------------

/**
 * Fetch up to `limit` competitor URLs in parallel. Returns only successful results.
 */
export async function fetchCompetitorPages(urls: string[], limit = 5): Promise<CompetitorPage[]> {
	const toFetch = urls.slice(0, limit);
	const results = await Promise.allSettled(toFetch.map((u) => fetchCompetitorPage(u)));
	const out: CompetitorPage[] = [];
	for (const r of results) {
		if (r.status === 'fulfilled' && r.value) out.push(r.value);
	}
	return out;
}

// ---------------------------------------------------------------------------
// Aggregate helpers — used by Phase 2 (per-element term targets in brief)
// ---------------------------------------------------------------------------

/**
 * Compute min / avg / max for a numeric signal across competitors.
 * Returns null if the array is empty.
 */
export function competitorSignalStats(
	competitors: CompetitorPage[],
	getter: (c: CompetitorPage) => number
): { min: number; avg: number; max: number } | null {
	if (competitors.length === 0) return null;
	const values = competitors.map(getter);
	const min = Math.min(...values);
	const max = Math.max(...values);
	const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
	return { min, avg, max };
}

/**
 * Compute the union of all schema types used by ≥2 competitors.
 * Used in Phase 5 (schema recommendation).
 */
export function competitorSchemaUnion(competitors: CompetitorPage[], minCompetitors = 2): string[] {
	const counts: Record<string, number> = {};
	for (const c of competitors) {
		for (const t of c.schema_types) {
			counts[t] = (counts[t] ?? 0) + 1;
		}
	}
	return Object.entries(counts)
		.filter(([, count]) => count >= minCompetitors)
		.sort((a, b) => b[1] - a[1])
		.map(([type]) => type);
}

/**
 * Aggregate LSI term frequencies across competitors.
 * Returns terms sorted by how often they appear (competitor count, then avg freq).
 * Used in Phase 2 to build per-page term frequency targets.
 */
export function aggregateLsiTerms(
	competitors: CompetitorPage[],
	topN = 30
): Array<{ term: string; competitor_count: number; avg_freq: number; target_freq: number }> {
	if (competitors.length === 0) return [];

	const termData: Record<string, { totalFreq: number; competitorCount: number }> = {};

	for (const c of competitors) {
		for (const [term, freq] of Object.entries(c.lsi_term_freq)) {
			if (!termData[term]) termData[term] = { totalFreq: 0, competitorCount: 0 };
			termData[term].totalFreq += freq;
			termData[term].competitorCount += 1;
		}
	}

	return Object.entries(termData)
		.map(([term, { totalFreq, competitorCount }]) => ({
			term,
			competitor_count: competitorCount,
			avg_freq: Math.round(totalFreq / competitorCount),
			// Target = competitor average × 1.1, rounded up (dissertation §5.3)
			target_freq: Math.ceil((totalFreq / competitorCount) * 1.1)
		}))
		.sort((a, b) => b.competitor_count - a.competitor_count || b.avg_freq - a.avg_freq)
		.slice(0, topN);
}

// ---------------------------------------------------------------------------
// PageSeoMeta — unchanged (used by SEO checks endpoint)
// ---------------------------------------------------------------------------

/** Result for ecommerce SEO checks — title, H1, meta, schema types from live page */
export interface PageSeoMeta {
	title: string | null;
	h1: string | null;
	metaDescription: string | null;
	metaDescriptionLength: number;
	schemaTypes: string[];
}

/**
 * Fetch a URL and extract metadata for SEO checks (title, H1, meta description, JSON-LD types).
 * Returns null on fetch/parse error.
 */
export async function fetchPageForSeoChecks(url: string): Promise<PageSeoMeta | null> {
	try {
		const res = await axios.get(url, {
			timeout: TIMEOUT_MS,
			maxRedirects: 3,
			headers: { 'User-Agent': USER_AGENT },
			validateStatus: (s) => s < 500,
			responseType: 'text'
		});
		if (res.status >= 400 || !res.data) return null;

		const html = typeof res.data === 'string' ? res.data : String(res.data ?? '');
		const $ = cheerio.load(html);

		const title = $('title').first().text().trim() || null;
		const h1 = $('h1').first().text().trim() || null;
		const metaDesc = $('meta[name="description"]').attr('content')?.trim() ?? null;
		const metaDescLen = metaDesc ? metaDesc.length : 0;
		const schemaTypes = extractSchemaTypes($);

		return {
			title,
			h1,
			metaDescription: metaDesc,
			metaDescriptionLength: metaDescLen,
			schemaTypes
		};
	} catch {
		return null;
	}
}
