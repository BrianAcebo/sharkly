import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useAuth } from '../../contexts/AuthContext';
import useDebounce from '../../hooks/useDebounce';
import { searchEmails, createEmail } from '../../api/emails';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export default function EmailsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; address: string; domain: string | null }>>([]);
  const debounced = useDebounce(q, 350);
  const [createOpen, setCreateOpen] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [alsoCreateDomain, setAlsoCreateDomain] = useState(false);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const rows = await searchEmails(user.organization_id, debounced, 24);
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
      <PageMeta title="Emails" description="Emails directory" noIndex />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Emails</h1>
        <div className="flex items-center gap-2">
          <div className="w-full max-w-sm">
            <Input placeholder="Search emails…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} title="Create email">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : results.length === 0 ? (
        <div className="text-sm text-muted-foreground">No emails found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {results.map((e) => (
            <Card key={e.id} className="cursor-pointer" onClick={() => navigate(`/emails/${e.id}`)}>
              <CardHeader>
                <div className="font-medium">{e.address}</div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">{e.domain ?? '—'}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="address@example.com" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!user?.organization_id) return;
                  const addr = newAddress.trim();
                  if (!addr || !addr.includes('@')) {
                    toast.error('Enter a valid email.');
                    return;
                  }
                  try {
                    const created = await createEmail({
                      organization_id: user.organization_id,
                      address: addr,
                      domain: addr.split('@')[1] ?? null
                    });
                    if (alsoCreateDomain) {
                      try {
                        const { createDomain, attachEmailToDomain } = await import('../../api/domains');
                        const domainName = (addr.split('@')[1] ?? '').trim().toLowerCase();
                        if (domainName) {
                          const d = await createDomain({ organization_id: user.organization_id, name: domainName });
                          await attachEmailToDomain(created.id, d.id, { transform_type: 'manual_create' });
                        }
                      } catch (e) {
                        console.error('Failed to create/link domain', e);
                      }
                    }
                    toast.success('Email created.');
                    setCreateOpen(false);
                    navigate(`/emails/${created.id}`);
                  } catch (e) {
                    console.error('Failed to create email', e);
                    toast.error('Failed to create email.');
                  }
                }}
              >
                Create
              </Button>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                id="also-create-domain"
                type="checkbox"
                checked={alsoCreateDomain}
                onChange={(e) => setAlsoCreateDomain(e.target.checked)}
              />
              <label htmlFor="also-create-domain" className="text-sm text-muted-foreground">
                Also create domain from this address
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


