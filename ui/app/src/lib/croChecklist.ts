/**
 * System 1 CRO Layer — 8-item checklist evaluation
 * Spec: docs/system-1-cro-layer.md
 */

import { extractPlainText, extractH1s } from './seoScore';

export type CroPageType =
	| 'tofu_article'
	| 'mofu_article'
	| 'mofu_comparison'
	| 'bofu_article'
	| 'service_page'
	| 'money_page';

type TiptapDoc = { type?: string; content?: unknown[] } | null;

// ---------------------------------------------------------------------------
// CRO requirements map — which items are required/optional/N/A per page type
// ---------------------------------------------------------------------------
const CRO_REQUIREMENTS: Record<
	CroPageType,
	Record<number, 'required' | 'optional' | 'na'>
> = {
	money_page: {
		1: 'required',
		2: 'required',
		3: 'required',
		4: 'required',
		5: 'required',
		6: 'optional',
		7: 'required',
		8: 'required'
	},
	service_page: {
		1: 'required',
		2: 'required',
		3: 'required',
		4: 'required',
		5: 'required',
		6: 'optional',
		7: 'required',
		8: 'required'
	},
	mofu_comparison: {
		1: 'required',
		2: 'required',
		3: 'required',
		4: 'required',
		5: 'required',
		6: 'required',
		7: 'required',
		8: 'required'
	},
	bofu_article: {
		1: 'required',
		2: 'required',
		3: 'required',
		4: 'required',
		5: 'required',
		6: 'optional',
		7: 'required',
		8: 'required'
	},
	mofu_article: {
		1: 'required',
		2: 'required',
		3: 'optional',
		4: 'required',
		5: 'optional',
		6: 'optional',
		7: 'optional',
		8: 'required'
	},
	tofu_article: {
		1: 'required',
		2: 'optional',
		3: 'optional',
		4: 'required',
		5: 'na',
		6: 'na',
		7: 'na',
		8: 'required'
	}
};

// ---------------------------------------------------------------------------
// CTA phrases by commitment level (Item 2 & 8)
// ---------------------------------------------------------------------------
const CTA_PHRASES = {
	hard: [
		'get a quote',
		'book now',
		'book a',
		'call us',
		'call now',
		'buy now',
		'order now',
		'start now',
		'get started',
		'sign up',
		'schedule',
		'request a',
		'claim your',
		'get your free'
	],
	medium: [
		'see how',
		'learn how',
		'get a demo',
		'free assessment',
		'free consultation',
		'find out',
		'discover',
		'explore',
		'watch how',
		'see results',
		'get a free'
	],
	soft: [
		'download',
		'subscribe',
		'get the guide',
		'free guide',
		'read more',
		'learn more',
		'get the free',
		'grab the',
		'join',
		'get access',
		'get our free'
	]
};

// ---------------------------------------------------------------------------
// Trust signal patterns (Item 3)
// ---------------------------------------------------------------------------
const TRUST_PATTERNS: Record<string, RegExp> = {
	reviews_ratings: /\d[\d,]*\s*(\+\s*)?(reviews?|ratings?|stars?)|★|rated\s+\d/i,
	credentials: /certif|licens|accredit|award|member\s+of|approved\s+by/i,
	experience: /\d+\s*(years?\s*(of\s*)?(experience|in\s+business)|year\s+track)/i,
	founded: /since\s+\d{4}|established\s+\d{4}|founded\s+in\s+\d{4}/i,
	client_numbers:
		/\d[\d,]*\s*\+?\s*(clients?|customers?|businesses?|projects?|homeowners?)/i,
	guarantees:
		/guarantee|warranty|money[\s-]back|satisfaction\s+guarantee|risk[\s-]free/i
};

// ---------------------------------------------------------------------------
// Testimonial patterns (Item 5)
// ---------------------------------------------------------------------------
const TESTIMONIAL_PATTERNS = {
	named: /—\s*[A-Z][a-z]+[\s,]|,\s*[A-Z][a-z]+\s+[A-Z]\.?|said\s+[A-Z][a-z]+/,
	specific_result: /\d+\s*%|\$[\d,]+|\d+x\s*(more|faster|better)|saved\s+\d+/i,
	generic_quote: /"[^"]{20,}"|\u201C[^\u201D]{20,}\u201D/,
	case_study: /case\s+study|client\s+story|results?|before\s+and\s+after/i
};

