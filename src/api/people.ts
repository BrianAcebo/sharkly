import { supabase } from '../utils/supabaseClient';
import type { EmailEntity, EmailEdgeInfo, EmailRecord } from '../types/email';
import type { PersonRecord, CreatePersonInput, UpdatePersonInput } from '../types/person';
import type { WebMention } from '../types/common';
import { buildPersonName, normalizeEmails, normalizePersonName } from '../utils/person';
import { normalizeEmailRecordEntry } from '../utils/email';

type EdgeRow = {
  id: string;
  source_id: string;
  target_id: string;
  transform_type: string | null;
  confidence_score: number | null;
  source_api: string | null;
  source_url: string | null;
  raw_reference_id: string | null;
  metadata: Record<string, unknown> | null;
  retrieved_at: string | null;
};

const mapEmailRowToEntity = (row: Record<string, unknown>): EmailEntity => {
  const normalized = normalizeEmailRecordEntry({
    id: row.id as string,
    organization_id: row.organization_id as string,
    email: {
      address: (row.address as string) ?? '',
      domain: (row.domain as string | null) ?? null,
      first_seen: (row.first_seen as string | null) ?? null
    },
    leaks: row.leaks as EmailRecord['leaks'],
    profiles: row.profiles as EmailRecord['profiles'],
    confidence: (row.confidence as number | null) ?? null,
    last_checked: (row.last_checked as string | null) ?? null
  });

  return {
    ...normalized,
    id: normalized.id ?? (row.id as string),
    organization_id: normalized.organization_id ?? (row.organization_id as string),
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined
  };
};

const normalizePersonRow = (row: Record<string, unknown>): PersonRecord => {
  const name = normalizePersonName(row?.name as PersonRecord['name'] | string | null | undefined);
  const aliases = Array.isArray(row?.aliases) ? (row.aliases as string[]) : [];
  const tags = Array.isArray(row?.tags) ? (row.tags as string[]) : [];

  return {
    ...(row as unknown as PersonRecord),
    name,
    aliases,
    tags,
    emails: []
  };
};

const replacePersonEmails = async (personId: string, organizationId: string, emails?: EmailRecord[]) => {
  const sanitized = normalizeEmails(emails);

  const { error: deleteError } = await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', 'person')
    .eq('source_id', personId)
    .eq('target_type', 'email');
  if (deleteError) throw deleteError;

  if (sanitized.length === 0) {
    return;
  }

  const upsertPayload = sanitized.map((email) => ({
    organization_id: organizationId,
    address: email.email.address.trim(),
    domain: email.email.domain ?? null,
    first_seen: email.email.first_seen ?? null,
    breach_hits: [],
    paste_mentions: [],
    profiles: email.profiles ?? [],
    confidence: email.confidence ?? null,
    last_checked: email.last_checked ?? null
  }));

  const { data: upserted, error: upsertError } = await supabase
    .from('emails')
    .upsert(upsertPayload, { onConflict: 'organization_id,address' })
    .select('*');
  if (upsertError) throw upsertError;

  if (!upserted || upserted.length === 0) {
    return;
  }

  const edgesPayload = upserted
    .map((row) => {
      const emailId = (row as { id?: string }).id;
      if (!emailId) return null;
      return {
        source_type: 'person',
        source_id: personId,
        target_type: 'email',
        target_id: emailId,
        transform_type: 'manual',
        confidence_score: 1,
        metadata: {} as Record<string, unknown>,
        retrieved_at: new Date().toISOString()
      };
    })
    .filter((payload): payload is {
      source_type: string;
      source_id: string;
      target_type: string;
      target_id: string;
      transform_type: string;
      confidence_score: number;
      metadata: Record<string, unknown>;
      retrieved_at: string;
    } => Boolean(payload));

  if (edgesPayload.length > 0) {
    const { error: insertError } = await supabase.from('entity_edges').insert(edgesPayload);
    if (insertError) throw insertError;
  }
};

