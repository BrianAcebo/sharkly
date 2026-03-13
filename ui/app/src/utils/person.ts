/** Person name utilities for case/entity features */

export interface PersonName {
	first?: string | null;
	last?: string | null;
	middle?: string | null;
}

export function formatPersonName(p: PersonName | null | undefined): string {
	if (!p) return '';
	const parts = [p.first, p.middle, p.last].filter(Boolean);
	return parts.join(' ').trim() || 'Unknown';
}

export function normalizePersonName(name: string): PersonName {
	const parts = name.trim().split(/\s+/);
	if (parts.length === 0) return {};
	if (parts.length === 1) return { first: parts[0] };
	if (parts.length === 2) return { first: parts[0], last: parts[1] };
	return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] };
}
