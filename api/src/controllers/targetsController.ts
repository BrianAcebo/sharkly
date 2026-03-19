/**
 * Targets API — CRUD for content strategy targets
 * A target = a page you want to rank (service, product, area of business)
 * Topics belong to targets; strategy generation runs per target.
 *
 * v4.0 changes:
 *   - acceptTopicsFromRun: persists new IGS + Navboost fields from strategy v4.0
 *   - generateContentBrief: new endpoint — produces a full content brief for a
 *     focus page (L2) or supporting article (L3) using all patent-grounded fields
 *     collected during strategy generation.
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_SONNET_MODEL || 'claude-sonnet-4-5-20250929';
const GPT_CONTENT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';
const CREDIT_COSTS_BRIEF = 3; // content brief costs 3 credits

async function getOrgId(userId: string): Promise<string | null> {
	const { data } = await supabase
		.from('user_organizations')
		.select('organization_id')
		.eq('user_id', userId)
		.maybeSingle();
	return data?.organization_id ?? null;
}

async function assertSiteAccess(siteId: string, orgId: string): Promise<boolean> {
	const { data } = await supabase
		.from('sites')
		.select('id')
		.eq('id', siteId)
		.eq('organization_id', orgId)
		.maybeSingle();
	return !!data;
}

async function assertTargetAccess(
	targetId: string,
	orgId: string
): Promise<{ target: { id: string; site_id: string } } | null> {
	const { data } = await supabase.from('targets').select('id, site_id').eq('id', targetId).single();
	if (!data) return null;
	const hasAccess = await assertSiteAccess(data.site_id, orgId);
	return hasAccess ? { target: data } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI helpers
// ─────────────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callClaude(
	system: string,
	user: string,
	maxTokens = 4000,
	retries = 3
): Promise<string | null> {
	for (let attempt = 0; attempt <= retries; attempt++) {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: CLAUDE_MODEL,
				max_tokens: maxTokens,
				messages: [{ role: 'user', content: user }],
				system
			})
		});
		if (res.ok) {
			const d = (await res.json()) as { content?: Array<{ type: string; text: string }> };
			return d.content?.find((c) => c.type === 'text')?.text ?? null;
		}
		if ((res.status === 529 || res.status === 500 || res.status === 503) && attempt < retries) {
			await sleep(2000 * Math.pow(2, attempt));
			continue;
		}
		console.error(`[Targets] Claude ${res.status}:`, await res.text());
		return null;
	}
	return null;
}

async function callOpenAI(system: string, user: string): Promise<string | null> {
	if (!OPENAI_API_KEY) return null;
	try {
		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${OPENAI_API_KEY}`
			},
			body: JSON.stringify({
				model: GPT_CONTENT_MODEL,
				max_tokens: 4000,
				messages: [
					{ role: 'system', content: system },
					{ role: 'user', content: user }
				]
			})
		});
		if (!res.ok) return null;
		const d = (await res.json()) as { choices?: Array<{ message: { content: string } }> };
		return d.choices?.[0]?.message?.content ?? null;
	} catch {
		return null;
	}
}

const ai = (system: string, user: string, maxTokens?: number) =>
	callClaude(system, user, maxTokens).then((r) => r ?? callOpenAI(system, user));

function parseJSON<T>(raw: string | null, fallback: T): T {
	if (!raw) return fallback;
	try {
		return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()) as T;
	} catch {
		return fallback;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Standard CRUD — unchanged
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/sites/:siteId/targets */
export const listTargets = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ error: 'Unauthorized' });
	const siteId = req.params.siteId;
	if (!siteId) return res.status(400).json({ error: 'siteId is required' });
	const orgId = await getOrgId(userId);
	if (!orgId) return res.status(400).json({ error: 'No organization found' });
	const hasAccess = await assertSiteAccess(siteId, orgId);
	if (!hasAccess) return res.status(404).json({ error: 'Site not found' });

	const { data, error } = await supabase
		.from('targets')
		.select(
			'id, site_id, name, destination_page_url, destination_page_label, seed_keywords, sort_order, created_at, updated_at'
		)
		.eq('site_id', siteId)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true });

	if (error) {
		console.error('[Targets] listTargets error:', error);
		return res.status(500).json({ error: 'Failed to fetch targets' });
	}

	return res.json(
		(data ?? []).map((t) => ({
			id: t.id,
			siteId: t.site_id,
			name: t.name,
			destinationPageUrl: t.destination_page_url,
			destinationPageLabel: t.destination_page_label,
			seedKeywords: t.seed_keywords ?? [],
			sortOrder: t.sort_order ?? 0,
			createdAt: t.created_at,
			updatedAt: t.updated_at
		}))
	);
};

