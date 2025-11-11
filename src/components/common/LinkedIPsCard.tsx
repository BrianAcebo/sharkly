import ComponentCard from './ComponentCard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useState } from 'react';
import { toast } from 'sonner';
import { searchIPs, createIP, attachIPToDomain, detachIPFromDomain } from '../../api/ips';
import { Link } from 'react-router-dom';
import { Link2Off, Pencil } from 'lucide-react';

export type LinkedIPItem = {
  id: string;
  address: string;
  linkTo: string;
  transformType?: string | null;
  confidenceScore?: number | null;
};

export default function LinkedIPsCard({
  title = 'IP Addresses',
  items,
  onUnlink,
  ownerId,
  organizationId,
  onAttached
}: {
  title?: string;
  items: LinkedIPItem[];
  onUnlink: (ipId: string) => void | Promise<void>;
  ownerId: string; // domain id
  organizationId: string;
  onAttached?: (ip: { id: string; address: string }) => void;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; address: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [address, setAddress] = useState('');
  const [asn, setAsn] = useState('');
  const [org, setOrg] = useState('');

  const runSearch = async (v: string) => {
    if (!organizationId || v.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await searchIPs(organizationId, v, 10);
      setResults(rows);
    } finally {
      setLoading(false);
    }
  };

  const attach = async (ipId: string, ipAddress: string, transform: 'manual_link' | 'manual_create' = 'manual_link') => {
    await attachIPToDomain(ipId, ownerId, { transform_type: transform });
    onAttached?.({ id: ipId, address: ipAddress });
    toast.success('IP linked');
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
          <p className="text-muted-foreground text-sm">No IPs linked.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded border p-3">
                <Link to={i.linkTo} className="text-sm font-medium hover:underline">
                  {i.address}
                </Link>
                <Button size="sm" variant="ghost" onClick={() => onUnlink(i.id)} title="Unlink">
                  <Link2Off className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Manage Dialog */}
      <div className={manageOpen ? '' : 'hidden'}>
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={() => setManageOpen(false)} />
        <div className="fixed left-1/2 top-1/2 z-50 w-[min(700px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-xl">
          <div className="mb-3 text-lg font-semibold">Manage IP addresses</div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Search and attach</div>
                <Input
                  placeholder="Search by address…"
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
                      <div className="text-sm font-medium">{r.address}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await attach(r.id, r.address, 'manual_link');
                          } catch (err) {
                            console.error('Failed to link IP', err);
                            toast.error('Failed to link IP.');
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
                          {e.address}
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
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Create new IP</div>
                <Input placeholder="IP address" value={address} onChange={(e) => setAddress(e.target.value)} />
                <Input placeholder="ASN (optional)" value={asn} onChange={(e) => setAsn(e.target.value)} />
                <Input placeholder="Organization (optional)" value={org} onChange={(e) => setOrg(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setManageOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!organizationId || !address.trim()) {
                      toast.error('IP address is required.');
                      return;
                    }
                    setCreating(true);
                    try {
                      const created = await createIP({
                        organization_id: organizationId,
                        ip: { address: address.trim() },
                        asn: asn.trim() || null,
                        organization: org.trim() || null
                      });
                      await attach(created.id, address.trim(), 'manual_create');
                      setManageOpen(false);
                      setQuery('');
                      setAddress('');
                      setAsn('');
                      setOrg('');
                    } catch (err) {
                      console.error('Failed to create IP', err);
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
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}


