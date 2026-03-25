import { useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api';

export type ExtractedEntity = {
	entity_type: 'email' | 'phone' | 'domain' | 'ip' | 'url' | 'social_profile' | 'username' | string;
	value_normalized: string;
	mention_count: number;
	latest_seen: string | null;
	docs: Array<{ document_id: string; url: string | null; title: string | null; content_type: string | null }>;
	snippets: string[];
};

export function useExtractedEntities(runId: string | null) {
	const [items, setItems] = useState<ExtractedEntity[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [search, setSearch] = useState('');
	// remove a single candidate locally (used after promote/ignore)
	const removeCandidate = (entity_type: string, value_normalized: string) => {
		setItems((prev) =>
			prev.filter(
				(it) =>
					it.entity_type.toLowerCase() !== entity_type.toLowerCase() ||
					it.value_normalized.toLowerCase() !== value_normalized.toLowerCase()
			)
		);
	};

	useEffect(() => {
		if (!runId) {
			setItems([]);
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				setLoading(true);
				setError(null);
				const resp = await api.get(`/api/runs/${encodeURIComponent(runId)}/extracted-entities`);
				if (!resp.ok) {
					const txt = await resp.text();
					throw new Error(txt || `Failed to load extracted entities (HTTP ${resp.status})`);
				}
				const data = (await resp.json()) as { ok: boolean; items?: ExtractedEntity[]; error?: { message?: string } };
				if (!data.ok) throw new Error(data.error?.message || 'Failed to load extracted entities');
				if (!cancelled) setItems(data.items ?? []);
			} catch (e) {
				if (!cancelled) setError(e instanceof Error ? e.message : String(e));
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [runId]);

	const filtered = useMemo(() => {
		if (!search.trim()) return items;
		const q = search.trim().toLowerCase();
		return items.filter((it) => it.value_normalized.toLowerCase().includes(q));
	}, [items, search]);

	const grouped = useMemo(() => {
		const g: Record<string, ExtractedEntity[]> = {
			all: filtered.slice(),
			email: [],
			domain: [],
			social_profile: [],
			phone: [],
			ip: []
		};
		for (const it of filtered) {
			const t = it.entity_type.toLowerCase();
			if (t in g) g[t].push(it);
		}
		return g;
	}, [filtered]);

	return { items, loading, error, search, setSearch, grouped, removeCandidate };
}

export default useExtractedEntities;


