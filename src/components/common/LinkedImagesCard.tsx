import ComponentCard from './ComponentCard';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { searchImages, createImage, attachImageToPerson, attachImageToProfile, attachImageToUsername, attachImageToProperty } from '../../api/images';
import { Link2Off, Pencil } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import TextArea from '../../components/form/input/TextArea';

export type LinkedImageItem = {
  id: string;
  url: string;
  linkTo: string;
  transformType?: string | null;
  confidenceScore?: number | null;
  retrievedAt?: string | null;
  sourceApi?: string | null;
  sourceUrl?: string | null;
};

export default function LinkedImagesCard({
  title = 'Images',
  items,
  onUnlink,
  displayName: _displayName, // eslint-disable-line @typescript-eslint/no-unused-vars
  ownerId,
  organizationId,
  ownerType = 'person',
  onAttached
}: {
  title?: string;
  items: LinkedImageItem[];
  onUnlink: (imageId: string) => void | Promise<void>;
  displayName?: string;
  ownerId: string;
  organizationId: string;
  ownerType?: 'person' | 'profile' | 'username' | 'property';
  onAttached?: (img: { id: string; url: string }) => void;
}) {
  const [manageOpen, setManageOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Array<{ id: string; url: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [signedMap, setSignedMap] = useState<Record<string, string>>({});

  const isStoragePath = (val: string) => !/^https?:\/\//i.test(val);
  const getDisplayLabel = (val: string) => {
    try {
      if (!isStoragePath(val)) {
        const u = new URL(val);
        const base = `${u.protocol}//${u.hostname}${u.pathname || '/'}`;
        return base.length > 60 ? `${base.slice(0, 57)}…` : base;
      }
      const name = val.split('/').pop() || val;
      return name.length > 40 ? `${name.slice(0, 37)}…` : name;
    } catch {
      return val.length > 60 ? `${val.slice(0, 57)}…` : val;
    }
  };

  // When items change, generate signed URLs for any storage paths shown
  useEffect(() => {
    let cancelled = false;
    async function signDisplayed() {
      const toSign = items.filter((i) => isStoragePath(i.url) && !signedMap[i.id]);
      if (toSign.length === 0) return;
      const entries: Array<[string, string]> = [];
      for (const it of toSign) {
        try {
          const resp = await fetch('/api/images/sign-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: it.url, expiresIn: 600 })
          });
          if (!resp.ok) continue;
          const j = await resp.json();
          if (j?.signedUrl) entries.push([it.id, j.signedUrl]);
        } catch {
          // ignore signing failures; fall through to raw value
        }
      }
      if (!cancelled && entries.length) {
        setSignedMap((prev) => {
          const next = { ...prev };
          for (const [k, v] of entries) next[k] = v;
          return next;
        });
      }
    }
    void signDisplayed();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id + ':' + i.url).join('|')]);

  const runSearch = async (v: string) => {
    if (!organizationId || v.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await searchImages(organizationId, v, 10);
      setResults(rows);
    } finally {
      setLoading(false);
    }
  };

  const attach = async (imageId: string, url: string, transform: 'manual_link' | 'manual_create' = 'manual_link') => {
    if (ownerType === 'person') {
      await attachImageToPerson(imageId, ownerId, { transform_type: transform });
    } else if (ownerType === 'profile') {
      await attachImageToProfile(imageId, ownerId, { transform_type: transform });
    } else if (ownerType === 'username') {
      await attachImageToUsername(imageId, ownerId, { transform_type: transform });
    } else if (ownerType === 'property') {
      await attachImageToProperty(imageId, ownerId, { transform_type: transform });
    }
    onAttached?.({ id: imageId, url });
    toast.success('Image linked');
  };

  // EXIF helpers (dynamic import so the app works even if exifr isn't installed)
  const mapExif = (data: Record<string, unknown>) => {
    if (!data) return null;
    const first = (...keys: string[]) => {
      for (const k of keys) {
        const v = data[k];
        if (v !== undefined && v !== null) return v;
      }
      return undefined;
    };
    const lat = first('latitude', 'GPSLatitude') as number | undefined ?? null;
    const lon = first('longitude', 'GPSLongitude') as number | undefined ?? null;
    const alt = first('altitude', 'GPSAltitude') as number | undefined ?? null;
    let ts: string | null = null;
    const dt = first('DateTimeOriginal', 'CreateDate', 'ModifyDate') as unknown;
    if (dt) {
      if (dt instanceof Date && !isNaN(dt.getTime())) {
        ts = dt.toISOString();
      }
      else {
        const d = new Date(String(dt));
        ts = isNaN(d.getTime()) ? null : d.toISOString();
      }
    }
    const make = (data['Make'] as string | undefined) ?? null;
    const model = (data['Model'] as string | undefined) ?? null;
    const deviceRaw = [make, model].filter(Boolean).join(' ').trim();
    const lens = (first('LensModel', 'Lens') as string | undefined) ?? null;
    const software = (data['Software'] as string | undefined) ?? null;
    const imageId = (data['ImageUniqueID'] as string | undefined) ?? null;
    const serialNumber = (data['SerialNumber'] as string | undefined) ?? null;
    const owner = (first('OwnerName', 'Artist') as string | undefined) ?? null;
    const copyright = (data['Copyright'] as string | undefined) ?? null;
    const caption = (first('Caption', 'ImageDescription', 'Description') as string | undefined) ?? null;
    const kwRaw = first('Keywords', 'Subject') as unknown;
    const kw = Array.isArray(kwRaw) ? kwRaw as string[] : null;
    const exposure = {
      time: (data['ExposureTime'] as number | undefined) ?? null,
      aperture: (data['FNumber'] as number | undefined) ?? null,
      iso: (first('ISO', 'ISOSpeedRatings') as number | undefined) ?? null,
      focalLength: (data['FocalLength'] as number | undefined) ?? null,
      focalLength35mm: (data['FocalLengthIn35mmFormat'] as number | undefined) ?? null,
      meteringMode: (data['MeteringMode'] as number | undefined) ?? null,
      exposureProgram: (data['ExposureProgram'] as number | undefined) ?? null,
      exposureMode: (data['ExposureMode'] as number | undefined) ?? null
    };
    const whiteBalance = (data['WhiteBalance'] as number | undefined) ?? null;
    const flashVal = data['Flash'] as unknown;
    const flashFired = typeof flashVal === 'number' ? (flashVal & 1) === 1 : typeof flashVal === 'boolean' ? flashVal : null;
    const orientation = (data['Orientation'] as number | undefined) ?? null;
    const edited = typeof software === 'string' ? /photoshop|lightroom|snapseed|pixelmator|gimp|canva|darktable/i.test(software) : null;
    return {
      timestamp: ts,
      gps: (lat != null || lon != null || alt != null) ? { lat, lon, alt } : null,
      make, model,
      device: deviceRaw || null,
      lens,
      software,
      imageId,
      serialNumber,
      owner,
      copyright,
      caption,
      keywords: kw ?? null,
      exposure,
      whiteBalance,
      flashFired,
      orientation,
      edited
    };
  };

  const readExifFromBlob = async (blob: Blob): Promise<Record<string, unknown> | null> => {
    try {
      // Use CDN to avoid bundler resolution; only loaded during upload/create
      // @ts-expect-error vite-ignore external ESM
      const exifrMod: unknown = await import(/* @vite-ignore */ 'https://esm.sh/exifr@7.1.3');
      const mod = exifrMod as { parse?: (b: Blob, o?: unknown) => Promise<unknown>; default?: (b: Blob, o?: unknown) => Promise<unknown> };
      const parse: ((b: Blob, o?: unknown) => Promise<unknown>) | undefined = mod.parse ?? mod.default;
      if (!parse) return null;
      const data: unknown = await parse(blob, { tiff: true, ifd1: false, xmp: true, iptc: true, translateValues: true });
      if (!data) return null;
      return mapExif(data as Record<string, unknown>);
    } catch {
      return null;
    }
  };

  const createAndAttach = async () => {
    const url = newUrl.trim();
    if (!url) {
      toast.error('Image URL is required.');
      return;
    }
    setCreating(true);
    try {
      // Ask our API to fetch and parse EXIF server-side (avoids CORS)
      let exif: Record<string, unknown> | null = null;
      try {
        const resp = await fetch('/api/images/exif', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        if (resp.ok) {
          const json = await resp.json();
          exif = (json?.exif ?? null) as Record<string, unknown> | null;
        }
      } catch (e) {
        console.warn('EXIF server extraction failed', e);
      }
      const created = await createImage({
        organization_id: organizationId,
        url,
        exif: exif ?? undefined,
        title: newTitle.trim() || null,
        description: newDescription.trim() || null,
        source: 'url'
      });
      await attach(created.id, url, 'manual_create');
      setManageOpen(false);
      setQuery('');
      setNewUrl('');
      setNewTitle('');
      setNewDescription('');
    } catch (err) {
      console.error('Failed to create image', err);
      toast.error('Failed to create image.');
    } finally {
      setCreating(false);
    }
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
          <p className="text-muted-foreground text-sm">No images linked.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 rounded border p-3">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                  <img src={isStoragePath(i.url) ? signedMap[i.id] ?? '' : i.url} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link to={i.linkTo} className="block max-w-full truncate text-left text-sm font-medium text-blue-600 hover:underline" title={i.url}>
                    {getDisplayLabel(i.url)}
                  </Link>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {i.retrievedAt ? new Date(i.retrievedAt).toLocaleString() : null}
                  </div>
                </div>
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
          <div className="mb-3 text-lg font-semibold">Manage images</div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="text-sm font-medium">Search and attach</div>
                <Input
                  placeholder="Search by URL…"
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
                      <div className="text-sm font-medium truncate">{r.url}</div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await attach(r.id, r.url, 'manual_link');
                          } catch (err) {
                            console.error('Failed to link image', err);
                            toast.error('Failed to link image.');
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
                        <div className="min-w-0 flex-1">
                          <Link
                            to={e.linkTo}
                            className="block max-w-full truncate text-sm font-medium hover:underline"
                            title={e.url}
                          >
                            {getDisplayLabel(e.url)}
                          </Link>
                        </div>
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
                <div className="text-sm font-medium">Create new image</div>
                <Input placeholder="Title (optional)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                <TextArea placeholder="Description (optional)" value={newDescription} onChange={(val) => setNewDescription(val)} />
                <div className="text-sm font-medium">URL</div>
                <Input placeholder="https://…" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Or upload</div>
                <div
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed p-6 text-center hover:bg-muted/50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const dropped = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
                    setFiles(dropped);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="text-sm font-medium">Drag & drop images</div>
                  <div className="text-xs text-gray-500">or click to browse</div>
                  <input ref={fileInputRef} className="hidden" type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                </div>
                {files.length > 0 && (
                  <div className="rounded border p-3">
                    <div className="mb-2 text-xs text-muted-foreground">Ready to upload</div>
                    <ul className="space-y-1 text-sm">
                      {files.map((f) => (
                        <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between">
                          <span className="truncate">{f.name}</span>
                          <span className="text-xs text-gray-500">{(f.size / 1024).toFixed(1)} KB</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" variant="outline" onClick={() => setFiles([])}>
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setManageOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                  // Unified create: prefer upload if files selected, else URL
                  if (files.length > 0) {
                    if (!organizationId) return;
                    setUploading(true);
                    try {
                      try {
                        await fetch('/api/images/ensure-bucket', { method: 'POST' });
                      } catch {
                        // ignore
                      }
                      for (const file of files) {
                        const path = `${organizationId}/${Date.now()}-${file.name.replace(/\s+/g, '+')}`;
                        const signed = await fetch('/api/images/signed-upload', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ path })
                        }).then(r => r.json());
                        if (!signed?.token) throw new Error('Failed to get signed upload URL');
                        const upRes = await supabase.storage.from('images').uploadToSignedUrl(path, signed.token, file);
                        if (upRes.error) throw upRes.error;
                        const exif = await readExifFromBlob(file);
                        const created = await createImage({
                          organization_id: organizationId,
                          url: path,
                          exif: exif ?? undefined,
                          title: newTitle.trim() || file.name.replace(/\.[^./]+$/, ''),
                          description: newDescription.trim() || '',
                          source: 'upload'
                        });
                        await attach(created.id, path, 'manual_create');
                      }
                      setFiles([]);
                      setManageOpen(false);
                      setQuery('');
                      setNewUrl('');
                      setNewTitle('');
                      setNewDescription('');
                      toast.success('Image(s) created and linked.');
                    } catch (e) {
                      console.error('Upload failed', e);
                      toast.error('Failed to upload images.');
                    } finally {
                      setUploading(false);
                    }
                      return;
                    }
                    // Fallback to URL create
                    await createAndAttach();
                  }}
                  disabled={creating || uploading}
                >
                  {(creating || uploading) ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}


