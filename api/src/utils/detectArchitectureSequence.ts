/**
 * CRO Studio — page architecture sequence detection for destination pages
 * Trust-before-CTA and CTA-above-fold checks.
 *
 * Spec: cro-studio.md — detectArchitectureSequence()
 * Violations: trust signals after CTA, first CTA too far down the page
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { ChildNode, Element } from 'domhandler';
import type { ParsedPageContent } from './fetchAndParseURL.js';

/** Single architecture violation to show in the audit */
export interface ArchitectureViolation {
	type: 'trust_after_cta' | 'cta_too_late';
	message: string;
	suggestion: string;
	evidence?: string;
}

/**
 * Credibility signals — must appear before primary CTA.
 * (Reviews, testimonials, trusted-by, etc. Establish trust before asking for conversion.)
 */
const CREDIBILITY_SIGNAL_PATTERNS = [
	/\breviews?\b/i,
	/\bstars?\b/i,
	/\brated\b/i,
	/\bcustomers?\b/i,
	/\bstores\b/i,
	/\btrusted\s+by\b/i,
	/\bused\s+by\b/i,
	/\bcompanies\b/i,
	/\bclients?\b/i,
	/\btestimonial/i,
	/\bas\s+seen\s+in\b/i,
	/\bfeatured\s+in\b/i,
	/\baward\b/i,
	/\bcertified\b/i,
	/\d[\d,]*\s*(\+\s*)?(reviews?|ratings?|stars?|customers?|clients?)/i,
	/\d+\s*(years?\s*(of\s*)?(experience|in\s+business))/i,
	/since\s+\d{4}|established\s+\d{4}|founded\s+in\s+\d{4}/i,
	/case\s+study|customer\s+story|success\s+story/i
];

/**
 * Risk-reversal signals — correct placement is at or below the CTA.
 * (Guarantee, refund, cancel anytime, etc. These belong near the conversion point.)
 * Not used for trust_after_cta; they don't violate.
 */
const RISK_REVERSAL_SIGNAL_PATTERNS = [
	/no\s+credit\s+card/i,
	/cancel\s+anytime/i,
	/money[\s-]?back/i,
	/free\s+trial/i,
	/\d+\s*[-–]\s*day\b|7\s*day|14\s*day|30\s*day/i,
	/no\s+commitment/i,
	/no\s+contract/i,
	/no\s+obligation/i,
	/\brefund\b/i,
	/\bguarantee\b/i,
	/\bwarranty\b/i,
	/risk[\s-]?free/i
];

/** CTA patterns — conversion actions */
const CTA_PATTERNS = [
	/\b(add\s+to\s+cart|buy\s+now|order\s+now|get\s+started|sign\s+up)\b/i,
	/\b(claim|start\s+free|try\s+free|subscribe)\b/i,
	/\b(checkout|purchase|place\s+order)\b/i,
	/\b(join|register|create\s+account)\b/i,
	/\b(book\s+now|schedule|request\s+demo)\b/i
];

/** Max % of page where first CTA can appear (45% = violation if later) */
const CTA_ABOVE_FOLD_THRESHOLD = 0.45;

/** Selectors to remove (same as fetchAndParseURL) */
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

function wordCount(s: string): number {
	return s.split(/\s+/).filter(Boolean).length;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
	return patterns.some((p) => p.test(text));
}

function isCTAElement($: CheerioAPI, el: Element): boolean {
	const tagName = (el as Element).name?.toLowerCase();
	const $el = $(el);

	if (tagName === 'button') return true;
	if (tagName === 'input' && $el.attr('type')?.toLowerCase() === 'submit') return true;

	if (tagName === 'a') {
		const text = $el.text().replace(/\s+/g, ' ').trim();
		if (matchesAny(text, CTA_PATTERNS)) return true;
		// Links to checkout, cart, signup etc often have CTA intent
		const href = ($el.attr('href') ?? '').toLowerCase();
		if (
			/checkout|cart|signup|register|buy|subscribe|start|get-started|try/.test(
				href
			)
		) {
			return true;
		}
	}

	return false;
}

/** Only credibility signals matter for trust_after_cta. Risk-reversal at/below CTA = correct. */
function hasCredibilitySignal(text: string): boolean {
	return matchesAny(text, CREDIBILITY_SIGNAL_PATTERNS);
}

interface WalkState {
	wordPos: number;
	firstCtaPos: number | null;
	firstTrustPos: number | null;
}