// ---------------------------------------------------------------------------
// Comparison patterns (Item 6)
// ---------------------------------------------------------------------------
const COMPARISON_PATTERNS = {
	language:
		/\bvs\.?\b|\bversus\b|compared?\s+to|alternative|unlike|better\s+than|difference\s+between|why\s+(choose|us|we)/i,
	table: /\|.+\||<table/i
};

// ---------------------------------------------------------------------------
// Social proof patterns (Item 7)
// ---------------------------------------------------------------------------
const SOCIAL_PROOF_PATTERNS = {
	quantified:
		/\d[\d,]*\+?\s*(clients?|customers?|reviews?|projects?|businesses?)|[\d.]+\s*(?:out\s*of\s*5|\/\s*5|\s*stars?)|#\s*1\s+rated|top\s+\d+/i,
	awards:
		/award|winner|recognized|accredited|featured\s+in|as\s+seen\s+in|best\s+of\s+\d{4}/i,
	media: /featured\s+in|as\s+seen\s+in|mentioned\s+in|covered\s+by/i
};
const VAGUE_ONLY_PATTERNS =
	/industry[\s-]leading|trusted\s+by\s+businesses|market[\s-]leading|world[\s-]class/i;

// ---------------------------------------------------------------------------
// Checklist item status
// ---------------------------------------------------------------------------
export type ChecklistItemStatus = 'pass' | 'partial' | 'fail' | 'na';

export type ChecklistItem = {
	status: ChecklistItemStatus;
	evidence: string;
};

export type CroChecklistResult = {
	evaluated_at: string;
	page_type: CroPageType;
	score: number;
	max_score: number;
	items: Record<string, ChecklistItem>;
	funnel_mismatch?: string | null;
};

export type PageForCro = {
	keyword: string;
	pageType: CroPageType | string | null;
	briefData?: Record<string, unknown> | null;
};

/** Normalize content: accept Tiptap JSON (object or stringified) */
function normalizeDoc(content: TiptapDoc | string | null): TiptapDoc {
	if (!content) return null;
	if (typeof content === 'string') {
		try {
			return JSON.parse(content) as TiptapDoc;
		} catch {
			return null;
		}
	}
	return content as TiptapDoc;
}

/** Keyword or close variant in H1 — simple containment + significant word overlap */
function keywordMatchesH1(h1: string, keyword: string): boolean {
	const h1Lower = h1.toLowerCase().trim();
	const kwLower = keyword.toLowerCase().trim();
	if (h1Lower.includes(kwLower)) return true;
	const kwWords = kwLower.split(/\s+/).filter((w) => w.length > 2);
	return kwWords.length > 0 && kwWords.every((w) => h1Lower.includes(w));
}

/** Item 1: Clear H1 with target keyword */
function evaluateItem1(
	doc: TiptapDoc,
	keyword: string
): { status: ChecklistItemStatus; evidence: string } {
	const h1s = extractH1s(doc);
	const kw = (keyword ?? '').trim();
	if (h1s.length === 0) {
		return { status: 'fail', evidence: 'No H1 tag found on this page.' };
	}
	if (h1s.length > 1) {
		return {
			status: 'fail',
			evidence: `Multiple H1s found (${h1s.length}). Use exactly one H1.`
		};
	}
	const h1 = h1s[0];
	if (keywordMatchesH1(h1, kw)) {
		return {
			status: 'pass',
			evidence: `H1 found: '${h1}' — keyword match confirmed.`
		};
	}
	return {
		status: 'partial',
		evidence: `H1 found but target keyword '${kw || '(none)'}' not present.`
	};
}

/** First N% of plain text by character count */
function extractFirstPercent(body: string, percent: number): string {
	const len = Math.floor((body.length * percent) / 100);
	return body.slice(0, len);
}

