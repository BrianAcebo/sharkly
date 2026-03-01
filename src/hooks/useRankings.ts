import { useState, useEffect } from 'react';

interface RankingData {
	keyword: string;
	pageUrl: string;
	clicks: number;
	impressions: number;
	ctr: number;
	position: number;
	change: number; // position change vs previous period
	momentum: 'building' | 'flat' | 'declining';
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

			const response = await fetch(
				`/api/rankings/${siteId}?days=${days}&sortBy=${sortBy}&order=${order}`
			);

			if (!response.ok) {
				throw new Error('Failed to fetch rankings');
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
	}, [siteId, days, sortBy, order, enabled]);

	return {
		rankings,
		loading,
		error,
		refetch: fetchRankings
	};
}
