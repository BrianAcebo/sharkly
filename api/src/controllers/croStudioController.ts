/**
 * CRO Studio — AI fix generation for live page audits.
 * Two prompts: SEO page (light CRO) and destination page (full conversion).
 *
 * Spec: cro-studio.md — AI Fix Generation Prompts
 */

import { Request, Response } from 'express';
import OpenAI from 'openai';
import { supabase } from '../utils/supabaseClient.js';
import { CREDIT_COSTS } from '../utils/credits.js';
import { fetchAndParseURL } from '../utils/fetchAndParseURL.js';
import type { ParsedPageContent } from '../utils/fetchAndParseURL.js';
import type { JourneyStepResult } from '../utils/evaluateOptimalSellingJourney.js';
import type { ArchitectureViolation } from '../utils/detectArchitectureSequence.js';
import { runCROAudit } from '../utils/runCROAudit.js';
import { checkDestinationHandoff } from '../utils/checkDestinationHandoff.js';
import { buildClusterJourneyData } from '../utils/buildClusterJourneyData.js';
import { detectCognitiveLoad } from '../utils/croAuditDetections.js';
import { captureApiError, captureApiWarning } from '../utils/sentryCapture.js';

/** Normalize site.url to a hostname for matching page_url (legacy audits with null site_id). */
function hostnameFromSiteUrl(siteUrl: string | null | undefined): string | null {
	if (!siteUrl?.trim()) return null;
	try {
		const u = new URL(siteUrl.startsWith('http') ? siteUrl.trim() : `https://${siteUrl.trim()}`);
		const h = u.hostname.replace(/^www\./i, '');
		return h || null;
	} catch {
		return null;
	}
}

const GPT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';
const CLAUDE_HAIKU_MODEL = process.env.CLAUDE_HAIKU_MODEL || 'claude-3-haiku-20240307';
const openai = process.env.OPENAI_API_KEY
	? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
	: null;

/** Structured fix option for Generated Fixes Panel */
export interface FixOption {
	copy: string;
	placement: string;
	/** For bias fixes: one sentence explaining the psychological mechanism (cro-studio.md) */
	mechanism?: string;
}

export interface GenerateFixesResponse {
	success: boolean;
	data?: {
		options: FixOption[];
		suggestions?: string; // Fallback raw text if JSON parse fails
	};
	error?: string;
}

async function checkAndDeductCredits(
	orgId: string,
	cost: number
): Promise<{ ok: boolean; error?: string; available?: number }> {
	const { data: org } = await supabase
		.from('organizations')
		.select('included_credits_remaining, included_credits, has_cro_addon')
		.eq('id', orgId)
		.single();

	if (!org?.has_cro_addon) {
		return { ok: false, error: 'CRO Studio add-on required', available: 0 };
	}

	const available = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
	if (available < cost) {
		return { ok: false, error: 'Insufficient credits', available };
	}

	const newCredits = Math.max(0, available - cost);
	await supabase
		.from('organizations')
		.update({
			included_credits_remaining: newCredits,
			...(org?.included_credits != null && { included_credits: newCredits })
		})
		.eq('id', orgId);

	return { ok: true };
}

/** CTA-like phrases for context */
const CTA_PATTERN =
	/add\s+to\s+cart|buy\s+now|order\s+now|get\s+started|sign\s+up|subscribe|checkout|purchase|claim|try\s+free|book\s+now|schedule|learn\s+more|read\s+more|download|get\s+the\s+guide|join/gi;

/** Trust signal patterns */
const TRUST_PATTERNS = [
	/reviews?|ratings?|testimonial|customers?|trusted\s+by|guarantee|money[\s-]back|stars?|★|\d+\+/i
];

/** Urgency patterns */
const URGENCY_PATTERNS = [
	/limited\s+time|today\s+only|ends\s+soon|act\s+now|hurry|last\s+chance|while\s+supplies|expires|deadline|only\s+\d+\s+left/i
];

function detectCTAs(bodyText: string): string[] {
	const matches = bodyText.match(CTA_PATTERN);
	return [...new Set(matches ?? [])].slice(0, 8);
}

function detectTrustSignals(bodyText: string): string[] {
	const found: string[] = [];
	for (const p of TRUST_PATTERNS) {
		const m = bodyText.match(p);
		if (m) found.push(m[0]);
	}
	return [...new Set(found)].slice(0, 8);
}

function detectUrgency(bodyText: string): string[] {
	const found: string[] = [];
	for (const p of URGENCY_PATTERNS) {
		const m = bodyText.match(p);
		if (m) found.push(m[0]);
	}
	return [...new Set(found)].slice(0, 6);
}

function getFirstLinkIn400Words(content: ParsedPageContent): string | null {
	const first = content.links.find((l) => l.wordOffset < 400);
	return first?.href ?? null;
}

interface ParsedFixOption {
	copy: string;
	placement: string;
	mechanism?: string;
}

/** Parse JSON options from LLM response; fallback to raw text */
function parseFixOptions(text: string, includeMechanism = false): FixOption[] {
	try {
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]) as {
				options?: Array<{ copy?: string; placement?: string; mechanism?: string }>;
			};
			if (Array.isArray(parsed.options) && parsed.options.length > 0) {
				return parsed.options.map((o) => {
					const opt: ParsedFixOption = {
						copy: String(o.copy ?? ''),
						placement: String(o.placement ?? '')
					};
					if (includeMechanism && typeof o.mechanism === 'string') {
						opt.mechanism = o.mechanism.trim();
					}
					return opt;
				});
			}
		}
	} catch {
		// Fallback: treat entire response as single suggestion
	}
	const trimmed = text.trim();
	if (trimmed) {
		return [{ copy: trimmed, placement: 'Apply as suggested in the content.' }];
	}
	return [];
}

const SEO_ITEM_LABELS: Record<string, string> = {
	handoff: 'Destination handoff — first link in first 400 words',
	ctaFit: 'CTA commitment level matches funnel stage',
	funnelMismatch: 'No funnel mismatch',
	emotionalHook: 'Emotional hook present above fold',
	ctaPresent: 'At least one CTA present'
};

/**
 * GET /api/cro-studio/audits
 * List CRO audits for the user's organization.
 * Query: page_type (optional) — 'seo_page' | 'destination_page'
 * Query: site_id (optional) — when set, only audits for that site (by cro_audits.site_id, plus legacy rows with null site_id whose page_url matches the site hostname)
 */