/** Last N% of plain text */
function extractLastPercent(body: string, percent: number): string {
	const start = Math.floor((body.length * (100 - percent)) / 100);
	return body.slice(start);
}

function hasPhraseInText(text: string, phrases: string[]): boolean {
	const lower = text.toLowerCase();
	return phrases.some((p) => lower.includes(p));
}

/** Item 2: Hero CTA above the fold */
function evaluateItem2(
	doc: TiptapDoc,
	pageType: CroPageType
): { status: ChecklistItemStatus; evidence: string } {
	const body = extractPlainText(doc);
	const first20 = extractFirstPercent(body, 20);
	const hasHard = hasPhraseInText(first20, CTA_PHRASES.hard);
	const hasMedium = hasPhraseInText(first20, CTA_PHRASES.medium);
	const hasSoft = hasPhraseInText(first20, CTA_PHRASES.soft);
	const hasAny = hasHard || hasMedium || hasSoft;

	// Check full body for "CTA present but below fold"
	const fullHasHard = hasPhraseInText(body, CTA_PHRASES.hard);
	const fullHasMedium = hasPhraseInText(body, CTA_PHRASES.medium);
	const fullHasSoft = hasPhraseInText(body, CTA_PHRASES.soft);
	const ctaBelowFold = (fullHasHard || fullHasMedium || fullHasSoft) && !hasAny;

	if (pageType === 'money_page' || pageType === 'service_page') {
		if (hasHard) return { status: 'pass', evidence: 'Hard CTA detected above the fold.' };
		if (ctaBelowFold)
			return {
				status: 'partial',
				evidence: 'CTA present but below the fold.'
			};
		return { status: 'fail', evidence: 'No CTA detected in the first 20% of content.' };
	}
	if (pageType === 'bofu_article') {
		if (hasHard || hasMedium)
			return { status: 'pass', evidence: 'Hard or medium CTA detected above the fold.' };
		if (ctaBelowFold)
			return {
				status: 'partial',
				evidence: 'CTA present but below the fold.'
			};
		return { status: 'fail', evidence: 'No CTA detected in the first 20% of content.' };
	}
	if (pageType === 'mofu_comparison' || pageType === 'mofu_article') {
		if (hasHard)
			return {
				status: 'fail',
				evidence: 'Hard CTA above the fold — too aggressive for consideration-stage content.'
			};
		if (hasMedium || hasSoft)
			return { status: 'pass', evidence: 'Medium or soft CTA detected above the fold.' };
		if (ctaBelowFold)
			return {
				status: 'partial',
				evidence: 'CTA present but below the fold.'
			};
		return { status: 'fail', evidence: 'No CTA detected in the first 20% of content.' };
	}
	// tofu_article
	if (hasHard)
		return {
			status: 'fail',
			evidence: 'Hard CTA above the fold — triggers funnel mismatch for informational content.'
		};
	if (hasSoft || !hasAny)
		return {
			status: 'pass',
			evidence: hasSoft ? 'Soft CTA above the fold.' : 'No CTA above the fold (acceptable for ToFu).'
		};
	return { status: 'partial', evidence: 'CTA present but below the fold.' };
}

/** Item 3: Trust signals section */
function evaluateItem3(doc: TiptapDoc): { status: ChecklistItemStatus; evidence: string } {
	const body = extractPlainText(doc);
	let matchCount = 0;
	for (const [_key, pattern] of Object.entries(TRUST_PATTERNS)) {
		if (pattern.test(body)) matchCount++;
	}
	if (matchCount >= 2) {
		return {
			status: 'pass',
			evidence: `${matchCount} trust signal types detected (reviews, credentials, experience, etc.).`
		};
	}
	if (matchCount === 1) {
		return {
			status: 'partial',
			evidence: 'Only one trust signal type detected. Add more (reviews, credentials, guarantees).'
		};
	}
	return {
		status: 'fail',
		evidence: 'No trust signals detected. Add reviews, credentials, years in business, or guarantees.'
	};
}

