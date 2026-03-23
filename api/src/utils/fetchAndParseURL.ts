/**
 * CRO Studio — fetch live URL and parse rendered HTML.
 *
 * RENDERING STRATEGY:
 *   1. Attempt Puppeteer headless Chrome — full JS rendering, waits for
 *      network idle so dynamic content (prices, reviews, CTAs) is present.
 *   2. Falls back to axios plain HTTP fetch if Puppeteer is unavailable or
 *      times out — sufficient for server-rendered pages.
 *
 * VISIBILITY FILTERING:
 *   All text extraction strips visually-hidden elements before calling .text()
 *   so screen-reader-only labels (sr-only, visually-hidden, aria-hidden) never
 *   appear in bodyText, aboveFoldText, or link anchor text.
 *
 * RENDER CONFIDENCE:
 *   Adds renderConfidence ('full' | 'static') and isJsRendered to the result
 *   so callers can surface a warning when JS rendering was unavailable.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { ChildNode, Element } from 'domhandler';

const USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT_MS = 25_000;
const PUPPETEER_TIMEOUT_MS = 20_000;

// ─── Types ────────────────────────────────────────────────────────────────────

/** A link found in document order with its anchor text and word offset */
export interface ParsedLink {
	href: string;
	text: string;
	wordOffset: number;
}

/**
 * How confidently the page was rendered.
 * - full: Puppeteer rendered JS, network idle — dynamic content present
 * - static: axios plain fetch — JS-rendered content may be missing
 */
export type RenderConfidence = 'full' | 'static';

/** Parsed page content for CRO audit */
export interface ParsedPageContent {
	pageUrl: string;
	/** Visible body text only — hidden/sr-only elements stripped */
	bodyText: string;
	/** Links in document order with visible anchor text and word offset */
	links: ParsedLink[];
	/** Raw HTML (post-render if Puppeteer was used) */
	html: string;
	title: string | null;
	/** Visible H1 text only — sr-only children stripped */
	h1: string | null;
	metaDescription: string | null;
	/** First ~300 visible words — for above-fold and attention checks */
	aboveFoldText: string;
	/** How the page was fetched */
	renderConfidence: RenderConfidence;
	/** True when JS framework signals detected — audit accuracy warning may apply */
	isJsRendered: boolean;
}

// ─── Selectors ────────────────────────────────────────────────────────────────

const STRIP_SELECTORS = [
	'nav',
	'header',
	'footer',
	'[role="navigation"]',
	'[role="banner"]',
	'[role="contentinfo"]',
	'.nav',
	'.navbar',
	'.header',
	'.footer',
	'.site-header',
	'.site-footer',
	'.main-nav',
	'.primary-nav',
	'#nav',
	'#header',
	'#footer',
	'.cookie-banner',
	'.consent-banner'
];

const MAIN_CONTENT_SELECTORS = [
	'main',
	'article',
	'[role="main"]',
	'.main-content',
	'.content',
	'.post-content',
	'.article-content',
	'.entry-content',
	'#content',
	'#main'
];

/**
 * Selectors for elements that are in the DOM but invisible to sighted users.
 * Their text must never appear in bodyText, aboveFoldText, or link text.
 * Covers: Shopify visually-hidden, Bootstrap/Tailwind sr-only,
 * WordPress screen-reader-text, aria-hidden decorative elements.
 */
const VISUALLY_HIDDEN_SELECTORS = [
	'.visually-hidden',
	'.visuallyhidden',
	'.sr-only',
	'.screen-reader-text',
	'.screen-reader-only',
	'.offscreen',
	'[aria-hidden="true"]'
].join(',');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wordCount(s: string): number {
	return s.split(/\s+/).filter(Boolean).length;
}

/**
 * Strip all visually-hidden elements from a Cheerio subtree in-place.
 * Covers class-based hiding, aria-hidden, and inline-style hiding.
 * Must be called BEFORE any .text() extraction on the subtree.
 */
