import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { buildApiUrl } from '../utils/urls';
import type { Topic } from './useTopics';

async function getAuthHeaders(): Promise<HeadersInit> {
	const { data: { session } } = await supabase.auth.getSession();
	return {
		...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
	};
}

function mapRowToTopic(row: {
	id: string;
	clusterId?: string | null;
	title: string;
	keyword: string;
	volume: number;
	kd: number;
	cpc: number;
	funnel: string;
	authorityFit: string;
	status: string;
	priority: number;
	reasoning: string;
	kgrScore?: number | null;
	targetId?: string | null;
}): Topic {
	return {
		id: row.id,
		clusterId: row.clusterId ?? null,
		targetId: row.targetId ?? null,
		title: row.title,
		keyword: row.keyword,
		volume: row.volume ?? 0,
		kd: row.kd ?? 0,
		cpc: row.cpc ?? 0,
		funnel: (row.funnel as Topic['funnel']) ?? 'mofu',
		authorityFit: (row.authorityFit as Topic['authorityFit']) ?? 'achievable',
		status: (row.status as Topic['status']) ?? 'queued',
		priority: row.priority ?? 0,
		reasoning: row.reasoning ?? '',
		kgrScore: row.kgrScore != null ? row.kgrScore : null
	};
}

/**
 * Fetch topics for a specific target.
 * When targetId is null, returns empty (use useTopics(siteId) for site-level aggregation).
 */
export function useTargetTopics(targetId: string | null) {
	const [topics, setTopics] = useState<Topic[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refetch = useCallback(async () => {
		if (!targetId) {
			setTopics([]);
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const headers = await getAuthHeaders();
			const res = await fetch(buildApiUrl(`/api/targets/${targetId}/topics`), { headers });
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(err?.error ?? 'Failed to load topics');
			}
			const data = (await res.json()) as Array<Parameters<typeof mapRowToTopic>[0]>;
			setTopics((Array.isArray(data) ? data : []).map(mapRowToTopic));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load topics');
			setTopics([]);
		} finally {
			setLoading(false);
		}
	}, [targetId]);

	useEffect(() => {
		refetch();
	}, [refetch]);

	const deleteTopic = useCallback(async (topicId: string): Promise<{ error: string | null }> => {
		if (!targetId) return { error: 'No target selected' };
		const { error: deleteError, count } = await supabase
			.from('topics')
			.delete({ count: 'exact' })
			.eq('id', topicId)
			.eq('target_id', targetId);
		if (deleteError) {
			console.error('[useTargetTopics] deleteTopic error:', deleteError);
			return { error: deleteError.message };
		}
		if (count === 0) {
			console.warn('[useTargetTopics] deleteTopic: 0 rows deleted — RLS may have blocked it');
			return { error: 'Could not delete topic — permission denied' };
		}
		setTopics((prev) => prev.filter((t) => t.id !== topicId));
		return { error: null };
	}, [targetId]);

	const moveTopic = useCallback(
		async (topicId: string, destinationTargetId: string): Promise<{ error: string | null }> => {
			if (!targetId) return { error: 'No target selected' };
			try {
				const headers = await getAuthHeaders();
				const res = await fetch(buildApiUrl(`/api/targets/${targetId}/topics/${topicId}/move`), {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', ...headers },
					body: JSON.stringify({ destinationTargetId })
				});
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				if (!res.ok) return { error: data?.error ?? 'Failed to move topic' };
				setTopics((prev) => prev.filter((t) => t.id !== topicId));
				return { error: null };
			} catch (err) {
				return { error: err instanceof Error ? err.message : 'Failed to move topic' };
			}
		},
		[targetId]
	);

	return { topics, loading, error, refetch, deleteTopic, moveTopic };
}