export const listCROAudits = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const pageType = req.query.page_type as string | undefined;
		const siteIdParam = typeof req.query.site_id === 'string' ? req.query.site_id.trim() : '';

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg) return res.status(403).json({ error: 'No organization' });

		const { data: org } = await supabase
			.from('organizations')
			.select('has_cro_addon')
			.eq('id', userOrg.organization_id)
			.single();

		if (!org?.has_cro_addon) {
			return res.status(403).json({ error: 'CRO Studio add-on required' });
		}

		const selectCols =
			'id, page_url, page_type, page_label, destination_url, cro_score, max_score, audited_at, checklist, architecture_violations, cluster_id, site_id, updated_at';

		const buildBaseQuery = () => {
			let q = supabase
				.from('cro_audits')
				.select(selectCols)
				.eq('organization_id', userOrg.organization_id)
				.order('updated_at', { ascending: false });

			if (pageType === 'seo_page' || pageType === 'destination_page') {
				q = q.eq('page_type', pageType);
			}
			return q;
		};

		type CroAuditListRow = {
			id: string;
			page_url: string;
			page_type: string;
			page_label: string | null;
			destination_url: string | null;
			cro_score: number | null;
			max_score: number | null;
			audited_at: string | null;
			checklist: unknown;
			architecture_violations: unknown;
			cluster_id: string | null;
			site_id: string | null;
			updated_at: string | null;
		};

		let audits: CroAuditListRow[] | null = null;
		let listError: { message?: string } | null = null;

		if (siteIdParam) {
			const { data: siteRow } = await supabase
				.from('sites')
				.select('id, url')
				.eq('id', siteIdParam)
				.eq('organization_id', userOrg.organization_id)
				.maybeSingle();

			if (!siteRow) {
				return res.status(400).json({ error: 'Invalid site_id' });
			}

			const host = hostnameFromSiteUrl(siteRow.url);
			const qBySite = buildBaseQuery().eq('site_id', siteIdParam);

			const qLegacy =
				host !== null ? buildBaseQuery().is('site_id', null).ilike('page_url', `%${host}%`) : null;

			const [r1, r2] = await Promise.all([
				qBySite,
				qLegacy ?? Promise.resolve({ data: [] as CroAuditListRow[], error: null })
			]);

			if (r1.error) listError = r1.error;
			else if (r2 && 'error' in r2 && r2.error) listError = r2.error as { message?: string };
			else {
				const rows = [...(r1.data ?? []), ...(r2 && 'data' in r2 ? (r2.data ?? []) : [])];
				const byId = new Map<string, CroAuditListRow>();
				for (const row of rows) {
					byId.set(row.id, row as CroAuditListRow);
				}
				audits = Array.from(byId.values()).sort((a, b) => {
					const ta = a.updated_at ? new Date(String(a.updated_at)).getTime() : 0;
					const tb = b.updated_at ? new Date(String(b.updated_at)).getTime() : 0;
					return tb - ta;
				});
			}
		} else {
			const { data, error } = await buildBaseQuery();
			audits = (data ?? null) as CroAuditListRow[] | null;
			listError = error;
		}

		if (listError) {
			console.error('[CRO Studio] List audits error:', listError);
			captureApiError(listError, req, { feature: 'cro-studio-list-audits-query' });
			return res.status(500).json({ error: 'Failed to list audits' });
		}

		// Resolve cluster names for destination pages
		const clusterIds = [
			...(audits ?? []).map((a) => a.cluster_id).filter((id): id is string => !!id)
		];
		const clusterNames: Record<string, string> = {};
		if (clusterIds.length > 0) {
			const { data: clusters } = await supabase
				.from('clusters')
				.select('id, title')
				.in('id', [...new Set(clusterIds)]);
			for (const c of clusters ?? []) {
				clusterNames[c.id] = (c as { title?: string }).title ?? '';
			}
		}

		const items = (audits ?? []).map((a) => {
			const checklist = (a.checklist as Record<string, unknown>) ?? {};
			let issueCount = 0;

			if (a.page_type === 'seo_page') {
				const seo = checklist as Record<string, { status?: string }>;
				for (const v of Object.values(seo)) {
					if (v?.status === 'fail') issueCount++;
				}
			}

			const handoffPass =
				a.page_type === 'seo_page' && (checklist.handoff as { status?: string })?.status === 'pass';

			if (a.page_type === 'destination_page') {
				const journey = (checklist.journey_checklist as Array<{ status?: string }>) ?? [];
				issueCount = journey.filter((s) => s.status === 'fail').length;
				const arch = (a.architecture_violations as unknown[]) ?? [];
				issueCount += arch.length;
			}

			return {
				id: a.id,
				page_url: a.page_url,
				page_type: a.page_type,
				page_label: a.page_label ?? null,
				destination_url: a.destination_url ?? null,
				cro_score: a.cro_score ?? 0,
				max_score: a.max_score ?? (a.page_type === 'seo_page' ? 5 : 10),
				audited_at: a.audited_at,
				issue_count: issueCount,
				cluster_name: a.cluster_id ? (clusterNames[a.cluster_id] ?? null) : null,
				handoff_pass: a.page_type === 'seo_page' ? handoffPass : null
			};
		});

		res.json({ audits: items });
	} catch (error) {
		console.error('[CRO Studio] List audits error:', error);
		captureApiError(error, req, { feature: 'cro-studio-list-audits' });
		res.status(500).json({ error: 'Failed to list audits' });
	}
};

/**
 * GET /api/cro-studio/audits/:id
 * Fetch a single CRO audit by ID.
 */
