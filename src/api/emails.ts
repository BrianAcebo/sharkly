import { supabase } from '../utils/supabaseClient';
import type { EmailEntity, EmailRecord, EmailLeak, EmailLeakKind } from '../types/email';
import type { PersonRecord } from '../types/person';
import {
	normalizeEmailRecordEntry,
	normalizeEmailLeaks,
	normalizeEmailProfiles,
	normalizeEmailConfidence,
	normalizeEmailTimestamp
} from '../utils/email';

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

export interface EmailPersonLink {
  edge: EdgeRow;
  person: Pick<PersonRecord, 'id' | 'name' | 'avatar'>;
}

export interface EmailDetailResponse {
  email: EmailEntity;
  people: EmailPersonLink[];
}

export interface EmailSearchResult {
  id: string;
  address: string;
  domain: string | null;
  organization_id: string;
}

const toEmailEntity = (
  row: Record<string, unknown>,
  overrides: {
    leaks?: EmailRecord['leaks'];
  } = {}
): EmailEntity => {
  const normalized = normalizeEmailRecordEntry({
    id: row.id as string,
    organization_id: row.organization_id as string,
    email: {
      address: (row.address as string) ?? '',
      domain: (row.domain as string | null) ?? null,
      first_seen: (row.first_seen as string | null) ?? null
    },
    leaks: overrides.leaks ?? (row.leaks as EmailRecord['leaks']),
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

const normalizeKeyPart = (value: string | null | undefined): string => (value ? value.trim().toLowerCase() : '');

const createLeakFingerprint = (...parts: (string | null | undefined)[]): string =>
	parts.map(normalizeKeyPart).join('|');

interface PreparedLeak {
	kind: 'breach' | 'paste';
	fingerprint: string;
	source: string;
	title: string | null;
	content_snippet: string | null;
	found_emails: string[];
	found_usernames: string[];
	found_password_hashes: string[];
	retrieved_at: string | null;
	last_seen: string | null;
	url: string | null;
	metadata: Record<string, unknown>;
	confidence: number | null;
}

const jsonbStripNull = (input: Record<string, unknown>): Record<string, unknown> => {
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input)) {
		if (value === undefined || value === null) continue;
		result[key] = value;
	}
	return result;
};

const upsertLeaksAndLink = async (
	emailId: string,
	organizationId: string,
	prepared: PreparedLeak[],
	transformType: string
): Promise<void> => {
	await supabase
		.from('entity_edges')
		.delete()
		.eq('source_type', 'email')
		.eq('source_id', emailId)
		.eq('target_type', 'leak')
		.eq('transform_type', transformType);

	if (prepared.length === 0) return;

	const nowIso = new Date().toISOString();

	const rows = prepared.map((item) => {
		const metadataPayload = jsonbStripNull({
			kind: item.kind,
			title: item.title ?? undefined,
			last_seen: item.last_seen ?? undefined,
			...item.metadata
		});
		return {
			organization_id: organizationId,
			fingerprint: item.fingerprint,
			source: item.source,
			content_snippet: item.content_snippet,
			found_emails: item.found_emails,
			found_usernames: item.found_usernames,
			found_password_hashes: item.found_password_hashes,
			retrieved_at: item.retrieved_at,
			url: item.url,
			metadata: metadataPayload
		};
	});

	const { data: upserted, error } = await supabase
		.from('leaks')
		.upsert(rows, { onConflict: 'organization_id,fingerprint' })
		.select('id, fingerprint');
	if (error) throw error;

	type LeakEdgeInsertRow = {
		source_type: 'email';
		source_id: string;
		target_type: 'leak';
		target_id: string;
		transform_type: string;
		confidence_score: number | null;
		metadata: Record<string, unknown>;
		retrieved_at: string;
		source_api: string | null;
		source_url: string | null;
		raw_reference_id: string | null;
		created_at: string;
	};

	const idByFingerprint = new Map<string, string>(
		(upserted ?? []).map((row) => [row.fingerprint as string, row.id as string])
	);

	const edgeRows: LeakEdgeInsertRow[] = [];
	for (const item of prepared) {
		const leakId = idByFingerprint.get(item.fingerprint);
		if (!leakId) continue;
		const metadataPayload = jsonbStripNull({
			kind: item.kind,
			title: item.title ?? undefined,
			last_seen: item.last_seen ?? undefined,
			...item.metadata
		});
		const externalId =
			typeof item.metadata?.external_id === 'string' && item.metadata.external_id.trim().length > 0
				? item.metadata.external_id.trim()
				: null;
		edgeRows.push({
			source_type: 'email',
			source_id: emailId,
			target_type: 'leak',
			target_id: leakId,
			transform_type: transformType,
			confidence_score: item.confidence ?? null,
			metadata: metadataPayload,
			retrieved_at: item.retrieved_at ?? nowIso,
			source_api: 'internal',
			source_url: item.url ?? null,
			raw_reference_id: externalId,
			created_at: nowIso
		});
	}

	if (edgeRows.length > 0) {
		await supabase.from('entity_edges').insert(edgeRows);
	}
};

const replaceEmailLeaks = async (
	emailId: string,
	organizationId: string,
	emailAddress: string,
	leaks: EmailLeak[]
): Promise<void> => {
	const normalized = normalizeEmailLeaks(leaks);
	const grouped: Record<'breach' | 'paste', PreparedLeak[]> = {
		breach: [],
		paste: []
	};

	for (const leak of normalized) {
		const firstSeen = normalizeEmailTimestamp(leak.first_seen ?? leak.metadata?.first_seen);
		const lastSeen = normalizeEmailTimestamp(leak.last_seen ?? leak.metadata?.last_seen);
		const source = leak.source ?? (leak.kind === 'paste' ? 'paste' : 'breach');
		const title = leak.title ?? (leak.kind === 'paste' ? (typeof leak.metadata?.paste_id === 'string' ? leak.metadata?.paste_id : leak.leak.id) : null);
		const fingerprint =
			leak.kind === 'breach'
				? createLeakFingerprint('breach', title ?? '', source ?? '', firstSeen ?? '', emailAddress)
				: createLeakFingerprint('paste', leak.leak?.id ?? '', leak.content_snippet ?? '', source ?? '', firstSeen ?? '', emailAddress);

		const prepared: PreparedLeak = {
			kind: leak.kind,
			fingerprint,
			source: source ?? (leak.kind === 'paste' ? 'paste' : 'breach'),
			title: title ?? null,
			content_snippet: leak.content_snippet ?? null,
			found_emails: emailAddress ? [emailAddress] : [],
			found_usernames: [],
			found_password_hashes: [],
			retrieved_at: firstSeen,
			last_seen: lastSeen,
			url: leak.url ?? (typeof leak.metadata?.url === 'string' ? leak.metadata.url : null),
			metadata: {
				...(leak.metadata ?? {}),
				kind: leak.kind,
				title: title ?? undefined,
				name: leak.kind === 'breach' ? title ?? undefined : undefined,
				paste_id: leak.kind === 'paste' ? (typeof leak.metadata?.paste_id === 'string' ? leak.metadata.paste_id : leak.leak.id) : undefined,
				last_seen: lastSeen ?? undefined
			},
			confidence: leak.confidence ?? (typeof leak.metadata?.confidence === 'number' ? Number(leak.metadata.confidence) : null)
		};

		grouped[leak.kind].push(prepared);
	}

	await upsertLeaksAndLink(emailId, organizationId, grouped.breach, 'email_breach_record');
	await upsertLeaksAndLink(emailId, organizationId, grouped.paste, 'email_paste_mention');
};

const edgeRowToEmailLeak = (
	leakRow: Record<string, unknown> | undefined,
	edge: Record<string, unknown>
): EmailLeak | null => {
	if (!leakRow) return null;
	const leakIdRaw = leakRow.id;
	if (typeof leakIdRaw !== 'string' || leakIdRaw.trim().length === 0) return null;
	const leakId = leakIdRaw.trim();

	const leakMetadata = (leakRow.metadata as Record<string, unknown> | null) ?? {};
	const edgeMetadata = (edge.metadata as Record<string, unknown> | null) ?? {};
	const merged = { ...leakMetadata, ...edgeMetadata };

	const transformType = typeof edge.transform_type === 'string' ? edge.transform_type : '';
	const metaKind = typeof merged.kind === 'string' ? merged.kind.trim().toLowerCase() : null;
	const kind: EmailLeakKind = metaKind === 'breach' || metaKind === 'paste'
		? metaKind
		: transformType === 'email_paste_mention'
			? 'paste'
			: 'breach';

	const titleCandidates = [
		typeof merged.title === 'string' ? merged.title.trim() : null,
		kind === 'breach' && typeof merged.name === 'string' ? merged.name.trim() : null,
		kind === 'paste' && typeof merged.paste_id === 'string' ? merged.paste_id.trim() : null,
		typeof leakRow.source === 'string' ? (leakRow.source as string).trim() : null
	].filter((value): value is string => Boolean(value && value.length > 0));

	const firstSeen =
		typeof leakRow.retrieved_at === 'string'
			? leakRow.retrieved_at
			: typeof edge.retrieved_at === 'string'
				? edge.retrieved_at
				: typeof merged.first_seen === 'string'
					? merged.first_seen
					: null;

	const lastSeen = typeof merged.last_seen === 'string' && merged.last_seen.trim().length > 0 ? merged.last_seen.trim() : null;

	const confidence =
		typeof edge.confidence_score === 'number'
			? edge.confidence_score
			: typeof merged.confidence === 'number'
				? Number(merged.confidence)
				: null;

	const url =
		typeof leakRow.url === 'string' && leakRow.url.trim().length > 0
			? leakRow.url.trim()
			: typeof merged.url === 'string' && merged.url.trim().length > 0
				? merged.url.trim()
				: null;

	const contentSnippet =
		typeof leakRow.content_snippet === 'string' && leakRow.content_snippet.trim().length > 0
			? leakRow.content_snippet.trim()
			: typeof merged.snippet === 'string' && merged.snippet.trim().length > 0
				? merged.snippet.trim()
				: null;

	return {
		id: leakId,
		leak: { id: leakId, type: 'leak' },
		kind,
		title: titleCandidates.length > 0 ? titleCandidates[0] : null,
		source: typeof leakRow.source === 'string' && leakRow.source.trim().length > 0 ? leakRow.source.trim() : null,
		content_snippet: contentSnippet,
		first_seen: typeof firstSeen === 'string' ? firstSeen : null,
		last_seen: lastSeen,
		confidence,
		url,
		metadata: merged
	};
};

const loadEmailEntity = async (id: string): Promise<EmailEntity> => {
	const { data: emailRow, error: emailError } = await supabase.from('emails').select('*').eq('id', id).single();
	if (emailError) throw emailError;
	if (!emailRow) throw new Error('Email not found');

	const { data: leakEdges, error: leakEdgeError } = await supabase
		.from('entity_edges')
		.select('id, target_id, transform_type, confidence_score, metadata, retrieved_at, source_url')
		.eq('source_type', 'email')
		.eq('source_id', id)
		.eq('target_type', 'leak')
		.order('retrieved_at', { ascending: false })
		.order('created_at', { ascending: false });
	if (leakEdgeError) throw leakEdgeError;

	const leakIds = Array.from(
		new Set(
			(leakEdges ?? [])
				.map((edge) => (typeof edge.target_id === 'string' ? edge.target_id : null))
				.filter((value): value is string => Boolean(value))
		)
	);

	let leaks: EmailLeak[] = [];
	if (leakIds.length > 0) {
		const { data: leakRows, error: leakError } = await supabase.from('leaks').select('*').in('id', leakIds);
		if (leakError) throw leakError;
		const rowMap = new Map<string, Record<string, unknown>>(
			(leakRows ?? []).map((row) => [row.id as string, row])
		);
		leaks = (leakEdges ?? [])
			.map<EmailLeak | null>((edge) => {
				const row = rowMap.get(edge.target_id as string);
				return edgeRowToEmailLeak(row, edge as Record<string, unknown>);
			})
			.filter((value): value is EmailLeak => value !== null);
	}

	return toEmailEntity(emailRow as Record<string, unknown>, {
		leaks: leaks.length > 0 ? leaks : undefined
	});
};

export async function getEmailById(id: string): Promise<EmailDetailResponse> {
  const email = await loadEmailEntity(id);
  // Load linked social profiles via entity_edges (email -> social_profile)
  try {
    const { data: profileEdges, error: profileEdgeError } = await supabase
      .from('entity_edges')
      .select('target_id')
      .eq('source_type', 'email')
      .eq('source_id', id)
      .eq('target_type', 'social_profile');
    if (profileEdgeError) throw profileEdgeError;
    const profileIds = Array.from(
      new Set(
        (profileEdges ?? [])
          .map((row) => (row?.target_id as string) ?? null)
          .filter((v): v is string => Boolean(v))
      )
    );
    if (profileIds.length > 0) {
      const { data: profileRows, error: profErr } = await supabase
        .from('social_profiles')
        .select('id, platform, handle, profile_url')
        .in('id', profileIds);
      if (profErr) throw profErr;
      const profiles = (profileRows ?? []).map((row) => ({
        id: row.id as string,
        label: null,
        handle: (row.handle as string) ?? null,
        platform: (row.platform as string) ?? null,
        url: (row.profile_url as string | null) ?? null
      }));
      (email as any).profiles = profiles;
    }
  } catch (e) {
    // Soft-fail: do not block email detail if profiles query fails
    console.warn('Failed to load email->social_profile edges', e);
  }
  const { data: edgeRows, error: edgeError } = await supabase
    .from('entity_edges')
    .select('*')
    .eq('target_type', 'email')
    .eq('target_id', id);
  if (edgeError) throw edgeError;

  const peopleEdges = (edgeRows ?? []).filter((edge) => edge.source_type === 'person') as EdgeRow[];
  const personIds = peopleEdges.map((edge) => edge.source_id);

  let personMap = new Map<string, Pick<PersonRecord, 'id' | 'name' | 'avatar'>>();
  if (personIds.length > 0) {
    const { data: personRows, error: personError } = await supabase
      .from('people')
      .select('id, name, avatar')
      .in('id', personIds);
    if (personError) throw personError;
    personMap = new Map(
      (personRows ?? []).map((row) => [row.id as string, { id: row.id as string, name: row.name, avatar: row.avatar ?? null }])
    );
  }

  const people: EmailPersonLink[] = peopleEdges
    .map((edge) => {
      const person = personMap.get(edge.source_id);
      if (!person) return null;
      return {
        edge,
        person
      };
    })
    .filter((value): value is EmailPersonLink => Boolean(value));

  return {
    email,
    people
  };
}

export interface UpdateEmailInput {
  address?: string;
  domain?: string | null;
  first_seen?: string | null;
  leaks?: EmailRecord['leaks'];
  profiles?: EmailRecord['profiles'];
  confidence?: number | null;
  last_checked?: string | null;
}

export async function updateEmail(id: string, updates: UpdateEmailInput): Promise<EmailEntity> {
  const payload: Record<string, unknown> = {};
  let normalizedLeaks: EmailLeak[] | undefined;

  if (updates.address !== undefined) {
    const trimmed = updates.address.trim();
    if (!trimmed) {
      throw new Error('Email address cannot be empty.');
    }
    payload.address = trimmed;
  }

  if (updates.domain !== undefined) {
    payload.domain = updates.domain && updates.domain.trim().length > 0 ? updates.domain.trim() : null;
  }

  if (updates.first_seen !== undefined) {
    payload.first_seen = normalizeEmailTimestamp(updates.first_seen);
  }

  if (updates.leaks !== undefined) {
    normalizedLeaks = normalizeEmailLeaks(updates.leaks ?? []);
  }

  if (updates.profiles !== undefined) {
    payload.profiles = normalizeEmailProfiles(updates.profiles);
  }

  if (updates.confidence !== undefined) {
    payload.confidence = normalizeEmailConfidence(updates.confidence);
  }

  if (updates.last_checked !== undefined) {
    payload.last_checked = normalizeEmailTimestamp(updates.last_checked);
  }

  let emailRow: Record<string, unknown> | null = null;
  if (Object.keys(payload).length > 0) {
    const { data, error } = await supabase.from('emails').update(payload).eq('id', id).select('*').single();
    if (error) throw error;
    emailRow = data as Record<string, unknown>;
  } else {
    const { data, error } = await supabase.from('emails').select('id, organization_id, address').eq('id', id).single();
    if (error) throw error;
    emailRow = data as Record<string, unknown>;
  }

  const organizationId = (emailRow?.organization_id as string) ?? null;
  if (!organizationId) {
    throw new Error('Missing organization for email update.');
  }

  if (normalizedLeaks !== undefined) {
    await replaceEmailLeaks(
      id,
      organizationId,
      (emailRow?.address as string) ?? '',
      normalizedLeaks ?? []
    );
  }

  return loadEmailEntity(id);
}

export async function searchEmails(
	organizationId: string,
	query: string,
	limit = 10
): Promise<EmailSearchResult[]> {
	let request = supabase
		.from('emails')
		.select('id, address, domain, organization_id')
		.eq('organization_id', organizationId)
		.order('updated_at', { ascending: false })
		.limit(limit);

	const trimmed = query.trim();
	if (trimmed.length > 0) {
		request = request.ilike('address', `%${trimmed}%`);
	}

	const { data, error } = await request;
	if (error) throw error;

	return (data ?? []).map((row) => ({
		id: row.id as string,
		address: row.address as string,
		domain: (row.domain as string | null) ?? null,
		organization_id: row.organization_id as string
	}));
}

export async function deleteEmail(id: string): Promise<void> {
	const { error } = await supabase.from('emails').delete().eq('id', id);
	if (error) throw error;
}

export async function createEmail(input: {
  organization_id: string;
  address: string;
  domain?: string | null;
}): Promise<{ id: string }> {
  const payload = {
    organization_id: input.organization_id,
    address: input.address.trim(),
    domain: input.domain ?? null,
    first_seen: new Date().toISOString()
  };
  const { data, error } = await supabase.from('emails').insert(payload).select('id').single();
  if (error) throw error;
  return { id: (data?.id as string) ?? '' };
}