/** POST /api/sites/:siteId/targets */
export const createTarget = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ error: 'Unauthorized' });
	const siteId = req.params.siteId;
	if (!siteId) return res.status(400).json({ error: 'siteId is required' });
	const orgId = await getOrgId(userId);
	if (!orgId) return res.status(400).json({ error: 'No organization found' });
	const hasAccess = await assertSiteAccess(siteId, orgId);
	if (!hasAccess) return res.status(404).json({ error: 'Site not found' });

	const body = req.body as {
		name?: string;
		destinationPageUrl?: string;
		destinationPageLabel?: string;
		seedKeywords?: string[];
	};

	const name = (body.name ?? '').trim();
	if (!name) return res.status(400).json({ error: 'name is required' });

	const seedKeywords = Array.isArray(body.seedKeywords)
		? body.seedKeywords.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
		: [];

	const { data: existing } = await supabase
		.from('targets')
		.select('sort_order')
		.eq('site_id', siteId)
		.order('sort_order', { ascending: false })
		.limit(1)
		.maybeSingle();

	const sortOrder = (existing?.sort_order ?? -1) + 1;

	const { data: inserted, error } = await supabase
		.from('targets')
		.insert({
			site_id: siteId,
			name,
			destination_page_url: body.destinationPageUrl?.trim() || null,
			destination_page_label: body.destinationPageLabel?.trim() || null,
			seed_keywords: seedKeywords,
			sort_order: sortOrder
		})
		.select(
			'id, site_id, name, destination_page_url, destination_page_label, seed_keywords, sort_order, created_at, updated_at'
		)
		.single();

	if (error) {
		console.error('[Targets] createTarget error:', error);
		return res.status(500).json({ error: 'Failed to create target' });
	}

	return res.status(201).json({
		id: inserted.id,
		siteId: inserted.site_id,
		name: inserted.name,
		destinationPageUrl: inserted.destination_page_url,
		destinationPageLabel: inserted.destination_page_label,
		seedKeywords: inserted.seed_keywords ?? [],
		sortOrder: inserted.sort_order ?? 0,
		createdAt: inserted.created_at,
		updatedAt: inserted.updated_at
	});
};

/** PATCH /api/targets/:targetId */
export const updateTarget = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ error: 'Unauthorized' });
	const targetId = req.params.targetId;
	if (!targetId) return res.status(400).json({ error: 'targetId is required' });
	const orgId = await getOrgId(userId);
	if (!orgId) return res.status(400).json({ error: 'No organization found' });
	const access = await assertTargetAccess(targetId, orgId);
	if (!access) return res.status(404).json({ error: 'Target not found' });

	const body = req.body as {
		name?: string;
		destinationPageUrl?: string;
		destinationPageLabel?: string;
		seedKeywords?: string[];
		sortOrder?: number;
	};

	const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
	if (body.name !== undefined) updates.name = body.name.trim();
	if (body.destinationPageUrl !== undefined)
		updates.destination_page_url = body.destinationPageUrl?.trim() || null;
	if (body.destinationPageLabel !== undefined)
		updates.destination_page_label = body.destinationPageLabel?.trim() || null;
	if (body.seedKeywords !== undefined) {
		updates.seed_keywords = Array.isArray(body.seedKeywords)
			? body.seedKeywords.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean)
			: [];
	}
	if (body.sortOrder !== undefined) updates.sort_order = Number(body.sortOrder);

	const { data, error } = await supabase
		.from('targets')
		.update(updates)
		.eq('id', targetId)
		.select(
			'id, site_id, name, destination_page_url, destination_page_label, seed_keywords, sort_order, created_at, updated_at'
		)
		.single();

	if (error) {
		console.error('[Targets] updateTarget error:', error);
		return res.status(500).json({ error: 'Failed to update target' });
	}

	return res.json({
		id: data.id,
		siteId: data.site_id,
		name: data.name,
		destinationPageUrl: data.destination_page_url,
		destinationPageLabel: data.destination_page_label,
		seedKeywords: data.seed_keywords ?? [],
		sortOrder: data.sort_order ?? 0,
		createdAt: data.created_at,
		updatedAt: data.updated_at
	});
};

