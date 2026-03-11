import { useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from '../utils/urls';
import { supabase } from '../utils/supabaseClient';

async function getAuthHeaders(): Promise<HeadersInit> {
	const { data: { session } } = await supabase.auth.getSession();
	return {
		'Content-Type': 'application/json',
		...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
	};
}

export type PriorityCategory = 'high' | 'medium' | 'keep_going';

export type PriorityItem = {
	id: string;
	title: string;
	description: string;
	category: PriorityCategory;
	actionUrl: string;
	actionLabel: string;
	score: number;
};

/** S2-16: Publishing cadence from priority stack API */
export type PublishingCadence = {
	stage: 1 | 2 | 3 | 4;
	stageLabel: string;
	recommendedMin: number;
	recommendedMax: number;
	publishedThisMonth: number;
	onTrack: boolean;
	message: string;
};

export function useWeeklyPriorityStack(siteId: string | null) {
	const [items, setItems] = useState<PriorityItem[]>([]);
	const [cadence, setCadence] = useState<PublishingCadence | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchStack = useCallback(async () => {
		if (!siteId) {
			setItems([]);
			setCadence(null);
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const headers = await getAuthHeaders();
			const res = await fetch(buildApiUrl(`/api/priority-stack?siteId=${encodeURIComponent(siteId)}`), {
				headers
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err?.error ?? `HTTP ${res.status}`);
			}
			const data = (await res.json()) as { items: PriorityItem[]; cadence?: PublishingCadence };
			setItems(data.items ?? []);
			setCadence(data.cadence ?? null);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load priorities');
			setItems([]);
			setCadence(null);
		} finally {
			setLoading(false);
		}
	}, [siteId]);

	useEffect(() => {
		fetchStack();
	}, [fetchStack]);

	return { items, cadence, loading, error, refetch: fetchStack };
}
