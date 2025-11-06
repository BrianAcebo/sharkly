import { supabase } from '../utils/supabaseClient';
import type {
	CreateLeakInput,
	LeakDetail,
	LeakEdgeInfo,
	LeakEmailLink,
	LeakEntity,
	LeakRecord,
	LeakSearchResult,
	UpdateLeakInput
} from '../types/leak';

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

const toStringArray = (value: unknown): string[] => {
	if (!value) return [];
	if (Array.isArray(value)) {
		return value
			.map((item) => {
				if (typeof item === 'string') return item.trim();
				if (item === null || item === undefined) return '';
				return String(item).trim();
			})
			.filter((item): item is string => item.length > 0);
	}
	if (typeof value === 'string') {
		return value
			.split(/[\r\n,]+/g)
			.map((item) => item.trim())
			.filter((item) => item.length > 0);
	}
	return [];
};

const sanitizeMetadata = (value: unknown): Record<string, unknown> | null => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined)
	);
};

const normalizeLeakRecord = (row: Record<string, unknown>): LeakEntity => {
	const base: LeakRecord = {
		id: row.id as string,
		organization_id: row.organization_id as string,
		source: (row.source as string) ?? 'leak',
		content_snippet: (row.content_snippet as string | null) ?? null,
		found_emails: toStringArray(row.found_emails),
		found_usernames: toStringArray(row.found_usernames),
		found_password_hashes: toStringArray(row.found_password_hashes),
		retrieved_at: (row.retrieved_at as string | null) ?? null,
		url: (row.url as string | null) ?? null,
		metadata: sanitizeMetadata(row.metadata),
		fingerprint: (row.fingerprint as string | null) ?? null,
		created_at: (row.created_at as string | null) ?? undefined,
		updated_at: (row.updated_at as string | null) ?? undefined
	};

	return {
		...base,
		id: base.id!,
		organization_id: base.organization_id!,
		found_emails: base.found_emails ?? [],
		found_usernames: base.found_usernames ?? [],
		found_password_hashes: base.found_password_hashes ?? [],
		metadata: base.metadata ?? {}
	};
};

const mapEdgeRow = (row: EdgeRow): LeakEdgeInfo => {
	return {
		id: row.id,
		source_type: row.source_type,
		source_id: row.source_id,
		transform_type: row.transform_type,
		confidence_score: row.confidence_score,
		source_api: row.source_api,
		source_url: row.source_url,
		raw_reference_id: row.raw_reference_id,
		metadata: sanitizeMetadata(row.metadata),
		retrieved_at: row.retrieved_at ?? undefined
	};
};

const upsertLeakPayload = (updates: UpdateLeakInput) => {
	const payload: Record<string, unknown> = {};

	if (updates.source !== undefined) {
		payload.source = updates.source?.trim() || 'unknown';
	}
	if (updates.content_snippet !== undefined) {
		payload.content_snippet = updates.content_snippet?.trim() || null;
	}
	if (updates.found_emails !== undefined) {
		payload.found_emails = (updates.found_emails ?? []).map((item) => item.trim()).filter(Boolean);
	}
	if (updates.found_usernames !== undefined) {
		payload.found_usernames = (updates.found_usernames ?? []).map((item) => item.trim()).filter(Boolean);
	}
	if (updates.found_password_hashes !== undefined) {
		payload.found_password_hashes = (updates.found_password_hashes ?? []).map((item) => item.trim()).filter(Boolean);
	}
	if (updates.retrieved_at !== undefined) {
		payload.retrieved_at = updates.retrieved_at ? new Date(updates.retrieved_at).toISOString() : null;
	}
	if (updates.url !== undefined) {
		const trimmed = updates.url?.trim() ?? '';
		payload.url = trimmed.length > 0 ? trimmed : null;
	}
	if (updates.metadata !== undefined) {
		payload.metadata = sanitizeMetadata(updates.metadata) ?? {};
	}

	return payload;
};