export const getCROAudit = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const { id } = req.params;
		if (!id) return res.status(400).json({ error: 'audit id required' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg) return res.status(403).json({ error: 'No organization' });

		const { data: org } = await supabase
			.from('organizations')
			.select('has_cro_addon')
			.eq('id', userOrg.organization_id)
			.single();

		if (!org?.has_cro_addon) {
			return res.status(403).json({ error: 'CRO Studio add-on required' });
		}

		const extendedSelect =
			'id, page_url, page_type, page_label, destination_url, cro_score, max_score, audited_at, checklist, architecture_violations, bias_inventory, bias_coherence, headline_insight, above_fold, objection_coverage, cognitive_load, cognitive_load_explanation, emotional_arc_result, page_subtype, cluster_id, audit_error, audit_error_message, faq_result, testimonial_result';
		const baseSelect =
			'id, page_url, page_type, page_label, destination_url, cro_score, max_score, audited_at, checklist, architecture_violations, bias_inventory, bias_coherence, page_subtype, cluster_id, audit_error, audit_error_message';

		let { data: audit, error } = await supabase
			.from('cro_audits')
			.select(extendedSelect)
			.eq('id', id)
			.eq('organization_id', userOrg.organization_id)
			.single();

		// Fallback if extended columns don't exist yet (migration not run)
		if (error) {
			const fallback = await supabase
				.from('cro_audits')
				.select(baseSelect)
				.eq('id', id)
				.eq('organization_id', userOrg.organization_id)
				.single();
			audit = fallback.data
				? {
						...fallback.data,
						headline_insight: null,
						above_fold: null,
						objection_coverage: null,
						cognitive_load: null,
						cognitive_load_explanation: null,
						emotional_arc_result: null,
						faq_result: null,
						testimonial_result: null
					}
				: null;
			error = fallback.error;
		}

		if (error || !audit) return res.status(404).json({ error: 'Audit not found' });

		let cluster_name: string | null = null;
		let cluster_journey: Awaited<ReturnType<typeof buildClusterJourneyData>> = null;
		if (audit.cluster_id) {
			const { data: cluster } = await supabase
				.from('clusters')
				.select('id, title')
				.eq('id', audit.cluster_id)
				.single();
			cluster_name = cluster?.title ?? null;
			if (audit.page_type === 'destination_page') {
				cluster_journey = await buildClusterJourneyData(
					supabase,
					audit.cluster_id,
					userOrg.organization_id
				);
			}
		}

		res.json({
			id: audit.id,
			page_url: audit.page_url,
			page_type: audit.page_type,
			page_label: audit.page_label ?? null,
			destination_url: audit.destination_url ?? null,
			cro_score: audit.cro_score ?? 0,
			max_score: audit.max_score ?? (audit.page_type === 'seo_page' ? 5 : 11),
			audited_at: audit.audited_at,
			checklist: audit.checklist ?? {},
			architecture_violations: audit.architecture_violations ?? null,
			bias_inventory: audit.bias_inventory ?? null,
			bias_coherence: audit.bias_coherence ?? null,
			headline_insight: audit.headline_insight ?? null,
			above_fold: audit.above_fold ?? null,
			objection_coverage: audit.objection_coverage ?? null,
			cognitive_load: audit.cognitive_load ?? null,
			cognitive_load_explanation: audit.cognitive_load_explanation ?? null,
			emotional_arc_result: audit.emotional_arc_result ?? null,
			page_subtype: audit.page_subtype ?? null,
			cluster_name,
			cluster_journey,
			audit_error: audit.audit_error ?? false,
			audit_error_message: audit.audit_error_message ?? null,
			faq_result: audit.faq_result ?? null,
			testimonial_result: audit.testimonial_result ?? null
		});
	} catch (error) {
		console.error('[CRO Studio] Get audit error:', error);
		captureApiError(error, req, { feature: 'cro-studio-get-audit', auditId: req.params.id });
		res.status(500).json({ error: 'Failed to fetch audit' });
	}
};

/**
 * POST /api/cro-studio/audits/:id/reaudit
 * Re-run the CRO audit (1 credit). Updates the existing record.
 */
export const reauditCROAudit = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const { id } = req.params;
		if (!id) return res.status(400).json({ error: 'audit id required' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg) return res.status(403).json({ error: 'No organization' });

		const { data: org } = await supabase
			.from('organizations')
			.select('has_cro_addon')
			.eq('id', userOrg.organization_id)
			.single();

		if (!org?.has_cro_addon) {
			return res.status(403).json({ error: 'CRO Studio add-on required' });
		}

		const { data: audit, error: fetchErr } = await supabase
			.from('cro_audits')
			.select('id, page_url, page_type, destination_url, page_label, page_subtype')
			.eq('id', id)
			.eq('organization_id', userOrg.organization_id)
			.single();

		if (fetchErr || !audit) return res.status(404).json({ error: 'Audit not found' });

		const cost = CREDIT_COSTS.CRO_STUDIO_AUDIT ?? 1;
		const creditCheck = await checkAndDeductCredits(userOrg.organization_id, cost);
		if (!creditCheck.ok) {
			return res.status(402).json({
				error: creditCheck.error,
				required: cost,
				available: creditCheck.available
			});
		}

		const result = await runCROAudit({
			page_url: audit.page_url,
			page_type: audit.page_type,
			destination_url: audit.page_type === 'seo_page' ? audit.destination_url : null,
			page_label: audit.page_label,
			page_subtype:
				audit.page_type === 'destination_page' ? (audit.page_subtype ?? 'saas_signup') : undefined
		});

		const { error: updateErr } = await supabase
			.from('cro_audits')
			.update({
				cro_score: result.cro_score,
				max_score: result.max_score,
				checklist: result.checklist,
				architecture_violations: result.architecture_violations,
				bias_inventory: result.bias_inventory,
				bias_coherence: result.bias_coherence,
				headline_insight: result.headline_insight,
				above_fold: result.above_fold,
				objection_coverage: result.objection_coverage,
				cognitive_load: result.cognitive_load,
				audited_at: result.audited_at,
				audit_error: result.audit_error,
				audit_error_message: result.audit_error_message,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);

		if (updateErr) {
			console.error('[CRO Studio] Reaudit update error:', updateErr);
			captureApiError(updateErr, req, { feature: 'cro-studio-reaudit-update', auditId: id });
			return res.status(500).json({ error: 'Failed to update audit' });
		}

		res.json({ success: true });
	} catch (error) {
		console.error('[CRO Studio] Reaudit error:', error);
		captureApiError(error, req, { feature: 'cro-studio-reaudit', auditId: req.params.id });
		res.status(500).json({ error: 'Failed to re-audit' });
	}
};

/** Heuristic: page looks like destination (short + conversion-focused) vs SEO (long-form) */
function looksLikeDestination(content: ParsedPageContent): boolean {
	const words = content.bodyText.split(/\s+/).filter(Boolean).length;
	if (words >= 400) return false; // Long-form = likely SEO
	const ctaCount = (content.bodyText.match(CTA_PATTERN) ?? []).length;
	return ctaCount >= 2 || words < 200;
}

/**
 * POST /api/cro-studio/audits
 * Add a page and run CRO audit (1 credit).
 * Body: { page_url, page_type, destination_url?, page_label?, confirm_might_be_destination? }
 */
