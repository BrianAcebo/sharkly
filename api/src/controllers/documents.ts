import type { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';

export async function ensureDocumentsBucket(_req: Request, res: Response) {
  try {
    const bucket = await supabase.storage.getBucket('documents');
    if (bucket.error || !bucket.data) {
      const created = await supabase.storage.createBucket('documents', { public: false, fileSizeLimit: '104857600' }); // 100MB
      if (created.error) return res.status(500).json({ error: { message: created.error.message } });
      return res.json({ created: true });
    }
    return res.json({ exists: true });
  } catch (e) {
    console.error('ensure documents bucket error', e);
    return res.status(500).json({ error: { message: 'Failed to ensure bucket' } });
  }
}

export async function signedUploadUrl(req: Request, res: Response) {
  try {
    const { path } = req.body as { path?: string };
    if (!path) return res.status(400).json({ error: { message: 'path is required' } });
    const bucket = await supabase.storage.getBucket('documents');
    if (bucket.error || !bucket.data) {
      const created = await supabase.storage.createBucket('documents', { public: false, fileSizeLimit: '104857600' });
      if (created.error) return res.status(500).json({ error: { message: created.error.message } });
    }
    const { data, error } = await supabase.storage.from('documents').createSignedUploadUrl(path);
    if (error || !data) {
      return res.status(500).json({ error: { message: error?.message ?? 'failed to create signed upload url' } });
    }
    return res.json({ path, token: data.token });
  } catch (e) {
    console.error('documents signedUploadUrl error', e);
    return res.status(500).json({ error: { message: 'Failed to create signed upload URL' } });
  }
}

export async function signObjectUrl(req: Request, res: Response) {
  try {
    const { path, expiresIn } = req.body as { path?: string; expiresIn?: number };
    if (!path) return res.status(400).json({ error: { message: 'path is required' } });
    const ttl = typeof expiresIn === 'number' && expiresIn > 0 ? expiresIn : 600;
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, ttl);
    if (error || !data?.signedUrl) {
      return res.status(500).json({ error: { message: error?.message ?? 'failed to sign url' } });
    }
    return res.json({ signedUrl: data.signedUrl });
  } catch (e) {
    console.error('documents signObjectUrl error', e);
    return res.status(500).json({ error: { message: 'Failed to sign object URL' } });
  }
}


