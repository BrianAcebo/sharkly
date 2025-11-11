import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Button } from '../../components/ui/button';
import ComponentCard from '../../components/common/ComponentCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { getIPById, updateIP, deleteIP } from '../../api/ips';
import type { IPEntity } from '../../types/ip';
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
import { MoreHorizontal, Pencil } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import LinkedDomainsCard from '../../components/common/LinkedDomainsCard';
import { detachIPFromDomain } from '../../api/ips';
import { supabase } from '../../utils/supabaseClient';

export default function IPDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const navigate = useNavigate();
  const [row, setRow] = useState<IPEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [asn, setAsn] = useState('');
  const [org, setOrg] = useState('');
  const [linkedDomains, setLinkedDomains] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const row = await getIPById(id);
        if (cancelled) return;
        setRow(row);
        setTitle(row.title ?? '');
        setDescription(row.description ?? '');
        setAsn(row.asn ?? '');
        setOrg(row.organization ?? '');
        // domains referencing this IP (domain <- ip)
        const { data: edges } = await supabase
          .from('entity_edges')
          .select('source_id')
          .eq('target_type', 'ip_address')
          .eq('target_id', id)
          .eq('source_type', 'domain');
        const domainIds = (edges ?? []).map((e) => (e as { source_id: string }).source_id);
        if (domainIds.length) {
          const { data: rows } = await supabase.from('domains').select('id, name').in('id', domainIds);
          setLinkedDomains((rows ?? []).map((r) => ({ id: (r as any).id as string, name: (r as any).name as string })));
        } else {
          setLinkedDomains([]);
        }
      } catch (e) {
        console.error('Failed to load IP', e);
        toast.error('Failed to load IP.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!row) return <div className="p-6">Not found.</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageMeta title={`IP · ${row.ip.address}`} description="IP detail" noIndex />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold">IP Address</h1>
          <p className="text-sm text-muted-foreground">{row.ip.address}</p>
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
          <h3 className="text-lg font-semibold">Details</h3>
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm text-muted-foreground">Title</div>
            <div className="font-medium">{row.title ?? '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Description</div>
            <div className="font-medium">{row.description ?? '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">ASN</div>
            <div className="font-medium">{row.asn ?? '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Organization</div>
            <div className="font-medium">{row.organization ?? '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">First seen</div>
            <div className="font-medium">{row.first_seen ? new Date(row.first_seen).toLocaleString() : '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Last seen</div>
            <div className="font-medium">{row.last_seen ? new Date(row.last_seen).toLocaleString() : '—'}</div>
          </div>
        </div>
      </ComponentCard>

      <LinkedDomainsCard
        title="Domains"
        displayName={row.ip.address}
        ownerId={row.id}
        organizationId={row.organization_id}
        ownerType="business" // reuse component styling; attach uses custom path below
        items={linkedDomains.map((d) => ({ id: d.id, name: d.name, linkTo: `/domains/${d.id}` }))}
        onUnlink={async (domainId) => {
          try {
            await detachIPFromDomain(row.id, domainId);
            setLinkedDomains((prev) => prev.filter((x) => x.id !== domainId));
            toast.success('Domain unlinked');
          } catch (e) {
            console.error('Failed to unlink domain', e);
            toast.error('Failed to unlink domain.');
          }
        }}
        onAttached={async (d) => {
          // Link domain->IP via our API in addition to UI add
          try {
            const { attachIPToDomain } = await import('../../api/ips');
            await attachIPToDomain(row.id, d.id, { transform_type: 'manual_link' });
            setLinkedDomains((prev) => {
              const map = new Map(prev.map((x) => [x.id, x]));
              map.set(d.id, { id: d.id, name: d.name });
              return Array.from(map.values());
            });
          } catch (e) {
            console.error('Failed to link domain to IP', e);
          }
        }}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <Input placeholder="ASN" value={asn} onChange={(e) => setAsn(e.target.value)} />
            <Input placeholder="Organization" value={org} onChange={(e) => setOrg(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const updated = await updateIP(row.id, {
                      title: title || null,
                      description: description || null,
                      asn: asn || null,
                      organization: org || null
                    });
                    setRow(updated);
                    toast.success('IP updated');
                    setEditOpen(false);
                  } catch (e) {
                    console.error('Failed to update IP', e);
                    toast.error('Failed to update IP.');
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
            <AlertDialogTitle>Delete IP?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this IP and its direct edges.</AlertDialogDescription>
          </AlertHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteIP(row.id);
                  toast.success('IP deleted.');
                  navigate('/ips');
                } catch (e) {
                  console.error(e);
                  toast.error('Failed to delete IP.');
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