export const addCROAudit = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const {
			page_url,
			page_type,
			destination_url,
			page_label,
			page_subtype,
			confirm_might_be_destination,
			cluster_id,
			site_id
		} = req.body as {
			page_url?: string;
			page_type?: 'seo_page' | 'destination_page';
			destination_url?: string | null;
			page_label?: string | null;
			page_subtype?: 'saas_signup' | 'ecommerce_product' | 'service_booking' | null;
			confirm_might_be_destination?: boolean;
			cluster_id?: string | null;
			site_id?: string | null;
		};

		if (!page_url?.trim()) return res.status(400).json({ error: 'page_url required' });
		if (page_type !== 'seo_page' && page_type !== 'destination_page') {
			return res.status(400).json({ error: 'page_type must be seo_page or destination_page' });
		}
		if (page_type === 'seo_page' && !destination_url?.trim()) {
			// destination_url optional for SEO - handoff check will be N/A
		}

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg) return res.status(403).json({ error: 'No organization' });

		const { data: org } = await supabase
			.from('organizations')
			.select('has_cro_addon')
			.eq('id', userOrg.organization_id)
			.single();

		if (!org?.has_cro_addon) {
			return res.status(403).json({ error: 'CRO Studio add-on required' });
		}

		const content = await fetchAndParseURL(page_url.trim());
		if (!content) {
			return res.status(400).json({
				error: 'Could not fetch the page. The URL may be unreachable or invalid.'
			});
		}

		// Validation: declared SEO but looks like destination — confirm
		if (
			page_type === 'seo_page' &&
			!confirm_might_be_destination &&
			looksLikeDestination(content)
		) {
			return res.status(400).json({
				needs_confirmation: true,
				code: 'might_be_destination',
				message:
					'This looks like it might be a destination page (short, conversion-focused). Confirm your selection if you meant to add it as an SEO page.'
			});
		}

		// Validation: SEO + destination URL — check handoff, flag if fail
		let handoffWarning: string | null = null;
		if (page_type === 'seo_page' && destination_url?.trim()) {
			const handoff = checkDestinationHandoff(content, destination_url.trim(), 400);
			if (handoff.status === 'fail') {
				handoffWarning = handoff.evidence;
			}
		}

		const cost = CREDIT_COSTS.CRO_STUDIO_AUDIT ?? 1;
		const creditCheck = await checkAndDeductCredits(userOrg.organization_id, cost);
		if (!creditCheck.ok) {
			return res.status(402).json({
				error: creditCheck.error,
				required: cost,
				available: creditCheck.available
			});
		}

		const result = await runCROAudit({
			page_url: page_url.trim(),
			page_type,
			destination_url: page_type === 'seo_page' ? (destination_url?.trim() ?? null) : null,
			page_label: page_label?.trim() || null,
			page_subtype: page_type === 'destination_page' ? (page_subtype ?? 'saas_signup') : undefined
		});

		const insertPayload: Record<string, unknown> = {
			organization_id: userOrg.organization_id,
			page_url: page_url.trim(),
			page_type,
			page_label: page_label?.trim() || null,
			destination_url: page_type === 'seo_page' ? destination_url?.trim() || null : null,
			cro_score: result.cro_score,
			max_score: result.max_score,
			checklist: result.checklist,
			architecture_violations: result.architecture_violations,
			bias_inventory: result.bias_inventory,
			bias_coherence: result.bias_coherence,
			headline_insight: result.headline_insight,
			above_fold: result.above_fold,
			objection_coverage: result.objection_coverage,
			cognitive_load: result.cognitive_load,
			page_subtype: page_type === 'destination_page' ? (page_subtype ?? 'saas_signup') : null,
			audited_at: result.audited_at,
			audit_error: result.audit_error,
			audit_error_message: result.audit_error_message
		};
		if (cluster_id) insertPayload.cluster_id = cluster_id;
		if (site_id) insertPayload.site_id = site_id;

		const { data: inserted, error: insertErr } = await supabase
			.from('cro_audits')
			.insert(insertPayload)
			.select('id')
			.single();

		if (insertErr || !inserted) {
			console.error('[CRO Studio] Insert audit error:', insertErr);
			if (insertErr) captureApiError(insertErr, req, { feature: 'cro-studio-add-audit-insert' });
			else captureApiError(new Error('insert returned no row'), req, { feature: 'cro-studio-add-audit-insert' });
			return res.status(500).json({ error: 'Failed to save audit' });
		}

		res.status(201).json({ success: true, audit_id: inserted.id });
	} catch (error) {
		console.error('[CRO Studio] Add audit error:', error);
		captureApiError(error, req, { feature: 'cro-studio-add-audit' });
		res.status(500).json({ error: 'Failed to add page' });
	}
};

/**
 * POST /api/cro-studio/fixes
 * Generate AI copy fixes for failing CRO audit items.
 * Body: { audit_id: string; mode: 'single' | 'all'; failing_item_key?: string }
 */
