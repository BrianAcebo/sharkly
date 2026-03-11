/**
 * S2-3: Keyword Cannibalization Detection (product-gaps-master.md V1.2a)
 * Shared between API and frontend.
 */

const STOP_WORDS = new Set([
	'the',
	'a',
	'an',
	'and',
	'or',
	'for',
	'to',
	'in',
	'of',
	'on',
	'with',
	'how',
	'what',
	'why',
	'when',
	'which',
	'best',
	'vs'
]);

/**
 * Normalize keyword for comparison: lowercase, strip stop words, plural normalization, sort words.
 */
export function normalizeKeyword(keyword: string): string {
	if (!keyword || typeof keyword !== 'string') return '';
	return keyword
		.toLowerCase()
		.trim()
		.replace(/\b(the|a|an|and|or|for|to|in|of|on|with|how|what|why|when|which|best|vs)\b/g, '')
		.replace(/\s+/g, ' ')
		.split(' ')
		.filter((w) => w.length > 1)
		.sort()
		.join(' ')
		.trim();
}

export type CannibalizationConflict = {
	keyword: string;
	normalizedKeyword: string;
	pages: Array<{
		id: string;
		title: string;
		publishedUrl?: string | null;
		type?: string;
		clusterTitle?: string;
	}>;
};

export type PageForCannibalization = {
	id: string;
	title: string;
	keyword?: string | null;
	published_url?: string | null;
	type?: string;
	clusterTitle?: string;
};

/**
 * Detect keyword cannibalization across pages.
 * Returns conflicts where 2+ pages target the same normalized keyword.
 */
export function detectKeywordCannibalization(
	pages: PageForCannibalization[]
): CannibalizationConflict[] {
	const keywordMap = new Map<string, PageForCannibalization[]>();

	for (const page of pages) {
		const kw = page.keyword?.trim();
		if (!kw) continue;
		const normalized = normalizeKeyword(kw);
		if (!normalized || normalized.length < 2) continue;

		if (!keywordMap.has(normalized)) keywordMap.set(normalized, []);
		keywordMap.get(normalized)!.push(page);
	}

	const conflicts: CannibalizationConflict[] = [];
	for (const [normalized, pageList] of keywordMap) {
		if (pageList.length < 2) continue;
		// Use the first page's original keyword as display
		const displayKw = pageList[0].keyword ?? normalized;
		conflicts.push({
			keyword: displayKw,
			normalizedKeyword: normalized,
			pages: pageList.map((p) => ({
				id: p.id,
				title: p.title,
				publishedUrl: p.published_url,
				type: p.type,
				clusterTitle: p.clusterTitle
			}))
		});
	}
	return conflicts;
}

/**
 * Check if adding a new keyword would create a cannibalization conflict.
 */
export function wouldConflictWithKeyword(
	existingPages: PageForCannibalization[],
	proposedKeyword: string
): CannibalizationConflict | null {
	const proposedNorm = normalizeKeyword(proposedKeyword);
	if (!proposedNorm || proposedNorm.length < 2) return null;

	const matches = existingPages.filter(
		(p) => p.keyword && normalizeKeyword(p.keyword) === proposedNorm
	);
	if (matches.length === 0) return null;

	return {
		keyword: proposedKeyword,
		normalizedKeyword: proposedNorm,
		pages: matches.map((p) => ({
			id: p.id,
			title: p.title,
			publishedUrl: p.published_url,
			type: p.type,
			clusterTitle: p.clusterTitle
		}))
	};
}
