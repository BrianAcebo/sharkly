import type { EmailLeak, EmailLeakKind, EmailProfileRef, EmailRecord } from '../types/email';
import type { EntityRef, LeakNode, SocialProfileNode } from '../types/entities';

const clampConfidence = (value: number): number => {
	if (Number.isNaN(value)) return 0;
	if (value < 0) return 0;
	if (value > 1) return 1;
	return value;
};

const parseNullableConfidence = (value: unknown): number | null => {
	if (value === null || value === undefined || value === '') return null;
	const numeric = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(numeric)) return null;
	return clampConfidence(numeric);
};

const parseNullableTimestamp = (value: unknown): string | null => {
	if (value === null || value === undefined || value === '') return null;
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (typeof value === 'number' && Number.isFinite(value)) {
		return new Date(value).toISOString();
	}
	if (typeof value === 'string') {
		const trimmed = value.trim();
		if (!trimmed) return null;
		const ms = Date.parse(trimmed);
		if (!Number.isNaN(ms)) {
			return new Date(ms).toISOString();
		}
		return trimmed;
	}
	return null;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toLeakEntityRef = (value: unknown): EntityRef<LeakNode> | null => {
	if (!isPlainObject(value)) return null;
	const id = typeof value.id === 'string' && value.id.trim().length > 0 ? value.id.trim() : null;
	if (!id) return null;
	const typeCandidate = typeof value.type === 'string' && value.type.trim().length > 0 ? value.type.trim() : 'leak';
	return { id, type: typeCandidate as LeakNode['type'] };
};

const inferLeakKind = (raw: Record<string, unknown>, metadata: Record<string, unknown> | null): EmailLeakKind => {
	const rawKind = typeof raw.kind === 'string' ? raw.kind.trim().toLowerCase() : null;
	if (rawKind === 'breach' || rawKind === 'paste') return rawKind;
	const metaKind = metadata && typeof metadata.kind === 'string' ? String(metadata.kind).trim().toLowerCase() : null;
	if (metaKind === 'breach' || metaKind === 'paste') return metaKind;
	const source = typeof raw.source === 'string' ? raw.source.toLowerCase() : undefined;
	if (source && /paste|dump/.test(source)) return 'paste';
	return 'breach';
};

const coerceMetadata = (value: unknown): Record<string, unknown> | null => {
	if (!isPlainObject(value)) return null;
	return Object.fromEntries(
		Object.entries(value).filter(([, v]) => v !== undefined && v !== null)
	);
};

export const normalizeEmailLeaks = (input: unknown): EmailLeak[] => {
	if (!Array.isArray(input)) return [];
	const result: EmailLeak[] = [];
	for (const item of input) {
		if (!isPlainObject(item)) continue;
		const metadata = coerceMetadata(item.metadata);
		let leakRef = toLeakEntityRef(item.leak);
		if (!leakRef) {
			const leakId = typeof item.leak_id === 'string' && item.leak_id.trim().length > 0
				? item.leak_id.trim()
				: typeof item.id === 'string' && item.id.trim().length > 0
					? item.id.trim()
					: null;
			if (leakId) {
				leakRef = { id: leakId, type: 'leak' };
			}
		}
		if (!leakRef) continue;
		const leak: EmailLeak = {
			id: typeof item.id === 'string' && item.id.trim().length > 0 ? item.id.trim() : undefined,
			leak: leakRef,
			kind: inferLeakKind(item, metadata),
			title:
				typeof item.title === 'string' && item.title.trim().length > 0
					? item.title.trim()
					: typeof item.name === 'string' && item.name.trim().length > 0
						? item.name.trim()
						: metadata && typeof metadata.name === 'string' && String(metadata.name).trim().length > 0
							? String(metadata.name).trim()
							: null,
			source: typeof item.source === 'string' && item.source.trim().length > 0 ? item.source.trim() : null,
			content_snippet:
				typeof item.content_snippet === 'string' && item.content_snippet.trim().length > 0
					? item.content_snippet.trim()
					: typeof item.snippet === 'string' && item.snippet.trim().length > 0
						? item.snippet.trim()
						: null,
			first_seen: parseNullableTimestamp(item.first_seen ?? metadata?.first_seen),
			last_seen: parseNullableTimestamp(item.last_seen ?? metadata?.last_seen),
			confidence: parseNullableConfidence(item.confidence ?? metadata?.confidence),
			url: typeof item.url === 'string' && item.url.trim().length > 0 ? item.url.trim() : null,
			metadata
		};
		result.push(leak);
	}
	return result;
};

export const normalizeEmailProfiles = (input: unknown): EmailProfileRef[] => {
	if (!Array.isArray(input)) return [];
	const result: EmailProfileRef[] = [];
	for (const item of input) {
		if (!isPlainObject(item)) continue;
		const id = typeof item.id === 'string' && item.id.trim().length > 0 ? item.id.trim() : null;
		if (!id) continue;
		const type =
			typeof item.type === 'string' && item.type.trim().length > 0
				? (item.type.trim() as SocialProfileNode['type'])
				: ('social_profile' as SocialProfileNode['type']);
		const profile: EmailProfileRef = {
			id,
			type
		};
		if (typeof item.label === 'string' && item.label.trim().length > 0) {
			profile.label = item.label.trim();
		}
		if (typeof item.handle === 'string' && item.handle.trim().length > 0) {
			profile.handle = item.handle.trim();
		}
		if (typeof item.platform === 'string' && item.platform.trim().length > 0) {
			profile.platform = item.platform.trim();
		}
		if (typeof item.url === 'string' && item.url.trim().length > 0) {
			profile.url = item.url.trim();
		}
		result.push(profile);
	}
	return result;
};

export const normalizeEmailRecordEntry = (input: EmailRecord): EmailRecord => {
	const address = typeof input.email?.address === 'string' ? input.email.address.trim() : '';
	const domainCandidate = typeof input.email?.domain === 'string' ? input.email.domain.trim() : null;
	const derivedDomain = domainCandidate && domainCandidate.length > 0
		? domainCandidate
		: (() => {
			if (!address.includes('@')) return null;
			const [, domainPart] = address.split('@');
			return domainPart && domainPart.trim().length > 0 ? domainPart.trim() : null;
		})();

	return {
		id: input.id,
		organization_id: input.organization_id,
		email: {
			address,
			domain: derivedDomain,
			first_seen: parseNullableTimestamp(input.email?.first_seen)
		},
		leaks: normalizeEmailLeaks(input.leaks),
		profiles: normalizeEmailProfiles(input.profiles),
		confidence: parseNullableConfidence(input.confidence),
		last_checked: parseNullableTimestamp(input.last_checked)
	};
};

export const normalizeEmailList = (raw: EmailRecord[] | undefined | null): EmailRecord[] => {
	if (!Array.isArray(raw)) return [];
	const unique = new Map<string, EmailRecord>();
	for (const entry of raw) {
		if (!entry || typeof entry !== 'object') continue;
		const normalized = normalizeEmailRecordEntry(entry);
		const address = normalized.email.address;
		if (!address) continue;
		unique.set(address.toLowerCase(), normalized);
	}
	return Array.from(unique.values());
};

export const toProfileEntityRefs = (profiles: EmailProfileRef[] | undefined | null): EntityRef<SocialProfileNode>[] => {
	if (!profiles) return [];
	return profiles.map((profile) => ({ id: profile.id, type: profile.type }));
};

export const normalizeEmailConfidence = parseNullableConfidence;
export const normalizeEmailTimestamp = parseNullableTimestamp;