export const generateCROStudioFixes = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const {
			audit_id,
			mode = 'single',
			failing_item_key
		} = req.body as {
			audit_id?: string;
			mode?: 'single' | 'all';
			failing_item_key?: string;
		};

		if (!audit_id) return res.status(400).json({ error: 'audit_id required' });
		if (mode === 'single' && !failing_item_key) {
			return res.status(400).json({ error: 'failing_item_key required for single fix' });
		}

		// Load audit + verify org access + has_cro_addon
		const { data: audit, error: auditErr } = await supabase
			.from('cro_audits')
			.select(
				'id, organization_id, page_url, page_type, page_label, destination_url, checklist, architecture_violations, bias_inventory, cluster_id, site_id'
			)
			.eq('id', audit_id)
			.single();

		if (auditErr || !audit) return res.status(404).json({ error: 'Audit not found' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== audit.organization_id) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const { data: org } = await supabase
			.from('organizations')
			.select('has_cro_addon')
			.eq('id', audit.organization_id)
			.single();

		if (!org?.has_cro_addon) {
			return res.status(403).json({
				error: 'CRO Studio add-on required. Add CRO Studio ($29/mo) to generate fixes.'
			});
		}

		const cost =
			audit.page_type === 'seo_page'
				? mode === 'all'
					? CREDIT_COSTS.CRO_STUDIO_ALL_FIXES_SEO
					: CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX
				: mode === 'all'
					? CREDIT_COSTS.CRO_STUDIO_ALL_FIXES_DEST
					: CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX;

		const creditCheck = await checkAndDeductCredits(audit.organization_id, cost);
		if (!creditCheck.ok) {
			return res.status(402).json({
				error: creditCheck.error,
				required: cost,
				available: creditCheck.available
			});
		}

		const content = await fetchAndParseURL(audit.page_url);
		if (!content) {
			return res.status(400).json({
				error: 'Could not fetch the page. The URL may be unreachable — try re-auditing.'
			});
		}

		const checklist = (audit.checklist as Record<string, unknown>) ?? {};
		let failingItems: Array<{ key: string; label: string; evidence: string }> = [];

		if (audit.page_type === 'seo_page') {
			const seoChecklist = checklist as Record<string, { status?: string; evidence?: string }>;
			for (const [key, item] of Object.entries(seoChecklist)) {
				if (item?.status === 'fail') {
					failingItems.push({
						key,
						label: SEO_ITEM_LABELS[key] ?? key,
						evidence: item.evidence ?? ''
					});
				}
			}
			if (mode === 'single' && failing_item_key) {
				failingItems = failingItems.filter((f) => f.key === failing_item_key);
			}
		} else {
			// Architecture violations first (arch_0, arch_1, ...)
			const archViolations =
				(audit.architecture_violations as Array<{
					message: string;
					suggestion: string;
					evidence?: string;
				}>) ?? [];
			archViolations.forEach((v, i) => {
				failingItems.push({
					key: `arch_${i}`,
					label: `Page structure: ${v.message}`,
					evidence: v.suggestion + (v.evidence ? ` (${v.evidence})` : '')
				});
			});
			// Journey steps
			const journey = (checklist.journey_checklist as JourneyStepResult[]) ?? [];
			for (const step of journey) {
				if (step.status === 'fail') {
					failingItems.push({
						key: String(step.step),
						label: `Step ${step.step}: ${step.name}`,
						evidence: step.evidence ?? ''
					});
				}
			}
			// Missing biases (persuasion signals) — cro-studio.md Build Order #19
			const biasInventory =
				(audit.bias_inventory as Array<{
					bias_id: string;
					label: string;
					present: boolean;
					evidence?: string;
				}>) ?? [];
			for (const b of biasInventory) {
				if (!b.present) {
					failingItems.push({
						key: `bias_${b.bias_id}`,
						label: b.label,
						evidence: b.evidence ?? 'Not detected on page'
					});
				}
			}
			if (mode === 'single' && failing_item_key) {
				failingItems = failingItems.filter((f) => f.key === failing_item_key);
			}
		}

		if (failingItems.length === 0) {
			return res.status(400).json({
				error: 'No failing items to fix. All audit items pass.'
			});
		}

		const isBiasFix =
			audit.page_type === 'destination_page' &&
			failingItems.length === 1 &&
			failingItems[0].key.startsWith('bias_');

		const ctas = detectCTAs(content.bodyText);
		const trustSignals = detectTrustSignals(content.bodyText);
		const urgencySignals = detectUrgency(content.bodyText);
		const firstLink = getFirstLinkIn400Words(content);

		let systemPrompt: string;
		let userPrompt: string;

		if (audit.page_type === 'seo_page') {
			const funnelStage = (audit.checklist as { funnel_stage?: string })?.funnel_stage ?? 'mofu';
			const pageTypeLabel =
				funnelStage === 'tofu'
					? 'ToFu article'
					: funnelStage === 'mofu'
						? 'MoFu comparison'
						: 'Focus page';

			const failingBlock = failingItems.map((f) => `• ${f.label}: ${f.evidence}`).join('\n');

			systemPrompt = `You are a conversion rate optimization expert. You are writing copy fixes for an SEO page — a page whose PRIMARY job is to rank in Google, not to convert. Every fix you suggest MUST preserve the page's ranking potential. Never suggest shortening content, removing keyword mentions, or adding high-commitment sales language. Your fixes improve conversion without compromising SEO. Write in plain English. Give exact copy — not generic advice.`;
			userPrompt = `Page type: ${pageTypeLabel}
Page URL: ${audit.page_url}
Destination page: ${audit.destination_url ?? '(not set)'}
Funnel stage: ${funnelStage}

Failing CRO items:
${failingBlock}

Current detected CTAs: ${ctas.join(', ') || '(none)'}
First link in first 400 words: ${firstLink ?? '(none)'}${audit.destination_url ? ` (expected: ${audit.destination_url})` : ''}

RULES:
- For ToFu: suggest soft CTAs only (lead magnets, guides, email opt-ins)
- For MoFu: suggest medium-commitment CTAs (free assessment, demo, no-obligation call)
- For BoFu / focus pages: suggest destination page link placement + medium CTAs
- Never suggest "Book Now", "Buy Now" or purchase pressure on any SEO page
- For the destination handoff fix: write the exact anchor text and sentence context for placing the first in-body link

For each failing item (or the single item requested): state what is missing, give the exact copy or structural change, write the actual words, include placement instruction.

Respond with a JSON object: { "options": [ { "copy": "exact copy to add", "placement": "where to place it" }, ... ] }
Provide 2-3 options per fix. Each option must have "copy" and "placement" keys.`;
		} else {
			// Destination page — may be journey/arch fix OR bias (persuasion signal) fix (isBiasFix from outer scope)
			let businessName = 'Business';
			let niche = '';
			let customerDesc = '';
			let clusterName = '';

			if (audit.site_id) {
				const { data: site } = await supabase
					.from('sites')
					.select('name, niche, customer_description')
					.eq('id', audit.site_id)
					.single();
				if (site) {
					businessName = site.name ?? businessName;
					niche = site.niche ?? '';
					customerDesc = site.customer_description ?? '';
				}
			}
			if (audit.cluster_id) {
				const { data: cluster } = await supabase
					.from('clusters')
					.select('name')
					.eq('id', audit.cluster_id)
					.single();
				if (cluster) clusterName = cluster.name ?? '';
			}

			if (isBiasFix) {
				const bias = failingItems[0];
				systemPrompt = `You are a conversion rate optimization expert. You are writing copy fixes for a MISSING persuasion signal (cognitive bias) on a destination page. The bias "${bias.label}" is not currently on the page. Your job: give 2-3 specific copy options that would add this signal, with exact placement. For EACH option you must also include a "mechanism" key — one sentence explaining the psychological mechanism ("This works because..."). Example: "This works because the brain defaults to the first number it sees — the anchor makes your actual price feel like a discount."`;
				userPrompt = `Page URL: ${audit.page_url}
Business: ${businessName} — ${niche}
Connected cluster: ${clusterName}
Target customer: ${customerDesc}

Missing persuasion signal: ${bias.label}
What was detected: ${bias.evidence}

Current H1: ${content.h1 ?? '(none)'}
Current CTAs detected: ${ctas.join(', ') || '(none)'}
Trust signals: ${trustSignals.join(', ') || '(none)'}
Urgency signals: ${urgencySignals.join(', ') || '(none)'}

Give 2-3 copy options. Each must have:
- copy: exact words to add
- placement: where to place it (e.g. "Directly above the primary CTA button")
- mechanism: one sentence on why this works psychologically ("This works because...")

Respond with JSON: { "options": [ { "copy": "...", "placement": "...", "mechanism": "This works because..." }, ... ] }`;
			} else {
				const failingBlock = failingItems
					.map(
						(f) =>
							`• ${f.key}: ${f.label}\n  What was detected/missing: ${f.evidence}\n  Why it matters at this stage`
					)
					.join('\n\n');

				systemPrompt = `You are a conversion rate optimization expert. You are writing copy fixes for a destination page — a page whose ONLY job is to convert visitors. This page does not need to rank. It inherits traffic from an SEO page. Apply the full Optimal Selling Journey: Emotional engagement first → Logical justification → Emotional close. The brain buys emotionally and justifies logically. Write in plain English. Give exact copy. Maximum 3 options per fix.`;
				userPrompt = `Page URL: ${audit.page_url}
Business: ${businessName} — ${niche}
Connected cluster: ${clusterName}
Target customer: ${customerDesc}
Funnel stage: BoFu — this visitor was sent from a comparison/category page

Failing items:
${failingBlock}

Current H1: ${content.h1 ?? '(none)'}
Current CTAs detected: ${ctas.join(', ') || '(none)'}
Trust signals detected: ${trustSignals.join(', ') || '(none)'}
Urgency signals detected: ${urgencySignals.join(', ') || '(none)'}
Social proof detected: ${trustSignals.join(', ') || '(none)'}

JOURNEY RULES:
- Steps 1-5 (Emotional): Engage old brain. Hook, trust, problem, solution. Never use logic here.
- Steps 6-7 (Logical): Justify the decision. Features, proof, evidence.
- Steps 8-10 (Emotional close): Incentive, urgency, frictionless action.

For each failing item: state what is missing, give the exact copy with actual words, include precise placement instruction.

Respond with a JSON object: { "options": [ { "copy": "exact copy to add", "placement": "where to place it (e.g. Place directly above the CTA button)" }, ... ] }
Provide 2-3 options. Each option must have "copy" and "placement" keys.`;
			}
		}

		if (!openai) {
			captureApiWarning('CRO fixes: OpenAI client not configured', req, { feature: 'cro-studio-fixes-no-openai' });
			return res.status(500).json({ error: 'CRO fixes service not configured' });
		}

		const completion = await openai.chat.completions.create({
			model: GPT_MODEL,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt }
			],
			max_tokens: 1200
		});

		const rawText =
			completion.choices[0]?.message?.content?.trim() ??
			'Sorry, no suggestions could be generated.';

		const options = parseFixOptions(rawText, isBiasFix);

		res.json({
			success: true,
			data: {
				options,
				...(options.length === 0 && { suggestions: rawText })
			}
		});
	} catch (error) {
		console.error('[CRO Studio] Fix generation error:', error);
		captureApiError(error, req, { feature: 'cro-studio-generate-fixes' });
		res.status(500).json({ error: 'Failed to generate CRO fixes' });
	}
};

