/**
 * CRO Studio — detection utilities for extended audit fields.
 * generateHeadlineInsight, evaluateAboveFold, evaluateObjectionCoverage, detectCognitiveLoad
 *
 * Spec: cro-studio.md
 */

import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import type { ChildNode, Element } from 'domhandler';
import type { ParsedPageContent } from './fetchAndParseURL.js';
import type { ArchitectureViolation } from './detectArchitectureSequence.js';
import type { JourneyStepResult } from './evaluateOptimalSellingJourney.js';
import type { CognitiveBiasResult } from './detectCognitiveBiases.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const GPT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';

/** Above-fold evaluation result — first 20% of body */
export interface AboveFoldResult {
	headline_value_prop: boolean;
	trust_signal: boolean;
	cta_present: boolean;
	visual_relevant: boolean;
	score: number;
	/** True when page uses JS rendering but was fetched statically — results may be incomplete */
	renderWarning?: boolean;
}

/** Objection coverage per page subtype */
export interface ObjectionItem {
	id: string;
	label: string;
	visitor_voice: string;
	status: 'addressed' | 'partial' | 'unaddressed';
}

export interface ObjectionCoverageResult {
	objections: ObjectionItem[];
	addressed: number;
	total: number;
}

/** Cognitive load signals — includes actual detected text for AI explanation */
export interface CognitiveLoadResult {
	level: 'normal' | 'high';
	cta_count_above_fold: number;
	competing_headlines: number;
	choice_count: number;
	competing_headline_texts: string[];
	cta_texts_above_fold: string[];
}

// ─── Above-fold detection ─────────────────────────────────────────────────────
// These remain regex/DOM-based — they check structural presence of elements,
// not content quality. AI is not needed for "is there an image?" or "is there a button?"

/** Trust signals — structural presence check */
const TRUST_PATTERNS = [
	/\d[\d,]*\s*(\+\s*)?(reviews?|ratings?|stars?|customers?|clients?)/i,
	/guarantee|warranty|money[\s-]back|trusted\s+by|certif|licens|testimonial/i
];

/** CTA patterns — buttons and links that ask for action */
const CTA_PATTERNS = [
	/\b(add\s+to\s+cart|buy\s+now|order\s+now|get\s+started|sign\s+up)\b/i,
	/\b(claim|start\s+free|try\s+free|subscribe|book\s+now|schedule|learn\s+more)\b/i,
	/\b(see\s+how\s+it\s+works|watch\s+demo|get\s+demo|view\s+demo|try\s+demo)\b/i
];

