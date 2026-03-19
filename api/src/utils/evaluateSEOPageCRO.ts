/**
 * CRO Studio — 5-item SEO page checklist
 * Light CRO audit for focus pages and supporting articles.
 * Does not penalise long-form content. Protects rankings at all costs.
 *
 * Spec: cro-studio.md — evaluateSEOPageCRO()
 */

import OpenAI from 'openai';
import { checkDestinationHandoff } from './checkDestinationHandoff.js';
import type { ParsedPageContent } from './fetchAndParseURL.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const GPT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';

/** Funnel stage for CTA appropriateness */
export type FunnelStage = 'tofu' | 'mofu' | 'bofu';

/** CTA commitment levels */
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
		'get a free',
		'try free',
		'start free'
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

/** Transactional language — funnel mismatch when on ToFu/informational */
const TRANSACTIONAL_PHRASES = [
	'buy now',
	'order now',
	'add to cart',
	'get started',
	'sign up',
	'get a quote',
	'book now',
	'schedule',
	'request a quote',
	'purchase',
	'checkout',
	'subscribe now'
];

export interface SEOPageChecklistItem {
	status: 'pass' | 'partial' | 'fail' | 'na';
	evidence: string;
	hook_type?: string;
}

export interface SEOPageCROResult {
	page_type: 'seo_page';
	cro_score: number;
	max_score: number;
	checklist: {
		handoff: SEOPageChecklistItem;
		ctaFit: SEOPageChecklistItem;
		funnelMismatch: SEOPageChecklistItem;
		attentionHook: SEOPageChecklistItem;
		ctaPresent: SEOPageChecklistItem;
	};
}

function detectCTAPhases(text: string): { hard: string[]; medium: string[]; soft: string[] } {
	const lower = text.toLowerCase();
	const found = { hard: [] as string[], medium: [] as string[], soft: [] as string[] };
	for (const p of CTA_PHRASES.hard) if (lower.includes(p)) found.hard.push(p);
	for (const p of CTA_PHRASES.medium) if (lower.includes(p)) found.medium.push(p);
	for (const p of CTA_PHRASES.soft) if (lower.includes(p)) found.soft.push(p);
	return found;
}

function hasAnyCTA(text: string): boolean {
	const lower = text.toLowerCase();
	return [...CTA_PHRASES.hard, ...CTA_PHRASES.medium, ...CTA_PHRASES.soft].some((p) =>
		lower.includes(p)
	);
}

function checkCTAFit(
	bodyText: string,
	funnel_stage: FunnelStage
): { status: 'pass' | 'fail'; evidence: string } {
	const found = detectCTAPhases(bodyText);
	const stageLabel = funnel_stage === 'tofu' ? 'ToFu' : funnel_stage === 'mofu' ? 'MoFu' : 'BoFu';

	if (funnel_stage === 'tofu') {
		if (found.hard.length > 0) {
			return {
				status: 'fail',
				evidence: `Hard-sell CTAs detected (${found.hard.join(', ')}) on a ToFu article. ToFu pages should use soft CTAs only — lead magnets, guides, email opt-ins.`
			};
		}
		if (found.medium.length > 0 && found.soft.length === 0) {
			return {
				status: 'fail',
				evidence: `Medium-commitment CTAs on a ToFu article. ToFu should use soft CTAs (download, learn more, get the guide) rather than demos or assessments.`
			};
		}
		return {
			status: 'pass',
			evidence: `CTA commitment level matches funnel stage (${stageLabel} — informational).`
		};
	}

	if (funnel_stage === 'mofu') {
		if (found.hard.length > 0) {
			return {
				status: 'fail',
				evidence: `Hard-sell CTAs detected (${found.hard.join(', ')}) on a MoFu comparison page. MoFu allows soft and medium CTAs; hard sell can undermine ranking intent.`
			};
		}
		return {
			status: 'pass',
			evidence: `CTA commitment level matches funnel stage (${stageLabel} — comparison).`
		};
	}

	return {
		status: 'pass',
		evidence: `CTA commitment level matches funnel stage (${stageLabel} — decision).`
	};
}

