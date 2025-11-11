import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import ComponentCard from '../../components/common/ComponentCard';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { getDomainById, updateDomain, deleteDomain } from '../../api/domains';
import { supabase } from '../../utils/supabaseClient';
import { Link } from 'react-router-dom';
import type { DomainEntity } from '../../types/domain';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader as AlertHeader,
  AlertDialogTitle
} from '../../components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import LinkedIPsCard from '../../components/common/LinkedIPsCard';
import { detachIPFromDomain, attachIPToDomain } from '../../api/ips';

export default function DomainDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = params.id as string;

  const [domain, setDomain] = useState<DomainEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linkedBusinesses, setLinkedBusinesses] = useState<Array<{ id: string; name: string }>>([]);
  const [linkedIPs, setLinkedIPs] = useState<Array<{ id: string; address: string }>>([]);

  const [name, setName] = useState('');
  const [hostingProvider, setHostingProvider] = useState('');
  const [creationDate, setCreationDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const d = await getDomainById(id);
        if (cancelled) return;
        setDomain(d);
        setName(d.domain.name);
        setHostingProvider(d.hosting_provider ?? '');
        setCreationDate(d.creation_date ?? '');
        setExpiryDate(d.expiry_date ?? '');
      } catch (e) {
        console.error('Failed to load domain', e);
        toast.error('Failed to load domain.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load businesses linked to this domain via entity_edges (business -> domain; target_id = domain.id)
  useEffect(() => {
    let cancelled = false;
    async function loadBusinesses() {
      try {
        const { data: edgeRows } = await supabase
          .from('entity_edges')
          .select('source_id')
          .eq('target_type', 'domain')
          .eq('target_id', id)
          .eq('source_type', 'business');
        const bizIds = (edgeRows ?? []).map((e: { source_id: string }) => e.source_id);
        if (bizIds.length === 0) {
          if (!cancelled) setLinkedBusinesses([]);
          return;
        }
        const { data: businesses } = await supabase.from('businesses').select('id, name').in('id', bizIds);
        if (!cancelled) {
          setLinkedBusinesses(
            (businesses ?? []).map((b) => ({
              id: (b as { id: string }).id,
              name: (b as { name?: string }).name ?? ''
            }))
          );
        }
      } catch (e) {
        console.error('Failed to load linked businesses for domain', e);
        if (!cancelled) setLinkedBusinesses([]);
      }
    }
    void loadBusinesses();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load IP addresses referencing this domain (ip_address -> domain)
  useEffect(() => {
    let cancelled = false;
    async function loadIPs() {
      try {
        const { data: edges } = await supabase
          .from('entity_edges')
          .select('source_id')
          .eq('target_type', 'domain')
          .eq('target_id', id)
          .eq('source_type', 'ip_address');
        const ipIds = (edges ?? []).map((e) => (e as { source_id: string }).source_id);
        if (ipIds.length === 0) {
          if (!cancelled) setLinkedIPs([]);
          return;
        }
        const { data: rows } = await supabase.from('ip_addresses').select('id, ip').in('id', ipIds);
        if (!cancelled) {
          setLinkedIPs(
            (rows ?? []).map((r) => ({
              id: (r as any).id as string,
              address: ((r as any).ip?.address as string) ?? ''
            }))
          );
        }
      } catch (e) {
        console.error('Failed to load IPs for domain', e);
        if (!cancelled) setLinkedIPs([]);
      }
    }
    void loadIPs();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="p-6">Loading…</div>;
  }
  if (!domain) {
    return <div className="p-6">Domain not found.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold">{domain.domain.name}</div>
          {domain.hosting_provider ? <div className="text-sm text-muted-foreground">{domain.hosting_provider}</div> : null}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDeleteOpen(true)}>Delete…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ComponentCard>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Overview</h3>
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            Edit
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm text-muted-foreground">Creation date</div>
            <div className="font-medium">{domain.creation_date ?? '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Expiry date</div>
            <div className="font-medium">{domain.expiry_date ?? '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Hosting provider</div>
            <div className="font-medium">{domain.hosting_provider ?? '—'}</div>
          </div>
        </div>
      </ComponentCard>
      <LinkedIPsCard
        title="IP Addresses"
        ownerId={domain.id}
        organizationId={domain.organization_id}
        items={linkedIPs.map((ip) => ({ id: ip.id, address: ip.address, linkTo: `/ips/${ip.id}` }))}
        onUnlink={async (ipId) => {
          try {
            await detachIPFromDomain(ipId, domain.id);
            setLinkedIPs((prev) => prev.filter((x) => x.id !== ipId));
            toast.success('IP unlinked');
          } catch (e) {
            console.error('Failed to unlink IP', e);
            toast.error('Failed to unlink IP.');
          }
        }}
        onAttached={async (ip) => {
          try {
            await attachIPToDomain(ip.id, domain.id, { transform_type: 'manual_link' });
            setLinkedIPs((prev) => {
              const map = new Map(prev.map((x) => [x.id, x]));
              map.set(ip.id, { id: ip.id, address: ip.address });
              return Array.from(map.values());
            });
          } catch (e) {
            console.error('Failed to attach IP', e);
          }
        }}
      />
      <ComponentCard>
        <div className="mb-2 text-lg font-semibold">Linked Businesses</div>
        {linkedBusinesses.length === 0 ? (
          <div className="text-sm text-muted-foreground">No businesses linked.</div>
        ) : (
          <div className="space-y-2">
            {linkedBusinesses.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded border p-3">
                <Link to={`/businesses/${b.id}`} className="text-sm font-medium hover:underline">
                  {b.name}
                </Link>
              </div>
            ))}
          </div>
        )}
      </ComponentCard>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Domain</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Hosting provider</label>
                <Input value={hostingProvider} onChange={(e) => setHostingProvider(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Creation date</label>
                <Input value={creationDate} onChange={(e) => setCreationDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Expiry date</label>
                <Input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const updated = await updateDomain(domain.id, {
                      domain: { name },
                      hosting_provider: hostingProvider,
                      creation_date: creationDate || null,
                      expiry_date: expiryDate || null
                    });
                    setDomain(updated);
                    toast.success('Domain updated');
                    setEditOpen(false);
                  } catch (e) {
                    console.error('Failed to update domain', e);
                    toast.error('Failed to update domain.');
                  }
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertHeader>
            <AlertDialogTitle>Delete domain?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this domain and its direct edges.</AlertDialogDescription>
          </AlertHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteDomain(id);
                  toast.success('Domain deleted.');
                  navigate('/domains');
                } catch (e) {
                  console.error('Failed to delete domain', e);
                  toast.error('Failed to delete domain.');
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


