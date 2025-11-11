import ComponentCard from './ComponentCard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { searchDomains, createDomain, attachEmailToDomain, attachDomainToBusiness } from '../../api/domains';
import { Link2Off, Globe, Pencil } from 'lucide-react';

export type LinkedDomainItem = {
  id: string;
  name: string;
  linkTo: string;
  transformType?: string | null;
  confidenceScore?: number | null;
  retrievedAt?: string | null;
  sourceApi?: string | null;
  sourceUrl?: string | null;
};

export default function LinkedDomainsCard({
  title = 'Domains',
  items,
  onUnlink,
  displayName,
  ownerId,
  organizationId,
  ownerType = 'business',
  onAttached
}: {
  title?: string;
  items: LinkedDomainItem[];
  onUnlink: (domainId: string) => void | Promise<void>;
  displayName?: string;
  ownerId: string;
  organizationId: string;
  ownerType?: 'business' | 'email';
  onAttached?: (domain: { id: string; name: string }) => void;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const runSearch = async (v: string) => {
    if (!organizationId || v.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await searchDomains(organizationId, v, 10);
      setResults(rows);
    } finally {
      setLoading(false);
    }
  };

  const attach = async (domainId: string, name: string, transform: 'manual_link' | 'manual_create' = 'manual_link') => {
    if (ownerType === 'email') {
      await attachEmailToDomain(ownerId, domainId, { transform_type: transform });
    } else {
      await attachDomainToBusiness(ownerId, domainId, { transform_type: transform });
    }
    onAttached?.({ id: domainId, name });
    toast.success('Domain linked');
  };

  const createAndAttach = async () => {
    const name = newName.trim().toLowerCase();
    if (!name || !name.includes('.')) {
      toast.error('Enter a valid domain (e.g., example.com).');
      return;
    }
    setCreating(true);
    try {
      const d = await createDomain({ organization_id: organizationId, name });
      await attach(d.id, name, 'manual_create');
      setManageOpen(false);
      setQuery('');
      setNewName('');
    } catch (err) {
      console.error('Failed to create domain', err);
      toast.error('Failed to create domain.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <ComponentCard>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button size="sm" variant="outline" onClick={() => setManageOpen(true)}>
          <Pencil className="size-4" />
        </Button>
      </div>
      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No domains linked.</p>
        ) : (
          items.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                  <Globe className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                </div>
                <div>
                  <Link to={d.linkTo} className="group text-base font-medium text-blue-600 hover:underline">
                    {d.name}
                  </Link>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {d.transformType ? <span className="rounded border px-2 py-0.5">{d.transformType}</span> : null}
                    {d.confidenceScore != null ? <span className="ml-2">Confidence: {(d.confidenceScore * 100).toFixed(0)}%</span> : null}
                    {d.retrievedAt ? <span className="ml-2">Retrieved: {new Date(d.retrievedAt).toLocaleString()}</span> : null}
                    {d.sourceApi ? <span className="ml-2">via {d.sourceApi}</span> : null}
                    {d.sourceUrl ? (
                      <span className="ml-2">
                        <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">
                          source
                        </a>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => onUnlink(d.id)} title="Unlink">
                  <Link2Off className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Manage Dialog */}
      <div className={manageOpen ? '' : 'hidden'}>
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setManageOpen(false)} />
        <div className="fixed left-1/2 top-1/2 z-50 w-[min(700px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-xl">
          <div className="mb-3 text-lg font-semibold">Manage domains</div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Search and attach</div>
                <Input
                  placeholder="Search domain…"
                  value={query}
                  onChange={async (e) => {
                    const v = e.target.value;
                    setQuery(v);
                    await runSearch(v);
                  }}
                />
              </div>
              <div className="max-h-72 space-y-2 overflow-auto">
                {loading ? (
                  <div className="text-muted-foreground text-sm">Searching…</div>
                ) : (
                  results.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded border p-3">
                      <div className="text-sm font-medium">{r.name}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await attach(r.id, r.name, 'manual_link');
                          } catch (err) {
                            console.error('Failed to link domain', err);
                            toast.error('Failed to link domain.');
                          }
                        }}
                      >
                        Attach
                      </Button>
                    </div>
                  ))
                )}
              </div>
              {items.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-sm font-medium">Currently linked</div>
                  <div className="space-y-2">
                    {items.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded border p-3">
                        <Link to={e.linkTo} className="text-sm font-medium hover:underline">
                          {e.name}
                        </Link>
                        <Button size="sm" variant="ghost" onClick={() => onUnlink(e.id)}>
                          Unlink
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            {ownerType === 'business' ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Create new domain</div>
                  <Input placeholder="example.com" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  <div className="bg-muted/40 text-muted-foreground rounded-md border border-dashed p-3 text-xs">
                    This domain will be created and automatically linked to{' '}
                    <span className="text-foreground font-medium">{displayName ?? 'selection'}</span>.
                  </div>
                </div>
                <Button onClick={createAndAttach} disabled={creating}>
                  {creating ? 'Creating…' : 'Create domain'}
                </Button>
              </div>
            ) : null}
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={() => setManageOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}
// (Note: duplicate implementation removed)