/** Item 4: FAQ with schema markup */
function evaluateItem4(
	doc: TiptapDoc,
	briefData?: Record<string, unknown> | null
): { status: ChecklistItemStatus; evidence: string } {
	const body = extractPlainText(doc);
	const hasFaqSection = /faq|frequently asked questions?/i.test(body);
	const schemaTypes = briefData?.schema_types as string[] | undefined;
	const hasFaqSchema =
		Array.isArray(schemaTypes) && schemaTypes.some((t) => String(t).toLowerCase() === 'faq');
	const schemaGenerated = briefData?.schema_generated === true;

	if (!hasFaqSection) {
		return { status: 'fail', evidence: 'No FAQ section detected.' };
	}
	if (hasFaqSchema || schemaGenerated) {
		return {
			status: 'pass',
			evidence: 'FAQ section detected and FAQ schema included.'
		};
	}
	return {
		status: 'partial',
		evidence: 'FAQ section detected but no FAQ schema markup. Add FAQ schema for rich results.'
	};
}

/** Item 5: Testimonials or case studies */
function evaluateItem5(
	body: string,
	pageType: CroPageType
): { status: ChecklistItemStatus; evidence: string } {
	const hasNamed = TESTIMONIAL_PATTERNS.named.test(body);
	const hasSpecificResult = TESTIMONIAL_PATTERNS.specific_result.test(body);
	const hasGenericQuote = TESTIMONIAL_PATTERNS.generic_quote.test(body);
	const hasCaseStudy = TESTIMONIAL_PATTERNS.case_study.test(body);

	if (pageType === 'money_page' || pageType === 'service_page' || pageType === 'bofu_article') {
		if (hasNamed || hasSpecificResult)
			return {
				status: 'pass',
				evidence: 'Named testimonial or specific result detected.'
			};
		if (hasGenericQuote && !hasNamed && !hasSpecificResult)
			return {
				status: 'partial',
				evidence: 'Generic quote found. Add named attribution or specific outcome (%, $, time saved).'
			};
		return {
			status: 'fail',
			evidence: 'No testimonial content. Add named reviews with specific results.'
		};
	}
	if (pageType === 'mofu_comparison' || pageType === 'mofu_article') {
		if (hasNamed || hasSpecificResult || hasCaseStudy || hasGenericQuote)
			return {
				status: 'pass',
				evidence: 'Testimonial or case study reference detected.'
			};
		return {
			status: 'fail',
			evidence: 'No testimonial or case study content.'
		};
	}
	return { status: 'na', evidence: 'Not applicable for this page type.' };
}

/** Item 6: Comparison or alternatives section */
function evaluateItem6(
	body: string,
	pageType: CroPageType
): { status: ChecklistItemStatus; evidence: string } {
	if (pageType === 'tofu_article' || pageType === 'mofu_article') {
		return { status: 'na', evidence: 'Not required for this page type.' };
	}
	const hasLanguage = COMPARISON_PATTERNS.language.test(body);
	const hasTable = COMPARISON_PATTERNS.table.test(body);
	if (hasLanguage || hasTable) {
		return {
			status: 'pass',
			evidence: hasTable
				? 'Comparison table detected.'
				: 'Comparison language detected.'
		};
	}
	if (pageType === 'mofu_comparison') {
		return {
			status: 'fail',
			evidence: 'No comparison content. Add vs/alternatives section or comparison table.'
		};
	}
	return {
		status: 'partial',
		evidence: 'Light comparison content. Consider adding a structured comparison section.'
	};
}

/** Item 7: Social proof (numbers, awards, media) */
function evaluateItem7(
	body: string,
	pageType: CroPageType
): { status: ChecklistItemStatus; evidence: string } {
	if (pageType === 'tofu_article') {
		return { status: 'na', evidence: 'Not required for this page type.' };
	}
	const hasQuantified = SOCIAL_PROOF_PATTERNS.quantified.test(body);
	const hasAwards = SOCIAL_PROOF_PATTERNS.awards.test(body);
	const hasMedia = SOCIAL_PROOF_PATTERNS.media.test(body);
	const onlyVague = VAGUE_ONLY_PATTERNS.test(body) && !hasQuantified && !hasAwards && !hasMedia;

	if (hasQuantified || hasAwards || hasMedia) {
		return {
			status: 'pass',
			evidence: 'Quantified social proof, awards, or media mention detected.'
		};
	}
	if (onlyVague) {
		return {
			status: 'partial',
			evidence: 'Only vague claims (e.g. "industry leading"). Add specific numbers or recognition.'
		};
	}
	return {
		status: 'fail',
		evidence: 'No social proof detected. Add numbers (clients, reviews, ratings) or awards.'
	};
}

