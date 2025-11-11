import { supabase } from '../utils/supabaseClient';
import type { SocialProfileRecord } from '../types/social';

type EdgeRow = {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  transform_type: string | null;
  confidence_score: number | null;
  source_api?: string | null;
  source_url?: string | null;
  raw_reference_id?: string | null;
  metadata?: Record<string, unknown> | null;
  retrieved_at?: string | null;
};

export interface UsernameEntity {
  id: string;
  organization_id: string;
  value: string;
  confidence?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface UsernameEmailLink {
  edge: EdgeRow;
  email: { id: string; address: string; domain: string | null };
}

export interface UsernameProfileLink {
  edge: EdgeRow;
  profile: { id: string; platform: string; handle: string; profile_url: string | null };
}

export interface UsernameDetailResponse {
  username: UsernameEntity;
  emails: UsernameEmailLink[];
  profiles: UsernameProfileLink[];
}

const mapUsername = (row: Record<string, unknown>): UsernameEntity => ({
  id: row.id as string,
  organization_id: row.organization_id as string,
  value: (row.value as string) ?? (row.username as string) ?? '',
  confidence: (row.confidence as number | null) ?? null,
  created_at: row.created_at as string | undefined,
  updated_at: row.updated_at as string | undefined
});

export async function getUsernameById(id: string): Promise<UsernameDetailResponse> {
  const { data: row, error } = await supabase.from('usernames').select('*').eq('id', id).single();
  if (error) throw error;
  if (!row) throw new Error('Username not found');
  const username = mapUsername(row as Record<string, unknown>);

  const { data: edges, error: edgeErr } = await supabase
    .from('entity_edges')
    .select('*')
    .eq('source_type', 'username')
    .eq('source_id', id);
  if (edgeErr) throw edgeErr;

  const emailEdges = (edges ?? []).filter((e) => e.target_type === 'email') as EdgeRow[];
  const profileEdges = (edges ?? []).filter((e) => e.target_type === 'social_profile') as EdgeRow[];

  let emails: UsernameEmailLink[] = [];
  if (emailEdges.length > 0) {
    const emailIds = emailEdges.map((e) => e.target_id);
    const { data: emailRows, error: emailErr } = await supabase
      .from('emails')
      .select('id, address, domain')
      .in('id', emailIds);
    if (emailErr) throw emailErr;
    const map = new Map((emailRows ?? []).map((r) => [r.id as string, r]));
    emails = emailEdges
      .map((edge) => {
        const e = map.get(edge.target_id);
        if (!e) return null;
        return {
          edge,
          email: {
            id: e.id as string,
            address: e.address as string,
            domain: (e.domain as string | null) ?? null
          }
        } as UsernameEmailLink;
      })
      .filter((v): v is UsernameEmailLink => Boolean(v));
  }

  let profiles: UsernameProfileLink[] = [];
  if (profileEdges.length > 0) {
    const profileIds = profileEdges.map((e) => e.target_id);
    const { data: profileRows, error: pErr } = await supabase
      .from('social_profiles')
      .select('id, platform, handle, profile_url')
      .in('id', profileIds);
    if (pErr) throw pErr;
    const map = new Map((profileRows ?? []).map((r) => [r.id as string, r]));
    profiles = profileEdges
      .map((edge) => {
        const p = map.get(edge.target_id);
        if (!p) return null;
        return {
          edge,
          profile: {
            id: p.id as string,
            platform: (p.platform as string) ?? '',
            handle: (p.handle as string) ?? '',
            profile_url: (p.profile_url as string | null) ?? null
          }
        } as UsernameProfileLink;
      })
      .filter((v): v is UsernameProfileLink => Boolean(v));
  }

  return { username, emails, profiles };
}

export async function updateUsername(id: string, updates: { value?: string; confidence?: number | null }): Promise<UsernameEntity> {
  const payload: Record<string, unknown> = {};
  if (updates.value !== undefined) payload.value = updates.value;
  // Some deployments may not have a 'confidence' column on usernames; avoid writing it
  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from('usernames').update(payload).eq('id', id);
    if (error) throw error;
  }
  const { data, error: loadErr } = await supabase.from('usernames').select('*').eq('id', id).single();
  if (loadErr) throw loadErr;
  return mapUsername(data as Record<string, unknown>);
}

export async function searchUsernames(organizationId: string, query: string, limit = 10): Promise<Array<{ id: string; value: string }>> {
  let request = supabase
    .from('usernames')
    .select('id, value, organization_id')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  const trimmed = query.trim();
  if (trimmed.length > 0) {
    request = request.ilike('value', `%${trimmed}%`);
  }
  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id as string, value: (row.value as string) ?? '' }));
}

export async function createUsername(input: {
  organization_id: string;
  value: string;
  confidence?: number | null;
}): Promise<{ id: string; value: string }> {
  const payload = {
    organization_id: input.organization_id,
    value: input.value.trim()
  } as Record<string, unknown>;
  const { data, error } = await supabase.from('usernames').insert(payload).select('id, value').single();
  if (error) throw error;
  return { id: (data?.id as string) ?? '', value: (data?.value as string) ?? input.value };
}

export async function deleteUsername(id: string): Promise<void> {
  const { error } = await supabase.from('usernames').delete().eq('id', id);
  if (error) throw error;
}

export async function attachEmailToUsername(usernameId: string, emailId: string, opts?: { transform_type?: string; confidence_score?: number | null; source_api?: string | null; source_url?: string | null; raw_reference_id?: string | null; metadata?: Record<string, unknown> | null; retrieved_at?: string | null }) {
  // Avoid duplicate edges
  const { data: existing, error: existingErr } = await supabase
    .from('entity_edges')
    .select('id')
    .eq('source_type', 'username')
    .eq('source_id', usernameId)
    .eq('target_type', 'email')
    .eq('target_id', emailId)
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) return;
  const now = new Date().toISOString();
  const row = {
    source_type: 'username',
    source_id: usernameId,
    target_type: 'email',
    target_id: emailId,
    transform_type: opts?.transform_type ?? 'manual_link',
    confidence_score: opts?.confidence_score ?? 1,
    source_api: opts?.source_api ?? 'internal',
    source_url: opts?.source_url ?? null,
    raw_reference_id: opts?.raw_reference_id ?? null,
    metadata: opts?.metadata ?? {},
    retrieved_at: opts?.retrieved_at ?? now
  };
  const { error } = await supabase.from('entity_edges').insert(row);
  if (error) throw error;
}

export async function detachEmailFromUsername(usernameId: string, emailId: string) {
  const { error } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', 'username')
    .eq('source_id', usernameId)
    .eq('target_type', 'email')
    .eq('target_id', emailId);
  if (error) throw error;
}


