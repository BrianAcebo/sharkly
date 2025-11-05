import { supabase } from '../utils/supabaseClient';
import type { WebMention } from '../types/person';
import type { BusinessRecord, CreateBusinessInput, UpdateBusinessInput } from '../types/business';

export async function getBusinessById(id: string) {
  const { data, error } = await supabase.from('businesses').select('*').eq('id', id).single();
  if (error) throw error;
  return data as BusinessRecord;
}

export async function listBusinesses(organizationId: string, search?: string, page = 1, perPage = 20) {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let q = supabase.from('businesses').select('*', { count: 'exact' }).eq('organization_id', organizationId).order('updated_at', { ascending: false });
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.ilike('name', s);
  }
  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return { results: (data as BusinessRecord[]) ?? [], total: count ?? 0 };
}

export async function createBusiness(input: CreateBusinessInput) {
  const { data, error } = await supabase
    .from('businesses')
    .insert({
      organization_id: input.organization_id,
      name: input.name,
      ein_tax_id: input.ein_tax_id ?? null,
      avatar: input.avatar ?? null,
      officers: input.officers ?? [],
      addresses: input.addresses ?? [],
      registration: input.registration ?? {},
      domains: input.domains ?? []
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as BusinessRecord;
}

export async function updateBusiness(id: string, updates: UpdateBusinessInput) {
  const { data, error } = await supabase.from('businesses').update(updates).eq('id', id).select('*').single();
  if (error) throw error;
  return data as BusinessRecord;
}

export async function deleteBusiness(id: string) {
  const { error } = await supabase.from('businesses').delete().eq('id', id);
  if (error) throw error;
}


export async function appendBusinessWebMentions(id: string, mentions: WebMention[]) {
  const { data: row, error: getErr } = await supabase.from('businesses').select('web_mentions').eq('id', id).single();
  if (getErr) throw getErr;
  const existing: WebMention[] = (row?.web_mentions as WebMention[] | undefined) ?? [];
  const byLink = new Map<string, WebMention>();
  for (const m of existing) if (m.link) byLink.set(m.link, m);
  for (const m of mentions) {
    const link = m.link ?? '';
    if (link && !byLink.has(link)) byLink.set(link, m);
  }
  const updated = Array.from(byLink.values());
  const { error: updErr } = await supabase.from('businesses').update({ web_mentions: updated }).eq('id', id);
  if (updErr) throw updErr;
  return updated;
}