function walkContent(
	$: CheerioAPI,
	element: ChildNode,
	state: WalkState
): void {
	const el = element;

	if (el.type === 'text') {
		const text = 'data' in el ? String((el as { data?: string }).data ?? '') : '';
		state.wordPos += wordCount(text);
		return;
	}

	if (el.type !== 'tag') return;
	const tagName = (el as Element).name?.toLowerCase();
	const $el = $(el);

	if (tagName === 'script' || tagName === 'style' || tagName === 'noscript')
		return;

	// Check CTA before descending (element position = current word pos)
	if (isCTAElement($, el as Element)) {
		if (state.firstCtaPos === null) {
			state.firstCtaPos = state.wordPos;
		}
	}

	// Check credibility (reviews, testimonials, etc.) — risk-reversal doesn't count
	const text = $el.text().replace(/\s+/g, ' ').trim();
	if (text.length >= 15 && hasCredibilitySignal(text)) {
		if (state.firstTrustPos === null) {
			state.firstTrustPos = state.wordPos;
		}
	}

	$el.contents().each((_, child) => {
		if (child.type === 'text') {
			const t =
				'data' in child ? String((child as { data?: string }).data ?? '') : '';
			const w = wordCount(t);
			state.wordPos += w;
			if (t.length >= 15 && hasCredibilitySignal(t) && state.firstTrustPos === null) {
				state.firstTrustPos = state.wordPos - w; // position at start of this text
			}
		} else if (child.type === 'tag') {
			walkContent($, child as Element, state);
		}
	});
}

/**
 * Detect page architecture violations for destination pages.
 * Returns violations when:
 * - Trust signals appear after the first CTA (ask before trust)
 * - First CTA appears after 45% of page content (no early conversion path)
 *
 * @param content - Parsed page content from fetchAndParseURL (null = fetch failed)
 */
export function detectArchitectureSequence(
	content: ParsedPageContent | null
): ArchitectureViolation[] {
	const violations: ArchitectureViolation[] = [];

	if (!content?.html) return violations;

	const $ = cheerio.load(content.html);
	const $body = $('body').clone();

	for (const sel of STRIP_SELECTORS) {
		$body.find(sel).remove();
	}

	let $content = $body.find(MAIN_CONTENT_SELECTORS.join(',')).first();
	if ($content.length === 0) {
		$content = $body;
	}

	$content.find('script, style, noscript, svg, iframe').remove();

	const state: WalkState = {
		wordPos: 0,
		firstCtaPos: null,
		firstTrustPos: null
	};

	$content.contents().each((_, child) => {
		if (child.type === 'text') {
			const t =
				'data' in child ? String((child as { data?: string }).data ?? '') : '';
			state.wordPos += wordCount(t);
		} else if (child.type === 'tag') {
			walkContent($, child as Element, state);
		}
	});

	const totalWords = wordCount(content.bodyText) || 1;

	// Violation 1: Credibility signals after CTA (reviews, testimonials, trusted-by)
	// Risk-reversal (guarantee, refund, cancel anytime) at/below CTA = pass
	if (
		state.firstCtaPos !== null &&
		state.firstTrustPos !== null &&
		state.firstTrustPos > state.firstCtaPos
	) {
		violations.push({
			type: 'trust_after_cta',
			message:
				'Credibility signals (reviews, testimonials, trusted-by) appear after your CTA. You are asking for commitment before establishing trust.',
			suggestion:
				'Move social proof or credentials above your primary CTA.',
			evidence: `First CTA at ~${Math.round((state.firstCtaPos / totalWords) * 100)}% of page; first credibility signal at ~${Math.round((state.firstTrustPos / totalWords) * 100)}%.`
		});
	}

	// Violation 2: No credibility before CTA (CTA exists but no reviews/testimonials before it)
	if (
		state.firstCtaPos !== null &&
		state.firstTrustPos === null
	) {
		violations.push({
			type: 'trust_after_cta',
			message:
				'No credibility signals detected before your CTA. You are asking for commitment before establishing trust.',
			suggestion:
				'Add reviews, testimonials, or credentials above your primary CTA.'
		});
	}

	// Violation 3: First CTA too far down the page
	if (state.firstCtaPos !== null) {
		const pct = state.firstCtaPos / totalWords;
		if (pct > CTA_ABOVE_FOLD_THRESHOLD) {
			violations.push({
				type: 'cta_too_late',
				message: `First CTA does not appear until ${Math.round(pct * 100)}% down the page. Visitors ready to convert right now have no way to act when they land.`,
				suggestion: 'Add a CTA in the first section of the page.',
				evidence: `Total content: ~${totalWords} words; first CTA at word ~${state.firstCtaPos}.`
			});
		}
	}

	return violations;
}
