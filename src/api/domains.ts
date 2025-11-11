import { supabase } from '../utils/supabaseClient';
import type { DomainEntity, DomainRecord } from '../types/domain';

const mapDomain = (row: Record<string, unknown>): DomainEntity => {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    domain: { name: (row.name as string) ?? (row.domain as string) ?? '' },
    whois: (row.whois as DomainRecord['whois']) ?? null,
    creation_date: (row.creation_date as string | null) ?? null,
    expiry_date: (row.expiry_date as string | null) ?? null,
    dns_records: (row.dns_records as DomainRecord['dns_records']) ?? null,
    subdomains: (row.subdomains as string[] | null) ?? null,
    hosting_provider: (row.hosting_provider as string | null) ?? null,
    techstack: (row.techstack as string[] | null) ?? null,
    created_at: (row.created_at as string | null) ?? undefined,
    updated_at: (row.updated_at as string | null) ?? undefined
  };
};

export async function getDomainById(id: string): Promise<DomainEntity> {
  const { data, error } = await supabase.from('domains').select('*').eq('id', id).single();
  if (error) throw error;
  return mapDomain(data as Record<string, unknown>);
}

export async function searchDomains(
  organizationId: string,
  query: string,
  limit = 10
): Promise<Array<{ id: string; name: string }>> {
  let request = supabase
    .from('domains')
    .select('id, name, organization_id')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  const trimmed = query.trim();
  if (trimmed.length > 0) {
    request = request.ilike('name', `%${trimmed}%`);
  }
  const { data, error } = await request;
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id as string, name: (row.name as string) ?? '' }));
}

export async function createDomain(input: {
  organization_id: string;
  name: string;
  whois?: DomainRecord['whois'];
  creation_date?: string | null;
  expiry_date?: string | null;
  dns_records?: DomainRecord['dns_records'];
  subdomains?: string[] | null;
  hosting_provider?: string | null;
  techstack?: string[] | null;
}): Promise<{ id: string }> {
  const payload: Record<string, unknown> = {
    organization_id: input.organization_id,
    name: input.name.trim(),
    whois: input.whois ?? null,
    creation_date: input.creation_date ?? null,
    expiry_date: input.expiry_date ?? null,
    dns_records: input.dns_records ?? null,
    subdomains: input.subdomains ?? null,
    hosting_provider: input.hosting_provider ?? null,
    techstack: input.techstack ?? null
  };
  const { data, error } = await supabase.from('domains').insert(payload).select('id').single();
  if (error) throw error;
  return { id: (data?.id as string) ?? '' };
}

export async function updateDomain(id: string, updates: Partial<DomainRecord>): Promise<DomainEntity> {
  const payload: Record<string, unknown> = {};
  if (updates.domain?.name !== undefined) payload.name = updates.domain.name.trim();
  if (updates.whois !== undefined) payload.whois = updates.whois ?? null;
  if (updates.creation_date !== undefined) payload.creation_date = updates.creation_date ?? null;
  if (updates.expiry_date !== undefined) payload.expiry_date = updates.expiry_date ?? null;
  if (updates.dns_records !== undefined) payload.dns_records = updates.dns_records ?? null;
  if (updates.subdomains !== undefined) payload.subdomains = updates.subdomains ?? null;
  if (updates.hosting_provider !== undefined) payload.hosting_provider = updates.hosting_provider ?? null;
  if (updates.techstack !== undefined) payload.techstack = updates.techstack ?? null;
  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from('domains').update(payload).eq('id', id);
    if (error) throw error;
  }
  return getDomainById(id);
}

export async function deleteDomain(id: string) {
  // Clean up edges where domain is referenced
  await supabase.from('entity_edges').delete().or(`source_id.eq.${id},target_id.eq.${id}`);
  const { error } = await supabase.from('domains').delete().eq('id', id);
  if (error) throw error;
}

export async function attachEmailToDomain(emailId: string, domainId: string, opts?: { transform_type?: string; confidence_score?: number | null; source_api?: string | null; source_url?: string | null; raw_reference_id?: string | null; metadata?: Record<string, unknown> | null; retrieved_at?: string | null }) {
  const { data: existing, error: existingErr } = await supabase
    .from('entity_edges')
    .select('id')
    .eq('source_type', 'email')
    .eq('source_id', emailId)
    .eq('target_type', 'domain')
    .eq('target_id', domainId)
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) return;
  const nowIso = new Date().toISOString();
  const row = {
    source_type: 'email',
    source_id: emailId,
    target_type: 'domain',
    target_id: domainId,
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

export async function detachEmailFromDomain(emailId: string, domainId: string) {
  const { error } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', 'email')
    .eq('source_id', emailId)
    .eq('target_type', 'domain')
    .eq('target_id', domainId);
  if (error) throw error;
}

export async function attachDomainToBusiness(businessId: string, domainId: string, opts?: { transform_type?: string; confidence_score?: number | null; source_api?: string | null; source_url?: string | null; raw_reference_id?: string | null; metadata?: Record<string, unknown> | null; retrieved_at?: string | null }) {
  const { data: existing, error: existingErr } = await supabase
    .from('entity_edges')
    .select('id')
    .eq('source_type', 'business')
    .eq('source_id', businessId)
    .eq('target_type', 'domain')
    .eq('target_id', domainId)
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;
  if (existing) return;
  const nowIso = new Date().toISOString();
  const row = {
    source_type: 'business',
    source_id: businessId,
    target_type: 'domain',
    target_id: domainId,
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

export async function detachDomainFromBusiness(businessId: string, domainId: string) {
  const { error } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', 'business')
    .eq('source_id', businessId)
    .eq('target_type', 'domain')
    .eq('target_id', domainId);
  if (error) throw error;
}