/** DELETE /api/targets/:targetId */
export const deleteTarget = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ error: 'Unauthorized' });
	const targetId = req.params.targetId;
	if (!targetId) return res.status(400).json({ error: 'targetId is required' });
	const orgId = await getOrgId(userId);
	if (!orgId) return res.status(400).json({ error: 'No organization found' });
	const access = await assertTargetAccess(targetId, orgId);
	if (!access) return res.status(404).json({ error: 'Target not found' });

	const { error } = await supabase.from('targets').delete().eq('id', targetId);

	if (error) {
		console.error('[Targets] deleteTarget error:', error);
		return res.status(500).json({ error: 'Failed to delete target' });
	}

	return res.status(204).send();
};

/** GET /api/targets/:targetId/topics */
export const listTopicsForTarget = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ error: 'Unauthorized' });
	const targetId = req.params.targetId;
	if (!targetId) return res.status(400).json({ error: 'targetId is required' });
	const orgId = await getOrgId(userId);
	if (!orgId) return res.status(400).json({ error: 'No organization found' });
	const access = await assertTargetAccess(targetId, orgId);
	if (!access) return res.status(404).json({ error: 'Target not found' });

	const { data, error } = await supabase
		.from('topics')
		.select(
			`id, cluster_id, title, keyword, monthly_searches, keyword_difficulty, cpc,
			 funnel_stage, authority_fit, status, sort_order, ai_reasoning, kgr_score,
			 target_id, navboost_potential, igs_feasibility, original_angle,
			 dominant_format, paa_questions, mofu_type`
		)
		.eq('target_id', targetId)
		.order('sort_order', { ascending: true });

	if (error) {
		console.error('[Targets] listTopicsForTarget error:', error);
		return res.status(500).json({ error: 'Failed to fetch topics' });
	}

	return res.json(
		(data ?? []).map((t) => ({
			id: t.id,
			clusterId: t.cluster_id ?? null,
			title: t.title,
			keyword: t.keyword,
			volume: t.monthly_searches ?? 0,
			kd: t.keyword_difficulty ?? 0,
			cpc: Number(t.cpc) ?? 0,
			funnel: t.funnel_stage ?? 'mofu',
			mofuType: t.mofu_type ?? 'mofu_article',
			authorityFit: t.authority_fit ?? 'achievable',
			status: t.status ?? 'queued',
			priority: t.sort_order ?? 0,
			reasoning: t.ai_reasoning ?? '',
			kgrScore: t.kgr_score != null ? Number(t.kgr_score) : null,
			targetId: t.target_id ?? null,
			// v4.0 fields
			navboostPotential: t.navboost_potential ?? 'medium',
			igsFeasibility: t.igs_feasibility ?? 'borderline',
			originalAngle: t.original_angle ?? '',
			dominantFormat: t.dominant_format ?? 'guide',
			paaQuestions: t.paa_questions ?? []
		}))
	);
};

// ─────────────────────────────────────────────────────────────────────────────
// acceptTopicsFromRun — updated to persist v4.0 fields
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/targets/:targetId/topics/accept-from-run
 *
 * Accepts selected suggestions from a strategy run into this target's topics.
 * v4.0: also persists navboost_potential, igs_feasibility, original_angle,
 * dominant_format, paa_questions, mofu_type for use in content brief generation.
 *
 * Body: { runId: string, suggestionIndices: number[] }
 */
