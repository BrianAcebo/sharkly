import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export type StrategyRun = {
	id: string;
	siteId: string;
	targetId?: string | null;
	seedsUsed: string[];
	suggestions: unknown[];
	strategyRationale: string | null;
	researchContext: unknown | null;
	trafficTier: string | null;
	creditsUsed: number;
	createdAt: string;
};

/**
 * @param siteId - required for fetching
 * @param targetId - optional; when set, only returns runs for that target (runs with target_id = targetId)
 */
export function useStrategyRuns(siteId: string | null, targetId?: string | null) {
	const [runs, setRuns] = useState<StrategyRun[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchRuns = useCallback(async () => {
		if (!siteId) { setRuns([]); return; }
		setLoading(true);
		let query = supabase
			.from('strategy_runs')
			.select('id, site_id, target_id, seeds_used, suggestions, strategy_rationale, research_context, traffic_tier, credits_used, created_at')
			.eq('site_id', siteId)
			.order('created_at', { ascending: false })
			.limit(20);

		if (targetId) {
			query = query.eq('target_id', targetId);
		}

		const { data } = await query;

		setRuns(
			(data ?? []).map((r) => ({
				id: r.id,
				siteId: r.site_id,
				targetId: r.target_id ?? null,
				seedsUsed: r.seeds_used ?? [],
				suggestions: r.suggestions ?? [],
				strategyRationale: r.strategy_rationale ?? null,
				researchContext: r.research_context ?? null,
				trafficTier: r.traffic_tier ?? null,
				creditsUsed: r.credits_used ?? 0,
				createdAt: r.created_at,
			}))
		);
		setLoading(false);
	}, [siteId, targetId]);

	const deleteRun = useCallback(async (runId: string) => {
		await supabase.from('strategy_runs').delete().eq('id', runId);
		setRuns((prev) => prev.filter((r) => r.id !== runId));
	}, []);

	useEffect(() => { fetchRuns(); }, [fetchRuns]);

	return { runs, loading, refetch: fetchRuns, deleteRun };
}