function checkFunnelMismatch(
	bodyText: string,
	funnel_stage: FunnelStage
): { status: 'pass' | 'fail'; evidence: string } {
	const lower = bodyText.toLowerCase();
	const firstHalf = lower.slice(0, Math.floor(lower.length * 0.5));
	const transactionalFound = TRANSACTIONAL_PHRASES.filter((p) => firstHalf.includes(p));

	if (funnel_stage === 'tofu' && transactionalFound.length > 0) {
		return {
			status: 'fail',
			evidence: `Transaction-focused language (${transactionalFound.slice(0, 4).join(', ')}) appears early in an informational article. This can fight the page's ranking strategy.`
		};
	}
	if (funnel_stage === 'mofu' && transactionalFound.length >= 3) {
		return {
			status: 'fail',
			evidence: `Heavy transaction-focused language in a MoFu comparison page. Consider softening the sell to preserve ranking intent.`
		};
	}
	return {
		status: 'pass',
		evidence: 'No funnel mismatch — page intent is consistent with keyword type.'
	};
}

/**
 * AI-based attention hook assessment.
 * Replaces the old regex-based emotional hook detection.
 * Runs as part of the standard 1-credit audit — no separate credit charge.
 * Uses temperature: 0, max_tokens: 150 — fast and cheap.
 *
 * Three hook types earn attention:
 *   emotional = pass (activates feeling/desire/pain)
 *   specific  = pass (surprising stat, counter-intuitive claim, curiosity gap)
 *   value     = partial (direct outcome promise — good for high-intent, weaker for cold)
 *   none      = fail
 *
 * On SEO pages: partial maps to pass in scoring — only fail counts against the score.
 */
async function checkAttentionHook(
	aboveFoldText: string
): Promise<{ status: 'pass' | 'partial' | 'fail'; hook_type: string; evidence: string }> {
	const trimmed = aboveFoldText.trim();

	if (!trimmed || trimmed.length < 20) {
		return {
			status: 'fail',
			hook_type: 'none',
			evidence: 'Insufficient content above the fold to evaluate attention hook.'
		};
	}

	const sample = trimmed.slice(0, 600);

	try {
		const response = await openai.chat.completions.create({
			model: GPT_MODEL,
			messages: [
				{
					role: 'user',
					content: `You are a CRO expert. Assess whether this page's above-fold content earns visitor attention before delivering information.

Three hook types earn attention:
- EMOTIONAL: Speaks to desire, fear, frustration, or aspiration. Uses "you" language, names a pain, activates a feeling.
- SPECIFIC: A concrete surprising stat, bold specific claim, counter-intuitive statement, or curiosity gap that makes the visitor think "wait, really?"
- VALUE: A clear direct promise of a specific outcome the visitor wants. Works for high-intent visitors who already know their problem.
- NONE: Opens with generic product description, company name, or information that doesn't first earn attention.

Above-fold content:
${sample}

Respond with ONLY valid JSON, no other text:
{
  "hook_type": "emotional" | "specific" | "value" | "none",
  "status": "pass" | "partial" | "fail",
  "evidence": "One specific sentence naming the actual words you found and why it passes or fails."
}

Rules: emotional = pass, specific = pass, value = partial, none = fail. If multiple types present, return the strongest.`
				}
			],
			temperature: 0,
			max_tokens: 150
		});

		const raw = response.choices[0]?.message?.content?.trim() ?? '{}';
		const parsed = JSON.parse(raw) as { hook_type?: string; status?: string; evidence?: string };

		const status = ['pass', 'partial', 'fail'].includes(parsed.status ?? '')
			? (parsed.status as 'pass' | 'partial' | 'fail')
			: 'fail';

		return {
			status,
			hook_type: parsed.hook_type ?? 'none',
			evidence: parsed.evidence ?? 'Unable to assess above-fold content.'
		};
	} catch {
		return { status: 'fail', hook_type: 'none', evidence: 'Unable to assess above-fold content.' };
	}
}

