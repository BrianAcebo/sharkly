import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export type DashboardStats = {
	publishedCount: number;
	avgSeoScore: number | null;
};

export function useDashboardStats(siteId: string | null) {
	const [stats, setStats] = useState<DashboardStats>({ publishedCount: 0, avgSeoScore: null });
	const [loading, setLoading] = useState(true);

	const fetchStats = useCallback(async () => {
		if (!siteId) {
			setStats({ publishedCount: 0, avgSeoScore: null });
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			const { data: clusterRows } = await supabase
				.from('clusters')
				.select('id')
				.eq('site_id', siteId);
			const clusterIds = (clusterRows ?? []).map((c) => c.id);
			if (clusterIds.length === 0) {
				setStats({ publishedCount: 0, avgSeoScore: null });
				return;
			}
			const { data: pages } = await supabase
				.from('pages')
				.select('seo_score')
				.in('cluster_id', clusterIds)
				.eq('status', 'published');
			const published = pages ?? [];
			const publishedCount = published.length;
			const scores = published.map((p) => Number(p.seo_score ?? 0)).filter((n) => !Number.isNaN(n));
			const avgSeoScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
			setStats({ publishedCount, avgSeoScore });
		} catch {
			setStats({ publishedCount: 0, avgSeoScore: null });
		} finally {
			setLoading(false);
		}
	}, [siteId]);

	useEffect(() => {
		fetchStats();
	}, [fetchStats]);

	return { ...stats, loading, refetch: fetchStats };
}
