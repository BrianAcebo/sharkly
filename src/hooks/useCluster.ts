import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export type ClusterDetail = {
	id: string;
	siteId: string;
	title: string;
	targetKeyword: string;
	status: string;
	completionPct: number;
	funnelCoverage: { tofu: number; mofu: number; bofu: number };
	croScore: number;
	estimatedTraffic: number;
	authorityFit: string;
};

export function useCluster(clusterId: string | null) {
	const [cluster, setCluster] = useState<ClusterDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchCluster = useCallback(async () => {
		if (!clusterId) {
			setCluster(null);
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const { data, error: fetchErr } = await supabase
				.from('clusters')
				.select('id, site_id, title, target_keyword, status, completion_pct, funnel_coverage, cro_score')
				.eq('id', clusterId)
				.single();

			if (fetchErr) {
				console.error('[useCluster] Supabase error', {
					clusterId,
					message: fetchErr.message,
					details: (fetchErr as { details?: string }).details,
					hint: (fetchErr as { hint?: string }).hint,
					code: (fetchErr as { code?: string }).code
				});
				throw fetchErr;
			}

			if (!data) {
				setCluster(null);
				return;
			}

			const fc = (data.funnel_coverage as { tofu?: number; mofu?: number; bofu?: number }) || {};
			setCluster({
				id: data.id,
				siteId: data.site_id,
				title: data.title,
				targetKeyword: data.target_keyword,
				status: data.status || 'active',
				completionPct: data.completion_pct ?? 0,
				funnelCoverage: { tofu: fc.tofu ?? 0, mofu: fc.mofu ?? 0, bofu: fc.bofu ?? 0 },
				croScore: data.cro_score ?? 0,
				estimatedTraffic: 0,
				authorityFit: 'achievable'
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to load cluster';
			console.error('[useCluster] Failed to load cluster', { clusterId, error: err, message: msg });
			setError(msg);
			setCluster(null);
		} finally {
			setLoading(false);
		}
	}, [clusterId]);

	useEffect(() => {
		fetchCluster();
	}, [fetchCluster]);

	return { cluster, loading, error, refetch: fetchCluster };
}
