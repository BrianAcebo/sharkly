import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export interface ClusterRunSuggestion {
	keyword: string;
	monthly_searches: number | null;
	keyword_difficulty: number | null;
	cpc: number | null;
	funnel_stage: 'tofu' | 'mofu' | 'bofu';
	page_type: string;
	source: 'dataforseo' | 'paa' | 'related' | 'ai';
}

export interface ClusterRun {
	id: string;
	clusterId: string;
	suggestions: ClusterRunSuggestion[];
	createdAt: string;
}

export function useClusterRuns(clusterId: string | null) {
	const [runs, setRuns] = useState<ClusterRun[]>([]);
	const [loading, setLoading] = useState(false);

	const fetch = useCallback(async () => {
		if (!clusterId) { setRuns([]); return; }
		setLoading(true);
		const { data } = await supabase
			.from('cluster_runs')
			.select('id, cluster_id, suggestions, created_at')
			.eq('cluster_id', clusterId)
			.order('created_at', { ascending: false })
			.limit(10);
		setLoading(false);
		setRuns(
			(data ?? []).map((row) => ({
				id: row.id,
				clusterId: row.cluster_id,
				suggestions: (row.suggestions as ClusterRunSuggestion[]) ?? [],
				createdAt: row.created_at,
			}))
		);
	}, [clusterId]);

	useEffect(() => { fetch(); }, [fetch]);

	const deleteRun = useCallback(async (runId: string) => {
		await supabase.from('cluster_runs').delete().eq('id', runId);
		setRuns((prev) => prev.filter((r) => r.id !== runId));
	}, []);

	return { runs, loading, refetch: fetch, deleteRun };
}
