import { supabase } from '../utils/supabaseClient';
import type { SocialProfileRecord } from '../types/social';
import type { PersonRecord } from '../types/person';

type EdgeRow = {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  transform_type: string | null;
  confidence_score: number | null;
};

export interface SocialProfileEntity {
  id: string;
  organization_id: string;
  profile: SocialProfileRecord['profile'];
  created_at?: string;
  updated_at?: string;
}

export interface SocialProfilePersonLink {
  edge: EdgeRow;
  person: Pick<PersonRecord, 'id' | 'name' | 'avatar'>;
}

export interface SocialProfileDetailResponse {
  profile: SocialProfileEntity;
  people: SocialProfilePersonLink[];
  emails: Array<{ edge: EdgeRow; email: { id: string; address: string; domain: string | null } }>;
  usernames: Array<{ edge: EdgeRow; username: { id: string; value: string } }>;
}

export async function getSocialProfileById(id: string): Promise<SocialProfileDetailResponse> {
  const { data: row, error } = await supabase
    .from('social_profiles')
    .select('id, organization_id, platform, handle, profile_url, display_name, bio, posts, followers_count, following_count, join_date, location, created_at, updated_at')
    .eq('id', id)
    .single();
  if (error) throw error;
  if (!row) throw new Error('Profile not found');

  const { data: edgeRows, error: edgeError } = await supabase
    .from('entity_edges')
    .select('*')
    .eq('target_type', 'social_profile')
    .eq('target_id', id);
  if (edgeError) throw edgeError;

  const peopleEdges = (edgeRows ?? []).filter((e) => e.source_type === 'person') as EdgeRow[];
  const emailEdges = (edgeRows ?? []).filter((e) => e.source_type === 'email') as EdgeRow[];
  const usernameEdges = (edgeRows ?? []).filter((e) => e.source_type === 'username') as EdgeRow[];
  const personIds = peopleEdges.map((e) => e.source_id);

  let personMap = new Map<string, Pick<PersonRecord, 'id' | 'name' | 'avatar'>>();
  if (personIds.length > 0) {
    const { data: people, error: pErr } = await supabase
      .from('people')
      .select('id, name, avatar')
      .in('id', personIds);
    if (pErr) throw pErr;
    personMap = new Map(
      (people ?? []).map((p) => [p.id as string, { id: p.id as string, name: p.name, avatar: (p as any).avatar ?? null }])
    );
  }

  const people: SocialProfilePersonLink[] = peopleEdges
    .map((edge) => {
      const person = personMap.get(edge.source_id);
      if (!person) return null;
      return { edge, person };
    })
    .filter((v): v is SocialProfilePersonLink => Boolean(v));

  // Emails
  let emails: Array<{ edge: EdgeRow; email: { id: string; address: string; domain: string | null } }> = [];
  if (emailEdges.length > 0) {
    const emailIds = emailEdges.map((e) => e.source_id);
    const { data: emailRows, error: emailErr } = await supabase.from('emails').select('id,address,domain').in('id', emailIds);
    if (emailErr) throw emailErr;
    const map = new Map((emailRows ?? []).map((r) => [r.id as string, r]));
    emails = emailEdges
      .map((edge) => {
        const r = map.get(edge.source_id);
        if (!r) return null;
        return {
          edge,
          email: { id: r.id as string, address: r.address as string, domain: (r.domain as string | null) ?? null }
        };
      })
      .filter((v): v is { edge: EdgeRow; email: { id: string; address: string; domain: string | null } } => Boolean(v));
  }

  // Usernames
  let usernames: Array<{ edge: EdgeRow; username: { id: string; value: string } }> = [];
  if (usernameEdges.length > 0) {
    const usernameIds = usernameEdges.map((e) => e.source_id);
    const { data: usernameRows, error: uErr } = await supabase.from('usernames').select('id,value').in('id', usernameIds);
    if (uErr) throw uErr;
    const map = new Map((usernameRows ?? []).map((r) => [r.id as string, r]));
    usernames = usernameEdges
      .map((edge) => {
        const r = map.get(edge.source_id);
        if (!r) return null;
        return { edge, username: { id: r.id as string, value: (r.value as string) ?? '' } };
      })
      .filter((v): v is { edge: EdgeRow; username: { id: string; value: string } } => Boolean(v));
  }

  return {
    profile: {
      id: row.id as string,
      organization_id: row.organization_id as string,
      profile: {
        handle: (row.handle as string) ?? '',
        platform: (row.platform as string) ?? '',
        profile_url: (row.profile_url as string | null) ?? null,
        display_name: (row.display_name as string | null) ?? null,
        bio: (row.bio as string | null) ?? null,
        posts: (row.posts as any[] | null) ?? null,
        followers_count: (row.followers_count as number | null) ?? null,
        following_count: (row.following_count as number | null) ?? null,
        join_date: (row.join_date as string | null) ?? null,
        location: (row.location as string | null) ?? null
      },
      created_at: row.created_at as string | undefined,
      updated_at: row.updated_at as string | undefined
    },
    people,
    emails,
    usernames
  };
}

