import { supabase } from '../utils/supabaseClient';
import type { PhoneRecord } from '../types/phone';
import type { PersonRecord } from '../types/person';

export interface PhoneEntity extends PhoneRecord {
  id: string;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}

type EdgeRow = {
  id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  transform_type: string | null;
  confidence_score: number | null;
  source_api: string | null;
  source_url: string | null;
  raw_reference_id: string | null;
  metadata: Record<string, unknown> | null;
  retrieved_at: string | null;
};

export interface PhonePersonLink {
  edge: EdgeRow;
  person: Pick<PersonRecord, 'id' | 'name' | 'avatar'>;
}

export interface PhoneDetailResponse {
  phone: PhoneEntity;
  people: PhonePersonLink[];
}

const mapPhone = (row: Record<string, unknown>): PhoneEntity => {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    phone: {
      number_e164: (row.number_e164 as string) ?? '',
      country: (row.country as string | null) ?? null,
      carrier: (row.carrier as string | null) ?? null,
      line_type: ((row.line_type as string | null)?.toLowerCase() as PhoneRecord['phone']['line_type']) ?? 'unknown'
    },
    messaging_apps: (row.messaging_apps as string[] | null) ?? null,
    spam_reports: (row.spam_reports as number | null) ?? null,
    linked_profiles: (row.linked_profiles as any) ?? null,
    leak_hits: (row.leak_hits as number | null) ?? null,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined
  };
};

export async function getPhoneById(id: string): Promise<PhoneDetailResponse> {
  const { data, error } = await supabase.from('phones').select('*').eq('id', id).single();
  if (error) throw error;
  if (!data) throw new Error('Phone not found');
  const phone = mapPhone(data as Record<string, unknown>);

  const { data: edgeRows, error: edgeError } = await supabase
    .from('entity_edges')
    .select('*')
    .eq('target_type', 'phone')
    .eq('target_id', id);
  if (edgeError) throw edgeError;

  const peopleEdges = (edgeRows ?? []).filter((e) => e.source_type === 'person') as EdgeRow[];
  const personIds = peopleEdges.map((e) => e.source_id);

  let personMap = new Map<string, Pick<PersonRecord, 'id' | 'name' | 'avatar'>>();
  if (personIds.length > 0) {
    const { data: personRows, error: personError } = await supabase
      .from('people')
      .select('id, name, avatar')
      .in('id', personIds);
    if (personError) throw personError;
    personMap = new Map(
      (personRows ?? []).map((row) => [row.id as string, { id: row.id as string, name: row.name, avatar: (row as any).avatar ?? null }])
    );
  }

  const people: PhonePersonLink[] = peopleEdges
    .map((edge) => {
      const person = personMap.get(edge.source_id);
      if (!person) return null;
      return { edge, person };
    })
    .filter((v): v is PhonePersonLink => Boolean(v));

  return { phone, people };
}

export interface UpdatePhoneInput {
  number_e164?: string;
  country?: string | null;
  carrier?: string | null;
  line_type?: PhoneRecord['phone']['line_type'] | null;
  messaging_apps?: string[] | null;
  spam_reports?: number | null;
}

export async function updatePhone(id: string, updates: UpdatePhoneInput): Promise<PhoneEntity> {
  const payload: Record<string, unknown> = {};
  if (updates.number_e164 !== undefined) payload.number_e164 = updates.number_e164;
  if (updates.country !== undefined) payload.country = updates.country;
  if (updates.carrier !== undefined) payload.carrier = updates.carrier;
  if (updates.line_type !== undefined) payload.line_type = updates.line_type;
  if (updates.messaging_apps !== undefined) payload.messaging_apps = updates.messaging_apps ?? null;
  if (updates.spam_reports !== undefined) payload.spam_reports = updates.spam_reports ?? null;

  if (Object.keys(payload).length > 0) {
    const { error } = await supabase.from('phones').update(payload).eq('id', id);
    if (error) throw error;
  }
  const { data, error: loadErr } = await supabase.from('phones').select('*').eq('id', id).single();
  if (loadErr) throw loadErr;
  return mapPhone(data as Record<string, unknown>);
}

export async function deletePhone(id: string): Promise<void> {
  const { error } = await supabase.from('phones').delete().eq('id', id);
  if (error) throw error;
}

export async function searchPhones(organizationId: string, query: string, limit = 10): Promise<Array<{ id: string; number_e164: string }>> {
  let request = supabase
    .from('phones')
    .select('id, number_e164')
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  const trimmed = query.trim();
  if (trimmed.length > 0) {
    request = request.or(`number_e164.ilike.%${trimmed}%`);
  }
  const { data, error } = await request;
  if (error) throw error;
  return ((data ?? []) as Array<{ id: string; number_e164: string }>).map((r) => ({
    id: r.id,
    number_e164: r.number_e164 as unknown as string
  }));
}

export interface CreatePhoneInput {
  organization_id: string;
  number_e164: string;
  country?: string | null;
  carrier?: string | null;
  line_type?: PhoneRecord['phone']['line_type'] | null;
  messaging_apps?: string[] | null;
  spam_reports?: number | null;
}

export async function createPhone(input: CreatePhoneInput): Promise<PhoneEntity> {
  const payload: Record<string, unknown> = {
    organization_id: input.organization_id,
    number_e164: input.number_e164,
    country: input.country ?? null,
    carrier: input.carrier ?? null,
    line_type: input.line_type ?? 'unknown',
    messaging_apps: input.messaging_apps ?? [],
    spam_reports: input.spam_reports ?? 0
  };
  const { data, error } = await supabase.from('phones').insert(payload).select('*').single();
  if (error) throw error;
  return mapPhone(data as Record<string, unknown>);
}

export async function attachPhoneToPerson(
  phoneId: string,
  personId: string,
  options: {
    transform_type?: string;
    confidence_score?: number | null;
    source_api?: string | null;
    source_url?: string | null;
    raw_reference_id?: string | null;
    metadata?: Record<string, unknown>;
    retrieved_at?: string | null;
  } = {}
): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from('entity_edges')
    .select('id')
    .eq('source_type', 'person')
    .eq('source_id', personId)
    .eq('target_type', 'phone')
    .eq('target_id', phoneId)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return;
  const now = new Date().toISOString();
  const { error } = await supabase.from('entity_edges').insert({
    source_type: 'person',
    source_id: personId,
    target_type: 'phone',
    target_id: phoneId,
    transform_type: options.transform_type ?? 'manual_link',
    confidence_score: options.confidence_score ?? 1,
    source_api: options.source_api ?? 'internal',
    source_url: options.source_url ?? null,
    raw_reference_id: options.raw_reference_id ?? null,
    metadata: options.metadata ?? {},
    retrieved_at: options.retrieved_at ?? now,
    created_at: now
  });
  if (error) throw error;
}

export async function removePhoneFromPerson(personId: string, phoneId: string): Promise<void> {
  const { error } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', 'person')
    .eq('source_id', personId)
    .eq('target_type', 'phone')
    .eq('target_id', phoneId);
  if (error) throw error;
}


