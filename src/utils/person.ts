import type { PersonName } from '../types/person';
import type { EmailRecord } from '../types/email';
import { normalizeEmailList } from './email';

export const normalizePersonName = (name: PersonName | string | null | undefined): PersonName => {
  if (!name) {
    return {
      first: '',
      last: '',
      given: null,
      family: null,
      middle: null,
      prefix: null,
      suffix: null
    };
  }

  if (typeof name === 'string') {
    const trimmed = name.trim();
    return {
      first: trimmed,
      last: '',
      given: trimmed || null,
      family: null,
      middle: null,
      prefix: null,
      suffix: null
    };
  }

  const first = name.first ?? name.given ?? '';
  const last = name.last ?? name.family ?? '';

  return {
    first,
    last,
    middle: name.middle ?? null,
    given: name.given ?? (first ? first : null),
    family: name.family ?? (last ? last : null),
    prefix: name.prefix ?? null,
    suffix: name.suffix ?? null
  };
};

export const formatPersonName = (name: PersonName | string | null | undefined, fallback = 'Unknown person'): string => {
  const normalized = normalizePersonName(name);
  const parts = [
    normalized.prefix ?? undefined,
    normalized.first || undefined,
    normalized.middle ?? undefined,
    normalized.last || undefined,
    normalized.suffix ?? undefined
  ].filter((part) => typeof part === 'string' && part.trim().length > 0) as string[];

  const joined = parts.join(' ').trim();
  if (joined.length > 0) return joined;

  if (typeof name === 'string' && name.trim().length > 0) {
    return name.trim();
  }

  if (normalized.given && normalized.given.trim().length > 0) {
    return normalized.given.trim();
  }

  return fallback;
};

export const buildPersonName = (input: {
  first?: string;
  last?: string;
  middle?: string | null;
  prefix?: string | null;
  suffix?: string | null;
}): PersonName => {
  const first = (input.first ?? '').trim();
  const last = (input.last ?? '').trim();
  const middle = input.middle?.trim() || null;
  const prefix = input.prefix?.trim() || null;
  const suffix = input.suffix?.trim() || null;

  return {
    first,
    last,
    middle,
    prefix,
    suffix,
    given: first || null,
    family: last || null
  };
};

export const normalizeEmails = (raw: EmailRecord[] | undefined | null): EmailRecord[] => normalizeEmailList(raw);


