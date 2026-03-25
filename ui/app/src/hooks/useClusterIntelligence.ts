import { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

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
			const res = await api.get(`/api/clusters/${clusterId}/intelligence`);
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
