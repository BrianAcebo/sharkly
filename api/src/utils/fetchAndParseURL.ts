/**
 * CRO Studio — fetch live URL and parse rendered HTML
 * Extracts body content with nav/header/footer stripped for audit analysis.
 * Used by checkDestinationHandoff, evaluateSEOPageCRO, evaluateOptimalSellingJourney.
 *
 * Spec: cro-studio.md
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { ChildNode, Element } from 'domhandler';

const USER_AGENT = 'Mozilla/5.0 (compatible; SharklyBot/1.0; +https://sharkly.co)';
const TIMEOUT_MS = 15_000;

/** A link found in document order with its anchor text and word offset */
export interface ParsedLink {
	href: string;
	text: string;
	wordOffset: number;
}

/** Parsed page content for CRO audit — body text, links in order, metadata */
export interface ParsedPageContent {
	/** URL of the fetched page (for resolving relative links) */
	pageUrl: string;
	/** Plain text of body content (nav/header/footer stripped) */
	bodyText: string;
	/** Links in document order with href, anchor text, and word offset (for first-link-in-400-words check) */
	links: ParsedLink[];
	/** Raw HTML of the page (for any additional parsing) */
	html: string;
	/** Title from head */
	title: string | null;
	/** H1 text */
	h1: string | null;
	/** Meta description */
	metaDescription: string | null;
	/** Text of elements above the fold (~first 300 words) for emotional hook detection */
	aboveFoldText: string;
}

/** Selectors to remove (nav, header, footer) — typical chrome that wraps main content */
const STRIP_SELECTORS = [
	'nav',
	'header',
	'footer',
	'[role="navigation"]',
	'[role="banner"]',
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
	'.consent-banner',
	'[role="contentinfo"]'
];

/** Selectors for main content — try these first before falling back to body */
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
 * Count words in a string (split on whitespace, filter empty).
 */
function wordCount(s: string): number {
	return s.split(/\s+/).filter(Boolean).length;
}

/**
 * Walk the DOM in document order, collecting text and links with word offsets.
 */
function collectTextAndLinks(
	$: CheerioAPI,
	element: ChildNode,
	acc: { words: number; links: ParsedLink[] }
): void {
	const el = element;
	if (el.type === 'text') {
		const text = 'data' in el ? String((el as { data?: string }).data ?? '') : '';
		acc.words += wordCount(text);
		return;
	}

	if (el.type !== 'tag') return;
	const tagName = (el as Element).name?.toLowerCase();
	const $el = $(el);

	if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') return;

	if (tagName === 'a') {
		const href = $el.attr('href') ?? '';
		const text = $el.text().replace(/\s+/g, ' ').trim();
		acc.links.push({ href, text, wordOffset: acc.words });
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
 * Extract body content from a cheerio-loaded document: strip nav/header/footer,
 * find main content, return plain text and links in document order.
 */
function extractBodyContent($: CheerioAPI, $content: cheerio.Cheerio<Element>): { bodyText: string; links: ParsedLink[] } {
	$content.find('script, style, noscript, svg, iframe').remove();

	const acc = { words: 0, links: [] as ParsedLink[] };
	$content.contents().each((_, child) => {
		if (child.type === 'text') {
			const t = 'data' in child ? String((child as { data?: string }).data ?? '') : '';
			acc.words += wordCount(t);
		} else if (child.type === 'tag') {
			collectTextAndLinks($, child as Element, acc);
		}
	});

	const bodyText = $content.text().replace(/\s+/g, ' ').trim();
	return { bodyText, links: acc.links };
}

/**
 * Get text above the fold (first ~300 words) for emotional hook detection.
 */
function extractAboveFoldText($: CheerioAPI, $content: cheerio.Cheerio<Element>, targetWords = 300): string {
	$content.find('script, style, noscript, svg, iframe').remove();
	const fullText = $content.text().replace(/\s+/g, ' ').trim();
	const words = fullText.split(/\s+/).filter(Boolean);
	const aboveFold = words.slice(0, targetWords).join(' ');
	return aboveFold;
}

/**
 * Fetch a URL and parse the rendered HTML.
 * Strips nav, header, footer. Extracts main content, body text, and links in document order.
 *
 * @param url - Full URL to fetch
 * @returns ParsedPageContent or null on fetch/parse failure
 */
export async function fetchAndParseURL(url: string): Promise<ParsedPageContent | null> {
	try {
		const res = await axios.get(url, {
			timeout: TIMEOUT_MS,
			maxRedirects: 5,
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

		// Clone body to avoid mutating the original
		const $body = $('body').clone();

		// Remove nav, header, footer
		for (const sel of STRIP_SELECTORS) {
			$body.find(sel).remove();
		}

		// Try to find main content; fallback to body if none
		let $content = $body.find(MAIN_CONTENT_SELECTORS.join(',')).first();
		if ($content.length === 0) {
			$content = $body;
		}

		const { bodyText, links } = extractBodyContent($, $content);
		const aboveFoldText = extractAboveFoldText($, $content);

		return {
			pageUrl: url,
			bodyText,
			links,
			html,
			title,
			h1,
			metaDescription: metaDesc,
			aboveFoldText
		};
	} catch {
		return null;
	}
}
