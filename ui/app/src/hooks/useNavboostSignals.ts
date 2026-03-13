/**
 * useNavboostSignals
 *
 * Fetches weekly-aggregated CTR data from the navboost_signals table
 * and classifies each query's momentum as Building / Flat / Weakening
 * using linear regression over the most recent 4 weeks.
 *
 * Patent grounding: US8595225B1 (Navboost) — topic-specific behavioral ranking
 * signal. Google scores pages on per-topic click patterns over a rolling window.
 * We model this as a 4-week CTR slope: a rising slope = building ranking power,
 * a falling slope = losing ground that needs action.
 *
 * DOJ antitrust trial (2023) confirmed Navboost is Google's most important
 * ranking signal. A page whose CTR drops from 6% → 3% is actively losing
 * ranking power — this hook makes that visible.
 *
 * Momentum thresholds (must match rankingsController.ts classifyMomentum — keep in sync):
 *   Building:   slope > +0.002 per week
 *   Weakening:  slope < -0.002 per week
 *   Flat:       slope between -0.002 and +0.002
 * ±0.002 chosen over ±0.001 to avoid flagging normal week-to-week noise.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export type MomentumStatus = 'building' | 'flat' | 'weakening';

export interface NavboostSignal {
	query: string;
	page: string;
	/** Most recent week's average CTR (0–1 decimal, e.g. 0.045 = 4.5%) */
	avg_ctr: number;
	/** Most recent week's average position */
	avg_position: number;
	/** 4-week linear regression slope on avg_ctr */
	slope: number;
	/** Momentum classification derived from slope */
	status: MomentumStatus;
	/** Total clicks in the most recent week */
	total_clicks: number;
	/** Total impressions in the most recent week */
	total_impressions: number;
	/** Linked workspace ID if this query maps to a Sharkly page — for "Optimize Title" CTA */
	workspaceId?: string;
}

interface UseNavboostSignalsOptions {
	siteId?: string;
	/** Number of top queries to return, sorted by impressions desc. Default: 10 */
	limit?: number;
	/** Only fetch when true — avoids fetching before GSC is confirmed connected */
	enabled?: boolean;
}

interface UseNavboostSignalsResult {
	signals: NavboostSignal[];
	loading: boolean;
	error: string | null;
	refetch: () => void;
}

/**
 * Linear regression slope over an array of (x, y) points.
 * Returns the slope (Δy per unit x). Used to measure CTR trend direction.
 *
 * Formula: slope = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)
 */
function linearRegressionSlope(points: { x: number; y: number }[]): number {
	const n = points.length;
	if (n < 2) return 0;

	let sumX = 0;
	let sumY = 0;
	let sumXY = 0;
	let sumX2 = 0;

	for (const { x, y } of points) {
		sumX += x;
		sumY += y;
		sumXY += x * y;
		sumX2 += x * x;
	}

	const denominator = n * sumX2 - sumX * sumX;
	if (denominator === 0) return 0;

	return (n * sumXY - sumX * sumY) / denominator;
}

/**
 * Classify momentum from slope value.
 * Thresholds from spec §17.2 / rankingsController.
 */
function classifyMomentum(slope: number): MomentumStatus {
	if (slope > 0.002) return 'building';
	if (slope < -0.002) return 'weakening';
	return 'flat';
}

export function useNavboostSignals({
	siteId,
	limit = 10,
	enabled = true
}: UseNavboostSignalsOptions): UseNavboostSignalsResult {
	const [signals, setSignals] = useState<NavboostSignal[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [tick, setTick] = useState(0);

	const refetch = () => setTick((t) => t + 1);

	useEffect(() => {
		if (!enabled || !siteId) {
			setSignals([]);
			return;
		}

		let cancelled = false;

		async function fetchSignals() {
			setLoading(true);
			setError(null);

			try {
				// Pull last 4 weeks of weekly navboost data for this site.
				// 4 weeks is the minimum for a meaningful regression slope.
				// The full 13-month window lives in the DB but we only need
				// recent weeks for the trend calculation shown in the UI.
				const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];

				const { data: rows, error: fetchError } = await supabase
					.from('navboost_signals')
					.select('query, page, week_start, avg_ctr, avg_position, total_clicks, total_impressions')
					.eq('site_id', siteId)
					.gte('week_start', fourWeeksAgo)
					.order('week_start', { ascending: true });

				if (fetchError) throw fetchError;
				if (cancelled) return;

				if (!rows || rows.length === 0) {
					setSignals([]);
					setLoading(false);
					return;
				}

				// Group rows by (query, page) pair
				const groupMap = new Map<
					string,
					{
						query: string;
						page: string;
						weeks: {
							week_start: string;
							avg_ctr: number;
							avg_position: number;
							total_clicks: number;
							total_impressions: number;
						}[];
					}
				>();

				for (const row of rows) {
					const key = `${row.query}|||${row.page}`;
					if (!groupMap.has(key)) {
						groupMap.set(key, { query: row.query, page: row.page, weeks: [] });
					}
					groupMap.get(key)!.weeks.push({
						week_start: row.week_start,
						avg_ctr: row.avg_ctr,
						avg_position: row.avg_position,
						total_clicks: row.total_clicks,
						total_impressions: row.total_impressions
					});
				}

				// For each query/page group: run linear regression on CTR over weeks
				const computed: NavboostSignal[] = [];

				for (const group of groupMap.values()) {
					const sorted = group.weeks.sort((a, b) => a.week_start.localeCompare(b.week_start));

					// x = week index (0, 1, 2, 3), y = avg_ctr
					const points = sorted.map((w, i) => ({ x: i, y: w.avg_ctr }));
					const slope = linearRegressionSlope(points);
					const status = classifyMomentum(slope);

					// Use most recent week's values for display
					const latest = sorted[sorted.length - 1];

					computed.push({
						query: group.query,
						page: group.page,
						avg_ctr: latest.avg_ctr,
						avg_position: latest.avg_position,
						slope,
						status,
						total_clicks: latest.total_clicks,
						total_impressions: latest.total_impressions
					});
				}

				// Fetch workspace IDs for queries that match a Sharkly page keyword
				// so the "Optimize Title" CTA can navigate directly to the workspace
				const keywords = computed.map((s) => s.query);
				const { data: pageMatches } = await supabase
					.from('pages')
					.select('id, keyword')
					.eq('site_id', siteId)
					.in('keyword', keywords);

				if (!cancelled && pageMatches) {
					const keywordToWorkspace = new Map(
						pageMatches.map((p: { id: string; keyword: string }) => [p.keyword, p.id])
					);
					for (const signal of computed) {
						const wsId = keywordToWorkspace.get(signal.query);
						if (wsId) signal.workspaceId = wsId;
					}
				}

				if (cancelled) return;

				// Sort by total_impressions desc so highest-traffic queries show first,
				// then cap at limit
				const sorted = computed
					.sort((a, b) => b.total_impressions - a.total_impressions)
					.slice(0, limit);

				setSignals(sorted);
			} catch (err) {
				if (!cancelled) {
					setError(err instanceof Error ? err.message : 'Failed to load CTR trends');
					setSignals([]);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		fetchSignals();

		return () => {
			cancelled = true;
		};
	}, [siteId, enabled, limit, tick]);

	return { signals, loading, error, refetch };
}
