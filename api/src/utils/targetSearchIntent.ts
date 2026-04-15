/**
 * Resolve and merge search intent for a target row (DataForSEO + destination hints).
 * Used only on target create/update — not on page load.
 */

import { getKeywordSearchIntents, type DfsSearchIntentLabel } from './dataforseo.js';
import { fallbackSearchIntentFromKeyword, type ApiSearchIntent } from './searchIntentFallback.js';

export type TargetKeywordIntentKind = ApiSearchIntent | 'navigational';

function primaryPhrase(name: string, seedKeywords: string[]): string {
	const seeds = seedKeywords.map((s) => s.trim()).filter(Boolean);
	if (seeds.length > 0) return seeds[0];
	return name.trim();
}

function inferIntentFromDestinationContext(
	destinationPageLabel?: string | null,
	destinationPageUrl?: string | null
): ApiSearchIntent | null {
	const l = (destinationPageLabel ?? '').toLowerCase();
	const u = (destinationPageUrl ?? '').toLowerCase();
	if (!l.trim() && !u.trim()) return null;

	if (/\/(collections?|products?)(\/|$|\?)/i.test(u)) return 'transactional';
	if (/\/cart\b|\/checkout\b/i.test(u)) return 'transactional';

	if (/product\s*page|collection\s*page/i.test(l)) return 'transactional';
	if (/\b(shop|store)\s*page\b/i.test(l)) return 'transactional';
	if (/\bcategory\s*page\b/i.test(l)) return 'commercial';
	if (/\b(blog|article|guide)\s*page\b/i.test(l)) return 'informational';

	return null;
}

function mergeTargetKeywordIntent(
	dataForSeoKind: TargetKeywordIntentKind | null | undefined,
	destinationPageLabel: string | null | undefined,
	destinationPageUrl: string | null | undefined,
	keywordForFallback: string
): TargetKeywordIntentKind {
	const dest = inferIntentFromDestinationContext(destinationPageLabel, destinationPageUrl);
	const base: TargetKeywordIntentKind =
		dataForSeoKind ?? fallbackSearchIntentFromKeyword(keywordForFallback);
	if (dest === 'transactional' && (base === 'informational' || base === 'navigational')) {
		return 'transactional';
	}
	if (dest === 'commercial' && (base === 'informational' || base === 'navigational')) {
		return 'commercial';
	}
	return base;
}

export type ResolvedTargetSearchIntent = {
	primary_search_intent: TargetKeywordIntentKind;
	search_intent_probability: number | null;
	search_intent_source: 'dataforseo' | 'fallback';
	search_intent_phrase: string;
};

/**
 * One DataForSEO search_intent call per target save (single keyword).
 */
export async function resolveSearchIntentForTargetRow(
	name: string,
	seedKeywords: string[],
	destinationPageLabel: string | null,
	destinationPageUrl: string | null
): Promise<ResolvedTargetSearchIntent> {
	const phrase = primaryPhrase(name, seedKeywords);
	if (!phrase) {
		return {
			primary_search_intent: 'informational',
			search_intent_probability: null,
			search_intent_source: 'fallback',
			search_intent_phrase: ''
		};
	}

	const { items, configured } = await getKeywordSearchIntents([phrase]);

	let dfsBase: TargetKeywordIntentKind | null = null;
	let probability: number | null = null;
	let usedDataForSeo = false;

	if (configured && items.length > 0) {
		const match =
			items.find((i) => i.keyword.toLowerCase() === phrase.toLowerCase()) ?? items[0];
		if (match?.label) {
			dfsBase = match.label as TargetKeywordIntentKind;
			probability = typeof match.probability === 'number' ? match.probability : null;
			usedDataForSeo = true;
		}
	}

	if (!dfsBase) {
		dfsBase = fallbackSearchIntentFromKeyword(phrase);
	}

	const merged = mergeTargetKeywordIntent(
		dfsBase,
		destinationPageLabel,
		destinationPageUrl,
		phrase
	);

	return {
		primary_search_intent: merged,
		search_intent_probability: usedDataForSeo ? probability : null,
		search_intent_source: usedDataForSeo ? 'dataforseo' : 'fallback',
		search_intent_phrase: phrase
	};
}
