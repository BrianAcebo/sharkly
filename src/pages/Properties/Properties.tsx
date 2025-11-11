import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useAuth } from '../../contexts/AuthContext';
import useDebounce from '../../hooks/useDebounce';
import { listProperties, createProperty } from '../../api/properties';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import type { PropertyRecord } from '../../types/property';

export default function PropertiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PropertyRecord[]>([]);
  const debounced = useDebounce(q, 350);
  const [createOpen, setCreateOpen] = useState(false);
  const [address, setAddress] = useState('');

  useEffect(() => {
    let active = true;
    async function run() {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const { results: rows } = await listProperties(user.organization_id, debounced, 1, 24);
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
      <PageMeta title="Properties" description="Properties directory" noIndex />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
        <div className="flex items-center gap-2">
          <div className="w-full max-w-sm">
            <Input placeholder="Search properties…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} title="Create property">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : results.length === 0 ? (
        <div className="text-sm text-muted-foreground">No properties found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {results.map((p) => (
            <Card key={p.id} className="cursor-pointer" onClick={() => navigate(`/properties/${p.id}`)}>
              <CardHeader>
                <div className="font-medium">{p.address_full || p.id}</div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">Property</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create property</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!user?.organization_id) return;
                  if (!address.trim()) {
                    toast.error('Address is required.');
                    return;
                  }
                  try {
                    const created = await createProperty({
                      organization_id: user.organization_id,
                      address_full: address.trim()
                    } as any);
                    toast.success('Property created.');
                    setCreateOpen(false);
                    navigate(`/properties/${created.id}`);
                  } catch (e) {
                    console.error('Failed to create property', e);
                    toast.error('Failed to create property.');
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


