/**
 * S2-2: Keyword Density — bidirectional scoring (product-gaps-master.md V1.2e)
 * Used by technical audit service.
 */

function countKeywordOccurrences(text: string, keyword: string): number {
	if (!text || !keyword.trim()) return 0;
	const lower = text.toLowerCase();
	const kw = keyword.toLowerCase().trim();
	if (!kw) return 0;
	const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
	const matches = lower.match(regex);
	return matches ? matches.length : 0;
}

export function getKeywordDensity(text: string, keyword: string): {
	densityPct: number;
	keywordCount: number;
	wordCount: number;
	isKeywordStuffing: boolean;
} {
	const words = text.trim().split(/\s+/).filter(Boolean);
	const wordCount = words.length;
	const keywordCount = countKeywordOccurrences(text, keyword);
	const densityPct = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
	return {
		densityPct,
		keywordCount,
		wordCount,
		isKeywordStuffing: densityPct > 3
	};
}
