import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Button } from '../../components/ui/button';
import ComponentCard from '../../components/common/ComponentCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import { getImageById, updateImage, deleteImage, detachImageFromPerson, detachImageFromProfile, detachImageFromUsername, detachImageFromProperty } from '../../api/images';
import type { ImageEntity, ImageRecord } from '../../types/image';
import LinkedPeopleCard from '../../components/common/LinkedPeopleCard';
import type { LinkedPersonItem } from '../../components/common/LinkedPeopleList';
import { Link } from 'react-router-dom';
import { Button as UIButton } from '../../components/ui/button';
import { Link2Off } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import CaseWebMentions from '../../components/cases/CaseWebMentions';
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
import TextArea from '../../components/form/input/TextArea';

export default function ImageDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const navigate = useNavigate();
  const [img, setImg] = useState<ImageEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [imgTitle, setImgTitle] = useState<string>('');
  const [imgDescription, setImgDescription] = useState<string>('');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [linkedPeople, setLinkedPeople] = useState<LinkedPersonItem[]>([]);
  const [linkedProfiles, setLinkedProfiles] = useState<Array<{ id: string; platform: string; handle: string; linkTo: string; transformType?: string | null; confidenceScore?: number | null }>>([]);
  const [linkedUsernames, setLinkedUsernames] = useState<Array<{ id: string; value: string; linkTo: string; transformType?: string | null; confidenceScore?: number | null }>>([]);
  const [linkedProperties, setLinkedProperties] = useState<Array<{ id: string; address: string; linkTo: string; transformType?: string | null; confidenceScore?: number | null }>>([]);

  const isStoragePath = (val: string) => !/^https?:\/\//i.test(val);
  const getDisplayLabel = (val: string) => {
    try {
      if (!isStoragePath(val)) {
        const u = new URL(val);
        const base = `${u.protocol}//${u.hostname}${u.pathname || '/'}`;
        return base.length > 80 ? `${base.slice(0, 77)}…` : base;
      }
      const name = val.split('/').pop() || val;
      return name.length > 60 ? `${name.slice(0, 57)}…` : name;
    } catch {
      return val.length > 80 ? `${val.slice(0, 77)}…` : val;
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const row = await getImageById(id);
        if (cancelled) return;
        setImg(row);
        setUrl(row.image.url);
        setImgTitle((row as unknown as { title?: string | null }).title ?? '');
        setImgDescription((row as unknown as { description?: string | null }).description ?? '');
        // Generate a signed URL preview if stored value is a storage path
        if (row.image.url && !/^https?:\/\//i.test(row.image.url)) {
          try {
            const resp = await fetch('/api/images/sign-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: row.image.url, expiresIn: 600 })
            });
            if (resp.ok) {
              const j = await resp.json();
              setSignedUrl(j?.signedUrl ?? null);
            } else {
              setSignedUrl(null);
            }
          } catch {
            setSignedUrl(null);
          }
        } else {
          setSignedUrl(row.image.url || null);
        }

        // Load linked edges for this image
        try {
          const { data: edges } = await supabase
            .from('entity_edges')
            .select('target_type,target_id,transform_type,confidence_score')
            .eq('source_type', 'image')
            .eq('source_id', id);
          const e = (edges ?? []) as Array<{ target_type: string; target_id: string; transform_type: string | null; confidence_score: number | null }>;
          const personIds = e.filter((x) => x.target_type === 'person').map((x) => x.target_id);
          const profileIds = e.filter((x) => x.target_type === 'social_profile').map((x) => x.target_id);
          const usernameIds = e.filter((x) => x.target_type === 'username').map((x) => x.target_id);
          const propertyIds = e.filter((x) => x.target_type === 'property').map((x) => x.target_id);

          if (personIds.length) {
            const { data: rows } = await supabase.from('people').select('id, name, avatar').in('id', personIds);
            const m = new Map((rows ?? []).map((r) => [r.id as string, r]));
            const items: LinkedPersonItem[] = e
              .filter((x) => x.target_type === 'person')
              .map((edge) => {
                const r = m.get(edge.target_id);
                if (!r) return null;
                const name = r.name?.first || r.name?.given || '';
                const last = r.name?.last || r.name?.family || '';
                return {
                  id: r.id as string,
                  name: [name, last].filter(Boolean).join(' ') || 'Person',
                  avatar: (r.avatar as string | null) ?? null,
                  linkTo: `/people/${r.id as string}`,
                  transformType: edge.transform_type,
                  confidenceScore: edge.confidence_score
                } as LinkedPersonItem;
              })
              .filter((v): v is LinkedPersonItem => Boolean(v));
            setLinkedPeople(items);
          } else {
            setLinkedPeople([]);
          }

          if (profileIds.length) {
            const { data: rows } = await supabase.from('social_profiles').select('id, platform, handle').in('id', profileIds);
            const m = new Map((rows ?? []).map((r) => [r.id as string, r]));
            const items = e
              .filter((x) => x.target_type === 'social_profile')
              .map((edge) => {
                const r = m.get(edge.target_id);
                if (!r) return null;
                return {
                  id: r.id as string,
                  platform: (r.platform as string) ?? '',
                  handle: (r.handle as string) ?? '',
                  linkTo: `/profiles/${r.id as string}`,
                  transformType: edge.transform_type,
                  confidenceScore: edge.confidence_score
                };
              })
              .filter(Boolean) as Array<{ id: string; platform: string; handle: string; linkTo: string; transformType?: string | null; confidenceScore?: number | null }>;
            setLinkedProfiles(items);
          } else {
            setLinkedProfiles([]);
          }

          if (usernameIds.length) {
            const { data: rows } = await supabase.from('usernames').select('id, value').in('id', usernameIds);
            const m = new Map((rows ?? []).map((r) => [r.id as string, r]));
            const items = e
              .filter((x) => x.target_type === 'username')
              .map((edge) => {
                const r = m.get(edge.target_id);
                if (!r) return null;
                return {
                  id: r.id as string,
                  value: (r.value as string) ?? '',
                  linkTo: `/usernames/${r.id as string}`,
                  transformType: edge.transform_type,
                  confidenceScore: edge.confidence_score
                };
              })
              .filter(Boolean) as Array<{ id: string; value: string; linkTo: string; transformType?: string | null; confidenceScore?: number | null }>;
            setLinkedUsernames(items);
          } else {
            setLinkedUsernames([]);
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
                  address: ((r.address_full as string | null) ?? 'Property'),
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
        } catch (err) {
          console.error('Failed to load linked entities for image', err);
        }
      } catch (e) {
        console.error('Failed to load image', e);
        toast.error('Failed to load image.');
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
  if (!img) return <div className="p-6">Not found.</div>;
  const isUpload = ((img as unknown as { source?: 'upload' | 'url' | null }).source === 'upload') || isStoragePath(img.image.url);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageMeta title={`Image · ${img.image.url}`} description="Image detail" noIndex />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-2 text-2xl font-semibold">Image</h1>
          <p className="text-sm text-muted-foreground max-w-[80ch] truncate" title={img.image.url}>
            {getDisplayLabel(img.image.url)}
          </p>
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
            <div className="font-medium">{(img as unknown as { title?: string | null }).title ?? '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Description</div>
            <div className="font-medium">{(img as unknown as { description?: string | null }).description ?? '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Source</div>
            <div className="font-medium">
              {(img as unknown as { source?: 'upload' | 'url' | null }).source
                ? ((img as unknown as { source?: 'upload' | 'url' | null }).source === 'upload' ? 'Upload' : 'URL')
                : (isStoragePath(img.image.url) ? 'Upload' : 'URL')}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">URL</div>
            {signedUrl ? (
              <a
                href={signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline max-w-[80ch] truncate inline-block"
                title={img.image.url}
              >
                {getDisplayLabel(img.image.url)}
              </a>
            ) : (
              <div className="font-medium max-w-[80ch] truncate" title={img.image.url}>
                {getDisplayLabel(img.image.url)}
              </div>
            )}
          </div>
        </div>
      </ComponentCard>

      <ComponentCard>
        <div className="mb-3 text-lg font-semibold">Preview</div>
        {signedUrl ? (
          <img src={signedUrl} alt="preview" className="max-h-[60vh] w-auto" />
        ) : (
          <div className="text-sm text-muted-foreground">No preview available.</div>
        )}
      </ComponentCard>

      <ComponentCard>
        <div className="mb-3 text-lg font-semibold">EXIF</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="text-sm text-muted-foreground">Timestamp</div>
            <div className="font-medium">{img.exif?.timestamp ?? '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Device</div>
            <div className="font-medium">{img.exif?.device ?? '—'}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">GPS</div>
            <div className="font-medium">
              {img.exif?.gps?.lat != null && img.exif?.gps?.lon != null ? `${img.exif.gps.lat}, ${img.exif.gps.lon}` : '—'}
            </div>
          </div>
        </div>
        {img.exif ? (
          <div className="mt-4">
            <div className="text-sm text-muted-foreground mb-1">Raw EXIF</div>
            <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(img.exif, null, 2)}</pre>
          </div>
        ) : null}
      </ComponentCard>

      <ComponentCard>
        <div className="mb-3 text-lg font-semibold">Reverse image matches</div>
        {img.reverse_matches && img.reverse_matches.length > 0 ? (
          <ul className="list-inside list-disc text-sm">
            {img.reverse_matches.map((u) => (
              <li key={u}>
                <a href={u} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">
                  {u}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-muted-foreground">No matches recorded.</div>
        )}
      </ComponentCard>

      {/* Linked People */}
      <LinkedPeopleCard
        title="Linked People"
        items={linkedPeople}
        onUnlink={async (personId) => {
          try {
            await detachImageFromPerson(id, personId);
            setLinkedPeople((prev) => prev.filter((p) => p.id !== personId));
            toast.success('Unlinked from person');
          } catch (e) {
            console.error(e);
            toast.error('Failed to unlink from person');
          }
        }}
      />

      {/* Linked Social Profiles */}
      <ComponentCard>
        <div className="mb-3 text-lg font-semibold">Linked Social Profiles</div>
        {linkedProfiles.length === 0 ? (
          <div className="text-sm text-muted-foreground">No profiles linked.</div>
        ) : (
          <div className="space-y-3">
            {linkedProfiles.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded border p-3">
                <div className="min-w-0">
                  <Link to={p.linkTo} className="font-medium hover:underline">
                    {p.platform} · @{p.handle}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {p.transformType ? <span className="rounded border px-2 py-0.5">{p.transformType}</span> : null}
                    {p.confidenceScore != null ? <span className="ml-2">Confidence {(p.confidenceScore * 100).toFixed(0)}%</span> : null}
                  </div>
                </div>
                <UIButton
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await detachImageFromProfile(id, p.id);
                      setLinkedProfiles((prev) => prev.filter((x) => x.id !== p.id));
                      toast.success('Unlinked profile');
                    } catch (e) {
                      console.error(e);
                      toast.error('Failed to unlink profile');
                    }
                  }}
                >
                  <Link2Off className="h-4 w-4" />
                </UIButton>
              </div>
            ))}
          </div>
        )}
      </ComponentCard>

      {/* Linked Usernames */}
      <ComponentCard>
        <div className="mb-3 text-lg font-semibold">Linked Usernames</div>
        {linkedUsernames.length === 0 ? (
          <div className="text-sm text-muted-foreground">No usernames linked.</div>
        ) : (
          <div className="space-y-3">
            {linkedUsernames.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded border p-3">
                <div className="min-w-0">
                  <Link to={u.linkTo} className="font-medium hover:underline">
                    @{u.value}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {u.transformType ? <span className="rounded border px-2 py-0.5">{u.transformType}</span> : null}
                    {u.confidenceScore != null ? <span className="ml-2">Confidence {(u.confidenceScore * 100).toFixed(0)}%</span> : null}
                  </div>
                </div>
                <UIButton
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await detachImageFromUsername(id, u.id);
                      setLinkedUsernames((prev) => prev.filter((x) => x.id !== u.id));
                      toast.success('Unlinked username');
                    } catch (e) {
                      console.error(e);
                      toast.error('Failed to unlink username');
                    }
                  }}
                >
                  <Link2Off className="h-4 w-4" />
                </UIButton>
              </div>
            ))}
          </div>
        )}
      </ComponentCard>

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
                <UIButton
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await detachImageFromProperty(id, p.id);
                      setLinkedProperties((prev) => prev.filter((x) => x.id !== p.id));
                      toast.success('Unlinked property');
                    } catch (e) {
                      console.error(e);
                      toast.error('Failed to unlink property');
                    }
                  }}
                >
                  <Link2Off className="h-4 w-4" />
                </UIButton>
              </div>
            ))}
          </div>
        )}
      </ComponentCard>

      {/* Web Mentions */}
      <CaseWebMentions
        entity={{ id: img.id, type: 'image', name: getDisplayLabel(img.image.url) }}
        allowManage
        showActions
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">URL</label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} disabled={isUpload} />
              {isUpload ? <div className="text-xs text-muted-foreground mt-1">URL editing is disabled for uploaded files. Use Rename/Replace to change storage objects.</div> : null}
            </div>
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input value={imgTitle} onChange={(e) => setImgTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <TextArea value={imgDescription} onChange={(value) => setImgDescription(value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const updates: Partial<ImageRecord> = { image: { url } };
                    (updates as unknown as { title?: string | null }).title = imgTitle;
                    (updates as unknown as { description?: string | null }).description = imgDescription;
                    const updated = await updateImage(img.id, updates);
                    setImg(updated);
                    toast.success('Image updated');
                    setEditOpen(false);
                  } catch (e) {
                    console.error('Failed to update image', e);
                    toast.error('Failed to update image.');
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
            <AlertDialogTitle>Delete image?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this image and its direct edges.</AlertDialogDescription>
          </AlertHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  await deleteImage(img.id);
                  toast.success('Image deleted.');
                  navigate('/images');
                } catch (e) {
                  console.error(e);
                  toast.error('Failed to delete image.');
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