export const acceptTopicsFromRun = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ error: 'Unauthorized' });

	const targetId = req.params.targetId;
	const { runId, suggestionIndices } = req.body as {
		runId?: string;
		suggestionIndices?: number[];
	};
	if (!targetId || !runId || !Array.isArray(suggestionIndices) || suggestionIndices.length === 0) {
		return res.status(400).json({
			error: 'targetId, runId, and non-empty suggestionIndices are required'
		});
	}

	const orgId = await getOrgId(userId);
	if (!orgId) return res.status(400).json({ error: 'No organization found' });

	const access = await assertTargetAccess(targetId, orgId);
	if (!access) return res.status(404).json({ error: 'Target not found' });
	const { target } = access;

	const { data: run } = await supabase
		.from('strategy_runs')
		.select('id, site_id, suggestions')
		.eq('id', runId)
		.eq('site_id', target.site_id)
		.single();
	if (!run) return res.status(404).json({ error: 'Strategy run not found' });

	type SuggestionRow = {
		title?: string;
		keyword?: string;
		monthly_searches?: number;
		keyword_difficulty?: number;
		cpc?: number;
		funnel_stage?: string;
		mofu_type?: string;
		authority_fit?: string;
		ai_reasoning?: string;
		kgr_score?: number | null;
		navboost_potential?: string;
		igs_feasibility?: string;
		original_angle?: string;
		dominant_format?: string;
		paa_questions?: string[];
	};

	const suggestions = (run.suggestions ?? []) as SuggestionRow[];

	const toInsert = suggestionIndices
		.filter((i) => i >= 0 && i < suggestions.length)
		.map((i) => suggestions[i])
		.filter(Boolean);

	if (toInsert.length === 0) {
		return res.status(400).json({ error: 'No valid suggestions to add' });
	}

	const { data: lastTopic } = await supabase
		.from('topics')
		.select('sort_order')
		.eq('target_id', targetId)
		.order('sort_order', { ascending: false })
		.limit(1)
		.maybeSingle();
	const nextOrder = (lastTopic?.sort_order ?? -1) + 1;

	const rows = toInsert.map((s, i) => ({
		site_id: target.site_id,
		target_id: targetId,
		title: s.title ?? s.keyword ?? 'Untitled',
		keyword: s.keyword ?? s.title ?? 'untitled',
		monthly_searches: s.monthly_searches ?? 0,
		keyword_difficulty: s.keyword_difficulty ?? 0,
		cpc: s.cpc ?? 0,
		funnel_stage: s.funnel_stage ?? 'mofu',
		mofu_type: s.mofu_type ?? 'mofu_article',
		authority_fit: s.authority_fit ?? 'achievable',
		status: 'queued',
		sort_order: nextOrder + i,
		ai_reasoning: s.ai_reasoning ?? null,
		kgr_score: s.kgr_score ?? null,
		// v4.0 fields — feed content brief generation
		navboost_potential: s.navboost_potential ?? 'medium',
		igs_feasibility: s.igs_feasibility ?? 'borderline',
		original_angle: s.original_angle ?? null,
		dominant_format: s.dominant_format ?? 'guide',
		paa_questions: s.paa_questions ?? []
	}));

	const { data: inserted, error } = await supabase
		.from('topics')
		.insert(rows)
		.select('id, keyword, title');

	if (error) {
		console.error('[Targets] acceptTopicsFromRun error:', error);
		return res.status(500).json({ error: 'Failed to add topics' });
	}

	return res.status(201).json({
		added: inserted?.length ?? rows.length,
		topics: inserted ?? []
	});
};

// ─────────────────────────────────────────────────────────────────────────────
// moveTopic — places topic in its authority_fit section (Achievable / Build Toward / Long-Term)
// ─────────────────────────────────────────────────────────────────────────────

/** Authority fit order for placement: achievable < buildToward < locked */
const AUTHORITY_FIT_ORDER = ['achievable', 'buildToward', 'locked'] as const;