/** Helper: load audit, verify org access and page_type destination_page */
async function loadDestinationAuditForGeneration(
	req: Request,
	res: Response,
	id: string
): Promise<{
	audit: {
		id: string;
		organization_id: string;
		page_url: string;
		page_label?: string | null;
		site_id?: string | null;
		cluster_id?: string | null;
	};
	content: ParsedPageContent;
} | null> {
	const userId = req.user?.id;
	if (!userId) {
		res.status(401).json({ error: 'Unauthorized' });
		return null;
	}

	const { data: audit, error: auditErr } = await supabase
		.from('cro_audits')
		.select('id, organization_id, page_url, page_label, site_id, cluster_id, page_type')
		.eq('id', id)
		.single();

	if (auditErr || !audit) {
		res.status(404).json({ error: 'Audit not found' });
		return null;
	}

	if (audit.page_type !== 'destination_page') {
		res.status(400).json({
			error: 'FAQ and testimonial generation are only available for destination page audits'
		});
		return null;
	}

	const { data: userOrg } = await supabase
		.from('user_organizations')
		.select('organization_id')
		.eq('user_id', userId)
		.maybeSingle();

	if (!userOrg || userOrg.organization_id !== audit.organization_id) {
		res.status(403).json({ error: 'Access denied' });
		return null;
	}

	const { data: org } = await supabase
		.from('organizations')
		.select('has_cro_addon')
		.eq('id', audit.organization_id)
		.single();

	if (!org?.has_cro_addon) {
		res.status(403).json({ error: 'CRO Studio add-on required' });
		return null;
	}

	const content = await fetchAndParseURL(audit.page_url);
	if (!content) {
		res.status(400).json({ error: 'Could not fetch the page. The URL may be unreachable.' });
		return null;
	}

	return { audit, content };
}

/** Helper: load any audit + content for cognitive-load / emotional-arc (any page type) */
async function loadAuditForGeneration(
	req: Request,
	res: Response,
	id: string
): Promise<{
	audit: {
		id: string;
		organization_id: string;
		page_url: string;
		page_label?: string | null;
		site_id?: string | null;
		cognitive_load?: Record<string, unknown> | null;
		page_subtype?: string | null;
	};
	content: ParsedPageContent;
} | null> {
	const userId = req.user?.id;
	if (!userId) {
		res.status(401).json({ error: 'Unauthorized' });
		return null;
	}

	const { data: audit, error: auditErr } = await supabase
		.from('cro_audits')
		.select('id, organization_id, page_url, page_label, site_id, cognitive_load, page_subtype')
		.eq('id', id)
		.single();

	if (auditErr || !audit) {
		res.status(404).json({ error: 'Audit not found' });
		return null;
	}

	const { data: userOrg } = await supabase
		.from('user_organizations')
		.select('organization_id')
		.eq('user_id', userId)
		.maybeSingle();

	if (!userOrg || userOrg.organization_id !== audit.organization_id) {
		res.status(403).json({ error: 'Access denied' });
		return null;
	}

	const { data: org } = await supabase
		.from('organizations')
		.select('has_cro_addon')
		.eq('id', audit.organization_id)
		.single();

	if (!org?.has_cro_addon) {
		res.status(403).json({ error: 'CRO Studio add-on required' });
		return null;
	}

	const content = await fetchAndParseURL(audit.page_url);
	if (!content) {
		res.status(400).json({ error: 'Could not fetch the page. The URL may be unreachable.' });
		return null;
	}

	return { audit, content };
}

/**
 * POST /api/cro-studio/audits/:id/cognitive-load
 * Generate plain-English explanation of cognitive load signals (1 credit).
 */
