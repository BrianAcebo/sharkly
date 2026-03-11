import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

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
			const { data, error: fetchError } = await supabase
				.from('topics')
				.select('id, cluster_id, target_id, title, keyword, monthly_searches, keyword_difficulty, cpc, funnel_stage, authority_fit, status, sort_order, ai_reasoning, kgr_score')
				.eq('site_id', siteId)
				.order('sort_order', { ascending: true });

			if (fetchError) throw fetchError;

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
			setTopics(mapped);
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
