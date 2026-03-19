/**
 * CRO Studio — bias coherence analysis for persuasion profile
 * Conflict pairs, synergy pairs, coherence score, recommended set by page subtype.
 *
 * Spec: cro-studio.md — evaluateBiasCoherence()
 */

import type { CognitiveBiasResult } from './detectCognitiveBiases.js';

export type PageSubtype = 'saas_signup' | 'ecommerce_product' | 'service_booking';

export interface BiasCoherenceResult {
	score: 'strong' | 'mixed' | 'conflicting';
	active_count: number;
	conflicts: Array<{ pair: [string, string]; reason?: string }>;
	synergies: Array<{ pair: [string, string]; reason?: string }>;
	recommendations: string[];
	overoptimised: boolean;
}

/** Map detector bias IDs to canonical short form for conflict/synergy tables */
const BIAS_ID_MAP: Record<string, string> = {
	decoy_effect: 'decoy',
	endowment_effect: 'endowment',
	bandwagon_effect: 'bandwagon',
	framing_effect: 'framing',
	recency_effect: 'recency'
};

function toCanonical(biasId: string): string {
	return BIAS_ID_MAP[biasId] ?? biasId;
}

/** Conflict pairs — create cognitive dissonance when used together */
const CONFLICT_PAIRS: Array<{ pair: [string, string]; reason: string }> = [
	{ pair: ['scarcity', 'endowment'], reason: '"Almost gone" and "take your time, try it first" send opposite urgency signals' },
	{ pair: ['anchoring', 'framing'], reason: 'High anchor + daily cost framing can feel manipulative when visible together' },
	{ pair: ['default_bias', 'decoy'], reason: 'Pre-selecting an option AND using a decoy is double manipulation — perceptive visitors feel it' },
	{ pair: ['bandwagon', 'scarcity'], reason: '"Everyone\'s using this" contradicts "almost gone" — if popular, why running out?' }
];

/** Synergy pairs — amplify each other */
const SYNERGY_PAIRS: Array<{ pair: [string, string]; reason: string }> = [
	{ pair: ['social_proof', 'bandwagon'], reason: 'Reviews say it\'s good; bandwagon says everyone\'s using it. Quality + popularity.' },
	{ pair: ['scarcity', 'recency'], reason: 'Urgency as the last thing before the CTA is maximum-impact placement' },
	{ pair: ['anchoring', 'loss_aversion'], reason: 'Original price + money-back guarantee = "worth more than you\'re paying, zero risk"' },
	{ pair: ['framing', 'hyperbolic_discounting'], reason: '"$1.29/day, start now" — tiny cost + immediate reward' },
	{ pair: ['endowment', 'default_bias'], reason: 'Account setup + pre-selected plan = invested visitor + path of least resistance' },
	{ pair: ['social_proof', 'loss_aversion'], reason: '"4,000 stores trust us — and if it doesn\'t work, you get your money back"' }
];

/** Recommended bias sets by page subtype */
const RECOMMENDED: Record<PageSubtype, string[]> = {
	saas_signup: ['social_proof', 'loss_aversion', 'framing', 'hyperbolic_discounting', 'recency'],
	ecommerce_product: ['social_proof', 'scarcity', 'anchoring', 'bandwagon', 'loss_aversion'],
	service_booking: ['social_proof', 'loss_aversion', 'endowment', 'recency', 'framing']
};

/**
 * Evaluate bias coherence: conflicts, synergies, score, overoptimisation.
 * Coherence is advisory — does not affect CRO score.
 *
 * @param biasInventory - From detectCognitiveBiases()
 * @param pageSubtype - saas_signup | ecommerce_product | service_booking (default: saas_signup)
 */
export function evaluateBiasCoherence(
	biasInventory: CognitiveBiasResult[],
	pageSubtype: PageSubtype | null = 'saas_signup'
): BiasCoherenceResult {
	const subtype = pageSubtype ?? 'saas_signup';

	const activeCanonical = biasInventory
		.filter((b) => b.present)
		.map((b) => toCanonical(b.bias_id));

	const activeSet = new Set(activeCanonical);

	const conflicts = CONFLICT_PAIRS.filter(
		({ pair: [a, b] }) => activeSet.has(a) && activeSet.has(b)
	).map(({ pair, reason }) => ({ pair, reason }));

	const synergies = SYNERGY_PAIRS.filter(
		({ pair: [a, b] }) => activeSet.has(a) && activeSet.has(b)
	).map(({ pair, reason }) => ({ pair, reason }));

	const overoptimised = activeCanonical.length > 6;

	const recommended = RECOMMENDED[subtype] ?? RECOMMENDED.saas_signup;

	// Score: Strong / Mixed / Conflicting
	let score: 'strong' | 'mixed' | 'conflicting' = 'strong';
	if (conflicts.length > 0) {
		score = 'conflicting';
	} else if (overoptimised) {
		score = 'mixed';
	} else {
		// Check if any active bias is outside recommended set — still strong if no conflicts
		const offRecommendation = activeCanonical.some((b) => !recommended.includes(b));
		if (offRecommendation) score = 'mixed';
	}

	return {
		score,
		active_count: activeCanonical.length,
		conflicts,
		synergies,
		recommendations: recommended,
		overoptimised
	};
}