export const generateCognitiveLoadExplanation = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ error: 'audit id required' });

		const result = await loadAuditForGeneration(req, res, id);
		if (!result) return;

		const { audit, content } = result;
		const cost = CREDIT_COSTS.CRO_STUDIO_SINGLE_FIX ?? 1;
		const creditCheck = await checkAndDeductCredits(audit.organization_id, cost);
		if (!creditCheck.ok) {
			return res.status(402).json({
				error: creditCheck.error,
				required: cost,
				available: creditCheck.available
			});
		}

		// Always re-detect from live content — never trust stored text arrays.
		// Stored arrays may have been captured before the H1-only fix was applied,
		// meaning they can contain H2/H3 navigation/cart fragments (e.g. "Cart",
		// "Subtotal", "Your cart is empty") which cause the AI to hallucinate
		// "competing headlines" that don't exist on the real page.
		const metrics = detectCognitiveLoad(content);
		const competing_headline_texts = metrics.competing_headline_texts;

		// Filter noise CTAs — UI chrome, auth links, cart state labels, and
		// off-canvas triggers that are in the DOM but not visible page CTAs.
		// These cause the AI to hallucinate "competing CTAs" that don't exist.
		const CTA_NOISE = new RegExp(
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
					// Shopify accordion headings — collapsible triggers, not CTAs
					'how to use',
					'shipping & returns',
					'shipping and returns',
					'ingredients',
					'directions',
					'faq',
					'details',
					'description',
					'questions',
					// Shopify gallery navigation controls
					'load image',
					'slide left',
					'slide right',
					// Navigation / scroll chrome
					'continue shopping',
					'scroll to top',
					'load more',
					'view all',
					'view full details',
					'see all',
					// Availability / form chrome
					'refresh',
					'check availability',
					'dream now',
					'submit',
					'subscribe now'
				].join('|') +
				')$',
			'i'
		);
		const cta_texts_above_fold = metrics.cta_texts_above_fold
			.filter((t) => {
				const clean = t.replace(/^"|"$/g, '').trim();
				return clean.length > 2 && !CTA_NOISE.test(clean);
			})
			.slice(0, 6);

		if (!openai) {
			captureApiWarning('CRO cognitive load: OpenAI not configured', req, {
				feature: 'cro-studio-cognitive-load-no-openai',
				auditId: id
			});
			return res.status(500).json({ error: 'CRO cognitive load service not configured' });
		}

		const headlinesList = competing_headline_texts.length
			? competing_headline_texts.map((t) => `  - ${t}`).join('\n')
			: '  (none detected)';
		const ctasList = cta_texts_above_fold.length
			? cta_texts_above_fold.map((t) => `  - ${t}`).join('\n')
			: '  (none detected)';

		const completion = await openai.chat.completions.create({
			model: GPT_MODEL,
			messages: [
				{
					role: 'system',
					content: `You are a CRO expert reviewing a page for cognitive overload.
Be specific — name the actual elements you were given. Never give generic advice.
Write like you're talking to a small business owner who is not technical.
Max 3 short paragraphs. Plain English only.
DO NOT say "use visuals to break up text" or any other generic UX advice.
DO NOT mention things that weren't in the detected elements above.

CRITICAL RULES FOR ACCURACY:
- The detected CTAs come from a DOM scan, not a screenshot. Some may be UI controls, not visible conversion buttons.
- On an ecommerce product page, the primary visible CTA is almost always "Add to cart". If that is the only or main one above the fold, the page is NOT overloaded.
- Accordion section titles ("How to Use", "Our Standard", "Shipping & Returns") are collapsible content panels — they are NOT competing CTAs. Never describe them as CTAs.
- Slider navigation arrows, close buttons, and form submit labels are UI chrome — not competing CTAs.
- Only flag cognitive overload if there are genuinely 3+ distinct conversion actions competing for attention at the same time (e.g., "Add to cart" AND "Subscribe" AND "Book a call" all equally prominent above the fold).
- If the CTA list above fold shows only 1 or 2 real conversion actions, say the page load is normal and explain what IS working well.`
				},
				{
					role: 'user',
					content: `Page URL: ${audit.page_url}
Page subtype: ${audit.page_subtype ?? 'unknown'}

DETECTED ABOVE THE FOLD:

Competing headlines (${metrics.competing_headlines} found):
${headlinesList}

CTAs above fold (${metrics.cta_count_above_fold} found):
${ctasList}

Total distinct CTAs across whole page: ${metrics.choice_count}

YOUR JOB:
1. Explain specifically what is causing the overload — name the actual headlines/CTAs above. Tell the user what a visitor sees when they land and why it's confusing.
2. Tell them the single most important thing to remove or simplify.
3. Give one specific rewrite if relevant — actual words, not generic advice.`
				}
			],
			max_tokens: 600
		});

		const explanation =
			completion.choices[0]?.message?.content?.trim() ??
			'Unable to generate cognitive load explanation.';

		await supabase
			.from('cro_audits')
			.update({ cognitive_load_explanation: explanation })
			.eq('id', id)
			.eq('organization_id', audit.organization_id);

		res.json({ success: true, explanation });
	} catch (error) {
		console.error('[CRO Studio] Cognitive load explanation error:', error);
		captureApiError(error, req, { feature: 'cro-studio-cognitive-load', auditId: req.params.id });
		res.status(500).json({ error: 'Failed to generate cognitive load explanation' });
	}
};

/**
 * POST /api/cro-studio/audits/:id/emotional-arc
 * Analyse emotional arc of page (3 credits). Uses Claude Haiku.
 */
export const generateEmotionalArcAnalysis = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ error: 'audit id required' });

		const result = await loadAuditForGeneration(req, res, id);
		if (!result) return;

		const { audit, content } = result;
		const cost = CREDIT_COSTS.CRO_STUDIO_EMOTIONAL_ARC ?? 3;
		const creditCheck = await checkAndDeductCredits(audit.organization_id, cost);
		if (!creditCheck.ok) {
			return res.status(402).json({
				error: creditCheck.error,
				required: cost,
				available: creditCheck.available
			});
		}

		const bodyText = content.bodyText.slice(0, 18000); // ~3000 words at ~6 chars/word
		const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
		const model = process.env.CLAUDE_HAIKU_MODEL || 'claude-3-haiku-20240307';
		if (!apiKey) {
			captureApiWarning('CRO emotional arc: Anthropic API key not configured', req, {
				feature: 'cro-studio-emotional-arc-no-api-key',
				auditId: id
			});
			return res.status(500).json({ error: 'Emotional arc analysis service not configured' });
		}

		const resApi = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model,
				max_tokens: 1500,
				system:
					'You are a senior conversion copywriter. Analyse the emotional arc of this page. The optimal arc is: Hook (curiosity/desire/fear) → Build (hope/possibility) → Validate (logic/proof) → Close (urgency/relief). Write in plain English. No jargon. Be specific about what you find.',
				messages: [
					{
						role: 'user',
						content: `Page URL: ${audit.page_url}\n\nPage content (body only, nav/header/footer stripped):\n\n${bodyText}\n\nProvide three sections:\n1. ARC DIAGNOSIS (2-3 sentences): Where does the emotional momentum break down? Name the specific section.\n2. TONE MAP: Rate each major section of the page as High / Medium / Low emotional intensity. One line per section.\n3. REWRITE GUIDANCE (2-3 specific suggestions): For the sections where tone drops, give exact guidance on restoring emotional continuity without changing the information content.`
					}
				]
			})
		});

		if (!resApi.ok) {
			const errText = await resApi.text();
			console.error(
				'[CRO Studio] Emotional arc Claude error:',
				resApi.status,
				errText.slice(0, 200)
			);
			captureApiError(new Error(`Anthropic HTTP ${resApi.status}`), req, {
				feature: 'cro-studio-emotional-arc-api',
				auditId: id,
				bodyPreview: errText.slice(0, 200)
			});
			return res.status(500).json({ error: 'Failed to generate emotional arc analysis' });
		}

		const json = (await resApi.json()) as {
			content?: Array<{ type: string; text?: string }>;
		};
		const analysis =
			json.content?.find((c) => c.type === 'text')?.text?.trim() ??
			'Unable to generate emotional arc analysis.';

		await supabase
			.from('cro_audits')
			.update({ emotional_arc_result: analysis })
			.eq('id', id)
			.eq('organization_id', audit.organization_id);

		res.json({ success: true, analysis });
	} catch (error) {
		console.error('[CRO Studio] Emotional arc analysis error:', error);
		captureApiError(error, req, { feature: 'cro-studio-emotional-arc', auditId: req.params.id });
		res.status(500).json({ error: 'Failed to generate emotional arc analysis' });
	}
};

/**
 * POST /api/cro-studio/audits/:id/faq
 * Generate 5 Q&A FAQs for a destination page (2 credits).
 */