/** Item 8: Contact / conversion CTA at bottom */
function evaluateItem8(
	doc: TiptapDoc,
	pageType: CroPageType,
	first20Text: string
): { status: ChecklistItemStatus; evidence: string } {
	const body = extractPlainText(doc);
	const last15 = extractLastPercent(body, 15);
	const hasHard = hasPhraseInText(last15, CTA_PHRASES.hard);
	const hasMedium = hasPhraseInText(last15, CTA_PHRASES.medium);
	const hasSoft = hasPhraseInText(last15, CTA_PHRASES.soft);

	// Check if bottom CTA is identical to top (partial)
	const topHasHard = hasPhraseInText(first20Text, CTA_PHRASES.hard);
	const topHasMedium = hasPhraseInText(first20Text, CTA_PHRASES.medium);
	const topHasSoft = hasPhraseInText(first20Text, CTA_PHRASES.soft);
	const sameAsTop =
		(hasHard && topHasHard) || (hasMedium && topHasMedium) || (hasSoft && topHasSoft);

	if (pageType === 'money_page' || pageType === 'service_page') {
		if (hasHard) {
			if (sameAsTop)
				return {
					status: 'partial',
					evidence: 'Bottom CTA is identical to your top CTA — add urgency or a different angle.'
				};
			return { status: 'pass', evidence: 'Hard CTA detected in last 15% of content.' };
		}
		return {
			status: 'fail',
			evidence: 'No hard CTA in the last 15%. Add a final conversion prompt.'
		};
	}
	if (pageType === 'bofu_article') {
		if (hasHard || hasMedium) {
			if (sameAsTop)
				return {
					status: 'partial',
					evidence: 'Bottom CTA is identical to your top CTA — add urgency or a different angle.'
				};
			return { status: 'pass', evidence: 'Hard or medium CTA detected in last 15%.' };
		}
		return { status: 'fail', evidence: 'No CTA in the last 15%.' };
	}
	if (pageType === 'mofu_comparison' || pageType === 'mofu_article') {
		if (hasMedium || hasSoft) {
			if (sameAsTop)
				return {
					status: 'partial',
					evidence: 'Bottom CTA is identical to your top CTA.'
				};
			return { status: 'pass', evidence: 'Medium or soft CTA in last 15%.' };
		}
		return { status: 'fail', evidence: 'No CTA in the last 15%.' };
	}
	// tofu_article
	if (hasHard || hasMedium || hasSoft)
		return { status: 'pass', evidence: 'CTA or next-step prompt in last 15%.' };
	// "next step" prompts
	const nextStepPatterns = /next step|what to do|get started|learn more|read more/i;
	if (nextStepPatterns.test(last15))
		return { status: 'pass', evidence: 'Next-step prompt in last 15%.' };
	return {
		status: 'fail',
		evidence: 'No CTA or next-step prompt in the last 15%.'
	};
}

/**
 * Evaluate the full 8-item CRO checklist for a page.
 * @param page - Page metadata (keyword, pageType, briefData)
 * @param content - Tiptap JSON doc or stringified JSON
 */
