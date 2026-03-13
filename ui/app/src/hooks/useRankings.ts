import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { api } from '../utils/api';

/**
 * Momentum status — matches MomentumStatus in useNavboostSignals.ts
 * and rankingsController linear regression output.
 * 'weakening' is the correct term per spec §17.2 — never 'declining'.
 */
export type MomentumStatus = 'building' | 'flat' | 'weakening';

export interface RankingData {
	keyword: string;
	pageUrl: string;
	clicks: number;
	impressions: number;
	ctr: number;
	position: number;
	/** Position change vs previous period — calculated in rankingsController */
	change: number;
	/** 4-week CTR trend from navboost_signals linear regression */
	momentum: MomentumStatus;
}

interface UseRankingsProps {
	siteId: string | undefined;
	days?: number;
	sortBy?: 'keyword' | 'position' | 'clicks' | 'impressions' | 'ctr';
	order?: 'asc' | 'desc';
	enabled?: boolean;
}

interface UseRankingsReturn {
	rankings: RankingData[];
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

export function useRankings({
	siteId,
	days = 30,
	sortBy = 'impressions',
	order = 'desc',
	enabled = true
}: UseRankingsProps): UseRankingsReturn {
	const [rankings, setRankings] = useState<RankingData[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchRankings = async () => {
		if (!siteId || !enabled) return;

		try {
			setLoading(true);
			setError(null);

			const { data: { session } } = await supabase.auth.getSession();
			if (!session?.access_token) {
				setError('Not authenticated');
				return;
			}

			const response = await api.get(
				`/api/rankings/${siteId}?days=${days}&sortBy=${sortBy}&order=${order}`,
				{ headers: { Authorization: `Bearer ${session.access_token}` } }
			);

			if (!response.ok) {
				const errData = await response.json().catch(() => ({}));
				if (response.status === 403 && errData.code === 'tier_required') {
					throw new Error('Growth plan or higher required');
				}
				throw new Error(errData.error || 'Failed to fetch rankings');
			}

			const data = await response.json();
			setRankings(data.data || []);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Unknown error';
			setError(errorMessage);
			console.error('Error fetching rankings:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRankings();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [siteId, days, sortBy, order, enabled]);

	return {
		rankings,
		loading,
		error,
		refetch: fetchRankings
	};
}