export const generateCROStudioFAQ = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ error: 'audit id required' });

		const result = await loadDestinationAuditForGeneration(req, res, id);
		if (!result) return;

		const { audit, content } = result;
		const cost = CREDIT_COSTS.CRO_STUDIO_FAQ ?? 2;
		const creditCheck = await checkAndDeductCredits(audit.organization_id, cost);
		if (!creditCheck.ok) {
			return res.status(402).json({
				error: creditCheck.error,
				required: cost,
				available: creditCheck.available
			});
		}

		let businessName = 'Business';
		let niche = '';
		if (audit.site_id) {
			const { data: site } = await supabase
				.from('sites')
				.select('name, niche')
				.eq('id', audit.site_id)
				.single();
			if (site) {
				businessName = site.name ?? businessName;
				niche = site.niche ?? '';
			}
		}

		if (!openai) {
			captureApiWarning('CRO FAQ: OpenAI not configured', req, { feature: 'cro-studio-faq-no-openai', auditId: id });
			return res.status(500).json({ error: 'CRO FAQ service not configured' });
		}

		const completion = await openai.chat.completions.create({
			model: GPT_MODEL,
			messages: [
				{
					role: 'system',
					content:
						'You are a conversion copywriter. Generate exactly 5 FAQ Q&A pairs for a destination (conversion) page. Each FAQ should address real objections or questions a visitor might have. Answers should be concise (2–4 sentences), supportive, and conversion-oriented. Output only valid JSON.'
				},
				{
					role: 'user',
					content: `Page URL: ${audit.page_url}
Page label: ${audit.page_label ?? '(none)'}
Business: ${businessName} — ${niche}
H1: ${content.h1 ?? '(none)'}
Page content (first 2000 chars): ${content.bodyText.slice(0, 2000)}

Return JSON: { "questions": [ { "q": "Question text", "a": "Answer text" }, ... ] }
Exactly 5 items.`
				}
			],
			max_tokens: 1000
		});

		const rawText = completion.choices[0]?.message?.content?.trim() ?? '{}';
		let questions: Array<{ q: string; a: string }> = [];
		try {
			const jsonMatch = rawText.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]) as {
					questions?: Array<{ q?: string; a?: string }>;
				};
				if (Array.isArray(parsed.questions)) {
					questions = parsed.questions
						.filter((x) => x && (x.q || x.a))
						.map((x) => ({ q: String(x.q ?? '').trim(), a: String(x.a ?? '').trim() }))
						.slice(0, 5);
				}
			}
		} catch {
			// Fallback: treat as raw Q&A pairs
		}

		await supabase
			.from('cro_audits')
			.update({ faq_result: questions, updated_at: new Date().toISOString() })
			.eq('id', id)
			.eq('organization_id', audit.organization_id);

		res.json({ success: true, data: { questions } });
	} catch (error) {
		console.error('[CRO Studio] FAQ generation error:', error);
		captureApiError(error, req, { feature: 'cro-studio-faq', auditId: req.params.id });
		res.status(500).json({ error: 'Failed to generate FAQ' });
	}
};

/**
 * POST /api/cro-studio/audits/:id/testimonial-email
 * Generate testimonial request email for a destination page (1 credit).
 */
export const generateCROStudioTestimonialEmail = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;
		if (!id) return res.status(400).json({ error: 'audit id required' });

		const result = await loadDestinationAuditForGeneration(req, res, id);
		if (!result) return;

		const { audit, content } = result;
		const cost = CREDIT_COSTS.CRO_STUDIO_TESTIMONIAL_EMAIL ?? 1;
		const creditCheck = await checkAndDeductCredits(audit.organization_id, cost);
		if (!creditCheck.ok) {
			return res.status(402).json({
				error: creditCheck.error,
				required: cost,
				available: creditCheck.available
			});
		}

		let businessName = 'Business';
		let niche = '';
		if (audit.site_id) {
			const { data: site } = await supabase
				.from('sites')
				.select('name, niche')
				.eq('id', audit.site_id)
				.single();
			if (site) {
				businessName = site.name ?? businessName;
				niche = site.niche ?? '';
			}
		}

		if (!openai) {
			captureApiWarning('CRO testimonial email: OpenAI not configured', req, {
				feature: 'cro-studio-testimonial-no-openai',
				auditId: id
			});
			return res.status(500).json({ error: 'CRO testimonial email service not configured' });
		}

		const completion = await openai.chat.completions.create({
			model: GPT_MODEL,
			messages: [
				{
					role: 'system',
					content:
						'You are a conversion copywriter. Write a short, friendly email to request a testimonial from a happy customer. The email should be personal, low-pressure, and easy for them to respond to. Include a clear subject line. Output only valid JSON.'
				},
				{
					role: 'user',
					content: `Page URL: ${audit.page_url}
Business: ${businessName} — ${niche}
Page type: destination page (conversion-focused)
H1: ${content.h1 ?? '(none)'}
Page content (first 1500 chars): ${content.bodyText.slice(0, 1500)}

Return JSON: { "subject": "Email subject line", "body": "Plain text email body" }`
				}
			],
			max_tokens: 600
		});

		const rawText = completion.choices[0]?.message?.content?.trim() ?? '{}';
		let subject = '';
		let body = '';
		try {
			const jsonMatch = rawText.match(/\{[\s\S]*\}/);
			if (jsonMatch) {
				const parsed = JSON.parse(jsonMatch[0]) as { subject?: string; body?: string };
				subject = String(parsed.subject ?? '').trim();
				body = String(parsed.body ?? '').trim();
			}
		} catch {
			// Fallback
		}

		const testimonialResult = { subject, body };
		await supabase
			.from('cro_audits')
			.update({ testimonial_result: testimonialResult, updated_at: new Date().toISOString() })
			.eq('id', id)
			.eq('organization_id', audit.organization_id);

		res.json({ success: true, data: { subject, body } });
	} catch (error) {
		console.error('[CRO Studio] Testimonial email generation error:', error);
		captureApiError(error, req, { feature: 'cro-studio-testimonial-email', auditId: req.params.id });
		res.status(500).json({ error: 'Failed to generate testimonial email' });
	}
};

/**
 * DELETE /api/cro-studio/audits/:id
 * Permanently delete a CRO audit and all its data.
 * Scoped to the caller's organization — cannot delete audits belonging to another org.
 */
export const deleteCROAudit = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const { id } = req.params;
		if (!id) return res.status(400).json({ error: 'audit id required' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg) return res.status(403).json({ error: 'No organization' });

		const { error } = await supabase
			.from('cro_audits')
			.delete()
			.eq('id', id)
			.eq('organization_id', userOrg.organization_id);

		if (error) {
			console.error('[CRO Studio] Delete audit error:', error);
			captureApiError(error, req, { feature: 'cro-studio-delete-audit-query', auditId: id });
			return res.status(500).json({ error: 'Failed to delete audit' });
		}

		res.json({ success: true });
	} catch (error) {
		console.error('[CRO Studio] Delete audit error:', error);
		captureApiError(error, req, { feature: 'cro-studio-delete-audit', auditId: req.params.id });
		res.status(500).json({ error: 'Failed to delete audit' });
	}
};
