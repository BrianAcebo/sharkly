/**
 * Targets API — CRUD for content strategy targets
 * A target = a page you want to rank (service, product, area of business)
 * Topics belong to targets; strategy generation runs per target.
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';

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

async function assertTargetAccess(targetId: string, orgId: string): Promise<{ target: { id: string; site_id: string } } | null> {
	const { data } = await supabase
		.from('targets')
		.select('id, site_id')
		.eq('id', targetId)
		.single();
	if (!data) return null;
	const hasAccess = await assertSiteAccess(data.site_id, orgId);
	return hasAccess ? { target: data } : null;
}

/**
 * GET /api/sites/:siteId/targets — List targets for a site
 */
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
		.select('id, site_id, name, destination_page_url, destination_page_label, seed_keywords, sort_order, created_at, updated_at')
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
			updatedAt: t.updated_at,
		}))
	);
};

/**
 * POST /api/sites/:siteId/targets — Create a target
 */
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
		? body.seedKeywords
				.map((s) => (typeof s === 'string' ? s.trim() : ''))
				.filter(Boolean)
		: [];

	// Get max sort_order
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
			sort_order: sortOrder,
		})
		.select('id, site_id, name, destination_page_url, destination_page_label, seed_keywords, sort_order, created_at, updated_at')
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
		updatedAt: inserted.updated_at,
	});
};

/**
 * PATCH /api/targets/:targetId — Update a target
 */
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
	if (body.destinationPageUrl !== undefined) updates.destination_page_url = body.destinationPageUrl?.trim() || null;
	if (body.destinationPageLabel !== undefined) updates.destination_page_label = body.destinationPageLabel?.trim() || null;
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
		.select('id, site_id, name, destination_page_url, destination_page_label, seed_keywords, sort_order, created_at, updated_at')
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
		updatedAt: data.updated_at,
	});
};

/**
 * DELETE /api/targets/:targetId — Delete a target
 * Cascades to topics (topics.target_id). Clusters remain but topic.target_id becomes orphaned —
 * actually, ON DELETE CASCADE on target means topics get deleted. Clusters have topic_id NOT NULL,
 * so deleting a topic would cascade to cluster... no, topic has ON DELETE CASCADE from target,
 * so when we delete target, topics get deleted. Clusters reference topics. So clusters would fail
 * because topic is deleted. Let me check - topics has target_id REFERENCES targets ON DELETE CASCADE.
 * So when we delete target, topics with that target_id get deleted. Clusters have topic_id NOT NULL
 * REFERENCES topics. So when a topic is deleted, clusters referencing it would... topics has
 * ON DELETE CASCADE from targets, so the topic row is deleted. Clusters have topic_id NOT NULL
 * REFERENCES topics(id) ON DELETE CASCADE - no, let me check the clusters table. topic_id REFERENCES
 * topics(id) ON DELETE CASCADE - so when topic is deleted, cluster is deleted too. And pages
 * reference cluster. So cascade chain: target -> topics -> clusters -> pages. Deleting a target
 * would delete all its topics, which deletes all clusters for those topics, which deletes all
 * pages. That's destructive. The plan said "warns: deletes all associated topics and clusters".
 * So we need to either 1) prevent delete if clusters exist, or 2) allow cascade. The sitemap says
 * "Confirm delete target (warns: deletes all associated topics and clusters)". So we allow it
 * but the frontend will show a confirm dialog. The API will cascade. Good.
 */
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

/**
 * GET /api/targets/:targetId/topics — List topics for a target
 */
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
		.select('id, cluster_id, title, keyword, monthly_searches, keyword_difficulty, cpc, funnel_stage, authority_fit, status, sort_order, ai_reasoning, kgr_score, target_id')
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
			authorityFit: t.authority_fit ?? 'achievable',
			status: t.status ?? 'queued',
			priority: t.sort_order ?? 0,
			reasoning: t.ai_reasoning ?? '',
			kgrScore: t.kgr_score != null ? Number(t.kgr_score) : null,
			targetId: t.target_id ?? null
		}))
	);
};

/**
 * POST /api/targets/:targetId/topics/accept-from-run
 * Accept selected suggestions from a strategy run into this target's topics.
 * Body: { runId: string, suggestionIndices: number[] }
 */
export const acceptTopicsFromRun = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ error: 'Unauthorized' });

	const targetId = req.params.targetId;
	const { runId, suggestionIndices } = req.body as { runId?: string; suggestionIndices?: number[] };
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

	// Load run and verify it belongs to same site
	const { data: run } = await supabase
		.from('strategy_runs')
		.select('id, site_id, suggestions')
		.eq('id', runId)
		.eq('site_id', target.site_id)
		.single();
	if (!run) return res.status(404).json({ error: 'Strategy run not found' });

	const suggestions = (run.suggestions ?? []) as Array<{
		title?: string;
		keyword?: string;
		monthly_searches?: number;
		keyword_difficulty?: number;
		cpc?: number;
		funnel_stage?: string;
		authority_fit?: string;
		ai_reasoning?: string;
	}>;

	const toInsert = suggestionIndices
		.filter((i) => i >= 0 && i < suggestions.length)
		.map((i) => suggestions[i])
		.filter(Boolean);

	if (toInsert.length === 0) {
		return res.status(400).json({ error: 'No valid suggestions to add' });
	}

	// Get next sort_order for this target
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
		authority_fit: s.authority_fit ?? 'achievable',
		status: 'queued',
		sort_order: nextOrder + i,
		ai_reasoning: s.ai_reasoning ?? null
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