/** Value prop patterns — structural presence check only */
const VALUE_PROP_PATTERNS = [
	/\b(best|top|#1|leading|trusted|proven|simple|easy|fast|powerful|transform)\b/i,
	/\b(save|boost|improve|grow|increase|reduce|solve|fix)\b/i,
	/\b(you|your)\b/i,
	/\d+%/i
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

const STRIP_SELECTORS = [
	// Standard chrome
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
	// Shopify off-canvas elements — in DOM but never visible at page load.
	// These inject fake CTAs ("Log in", "Check out", "Added ✓ Add to cart")
	// and inflate word counts, skewing the fold boundary.
	'cart-drawer',
	'cart-notification',
	'#cart-drawer',
	'#CartDrawer',
	'.cart-drawer',
	'.cart-notification',
	'predictive-search',
	'#predictive-search',
	'.predictive-search',
	'search-modal',
	'#search-modal',
	'.search-modal',
	'mobile-facets',
	'.mobile-facets',
	// Generic off-canvas patterns used by most Shopify themes
	'[id*="cart-drawer"]',
	'[id*="CartDrawer"]',
	'[class*="cart-drawer"]',
	'[id*="mobile-menu"]',
	'[id*="MobileMenu"]',
	'[class*="mobile-menu"]',
	'[id*="offcanvas"]',
	'[class*="offcanvas"]',
	// Shopify sticky ATC — transform: translateY(200%) off-screen until scroll.
	// Contains a duplicate "Add to cart" button + price + variant selectors.
	// In the DOM but never visible at page load — must be excluded or it
	// inflates CTA counts and distorts above-fold boundary.
	'.sticky-atc',
	'[class*="sticky-atc"]',
	'[id*="sticky_atc"]',
	'[id*="sticky-atc"]',
	// Announcement bars — promo text, not page content
	'.announcement-bar',
	'.announcement-bar-section',
	'[id*="announcement"]',
	// Cookie / consent banners
	'.cookie-banner',
	'.consent-banner',
	'#cookie-banner',
	'#cookieConsent',
	// Age gates
	'[id*="age-verification"]',
	'[class*="age-gate"]',
	// Live chat widgets (inject their own CTAs)
	'#intercom-frame',
	'#hubspot-messages-iframe-container',
	'[id*="gorgias"]',
	'[id*="tidio"]',
	'[id*="zendesk"]'
];

function wordCount(s: string): number {
	return s.split(/\s+/).filter(Boolean).length;
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
	return patterns.some((p) => p.test(text));
}

/**
 * Evaluates the first 20% of body content for above-fold essentials.
 * Uses the DOM pipeline (same as detectCognitiveLoad) rather than slicing
 * raw bodyText by word count — avoids hidden drawer/modal content inflating
 * the fold boundary and checks for CSS background-image hero patterns.
 * Sets renderWarning when the page is JS-rendered but was fetched statically.
 */
export function evaluateAboveFold(content: ParsedPageContent): AboveFoldResult {
	// Use aboveFoldText (first 300 visible words) for text-based checks —
	// it was extracted from the clean DOM in fetchAndParseURL after hidden-element stripping.
	const aboveFoldText = content.aboveFoldText;

	const headline_value_prop = matchesAny(aboveFoldText, VALUE_PROP_PATTERNS);
	const trust_signal = matchesAny(aboveFoldText, TRUST_PATTERNS);
	const cta_present = matchesAny(aboveFoldText, CTA_PATTERNS);

	let visual_relevant = false;
	if (content.html) {
		const $ = cheerio.load(content.html);
		const $body = $('body').clone();
		for (const sel of STRIP_SELECTORS) $body.find(sel).remove();
		let $content = $body.find(MAIN_CONTENT_SELECTORS.join(',')).first();
		if ($content.length === 0) $content = $body;

		// Check for <img> tags and CSS background-image hero patterns
		const hasImg = $content.find('img').length > 0;
		// CSS background-image heroes have no <img> — detect via inline style or common hero class
		const hasCssBg =
			$content.find('[style*="background-image"], [style*="background:"]').length > 0 ||
			$content.find('[class*="hero"], [class*="banner"], [class*="cover"]').length > 0;

		visual_relevant = hasImg || hasCssBg;
	}

	const score = [headline_value_prop, trust_signal, cta_present, visual_relevant].filter(
		Boolean
	).length;
	const renderWarning = content.renderConfidence === 'static' && content.isJsRendered;

	return { headline_value_prop, trust_signal, cta_present, visual_relevant, score, renderWarning };
}

// ─── Objection coverage — AI assessment ──────────────────────────────────────

/**
 * Objection sets per page subtype.
 * visitor_voice is what the uncertain visitor is actually thinking.
 * These are the questions they need answered before they'll convert.
 */
const OBJECTION_SETS: Record<string, Array<{ id: string; visitor_voice: string }>> = {
	saas_signup: [
		{ id: 'trial', visitor_voice: 'Can I try it before paying?' },
		{ id: 'value', visitor_voice: 'Is it actually worth the price?' },
		{ id: 'guarantee', visitor_voice: "What if it doesn't work for me?" },
		{ id: 'complexity', visitor_voice: 'Is this too complicated for me to use?' },
		{ id: 'commitment', visitor_voice: 'Am I locked into a contract?' },
		{ id: 'support', visitor_voice: "Will I get help if I'm stuck?" }
	],
	ecommerce_product: [
		{ id: 'quality', visitor_voice: 'Is this actually good quality?' },
		{ id: 'fit', visitor_voice: "What if it doesn't fit or work for me?" },
		{ id: 'shipping', visitor_voice: 'When will I actually get it?' },
		{ id: 'returns', visitor_voice: 'What if I want to return it?' },
		{ id: 'price', visitor_voice: 'Is this price fair compared to alternatives?' }
	],
	service_booking: [
		{ id: 'qualified', visitor_voice: 'Are they actually qualified to do this?' },
		{ id: 'process', visitor_voice: 'What exactly happens when I book?' },
		{ id: 'cost', visitor_voice: 'How much is this actually going to cost me?' },
		{ id: 'results', visitor_voice: "What if I'm not happy with the results?" },
		{ id: 'commitment', visitor_voice: 'Am I locked in once I book?' }
	]
};

/**
 * AI-based objection coverage assessment.
 * Replaces hardcoded regex patterns — the AI reads the actual page and judges
 * whether each visitor objection is addressed, partially addressed, or ignored.
 * Runs as part of the standard 1-credit audit — no separate credit charge.
 */
export async function evaluateObjectionCoverage(
	content: ParsedPageContent,
	page_subtype: 'saas_signup' | 'ecommerce_product' | 'service_booking'
): Promise<ObjectionCoverageResult> {
	const objectionSet = OBJECTION_SETS[page_subtype] ?? OBJECTION_SETS.saas_signup;

	// bodyText is visibility-clean (hidden/sr-only elements stripped in fetchAndParseURL).
	// Slice to 4000 chars for token efficiency — use the clean text so hidden popups,
	// cookie banners, and age-gate modals don't make the AI think objections are addressed.
	const bodyText = content.bodyText.slice(0, 4000);

	try {
		const response = await openai.chat.completions.create({
			model: GPT_MODEL,
			messages: [
				{
					role: 'user',
					content: `You are a CRO expert. Read this page content and assess whether each visitor objection is addressed.

Page content:
${bodyText}

Objections to assess (these are the questions an uncertain visitor is thinking):
${objectionSet.map((o, i) => `${i + 1}. [${o.id}] "${o.visitor_voice}"`).join('\n')}

For each objection, assess whether the page addresses it:
- "addressed": the page clearly and convincingly resolves this concern
- "partial": the page touches on it but not convincingly enough to remove doubt
- "unaddressed": the page does not address this concern at all

Respond with ONLY valid JSON — an array in the same order as above:
[
  { "id": "trial", "status": "addressed" | "partial" | "unaddressed" },
  ...
]`
				}
			],
			temperature: 0,
			max_tokens: 300
		});

		const raw = response.choices[0]?.message?.content?.trim() ?? '[]';
		const parsed = JSON.parse(raw) as Array<{ id: string; status: string }>;

		const result: ObjectionItem[] = objectionSet.map((obj) => {
			const match = parsed.find((p) => p.id === obj.id);
			const validStatuses = ['addressed', 'partial', 'unaddressed'];
			const status = validStatuses.includes(match?.status ?? '')
				? (match!.status as 'addressed' | 'partial' | 'unaddressed')
				: 'unaddressed';
			return { id: obj.id, label: obj.visitor_voice, visitor_voice: obj.visitor_voice, status };
		});

		const addressed = result.filter((o) => o.status === 'addressed').length;
		return { objections: result, addressed, total: result.length };
	} catch {
		// Fallback — mark all unaddressed rather than crash the audit
		const fallback = objectionSet.map((obj) => ({
			id: obj.id,
			label: obj.visitor_voice,
			visitor_voice: obj.visitor_voice,
			status: 'unaddressed' as const
		}));
		return { objections: fallback, addressed: 0, total: fallback.length };
	}
}

// ─── Cognitive load detection ────────────────────────────────────────────────

/** Check if element is a CTA (button, submit input, or link with CTA text) */
function isCTAElement($: CheerioAPI, el: Element): boolean {
	const tagName = el.name?.toLowerCase();
	const $el = $(el);

	if (tagName === 'button') {
		// Not all buttons are conversion CTAs. Exclude:
		// 1. Accordion / disclosure toggles — they expand content, not convert.
		//    Identified by: aria-expanded attribute, aria-controls, data-toggle,
		//    or a parent with class patterns matching accordion/collapsible/disclosure.
		if (
			$el.attr('aria-expanded') !== undefined ||
			$el.attr('aria-controls') !== undefined ||
			$el.attr('data-toggle') !== undefined ||
			$el.attr('data-target') !== undefined
		) {
			return false;
		}
		// Class-based accordion patterns (Shopify Atlas/Dawn themes)
		const cls = ($el.attr('class') ?? '').toLowerCase();
		if (
			/accordion|collapsible|disclosure|details|toggle|expand/i.test(cls) ||
			// Slider/carousel navigation
			/slider-button|slider-arrow|slick-arrow|swiper-button|carousel-btn/i.test(cls) ||
			// Modal/overlay closers
			/drawer__close|modal__close|close-btn|close-button/i.test(cls) ||
			// Menu drawer triggers
			/menu-drawer|header__icon/i.test(cls)
		) {
			return false;
		}
		// Parent-based: button inside an accordion container
		const parentCls = ($el.parent().attr('class') ?? '').toLowerCase();
		if (/accordion|collapsible|singleaccordian|disclosure/i.test(parentCls)) {
			return false;
		}
		// Only count a button as a CTA if it has meaningful visible text
		// that matches conversion patterns, OR if it's a named submit button.
		const text = getCTAText($, el);
		const cleanText = text.replace(/\s+/g, ' ').trim();
		if (!cleanText || cleanText.length <= 2) return false;
		// Slider navigation buttons and icon-only buttons (empty or single char)
		if (/^[\s<>‹›←→▸▹◂◃«»]+$/.test(cleanText)) return false;
		// Must match a conversion pattern OR be a form submit
		return (
			matchesAny(cleanText, CTA_PATTERNS) ||
			$el.attr('type')?.toLowerCase() === 'submit' ||
			$el.attr('name') === 'add' // Shopify add-to-cart button
		);
	}

	if (tagName === 'input' && $el.attr('type')?.toLowerCase() === 'submit') return true;

	if (tagName === 'a') {
		const text = $el.text().replace(/\s+/g, ' ').trim();
		if (matchesAny(text, CTA_PATTERNS)) return true;
		const href = ($el.attr('href') ?? '').toLowerCase();
		if (/checkout|cart|signup|register|buy|subscribe|start|get-started|try|demo/.test(href))
			return true;
	}
	return false;
}

function getCTAText($: CheerioAPI, el: Element): string {
	const $el = $(el);
	if (el.name?.toLowerCase() === 'input') return $el.attr('value')?.trim() || 'Submit';
	return $el.text().replace(/\s+/g, ' ').trim() || '';
}

interface CognitiveWalkState {
	wordPos: number;
	aboveFoldLimit: number;
	competingHeadlines: string[];
	ctasAboveFold: string[];
	allCTATexts: string[];
}

/**
 * UI chrome, auth links, cart state labels, and off-canvas triggers that are
 * present in the DOM but are never visible persuasion CTAs on the page.
 * Applied at walk time so choice_count and isHighLoad are not polluted.
 */
const CTA_NOISE_DETECTION = new RegExp(
	'^(' +
		[
			// Auth chrome (Shopify header icons with sr-only labels)
			'log in',
			'log out',
			'sign in',
			'sign out',
			'login',
			'logout',
			'create account',
			'register',
			'my account',
			// Cart state labels — status text, not conversion CTAs
			'check out',
			'checkout',
			'view cart',
			'your cart',
			'added',
			'added ✓',
			'added to cart',
			// Media / gallery controls
			'open media',
			'close media',
			'play',
			'pause',
			'mute',
			'unmute',
			'fullscreen',
			'zoom in',
			'zoom out',
			'next slide',
			'prev slide',
			'next',
			'prev',
			'previous',
			// Generic UI chrome
			'close',
			'open',
			'menu',
			'search',
			'back',
			'skip',
			'skip to content',
			'more',
			'less',
			'show',
			'hide',
			'toggle',
			'expand',
			'collapse',
			// Social / share
			'share',
			'tweet',
			'pin it',
			'copy link',
			// Rewards / loyalty widgets
			'rewards',
			'points',
			'redeem',
			// Policy links mistaken for CTAs via href detection
			'our standard',
			'shipping policy',
			'return policy',
			'refund policy',
			// Modal / drawer triggers
			'modal',
			'overlay',
			'popup',
			'drawer',
			// Accessibility
			'accessibility',
			'enable accessibility',
			// Shopify accordion section headings — collapsible panel triggers, not CTAs.
			// These fire as <button> elements but only expand/collapse content panels.
			'how to use',
			'shipping & returns',
			'shipping and returns',
			'ingredients',
			'directions',
			'faq',
			'details',
			'description',
			'questions',
			// Shopify image gallery navigation controls
			'load image',
			'slide left',
			'slide right',
			// Scroll utilities / page navigation chrome
			'continue shopping',
			'scroll to top',
			'load more',
			'view all',
			'view full details',
			'see all',
			// Pickup / shipping availability chrome
			'refresh',
			'check availability',
			// Newsletter/form submit chrome
			'dream now',
			'submit',
			'subscribe now'
		].join('|') +
		')$',
	'i'
);

function walkForCognitiveLoad($: CheerioAPI, element: ChildNode, state: CognitiveWalkState): void {
	if (element.type === 'text') {
		const text = 'data' in element ? String((element as { data?: string }).data ?? '') : '';
		state.wordPos += wordCount(text);
		return;
	}
	if (element.type !== 'tag') return;

	const tagName = (element as Element).name?.toLowerCase();
	const $el = $(element);
	if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') return;

	// Only H1 counts as competing headline above fold.
	// Use visible text only (sr-only children already stripped from DOM before walk).
	if (tagName === 'h1' && state.wordPos < state.aboveFoldLimit) {
		const text = $el.text().replace(/\s+/g, ' ').trim();
		if (text) state.competingHeadlines.push(`"${text}"`);
	}

	if (isCTAElement($, element as Element)) {
		const text = getCTAText($, element as Element);
		const cleanText = text.replace(/\s+/g, ' ').trim();
		// Filter UI chrome — don't count auth links, cart state, media controls, etc.
		// This keeps choice_count and isHighLoad based on real persuasion CTAs only.
		const isNoise = !cleanText || cleanText.length <= 2 || CTA_NOISE_DETECTION.test(cleanText);
		if (!isNoise) {
			if (state.wordPos < state.aboveFoldLimit) state.ctasAboveFold.push(`"${cleanText}"`);
			state.allCTATexts.push(cleanText.toLowerCase());
		}
	}

	$el.contents().each((_, child) => {
		if (child.type === 'text') {
			const t = 'data' in child ? String((child as { data?: string }).data ?? '') : '';
			state.wordPos += wordCount(t);
		} else if (child.type === 'tag') {
			walkForCognitiveLoad($, child as ChildNode, state);
		}
	});
}

/**
 * Counts CTAs above fold, competing headlines (H1 only, above fold), and distinct CTA types.
 * H2/H3 are section headings — only H1 counts as a "competing headline".
 * Returns actual detected text so the AI explanation endpoint can name elements specifically.
 *
 * aboveFoldLimit is derived from the VISIBLE word count of the stripped DOM —
 * not from bodyText which may include hidden drawers/modals inflating the boundary.
 */
export function detectCognitiveLoad(content: ParsedPageContent): CognitiveLoadResult {
	// Derive aboveFoldLimit from the same visible DOM we're about to walk,
	// NOT from content.bodyText which includes hidden cart drawers, modals, etc.
	// content.aboveFoldText is already the first 300 clean visible words —
	// use the full visible word count from the DOM for the 20% calculation.
	let visibleTotalWords = 0;

	if (content.html) {
		const $ = cheerio.load(content.html);
		const $body = $('body').clone();
		for (const sel of STRIP_SELECTORS) $body.find(sel).remove();
		let $content = $body.find(MAIN_CONTENT_SELECTORS.join(',')).first();
		if ($content.length === 0) $content = $body;
		$content.find('script, style, noscript, svg, iframe').remove();
		// Strip hidden elements before counting — same as fetchAndParseURL
		$content
			.find(
				[
					'.visually-hidden',
					'.visuallyhidden',
					'.sr-only',
					'.screen-reader-text',
					'.screen-reader-only',
					'.offscreen',
					'[aria-hidden="true"]'
				].join(',')
			)
			.remove();
		$content.find('[style]').each((_, el) => {
			const style = (
				$($content)
					.find(el as never)
					.attr?.('style') ??
				$(el).attr('style') ??
				''
			)
				.toLowerCase()
				.replace(/\s/g, '');
			if (
				/display:none/.test(style) ||
				/visibility:hidden/.test(style) ||
				// Sticky ATC and similar elements hidden via CSS transform off-screen.
				// translateY(100%) or more moves element completely below viewport.
				/transform:translatey\(1[0-9]{2}%\)/.test(style) ||
				/transform:translatey\([2-9]\d{2}%\)/.test(style) ||
				/transform:translatey\(\d{4,}%\)/.test(style)
			)
				$(el).remove();
		});
		visibleTotalWords = wordCount($content.text());
	}

	// Fall back to aboveFoldText word count * 5 (aboveFoldText = ~20% of page) if DOM unavailable
	if (visibleTotalWords === 0) {
		visibleTotalWords = wordCount(content.aboveFoldText) * 5;
	}

	const aboveFoldLimit = Math.max(150, Math.floor(visibleTotalWords * 0.2));

	const state: CognitiveWalkState = {
		wordPos: 0,
		aboveFoldLimit,
		competingHeadlines: [],
		ctasAboveFold: [],
		allCTATexts: []
	};

	if (content.html) {
		const $ = cheerio.load(content.html);
		const $body = $('body').clone();
		for (const sel of STRIP_SELECTORS) $body.find(sel).remove();
		let $content = $body.find(MAIN_CONTENT_SELECTORS.join(',')).first();
		if ($content.length === 0) $content = $body;
		$content.find('script, style, noscript, svg, iframe').remove();
		// Strip hidden elements before walking — prevents hidden text inflating wordPos
		$content
			.find(
				[
					'.visually-hidden',
					'.visuallyhidden',
					'.sr-only',
					'.screen-reader-text',
					'.screen-reader-only',
					'.offscreen',
					'[aria-hidden="true"]'
				].join(',')
			)
			.remove();
		$content.find('[style]').each((_, el) => {
			const style = (
				$($content)
					.find(el as never)
					.attr?.('style') ??
				$(el).attr('style') ??
				''
			)
				.toLowerCase()
				.replace(/\s/g, '');
			if (
				/display:none/.test(style) ||
				/visibility:hidden/.test(style) ||
				// Sticky ATC and similar off-screen elements hidden via CSS transform.
				/transform:translatey\(1[0-9]{2}%\)/.test(style) ||
				/transform:translatey\([2-9]\d{2}%\)/.test(style) ||
				/transform:translatey\(\d{4,}%\)/.test(style)
			)
				$(el).remove();
		});

		$content.contents().each((_, child) => {
			if (child.type === 'text') {
				const t = 'data' in child ? String((child as { data?: string }).data ?? '') : '';
				state.wordPos += wordCount(t);
			} else if (child.type === 'tag') {
				walkForCognitiveLoad($, child as ChildNode, state);
			}
		});
	}

	const competing_headlines = state.competingHeadlines.length;
	const cta_count_above_fold = state.ctasAboveFold.length;
	const choice_count = new Set(state.allCTATexts).size;
	const isHighLoad = competing_headlines > 2 || cta_count_above_fold > 2 || choice_count > 5;

	return {
		level: isHighLoad ? 'high' : 'normal',
		cta_count_above_fold,
		competing_headlines,
		choice_count,
		competing_headline_texts: state.competingHeadlines,
		cta_texts_above_fold: state.ctasAboveFold
	};
}

// ─── Headline insight ─────────────────────────────────────────────────────────

export interface AuditResultsForInsight {
	page_type: 'seo_page' | 'destination_page';
	checklist?: Record<string, unknown>;
	architecture_violations?: ArchitectureViolation[] | null;
	bias_inventory?: CognitiveBiasResult[] | null;
	journey_checklist?: JourneyStepResult[];
}

/**
 * Deterministic single-sentence insight from the highest-severity finding.
 * No AI call — derived from audit results already computed.
 * Priority: architecture violations > failing journey steps > missing biases > SEO checklist.
 */
export function generateHeadlineInsight(auditResults: AuditResultsForInsight): string {
	const { page_type, checklist, architecture_violations, bias_inventory, journey_checklist } =
		auditResults;

	// 1. Architecture violations first
	if (architecture_violations?.length) {
		const v = architecture_violations[0];
		if (v.type === 'trust_after_cta')
			return 'Trust signals appear after your CTA — you are asking for commitment before giving visitors a reason to trust you.';
		if (v.type === 'cta_too_late')
			return 'Your first CTA appears too far down the page — visitors may leave before seeing a clear path to convert.';
		return v.message;
	}

	// 2. Failing journey steps (destination)
	if (journey_checklist?.length) {
		const failed = journey_checklist.filter((s) => s.status === 'fail');
		if (failed.length) {
			const first = failed[0];
			return `${first.name}: ${first.evidence}`;
		}
	}

	// 3. Missing biases (destination)
	if (bias_inventory?.length) {
		const missing = bias_inventory.filter((b) => !b.present);
		if (missing.length) {
			return `You are missing ${missing.length} persuasion signal${missing.length !== 1 ? 's' : ''} (e.g. ${missing[0].label}) that could strengthen your close.`;
		}
	}

	// 4. SEO checklist — check attentionHook (was emotionalHook)
	if (checklist) {
		const handoff = checklist.handoff as { status?: string; evidence?: string } | undefined;
		if (handoff?.status === 'fail')
			return (
				handoff.evidence ??
				'The first link in your content does not point to your destination page.'
			);

		const ctaFit = checklist.ctaFit as { status?: string; evidence?: string } | undefined;
		if (ctaFit?.status === 'fail')
			return ctaFit.evidence ?? 'Your CTAs do not match the funnel stage of this page.';

		// Check both key names for backwards compatibility during transition
		const attentionHook = (checklist.attentionHook ?? checklist.emotionalHook) as
			| { status?: string; evidence?: string }
			| undefined;
		if (attentionHook?.status === 'fail')
			return (
				attentionHook.evidence ??
				"Nothing above the fold earns the reader's attention before the content begins."
			);
	}

	return page_type === 'destination_page'
		? 'Your page structure is sound; focus on strengthening the emotional arc and removing friction before the CTA.'
		: 'Your SEO page structure looks good; ensure your first link correctly hands off to the destination.';
}
