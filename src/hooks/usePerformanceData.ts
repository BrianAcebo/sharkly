/**
 * Hook: usePerformanceData
 * Fetches and manages GSC performance data for the current user.
 * Aggregates clicks, impressions, CTR, position by page, query, or date.
 *
 * Note: seoScore, topFix, workspaceId on PerformanceByPage are optional —
 * they come from Sharkly's pages table via a secondary join, not from GSC.
 * Performance.tsx's re-optimization queue handles the null/undefined case.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { findPageIdForGscUrl } from '../lib/gscUrlMatch';

export interface PerformanceMetrics {
	clicks: number;
	impressions: number;
	ctr: number;
	position: number;
}

export interface PerformanceRecord extends PerformanceMetrics {
	date: string;
	page: string;
	query: string;
}

export interface PerformanceByPage extends PerformanceMetrics {
	page: string;
	queryCount: number;
	/** SEO score (0–115) from Sharkly pages table — undefined if page not in Sharkly */
	seoScore?: number | null;
	/** Highest-priority fix from the page's current SEO issues — undefined if not scored */
	topFix?: string | null;
	/** Workspace ID for direct navigation to editor — undefined if page not in Sharkly */
	workspaceId?: string | null;
}

export interface PerformanceByQuery extends PerformanceMetrics {
	query: string;
	pageCount: number;
}

interface UsePerformanceDataProps {
	siteId?: string;
	days?: number;
	enabled?: boolean;
}

interface UsePerformanceDataResult {
	records: PerformanceRecord[];
	byPage: PerformanceByPage[];
	byQuery: PerformanceByQuery[];
	topPages: PerformanceByPage[];
	topQueries: PerformanceByQuery[];
	totalClicks: number;
	totalImpressions: number;
	avgCtr: number;
	avgPosition: number;
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

export function usePerformanceData({
	siteId,
	days = 28,
	enabled = true
}: UsePerformanceDataProps = {}): UsePerformanceDataResult {
	const [records, setRecords] = useState<PerformanceRecord[]>([]);
	const [pageMetaMap, setPageMetaMap] = useState<
		Map<string, { seoScore: number | null; topFix: string | null; workspaceId: string | null }>
	>(new Map());
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		if (!enabled || !siteId) return;

		setLoading(true);
		setError(null);

		try {
			// 1. Fetch raw GSC performance rows
			const startDate = new Date();
			startDate.setDate(startDate.getDate() - days);
			const startDateStr = startDate.toISOString().split('T')[0];

			const { data, error: fetchError } = await supabase
				.from('performance_data')
				.select('*')
				.eq('site_id', siteId)
				.gte('date', startDateStr)
				.order('date', { ascending: false });

			if (fetchError) throw fetchError;

			const performanceRows = (data as PerformanceRecord[]) || [];
			setRecords(performanceRows);

			// 2. Fetch SEO scores + top fixes from Sharkly pages table (L11: use published_url for GSC matching)
			if (performanceRows.length > 0) {
				const { data: siteRow } = await supabase
					.from('sites')
					.select('url')
					.eq('id', siteId)
					.single();
				const siteUrl = (siteRow as { url?: string } | null)?.url ?? null;

				const { data: pageRows } = await supabase
					.from('pages')
					.select('id, published_url, seo_score, top_fix')
					.eq('site_id', siteId);

				const map = new Map<
					string,
					{ seoScore: number | null; topFix: string | null; workspaceId: string | null }
				>();
				const pagesWithUrl = (pageRows ?? []).map((p) => ({
					id: p.id,
					published_url: (p as { published_url?: string }).published_url ?? null
				}));
				for (const gscPage of [...new Set(performanceRows.map((r) => r.page))]) {
					const pageId = findPageIdForGscUrl(gscPage, pagesWithUrl, siteUrl);
					if (pageId) {
						const meta = (pageRows as Array<{ id: string; seo_score: number | null; top_fix: string | null }>).find(
							(p) => p.id === pageId
						);
						if (meta) {
							map.set(gscPage, {
								seoScore: meta.seo_score,
								topFix: meta.top_fix,
								workspaceId: meta.id
							});
						}
					}
				}
				setPageMetaMap(map);
			}
		} catch (err) {
			console.error('Error fetching performance data:', err);
			setError(err instanceof Error ? err.message : 'Failed to load performance data');
		} finally {
			setLoading(false);
		}
	}, [siteId, days, enabled]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Aggregate data by page
	const byPage = records.reduce((acc, record) => {
		const existing = acc.find((p) => p.page === record.page);
		if (existing) {
			existing.clicks += record.clicks;
			existing.impressions += record.impressions;
			existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
			existing.position = (existing.position + record.position) / 2;
			existing.queryCount++;
		} else {
			const meta = pageMetaMap.get(record.page);
			acc.push({
				page: record.page,
				clicks: record.clicks,
				impressions: record.impressions,
				ctr: record.ctr,
				position: record.position,
				queryCount: 1,
				seoScore: meta?.seoScore ?? null,
				topFix: meta?.topFix ?? null,
				workspaceId: meta?.workspaceId ?? null
			});
		}
		return acc;
	}, [] as PerformanceByPage[]);

	// Aggregate data by query
	const byQuery = records.reduce((acc, record) => {
		const existing = acc.find((q) => q.query === record.query);
		if (existing) {
			existing.clicks += record.clicks;
			existing.impressions += record.impressions;
			existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
			existing.position = (existing.position + record.position) / 2;
			existing.pageCount++;
		} else {
			acc.push({
				query: record.query,
				clicks: record.clicks,
				impressions: record.impressions,
				ctr: record.ctr,
				position: record.position,
				pageCount: 1
			});
		}
		return acc;
	}, [] as PerformanceByQuery[]);

	// Top pages and queries by clicks
	const topPages = [...byPage].sort((a, b) => b.clicks - a.clicks).slice(0, 10);
	const topQueries = [...byQuery].sort((a, b) => b.clicks - a.clicks).slice(0, 10);

	// Totals
	const totalClicks = records.reduce((sum, r) => sum + r.clicks, 0);
	const totalImpressions = records.reduce((sum, r) => sum + r.impressions, 0);
	const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
	const avgPosition =
		records.length > 0 ? records.reduce((sum, r) => sum + r.position, 0) / records.length : 0;

	return {
		records,
		byPage,
		byQuery,
		topPages,
		topQueries,
		totalClicks,
		totalImpressions,
		avgCtr,
		avgPosition,
		loading,
		error,
		refetch: fetchData
	};
}
