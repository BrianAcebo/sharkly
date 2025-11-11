import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageMeta from '../../components/common/PageMeta';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { useAuth } from '../../contexts/AuthContext';
import useDebounce from '../../hooks/useDebounce';
import { searchImages, createImage } from '../../api/images';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import TextArea from '../../components/form/input/TextArea';
/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ImagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; url: string }>>([]);
  const debounced = useDebounce(q, 350);
  const [createOpen, setCreateOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    async function run() {
      if (!user?.organization_id) return;
      setLoading(true);
      try {
        const rows = await searchImages(user.organization_id, debounced, 24);
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

  // EXIF helpers (mirror LinkedImagesCard)
  const mapExif = (data: any) => {
    if (!data) return null;
    const lat = (data.latitude ?? data.GPSLatitude) ?? null;
    const lon = (data.longitude ?? data.GPSLongitude) ?? null;
    const alt = (data.altitude ?? data.GPSAltitude) ?? null;
    let ts: string | null = null;
    const dt = data.DateTimeOriginal || data.CreateDate || data.ModifyDate;
    if (dt) {
      if (dt instanceof Date && !isNaN(dt.getTime())) ts = dt.toISOString();
      else {
        const d = new Date(String(dt));
        ts = isNaN(d.getTime()) ? null : d.toISOString();
      }
    }
    const make = data.Make ?? null;
    const model = data.Model ?? null;
    const deviceRaw = [make, model].filter(Boolean).join(' ').trim();
    const lens = data.LensModel ?? data.Lens ?? null;
    const software = data.Software ?? null;
    const imageId = data.ImageUniqueID ?? null;
    const serialNumber = data.SerialNumber ?? null;
    const owner = data.OwnerName ?? data.Artist ?? null;
    const copyright = data.Copyright ?? null;
    const caption = data.Caption ?? data.ImageDescription ?? data.Description ?? null;
    const kw = Array.isArray(data.Keywords) ? data.Keywords : (Array.isArray(data.Subject) ? data.Subject : null);
    const exposure = {
      time: data.ExposureTime ?? null,
      aperture: data.FNumber ?? null,
      iso: data.ISO ?? data.ISOSpeedRatings ?? null,
      focalLength: data.FocalLength ?? null,
      focalLength35mm: data.FocalLengthIn35mmFormat ?? null,
      meteringMode: data.MeteringMode ?? null,
      exposureProgram: data.ExposureProgram ?? null,
      exposureMode: data.ExposureMode ?? null
    };
    const whiteBalance = data.WhiteBalance ?? null;
    const flashFired = typeof data.Flash === 'number' ? (data.Flash & 1) === 1 : typeof data.Flash === 'boolean' ? data.Flash : null;
    const orientation = data.Orientation ?? null;
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

  const readExifFromBlob = async (blob: Blob): Promise<any | null> => {
    try {
      // @ts-expect-error vite-ignore external ESM
      const exifr = await import(/* @vite-ignore */ 'https://esm.sh/exifr@7.1.3');
      const parse = (exifr as any).parse || (exifr as any).default || exifr;
      const data: any = await parse(blob, { tiff: true, ifd1: false, xmp: true, iptc: true, translateValues: true });
      if (!data) return null;
      return mapExif(data);
    } catch {
      return null;
    }
  };

  const createFromUrl = async () => {
    if (!user?.organization_id) return;
    const u = url.trim();
    if (!u.startsWith('http')) {
      toast.error('Enter a valid URL.');
      return;
    }
    setCreating(true);
    try {
      let exif: any | null = null;
      try {
        const resp = await fetch('/api/images/exif', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: u })
        });
        if (resp.ok) {
          const json = await resp.json();
          exif = json?.exif ?? null;
        }
      } catch (e) {
        console.warn('URL EXIF fetch failed', e);
      }
      const created = await createImage({
        organization_id: user.organization_id,
        url: u,
        exif: exif ?? undefined,
        title: title.trim() || null,
        description: description.trim() || null,
        source: 'url'
      });
      toast.success('Image created.');
      setCreateOpen(false);
      setUrl('');
      setTitle('');
      setDescription('');
      navigate(`/images/${created.id}`);
    } catch (e) {
      console.error('Failed to create image', e);
      toast.error('Failed to create image.');
    } finally {
      setCreating(false);
    }
  };

  const uploadFiles = async () => {
    if (!user?.organization_id || files.length === 0) return;
    setUploading(true);
    try {
      // Ensure storage bucket exists (server uses service role to create if missing)
      try {
        await fetch('/api/images/ensure-bucket', { method: 'POST' });
      } catch {
        // non-fatal; upload may still work if bucket exists
      }
      const createdIds: string[] = [];
      for (const file of files) {
        const path = `${user.organization_id}/${Date.now()}-${file.name.replace(/\s+/g, '+')}`;
        // Request signed upload token from our API (bypasses RLS)
        const signed = await fetch('/api/images/signed-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path })
        }).then(r => r.json());
        if (!signed?.token) {
          throw new Error('Failed to get signed upload URL');
        }
        const upRes = await supabase.storage.from('images').uploadToSignedUrl(path, signed.token, file);
        if (upRes.error) throw upRes.error;
        const exif = await readExifFromBlob(file);
      const created = await createImage({
        organization_id: user.organization_id,
        url: path,
        exif: exif ?? undefined,
        title: title.trim() || file.name.replace(/\.[^./]+$/, ''),
        description: description.trim() || '',
        source: 'upload'
      });
        createdIds.push(created.id);
      }
      toast.success(files.length > 1 ? 'Images uploaded.' : 'Image uploaded.');
      setFiles([]);
      setCreateOpen(false);
      // Refresh results
      const rows = await searchImages(user.organization_id, debounced, 24);
      setResults(rows);
      if (createdIds.length === 1) navigate(`/images/${createdIds[0]}`);
    } catch (e) {
      console.error('Upload failed', e);
      toast.error('Failed to upload images.');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async () => {
    if (files.length > 0) {
      await uploadFiles();
      return;
    }
    if (url.trim().startsWith('http')) {
      await createFromUrl();
      return;
    }
    toast.error('Provide a URL or upload at least one image.');
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageMeta title="Images" description="Images directory" noIndex />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Images</h1>
        <div className="flex items-center gap-2">
          <div className="w-full max-w-sm">
            <Input placeholder="Search images…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} title="Create image">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : results.length === 0 ? (
        <div className="text-sm text-muted-foreground">No images found.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {results.map((i) => (
            <Card key={i.id} className="cursor-pointer" onClick={() => navigate(`/images/${i.id}`)}>
              <CardHeader>
                <div className="font-medium truncate">{(i as any).title || i.url}</div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground">Image</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create image</DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
              <TextArea placeholder="Description (optional)" value={description} onChange={(value) => setDescription(value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">URL</div>
              <Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Or upload</div>
              <div
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border border-dashed p-6 text-center hover:bg-muted/50"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
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
                  <div className="mb-2 text-xs text-muted-foreground">Ready</div>
                  <ul className="space-y-1 text-sm">
                    {files.map((f) => (
                      <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center justify-between">
                        <span className="truncate">{f.name}</span>
                        <span className="text-xs text-gray-500">{(f.size / 1024).toFixed(1)} KB</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={creating || uploading}>
                {creating || uploading ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


