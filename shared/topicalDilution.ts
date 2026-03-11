/**
 * S2-5: Topical Dilution Warning (product-gaps-master.md V1.2d)
 * Entity overlap check when adding new topic to strategy.
 * <20% overlap with existing content = amber warning (confirmable).
 */

const STOP_WORDS = new Set([
	'the', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'of', 'on', 'with',
	'how', 'what', 'why', 'when', 'which', 'best', 'vs', 'guide', 'tips',
	'2024', '2025', '2026' // common non-entity suffixes
]);

/**
 * Extract significant terms from a keyword for entity overlap.
 * Lowercase, 2+ chars, excludes stop words.
 */
export function extractKeywordTerms(keyword: string): string[] {
	if (!keyword || typeof keyword !== 'string') return [];
	const terms = keyword
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, ' ')
		.split(/\s+/)
		.filter((w) => w.length > 1 && !STOP_WORDS.has(w));
	return [...new Set(terms)];
}

/**
 * Compute entity overlap: proportion of new keyword's terms that appear in existing content.
 * overlap = |newTerms ∩ existingTerms| / max(1, |newTerms|)
 */
export function calculateEntityOverlap(existingKeywords: string[], newKeyword: string): number {
	const newTerms = extractKeywordTerms(newKeyword);
	if (newTerms.length === 0) return 1; // nothing to compare — treat as safe
	const existingTerms = new Set<string>();
	for (const kw of existingKeywords) {
		for (const t of extractKeywordTerms(kw)) existingTerms.add(t);
	}
	const shared = newTerms.filter((t) => existingTerms.has(t)).length;
	return shared / newTerms.length;
}

export type TopicalDilutionResult = {
	type: 'topical_dilution_risk';
	severity: 'medium';
	message: string;
	action: string;
	confirmable: true;
	overlap: number;
};

const MIN_EXISTING_TOPICS = 5;

/**
 * Detect topical dilution risk when adding a new topic.
 * Fires when <20% entity overlap with existing content and project has >= 5 topics.
 */
export function detectTopicalDilution(
	newKeyword: string,
	existingKeywords: string[],
	minExisting: number = MIN_EXISTING_TOPICS
): TopicalDilutionResult | null {
	if (existingKeywords.length < minExisting) return null;
	const overlap = calculateEntityOverlap(existingKeywords, newKeyword);
	if (overlap >= 0.2) return null;

	return {
		type: 'topical_dilution_risk',
		severity: 'medium',
		message:
			"This topic is outside what your site usually covers. Adding unrelated content can make Google less confident that you're an expert in your field.",
		action:
			'Are you sure you want to add this topic? Consider whether it fits your content strategy.',
		confirmable: true,
		overlap
	};
}