function checkCTAPresent(bodyText: string): { status: 'pass' | 'fail'; evidence: string } {
	if (hasAnyCTA(bodyText)) {
		return { status: 'pass', evidence: 'Clear CTA present linking to destination.' };
	}
	return {
		status: 'fail',
		evidence:
			'No CTA detected. Add at least one clear call-to-action (link to destination, download, or soft conversion) to guide the reader.'
	};
}

/**
 * Run the 5-item light CRO audit for SEO pages.
 * Now async — attentionHook uses an AI call.
 * Handoff is N/A when destination_url is not provided.
 */
export async function evaluateSEOPageCRO(
	content: ParsedPageContent | null,
	options: {
		destination_url?: string | null;
		funnel_stage: FunnelStage;
	}
): Promise<SEOPageCROResult> {
	const { destination_url, funnel_stage } = options;

	if (!content) {
		return {
			page_type: 'seo_page',
			cro_score: 0,
			max_score: destination_url ? 5 : 4,
			checklist: {
				handoff: {
					status: destination_url ? 'fail' : 'na',
					evidence: 'Could not fetch or parse the page. Audit could not run.'
				},
				ctaFit: { status: 'fail', evidence: 'Could not evaluate — page not loaded.' },
				funnelMismatch: { status: 'fail', evidence: 'Could not evaluate — page not loaded.' },
				attentionHook: {
					status: 'fail',
					hook_type: 'none',
					evidence: 'Could not evaluate — page not loaded.'
				},
				ctaPresent: { status: 'fail', evidence: 'Could not evaluate — page not loaded.' }
			}
		};
	}

	// 1. Destination handoff (N/A if no destination URL)
	let handoff: SEOPageChecklistItem;
	if (destination_url?.trim()) {
		const handoffResult = checkDestinationHandoff(content, destination_url, 400);
		handoff = { status: handoffResult.status, evidence: handoffResult.evidence };
	} else {
		handoff = { status: 'na', evidence: 'No destination URL set — handoff check skipped.' };
	}

	// 2. CTA appropriateness
	const ctaFit = checkCTAFit(content.bodyText, funnel_stage);

	// 3. Funnel mismatch
	const funnelMismatch = checkFunnelMismatch(content.bodyText, funnel_stage);

	// 4. Attention hook — AI assessment (replaces regex emotional hook)
	const hookResult = await checkAttentionHook(content.aboveFoldText);
	// On SEO pages: partial and pass both score as pass.
	// Only fail counts against the score.
	const attentionHook: SEOPageChecklistItem = {
		status: hookResult.status === 'fail' ? 'fail' : 'pass',
		evidence: hookResult.evidence,
		hook_type: hookResult.hook_type
	};

	// 5. CTA presence
	const ctaPresent = checkCTAPresent(content.bodyText);

	const checklist = {
		handoff,
		ctaFit: { status: ctaFit.status, evidence: ctaFit.evidence } as SEOPageChecklistItem,
		funnelMismatch: {
			status: funnelMismatch.status,
			evidence: funnelMismatch.evidence
		} as SEOPageChecklistItem,
		attentionHook,
		ctaPresent: { status: ctaPresent.status, evidence: ctaPresent.evidence } as SEOPageChecklistItem
	};

	// Score: pass = 1, fail = 0, na = excluded from denominator
	// (partial stored internally but maps to pass for SEO pages — see attentionHook above)
	const items = [
		checklist.handoff,
		checklist.ctaFit,
		checklist.funnelMismatch,
		checklist.attentionHook,
		checklist.ctaPresent
	];
	const applicable = items.filter((i) => i.status !== 'na');
	const passed = applicable.filter((i) => i.status === 'pass').length;

	return {
		page_type: 'seo_page',
		cro_score: passed,
		max_score: applicable.length,
		checklist
	};
}
