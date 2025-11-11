import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useAuth } from '../../contexts/AuthContext';
import useDebounce from '../../hooks/useDebounce';
import { searchLeaks, createLeak } from '../../api/leaks';
import type { LeakSearchResult } from '../../types/leak';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export default function LeaksPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LeakSearchResult[]>([]);
  const debounced = useDebounce(q, 350);
  const [createOpen, setCreateOpen] = useState(false);
  const [source, setSource] = useState('');
  const [snippet, setSnippet] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    let active = true;
    async function run() {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const rows = await searchLeaks(user.organization_id, debounced, 24);
        if (!active) return;
        setResults(rows);
      } finally {
        if (active) setLoading(false);
      }
    }
    run();
    return () => {
      active = false;
    };
  }, [user?.organization_id, debounced]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageMeta title="Leaks" description="Leaks directory" noIndex />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Leaks</h1>
        <div className="flex items-center gap-2">
          <div className="w-full max-w-sm">
            <Input placeholder="Search leaks…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} title="Create leak">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : results.length === 0 ? (
        <div className="text-sm text-muted-foreground">No leaks found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {results.map((l) => (
            <Card key={l.id} className="cursor-pointer" onClick={() => navigate(`/leaks/${l.id}`)}>
              <CardHeader>
                <div className="font-medium">{l.source}</div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground truncate">{l.content_snippet ?? '—'}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create leak</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Source (e.g., breach name)" value={source} onChange={(e) => setSource(e.target.value)} />
            <Input placeholder="Snippet (optional)" value={snippet} onChange={(e) => setSnippet(e.target.value)} />
            <Input placeholder="URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!user?.organization_id) return;
                  if (!source.trim()) {
                    toast.error('Source is required.');
                    return;
                  }
                  try {
                    const created = await createLeak({
                      organization_id: user.organization_id,
                      source: source.trim(),
                      content_snippet: snippet.trim() || null,
                      found_emails: [],
                      found_usernames: [],
                      found_password_hashes: [],
                      retrieved_at: null,
                      url: url.trim() || null,
                      metadata: {}
                    });
                    toast.success('Leak created.');
                    setCreateOpen(false);
                    navigate(`/leaks/${created.leak.id}`);
                  } catch (e) {
                    console.error('Failed to create leak', e);
                    toast.error('Failed to create leak.');
                  }
                }}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


