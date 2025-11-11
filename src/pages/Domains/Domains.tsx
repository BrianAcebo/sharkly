import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import ComponentCard from '../../components/common/ComponentCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { searchDomains, createDomain } from '../../api/domains';
import { Plus } from 'lucide-react';
import PageMeta from '../../components/common/PageMeta';

export default function DomainsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const rows = await searchDomains(user.organization_id, query, 50);
        if (!cancelled) setItems(rows);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [user?.organization_id, query]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageMeta title="Domains" description="Domains directory" noIndex />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Domains</h1>
        <div className="flex items-center gap-2">
          <div className="w-full max-w-sm">
            <Input placeholder="Search domains…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} title="Create domain">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {loading ? (
          <div>Loading…</div>
        ) : (
          items.map((d) => (
            <ComponentCard key={d.id}>
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium">{d.name}</div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/domains/${d.id}`)}>
                  View
                </Button>
              </div>
            </ComponentCard>
          ))
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Domain name</label>
              <Input placeholder="example.com" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!user?.organization_id) return;
                  const name = newName.trim().toLowerCase();
                  if (!name || !name.includes('.')) {
                    toast.error('Enter a valid domain.');
                    return;
                  }
                  try {
                    const d = await createDomain({ organization_id: user.organization_id, name });
                    toast.success('Domain created');
                    setCreateOpen(false);
                    navigate(`/domains/${d.id}`);
                  } catch (e) {
                    console.error('Failed to create domain', e);
                    toast.error('Failed to create domain.');
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


