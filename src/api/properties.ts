import { supabase } from '../utils/supabaseClient';
import type { PropertyRecord } from '../types/property';

export async function getPropertyById(id: string) {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as PropertyRecord;
}

export async function listProperties(organizationId: string, search?: string, page = 1, perPage = 20) {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let q = supabase
    .from('properties')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false });
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(`address_full.ilike.${s}`);
  }
  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return { results: (data as PropertyRecord[]) ?? [], total: count ?? 0 };
}

export interface CreatePropertyInput extends Partial<PropertyRecord> {
  organization_id: string;
}

export async function createProperty(input: CreatePropertyInput) {
  const { data, error } = await supabase.from('properties').insert(input).select('*').single();
  if (error) throw error;
  return data as PropertyRecord;
}

export type UpdatePropertyInput = Partial<CreatePropertyInput>;

export async function updateProperty(id: string, updates: UpdatePropertyInput) {
  const { data, error } = await supabase.from('properties').update(updates).eq('id', id).select('*').single();
  if (error) throw error;
  return data as PropertyRecord;
}

export async function deleteProperty(id: string): Promise<void> {
  const { error } = await supabase.from('properties').delete().eq('id', id);
  if (error) throw error;
}

export async function attachPropertyToPerson(propertyId: string, personId: string, opts?: { transform_type?: string; confidence_score?: number | null; source_api?: string | null; source_url?: string | null; raw_reference_id?: string | null; metadata?: Record<string, unknown> | null; retrieved_at?: string | null }) {
  // Avoid duplicate edges
  const { data: existing, error: existingErr } = await supabase
    .from('entity_edges')
    .select('id')
    .eq('source_type', 'person')
    .eq('source_id', personId)
    .eq('target_type', 'property')
    .eq('target_id', propertyId)
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) return;
  const nowIso = new Date().toISOString();
  const { error } = await supabase.from('entity_edges').insert({
    source_type: 'person',
    source_id: personId,
    target_type: 'property',
    target_id: propertyId,
    transform_type: opts?.transform_type ?? 'manual_link',
    confidence_score: opts?.confidence_score ?? 1,
    source_api: opts?.source_api ?? 'internal',
    source_url: opts?.source_url ?? null,
    raw_reference_id: opts?.raw_reference_id ?? null,
    metadata: opts?.metadata ?? {},
    retrieved_at: opts?.retrieved_at ?? nowIso
  });
  if (error) throw error;
}

export async function removePropertyFromPerson(propertyId: string, personId: string) {
  const { error } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', 'person')
    .eq('source_id', personId)
    .eq('target_type', 'property')
    .eq('target_id', propertyId);
  if (error) throw error;
}


