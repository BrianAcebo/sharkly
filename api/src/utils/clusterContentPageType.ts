/**
 * Page types allowed for cluster / strategy SEO pages (focus + supporting articles).
 * Product, Service/Landing, and Category are excluded — those are destination/site pages.
 */

export const CLUSTER_CONTENT_PAGE_TYPES = [
	'Blog Post',
	'How-To Guide',
	'Comparison',
	'Review',
	'Complete Guide'
] as const;

export type ClusterContentPageType = (typeof CLUSTER_CONTENT_PAGE_TYPES)[number];

/**
 * Infer content page type from keyword + optional title (same rules as UI).
 * Defaults to Blog Post when no stronger signal matches.
 */
export function inferClusterContentPageType(keyword: string, title?: string): ClusterContentPageType {
	const text = `${keyword || ''} ${title || ''}`.toLowerCase();

	if (/\bhow (to|do|does|can|should|i|you|we)\b/.test(text)) return 'How-To Guide';

	if (/\b(vs\.?|versus|compare|comparison|alternative|alternatives)\b/.test(text)) return 'Comparison';
	if (/\b(best|top)\s+\d+\b/.test(text) || /\b\d+\s+(best|top)\b/.test(text)) return 'Comparison';
	if (
		/\b(best|top)\b/.test(text) &&
		/\b(for|tools?|software|apps?|platforms?|providers?|hosting|plugins?|themes?)\b/.test(text)
	)
		return 'Comparison';

	if (/\b(review|reviews)\b/.test(text)) return 'Review';

	if (
		/\b(complete guide|ultimate guide|definitive guide|guide to|comprehensive guide|full guide)\b/.test(
			text
		)
	)
		return 'Complete Guide';

	return 'Blog Post';
}

/** Map legacy CRO codes and removed UI types onto CLUSTER_CONTENT_PAGE_TYPES. */
export function normalizeClusterContentPageType(raw: string | null | undefined): ClusterContentPageType {
	if (!raw) return 'Blog Post';
	const trimmed = raw.trim();
	if ((CLUSTER_CONTENT_PAGE_TYPES as readonly string[]).includes(trimmed)) return trimmed as ClusterContentPageType;
	const lower = trimmed.toLowerCase();
	if (lower.includes('mofu_comparison')) return 'Comparison';
	if (
		lower.includes('mofu_article') ||
		lower.includes('tofu_article') ||
		lower.includes('bofu_article') ||
		lower.includes('service_page') ||
		lower.includes('money_page')
	)
		return 'Blog Post';
	if (lower.includes('how-to') || lower.includes('how to')) return 'How-To Guide';
	if (lower.includes('product page') || lower.includes('service') || lower.includes('landing') || lower.includes('category'))
		return 'Blog Post';
	if (lower.includes('review')) return 'Review';
	if (lower.includes('comparison') || lower.includes(' vs ') || lower.includes('versus')) return 'Comparison';
	if (lower.includes('complete guide') || lower.includes('pillar')) return 'Complete Guide';
	return inferClusterContentPageType(trimmed, '');
}
