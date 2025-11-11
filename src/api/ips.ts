import { supabase } from '../utils/supabaseClient';
import type { IPEntity, IPRecord } from '../types/ip';

const mapIP = (row: Record<string, unknown>): IPEntity => {
  const addressFromJson = ((row.ip as any)?.address as string | undefined) ?? undefined;
  const addressFlat = (row as any).address as string | undefined;
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    title: (row.title as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    ip: (row.ip as IPRecord['ip']) ?? { address: addressFlat ?? addressFromJson ?? '' },
    asn: (row.asn as string | null) ?? null,
    organization: (row.organization as string | null) ?? null,
    geo: (row.geo as IPRecord['geo']) ?? null,
    open_ports: (row.open_ports as number[] | null) ?? null,
    services: (row.services as IPRecord['services']) ?? null,
    reputation: (row.reputation as IPRecord['reputation']) ?? null,
    first_seen: (row.first_seen as string | null) ?? null,
    last_seen: (row.last_seen as string | null) ?? null,
    created_at: (row.created_at as string | undefined),
    updated_at: (row.updated_at as string | undefined)
  };
};

export async function getIPById(id: string): Promise<IPEntity> {
  const { data, error } = await supabase.from('ip_addresses').select('*').eq('id', id).single();
  if (error) throw error;
  return mapIP(data as Record<string, unknown>);
}

export async function searchIPs(organizationId: string, query: string, limit = 24): Promise<Array<{ id: string; address: string; title?: string | null }>> {
  let req = supabase
    .from('ip_addresses')
    .select('*')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  const q = query.trim();
  if (q) {
    req = req.or(`ip->>address.ilike.%${q}%,title.ilike.%${q}%,address.ilike.%${q}%`);
  }
  const { data, error } = await req;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    address: (((r as any).ip?.address as string) ?? ((r as any).address as string) ?? ''),
    title: (r.title as string | null) ?? null
  }));
}

export async function createIP(input: {
  organization_id: string;
  ip: IPRecord['ip'];
  title?: string | null;
  description?: string | null;
  asn?: string | null;
  organization?: string | null;
  geo?: IPRecord['geo'];
  open_ports?: number[] | null;
  services?: IPRecord['services'];
  reputation?: IPRecord['reputation'];
  first_seen?: string | null;
  last_seen?: string | null;
}): Promise<{ id: string }> {
  const payload: Record<string, unknown> = {
    organization_id: input.organization_id,
    ip: input.ip,
    address: input.ip?.address ?? null,
    title: input.title ?? null,
    description: input.description ?? null,
    asn: input.asn ?? null,
    organization: input.organization ?? null,
    geo: input.geo ?? null,
    open_ports: input.open_ports ?? null,
    services: input.services ?? null,
    reputation: input.reputation ?? null,
    first_seen: input.first_seen ?? null,
    last_seen: input.last_seen ?? null
  };
  const { data, error } = await supabase
    .from('ip_addresses')
    .insert(payload)
    .select('id')
    .single();
  if (error) {
    // Fallback if some columns aren't present yet
    const msg = String(error.message ?? '');
    if (/column .* (title|description|address) .* does not exist/i.test(msg)) {
      const { data: data2, error: err2 } = await supabase
        .from('ip_addresses')
        .insert({
          organization_id: input.organization_id,
          ip: input.ip ?? null,
          asn: input.asn ?? null,
          organization: input.organization ?? null,
          geo: input.geo ?? null,
          open_ports: input.open_ports ?? null,
          services: input.services ?? null,
          reputation: input.reputation ?? null,
          first_seen: input.first_seen ?? null,
          last_seen: input.last_seen ?? null
        })
        .select('id')
        .single();
      if (err2) throw err2;
      return { id: (data2?.id as string) ?? '' };
    }
    throw error;
  }
  return { id: (data?.id as string) ?? '' };
}

export async function updateIP(id: string, updates: Partial<IPRecord>): Promise<IPEntity> {
  const payload: Record<string, unknown> = {};
  if ((updates as any).title !== undefined) payload.title = (updates as any).title ?? null;
  if ((updates as any).description !== undefined) payload.description = (updates as any).description ?? null;
  if (updates.ip) {
    payload.ip = updates.ip;
    (payload as any).address = updates.ip.address ?? null;
  }
  if (updates.asn !== undefined) payload.asn = updates.asn ?? null;
  if (updates.organization !== undefined) payload.organization = updates.organization ?? null;
  if (updates.geo !== undefined) payload.geo = updates.geo ?? null;
  if (updates.open_ports !== undefined) payload.open_ports = updates.open_ports ?? null;
  if (updates.services !== undefined) payload.services = updates.services ?? null;
  if (updates.reputation !== undefined) payload.reputation = updates.reputation ?? null;
  if (updates.first_seen !== undefined) payload.first_seen = updates.first_seen ?? null;
  if (updates.last_seen !== undefined) payload.last_seen = updates.last_seen ?? null;
  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from('ip_addresses').update(payload).eq('id', id);
    if (error) throw error;
  }
  return getIPById(id);
}

export async function deleteIP(id: string) {
  await supabase.from('entity_edges').delete().or(`source_id.eq.${id},target_id.eq.${id}`);
  const { error } = await supabase.from('ip_addresses').delete().eq('id', id);
  if (error) throw error;
}

// Linking with domains
async function attachEdge(source_type: string, source_id: string, target_type: string, target_id: string, transform_type = 'manual_link') {
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
    .insert({ source_type, source_id, target_type, target_id, transform_type, confidence_score: 1, retrieved_at: new Date().toISOString(), metadata: {} });
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

export async function attachIPToDomain(ipId: string, domainId: string, opts?: { transform_type?: string }) {
  return attachEdge('ip_address', ipId, 'domain', domainId, opts?.transform_type);
}
export async function detachIPFromDomain(ipId: string, domainId: string) {
  return detachEdge('ip_address', ipId, 'domain', domainId);
}


