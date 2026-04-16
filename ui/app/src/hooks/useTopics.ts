import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { api } from '../utils/api';

export type Topic = {
	id: string;
	clusterId?: string | null;
	targetId?: string | null;
	title: string;
	keyword: string;
	volume: number;
	kd: number;
	cpc: number;
	funnel: 'tofu' | 'mofu' | 'bofu';
	authorityFit: 'achievable' | 'buildToward' | 'locked';
	status: 'queued' | 'active' | 'complete' | 'locked';
	priority: number;
	reasoning: string;
	kgrScore?: number | null;
};

const AUTHORITY_QUEUE_ORDER: Record<Topic['authorityFit'], number> = {
	achievable: 0,
	buildToward: 1,
	locked: 2
};

type TargetSortInput = { id: string; sortOrder: number; createdAt?: string };

/**
 * Site-wide topic order aligned with Strategy: targets in strategy order, then
 * achievable → build toward → locked within each target, then drag order (sort_order), then easier KD first.
 */
/** First topic on the site that still has an unfinished cluster (not marked complete). */
export function getBlockingIncompleteClusterTopic(topics: Topic[]): Topic | null {
	const b = topics.find((t) => !!t.clusterId && t.status !== 'complete');
	return b ?? null;
}

export function sortTopicsForStrategyQueue(topics: Topic[], targets: TargetSortInput[]): Topic[] {
	const orderedTargets = [...targets].sort((a, b) => {
		if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
		return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
	});
	const targetOrdinal = new Map<string, number>();
	orderedTargets.forEach((t, i) => targetOrdinal.set(t.id, i));

	return [...topics].sort((a, b) => {
		const aT = a.targetId != null ? targetOrdinal.get(a.targetId) : undefined;
		const bT = b.targetId != null ? targetOrdinal.get(b.targetId) : undefined;
		const aBucket = aT ?? 1_000_000;
		const bBucket = bT ?? 1_000_001;
		if (aBucket !== bBucket) return aBucket - bBucket;

		const aAuth = AUTHORITY_QUEUE_ORDER[a.authorityFit] ?? 99;
		const bAuth = AUTHORITY_QUEUE_ORDER[b.authorityFit] ?? 99;
		if (aAuth !== bAuth) return aAuth - bAuth;

		const ap = a.priority ?? 0;
		const bp = b.priority ?? 0;
		if (ap !== bp) return ap - bp;

		if (a.kd !== b.kd) return a.kd - b.kd;
		return a.title.localeCompare(b.title);
	});
}

export function useTopics(siteId: string | null) {
	const [topics, setTopics] = useState<Topic[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchTopics = useCallback(async () => {
		if (!siteId) {
			setTopics([]);
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const [topicsResult, targetsRes] = await Promise.all([
				supabase
					.from('topics')
					.select(
						'id, cluster_id, target_id, title, keyword, monthly_searches, keyword_difficulty, cpc, funnel_stage, authority_fit, status, sort_order, ai_reasoning, kgr_score'
					)
					.eq('site_id', siteId)
					.order('sort_order', { ascending: true }),
				api.get(`/api/sites/${siteId}/targets`)
			]);

			const { data, error: fetchError } = topicsResult;
			if (fetchError) throw fetchError;

			let targetsForSort: TargetSortInput[] = [];
			if (targetsRes.ok) {
				const raw = (await targetsRes.json().catch(() => null)) as unknown;
				if (Array.isArray(raw)) {
					targetsForSort = raw.map((t: { id?: string; sortOrder?: number; createdAt?: string }) => ({
						id: String(t.id ?? ''),
						sortOrder: typeof t.sortOrder === 'number' ? t.sortOrder : 0,
						createdAt: t.createdAt
					})).filter((t) => t.id.length > 0);
				}
			}

			const mapped: Topic[] = (data ?? []).map((row, i) => ({
				id: row.id,
				clusterId: row.cluster_id ?? null,
				targetId: row.target_id ?? null,
				title: row.title,
				keyword: row.keyword,
				volume: row.monthly_searches ?? 0,
				kd: row.keyword_difficulty ?? 0,
				cpc: Number(row.cpc) ?? 0,
				funnel: (row.funnel_stage as Topic['funnel']) ?? 'mofu',
				authorityFit: (row.authority_fit as Topic['authorityFit']) ?? 'achievable',
				status: (row.status as Topic['status']) ?? 'queued',
				priority: row.sort_order ?? i + 1,
				reasoning: row.ai_reasoning ?? '',
				kgrScore: row.kgr_score != null ? Number(row.kgr_score) : null
			}));
			setTopics(sortTopicsForStrategyQueue(mapped, targetsForSort));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load topics');
			setTopics([]);
		} finally {
			setLoading(false);
		}
	}, [siteId]);

	useEffect(() => {
		fetchTopics();
	}, [fetchTopics]);

	const deleteTopic = useCallback(async (topicId: string): Promise<{ error: string | null }> => {
		if (!siteId) return { error: 'No site selected' };
		const { error: deleteError, count } = await supabase
			.from('topics')
			.delete({ count: 'exact' })
			.eq('id', topicId)
			.eq('site_id', siteId);
		if (deleteError) {
			console.error('[useTopics] deleteTopic error:', deleteError);
			return { error: deleteError.message };
		}
		if (count === 0) {
			console.warn('[useTopics] deleteTopic: 0 rows deleted — RLS may have blocked it');
			return { error: 'Could not delete topic — permission denied' };
		}
		setTopics((prev) => prev.filter((t) => t.id !== topicId));
		return { error: null };
	}, [siteId]);

	return { topics, loading, error, refetch: fetchTopics, deleteTopic };
}
