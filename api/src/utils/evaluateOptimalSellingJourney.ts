/**
 * CRO Studio — 11-step Optimal Selling Journey audit for destination pages
 * Product, service, and signup pages. Full conversion audit.
 *
 * Spec: cro-studio.md — evaluateOptimalSellingJourney()
 * Steps map to AIDA + MAP: Emotional engagement first → Logical justification → Emotional close
 * Step 6b (Pricing) inserted between Feature Depth and Social Proof.
 */

import type { ParsedPageContent } from './fetchAndParseURL.js';

/** Result for a single journey step */
export interface JourneyStepResult {
	step: number;
	/** Display label when step number differs from canonical (e.g. "6b" for pricing) */
	stepDisplay?: string;
	name: string;
	type: 'emotional' | 'logical';
	status: 'pass' | 'partial' | 'fail';
	evidence: string;
}

export interface OptimalSellingJourneyResult {
	page_type: 'destination_page';
	cro_score: number;
	max_score: 11;
	journey_checklist: JourneyStepResult[];
}

const STEP_NAMES: Record<number, string> = {
	1: 'Attention — enticing above-fold headline + visual hook',
	2: 'Design trust — professional, credible first impression',
	3: 'Credibility — expertise and trust signals before the ask',
	4: 'Problem identification — customer pain clearly named',
	5: 'Solution introduction — how this product fixes the problem',
	6: 'Feature depth — detail that justifies the decision logically',
	7: 'Pricing — present, placed after features, with emotional framing (anchoring / daily cost / decoy / risk-reversal)',
	8: 'Social proof — placed after pricing to ease tension. "Others paid this and got results."',
	9: 'Offer/value — discount, bonus, or perceived-value incentive',
	10: 'Urgency — reason to act now, not later',
	11: 'Friction removal — checkout/conversion path is fast and obvious'
};

