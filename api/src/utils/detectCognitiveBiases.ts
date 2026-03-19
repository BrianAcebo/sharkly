/**
 * CRO Studio — cognitive bias inventory for destination pages
 * 11 biases: present or missing. Not scored — informational panel.
 *
 * Spec: cro-studio.md — detectCognitiveBiases()
 */

import * as cheerio from 'cheerio';
import type { ParsedPageContent } from './fetchAndParseURL.js';

/** Single bias result: present or not */
export interface CognitiveBiasResult {
	bias_id: string;
	label: string;
	present: boolean;
	evidence?: string;
}

/** Bias definitions with detection patterns */
const BIAS_DEFINITIONS: Array<{
	id: string;
	label: string;
	patterns: RegExp[];
}> = [
	{
		id: 'anchoring',
		label: 'Anchoring (original price shown before discounted)',
		patterns: [
			/\$\d+[\d,.]*\s*(was|originally|compare\s+at|regular|list)\s*(\$|price)/i,
			/(was|originally)\s*\$[\d,.]+\s*(now|today)/i,
			/crossed?\s*out|strikethrough|~~\$\d+/i,
			/save\s+\$\d+|\d+%\s*off/i,
			/msrp|compare\s+at|list\s+price/i
		]
	},
	{
		id: 'scarcity',
		label: 'Scarcity effect (limited stock/time signals)',
		patterns: [
			/limited\s+(time|edition|stock|supply|availability)/i,
			/only\s+\d+\s*(left|remaining|in\s+stock|spots?)/i,
			/\d+\s*(left|remaining|in\s+stock|spots?)\s*(\.|!)/i,
			/low\s+stock|almost\s+gone|selling\s+fast/i,
			/ends\s+(soon|tonight|today)|last\s+chance|while\s+supplies\s+last/i,
			/order\s+before\s+\d|deadline|expires/i
		]
	},
	{
		id: 'social_proof',
		label: 'Social proof (reviews, testimonials, customer count)',
		patterns: [
			/\d[\d,]*\+\s*(reviews?|ratings?|customers?|clients?|users?)/i,
			/\d[\d,.]*\s*(stars?|★|reviews?)/i,
			/testimonial|review|rating/i,
			/customer\s+(said|says|quote|stories?)/i,
			/case\s+study|success\s+story|trusted\s+by/i
		]
	},
	{
		id: 'loss_aversion',
		label: 'Loss aversion (money-back guarantee, free returns)',
		patterns: [
			/money[\s-]back\s+guarantee|satisfaction\s+guarantee/i,
			/free\s+(returns?|shipping|exchange)/i,
			/risk[\s-]free|no\s+risk|nothing\s+to\s+lose/i,
			/guarantee|warranty/i,
			/not\s+satisfied\?\s*(full\s+)?refund/i
		]
	},
	{
		id: 'decoy_effect',
		label: 'Decoy effect (pricing tiers with clear winner)',
		patterns: [
			/most\s+popular|best\s+value|recommended|best\s+seller/i,
			/\$\d+.*\$\d+.*\$\d+/, // multiple price points
			/plan\s*[:\s]*\w+.*plan\s*[:\s]*\w+/i,
			/(basic|standard|premium|pro)\s*[|\-]\s*\$/i,
			/pricing\s+(tier|plan|option)/i
		]
	},
	{
		id: 'endowment_effect',
		label: 'Endowment effect (try before you buy, customisation)',
		patterns: [
			/try\s+(before\s+you\s+buy|free|it\s+first)/i,
			/free\s+trial|trial\s+period|no\s+commitment\s+to\s+start/i,
			/customi[sz]e|custom\s+(build|design|order)/i,
			/build\s+your\s+own|design\s+your\s+own/i,
			/sample|preview|demo\s+(version)?/i
		]
	},
	{
		id: 'bandwagon_effect',
		label: 'Bandwagon effect (X customers / X currently viewing)',
		patterns: [
			/\d+[\d,]*\s+(people|customers?|viewers?)\s+(viewing|bought|purchased)/i,
			/\d+[\d,]*\s+(viewing|in\s+cart|looking)\s+(right\s+now|now)/i,
			/join\s+\d+[\d,]*\s+(customers?|others?|people)/i,
			/\#1\s+(best\s+)?seller|top\s+rated|most\s+chosen/i
		]
	},
	{
		id: 'framing_effect',
		label: 'Framing effect (price framed as low commitment)',
		patterns: [
			/(just|only)\s+\$?\d+[\d.]*/i,
			/less\s+than\s+(a\s+)?\$\d+/i,
			/per\s+(day|month|week|year)/i,
			/as\s+low\s+as|starting\s+at|from\s+\$/i,
			/only\s+\d+\s*(cents|dollars?)?\s*(a\s+)?(day|month)/i
		]
	},
	{
		id: 'hyperbolic_discounting',
		label: 'Hyperbolic discounting (instant reward for acting now)',
		patterns: [
			/instant\s+(access|delivery|reward|result)/i,
			/immediate\s+(access|delivery|savings)/i,
			/get\s+(it\s+)?(right\s+)?now|today/i,
			/act\s+now\s+(and|to)\s+get|order\s+now\s+for/i,
			/free\s+(when\s+you|with\s+order|today\s+only)/i
		]
	},
	{
		id: 'recency_effect',
		label: 'Recency effect (key offer visible at top and bottom)',
		patterns: [] // Handled separately — check for repeated offer phrases
	},
	{
		id: 'default_bias',
		label: 'Default bias (pre-selected options favouring conversion)',
		patterns: [
			/recommended|pre[\s-]selected|selected\s+by\s+default/i,
			/most\s+popular\s+(option|choice|plan)/i
		]
	}
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
	return patterns.length > 0 && patterns.some((p) => p.test(text));
}

