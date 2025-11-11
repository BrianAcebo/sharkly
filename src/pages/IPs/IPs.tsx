import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useAuth } from '../../contexts/AuthContext';
import useDebounce from '../../hooks/useDebounce';
import { searchIPs, createIP } from '../../api/ips';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

export default function IPsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; address: string }>>([]);
  const debounced = useDebounce(q, 350);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [asn, setAsn] = useState('');
  const [org, setOrg] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const rows = await searchIPs(user.organization_id, debounced, 24);
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
      <PageMeta title="IP Addresses" description="IP directory" noIndex />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">IP Addresses</h1>
        <div className="flex items-center gap-2">
          <div className="w-full max-w-sm">
            <Input placeholder="Search IPs…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} title="Create IP">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : results.length === 0 ? (
        <div className="text-sm text-muted-foreground">No IPs found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {results.map((i) => (
            <Card key={i.id} className="cursor-pointer" onClick={() => navigate(`/ips/${i.id}`)}>
              <CardHeader>
                <div className="font-medium truncate">{(i as any).title || i.address}</div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">IP Address</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create IP Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Input placeholder="IP address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <Input placeholder="ASN (optional)" value={asn} onChange={(e) => setAsn(e.target.value)} />
            <Input placeholder="Organization (optional)" value={org} onChange={(e) => setOrg(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!user?.organization_id || !address.trim()) {
                    toast.error('IP address is required.');
                    return;
                  }
                  setCreating(true);
                  try {
                    const created = await createIP({
                      organization_id: user.organization_id,
                      title: title.trim() || null,
                      description: description.trim() || null,
                      ip: { address: address.trim() },
                      asn: asn.trim() || null,
                      organization: org.trim() || null
                    });
                    toast.success('IP created.');
                    setCreateOpen(false);
                    setTitle('');
                    setDescription('');
                    setAddress('');
                    setAsn('');
                    setOrg('');
                    navigate(`/ips/${created.id}`);
                  } catch (e) {
                    console.error('Failed to create IP', e);
                    toast.error('Failed to create IP.');
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={creating}
              >
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