/**
 * POST /api/targets/:targetId/topics/:topicId/move
 * Body: { destinationTargetId: string }
 *
 * Places the moved topic in the destination strategy within its authority_fit
 * section (e.g. "Build Toward" topic lands among other Build Toward topics),
 * not at the bottom.
 */
export const moveTopic = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ error: 'Unauthorized' });

	const targetId = req.params.targetId;
	const topicId = req.params.topicId;
	const { destinationTargetId } = req.body as { destinationTargetId?: string };

	if (!targetId || !topicId || !destinationTargetId?.trim()) {
		return res.status(400).json({
			error: 'targetId, topicId, and destinationTargetId are required'
		});
	}

	const orgId = await getOrgId(userId);
	if (!orgId) return res.status(400).json({ error: 'No organization found' });

	const sourceAccess = await assertTargetAccess(targetId, orgId);
	if (!sourceAccess) return res.status(404).json({ error: 'Source target not found' });

	const destAccess = await assertTargetAccess(destinationTargetId, orgId);
	if (!destAccess) return res.status(404).json({ error: 'Destination target not found' });

	if (sourceAccess.target.site_id !== destAccess.target.site_id) {
		return res
			.status(400)
			.json({ error: 'Topics can only be moved between targets on the same site' });
	}
	if (targetId === destinationTargetId) {
		return res.status(400).json({ error: 'Topic is already in this target' });
	}

	const { data: topic, error: fetchError } = await supabase
		.from('topics')
		.select('id, target_id, sort_order, authority_fit')
		.eq('id', topicId)
		.eq('target_id', targetId)
		.maybeSingle();

	if (fetchError || !topic) {
		return res.status(404).json({ error: 'Topic not found in this target' });
	}

	const authorityFit = (topic.authority_fit ?? 'achievable') as (typeof AUTHORITY_FIT_ORDER)[number];

	// Fetch destination topics ordered by sort_order to find correct insert position
	const { data: destTopics, error: destErr } = await supabase
		.from('topics')
		.select('id, sort_order, authority_fit')
		.eq('target_id', destinationTargetId)
		.order('sort_order', { ascending: true });

	if (destErr) {
		console.error('[Targets] moveTopic: failed to fetch destination topics', destErr);
		return res.status(500).json({ error: 'Failed to load destination topics' });
	}

	const dest = (destTopics ?? []) as Array<{ id: string; sort_order: number; authority_fit: string }>;

	// Find insert position: after the last topic with the same authority_fit
	// If no matching section exists, insert before the first topic with a "higher" authority_fit
	let insertAfterSortOrder = -1;
	const fitIndex = AUTHORITY_FIT_ORDER.indexOf(authorityFit);
	for (let i = dest.length - 1; i >= 0; i--) {
		const t = dest[i];
		const tFit = (t.authority_fit ?? 'achievable') as (typeof AUTHORITY_FIT_ORDER)[number];
		const tIndex = AUTHORITY_FIT_ORDER.indexOf(tFit);
		if (tIndex === fitIndex) {
			// Same section — insert after this topic
			insertAfterSortOrder = t.sort_order ?? i;
			break;
		}
		if (tIndex < fitIndex) {
			// This topic is in an "earlier" section; we insert after it (start of our section)
			insertAfterSortOrder = t.sort_order ?? i;
			break;
		}
	}

	const newSortOrder = insertAfterSortOrder + 1;

	// Make space: increment sort_order for all dest topics that come at or after newSortOrder
	const toShift = dest.filter((t) => (t.sort_order ?? 0) >= newSortOrder);
	if (toShift.length > 0) {
		for (const t of toShift.sort((a, b) => (b.sort_order ?? 0) - (a.sort_order ?? 0))) {
			const { error: shiftErr } = await supabase
				.from('topics')
				.update({ sort_order: (t.sort_order ?? 0) + 1, updated_at: new Date().toISOString() })
				.eq('id', t.id);
			if (shiftErr) {
				console.error('[Targets] moveTopic: failed to shift topic', t.id, shiftErr);
				return res.status(500).json({ error: 'Failed to reorder topics' });
			}
		}
	}

	const { error: updateError } = await supabase
		.from('topics')
		.update({
			target_id: destinationTargetId,
			sort_order: newSortOrder,
			updated_at: new Date().toISOString()
		})
		.eq('id', topicId)
		.eq('target_id', targetId);

	if (updateError) {
		console.error('[Targets] moveTopic error:', updateError);
		return res.status(500).json({ error: 'Failed to move topic' });
	}

	return res.json({ success: true, topicId, destinationTargetId });
};