function detectRecencyEffect(content: ParsedPageContent): { present: boolean; evidence?: string } {
	// Key offer (discount, free, % off) visible in both first and last portion of content
	const body = content.bodyText;
	const words = body.split(/\s+/).filter(Boolean);
	if (words.length < 50) return { present: false };

	const firstChunk = words.slice(0, Math.min(80, Math.floor(words.length * 0.2))).join(' ');
	const lastChunk = words.slice(-Math.min(80, Math.floor(words.length * 0.2))).join(' ');

	const offerPatterns = [
		/\d+%\s*(off|savings?)/i,
		/free\s+(shipping|trial|gift|bonus)/i,
		/\$\d+\s*off|\b(off|save|discount)\b/i
	];

	const inFirst = offerPatterns.some((p) => p.test(firstChunk));
	const inLast = offerPatterns.some((p) => p.test(lastChunk));

	if (inFirst && inLast) {
		return { present: true, evidence: 'Offer/key message appears in both top and bottom of page.' };
	}
	return { present: false };
}

function detectDefaultBias(content: ParsedPageContent): { present: boolean; evidence?: string } {
	// Check HTML for pre-selected form elements
	const html = content.html ?? '';
	if (!html) return { present: false };

	const $ = cheerio.load(html);

	// selected attribute on option/input
	const hasSelectedOption = $('option[selected], select option[selected]').length > 0;
	const hasCheckedInput = $('input[type="checkbox"][checked], input[type="radio"][checked]').length > 0;

	// "recommended" / "most popular" near form elements
	const bodyText = content.bodyText.toLowerCase();
	const hasRecommendedNearForm =
		/(recommended|most popular|best value)\s*(option|plan|choice)?/i.test(bodyText);

	if (hasSelectedOption || hasCheckedInput || hasRecommendedNearForm) {
		const parts: string[] = [];
		if (hasSelectedOption) parts.push('pre-selected option');
		if (hasCheckedInput) parts.push('pre-checked input');
		if (hasRecommendedNearForm) parts.push('recommended option label');
		return { present: true, evidence: `Detected: ${parts.join(', ')}.` };
	}
	return { present: false };
}

/**
 * Detect which of the 11 cognitive biases are present on a destination page.
 * Not scored — informational. Missing biases do not count as failures.
 *
 * @param content - Parsed page content from fetchAndParseURL (null = fetch failed)
 */
export function detectCognitiveBiases(
	content: ParsedPageContent | null
): CognitiveBiasResult[] {
	if (!content) {
		return BIAS_DEFINITIONS.map((b) => ({
			bias_id: b.id,
			label: b.label,
			present: false
		}));
	}

	const bodyText = content.bodyText;
	const results: CognitiveBiasResult[] = [];

	for (const bias of BIAS_DEFINITIONS) {
		if (bias.id === 'recency_effect') {
			const { present, evidence } = detectRecencyEffect(content);
			results.push({
				bias_id: bias.id,
				label: bias.label,
				present,
				evidence
			});
			continue;
		}

		if (bias.id === 'default_bias') {
			const { present, evidence } = detectDefaultBias(content);
			results.push({
				bias_id: bias.id,
				label: bias.label,
				present,
				evidence
			});
			continue;
		}

		const present = matchesAny(bodyText, bias.patterns);
		results.push({
			bias_id: bias.id,
			label: bias.label,
			present
		});
	}

	return results;
}
