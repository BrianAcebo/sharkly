import { supabase } from '../utils/supabaseClient';
import type { ImageEntity, ImageRecord } from '../types/image';

const mapImage = (row: Record<string, unknown>): ImageEntity => {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    source: (row.source as 'upload' | 'url' | null) ?? null,
    image: { url: (row.url as string) ?? (row.image as string) ?? '' },
    hash: (row.hash as ImageRecord['hash']) ?? null,
    exif: (row.exif as ImageRecord['exif']) ?? null,
    faces_detected: (row.faces_detected as ImageRecord['faces_detected']) ?? null,
    reverse_matches: (row.reverse_matches as string[] | null) ?? null,
    web_mentions: (row.web_mentions as ImageRecord['web_mentions']) ?? null,
    created_at: (row.created_at as string | null) ?? undefined,
    updated_at: (row.updated_at as string | null) ?? undefined
  };
};

export async function getImageById(id: string): Promise<ImageEntity> {
  const { data, error } = await supabase.from('images').select('*').eq('id', id).single();
  if (error) throw error;
  return mapImage(data as Record<string, unknown>);
}

export async function searchImages(organizationId: string, query: string, limit = 24): Promise<Array<{ id: string; url: string; title?: string | null; description?: string | null }>> {
  let req = supabase
    .from('images')
    .select('*')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  const q = query.trim();
  if (q) {
    // search by title OR description OR url
    req = req.or(`url.ilike.%${q}%,title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    url: (r.url as string) ?? '',
    title: (r.title as string | null) ?? null,
    description: (r.description as string | null) ?? null
  }));
}

export async function createImage(input: {
  organization_id: string;
  url: string;
  hash?: ImageRecord['hash'];
  exif?: ImageRecord['exif'];
  title?: string | null;
  description?: string | null;
  source?: 'upload' | 'url' | null;
}): Promise<{ id: string }> {
  // Insert with title if supported; fallback without if column missing
  const payloadWithTitle: Record<string, unknown> = {
    organization_id: input.organization_id,
    url: input.url.trim(),
    title: input.title ?? null,
    description: input.description ?? null,
    source: input.source ?? null,
    hash: input.hash ?? null,
    exif: input.exif ?? null,
    faces_detected: [],
    reverse_matches: [],
    web_mentions: []
  };
  const { data, error } = await supabase.from('images').insert(payloadWithTitle).select('id').single();
  if (error && String(error.message).toLowerCase().includes('column')) {
    const { data: data2, error: err2 } = await supabase
      .from('images')
      .insert({
        organization_id: input.organization_id,
        url: input.url.trim(),
        // Fallback to minimal subset if one of the optional columns is missing
        hash: input.hash ?? null,
        exif: input.exif ?? null,
        faces_detected: [],
        reverse_matches: [],
        web_mentions: []
      })
      .select('id')
      .single();
    if (err2) throw err2;
    return { id: (data2?.id as string) ?? '' };
  }
  if (error) throw error;
  return { id: (data?.id as string) ?? '' };
}

export async function updateImage(id: string, updates: Partial<ImageRecord>): Promise<ImageEntity> {
  const payload: Record<string, unknown> = {};
  if (updates.image?.url !== undefined) payload.url = updates.image.url.trim();
  if ((updates as any).title !== undefined) payload.title = (updates as any).title ?? null;
  if ((updates as any).description !== undefined) payload.description = (updates as any).description ?? null;
  if ((updates as any).source !== undefined) payload.source = (updates as any).source ?? null;
  if (updates.hash !== undefined) payload.hash = updates.hash ?? null;
  if (updates.exif !== undefined) payload.exif = updates.exif ?? null;
  if (updates.faces_detected !== undefined) payload.faces_detected = updates.faces_detected ?? null;
  if (updates.reverse_matches !== undefined) payload.reverse_matches = updates.reverse_matches ?? null;
  if (updates.web_mentions !== undefined) payload.web_mentions = updates.web_mentions ?? null;
  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from('images').update(payload).eq('id', id);
    if (error) throw error;
  }
  return getImageById(id);
}

export async function deleteImage(id: string) {
  await supabase.from('entity_edges').delete().or(`source_id.eq.${id},target_id.eq.${id}`);
  const { error } = await supabase.from('images').delete().eq('id', id);
  if (error) throw error;
}

// Edge helpers (idempotent)
async function attachEdge(
  source_type: string, 
  source_id: string, 
  target_type: string, 
  target_id: string, 
  transform_type = 'manual_link',
  confidence_score = 1
) {
  const { data: existing, error: pe } = await supabase
    .from('entity_edges')
    .select('id')
    .eq('source_type', source_type)
    .eq('source_id', source_id)
    .eq('target_type', target_type)
    .eq('target_id', target_id)
    .maybeSingle();
  if (pe) throw pe;
  if (existing) return;
  const { error } = await supabase
    .from('entity_edges')
    .insert({ source_type, source_id, target_type, target_id, transform_type, confidence_score, retrieved_at: new Date().toISOString(), metadata: {} });
  if (error) throw error;
}
async function detachEdge(source_type: string, source_id: string, target_type: string, target_id: string) {
  const { error } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', source_type)
    .eq('source_id', source_id)
    .eq('target_type', target_type)
    .eq('target_id', target_id);
  if (error) throw error;
}

export async function attachImageToPerson(imageId: string, personId: string, opts?: { transform_type?: string; confidence?: number }) {
  return attachEdge('image', imageId, 'person', personId, opts?.transform_type, opts?.confidence);
}
export async function detachImageFromPerson(imageId: string, personId: string) {
  return detachEdge('image', imageId, 'person', personId);
}
export async function attachImageToProfile(imageId: string, profileId: string, opts?: { transform_type?: string; confidence?: number }) {
  return attachEdge('image', imageId, 'social_profile', profileId, opts?.transform_type, opts?.confidence);
}
export async function detachImageFromProfile(imageId: string, profileId: string) {
  return detachEdge('image', imageId, 'social_profile', profileId);
}
export async function attachImageToUsername(imageId: string, usernameId: string, opts?: { transform_type?: string; confidence?: number }) {
  return attachEdge('image', imageId, 'username', usernameId, opts?.transform_type, opts?.confidence);
}
export async function detachImageFromUsername(imageId: string, usernameId: string) {
  return detachEdge('image', imageId, 'username', usernameId);
}
export async function attachImageToProperty(imageId: string, propertyId: string, opts?: { transform_type?: string; confidence?: number }) {
  return attachEdge('image', imageId, 'property', propertyId, opts?.transform_type, opts?.confidence);
}
export async function detachImageFromProperty(imageId: string, propertyId: string) {
  return detachEdge('image', imageId, 'property', propertyId);
}