export interface UpdateSocialProfileInput {
  profile?: Partial<SocialProfileRecord['profile']>;
}

export async function updateSocialProfile(id: string, updates: UpdateSocialProfileInput): Promise<SocialProfileEntity> {
  const payload: Record<string, unknown> = {};
  if (updates.profile !== undefined) {
    const p = updates.profile ?? {};
    if (p.platform !== undefined) payload.platform = p.platform;
    if (p.handle !== undefined) payload.handle = p.handle;
    if (p.profile_url !== undefined) payload.profile_url = p.profile_url ?? null;
    if (p.display_name !== undefined) payload.display_name = p.display_name ?? null;
    if (p.bio !== undefined) payload.bio = p.bio ?? null;
    if (p.posts !== undefined) payload.posts = p.posts ?? null;
    if (p.followers_count !== undefined) payload.followers_count = p.followers_count ?? null;
    if (p.following_count !== undefined) payload.following_count = p.following_count ?? null;
    if (p.join_date !== undefined) payload.join_date = p.join_date ?? null;
    if (p.location !== undefined) payload.location = p.location ?? null;
  }
  let updated = null as any;
  if (Object.keys(payload).length > 0) {
    const { data, error } = await supabase.from('social_profiles').update(payload).eq('id', id).select('id, organization_id, platform, handle, profile_url, display_name, bio, posts, followers_count, following_count, join_date, location, created_at, updated_at').single();
    if (error) throw error;
    updated = data;
  } else {
    const { data, error } = await supabase.from('social_profiles').select('id, organization_id, platform, handle, profile_url, display_name, bio, posts, followers_count, following_count, join_date, location, created_at, updated_at').eq('id', id).single();
    if (error) throw error;
    updated = data;
  }
  return {
    id: updated.id as string,
    organization_id: updated.organization_id as string,
    profile: {
      handle: (updated.handle as string) ?? '',
      platform: (updated.platform as string) ?? '',
      profile_url: (updated.profile_url as string | null) ?? null,
      display_name: (updated.display_name as string | null) ?? null,
      bio: (updated.bio as string | null) ?? null,
      posts: (updated.posts as any[] | null) ?? null,
      followers_count: (updated.followers_count as number | null) ?? null,
      following_count: (updated.following_count as number | null) ?? null,
      join_date: (updated.join_date as string | null) ?? null,
      location: (updated.location as string | null) ?? null
    },
    created_at: updated.created_at as string | undefined,
    updated_at: updated.updated_at as string | undefined
  };
}

export async function searchSocialProfiles(
  organizationId: string,
  query: string,
  limit = 10
): Promise<Array<{ id: string; platform: string; handle: string; profile_url: string | null }>> {
  let request = supabase
    .from('social_profiles')
    .select('id, platform, handle, profile_url, organization_id')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  const trimmed = query.trim();
  if (trimmed.length > 0) {
    request = request.or(`handle.ilike.%${trimmed}%,platform.ilike.%${trimmed}%`);
  }
  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []).map((row) => {
    return {
      id: row.id as string,
      platform: (row.platform as string) ?? '',
      handle: (row.handle as string) ?? '',
      profile_url: (row.profile_url as string | null) ?? null
    };
  });
}

export async function createSocialProfile(input: {
  organization_id: string;
  profile: Partial<SocialProfileRecord['profile']>;
}): Promise<{ id: string }> {
  const payload = {
    organization_id: input.organization_id,
    platform: input.profile.platform ?? '',
    handle: input.profile.handle ?? '',
    profile_url: input.profile.profile_url ?? null,
    display_name: input.profile.display_name ?? null,
    bio: input.profile.bio ?? null
  } as Record<string, unknown>;
  const { data, error } = await supabase.from('social_profiles').insert(payload).select('id').single();
  if (error) throw error;
  return { id: (data?.id as string) ?? '' };
}

export async function attachProfileToPerson(profileId: string, personId: string, opts?: { transform_type?: string; confidence_score?: number | null; source_api?: string | null; source_url?: string | null; raw_reference_id?: string | null; metadata?: Record<string, unknown> | null; retrieved_at?: string | null }) {
  // Avoid duplicate edges
  const { data: existing, error: existingErr } = await supabase
    .from('entity_edges')
    .select('id')
    .eq('source_type', 'person')
    .eq('source_id', personId)
    .eq('target_type', 'social_profile')
    .eq('target_id', profileId)
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) return;
  const nowIso = new Date().toISOString();
  const row = {
    source_type: 'person',
    source_id: personId,
    target_type: 'social_profile',
    target_id: profileId,
    transform_type: opts?.transform_type ?? 'manual_link',
    confidence_score: opts?.confidence_score ?? 1,
    source_api: opts?.source_api ?? 'internal',
    source_url: opts?.source_url ?? null,
    raw_reference_id: opts?.raw_reference_id ?? null,
    metadata: opts?.metadata ?? {},
    retrieved_at: opts?.retrieved_at ?? nowIso
  };
  const { error } = await supabase.from('entity_edges').insert(row);
  if (error) throw error;
}