const fetchEmailsForPeople = async (personIds: string[]): Promise<Map<string, EmailEntity[]>> => {
  const result = new Map<string, EmailEntity[]>();
  if (personIds.length === 0) return result;

  const { data: edgeRows, error: edgeError } = await supabase
    .from('entity_edges')
    .select(
      'id, source_id, target_id, transform_type, confidence_score, source_api, source_url, raw_reference_id, metadata, retrieved_at'
    )
    .eq('source_type', 'person')
    .eq('target_type', 'email')
    .in('source_id', personIds);

  if (edgeError) throw edgeError;

  const edges = (edgeRows ?? []) as EdgeRow[];
  const emailIds = Array.from(new Set(edges.map((edge) => edge.target_id).filter((id): id is string => Boolean(id))));

  if (emailIds.length === 0) {
    personIds.forEach((id) => result.set(id, []));
    return result;
  }

  const { data: emailRows, error: emailError } = await supabase.from('emails').select('*').in('id', emailIds);
  if (emailError) throw emailError;

  const emailsById = new Map<string, EmailEntity>();
  (emailRows ?? []).forEach((row) => {
    const record = mapEmailRowToEntity(row as Record<string, unknown>);
    emailsById.set(record.id, record);
  });

  edges.forEach((edge) => {
    const sourceId = edge.source_id;
    const targetId = edge.target_id;
    if (!sourceId || !targetId) return;

    const email = emailsById.get(targetId);
    if (!email) return;

    const edgeInfo: EmailEdgeInfo = {
      id: edge.id,
      transform_type: edge.transform_type,
      confidence_score: edge.confidence_score,
      source_api: edge.source_api,
      source_url: edge.source_url,
      raw_reference_id: edge.raw_reference_id,
      metadata: edge.metadata ?? null,
      retrieved_at: edge.retrieved_at
    };

    const enriched: EmailEntity = {
      ...email,
      edge: edgeInfo
    };

    if (!result.has(sourceId)) {
      result.set(sourceId, [enriched]);
    } else {
      result.get(sourceId)!.push(enriched);
    }
  });

  personIds.forEach((id) => {
    if (!result.has(id)) {
      result.set(id, []);
    }
  });

  return result;
};

export async function getPersonById(id: string) {
  const { data, error } = await supabase.from('people').select('*').eq('id', id).single();
  if (error) throw error;
  const person = normalizePersonRow(data as Record<string, unknown>);
  const emailMap = await fetchEmailsForPeople([person.id]);
  person.emails = emailMap.get(person.id) ?? [];
  return person;
}

export async function listPeople(organizationId: string, search?: string, page = 1, perPage = 20) {
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let q = supabase
    .from('people')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('updated_at', { ascending: false });
  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    q = q.or(
      [
        `name->>first.ilike.${s}`,
        `name->>last.ilike.${s}`,
        `name->>middle.ilike.${s}`,
        `name->>given.ilike.${s}`,
        `name->>family.ilike.${s}`
      ].join(',')
    );
  }
  const { data, error, count } = await q.range(from, to);
  if (error) throw error;
  const rows = ((data as Record<string, unknown>[] | null) ?? []).map(normalizePersonRow);
  const idList = rows.map((row) => row.id);
  const emailMap = await fetchEmailsForPeople(idList);
  rows.forEach((row) => {
    row.emails = emailMap.get(row.id) ?? [];
  });
  return { results: rows, total: count ?? 0 };
}

export async function createPerson(input: CreatePersonInput) {
  const namePayload = buildPersonName({
    first: input.name.first,
    last: input.name.last,
    middle: input.name.middle ?? null,
    prefix: input.name.prefix ?? null,
    suffix: input.name.suffix ?? null
  });

  const { data, error } = await supabase
    .from('people')
    .insert({
      organization_id: input.organization_id,
      name: namePayload,
      gender: input.gender ?? null,
      date_of_birth: input.date_of_birth ?? null,
      avatar: input.avatar ?? null,
      location: input.location ?? null,
      devices: input.devices ?? [],
      social_profiles: input.social_profiles ?? [],
      web_mentions: input.web_mentions ?? [],
      aliases: input.aliases ?? [],
      tags: input.tags ?? [],
      notes: input.notes ?? null,
      confidence: input.confidence ?? null,
      first_seen: input.first_seen ? new Date(input.first_seen).toISOString() : null,
      last_seen: input.last_seen ? new Date(input.last_seen).toISOString() : null
    })
    .select('*')
    .single();
  if (error) throw error;

  const inserted = data as Record<string, unknown>;
  const personId = inserted.id as string;

  await replacePersonEmails(personId, input.organization_id, input.emails);

  return getPersonById(personId);
}

