import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Button } from '../../components/ui/button';
import ComponentCard from '../../components/common/ComponentCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { getDocumentById, updateDocument, deleteDocument, detachDocumentFromPerson, detachDocumentFromProperty, detachDocumentFromBusiness } from '../../api/documents';
import type { DocumentEntity } from '../../types/document';
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
import { MoreHorizontal, Pencil, Link2Off } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../components/ui/dropdown-menu';
import TextArea from '../../components/form/input/TextArea';
import LinkedPeopleCard from '../../components/common/LinkedPeopleCard';
import type { LinkedPersonItem } from '../../components/common/LinkedPeopleList';
import { supabase } from '../../utils/supabaseClient';
import CaseWebMentions from '../../components/cases/CaseWebMentions';

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocumentEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [type, setType] = useState<'court' | 'filing' | 'pdf' | 'other'>('other');
  const [author, setAuthor] = useState('');
  const [date, setDate] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [text, setText] = useState('');
  const [linkedPeople, setLinkedPeople] = useState<LinkedPersonItem[]>([]);
  const [linkedProperties, setLinkedProperties] = useState<Array<{ id: string; address: string; linkTo: string; transformType?: string | null; confidenceScore?: number | null }>>([]);
  const [linkedBusinesses, setLinkedBusinesses] = useState<Array<{ id: string; name: string; linkTo: string; transformType?: string | null; confidenceScore?: number | null }>>([]);

  const isStoragePath = (val: string) => !/^https?:\/\//i.test(val || '');
  const getDisplayLabel = (val: string) => {
    try {
      if (!val) return '—';
      if (!isStoragePath(val)) {
        const u = new URL(val);
        const base = `${u.protocol}//${u.hostname}${u.pathname || '/'}`;
        return base.length > 80 ? `${base.slice(0, 77)}…` : base;
      }
      const name = val.split('/').pop() || val;
      return name.length > 80 ? `${name.slice(0, 77)}…` : name;
    } catch {
      return val.length > 80 ? `${val.slice(0, 77)}…` : val;
    }
  };
  const truncate = (val: string, limit = 80) => {
    if (!val) return '—';
    return val.length > limit ? `${val.slice(0, limit - 3)}…` : val;
  };
  const isImageUrl = (url?: string | null) => {
    if (!url) return false;
    try {
      const u = new URL(url, 'http://x');
      const path = (u.pathname || '').toLowerCase();
      return /\.(png|jpe?g|gif|webp|bmp|tiff?)$/.test(path);
    } catch {
      const s = String(url).toLowerCase();
      return /\.(png|jpe?g|gif|webp|bmp|tiff?)$/.test(s);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const row = await getDocumentById(id);
        if (cancelled) return;
        setDoc(row);
        {
          const raw = (row.doc?.type as string) ?? 'other';
          const allowed = new Set(['court','filing','pdf','other']);
          setType(allowed.has(raw) ? (raw as 'court'|'filing'|'pdf'|'other') : 'other');
        }
        setAuthor((row.metadata?.author as string | null) ?? '');
        setDate((row.metadata?.date as string | null) ?? '');
        setSourceUrl(row.source_url ?? '');
        // Sign storage paths for preview/download
        if (row.source_url && !/^https?:\/\//i.test(row.source_url)) {
          try {
            const { data, error } = await (await import('../../utils/supabaseClient')).supabase.storage
              .from('evidence')
              .createSignedUrl(row.source_url, 600);
            setSignedUrl(error ? null : (data?.signedUrl ?? null));
          } catch {
            setSignedUrl(null);
          }
        } else {
          setSignedUrl(row.source_url || null);
        }
        setText(row.text ?? '');

        // Linked edges
        const { data: edges } = await supabase
          .from('entity_edges')
          .select('target_type,target_id,transform_type,confidence_score')
          .eq('source_type', 'document')
          .eq('source_id', id);
        const e = (edges ?? []) as Array<{ target_type: string; target_id: string; transform_type: string | null; confidence_score: number | null }>;
        const personIds = e.filter((x) => x.target_type === 'person').map((x) => x.target_id);
        const propertyIds = e.filter((x) => x.target_type === 'property').map((x) => x.target_id);
        const businessIds = e.filter((x) => x.target_type === 'business').map((x) => x.target_id);

        if (personIds.length) {
          const { data: rows } = await supabase.from('people').select('id, name, avatar').in('id', personIds);
          const m = new Map((rows ?? []).map((r) => [r.id as string, r]));
          const items: LinkedPersonItem[] = e
            .filter((x) => x.target_type === 'person')
            .map((edge) => {
              const r = m.get(edge.target_id);
              if (!r) return null;
              const first = r.name?.first || r.name?.given || '';
              const last = r.name?.last || r.name?.family || '';
              return {
                id: r.id as string,
                name: [first, last].filter(Boolean).join(' ') || 'Person',
                avatar: (r.avatar as string | null) ?? null,
                linkTo: `/people/${r.id as string}`,
                transformType: edge.transform_type,
                confidenceScore: edge.confidence_score
              } as LinkedPersonItem;
            })
            .filter(Boolean) as LinkedPersonItem[];
          setLinkedPeople(items);
        } else {
          setLinkedPeople([]);
        }

        if (propertyIds.length) {
          const { data: rows } = await supabase.from('properties').select('id, address_full').in('id', propertyIds);
          const m = new Map((rows ?? []).map((r) => [r.id as string, r]));
          const items = e
            .filter((x) => x.target_type === 'property')
            .map((edge) => {
              const r = m.get(edge.target_id);
              if (!r) return null;
              return {
                id: r.id as string,
                address: (r.address_full as string | null) ?? 'Property',
                linkTo: `/properties/${r.id as string}`,
                transformType: edge.transform_type,
                confidenceScore: edge.confidence_score
              };
            })
            .filter(Boolean) as Array<{ id: string; address: string; linkTo: string; transformType?: string | null; confidenceScore?: number | null }>;
          setLinkedProperties(items);
        } else {
          setLinkedProperties([]);
        }

        if (businessIds.length) {
          const { data: rows } = await supabase.from('businesses').select('id, name').in('id', businessIds);
          const m = new Map((rows ?? []).map((r) => [r.id as string, r]));
          const items = e
            .filter((x) => x.target_type === 'business')
            .map((edge) => {
              const b = m.get(edge.target_id);
              if (!b) return null;
              return {
                id: b.id as string,
                name: (b.name as string) ?? 'Business',
                linkTo: `/businesses/${b.id as string}`,
                transformType: edge.transform_type,
                confidenceScore: edge.confidence_score
              };
            })
            .filter(Boolean) as Array<{ id: string; name: string; linkTo: string; transformType?: string | null; confidenceScore?: number | null }>;
          setLinkedBusinesses(items);
        } else {
          setLinkedBusinesses([]);
        }
      } catch (e) {
        console.error('Failed to load document', e);
        toast.error('Failed to load document.');
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
  if (!doc) return <div className="p-6">Not found.</div>;

  const title = `${doc.doc?.type ?? 'document'}${author ? `: ${author}` : ''}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageMeta title={`Document · ${title}`} description="Document detail" noIndex />
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <h1 className="mb-2 text-2xl font-semibold">Document</h1>
          {signedUrl
            ? (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 underline block truncate"
                title={sourceUrl || ''}
              >
                {getDisplayLabel(doc.source_url || '')}
              </a>
            )
            : (
              <p className="text-sm text-muted-foreground block truncate" title={sourceUrl || ''}>
                {getDisplayLabel(doc.source_url || '')}
              </p>
            )}
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
            <div className="text-sm text-muted-foreground">Type</div>
            <div className="font-medium">{doc.doc?.type ?? '—'}</div>
          </div>
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">Author</div>
            <div className="font-medium max-w-[80ch] truncate" title={doc.metadata?.author ?? ''}>
              {truncate(doc.metadata?.author ?? '', 80)}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Date</div>
            <div className="font-medium">{doc.metadata?.date ?? '—'}</div>
          </div>
          <div className="min-w-0">
            <div className="text-sm text-muted-foreground">Source URL</div>
            {signedUrl
              ? (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-blue-600 hover:underline block truncate"
                  title={doc.source_url ?? ''}
                >
                  {getDisplayLabel(doc.source_url ?? '')}
                </a>
              )
              : (
                <div className="font-medium block truncate" title={doc.source_url ?? ''}>
                  {getDisplayLabel(doc.source_url ?? '')}
                </div>
              )}
            {signedUrl && isImageUrl(doc.source_url) ? (
              <div className="mt-2">
                <img
                  src={signedUrl}
                  alt=""
                  className="h-48 w-auto max-w-full cursor-zoom-in rounded border object-contain"
                  onClick={() => setLightboxOpen(true)}
                />
              </div>
            ) : null}
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Retrieved at</div>
            <div className="font-medium">{doc.retrieved_at ? new Date(doc.retrieved_at).toLocaleString() : '—'}</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="text-sm text-muted-foreground">Text</div>
          <div className="text-sm whitespace-pre-wrap">{doc.text || '—'}</div>
        </div>
      </ComponentCard>

      {/* Web Mentions */}
      <CaseWebMentions
        entity={{ id: doc.id, type: 'document', name: truncate(doc.metadata?.author ?? getDisplayLabel(doc.source_url ?? ''), 80) }}
        allowManage
        showActions
      />

      {/* Linked People */}
      <LinkedPeopleCard
        title="Linked People"
        items={linkedPeople}
        onUnlink={async (personId) => {
          try {
            await detachDocumentFromPerson(id, personId);
            setLinkedPeople((prev) => prev.filter((p) => p.id !== personId));
            toast.success('Unlinked from person');
          } catch (e) {
            console.error(e);
            toast.error('Failed to unlink from person');
          }
        }}
      />

      {/* Linked Properties */}
      <ComponentCard>
        <div className="mb-3 text-lg font-semibold">Linked Properties</div>
        {linkedProperties.length === 0 ? (
          <div className="text-sm text-muted-foreground">No properties linked.</div>
        ) : (
          <div className="space-y-3">
            {linkedProperties.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded border p-3">
                <div className="min-w-0">
                  <Link to={p.linkTo} className="font-medium hover:underline">
                    {p.address || 'Property'}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {p.transformType ? <span className="rounded border px-2 py-0.5">{p.transformType}</span> : null}
                    {p.confidenceScore != null ? <span className="ml-2">Confidence {(p.confidenceScore * 100).toFixed(0)}%</span> : null}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await detachDocumentFromProperty(id, p.id);
                      setLinkedProperties((prev) => prev.filter((x) => x.id !== p.id));
                      toast.success('Unlinked property');
                    } catch (e) {
                      console.error(e);
                      toast.error('Failed to unlink property');
                    }
                  }}
                >
                  <Link2Off className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ComponentCard>

      {/* Linked Businesses */}
      <ComponentCard>
        <div className="mb-3 text-lg font-semibold">Linked Businesses</div>
        {linkedBusinesses.length === 0 ? (
          <div className="text-sm text-muted-foreground">No businesses linked.</div>
        ) : (
          <div className="space-y-3">
            {linkedBusinesses.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded border p-3">
                <div className="min-w-0">
                  <Link to={b.linkTo} className="font-medium hover:underline">
                    {b.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {b.transformType ? <span className="rounded border px-2 py-0.5">{b.transformType}</span> : null}
                    {b.confidenceScore != null ? <span className="ml-2">Confidence {(b.confidenceScore * 100).toFixed(0)}%</span> : null}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await detachDocumentFromBusiness(id, b.id);
                      setLinkedBusinesses((prev) => prev.filter((x) => x.id !== b.id));
                      toast.success('Unlinked business');
                    } catch (e) {
                      console.error(e);
                      toast.error('Failed to unlink business');
                    }
                  }}
                >
                  <Link2Off className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </ComponentCard>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <select className="rounded border p-2 text-sm" value={type} onChange={(e) => setType(e.target.value as 'court'|'filing'|'pdf'|'other')}>
                <option value="court">court</option>
                <option value="filing">filing</option>
                <option value="pdf">pdf</option>
                <option value="other">other</option>
              </select>
              <Input placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <Input placeholder="Date (YYYY-MM-DD)" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input placeholder="Source URL" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
            <TextArea placeholder="Text" value={text} onChange={setText} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const updated = await updateDocument(doc.id, {
                      doc: { type },
                      metadata: { author: author || null, date: date || null },
                      source_url: sourceUrl || null,
                      text
                    });
                    setDoc(updated);
                    toast.success('Document updated');
                    setEditOpen(false);
                  } catch (e) {
                    console.error('Failed to update document', e);
                    toast.error('Failed to update document.');
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
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this document and its direct edges.</AlertDialogDescription>
          </AlertHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteDocument(doc.id);
                  toast.success('Document deleted.');
                  navigate('/documents');
                } catch (e) {
                  console.error(e);
                  toast.error('Failed to delete document.');
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Preview</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center">
            {signedUrl ? (
              <img src={signedUrl} alt="" className="max-h-[80vh] w-auto rounded object-contain" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