export function evaluateCROChecklist(
	page: PageForCro,
	content: TiptapDoc | string | null
): CroChecklistResult {
	const doc = normalizeDoc(content);
	const body = extractPlainText(doc);
	const keyword = page.keyword ?? '';
	const pageType = (page.pageType ?? 'tofu_article') as CroPageType;
	const briefData = page.briefData ?? null;

	const first20 = extractFirstPercent(body, 20);

	const item1 = evaluateItem1(doc, keyword);
	const item2 = evaluateItem2(doc, pageType);
	const item3 = evaluateItem3(doc);
	const item4 = evaluateItem4(doc, briefData);
	const item5 = evaluateItem5(body, pageType);
	const item6 = evaluateItem6(body, pageType);
	const item7 = evaluateItem7(body, pageType);
	const item8 = evaluateItem8(doc, pageType, first20);

	const items: Record<string, ChecklistItem> = {
		'1': item1,
		'2': item2,
		'3': item3,
		'4': item4,
		'5': item5,
		'6': item6,
		'7': item7,
		'8': item8
	};

	// Compute score from requirements (calculateCROScore logic inlined for result)
	const requirements = CRO_REQUIREMENTS[pageType] ?? CRO_REQUIREMENTS.tofu_article;
	let score = 0;
	let maxScore = 0;
	for (let i = 1; i <= 8; i++) {
		const req = requirements[i as keyof typeof requirements];
		const item = items[String(i)];
		if (req === 'na') continue;
		if (req === 'required') {
			maxScore += 1;
			if (item.status === 'pass') score += 1;
			if (item.status === 'partial') score += 0.5;
		}
		if (req === 'optional') {
			if (item.status === 'pass') score += 0.5;
			if (item.status === 'partial') score += 0.25;
		}
	}
	const roundedScore = Math.round(score * 10) / 10;
	const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

	return {
		evaluated_at: new Date().toISOString(),
		page_type: pageType,
		score: roundedScore,
		max_score: maxScore,
		items,
		funnel_mismatch: detectFunnelMismatch(body, pageType)
	};
}

/**
 * Detect CTA/funnel mismatch — separate from checklist score.
 * Returns mismatch key or null.
 */
export function detectFunnelMismatch(
	body: string,
	pageType: CroPageType
): string | null {
	const first20 = extractFirstPercent(body, 20);
	const hasHard = hasPhraseInText(first20, CTA_PHRASES.hard);
	const hasMedium = hasPhraseInText(first20, CTA_PHRASES.medium);
	const hasSoft = hasPhraseInText(first20, CTA_PHRASES.soft);
	const hasAny = hasHard || hasMedium || hasSoft;

	if (pageType === 'tofu_article' && hasHard) return 'hard_cta_on_tofu';
	if (pageType === 'mofu_article' && hasHard) return 'hard_cta_on_mofu';
	if (
		(pageType === 'service_page' || pageType === 'money_page') &&
		!hasAny
	)
		return 'no_cta_on_money';
	if (
		(pageType === 'service_page' || pageType === 'money_page') &&
		hasSoft &&
		!hasHard &&
		!hasMedium
	)
		return 'soft_only_on_money';
	return null;
}

/** True when at least one required item is failing — enables "Get Specific Fixes" button */
export function hasRequiredFailingItems(checklist: CroChecklistResult): boolean {
	const pt = (checklist.page_type ?? 'tofu_article') as CroPageType;
	const reqs = CRO_REQUIREMENTS[pt] ?? CRO_REQUIREMENTS.tofu_article;
	for (let i = 1; i <= 8; i++) {
		const r = reqs[i as keyof typeof reqs];
		const item = checklist.items?.[String(i)];
		if (r === 'required' && item?.status === 'fail') return true;
	}
	return false;
}

/** Funnel mismatch warning copy per spec */
export const FUNNEL_MISMATCH_WARNINGS: Record<string, string> = {
	hard_cta_on_tofu:
		"Your CTA is too aggressive for this type of page. This visitor just found your content — they're not ready to buy. A hard sell here will cause them to leave, which also hurts your Google ranking. Replace with a soft offer like a free guide or email sign-up.",
	hard_cta_on_mofu:
		"Your CTA is pushing for a commitment this visitor isn't ready to make. They're still comparing options. Use a medium-commitment offer like a free consultation or demo instead.",
	no_cta_on_money:
		"This page has no call to action. Visitors reading this page are ready to contact you — they have no way to do so. Add a phone number, contact form link, or booking button above the fold immediately.",
	soft_only_on_money:
		"Your only CTA is a low-commitment offer. Visitors on this page are ready to hire or buy — give them a direct way to do it. Add a 'Get a Quote' or 'Book Now' button."
};