export async function getLeakById(id: string): Promise<LeakDetail> {
	const { data, error } = await supabase.from('leaks').select('*').eq('id', id).single();
	if (error) throw error;
	if (!data) throw new Error('Leak not found');

	const leak = normalizeLeakRecord(data as Record<string, unknown>);

	const { data: edgeRows, error: edgeError } = await supabase
		.from('entity_edges')
		.select(
			'id, source_type, source_id, target_type, target_id, transform_type, confidence_score, source_api, source_url, raw_reference_id, metadata, retrieved_at'
		)
		.eq('target_type', 'leak')
		.eq('target_id', id);
	if (edgeError) throw edgeError;

	const edges = (edgeRows ?? []) as EdgeRow[];
	const emailEdges = edges.filter((edge) => edge.source_type === 'email');
	const emailIds = Array.from(
		new Set(emailEdges.map((edge) => edge.source_id).filter((value): value is string => Boolean(value)))
	);

	let emails: LeakEmailLink[] = [];
	if (emailIds.length > 0) {
		const { data: emailRows, error: emailError } = await supabase
			.from('emails')
			.select('id, address, domain, organization_id')
			.in('id', emailIds);
		if (emailError) throw emailError;

		const emailMap = new Map<string, { id: string; address: string; domain: string | null; organization_id: string }>();
		(emailRows ?? []).forEach((row) => {
			emailMap.set(row.id as string, {
				id: row.id as string,
				address: row.address as string,
				domain: (row.domain as string | null) ?? null,
				organization_id: row.organization_id as string
			});
		});

		emails = emailEdges
			.map((edge) => {
				const email = emailMap.get(edge.source_id);
				if (!email) return null;
				return {
					edge: mapEdgeRow(edge),
					email
				};
			})
			.filter((value): value is LeakEmailLink => value !== null);
	}

	return {
		leak,
		emails
	};
}

export async function updateLeak(id: string, updates: UpdateLeakInput): Promise<LeakDetail> {
	const payload = upsertLeakPayload(updates);

	if (Object.keys(payload).length > 0) {
		const { error } = await supabase.from('leaks').update(payload).eq('id', id);
		if (error) throw error;
	}

	return getLeakById(id);
}

export async function createLeak(input: CreateLeakInput): Promise<LeakDetail> {
	const payload = {
		organization_id: input.organization_id,
		source: input.source.trim(),
		content_snippet: input.content_snippet?.trim() || null,
		found_emails: (input.found_emails ?? []).map((item) => item.trim()).filter(Boolean),
		found_usernames: (input.found_usernames ?? []).map((item) => item.trim()).filter(Boolean),
		found_password_hashes: (input.found_password_hashes ?? []).map((item) => item.trim()).filter(Boolean),
		retrieved_at: input.retrieved_at ? new Date(input.retrieved_at).toISOString() : null,
		url: input.url?.trim() || null,
		metadata: sanitizeMetadata(input.metadata) ?? {}
	};

	const { data, error } = await supabase.from('leaks').insert(payload).select('*').single();
	if (error) throw error;
	return getLeakById((data as { id: string }).id);
}

export async function attachLeakToEmail(
	leakId: string,
	emailId: string,
	options: {
		transform_type?: string;
		confidence_score?: number | null;
		metadata?: Record<string, unknown>;
		retrieved_at?: string | null;
	} = {}
): Promise<void> {
	const { data: existing, error: existingError } = await supabase
		.from('entity_edges')
		.select('id')
		.eq('source_type', 'email')
		.eq('source_id', emailId)
		.eq('target_type', 'leak')
		.eq('target_id', leakId)
		.limit(1)
		.maybeSingle();

	if (existingError) {
		throw existingError;
	}

	if (existing) return;

	const now = new Date().toISOString();
	const { error } = await supabase.from('entity_edges').insert({
		source_type: 'email',
		source_id: emailId,
		target_type: 'leak',
		target_id: leakId,
		transform_type: options.transform_type ?? 'manual',
		confidence_score: options.confidence_score ?? 1,
		metadata: sanitizeMetadata(options.metadata) ?? {},
		retrieved_at: options.retrieved_at ?? now,
		source_api: 'manual',
		source_url: null,
		raw_reference_id: null,
		created_at: now
	});
	if (error) throw error;
}

export async function detachLeakFromEmail(leakId: string, emailId: string): Promise<void> {
	const { error } = await supabase
		.from('entity_edges')
		.delete()
		.eq('source_type', 'email')
		.eq('source_id', emailId)
		.eq('target_type', 'leak')
		.eq('target_id', leakId);
	if (error) throw error;
}

export async function searchLeaks(
	organizationId: string,
	query: string,
	limit = 10
): Promise<LeakSearchResult[]> {
	let request = supabase
		.from('leaks')
		.select('id, source, content_snippet, retrieved_at, url')
		.eq('organization_id', organizationId)
		.order('updated_at', { ascending: false })
		.limit(limit);

	const trimmed = query.trim();
	if (trimmed.length > 0) {
		request = request.or(
			`source.ilike.%${trimmed}%,content_snippet.ilike.%${trimmed}%`
		);
	}

	const { data, error } = await request;
	if (error) throw error;

	return (data ?? []).map((row) => ({
		id: row.id as string,
		source: (row.source as string) ?? 'leak',
		content_snippet: (row.content_snippet as string | null) ?? null,
		retrieved_at: (row.retrieved_at as string | null) ?? null,
		url: (row.url as string | null) ?? null
	}));
}

