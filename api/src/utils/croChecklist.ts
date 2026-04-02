/**
 * System 1 CRO Layer — Page type classification per docs/system-1-cro-layer.md
 *
 * classifyPageType returns canonical internal types used by CRO checklist,
 * brief generation, and funnel logic. The user never sees these directly —
 * they see plain-English display names (Service Page, Informational Article, etc.).
 */

export type CroPageType =
	| 'tofu_article'
	| 'mofu_article'
	| 'mofu_comparison'
	| 'bofu_article'
	| 'service_page'
	| 'money_page';

export type DominantIntent = 'informational' | 'commercial' | 'transactional';

/**
 * Infers dominant search intent from keyword. Used when page does not yet
 * have brief_data.dominant_intent. Mirrors detectSearchIntent in clusters.ts.
 */
export function inferDominantIntentFromKeyword(keyword: string): DominantIntent {
	const kw = (keyword ?? '').toLowerCase();
	if (
		/\b(buy|price|pricing|cost|hire|near me|discount|deal|free trial|sign up|get started|order|quote|shop)\b/.test(
			kw
		)
	)
		return 'transactional';
	if (
		/\b(best|top|vs|versus|compare|comparison|review|reviews|worth it|ranking|alternative|alternatives|recommend)\b/.test(
			kw
		)
	)
		return 'commercial';
	return 'informational';
}

/**
 * Classifies the page type for CRO checklist and brief generation.
 * Returns canonical internal type — not user-facing display strings.
 *
 * @param keyword - Page target keyword
 * @param funnel_stage - 'tofu' | 'mofu' | 'bofu'
 * @param dominant_intent - Inferred or from brief_data
 * @param page_role - 'focus' | 'article' (from pages.type: focus_page → 'focus', article → 'article')
 */
export function classifyPageType(
	keyword: string,
	funnel_stage: string,
	dominant_intent: DominantIntent,
	page_role: 'focus' | 'article'
): CroPageType {
	const kw = (keyword ?? '').toLowerCase();
	const stage = (funnel_stage ?? 'mofu').toLowerCase();

	if (page_role === 'focus') {
		if (dominant_intent === 'transactional') return 'money_page';
		// Only true head-to-head / alternatives keywords — not every mofu cluster hub is a comparison page.
		if (/vs|versus|alternative|compare/i.test(kw)) return 'mofu_comparison';
		if (stage === 'bofu') return 'service_page';
		if (stage === 'mofu') return 'mofu_article';
		return 'service_page'; // tofu / default focus pages
	}

	if (page_role === 'article') {
		if (/vs|versus|alternative|compare/i.test(kw)) return 'mofu_comparison';
		if (stage === 'bofu') return 'bofu_article';
		if (stage === 'mofu') return 'mofu_article';
		return 'tofu_article'; // default for supporting articles
	}

	// Fallback if page_role unknown
	return 'tofu_article';
}

/** Item labels for CRO fixes prompt */
export const CRO_ITEM_LABELS: Record<string, string> = {
	'1': 'Clear H1 With Target Keyword',
	'2': 'Hero CTA Above the Fold',
	'3': 'Trust Signals Section',
	'4': 'FAQ With Schema Markup',
	'5': 'Testimonials or Case Studies',
	'6': 'Comparison or Alternatives Section',
	'7': 'Social Proof (Numbers, Awards, Media Mentions)',
	'8': 'Contact / Conversion CTA at Bottom'
};

/** Requirements map for server-side use */
const CRO_REQUIREMENTS: Record<
	CroPageType,
	Record<number, 'required' | 'optional' | 'na'>
