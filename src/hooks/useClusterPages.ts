import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

export type PageData = {
	id: string;
	clusterId: string;
	title: string;
	keyword: string;
	volume: number;
	kd: number;
	cpc?: number | null;
	funnel: 'tofu' | 'mofu' | 'bofu';
	pageType?: string | null;
	status: 'planned' | 'brief_generated' | 'draft' | 'published';
	type: 'focus_page' | 'article';
	seoScore: number;
	croScore: number;
	wordCount: number;
	targetWordCount: number;
	position_x: number;
	position_y: number;
};

export function useClusterPages(clusterId: string | null) {
	const [pages, setPages] = useState<PageData[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchPages = useCallback(async () => {
		if (!clusterId) {
			setPages([]);
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const { data, error: fetchErr } = await supabase
				.from('pages')
				.select(
					'id, cluster_id, title, keyword, monthly_searches, keyword_difficulty, cpc, funnel_stage, page_type, status, type, seo_score, cro_score, word_count, target_word_count, position_x, position_y'
				)
				.eq('cluster_id', clusterId)
				.order('sort_order', { ascending: true });

			if (fetchErr) {
				console.error('[useClusterPages] Supabase error', {
					clusterId,
					message: fetchErr.message,
					details: (fetchErr as { details?: string }).details,
					hint: (fetchErr as { hint?: string }).hint,
					code: (fetchErr as { code?: string }).code
				});
				throw fetchErr;
			}

			const mapped: PageData[] = (data || []).map((row) => ({
				id: row.id,
				clusterId: row.cluster_id,
				title: row.title,
				keyword: row.keyword || '',
			volume: row.monthly_searches ?? 0,
			kd: row.keyword_difficulty ?? 0,
			cpc: row.cpc ?? null,
		funnel: (row.funnel_stage as PageData['funnel']) || 'mofu',
			pageType: (row.page_type as string | null) ?? null,
			status: (row.status as PageData['status']) || 'planned',
				type: (row.type as PageData['type']) || 'article',
				seoScore: row.seo_score ?? 0,
				croScore: row.cro_score ?? 0,
				wordCount: row.word_count ?? 0,
				targetWordCount: row.target_word_count ?? 1000,
				position_x: row.position_x ?? 0,
				position_y: row.position_y ?? 0
			}));

			setPages(mapped);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to load pages';
			console.error('[useClusterPages] Failed to load pages', { clusterId, error: err, message: msg });
			setError(msg);
			setPages([]);
		} finally {
			setLoading(false);
		}
	}, [clusterId]);

	useEffect(() => {
		fetchPages();
	}, [fetchPages]);

	return { pages, loading, error, refetch: fetchPages };
}
