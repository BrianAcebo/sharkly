import type { Request, Response } from 'express';
import exifr from 'exifr';
import { supabase } from '../utils/supabaseClient.js';

export async function extractExif(req: Request, res: Response) {
  try {
    const { url } = req.body as { url?: string };
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: { message: 'url is required' } });
    }
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.status(400).json({ error: { message: `fetch failed: ${resp.status}` } });
    }
    const buf = await resp.arrayBuffer();
    // Parse EXIF using exifr
    const raw: Record<string, unknown> = (await (exifr as unknown as { parse: (b: ArrayBuffer, o?: unknown) => Promise<Record<string, unknown>> }).parse(buf, {
      tiff: true,
      ifd1: false,
      xmp: true,
      iptc: true,
      translateValues: true
    })) || {};

    const get = (k: string) => (raw as Record<string, unknown>)[k];
    const lat = (get('latitude') ?? get('GPSLatitude')) ?? null;
    const lon = (get('longitude') ?? get('GPSLongitude')) ?? null;
    const alt = (get('altitude') ?? get('GPSAltitude')) ?? null;

    let ts: string | null = null;
    const dt = (get('DateTimeOriginal') ?? get('CreateDate') ?? get('ModifyDate')) as unknown;
    if (dt) {
      const d = dt instanceof Date ? dt : new Date(String(dt));
      ts = isNaN(d.getTime()) ? null : d.toISOString();
    }

    const make = (get('Make') as string | undefined) ?? null;
    const model = (get('Model') as string | undefined) ?? null;
    const device = [make, model].filter(Boolean).join(' ').trim() || null;
    const lens = ((get('LensModel') ?? get('Lens')) as string | undefined) ?? null;
    const software = (get('Software') as string | undefined) ?? null;
    const imageId = (get('ImageUniqueID') as string | undefined) ?? null;
    const serialNumber = (get('SerialNumber') as string | undefined) ?? null;
    const owner = ((get('OwnerName') ?? get('Artist')) as string | undefined) ?? null;
    const copyright = (get('Copyright') as string | undefined) ?? null;
    const caption = ((get('Caption') ?? get('ImageDescription') ?? get('Description')) as string | undefined) ?? null;
    const kwRaw = (get('Keywords') ?? get('Subject')) as unknown;
    const keywords = Array.isArray(kwRaw) ? kwRaw as string[] : null;

    const exif = {
      timestamp: ts,
      gps: (lat != null || lon != null || alt != null) ? { lat, lon, alt } : null,
      make,
      model,
      device,
      lens,
      software,
      imageId,
      serialNumber,
      owner,
      copyright,
      caption,
      keywords: keywords ?? null,
      exposure: {
        time: (get('ExposureTime') as number | undefined) ?? null,
        aperture: (get('FNumber') as number | undefined) ?? null,
        iso: ((get('ISO') ?? get('ISOSpeedRatings')) as number | undefined) ?? null,
        focalLength: (get('FocalLength') as number | undefined) ?? null,
        focalLength35mm: (get('FocalLengthIn35mmFormat') as number | undefined) ?? null,
        meteringMode: (get('MeteringMode') as number | undefined) ?? null,
        exposureProgram: (get('ExposureProgram') as number | undefined) ?? null,
        exposureMode: (get('ExposureMode') as number | undefined) ?? null
      },
      whiteBalance: (get('WhiteBalance') as number | undefined) ?? null,
      flashFired: typeof get('Flash') === 'number' ? (((get('Flash') as number) & 1) === 1) : (typeof get('Flash') === 'boolean' ? (get('Flash') as boolean) : null),
      orientation: (get('Orientation') as number | undefined) ?? null,
      edited: typeof software === 'string' ? /photoshop|lightroom|snapseed|pixelmator|gimp|canva|darktable/i.test(software) : null
    };

    res.json({ exif });
  } catch (e) {
    console.error('extract exif error', e);
    res.status(500).json({ error: { message: 'Failed to extract EXIF' } });
  }
}

export async function ensureImagesBucket(_req: Request, res: Response) {
  try {
    const bucket = await supabase.storage.getBucket('images');
    if (bucket.error || !bucket.data) {
      // Try to create if not present
      const created = await supabase.storage.createBucket('images', {
        public: false,
        fileSizeLimit: '52428800' // 50MB
      });
      if (created.error) {
        return res.status(500).json({ error: { message: created.error.message } });
      }
      return res.json({ created: true });
    }
    return res.json({ exists: true });
  } catch (e) {
    console.error('ensure images bucket error', e);
    return res.status(500).json({ error: { message: 'Failed to ensure bucket' } });
  }
}

export async function signedUploadUrl(req: Request, res: Response) {
  try {
    const { path } = req.body as { path?: string };
    if (!path) return res.status(400).json({ error: { message: 'path is required' } });
    // Ensure bucket exists
    const bucket = await supabase.storage.getBucket('images');
    if (bucket.error || !bucket.data) {
      const created = await supabase.storage.createBucket('images', { public: false, fileSizeLimit: '52428800' });
      if (created.error) return res.status(500).json({ error: { message: created.error.message } });
    }
    const { data, error } = await supabase.storage.from('images').createSignedUploadUrl(path);
    if (error || !data) {
      return res.status(500).json({ error: { message: error?.message ?? 'failed to create signed upload url' } });
    }
    return res.json({ path, token: data.token });
  } catch (e) {
    console.error('signedUploadUrl error', e);
    return res.status(500).json({ error: { message: 'Failed to create signed upload URL' } });
  }
}

export async function signObjectUrl(req: Request, res: Response) {
  try {
    const { path, expiresIn } = req.body as { path?: string; expiresIn?: number };
    if (!path) return res.status(400).json({ error: { message: 'path is required' } });
    const ttl = typeof expiresIn === 'number' && expiresIn > 0 ? expiresIn : 600;
    const { data, error } = await supabase.storage.from('images').createSignedUrl(path, ttl);
    if (error || !data?.signedUrl) {
      return res.status(500).json({ error: { message: error?.message ?? 'failed to sign url' } });
    }
    return res.json({ signedUrl: data.signedUrl });
  } catch (e) {
    console.error('signObjectUrl error', e);
    return res.status(500).json({ error: { message: 'Failed to sign object URL' } });
  }
}