> = {
	money_page: {
		1: 'required', 2: 'required', 3: 'required', 4: 'required',
		5: 'required', 6: 'optional', 7: 'required', 8: 'required'
	},
	service_page: {
		1: 'required', 2: 'required', 3: 'required', 4: 'required',
		5: 'required', 6: 'optional', 7: 'required', 8: 'required'
	},
	mofu_comparison: {
		1: 'required', 2: 'required', 3: 'required', 4: 'required',
		5: 'required', 6: 'required', 7: 'required', 8: 'required'
	},
	bofu_article: {
		1: 'required', 2: 'required', 3: 'required', 4: 'required',
		5: 'required', 6: 'optional', 7: 'required', 8: 'required'
	},
	mofu_article: {
		1: 'required', 2: 'required', 3: 'optional', 4: 'required',
		5: 'optional', 6: 'optional', 7: 'optional', 8: 'required'
	},
	tofu_article: {
		1: 'required', 2: 'optional', 3: 'optional', 4: 'required',
		5: 'na', 6: 'na', 7: 'na', 8: 'required'
	}
};

/** CTA phrases for detection (first 20% of content) */
const CTA_PHRASES = {
	hard: [
		'get a quote', 'book now', 'book a', 'call us', 'call now',
		'buy now', 'order now', 'start now', 'get started', 'sign up',
		'schedule', 'request a', 'claim your', 'get your free'
	],
	medium: [
		'see how', 'learn how', 'get a demo', 'free assessment',
		'free consultation', 'find out', 'discover', 'explore',
		'watch how', 'see results', 'get a free'
	],
	soft: [
		'download', 'subscribe', 'get the guide', 'free guide',
		'read more', 'learn more', 'get the free', 'grab the',
		'join', 'get access', 'get our free'
	]
};

/** Trust signal pattern names for AI context */
const TRUST_PATTERNS: Record<string, RegExp> = {
	reviews_ratings: /\d[\d,]*\s*(\+\s*)?(reviews?|ratings?|stars?)|★|rated\s+\d/i,
	credentials: /certif|licens|acredit|award|member\s+of|approved\s+by/i,
	experience: /\d+\s*(years?\s*(of\s*)?(experience|in\s+business)|year\s+track)/i,
	founded: /since\s+\d{4}|established\s+\d{4}|founded\s+in\s+\d{4}/i,
	client_numbers: /\d[\d,]*\s*\+?\s*(clients?|customers?|businesses?|projects?|homeowners?)/i,
	guarantees: /guarantee|warranty|money[\s-]back|satisfaction\s+guarantee|risk[\s-]free/i
};

/** Detect CTAs in first 20% of content for prompt context */
export function detectCTAsInFirst20(plainText: string): string[] {
	const first20Len = Math.floor(plainText.length * 0.2);
	const first20 = plainText.slice(0, first20Len).toLowerCase();
	const found: string[] = [];
	for (const p of CTA_PHRASES.hard) {
		if (first20.includes(p)) found.push(`[hard] ${p}`);
	}
	for (const p of CTA_PHRASES.medium) {
		if (first20.includes(p)) found.push(`[medium] ${p}`);
	}
	for (const p of CTA_PHRASES.soft) {
		if (first20.includes(p)) found.push(`[soft] ${p}`);
	}
	return found.length ? found : ['(none detected in first 20%)'];
}

/** Detect trust signal types for prompt context */
export function detectTrustSignals(plainText: string): string[] {
	const found: string[] = [];
	for (const [name, pattern] of Object.entries(TRUST_PATTERNS)) {
		if (pattern.test(plainText)) found.push(name);
	}
	return found.length ? found : ['(none detected)'];
}

/** Get failing required items for the prompt */
export function getFailingRequiredItems(checklist: {
	page_type?: string;
	items?: Record<string, { status: string; evidence: string }>;
}): Array<{ key: string; label: string; evidence: string }> {
	const pt = (checklist.page_type ?? 'tofu_article') as CroPageType;
	const reqs = CRO_REQUIREMENTS[pt] ?? CRO_REQUIREMENTS.tofu_article;
	const result: Array<{ key: string; label: string; evidence: string }> = [];
	for (let i = 1; i <= 8; i++) {
		const key = String(i);
		const r = reqs[i as keyof typeof reqs];
		const item = checklist.items?.[key];
		if (r === 'required' && item?.status === 'fail') {
			result.push({
				key,
				label: CRO_ITEM_LABELS[key] ?? `Item ${key}`,
				evidence: item.evidence ?? ''
			});
		}
	}
	return result;
}