export async function updatePerson(id: string, updates: UpdatePersonInput) {
  const {
    name: nameInput,
    emails: emailInput,
    first_seen,
    last_seen,
    ...restUpdates
  } = updates;

  const payload: Record<string, unknown> = { ...restUpdates };

  if (nameInput) {
    payload.name = buildPersonName({
      first: nameInput.first,
      last: nameInput.last,
      middle: nameInput.middle ?? null,
      prefix: nameInput.prefix ?? null,
      suffix: nameInput.suffix ?? null
    });
  }

  if (first_seen !== undefined) {
    payload.first_seen = first_seen ? new Date(first_seen).toISOString() : first_seen ?? null;
  }

  if (last_seen !== undefined) {
    payload.last_seen = last_seen ? new Date(last_seen).toISOString() : last_seen ?? null;
  }

  Object.keys(payload).forEach((key) => {
    if (payload[key] === undefined) {
      delete payload[key];
    }
  });

  let personRow: Record<string, unknown>;

  if (Object.keys(payload).length > 0) {
    const { data, error } = await supabase
      .from('people')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    personRow = data as Record<string, unknown>;
  } else {
    const { data, error } = await supabase
      .from('people')
      .select('id, organization_id')
      .eq('id', id)
      .single();
    if (error) throw error;
    personRow = data as Record<string, unknown>;
  }

  if (emailInput !== undefined) {
    const organizationId = (personRow.organization_id as string) ?? '';
    if (organizationId) {
      await replacePersonEmails(id, organizationId, emailInput);
    }
  }

  return getPersonById(id);
}

export async function deletePerson(id: string) {
  await supabase
    .from('entity_edges')
    .delete()
    .eq('source_type', 'person')
    .eq('source_id', id);
  await supabase
    .from('entity_edges')
    .delete()
    .eq('target_type', 'person')
    .eq('target_id', id);
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

export interface DiscoverEmailsInput {
  firstName: string;
  lastName: string;
}

export interface DiscoveredEmail {
  address: string;
  source?: string;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export type DiscoverEmailsResponse = {
  results: DiscoveredEmail[];
};

export async function discoverEmailsForPerson(input: DiscoverEmailsInput): Promise<DiscoverEmailsResponse> {
  const trimmedFirst = input.firstName.trim();
  const trimmedLast = input.lastName.trim();
  if (!trimmedFirst && !trimmedLast) {
    return { results: [] };
  }

  const { data, error } = await supabase.functions.invoke('discover-person-emails', {
    body: {
      firstName: trimmedFirst,
      lastName: trimmedLast
    }
  });

  if (error) throw error;
  return (data as DiscoverEmailsResponse) ?? { results: [] };
}

const stripEdge = (email: EmailEntity): EmailRecord => {
  const { edge, ...rest } = email;
  void edge;
  return rest;
};

export async function listPersonEmails(personId: string): Promise<EmailEntity[]> {
  const map = await fetchEmailsForPeople([personId]);
  return map.get(personId) ?? [];
}

export async function addEmailToPerson(
  personId: string,
  organizationId: string,
  email: EmailRecord,
  options: {
    transform_type?: string;
    confidence_score?: number;
    metadata?: Record<string, unknown>;
    retrieved_at?: string;
    source_api?: string | null;
    source_url?: string | null;
    raw_reference_id?: string | null;
  } = {}
) {
  const current = await listPersonEmails(personId);
  const payload = [...current.map(stripEdge), email];
  await replacePersonEmails(personId, organizationId, payload);

  const updatedList = await listPersonEmails(personId);

  if (options.transform_type || options.confidence_score || options.metadata || options.retrieved_at) {
    const targetEmail = updatedList.find((item) => item.email.address === email.email.address.trim());
    if (targetEmail) {
      await supabase
        .from('entity_edges')
        .update({
          transform_type: options.transform_type ?? 'manual',
          confidence_score: options.confidence_score ?? 1,
          metadata: options.metadata ?? {},
          retrieved_at: options.retrieved_at ?? new Date().toISOString(),
          source_api: options.source_api ?? 'internal',
          source_url: options.source_url ?? null,
          raw_reference_id: options.raw_reference_id ?? null
        })
        .eq('source_type', 'person')
        .eq('source_id', personId)
        .eq('target_type', 'email')
        .eq('target_id', targetEmail.id);
    }
  }

  return updatedList;
}

export async function removeEmailFromPerson(personId: string, emailId: string) {
  const { data, error } = await supabase.from('people').select('organization_id').eq('id', personId).single();
  if (error) throw error;
  const organizationId = data?.organization_id as string;
  const current = await listPersonEmails(personId);
  const filtered = current.filter((email) => email.id !== emailId).map(stripEdge);
  await replacePersonEmails(personId, organizationId, filtered);
  return listPersonEmails(personId);
}


