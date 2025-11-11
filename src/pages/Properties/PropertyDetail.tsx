import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Button } from '../../components/ui/button';
import LinkedPeopleCard from '../../components/common/LinkedPeopleCard';
import { getPropertyById, updateProperty, deleteProperty } from '../../api/properties';
import type { PropertyRecord } from '../../types/property';
import { supabase } from '../../utils/supabaseClient';
import ComponentCard from '../../components/common/ComponentCard';
import { normalizePersonName, formatPersonName } from '../../utils/person';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Pencil, MoreHorizontal } from 'lucide-react';
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
import LinkedImagesCard from '../../components/common/LinkedImagesCard';
import LinkedDocumentsCard from '../../components/common/LinkedDocumentsCard';
import { detachDocumentFromProperty } from '../../api/documents';
import { detachImageFromProperty } from '../../api/images';

const toPretty = (v: unknown) => {
  try {
    if (v == null) return '—';
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v);
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

const tryParseJson = (label: string, text: string): any | undefined => {
  if (text.trim() === '') return undefined; // don't update
  try {
    return JSON.parse(text);
  } catch (e) {
    toast.error(`Invalid JSON in ${label}.`);
    throw e;
  }
};

export default function PropertyDetail() {
  const params = useParams();
  const id = params.id as string;
  const navigate = useNavigate();
  const [row, setRow] = useState<PropertyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [editMetaOpen, setEditMetaOpen] = useState(false);
  const [editAddrGeoOpen, setEditAddrGeoOpen] = useState(false);
  const [editCharsOpen, setEditCharsOpen] = useState(false);
  const [editOwnershipOpen, setEditOwnershipOpen] = useState(false);
  const [editFinanceOpen, setEditFinanceOpen] = useState(false);
  const [editUtilitiesOpen, setEditUtilitiesOpen] = useState(false);
  const [editProvenanceOpen, setEditProvenanceOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkedImages, setLinkedImages] = useState<Array<{ id: string; url: string }>>([]);
  const [linkedDocuments, setLinkedDocuments] = useState<Array<{ id: string; title: string }>>([]);

  // form state
  const [address, setAddress] = useState('');
  const [legalDescription, setLegalDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [firstSeen, setFirstSeen] = useState('');
  const [lastSeen, setLastSeen] = useState('');

  const [addressComponentsText, setAddressComponentsText] = useState('');
  const [coordinatesText, setCoordinatesText] = useState('');
  const [characteristicsText, setCharacteristicsText] = useState('');
  const [ownershipText, setOwnershipText] = useState('');
  const [financeText, setFinanceText] = useState('');
  const [utilitiesText, setUtilitiesText] = useState('');
  const [provenanceText, setProvenanceText] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const detail = await getPropertyById(id);
        if (!active) return;
        setRow(detail);
        setAddress(detail.address_full ?? '');
        setLegalDescription(detail.legal_description ?? '');
        setNotes(detail.notes ?? '');
        setFirstSeen(detail.first_seen ?? '');
        setLastSeen(detail.last_seen ?? '');
        setAddressComponentsText(JSON.stringify(detail.address_components ?? {}, null, 2));
        setCoordinatesText(JSON.stringify(detail.coordinates ?? {}, null, 2));
        setCharacteristicsText(JSON.stringify(detail.characteristics ?? {}, null, 2));
        setOwnershipText(JSON.stringify(detail.ownership ?? {}, null, 2));
        setFinanceText(JSON.stringify(detail.finance ?? {}, null, 2));
        setUtilitiesText(JSON.stringify(detail.utilities ?? {}, null, 2));
        setProvenanceText(JSON.stringify(detail.provenance ?? {}, null, 2));
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function loadImages() {
      try {
        const { data: edges } = await supabase
          .from('entity_edges')
          .select('source_id')
          .eq('target_type', 'property')
          .eq('target_id', id)
          .eq('source_type', 'image');
        const imageIds = (edges ?? []).map((e) => (e as { source_id: string }).source_id);
        if (imageIds.length === 0) {
          if (!cancelled) setLinkedImages([]);
          return;
        }
        const { data: rows } = await supabase.from('images').select('id, url').in('id', imageIds);
        if (!cancelled) setLinkedImages((rows ?? []).map((r) => ({ id: (r as { id: string }).id, url: (r as { url: string }).url })));
      } catch (e) {
        console.error('Failed to load linked images for property', e);
        if (!cancelled) setLinkedImages([]);
      }
    }
    void loadImages();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function loadDocs() {
      try {
        const { data: edges } = await supabase
          .from('entity_edges')
          .select('source_id')
          .eq('target_type', 'property')
          .eq('target_id', id)
          .eq('source_type', 'document');
        const docIds = (edges ?? []).map((e) => (e as { source_id: string }).source_id);
        if (docIds.length === 0) {
          if (!cancelled) setLinkedDocuments([]);
          return;
        }
        const { data: rows } = await supabase.from('documents').select('id, doc, metadata').in('id', docIds);
        if (!cancelled)
          setLinkedDocuments(
            (rows ?? []).map((r: any) => {
              const t = r?.doc?.type ?? 'document';
              const a = r?.metadata?.author ?? '';
              return { id: r.id as string, title: a ? `${t}: ${a}` : t };
            })
          );
      } catch (e) {
        console.error('Failed to load linked documents for property', e);
        if (!cancelled) setLinkedDocuments([]);
      }
    }
    void loadDocs();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!row) return <div className="p-6">Not found.</div>;

  const headerTitle = row.address_full || row.id;

  const handleSave = async () => {
    if (!row) return;
    setSaving(true);
    try {
      const updated = await updateProperty(row.id, {
        address_full: address || null,
        legal_description: legalDescription || null,
        notes: notes || null,
        first_seen: firstSeen || null,
        last_seen: lastSeen || null,
        address_components: tryParseJson('Address components', addressComponentsText),
        coordinates: tryParseJson('Coordinates', coordinatesText),
        characteristics: tryParseJson('Characteristics', characteristicsText),
        ownership: tryParseJson('Ownership', ownershipText),
        finance: tryParseJson('Finance', financeText),
        utilities: tryParseJson('Utilities', utilitiesText),
        provenance: tryParseJson('Provenance', provenanceText)
      });
      setRow(updated);
      toast.success('Property updated.');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update property.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6 mx-auto max-w-7xl">
      <PageMeta title={`Property · ${headerTitle}`} description="Property detail" noIndex />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Property</h1>
          <p className="text-sm text-muted-foreground">{headerTitle}</p>
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

      <LinkedImagesCard
        title="Images"
        displayName={headerTitle}
        ownerId={id}
        organizationId={row?.organization_id ?? ''}
        ownerType="property"
        items={linkedImages.map((im) => ({ id: im.id, url: im.url, linkTo: `/images/${im.id}` }))}
        onUnlink={async (imageId) => {
          await detachImageFromProperty(imageId, id);
          setLinkedImages((prev) => prev.filter((x) => x.id !== imageId));
          toast.success('Image unlinked');
        }}
        onAttached={(i) => {
          setLinkedImages((prev) => {
            const map = new Map(prev.map((x) => [x.id, x]));
            map.set(i.id, { id: i.id, url: i.url });
            return Array.from(map.values());
          });
        }}
      />

      <LinkedDocumentsCard
        title="Documents"
        displayName={headerTitle}
        ownerId={id}
        organizationId={row?.organization_id ?? ''}
        ownerType="property"
        items={linkedDocuments.map((d) => ({ id: d.id, title: d.title, linkTo: `/documents/${d.id}` }))}
        onUnlink={async (documentId) => {
          await detachDocumentFromProperty(documentId, id);
          setLinkedDocuments((prev) => prev.filter((x) => x.id !== documentId));
          toast.success('Document unlinked');
        }}
        onAttached={(d) => {
          setLinkedDocuments((prev) => {
            const map = new Map(prev.map((x) => [x.id, x]));
            map.set(d.id, { id: d.id, title: d.title });
            return Array.from(map.values());
          });
        }}
      />

      <ComponentCard>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Details</h3>
          <Button size="sm" variant="outline" onClick={() => setEditDetailsOpen(true)}>
            <Pencil className="size-4" />
          </Button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="font-medium">{row.address_full || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Legal description</div>
              <div className="font-medium">{row.legal_description || '—'}</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Notes</div>
            <div className="text-sm whitespace-pre-line">{row.notes || '—'}</div>
          </div>
        </div>
      </ComponentCard>

      <LinkedPeople propertyId={row.id} displayName={row.address_full || row.id} />

      <ComponentCard>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Meta</h3>
          <Button size="sm" variant="outline" onClick={() => setEditMetaOpen(true)}><Pencil className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

      <ComponentCard>
        <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Address & Geo</h3>
        <Button size="sm" variant="outline" onClick={() => setEditAddrGeoOpen(true)}><Pencil className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="text-sm font-medium">Address components</div>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{toPretty(row.address_components)}</pre>
          </div>
          <div>
            <div className="text-sm font-medium">Geo</div>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{toPretty(row.geo)}</pre>
          </div>
          <div>
            <div className="text-sm font-medium">Mail address</div>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{toPretty(row.mail_address)}</pre>
          </div>
        </div>
      </ComponentCard>

      <ComponentCard>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Characteristics & Valuation</h3>
          <Button size="sm" variant="outline" onClick={() => setEditCharsOpen(true)}><Pencil className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="text-sm font-medium">Characteristics</div>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{toPretty(row.characteristics)}</pre>
          </div>
          <div>
            <div className="text-sm font-medium">Valuation</div>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{toPretty(row.valuation)}</pre>
          </div>
          <div>
            <div className="text-sm font-medium">Occupancy</div>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{toPretty(row.occupancy)}</pre>
          </div>
        </div>
      </ComponentCard>

      <ComponentCard>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Ownership & History</h3>
          <Button size="sm" variant="outline" onClick={() => setEditOwnershipOpen(true)}><Pencil className="h-4 w-4" /></Button>
        </div>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium">Current owners</div>
            {(Array.isArray(row.owners_current) && row.owners_current.length > 0) ? (
                <div className="mt-2 space-y-2">
                  {row.owners_current.map((o, i) => (
                    <pre key={i} className="rounded-md bg-muted p-3 text-xs">{toPretty(o)}</pre>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">—</div>
              )}
          </div>
          <div>
            <div className="text-sm font-medium">Prior owners</div>
            {(Array.isArray(row.owners_prior) && row.owners_prior.length > 0) ? (
                <div className="mt-2 space-y-2">
                  {row.owners_prior.map((o, i) => (
                    <pre key={i} className="rounded-md bg-muted p-3 text-xs">{toPretty(o)}</pre>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">—</div>
              )}
          </div>
          <div>
            <div className="text-sm font-medium">Sale history</div>
            {(Array.isArray(row.sale_history) && row.sale_history.length > 0) ? (
                <div className="mt-2 space-y-2">
                  {row.sale_history.map((s, i) => (
                    <pre key={i} className="rounded-md bg-muted p-3 text-xs">{toPretty(s)}</pre>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">—</div>
              )}
          </div>
        </div>
      </ComponentCard>

      <ComponentCard>
        <h3 className="text-lg font-semibold">Financial & Liens</h3>
        <div className="mb-3 flex items-center justify-end"><Button size="sm" variant="outline" onClick={() => setEditFinanceOpen(true)}><Pencil className="h-4 w-4" /></Button></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="text-sm font-medium">Mortgages</div>
            {(Array.isArray(row.mortgages) && row.mortgages.length > 0) ? (
                <div className="mt-2 space-y-2">
                  {row.mortgages.map((m, i) => (
                    <pre key={i} className="rounded-md bg-muted p-3 text-xs">{toPretty(m)}</pre>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">—</div>
              )}
          </div>
          <div>
            <div className="text-sm font-medium">Liens & judgments</div>
            {(Array.isArray(row.liens_judgments) && row.liens_judgments.length > 0) ? (
                <div className="mt-2 space-y-2">
                  {row.liens_judgments.map((l, i) => (
                    <pre key={i} className="rounded-md bg-muted p-3 text-xs">{toPretty(l)}</pre>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">—</div>
              )}
          </div>
        </div>
      </ComponentCard>

      <ComponentCard>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Utilities & Media</h3>
          <Button size="sm" variant="outline" onClick={() => setEditUtilitiesOpen(true)}><Pencil className="h-4 w-4" /></Button>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="text-sm font-medium">Utilities / signals</div>
            {(Array.isArray(row.utilities_signals) && row.utilities_signals.length > 0) ? (
                <div className="mt-2 space-y-2">
                  {row.utilities_signals.map((u, i) => (
                    <pre key={i} className="rounded-md bg-muted p-3 text-xs">{toPretty(u)}</pre>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">—</div>
              )}
          </div>
          <div>
            <div className="text-sm font-medium">Images</div>
            {(Array.isArray(row.images) && row.images.length > 0) ? (
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                  {row.images.map((img, i) => {
                    const url = (img as any)?.url ?? (typeof img === 'string' ? img : null);
                    return (
                      <div key={i} className="overflow-hidden rounded border">
                        {url ? (
                          <img src={url} alt="property" className="h-24 w-full object-cover" />
                        ) : (
                          <pre className="p-2 text-xs">{toPretty(img)}</pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-2 text-sm text-muted-foreground">—</div>
              )}
          </div>
        </div>
      </ComponentCard>

      <ComponentCard>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Provenance</h3>
          <Button size="sm" variant="outline" onClick={() => setEditProvenanceOpen(true)}><Pencil className="h-4 w-4" /></Button>
        </div>
        <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{toPretty(row.provenance)}</pre>
      </ComponentCard>

      {/* Edit dialogs */}
      <Dialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Address</label>
              <Input className="mt-1" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Parcel (read-only here)</label>
              <div className="mt-2 text-sm text-muted-foreground">{row.parcel?.apn || row.parcel?.parcel_id || '—'}</div>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Legal description</label>
              <Textarea rows={3} value={legalDescription} onChange={(e) => setLegalDescription(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDetailsOpen(false)}>Cancel</Button>
            <Button onClick={async () => { const updated = await updateProperty(row.id, { address_full: address, legal_description: legalDescription, notes }); setRow(updated); initializeForm(updated); setEditDetailsOpen(false); toast.success('Property details updated.'); }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editMetaOpen} onOpenChange={setEditMetaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit meta</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">First seen</label>
              <Input type="datetime-local" value={firstSeen} onChange={(e) => setFirstSeen(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Last seen</label>
              <Input type="datetime-local" value={lastSeen} onChange={(e) => setLastSeen(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditMetaOpen(false)}>Cancel</Button>
            <Button onClick={async () => { const updated = await updateProperty(row.id, { first_seen: firstSeen ? new Date(firstSeen).toISOString() : null, last_seen: lastSeen ? new Date(lastSeen).toISOString() : null }); setRow(updated); initializeForm(updated); setEditMetaOpen(false); toast.success('Meta updated.'); }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editAddrGeoOpen} onOpenChange={setEditAddrGeoOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit address & geo</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Address components (JSON)</label>
              <Textarea rows={8} value={addressComponentsText} onChange={(e) => setAddressComponentsText(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Geo (JSON)</label>
              <Textarea rows={8} value={geoText} onChange={(e) => setGeoText(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Mail address (JSON)</label>
              <Textarea rows={6} value={mailAddressText} onChange={(e) => setMailAddressText(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditAddrGeoOpen(false)}>Cancel</Button>
            <Button onClick={async () => { try { const updates:any = {}; const a = tryParseJson('Address components', addressComponentsText); if (a !== undefined) updates.address_components = a; const g = tryParseJson('Geo', geoText); if (g !== undefined) updates.geo = g; const m = tryParseJson('Mail address', mailAddressText); if (m !== undefined) updates.mail_address = m; const updated = await updateProperty(row.id, updates); setRow(updated); initializeForm(updated); setEditAddrGeoOpen(false); toast.success('Address & geo updated.'); } catch { } }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editCharsOpen} onOpenChange={setEditCharsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit characteristics & valuation</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Characteristics (JSON)</label>
              <Textarea rows={8} value={characteristicsText} onChange={(e) => setCharacteristicsText(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Valuation (JSON)</label>
              <Textarea rows={8} value={valuationText} onChange={(e) => setValuationText(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Occupancy (JSON)</label>
              <Textarea rows={6} value={occupancyText} onChange={(e) => setOccupancyText(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditCharsOpen(false)}>Cancel</Button>
            <Button onClick={async () => { try { const updates:any = {}; const ch = tryParseJson('Characteristics', characteristicsText); if (ch !== undefined) updates.characteristics = ch; const va = tryParseJson('Valuation', valuationText); if (va !== undefined) updates.valuation = va; const oc = tryParseJson('Occupancy', occupancyText); if (oc !== undefined) updates.occupancy = oc; const updated = await updateProperty(row.id, updates); setRow(updated); initializeForm(updated); setEditCharsOpen(false); toast.success('Characteristics & valuation updated.'); } catch {} }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOwnershipOpen} onOpenChange={setEditOwnershipOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit ownership & history</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Current owners (JSON array)</label>
              <Textarea rows={6} value={ownersCurrentText} onChange={(e) => setOwnersCurrentText(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Prior owners (JSON array)</label>
              <Textarea rows={6} value={ownersPriorText} onChange={(e) => setOwnersPriorText(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Sale history (JSON array)</label>
              <Textarea rows={6} value={saleHistoryText} onChange={(e) => setSaleHistoryText(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOwnershipOpen(false)}>Cancel</Button>
            <Button onClick={async () => { try { const updates:any = {}; const oc = tryParseJson('Current owners', ownersCurrentText); if (oc !== undefined) updates.owners_current = oc; const op = tryParseJson('Prior owners', ownersPriorText); if (op !== undefined) updates.owners_prior = op; const sh = tryParseJson('Sale history', saleHistoryText); if (sh !== undefined) updates.sale_history = sh; const updated = await updateProperty(row.id, updates); setRow(updated); initializeForm(updated); setEditOwnershipOpen(false); toast.success('Ownership & history updated.'); } catch {} }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editFinanceOpen} onOpenChange={setEditFinanceOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit financial & liens</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Mortgages (JSON array)</label>
              <Textarea rows={8} value={mortgagesText} onChange={(e) => setMortgagesText(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Liens & judgments (JSON array)</label>
              <Textarea rows={8} value={liensText} onChange={(e) => setLiensText(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditFinanceOpen(false)}>Cancel</Button>
            <Button onClick={async () => { try { const updates:any = {}; const mo = tryParseJson('Mortgages', mortgagesText); if (mo !== undefined) updates.mortgages = mo; const li = tryParseJson('Liens & judgments', liensText); if (li !== undefined) updates.liens_judgments = li; const updated = await updateProperty(row.id, updates); setRow(updated); initializeForm(updated); setEditFinanceOpen(false); toast.success('Financial & liens updated.'); } catch {} }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editUtilitiesOpen} onOpenChange={setEditUtilitiesOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit utilities & media</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Utilities / signals (JSON array)</label>
              <Textarea rows={8} value={utilitiesText} onChange={(e) => setUtilitiesText(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Images (JSON array)</label>
              <Textarea rows={8} value={imagesText} onChange={(e) => setImagesText(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditUtilitiesOpen(false)}>Cancel</Button>
            <Button onClick={async () => { try { const updates:any = {}; const ut = tryParseJson('Utilities / signals', utilitiesText); if (ut !== undefined) updates.utilities_signals = ut; const im = tryParseJson('Images', imagesText); if (im !== undefined) updates.images = im; const updated = await updateProperty(row.id, updates); setRow(updated); initializeForm(updated); setEditUtilitiesOpen(false); toast.success('Utilities & media updated.'); } catch {} }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editProvenanceOpen} onOpenChange={setEditProvenanceOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit provenance</DialogTitle>
          </DialogHeader>
          <Textarea rows={8} value={provenanceText} onChange={(e) => setProvenanceText(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditProvenanceOpen(false)}>Cancel</Button>
            <Button onClick={async () => { try { const pv = tryParseJson('Provenance', provenanceText); const updates:any = {}; if (pv !== undefined) updates.provenance = pv; const updated = await updateProperty(row.id, updates); setRow(updated); initializeForm(updated); setEditProvenanceOpen(false); toast.success('Provenance updated.'); } catch {} }} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertHeader>
            <AlertDialogTitle>Delete property?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this property and its direct edges. This action cannot be undone.
            </AlertDialogDescription>
          </AlertHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await deleteProperty(id);
                  toast.success('Property deleted.');
                  navigate('/properties');
                } catch (e) {
                  console.error(e);
                  toast.error('Failed to delete property.');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LinkedPeople({ propertyId, displayName }: { propertyId: string; displayName: string }) {
  const [items, setItems] = useState<Array<{ id: string; name: string; avatar: string | null; edge_id: string; transform_type: string | null; confidence_score: number | null; source_api?: string | null; source_url?: string | null; retrieved_at?: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Read edges person -> property, then hydrate people
        const { data: edges, error: edgeErr } = await supabase
          .from('entity_edges')
          .select('id, source_id, transform_type, confidence_score')
          .eq('target_type', 'property')
          .eq('target_id', propertyId)
          .eq('source_type', 'person');
        if (edgeErr) throw edgeErr;
        const personIds = (edges ?? []).map((e) => e.source_id);
        if (!active) return;
        if (!personIds.length) {
          setItems([]);
          return;
        }
        const { data: people, error: pplErr } = await supabase
          .from('people')
          .select('id, name, avatar')
          .in('id', personIds);
        if (pplErr) throw pplErr;
        const mapped = (people ?? []).map((p) => {
          const rawName = (p as any).name;
          const displayName = typeof rawName === 'string' ? rawName : formatPersonName(normalizePersonName(rawName));
          const edgeRow = (edges ?? []).find((e) => e.source_id === p.id) as { id: string; transform_type: string | null; confidence_score: number | null } | undefined;
          return {
            id: p.id as string,
            name: displayName,
            avatar: ((p as any).avatar ?? null) as string | null,
            edge_id: (edgeRow?.id as string) || (p.id as string),
            transform_type: edgeRow?.transform_type ?? null,
            confidence_score: edgeRow?.confidence_score ?? null
          };
        });
        setItems(mapped);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [propertyId]);

  const handleUnlink = async (personId: string) => {
    setUnlinkingId(personId);
    try {
      const { error } = await supabase
        .from('entity_edges')
        .delete()
        .eq('source_type', 'person')
        .eq('source_id', personId)
        .eq('target_type', 'property')
        .eq('target_id', propertyId);
      if (error) throw error;
      setItems((prev) => prev.filter((p) => p.id !== personId));
      toast.success('Unlinked from person.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to unlink.');
    } finally {
      setUnlinkingId(null);
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (items.length === 0) return <div className="text-sm text-muted-foreground">No people linked.</div>;

  return (
    <LinkedPeopleCard
      displayName={displayName}
      items={items.map((p) => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        linkTo: `/people/${p.id}`,
        transformType: p.transform_type,
        confidenceScore: p.confidence_score,
        retrievedAt: (p as any).retrieved_at ?? null,
        sourceApi: (p as any).source_api ?? null,
        sourceUrl: (p as any).source_url ?? null
      }))}
      onUnlink={(pid) => handleUnlink(pid)}
    />
  );
}

// Section dialogs
// Details
// We reuse existing form state variables; saving will call updateProperty with only relevant fields

// Place dialogs at the bottom so portals render correctly
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
;