// ─────────────────────────────────────────────────────────────────────────────
// generateContentBrief — NEW in v4.0
//
// Produces a full, patent-grounded content brief for a focus page (L2) or
// supporting article (L3). Uses all fields collected during strategy generation
// to create actionable writing guidance that incorporates:
//
//   - Primary keyword + URL slug (US7346839B2 — permanent URL, inception date)
//   - H2 outline as answerable questions (US9940367B1 + US9959315B1 — passage scoring)
//   - IGS element requirement (US20190155948A1 — information gain)
//   - Internal link placement guidance (US8117209B1 — Reasonable Surfer)
//   - FAQ section (highest-density passage scoring candidates)
//   - Navboost framing for opening content (US8595225B1 — anti-pogo-stick)
//   - Schema type recommendation
//   - Word count target (competitor median × 1.1)
//
// POST /api/targets/:targetId/topics/:topicId/content-brief
// Body: { briefType: 'focus_page' | 'supporting_article', articleTitle?: string }
// ─────────────────────────────────────────────────────────────────────────────

export const generateContentBrief = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ error: 'Unauthorized' });

	const targetId = req.params.targetId;
	const topicId = req.params.topicId;
	const { briefType = 'focus_page', articleTitle } = req.body as {
		briefType?: 'focus_page' | 'supporting_article';
		articleTitle?: string;
	};

	if (!targetId || !topicId) {
		return res.status(400).json({ error: 'targetId and topicId are required' });
	}

	const orgId = await getOrgId(userId);
	if (!orgId) return res.status(400).json({ error: 'No organization found' });

	const access = await assertTargetAccess(targetId, orgId);
	if (!access) return res.status(404).json({ error: 'Target not found' });
	const { target } = access;

	// ─── Credit check ──────────────────────────────────────────────────────
	const { data: org } = await supabase
		.from('organizations')
		.select('id, included_credits_remaining, included_credits')
		.eq('id', orgId)
		.single();
	const available = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
	if (available < CREDIT_COSTS_BRIEF) {
		return res.status(402).json({
			error: 'Insufficient credits',
			required: CREDIT_COSTS_BRIEF,
			available
		});
	}

	// ─── Load topic ────────────────────────────────────────────────────────
	const { data: topic } = await supabase
		.from('topics')
		.select(
			`id, title, keyword, monthly_searches, keyword_difficulty, cpc, funnel_stage,
			 mofu_type, authority_fit, navboost_potential, igs_feasibility, original_angle,
			 dominant_format, paa_questions, ai_reasoning, target_id`
		)
		.eq('id', topicId)
		.eq('target_id', targetId)
		.single();

	if (!topic) return res.status(404).json({ error: 'Topic not found' });

	// ─── Load site + target context ────────────────────────────────────────
	const { data: site } = await supabase
		.from('sites')
		.select('id, name, niche, customer_description, url, domain_authority')
		.eq('id', target.site_id)
		.single();

	const { data: targetRow } = await supabase
		.from('targets')
		.select('name, destination_page_url, destination_page_label')
		.eq('id', targetId)
		.single();

	// ─── Deduct credits ────────────────────────────────────────────────────
	const newCredits = Math.max(0, available - CREDIT_COSTS_BRIEF);
	await supabase
		.from('organizations')
		.update({ included_credits_remaining: newCredits })
		.eq('id', orgId);

	const da = Number(site?.domain_authority ?? 0);
	const isNewDomain = da <= 5;
	const pageType =
		briefType === 'focus_page' ? 'Focus Page (L2 MoFu)' : 'Supporting Article (L3 ToFu)';
	const targetTitle = briefType === 'focus_page' ? topic.title : (articleTitle ?? topic.title);
	const primaryKw = topic.keyword ?? topic.title?.toLowerCase() ?? '';

	// Generate URL slug from primary keyword
	const urlSlug = primaryKw
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');

	const paaQuestions: string[] = Array.isArray(topic.paa_questions) ? topic.paa_questions : [];

	// ─── Generate the content brief ────────────────────────────────────────
	const briefRaw = await ai(
		`You are a senior SEO content strategist generating a content brief grounded in Google's
confirmed ranking mechanisms.

PATENT-GROUNDED RULES:
1. URL SLUG [US7346839B2]: URLs are permanent — changing them resets historical trust signals.
   Generate a clean, keyword-focused slug with hyphens. No stop words. No dates.

2. H2 STRUCTURE [US9940367B1 + US9959315B1 — Passage Scoring]:
   - Every H2 must be written as a clear, answerable question or directly answerable statement
   - The heading vector (Title → H1 → H2 → passage) is scored as a coherent path
   - A vague H2 like "Overview" scores near zero on passage context scoring
   - A specific H2 like "How Long Does Dry Skin Take to Respond to Moisturizer?" scores high
   - First 1-2 sentences under each H2 must directly answer the heading

3. INFORMATION GAIN [US20190155948A1 — Helpful Content Update mechanism]:
   - Every piece of content must include at least ONE element of original information
     that is NOT in the top-10 SERP results
   - The original_angle provided is specific to this business — use it
   - Zero original elements = content Google will not sustain in rankings

4. INTERNAL LINKING [US8117209B1 — Reasonable Surfer Model]:
   - Body text links in first 400 words pass maximum equity
   - Anchor text must be 2-5 descriptive words (not "click here" or "read more")
   - Focus page links: from supporting articles → to focus page (first 400 words)
   - Destination page link: focus page → to destination page (body text, early)

5. NAVBOOST [US8595225B1 — DOJ-confirmed primary ranking signal]:
   - Opening content (first screenful) must confirm the user is in the right place
   - This is the primary anti-pogo-stick mechanism
   - High-Navboost topics need "last-longest click" design: resource so complete
     the user ends their search session here

6. FAQ SECTION [US9940367B1]:
   - Always include — FAQ sections are highest-density passage scoring candidates
   - Use question-format H3s with direct, concise answers
   - Minimum 4 questions from PAA data provided

Return ONLY valid JSON, no markdown.`,
		`BRIEF TYPE: ${pageType}
TITLE: "${targetTitle}"
PRIMARY KEYWORD: "${primaryKw}"
URL SLUG: ${urlSlug}

BUSINESS CONTEXT:
Name: ${site?.name ?? 'Unknown'}
Niche: ${site?.niche ?? 'Unknown'}
Customer: ${site?.customer_description ?? 'small business owners'}
Domain Authority: ${da} ${isNewDomain ? '(new domain — prioritize low-competition angles)' : ''}

TARGET / DESTINATION:
Target name: ${targetRow?.name ?? 'Unknown'}
Destination page: ${targetRow?.destination_page_url ?? 'Not set'}

TOPIC CONTEXT:
Monthly searches: ${topic.monthly_searches ?? 0}
Competition (0-100): ${topic.keyword_difficulty ?? 0}
Ad value per click: $${topic.cpc ?? 0}
Authority fit: ${topic.authority_fit}
Content type: ${topic.mofu_type ?? 'mofu_article'} ${briefType === 'focus_page' ? '(this IS the focus page)' : '(supporting article that links to focus page)'}
Navboost potential: ${topic.navboost_potential ?? 'medium'}
IGS feasibility: ${topic.igs_feasibility ?? 'borderline'}

ORIGINAL ANGLE (the specific IGS element this business can produce):
${topic.original_angle ?? 'Not specified — suggest a first-hand experience angle based on the niche'}

DOMINANT FORMAT in SERP for this topic: ${topic.dominant_format ?? 'guide'}

PAA QUESTIONS from Google (use as H2/H3 candidates):
${paaQuestions.length > 0 ? paaQuestions.join('\n') : 'None available — generate relevant questions'}

INTERNAL LINKING ARCHITECTURE:
${
	briefType === 'focus_page'
		? `This is the FOCUS PAGE (L2). It receives links from supporting articles and links out to the destination page.
   - Internal link TO destination page: "${targetRow?.destination_page_url ?? '[destination URL]'}" — place in body text, first 400 words
   - This page will also link to supporting articles when they are written`
		: `This is a SUPPORTING ARTICLE (L3). It links up to the focus page "${topic.title}".
   - Internal link TO focus page: use descriptive 2-5 word anchor about the focus page topic
   - Place the focus page link in body text, within first 400 words`
}

Generate a complete content brief:
{
  "page_title": "final recommended title tag (primary keyword first, under 60 chars)",
  "h1": "H1 tag (matches title semantically, contains primary keyword)",
  "url_slug": "${urlSlug}",
  "meta_description": "150-155 chars, primary keyword present, compelling CTR language that reduces pogo-stick risk",
  "target_word_count": number (estimate competitor median × 1.1 based on topic complexity),
  "schema_type": "Article|HowTo|FAQPage|Review|Comparison",
  "igs_element": {
    "type": "original_research|expert_quote|first_hand_experience|unique_tool|contrarian_perspective",
    "description": "specific instruction for implementing the original_angle in this article",
    "placement": "where in the article this element should appear"
  },
  "opening_section_guidance": "2-3 sentences on how to open the article to confirm user intent immediately and minimize pogo-stick rate (Navboost anti-bounce)",
  "h2_outline": [
    {
      "heading": "H2 as a clear answerable question or definitive statement",
      "intent": "what this section answers",
      "first_sentence_starter": "first 1-2 sentences that directly answer the heading",
      "word_count_target": number,
      "include_igs_element": boolean
    }
  ],
  "faq_questions": [
    "Question 1 from PAA or related searches",
    "Question 2",
    "Question 3",
    "Question 4"
  ],
  "lsi_terms": ["8-12 semantically related terms to distribute naturally throughout"],
  "entity_terms": ["4-6 named entities expected in this content: brands, tools, certifications, locations"],
  "internal_link": {
    "destination_url": "${briefType === 'focus_page' ? (targetRow?.destination_page_url ?? '[destination URL]') : `[focus page URL for "${topic.title}"]`}",
    "anchor_text": "2-5 descriptive words for the internal link anchor",
    "placement_instruction": "exactly where in the article to place this link"
  },
  "competitor_gaps": ["2-3 specific things this article should cover that competitors typically miss"],
  "brief_summary": "2-3 sentences summarising the content plan in plain English for the writer"
}`,
		3500
	);

	const brief = parseJSON<Record<string, unknown>>(briefRaw, {
		page_title: targetTitle,
		h1: targetTitle,
		url_slug: urlSlug,
		meta_description: '',
		target_word_count: 1500,
		schema_type: 'Article',
		igs_element: {
			type: 'first_hand_experience',
			description: topic.original_angle ?? '',
			placement: 'Introduction'
		},
		opening_section_guidance: '',
		h2_outline: [],
		faq_questions: paaQuestions.slice(0, 4),
		lsi_terms: [],
		entity_terms: [],
		internal_link: { destination_url: '', anchor_text: '', placement_instruction: '' },
		competitor_gaps: [],
		brief_summary: topic.ai_reasoning ?? ''
	});

	return res.json({
		brief,
		topicId,
		topicTitle: topic.title,
		primaryKeyword: primaryKw,
		briefType,
		navboostPotential: topic.navboost_potential,
		igsFeasibility: topic.igs_feasibility,
		creditsUsed: CREDIT_COSTS_BRIEF,
		creditsRemaining: newCredits
	});
};
