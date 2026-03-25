/**
 * S1-1. Content Refresh Queue — product-gaps-master.md V1.6
 * Pages where last_updated_meaningful > 6 months AND GSC position/impressions trending down.
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

export type RefreshQueueItem = {
	pageId: string;
	title: string;
	keyword: string;
	publishedUrl: string;
	impressions: number;
	position: number;
	positionTrend: 'declining' | 'stable' | 'improving';
	impressionsTrend: 'declining' | 'stable' | 'improving';
	monthsStale: number;
};

export function useRefreshQueue(siteId: string | null, enabled = true) {
	const [items, setItems] = useState<RefreshQueueItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchQueue = useCallback(async () => {
		if (!siteId || !enabled) {
			setItems([]);
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const res = await api.get(`/api/sites/${siteId}/refresh-queue`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
			}
			const data = (await res.json()) as { items: RefreshQueueItem[] };
			setItems(data.items ?? []);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load refresh queue');
			setItems([]);
		} finally {
			setLoading(false);
		}
	}, [siteId, enabled]);

	useEffect(() => {
		fetchQueue();
	}, [fetchQueue]);

	return { items, loading, error, refetch: fetchQueue };
}