/** Value proposition / attention-grabbing patterns in headline and above fold */
const ATTENTION_PATTERNS = [
	/\b(best|top|#1|leading|trusted|proven|simple|easy|fast|powerful|transform)\b/i,
	/\b(save|boost|improve|grow|increase|reduce|solve|fix)\b/i,
	/\d+%\s*(off|savings|growth|improvement|faster)/i,
	/\?/, // Question in headline
	/\b(you|your)\b/i
];

/** Trust / credibility signals */
const CREDIBILITY_PATTERNS = [
	/\d[\d,]*\s*(\+\s*)?(reviews?|ratings?|stars?|customers?|clients?)/i,
	/certif|licens|accredit|award|member\s+of|approved\s+by/i,
	/\d+\s*(years?\s*(of\s*)?(experience|in\s+business))/i,
	/since\s+\d{4}|established\s+\d{4}|founded\s+in\s+\d{4}/i,
	/guarantee|warranty|money[\s-]back|satisfaction\s+guarantee|risk[\s-]free/i,
	/testimonial|case\s+study|customer\s+story|success\s+story/i,
	/as\s+seen\s+in|featured\s+in|trusted\s+by/i
];

/** Problem / pain language */
const PROBLEM_PATTERNS = [
	/\b(struggle|problem|challenge|frustrat|difficult|pain|issue)\b/i,
	/\b(need|want|looking for|searching for)\b/i,
	/\b(waste|lost|miss|fail|cost)\b/i,
	/\b(without|lack|missing)\b/i
];

/** Solution language */
const SOLUTION_PATTERNS = [
	/\b(solve|fix|help|enable|provide|deliver|offer)\b/i,
	/\b(solution|answer|way|approach)\b/i,
	/\b(get|achieve|reach|meet)\b/i
];

/** Feature / specification depth */
const FEATURE_PATTERNS = [
	/\b(feature|include|comes with|equipped with)\b/i,
	/\b(specification|spec|detail|capability)\b/i,
	/\d+\s*(features?|reasons?|benefits?|steps?)/i,
	/\bullet|•|- /, // List formatting
	/\b(integration|api|platform)\b/i
];

/** Pricing presence — price point, cost indication, tier/plan */
const PRICING_PRESENCE_PATTERNS = [
	/\b(price|pricing|plan|tier|cost|monthly|annual|per\s+month|per\s+year)\b/i,
	/\$\s*[\d,]+(?:\.\d{2})?|\€\s*[\d,]+|\£\s*[\d,]+/,
	/\b(from\s+\$|per\s+month|per\s+year|one[- ]?time)\b/i,
	/\b(free\s+trial|start\s+free|try\s+free)\b/i
];

/** Emotional framing: anchoring, daily cost, decoy, risk-reversal */
const PRICING_ANCHORING_PATTERNS = [
	/~~\s*\$[\d,]+|was\s+\$[\d,]+|original\s+(?:price|cost)|compare[d]?\s+at/i,
	/\$[\d,]+\s*(?:was|originally|before|compare)/i
];
const PRICING_DAILY_COST_PATTERNS = [
	/\$[\d.]+(?:\s*\/\s*)?(?:day|per\s+day)/i,
	/less\s+than\s+(?:a\s+)?(?:coffee|cup|dinner)/i
];
const PRICING_DECOY_PATTERNS = [
	/\b(most\s+popular|best\s+value|recommended)\b/i,
	/\b(starter|basic|pro|growth|scale|enterprise)\b.*\b(starter|basic|pro|growth|scale|enterprise)\b/i
];
const PRICING_RISK_REVERSAL_PATTERNS = [
	/money[\s-]?back|guarantee|free\s+trial|risk[\s-]?free|no\s+commitment/i
];

/** Social proof */
const SOCIAL_PROOF_PATTERNS = [
	/testimonial|review|rating|★|stars?/i,
	/customer\s+(said|says|quote)/i,
	/\d[\d,]*\+\s*(customers?|clients?|users?|reviews?)/i,
	/case\s+study|success\s+story|result/i,
	/trusted\s+by|used\s+by|loved\s+by/i,
	/as\s+seen\s+in|featured\s+in|press|media/i
];

/** Pricing presence — price point, cost indication, tier/plan */
const PRICING_PATTERNS = [
	/\$[\d,]+(\.\d{2})?|\€[\d,]+(\.\d{2})?|£[\d,]+(\.\d{2})?/,
	/\b(price|pricing|cost|plan|tier|monthly|annual|per\s+month|per\s+year|one[- ]?time)\b/i,
	/\b(from\s+\$|\d+\/month|\d+\/year|starts\s+at)\b/i
];

/** Emotional framing: anchoring (original/competitor price before actual) */
const FRAMING_ANCHORING_PATTERNS = [
	/\$[\d,]+[\s\-—]\s*\$[\d,]+/, // $149 — $39
	/\b(was|originally|regularly|list\s+price|compare[d]?\s+at)\s+(:\s*)?\$?\d+/i,
	/\d+\s*%\s*off|\d+\s*%\s*discount/i
];

/** Emotional framing: daily cost */
const FRAMING_DAILY_COST_PATTERNS = [
	/\$\d+(\.\d+)?\s*\/?\s*(per\s+)?day/i,
	/less\s+than\s+(a\s+)?(coffee|cup\s+of\s+coffee)/i,
	/\d+\s*cents?\s*(per\s+)?day/i
];

/** Emotional framing: decoy (3+ tiers) */
const FRAMING_DECOY_PATTERNS = [
	/\b(starter|basic|growth|pro|scale|enterprise)\b.*\b(starter|basic|growth|pro|scale|enterprise)\b.*\b(starter|basic|growth|pro|scale|enterprise)\b/is,
	/(pricing\s+tier|plan)\s*[:\|]\s*\w+.*\w+.*\w+/i,
	/\b(most\s+popular|best\s+value|recommended)\b/i
];

/** Emotional framing: risk-reversal near pricing */
const FRAMING_RISK_REVERSAL_PATTERNS = [
	/money[\s-]back|guarantee|risk[\s-]free|free\s+trial|no\s+credit\s+card/i
];

/** Offer / value incentive */
const OFFER_PATTERNS = [
	/\b(discount|off|save|free|bonus|included)\b/i,
	/\b(offer|deal|promotion|special)\b/i,
	/\b(value|worth|trial|no\s+charge)\b/i
];

/** Urgency signals */
const URGENCY_PATTERNS = [
	/\b(limited\s+time|today\s+only|ends\s+soon|act\s+now|hurry)\b/i,
	/\b(while\s+supplies\s+last|last\s+chance|don't\s+miss)\b/i,
	/\b(expires|deadline|offer\s+ends)\b/i,
	/\d+\s*(left|remaining|in\s+stock|spots?)/i,
	/\d+\s*(hours?|days?)\s*(left|remaining|only)/i
];

/** Conversion / CTA (friction removal) */
const CONVERSION_PATTERNS = [
	/\b(add\s+to\s+cart|buy\s+now|order\s+now|get\s+started|sign\s+up)\b/i,
	/\b(claim|start\s+free|try\s+free|subscribe)\b/i,
	/\b(checkout|purchase|place\s+order)\b/i
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
	return patterns.some((p) => p.test(text));
}

/** Return index of first pattern match, or -1 if none */
function indexOfFirstMatch(text: string, patterns: RegExp[]): number {
	for (const p of patterns) {
		const m = text.match(p);
		if (m && typeof m.index === 'number') return m.index;
	}
	return -1;
}

function step1_Attention(content: ParsedPageContent): JourneyStepResult {
	const headline = (content.h1 ?? content.title ?? '').trim();
	const aboveFold = content.aboveFoldText;

	const hasHeadline = headline.length >= 10;
	const hasAttention = ATTENTION_PATTERNS.some(
		(p) => p.test(headline) || p.test(aboveFold.slice(0, 400))
	);

	if (hasHeadline && hasAttention) {
		return {
			step: 1,
			name: STEP_NAMES[1],
			type: 'emotional',
			status: 'pass',
			evidence: 'Strong above-fold headline with clear value prop.'
		};
	}

	if (!hasHeadline) {
		return {
			step: 1,
			name: STEP_NAMES[1],
			type: 'emotional',
			status: 'fail',
			evidence:
				'No clear headline (H1 or title) with value proposition. The visitor needs an immediate hook that communicates what they get.'
		};
	}

	return {
		step: 1,
		name: STEP_NAMES[1],
		type: 'emotional',
		status: 'fail',
		evidence:
			'Above-fold content does not clearly grab attention. Add a compelling headline that states the benefit or outcome — not just the product name.'
	};
}

function step2_DesignTrust(content: ParsedPageContent): JourneyStepResult {
	const h1 = content.h1 ?? '';
	const aboveFold = content.aboveFoldText;
	const hasStructure = h1.length > 0 && aboveFold.length >= 100;

	// Red flags that suggest unprofessional impression
	const spamFlags = /click here|act now!!|!!!|winner|congratulations you/i;
	if (spamFlags.test(content.bodyText.slice(0, 500))) {
		return {
			step: 2,
			name: STEP_NAMES[2],
			type: 'emotional',
			status: 'fail',
			evidence:
				'Page contains spam-like language that undermines credibility. Use professional, clear copy.'
		};
	}

	if (hasStructure) {
		return {
			step: 2,
			name: STEP_NAMES[2],
			type: 'emotional',
			status: 'pass',
			evidence: 'Professional, credible first impression with clear structure.'
		};
	}

	return {
		step: 2,
		name: STEP_NAMES[2],
		type: 'emotional',
		status: 'fail',
		evidence:
			'First impression lacks structure. Ensure you have a clear H1 and substantive above-fold content before the fold.'
	};
}

function step3_Credibility(content: ParsedPageContent): JourneyStepResult {
	// Credibility before the ask: trust signals should appear in first half of content
	const halfLen = Math.floor(content.bodyText.length * 0.5);
	const firstHalf = content.bodyText.slice(0, halfLen);
	const hasCredibility = matchesAny(firstHalf, CREDIBILITY_PATTERNS);

	if (hasCredibility) {
		return {
			step: 3,
			name: STEP_NAMES[3],
			type: 'emotional',
			status: 'pass',
			evidence: 'Credibility signals present before the CTA — visitors see why they should trust you first.'
		};
	}

	return {
		step: 3,
		name: STEP_NAMES[3],
		type: 'emotional',
		status: 'fail',
		evidence:
			'No credibility signals before the CTA. You are asking visitors to commit before establishing why you are qualified. Add reviews, credentials, or trust indicators earlier on the page.'
	};
}

function step4_ProblemIdentification(content: ParsedPageContent): JourneyStepResult {
	const body = content.bodyText;
	const first60 = body.slice(0, Math.floor(body.length * 0.6));
	const hasProblem = matchesAny(first60, PROBLEM_PATTERNS);

	if (hasProblem) {
		return {
			step: 4,
			name: STEP_NAMES[4],
			type: 'emotional',
			status: 'pass',
			evidence: 'Customer pain is clearly named — the visitor sees their problem reflected.'
		};
	}

	return {
		step: 4,
		name: STEP_NAMES[4],
		type: 'emotional',
		status: 'fail',
		evidence:
			'The visitor\'s pain is not clearly named. Problem identification creates emotional resonance — name the challenge, frustration, or need specifically before presenting the solution.'
	};
}

function step5_SolutionIntroduction(content: ParsedPageContent): JourneyStepResult {
	const body = content.bodyText;
	const hasSolution = matchesAny(body, SOLUTION_PATTERNS);

	if (hasSolution) {
		return {
			step: 5,
			name: STEP_NAMES[5],
			type: 'emotional',
			status: 'pass',
			evidence: 'Solution clearly described — how this product fixes the problem.'
		};
	}

	return {
		step: 5,
		name: STEP_NAMES[5],
		type: 'emotional',
		status: 'fail',
		evidence:
			'Solution introduction is vague or missing. Explain clearly how your product or service addresses the problem you identified.'
	};
}

function step6_FeatureDepth(content: ParsedPageContent): JourneyStepResult {
	const body = content.bodyText;
	const wordCount = body.split(/\s+/).filter(Boolean).length;
	const hasFeatures = matchesAny(body, FEATURE_PATTERNS);
	const hasDepth = wordCount >= 150 || hasFeatures;

	if (hasDepth) {
		return {
			step: 6,
			name: STEP_NAMES[6],
			type: 'logical',
			status: 'pass',
			evidence: 'Feature depth is present and logical — enough detail to justify the decision.'
		};
	}

	return {
		step: 6,
		name: STEP_NAMES[6],
		type: 'logical',
		status: 'fail',
		evidence:
			'Insufficient feature depth. After emotional engagement, visitors need logical justification — features, specifications, or benefits that back up the decision to convert.'
	};
}

function step7_Pricing(content: ParsedPageContent): JourneyStepResult {
	const body = content.bodyText;
	const hasPricing = matchesAny(body, PRICING_PATTERNS);
	const hasFraming =
		matchesAny(body, PRICING_ANCHORING_PATTERNS) ||
		matchesAny(body, PRICING_DAILY_COST_PATTERNS) ||
		matchesAny(body, PRICING_DECOY_PATTERNS) ||
		matchesAny(body, PRICING_RISK_REVERSAL_PATTERNS);

	if (hasPricing && hasFraming) {
		return {
			step: 7,
			stepDisplay: '6b',
			name: STEP_NAMES[7],
			type: 'logical',
			status: 'pass',
			evidence: 'Pricing present with emotional framing (anchoring, daily cost, decoy, or risk-reversal).'
		};
	}
	if (hasPricing) {
		return {
			step: 7,
			stepDisplay: '6b',
			name: STEP_NAMES[7],
			type: 'logical',
			status: 'partial',
			evidence: 'Pricing present but lacks emotional framing. Add anchoring, daily cost, decoy, or risk-reversal.'
		};
	}
	return {
		step: 7,
		stepDisplay: '6b',
		name: STEP_NAMES[7],
		type: 'logical',
		status: 'fail',
		evidence: 'Pricing not clearly present. Place pricing after features, with emotional framing.'
	};
}

function step8_SocialProof(content: ParsedPageContent): JourneyStepResult {
	const hasProof = matchesAny(content.bodyText, SOCIAL_PROOF_PATTERNS);
	return hasProof
		? {
				step: 8,
				name: STEP_NAMES[8],
				type: 'logical',
				status: 'pass',
				evidence: 'Social proof present after pricing — others have converted and got results.'
		  }
		: {
				step: 8,
				name: STEP_NAMES[8],
				type: 'logical',
				status: 'fail',
				evidence:
					'Social proof missing or weak. Place testimonials, reviews, or case studies after pricing to ease tension.'
		  };
}

function step9_Offer(content: ParsedPageContent): JourneyStepResult {
	const hasOffer = matchesAny(content.bodyText, OFFER_PATTERNS);
	return hasOffer
		? {
				step: 9,
				name: STEP_NAMES[9],
				type: 'emotional',
				status: 'pass',
				evidence: 'Offer or value incentive present — discount, bonus, or trial.'
		  }
		: {
				step: 9,
				name: STEP_NAMES[9],
				type: 'emotional',
				status: 'fail',
				evidence: 'Offer/value incentive missing. Add discount, bonus, or trial to close the loop.'
		  };
}

function step10_Urgency(content: ParsedPageContent): JourneyStepResult {
	const hasUrgency = matchesAny(content.bodyText, URGENCY_PATTERNS);
	return hasUrgency
		? {
				step: 10,
				name: STEP_NAMES[10],
				type: 'emotional',
				status: 'pass',
				evidence: 'Urgency signal present — reason to act now.'
		  }
		: {
				step: 10,
				name: STEP_NAMES[10],
				type: 'emotional',
				status: 'fail',
				evidence: 'Urgency missing. Add a genuine reason to act now, not later.'
		  };
}

function step11_FrictionRemoval(content: ParsedPageContent): JourneyStepResult {
	const hasConversion = matchesAny(content.bodyText, CONVERSION_PATTERNS);
	return hasConversion
		? {
				step: 11,
				name: STEP_NAMES[11],
				type: 'emotional',
				status: 'pass',
				evidence: 'Clear CTA and conversion path.'
		  }
		: {
				step: 11,
				name: STEP_NAMES[11],
				type: 'emotional',
				status: 'fail',
				evidence: 'No clear CTA or conversion path. Make checkout/signup fast and obvious.'
		  };
}

/**
 * Run the 11-step Optimal Selling Journey audit on a destination page.
 */
export function evaluateOptimalSellingJourney(
	content: ParsedPageContent
): OptimalSellingJourneyResult {
	const steps = [
		step1_Attention(content),
		step2_DesignTrust(content),
		step3_Credibility(content),
		step4_ProblemIdentification(content),
		step5_SolutionIntroduction(content),
		step6_FeatureDepth(content),
		step7_Pricing(content),
		step8_SocialProof(content),
		step9_Offer(content),
		step10_Urgency(content),
		step11_FrictionRemoval(content)
	];
	const passed = steps.filter((s) => s.status === 'pass').length;
	const partial = steps.filter((s) => s.status === 'partial').length;
	const cro_score = passed + partial * 0.5;
	return {
		page_type: 'destination_page',
		cro_score: Math.min(11, Math.round(cro_score * 10) / 10),
		max_score: 11,
		journey_checklist: steps
	};
}
