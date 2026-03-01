import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export type Topic = {
	id: string;
	clusterId?: string | null;
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
				.select('id, cluster_id, title, keyword, monthly_searches, keyword_difficulty, cpc, funnel_stage, authority_fit, status, sort_order, ai_reasoning')
				.eq('site_id', siteId)
				.order('sort_order', { ascending: true });

			if (fetchError) throw fetchError;

			const mapped: Topic[] = (data ?? []).map((row, i) => ({
				id: row.id,
				clusterId: row.cluster_id ?? null,
				title: row.title,
				keyword: row.keyword,
				volume: row.monthly_searches ?? 0,
				kd: row.keyword_difficulty ?? 0,
				cpc: Number(row.cpc) ?? 0,
				funnel: (row.funnel_stage as Topic['funnel']) ?? 'mofu',
				authorityFit: (row.authority_fit as Topic['authorityFit']) ?? 'achievable',
				status: (row.status as Topic['status']) ?? 'queued',
				priority: row.sort_order ?? i + 1,
				reasoning: row.ai_reasoning ?? ''
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

	return { topics, loading, error, refetch: fetchTopics };
}
