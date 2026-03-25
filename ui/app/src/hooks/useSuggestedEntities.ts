import { useEffect, useMemo, useState } from 'react';
import { api } from '../utils/api';

export type SuggestedEntity = {
  entity_type: 'email' | 'phone' | 'domain' | 'ip' | 'social_profile' | 'username' | string;
  value_normalized: string;
  mention_count: number;
  latest_seen: string | null;
  docs: Array<{ document_id: string; url: string | null; title: string | null; content_type: string | null }>;
  snippets: string[];
};

type Groups = {
  all: SuggestedEntity[];
  email: SuggestedEntity[];
  domain: SuggestedEntity[];
  social_profile: SuggestedEntity[];
  phone: SuggestedEntity[];
  ip: SuggestedEntity[];
  username: SuggestedEntity[];
};

export function useSuggestedEntities(runId: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SuggestedEntity[]>([]);

  const fetchAll = async () => {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get(`/api/runs/${encodeURIComponent(runId)}/suggested-entities`);
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `Failed to load suggested entities (HTTP ${resp.status})`);
      }
      const data = (await resp.json()) as {
        runId: string;
        groups: {
          email: SuggestedEntity[];
          domain: SuggestedEntity[];
          social_profile: SuggestedEntity[];
          phone: SuggestedEntity[];
          ip: SuggestedEntity[];
          username: SuggestedEntity[];
        };
      };
      const merged: SuggestedEntity[] = [
        ...data.groups.email,
        ...data.groups.domain,
        ...data.groups.social_profile,
        ...data.groups.phone,
        ...data.groups.ip,
        ...data.groups.username
      ];
      setItems(merged);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const groups: Groups = useMemo(() => {
    const g: Groups = { all: [], email: [], domain: [], social_profile: [], phone: [], ip: [], username: [] };
    for (const it of items) {
      g.all.push(it);
      const t = it.entity_type.toLowerCase();
      if (t in g) (g as any)[t].push(it);
    }
    const sort = (a: SuggestedEntity, b: SuggestedEntity) => {
      const dcA = a.docs.length;
      const dcB = b.docs.length;
      if (dcB !== dcA) return dcB - dcA;
      if (b.mention_count !== a.mention_count) return b.mention_count - a.mention_count;
      const la = a.latest_seen ?? '';
      const lb = b.latest_seen ?? '';
      return lb.localeCompare(la);
    };
    (Object.keys(g) as Array<keyof Groups>).forEach((k) => {
      g[k] = g[k].slice().sort(sort);
    });
    return g;
  }, [items]);

  const removeCandidate = (entity_type: string, value_normalized: string) => {
    setItems((prev) =>
      prev.filter(
        (it) => !(it.entity_type.toLowerCase() === entity_type.toLowerCase() && it.value_normalized.toLowerCase() === value_normalized.toLowerCase())
      )
    );
  };

  const promote = async (runId: string, entity_type: string, value_normalized: string) => {
    removeCandidate(entity_type, value_normalized);
    try {
      await api.post(`/api/runs/${encodeURIComponent(runId)}/promote-entity`, {
        entity_type,
        value_normalized
      });
    } catch {
      // swallow for now; optimistic removal
    }
  };

  const ignore = async (runId: string, entity_type: string, value_normalized: string) => {
    removeCandidate(entity_type, value_normalized);
    try {
      await api.post(`/api/runs/${encodeURIComponent(runId)}/mention-decision`, {
        entity_type,
        value_normalized,
        decision: 'ignored' as const
      });
    } catch {
      // swallow
    }
  };

  return { loading, error, groups, promote, ignore, refetch: fetchAll };
}

export default useSuggestedEntities;