function stripHiddenElements($: CheerioAPI, $root: ReturnType<CheerioAPI>): void {
	// Class/attribute-based hiding
	$root.find(VISUALLY_HIDDEN_SELECTORS).remove();

	// Inline-style: position:absolute + clip or 1px dimensions (CSS clip-path visually-hidden technique)
	$root.find('[style]').each((_, el) => {
		const style = ($(el).attr('style') ?? '').toLowerCase().replace(/\s/g, '');
		if (
			/position:absolute/.test(style) &&
			(/clip:rect\(0/.test(style) || /width:1px/.test(style) || /height:1px/.test(style))
		) {
			$(el).remove();
		}
	});

	// Inline display:none and visibility:hidden
	$root.find('[style]').each((_, el) => {
		const style = ($(el).attr('style') ?? '').toLowerCase().replace(/\s/g, '');
		if (/display:none/.test(style) || /visibility:hidden/.test(style)) {
			$(el).remove();
		}
	});
}

/**
 * Detect whether a page uses client-side JavaScript rendering.
 * Checks for React, Vue, Next.js, Nuxt, Shopify, and empty-shell patterns.
 * Used to set isJsRendered and decide whether to warn the user.
 */
function detectJsRendering(html: string): boolean {
	if (/__NEXT_DATA__|__nuxt|ng-version|data-reactroot|data-react-checksum/.test(html)) return true;
	if (/window\.Shopify\s*=|Shopify\.theme/.test(html)) return true;
	if (/window\.__store__|window\.__INITIAL_STATE__|window\.__APP_STATE__/.test(html)) return true;
	if (/vue\.config|data-v-app/.test(html)) return true;

	// Nearly-empty body shell — content injected by JS
	const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
	if (bodyMatch) {
		const bodyContent = bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim();
		const textOnly = bodyContent.replace(/<[^>]+>/g, '').trim();
		if (textOnly.length < 200 && bodyContent.length > 0) return true;
	}

	return false;
}

/**
 * Extract clean H1 text, stripping any visually-hidden child elements.
 * Prevents sr-only icon labels from appearing in the H1 value.
 */
function extractH1($: CheerioAPI): string | null {
	const $h1 = $('h1').first();
	if (!$h1.length) return null;
	const $clone = $h1.clone();
	$clone.find(VISUALLY_HIDDEN_SELECTORS).remove();
	$clone.find('[style]').each((_, el) => {
		const style = ($(el).attr('style') ?? '').toLowerCase().replace(/\s/g, '');
		if (/position:absolute/.test(style) && (/clip:rect\(0/.test(style) || /width:1px/.test(style)))
			$(el).remove();
	});
	return $clone.text().replace(/\s+/g, ' ').trim() || null;
}

/**
 * Walk DOM collecting links with visible anchor text and word offsets.
 * Assumes stripHiddenElements has already run on the tree.
 */
function collectTextAndLinks(
	$: CheerioAPI,
	element: ChildNode,
	acc: { words: number; links: ParsedLink[] }
): void {
	if (element.type === 'text') {
		const text = 'data' in element ? String((element as { data?: string }).data ?? '') : '';
		acc.words += wordCount(text);
		return;
	}
	if (element.type !== 'tag') return;

	const tagName = (element as Element).name?.toLowerCase();
	const $el = $(element);
	if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') return;

	if (tagName === 'a') {
		const href = $el.attr('href') ?? '';
		// .text() is clean because stripHiddenElements already ran
		const text = $el.text().replace(/\s+/g, ' ').trim();
		if (text || href) acc.links.push({ href, text, wordOffset: acc.words });
		$el.contents().each((_, child) => {
			if (child.type === 'text') {
				const t = 'data' in child ? String((child as { data?: string }).data ?? '') : '';
				acc.words += wordCount(t);
			} else if (child.type === 'tag') {
				collectTextAndLinks($, child as Element, acc);
			}
		});
		return;
	}

	$el.contents().each((_, child) => {
		if (child.type === 'text') {
			const t = 'data' in child ? String((child as { data?: string }).data ?? '') : '';
			acc.words += wordCount(t);
		} else if (child.type === 'tag') {
			collectTextAndLinks($, child as Element, acc);
		}
	});
}

/**
 * Extract clean body content. stripHiddenElements must be called first.
 */
function extractBodyContent(
	$: CheerioAPI,
	$content: ReturnType<CheerioAPI>
): { bodyText: string; links: ParsedLink[] } {
	$content.find('script, style, noscript, svg, iframe').remove();
	// Safe to call .text() — hidden elements already stripped
	const bodyText = $content.text().replace(/\s+/g, ' ').trim();
	const acc = { words: 0, links: [] as ParsedLink[] };
	$content.contents().each((_, child) => {
		if (child.type === 'text') {
			const t = 'data' in child ? String((child as { data?: string }).data ?? '') : '';
			acc.words += wordCount(t);
		} else if (child.type === 'tag') {
			collectTextAndLinks($, child as Element, acc);
		}
	});
	return { bodyText, links: acc.links };
}

/** Extract first N visible words for above-fold checks. */
function extractAboveFoldText($content: ReturnType<CheerioAPI>, targetWords = 300): string {
	return $content
		.text()
		.replace(/\s+/g, ' ')
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, targetWords)
		.join(' ');
}

// ─── Core parse ───────────────────────────────────────────────────────────────

function parseHTML(
	html: string,
	pageUrl: string,
	renderConfidence: RenderConfidence,
	isJsRendered: boolean
): ParsedPageContent {
	const $ = cheerio.load(html);

	const title = $('title').first().text().trim() || null;
	const h1 = extractH1($);
	const metaDescription = $('meta[name="description"]').attr('content')?.trim() ?? null;

	const $body = $('body').clone();
	for (const sel of STRIP_SELECTORS) $body.find(sel).remove();

	let $content = $body.find(MAIN_CONTENT_SELECTORS.join(',')).first();
	if ($content.length === 0) $content = $body;

	// Strip hidden elements ONCE before all text extraction
	stripHiddenElements($, $content as ReturnType<CheerioAPI>);

	const { bodyText, links } = extractBodyContent($, $content as ReturnType<CheerioAPI>);
	const aboveFoldText = extractAboveFoldText($content as ReturnType<CheerioAPI>);

	return {
		pageUrl,
		bodyText,
		links,
		html,
		title,
		h1,
		metaDescription,
		aboveFoldText,
		renderConfidence,
		isJsRendered
	};
}

// ─── Puppeteer fetch ──────────────────────────────────────────────────────────

async function fetchWithPuppeteer(url: string): Promise<string | null> {
	try {
		const puppeteer = await import('puppeteer').catch(() => null);
		if (!puppeteer) return null;

		const browser = await puppeteer.default.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--no-first-run',
				'--no-zygote',
				'--single-process',
				'--disable-extensions'
			]
		});

		try {
			const page = await browser.newPage();
			await page.setUserAgent(USER_AGENT);
			await page.setViewport({ width: 1280, height: 800 });

			// Block images, fonts, and media — speeds up render, we only need DOM text
			await page.setRequestInterception(true);
			page.on('request', (req) => {
				if (['image', 'media', 'font'].includes(req.resourceType())) req.abort();
				else req.continue();
			});

			await page.goto(url, { waitUntil: 'networkidle2', timeout: PUPPETEER_TIMEOUT_MS });

			// Scroll halfway to trigger lazy-loaded content without going too deep
			await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
			await new Promise((r) => setTimeout(r, 800));

			return await page.content();
		} finally {
			await browser.close();
		}
	} catch (err) {
		console.warn('[fetchAndParseURL] Puppeteer failed:', err instanceof Error ? err.message : err);
		return null;
	}
}

