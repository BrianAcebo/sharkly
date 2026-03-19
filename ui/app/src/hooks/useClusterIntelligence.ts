import { useState, useEffect, useCallback } from 'react';
import { buildApiUrl } from '../utils/urls';
import { supabase } from '../utils/supabaseClient';

async function getAuthHeaders(): Promise<HeadersInit> {
	const {
		data: { session }
	} = await supabase.auth.getSession();
	return {
		'Content-Type': 'application/json',
		...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
	};
}

export type ClusterWarning = {
	type: string;
	severity: 'high' | 'medium' | 'low';
	message: string;
	action: string;
	affectedPages: string[];
	/** How we assess this — e.g. for live-URL checks */
	assessmentNote?: string;
};

export type ClusterIntelligence = {
	evaluated_at: string;
	architecture: 'A' | 'B';
	warnings: ClusterWarning[];
	health: {
		label: 'Strong' | 'Needs Work' | 'Critical Issues';
		color: 'green' | 'amber' | 'red';
		score: number;
	};
};

export function useClusterIntelligence(clusterId: string | null) {
	const [intelligence, setIntelligence] = useState<ClusterIntelligence | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchIntelligence = useCallback(async () => {
		if (!clusterId) {
			setIntelligence(null);
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const headers = await getAuthHeaders();
			const res = await fetch(buildApiUrl(`/api/clusters/${clusterId}/intelligence`), {
				headers
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body?.error?.message || `HTTP ${res.status}`);
			}
			const data = (await res.json()) as ClusterIntelligence;
			setIntelligence(data);
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Failed to load cluster health';
			setError(msg);
			setIntelligence(null);
		} finally {
			setLoading(false);
		}
	}, [clusterId]);

	useEffect(() => {
		fetchIntelligence();
	}, [fetchIntelligence]);

	return { intelligence, loading, error, refetch: fetchIntelligence };
}
