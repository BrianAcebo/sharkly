import { supabase } from '../utils/supabaseClient';

export type SubjectType = 'person' | 'company';

export interface SubjectRecord {
  id: string;
  organization_id: string;
  type: SubjectType;
  name: string;
  email: string | null;
  avatar: string | null;
  location: { city?: string; country?: string; ip?: string } | null;
  devices: Array<{ type: string; os: string; lastUsed?: string; last_used?: string }>;
  social_profiles: Array<{ platform: string; username: string; url?: string }>;
  aliases?: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export async function getSubjectById(id: string) {
  const { data, error } = await supabase.from('subjects').select('*').eq('id', id).single();
  if (error) throw error;
  return data as SubjectRecord;
}

export async function listSubjects(organizationId: string, search?: string, page = 1, perPage = 20) {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let q = supabase.from('subjects').select('*', { count: 'exact' }).eq('organization_id', organizationId).order('updated_at', { ascending: false });
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.ilike('name', s);
  }
  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  return { results: (data as SubjectRecord[]) ?? [], total: count ?? 0 };
}

export interface CreateSubjectInput {
  organization_id: string;
  type: SubjectType;
  name: string;
  email?: string | null;
  avatar?: string | null;
  location?: { city?: string; country?: string; ip?: string } | null;
  devices?: Array<{ type: string; os: string; lastUsed?: string; last_used?: string }>;
  social_profiles?: Array<{ platform: string; username: string; url?: string }>;
  aliases?: string[];
  tags?: string[];
}

export async function createSubject(input: CreateSubjectInput) {
  const { data, error } = await supabase
    .from('subjects')
    .insert({
      organization_id: input.organization_id,
      type: input.type,
      name: input.name,
      email: input.email ?? null,
      avatar: input.avatar ?? null,
      location: input.location ?? {},
      devices: input.devices ?? [],
      social_profiles: input.social_profiles ?? [],
      aliases: input.aliases ?? [],
      tags: input.tags ?? []
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as SubjectRecord;
}

export type UpdateSubjectInput = Partial<Omit<CreateSubjectInput, 'organization_id' | 'type' | 'name'>> & {
  type?: SubjectType;
  name?: string;
};

export async function updateSubject(id: string, updates: UpdateSubjectInput) {
  const { data, error } = await supabase.from('subjects').update(updates).eq('id', id).select('*').single();
  if (error) throw error;
  return data as SubjectRecord;
}

export async function deleteSubject(id: string) {
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw error;
}


