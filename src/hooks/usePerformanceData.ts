/**
 * Hook: usePerformanceData
 * Fetches and manages GSC performance data for the current user.
 * Aggregates clicks, impressions, CTR, position by page, query, or date.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

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
}

export interface PerformanceByQuery extends PerformanceMetrics {
	query: string;
	pageCount: number;
}

interface UsePerformanceDataProps {
	siteId?: string;
	days?: number; // Number of days to fetch (default 28)
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
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		if (!enabled || !siteId) return;

		setLoading(true);
		setError(null);

		try {
			// Build query
			let query = supabase.from('performance_data').select('*');

			// Filter by site_id
			query = query.eq('site_id', siteId);

			// Filter by date range (last N days)
			const startDate = new Date();
			startDate.setDate(startDate.getDate() - days);
			const startDateStr = startDate.toISOString().split('T')[0];

			query = query.gte('date', startDateStr);

			// Order by date descending
			query = query.order('date', { ascending: false });

			const { data, error: fetchError } = await query;

			if (fetchError) throw fetchError;

			setRecords((data as PerformanceRecord[]) || []);
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
	const byPage = records.reduce(
		(acc, record) => {
			const existing = acc.find((p) => p.page === record.page);
			if (existing) {
				existing.clicks += record.clicks;
				existing.impressions += record.impressions;
				existing.ctr = (existing.clicks / existing.impressions) * 100 || 0;
				existing.position = (existing.position + record.position) / 2;
				existing.queryCount = new Set([...acc.flatMap((p) =>
					records.filter((r) => r.page === p.page).map((r) => r.query)
				)]).size;
			} else {
				acc.push({
					page: record.page,
					clicks: record.clicks,
					impressions: record.impressions,
					ctr: record.ctr,
					position: record.position,
					queryCount: records.filter((r) => r.page === record.page).length
				});
			}
			return acc;
		},
		[] as PerformanceByPage[]
	);

	// Aggregate data by query
	const byQuery = records.reduce(
		(acc, record) => {
			const existing = acc.find((q) => q.query === record.query);
			if (existing) {
				existing.clicks += record.clicks;
				existing.impressions += record.impressions;
				existing.ctr = (existing.clicks / existing.impressions) * 100 || 0;
				existing.position = (existing.position + record.position) / 2;
				existing.pageCount = new Set([...acc.flatMap((q) =>
					records.filter((r) => r.query === q.query).map((r) => r.page)
				)]).size;
			} else {
				acc.push({
					query: record.query,
					clicks: record.clicks,
					impressions: record.impressions,
					ctr: record.ctr,
					position: record.position,
					pageCount: records.filter((r) => r.query === record.query).length
				});
			}
			return acc;
		},
		[] as PerformanceByQuery[]
	);

	// Top pages and queries by clicks
	const topPages = byPage.sort((a, b) => b.clicks - a.clicks).slice(0, 10);
	const topQueries = byQuery.sort((a, b) => b.clicks - a.clicks).slice(0, 10);

	// Calculate totals
	const totalClicks = records.reduce((sum, r) => sum + r.clicks, 0);
	const totalImpressions = records.reduce((sum, r) => sum + r.impressions, 0);
	const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

	// Average position across all records
	const avgPosition =
		records.length > 0
			? records.reduce((sum, r) => sum + r.position, 0) / records.length
			: 0;

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
