import * as React from 'react';
import ComponentCard from '../common/ComponentCard';
import { supabase } from '../../utils/supabaseClient';

type Mention = {
  title: string | null;
  link: string | null;
  snippet?: string | null;
  displayLink?: string | null;
  favicon?: string | null;
  image?: string | null;
  source?: string | null;
  retrieved_at?: string | null;
};

export default function CaseWebMentions({ personId }: { personId: string | null }) {
  const [mentions, setMentions] = React.useState<Mention[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const pageSize = 6;

  React.useEffect(() => {
    (async () => {
      if (!personId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.from('people').select('web_mentions').eq('id', personId).single();
        if (error) throw error;
        setMentions((data?.web_mentions as Mention[]) || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [personId]);

  if (!personId) return null;

  const totalPages = Math.max(1, Math.ceil(mentions.length / pageSize));
  const visible = mentions.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

  return (
    <ComponentCard>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Web Mentions</h3>
        {mentions.length > 0 && (
          <span className="text-xs text-gray-500">{mentions.length} saved</span>
        )}
      </div>
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : mentions.length === 0 ? (
        <div className="text-sm text-gray-500">No web mentions saved for this subject.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {visible.map((m, idx) => (
            <a key={(m.link ?? 'm') + idx} className="flex gap-3 rounded border p-3 hover:bg-gray-50 dark:hover:bg-gray-800" href={m.link ?? undefined} target="_blank" rel="noopener noreferrer">
              {m.image ? (
                <img src={m.image} alt="" className="h-12 w-12 rounded object-cover" />
              ) : (
                <div className="h-12 w-12 rounded bg-gray-200 dark:bg-gray-700" />
              )}
              <div className="flex-1">
                <div className="text-sm font-medium line-clamp-2">{m.title || m.link || 'Untitled result'}</div>
                <div className="text-xs text-gray-500">{m.displayLink || m.link}</div>
                {m.snippet && <div className="mt-1 line-clamp-3 text-xs text-gray-600 dark:text-gray-400">{m.snippet}</div>}
              </div>
            </a>
          ))}
        </div>
      )}
      {mentions.length > pageSize && (
        <div className="mt-3 flex items-center justify-between">
          <button className="text-sm text-gray-600 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button className="text-sm text-gray-600 disabled:opacity-50" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </button>
        </div>
      )}
    </ComponentCard>
  );
}


