/**
 * CRO Studio — audit orchestrator
 * Routes to SEO page or destination page audit based on page_type.
 *
 * Spec: cro-studio.md — runCROAudit()
 */

import { fetchAndParseURL } from './fetchAndParseURL.js';
import { evaluateSEOPageCRO } from './evaluateSEOPageCRO.js';
import type { FunnelStage } from './evaluateSEOPageCRO.js';
import { evaluateOptimalSellingJourney } from './evaluateOptimalSellingJourney.js';
import { detectArchitectureSequence } from './detectArchitectureSequence.js';
import { detectCognitiveBiases } from './detectCognitiveBiases.js';
import { evaluateBiasCoherence } from './evaluateBiasCoherence.js';
import {
	evaluateAboveFold,
	evaluateObjectionCoverage,
	detectCognitiveLoad,
	generateHeadlineInsight
} from './croAuditDetections.js';
import type { ArchitectureViolation } from './detectArchitectureSequence.js';
import type { CognitiveBiasResult } from './detectCognitiveBiases.js';
import type { BiasCoherenceResult, PageSubtype } from './evaluateBiasCoherence.js';

/** Input for running a CRO audit */
export interface CROAuditInput {
	page_url: string;
	page_type: 'seo_page' | 'destination_page';
	/** For seo_page: the destination this page hands off to */
	destination_url?: string | null;
	/** For seo_page: funnel stage for CTA appropriateness (default: mofu) */
	funnel_stage?: FunnelStage;
	page_label?: string | null;
	/** For destination_page: subtype for recommended bias set (default: saas_signup) */
	page_subtype?: PageSubtype | null;
}

/** Result shape — maps to cro_audits table columns */
export interface CROAuditResult {
	page_type: 'seo_page' | 'destination_page';
	audited_at: string;
	cro_score: number;
	max_score: number;
	checklist: Record<string, unknown>;
	architecture_violations: ArchitectureViolation[] | null;
	bias_inventory: CognitiveBiasResult[] | null;
	bias_coherence: BiasCoherenceResult | null;
	headline_insight: string | null;
	above_fold: Record<string, unknown> | null;
	objection_coverage: Record<string, unknown> | null;
	cognitive_load: Record<string, unknown> | null;
	audit_error: boolean;
	audit_error_message: string | null;
}

/**
 * Run a CRO audit for an SEO page or destination page.
 * Fetches live URL, parses content, routes to the appropriate audit.
 *
 * Both evaluateSEOPageCRO and evaluateObjectionCoverage are now async
 * (AI-powered assessment). All other functions remain synchronous.
 */
export async function runCROAudit(input: CROAuditInput): Promise<CROAuditResult> {
	const { page_url, page_type, destination_url, funnel_stage = 'mofu', page_subtype } = input;

	const content = await fetchAndParseURL(page_url);

	if (!content) {
		return {
			page_type,
			audited_at: new Date().toISOString(),
			cro_score: 0,
			max_score: page_type === 'seo_page' ? 5 : 11,
			checklist: {},
			architecture_violations: null,
			bias_inventory: null,
			bias_coherence: null,
			headline_insight: null,
			above_fold: null,
			objection_coverage: null,
			cognitive_load: null,
			audit_error: true,
			audit_error_message:
				'Could not fetch or parse the page. The URL may be unreachable or invalid.'
		};
	}

	// ── SEO PAGE ───────────────────────────────────────────────────────────────

	if (page_type === 'seo_page') {
		// evaluateSEOPageCRO is now async — attentionHook uses an AI call
		const seoResult = await evaluateSEOPageCRO(content, {
			destination_url: destination_url ?? null,
			funnel_stage
		});
		const aboveFold = evaluateAboveFold(content);
		const cognitiveLoad = detectCognitiveLoad(content);
		const headlineInsight = generateHeadlineInsight({
			page_type: 'seo_page',
			checklist: seoResult.checklist as Record<string, unknown>
		});

		return {
			page_type: 'seo_page',
			audited_at: new Date().toISOString(),
			cro_score: seoResult.cro_score,
			max_score: seoResult.max_score,
			checklist: seoResult.checklist as Record<string, unknown>,
			architecture_violations: null,
			bias_inventory: null,
			bias_coherence: null,
			headline_insight: headlineInsight,
			above_fold: aboveFold as unknown as Record<string, unknown>,
			objection_coverage: null,
			cognitive_load: cognitiveLoad as unknown as Record<string, unknown>,
			audit_error: false,
			audit_error_message: null
		};
	}

	// ── DESTINATION PAGE ───────────────────────────────────────────────────────

	const resolvedSubtype = page_subtype ?? 'saas_signup';

	// Run all detection functions — evaluateObjectionCoverage is now async
	const [journeyAudit, objectionCoverage] = await Promise.all([
		Promise.resolve(evaluateOptimalSellingJourney(content)),
		evaluateObjectionCoverage(content, resolvedSubtype)
	]);

	const architectureViolations = detectArchitectureSequence(content);
	const biasInventory = detectCognitiveBiases(content);
	const biasCoherence = evaluateBiasCoherence(biasInventory, resolvedSubtype);
	const aboveFold = evaluateAboveFold(content);
	const cognitiveLoad = detectCognitiveLoad(content);
	const headlineInsight = generateHeadlineInsight({
		page_type: 'destination_page',
		checklist: { journey_checklist: journeyAudit.journey_checklist },
		architecture_violations: architectureViolations,
		bias_inventory: biasInventory,
		journey_checklist: journeyAudit.journey_checklist
	});

	return {
		page_type: 'destination_page',
		audited_at: new Date().toISOString(),
		cro_score: journeyAudit.cro_score,
		max_score: journeyAudit.max_score,
		checklist: {
			journey_checklist: journeyAudit.journey_checklist
		} as Record<string, unknown>,
		architecture_violations: architectureViolations,
		bias_inventory: biasInventory,
		bias_coherence: biasCoherence,
		headline_insight: headlineInsight,
		above_fold: aboveFold as unknown as Record<string, unknown>,
		objection_coverage: objectionCoverage as unknown as Record<string, unknown>,
		cognitive_load: cognitiveLoad as unknown as Record<string, unknown>,
		audit_error: false,
		audit_error_message: null
	};
}