// ─── Axios fallback ───────────────────────────────────────────────────────────

async function fetchWithAxios(url: string): Promise<string | null> {
	try {
		const res = await axios.get(url, {
			timeout: TIMEOUT_MS,
			maxRedirects: 5,
			headers: { 'User-Agent': USER_AGENT },
			validateStatus: (s) => s < 500,
			responseType: 'text'
		});
		if (res.status >= 400 || !res.data) return null;
		return typeof res.data === 'string' ? res.data : String(res.data ?? '');
	} catch {
		return null;
	}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch a URL and parse the rendered HTML for CRO audit.
 *
 * Uses Puppeteer for JS rendering when available (Fly.io Node container).
 * Falls back to plain HTTP fetch for server-rendered pages.
 * All text extraction is visibility-clean — hidden/sr-only content excluded.
 */
export async function fetchAndParseURL(url: string): Promise<ParsedPageContent | null> {
	const puppeteerHtml = await fetchWithPuppeteer(url);
	if (puppeteerHtml) {
		return parseHTML(puppeteerHtml, url, 'full', detectJsRendering(puppeteerHtml));
	}

	const axiosHtml = await fetchWithAxios(url);
	if (!axiosHtml) return null;
	return parseHTML(axiosHtml, url, 'static', detectJsRendering(axiosHtml));
}