/** Get requirement for item: 'required' | 'optional' | 'na' */
export function getCroItemRequirement(
	pageType: CroPageType,
	itemKey: string
): 'required' | 'optional' | 'na' {
	const reqs = CRO_REQUIREMENTS[pageType] ?? CRO_REQUIREMENTS.tofu_article;
	return (reqs[parseInt(itemKey, 10) as keyof typeof reqs] ?? 'na') as
		| 'required'
		| 'optional'
		| 'na';
}

/** Item labels for CRO tab display */
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

/**
 * Calculate CRO score from checklist for persistence.
 * Returns { score, max_score, percentage } for cro_score field.
 */
export function calculateCROScore(
	checklist: CroChecklistResult,
	pageType: CroPageType
): { score: number; max_score: number; percentage: number } {
	const requirements = CRO_REQUIREMENTS[pageType] ?? CRO_REQUIREMENTS.tofu_article;
	let score = 0;
	let maxScore = 0;
	for (let i = 1; i <= 8; i++) {
		const req = requirements[i as keyof typeof requirements];
		const item = checklist.items[String(i)];
		if (!item) continue;
		if (req === 'na') continue;
		if (req === 'required') {
			maxScore += 1;
			if (item.status === 'pass') score += 1;
			if (item.status === 'partial') score += 0.5;
		}
		if (req === 'optional') {
			if (item.status === 'pass') score += 0.5;
			if (item.status === 'partial') score += 0.25;
		}
	}
	return {
		score: Math.round(score * 10) / 10,
		max_score: maxScore,
		percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
	};
}

// ---------------------------------------------------------------------------
// Focus page CRO — destination link + link limit (separate from scoring)
// ---------------------------------------------------------------------------

function walkTiptapForLinks(nodes: unknown[], hrefs: string[]): void {
	for (const n of nodes as Array<{ type?: string; content?: unknown[]; marks?: Array<{ type?: string; attrs?: { href?: string } }> }>) {
		if (n?.type === 'text' && n.marks) {
			for (const m of n.marks) {
				if (m?.type === 'link' && m.attrs?.href) {
					const h = m.attrs.href;
					if (!h.startsWith('#') && !h.startsWith('mailto:')) hrefs.push(h);
				}
			}
		}
		if (n?.content) walkTiptapForLinks(n.content, hrefs);
	}
}

/** Extract all link hrefs from Tiptap document. */
export function extractLinkHrefs(doc: TiptapDoc): string[] {
	if (!doc?.content) return [];
	const hrefs: string[] = [];
	walkTiptapForLinks(doc.content, hrefs);
	return hrefs;
}

/** Normalize URL for comparison (path portion). */
function urlPathForMatch(url: string): string {
	const u = url.toLowerCase().replace(/\/$/, '').trim();
	// Strip protocol and domain for comparison
	const withoutProtocol = u.replace(/^https?:\/\//, '');
	const pathPart = withoutProtocol.includes('/') ? '/' + withoutProtocol.split('/').slice(1).join('/') : withoutProtocol;
	return pathPart.replace(/\?.*$/, '');
}

/**
 * Focus page CRO checks — destination link presence and outbound link limit.
 * Separate from UPSA scoring. Surfaces as tags in workspace.
 */
export function getFocusPageLinkWarnings(
	content: unknown,
	destinationUrl: string | null | undefined,
	maxLinks = 3
): { missingDestination: boolean; overLinkLimit: boolean } {
	const doc =
		content && typeof content === 'object' && 'content' in content
			? (content as TiptapDoc)
			: null;
	const hrefs = extractLinkHrefs(doc);

	let missingDestination = false;
	if (destinationUrl) {
		const destPath = urlPathForMatch(destinationUrl);
		missingDestination = !hrefs.some((h) => {
			const linkPath = urlPathForMatch(h);
			return linkPath === destPath || linkPath.endsWith(destPath) || destPath.endsWith(linkPath);
		});
	}

	return {
		missingDestination,
		overLinkLimit: hrefs.length > maxLinks
	};
}
