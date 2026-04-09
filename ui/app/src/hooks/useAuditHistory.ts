import { useCallback, useEffect, useState } from 'react';
import { api } from '../utils/api';
import { supabase } from '../utils/supabaseClient';
import type { AuditHistoryItem } from './useAudit';

/**
 * Lightweight history-only fetch for dashboard / summary UIs (no full audit payload).
 */
export function useAuditHistory(siteId: string | undefined, limit = 5) {
	const [history, setHistory] = useState<AuditHistoryItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refetch = useCallback(async () => {
		if (!siteId) {
			setHistory([]);
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const {
				data: { session }
			} = await supabase.auth.getSession();
			if (!session?.access_token) {
				setHistory([]);
				return;
			}
			const response = await api.get(`/api/audit/${siteId}/history`, {
				headers: { Authorization: `Bearer ${session.access_token}` }
			});
			if (!response.ok) throw new Error('Failed to load reports');
			const data = (await response.json()) as { audits?: AuditHistoryItem[] };
			const rows = data.audits ?? [];
			setHistory(rows.slice(0, limit));
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Failed to load');
			setHistory([]);
		} finally {
			setLoading(false);
		}
	}, [siteId, limit]);

	useEffect(() => {
		refetch();
	}, [refetch]);

	return { history, loading, error, refetch };
}
