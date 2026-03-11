import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export type Cluster = {
	id: string;
	topicId: string;
	title: string;
	targetKeyword: string;
	status: string;
	completionPct: number;
	total: number;
	articleCount: number;
	completion: number;
	funnelCoverage: { tofu: number; mofu: number; bofu: number };
	croScore: number;
	estimatedTraffic: number;
	createdAt: string;
	/** 'A' = focus is conversion page; 'B' = destination page downstream */
	architecture?: string;
	destinationPageUrl?: string | null;
	destinationPageLabel?: string | null;
};

export function useClusters(siteId: string | null) {
	const [clusters, setClusters] = useState<Cluster[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchClusters = useCallback(async () => {
		if (!siteId) {
			setClusters([]);
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const { data: clusterRows, error: clusterErr } = await supabase
				.from('clusters')
				.select('id, topic_id, title, target_keyword, status, completion_pct, funnel_coverage, cro_score, created_at, architecture, destination_page_url, destination_page_label')
				.eq('site_id', siteId)
				.order('created_at', { ascending: false });

			if (clusterErr) {
				console.error('[useClusters] Supabase error (clusters)', {
					siteId,
					message: clusterErr.message,
					details: (clusterErr as { details?: string }).details,
					hint: (clusterErr as { hint?: string }).hint,
					code: (clusterErr as { code?: string }).code
				});
				throw clusterErr;
			}

			const clusterIds = (clusterRows || []).map((c) => c.id);
		const { data: pageCounts, error: pagesErr } = await supabase
			.from('pages')
			.select('cluster_id, status, type')
			.in('cluster_id', clusterIds);

			if (pagesErr) {
				console.error('[useClusters] Supabase error (pages)', {
					siteId,
					clusterIds: clusterIds.slice(0, 5),
					message: pagesErr.message,
					details: (pagesErr as { details?: string }).details,
					hint: (pagesErr as { hint?: string }).hint,
					code: (pagesErr as { code?: string }).code
				});
				throw pagesErr;
			}

		const countByCluster = (pageCounts || []).reduce(
			(acc, p) => {
				acc[p.cluster_id] = (acc[p.cluster_id] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>
		);

		const articleCountByCluster = (pageCounts || [])
			.filter((p) => p.type === 'article')
			.reduce(
				(acc, p) => {
					acc[p.cluster_id] = (acc[p.cluster_id] || 0) + 1;
					return acc;
				},
				{} as Record<string, number>
			);

			const completedByCluster = (pageCounts || [])
				.filter((p) => p.status === 'published' || p.status === 'draft')
				.reduce(
					(acc, p) => {
						acc[p.cluster_id] = (acc[p.cluster_id] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>
				);

			const mapped: Cluster[] = (clusterRows || []).map((c) => {
				const fc = (c.funnel_coverage as { tofu?: number; mofu?: number; bofu?: number }) || {};
			const total = countByCluster[c.id] || 0;
			const articleCount = articleCountByCluster[c.id] || 0;
			const completion = completedByCluster[c.id] || 0;
			return {
				id: c.id,
				topicId: c.topic_id,
				title: c.title,
				targetKeyword: c.target_keyword,
				status: c.status || 'active',
				completionPct: c.completion_pct ?? 0,
				total,
				articleCount,
				completion,
				funnelCoverage: { tofu: fc.tofu ?? 0, mofu: fc.mofu ?? 0, bofu: fc.bofu ?? 0 },
				croScore: c.cro_score ?? 0,
				estimatedTraffic: 0,
				createdAt: c.created_at,
				architecture: c.architecture ?? 'A',
				destinationPageUrl: c.destination_page_url ?? null,
				destinationPageLabel: c.destination_page_label ?? null
			};
			});

			setClusters(mapped);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to load clusters';
			console.error('[useClusters] Failed to load clusters', { siteId, error: err, message: msg });
			setError(msg);
			setClusters([]);
		} finally {
			setLoading(false);
		}
	}, [siteId]);

	useEffect(() => {
		fetchClusters();
	}, [fetchClusters]);

	return { clusters, loading, error, refetch: fetchClusters };
}