export async function removeProfileFromPerson(personId: string, profileId: string) {
  const { error } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', 'person')
    .eq('source_id', personId)
    .eq('target_type', 'social_profile')
    .eq('target_id', profileId);
  if (error) throw error;
}

export async function attachProfileToPhone(profileId: string, phoneId: string, opts?: { transform_type?: string; confidence_score?: number | null; source_api?: string | null; source_url?: string | null; raw_reference_id?: string | null; metadata?: Record<string, unknown> | null; retrieved_at?: string | null }) {
  // Avoid duplicate edges
  const { data: existing, error: existingErr } = await supabase
    .from('entity_edges')
    .select('id')
    .eq('source_type', 'phone')
    .eq('source_id', phoneId)
    .eq('target_type', 'social_profile')
    .eq('target_id', profileId)
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) return;
  const nowIso = new Date().toISOString();
  const row = {
    source_type: 'phone',
    source_id: phoneId,
    target_type: 'social_profile',
    target_id: profileId,
    transform_type: opts?.transform_type ?? 'manual_link',
    confidence_score: opts?.confidence_score ?? 1,
    source_api: opts?.source_api ?? 'internal',
    source_url: opts?.source_url ?? null,
    raw_reference_id: opts?.raw_reference_id ?? null,
    metadata: opts?.metadata ?? {},
    retrieved_at: opts?.retrieved_at ?? nowIso
  };
  const { error } = await supabase.from('entity_edges').insert(row);
  if (error) throw error;
}

export async function removeProfileFromPhone(phoneId: string, profileId: string) {
  const { error } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', 'phone')
    .eq('source_id', phoneId)
    .eq('target_type', 'social_profile')
    .eq('target_id', profileId);
  if (error) throw error;
}

export async function attachProfileToEmail(profileId: string, emailId: string, opts?: { transform_type?: string; confidence_score?: number | null; source_api?: string | null; source_url?: string | null; raw_reference_id?: string | null; metadata?: Record<string, unknown> | null; retrieved_at?: string | null }) {
  // Avoid duplicate edges
  const { data: existing, error: existingErr } = await supabase
    .from('entity_edges')
    .select('id')
    .eq('source_type', 'email')
    .eq('source_id', emailId)
    .eq('target_type', 'social_profile')
    .eq('target_id', profileId)
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) return;
  const nowIso = new Date().toISOString();
  const row = {
    source_type: 'email',
    source_id: emailId,
    target_type: 'social_profile',
    target_id: profileId,
    transform_type: opts?.transform_type ?? 'manual_link',
    confidence_score: opts?.confidence_score ?? 1,
    source_api: opts?.source_api ?? 'internal',
    source_url: opts?.source_url ?? null,
    raw_reference_id: opts?.raw_reference_id ?? null,
    metadata: opts?.metadata ?? {},
    retrieved_at: opts?.retrieved_at ?? nowIso
  };
  const { error } = await supabase.from('entity_edges').insert(row);
  if (error) throw error;
}

export async function removeProfileFromEmail(emailId: string, profileId: string) {
  const { error } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', 'email')
    .eq('source_id', emailId)
    .eq('target_type', 'social_profile')
    .eq('target_id', profileId);
  if (error) throw error;
}

export async function attachProfileToUsername(profileId: string, usernameId: string, opts?: { transform_type?: string; confidence_score?: number | null; source_api?: string | null; source_url?: string | null; raw_reference_id?: string | null; metadata?: Record<string, unknown> | null; retrieved_at?: string | null }) {
  // Avoid duplicate edges
  const { data: existing, error: existingErr } = await supabase
    .from('entity_edges')
    .select('id')
    .eq('source_type', 'username')
    .eq('source_id', usernameId)
    .eq('target_type', 'social_profile')
    .eq('target_id', profileId)
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) return;
  const nowIso = new Date().toISOString();
  const row = {
    source_type: 'username',
    source_id: usernameId,
    target_type: 'social_profile',
    target_id: profileId,
    transform_type: opts?.transform_type ?? 'manual_link',
    confidence_score: opts?.confidence_score ?? 1,
    source_api: opts?.source_api ?? 'internal',
    source_url: opts?.source_url ?? null,
    raw_reference_id: opts?.raw_reference_id ?? null,
    metadata: opts?.metadata ?? {},
    retrieved_at: opts?.retrieved_at ?? nowIso
  };
  const { error } = await supabase.from('entity_edges').insert(row);
  if (error) throw error;
}

export async function removeProfileFromUsername(usernameId: string, profileId: string) {
  const { error } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', 'username')
    .eq('source_id', usernameId)
    .eq('target_type', 'social_profile')
    .eq('target_id', profileId);
  if (error) throw error;
}

export async function deleteSocialProfile(id: string): Promise<void> {
  // Cascade delete edges pointing to or from this profile
  const { error: tgtErr } = await supabase
    .from('entity_edges')
    .delete()
    .eq('target_type', 'social_profile')
    .eq('target_id', id);
  if (tgtErr) throw tgtErr;
  const { error: srcErr } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', 'social_profile')
    .eq('source_id', id);
  if (srcErr) throw srcErr;
  const { error } = await supabase.from('social_profiles').delete().eq('id', id);
  if (error) throw error;
}


