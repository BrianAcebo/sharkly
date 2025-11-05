import { supabase } from '../utils/supabaseClient';
import type { PersonRecord, CreatePersonInput, UpdatePersonInput, WebMention } from '../types/person';

export async function getPersonById(id: string) {
  const { data, error } = await supabase.from('people').select('*').eq('id', id).single();
  if (error) throw error;
  return data as PersonRecord;
}

export async function listPeople(organizationId: string, search?: string, page = 1, perPage = 20) {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let q = supabase.from('people').select('*', { count: 'exact' }).eq('organization_id', organizationId).order('updated_at', { ascending: false });
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.ilike('name', s);
  }
  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return { results: (data as PersonRecord[]) ?? [], total: count ?? 0 };
}

export async function createPerson(input: CreatePersonInput) {
  const { data, error } = await supabase
    .from('people')
    .insert({
      organization_id: input.organization_id,
      name: input.name,
      email: input.email ?? null,
      avatar: input.avatar ?? null,
      location: input.location ?? {},
      devices: input.devices ?? [],
      social_profiles: input.social_profiles ?? [],
      web_mentions: input.web_mentions ?? [],
      aliases: input.aliases ?? [],
      tags: input.tags ?? [],
      confidence: input.confidence ?? null,
      first_seen: input.first_seen ? new Date(input.first_seen).toISOString() : null,
      last_seen: input.last_seen ? new Date(input.last_seen).toISOString() : null
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PersonRecord;
}

export async function updatePerson(id: string, updates: UpdatePersonInput) {
  const payload = {
    ...updates,
    first_seen: updates.first_seen ? new Date(updates.first_seen).toISOString() : updates.first_seen ?? null,
    last_seen: updates.last_seen ? new Date(updates.last_seen).toISOString() : updates.last_seen ?? null
  };
  const { data, error } = await supabase.from('people').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data as PersonRecord;
}

export async function deletePerson(id: string) {
  const { error } = await supabase.from('people').delete().eq('id', id);
  if (error) throw error;
}

export async function appendPersonWebMentions(id: string, mentions: WebMention[]) {
  const { data: row, error: getErr } = await supabase.from('people').select('web_mentions').eq('id', id).single();
  if (getErr) throw getErr;
  const existing: WebMention[] = (row?.web_mentions as WebMention[] | undefined) ?? [];
  const byLink = new Map<string, WebMention>();
  for (const m of existing) if (m.link) byLink.set(m.link, m);
  for (const m of mentions) {
    const link = m.link ?? '';
    if (link && !byLink.has(link)) byLink.set(link, m);
  }
  const updated = Array.from(byLink.values());
  const { error: updErr } = await supabase.from('people').update({ web_mentions: updated }).eq('id', id);
  if (updErr) throw updErr;
  return updated;
}


