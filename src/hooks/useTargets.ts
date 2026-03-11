import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';
import { buildApiUrl } from '../utils/urls';
import type { Target, CreateTargetInput, UpdateTargetInput } from '../types/target';

function mapApiToTarget(raw: {
	id: string;
	siteId: string;
	name: string;
	destinationPageUrl: string | null;
	destinationPageLabel: string | null;
	seedKeywords: string[];
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}): Target {
	return {
		id: raw.id,
		siteId: raw.siteId,
		name: raw.name,
		destinationPageUrl: raw.destinationPageUrl ?? null,
		destinationPageLabel: raw.destinationPageLabel ?? null,
		seedKeywords: Array.isArray(raw.seedKeywords) ? raw.seedKeywords : [],
		sortOrder: raw.sortOrder ?? 0,
		createdAt: raw.createdAt,
		updatedAt: raw.updatedAt
	};
}

async function getAuthHeaders(): Promise<HeadersInit> {
	const { data: { session } } = await supabase.auth.getSession();
	return {
		'Content-Type': 'application/json',
		...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
	};
}

export function useTargets(siteId: string | null) {
	const [targets, setTargets] = useState<Target[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refetch = useCallback(async () => {
		if (!siteId) {
			setTargets([]);
			setLoading(false);
			return;
		}
		try {
			setLoading(true);
			setError(null);
			const headers = await getAuthHeaders();
			const res = await fetch(buildApiUrl(`/api/sites/${siteId}/targets`), { headers });
			if (!res.ok) {
				const err = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(err?.error ?? 'Failed to load targets');
			}
			const data = (await res.json()) as Array<{
				id: string;
				siteId: string;
				name: string;
				destinationPageUrl: string | null;
				destinationPageLabel: string | null;
				seedKeywords: string[];
				sortOrder: number;
				createdAt: string;
				updatedAt: string;
			}>;
			setTargets((Array.isArray(data) ? data : []).map(mapApiToTarget));
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load targets');
			setTargets([]);
		} finally {
			setLoading(false);
		}
	}, [siteId]);

	useEffect(() => {
		refetch();
	}, [refetch]);

	const createTarget = useCallback(
		async (input: CreateTargetInput): Promise<{ target: Target | null; error: string | null }> => {
			if (!siteId) return { target: null, error: 'No site selected' };
			try {
				const headers = await getAuthHeaders();
				const res = await fetch(buildApiUrl(`/api/sites/${siteId}/targets`), {
					method: 'POST',
					headers,
					body: JSON.stringify(input)
				});
				const data = (await res.json().catch(() => ({}))) as {
					id?: string;
					siteId?: string;
					name?: string;
					destinationPageUrl?: string | null;
					destinationPageLabel?: string | null;
					seedKeywords?: string[];
					sortOrder?: number;
					createdAt?: string;
					updatedAt?: string;
					error?: string;
				};
				if (!res.ok) throw new Error(data?.error ?? 'Failed to create target');
				const target = mapApiToTarget(data as Parameters<typeof mapApiToTarget>[0]);
				setTargets((prev) => [...prev, target].sort((a, b) => a.sortOrder - b.sortOrder));
				return { target, error: null };
			} catch (err) {
				return {
					target: null,
					error: err instanceof Error ? err.message : 'Failed to create target'
				};
			}
		},
		[siteId]
	);

	const updateTarget = useCallback(
		async (targetId: string, input: UpdateTargetInput): Promise<{ error: string | null }> => {
			try {
				const headers = await getAuthHeaders();
				const res = await fetch(buildApiUrl(`/api/targets/${targetId}`), {
					method: 'PATCH',
					headers,
					body: JSON.stringify(input)
				});
				const data = (await res.json().catch(() => ({}))) as { error?: string } & Parameters<typeof mapApiToTarget>[0];
				if (!res.ok) throw new Error(data?.error ?? 'Failed to update target');
				const target = mapApiToTarget(data);
				setTargets((prev) =>
					prev.map((t) => (t.id === targetId ? target : t)).sort((a, b) => a.sortOrder - b.sortOrder)
				);
				return { error: null };
			} catch (err) {
				return {
					error: err instanceof Error ? err.message : 'Failed to update target'
				};
			}
		},
		[]
	);

	const deleteTarget = useCallback(async (targetId: string): Promise<{ error: string | null }> => {
		try {
			const headers = await getAuthHeaders();
			const res = await fetch(buildApiUrl(`/api/targets/${targetId}`), {
				method: 'DELETE',
				headers
			});
			if (!res.ok) {
				const data = (await res.json().catch(() => ({}))) as { error?: string };
				throw new Error(data?.error ?? 'Failed to delete target');
			}
			setTargets((prev) => prev.filter((t) => t.id !== targetId));
			return { error: null };
		} catch (err) {
			return {
				error: err instanceof Error ? err.message : 'Failed to delete target'
			};
		}
	}, []);

	return { targets, loading, error, refetch, createTarget, updateTarget, deleteTarget };
}
