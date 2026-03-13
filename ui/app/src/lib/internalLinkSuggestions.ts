/**
 * V1 — Section 17.6 Internal Link Suggestion Algorithm
 * US8117209B1 Reasonable Surfer: placement and equity.
 * Generates suggestions when existingLinks is empty (no DB yet) or from internal_links table.
 */

export type ClusterPage = {
	id: string;
	title: string;
	keyword: string;
	type: 'focus_page' | 'article';
};

export type ExistingLink = {
	from_page_id: string;
	to_page_id: string;
	anchor_text?: string;
};

export type LinkSuggestion = {
	from_page_id: string;
	to_page_id: string; // Empty string when to_url is set (destination link)
	anchor_text: string;
	placement_hint: 'intro' | 'body' | 'other';
	equity_multiplier: number;
	priority: 'critical' | 'high' | 'medium';
	note?: string;
	// For UI display
	from_title?: string;
	to_title?: string;
	/** When set, this is a destination-page link (focus → product/collection). Connects to store. */
	to_url?: string;
};

function generateVariationAnchor(keyword: string): string {
	const words = keyword.split(' ').filter(Boolean);
	if (words.length <= 3) return keyword;
	return words.slice(0, 3).join(' ');
}

function extractDescriptiveAnchor(page: ClusterPage): string {
	const words = page.keyword.split(' ').filter(Boolean);
	return words.slice(0, Math.min(5, words.length)).join(' ');
}

function chunkArray<T>(arr: T[], size: number): T[][] {
	const result: T[][] = [];
	for (let i = 0; i < arr.length; i += size) {
		result.push(arr.slice(i, i + size));
	}
	return result;
}

/**
 * Generate internal link suggestions for a cluster (Section 17.6).
 * - Reverse silo: every article MUST link to focus page
 * - Focus page links to destination (product/collection) when set — many-to-one-to-one
 * - Focus must link back to at least 3 articles
 * - Article-to-article mesh within groups of 5
 */
export function generateInternalLinkSuggestions(
	pages: ClusterPage[],
	existingLinks: ExistingLink[] = [],
	destination?: { url: string; label: string }
): LinkSuggestion[] {
	const suggestions: LinkSuggestion[] = [];
	const focusPage = pages.find((p) => p.type === 'focus_page');
	const articles = pages.filter((p) => p.type === 'article');

	if (!focusPage) return suggestions;

	// 0. Focus page → destination (reverse silo exit; many-to-one-to-one)
	if (destination?.url && destination?.label) {
		suggestions.push({
			from_page_id: focusPage.id,
			to_page_id: '',
			to_url: destination.url,
			anchor_text: destination.label,
			placement_hint: 'body',
			equity_multiplier: 1.0,
			priority: 'critical',
			note: 'Connects to your store — main conversion link from focus page',
			from_title: focusPage.title,
			to_title: destination.label
		});
	}

	// 1. Reverse silo: every article MUST link to focus page
	for (const article of articles) {
		const hasLink = existingLinks.some(
			(l) => l.from_page_id === article.id && l.to_page_id === focusPage.id
		);
		if (!hasLink) {
			suggestions.push({
				from_page_id: article.id,
				to_page_id: focusPage.id,
				anchor_text: generateVariationAnchor(focusPage.keyword),
				placement_hint: 'intro',
				equity_multiplier: 1.0,
				priority: 'critical',
				note: 'Add in the first 2 paragraphs — highest link equity',
				from_title: article.title,
				to_title: focusPage.title
			});
		}
	}

	// 2. Focus page must link back: max 3 total. When destination set: 1 destination + 2 articles.
	const hasDestination = Boolean(destination?.url && destination?.label);
	const articleSlots = hasDestination ? 2 : 3;
	const focusOutLinks = existingLinks.filter((l) => l.from_page_id === focusPage.id);
	const needFocusOut = Math.max(0, articleSlots - focusOutLinks.length);
	for (let i = 0; i < needFocusOut && i < articles.length; i++) {
		const article = articles[i];
		const alreadyLinked = existingLinks.some(
			(l) => l.from_page_id === focusPage.id && l.to_page_id === article.id
		);
		if (!alreadyLinked) {
			suggestions.push({
				from_page_id: focusPage.id,
				to_page_id: article.id,
				anchor_text: article.keyword,
				placement_hint: 'body',
				equity_multiplier: 0.8,
				priority: 'high',
				from_title: focusPage.title,
				to_title: article.title
			});
		}
	}

	// 3. Article-to-article mesh within groups of 5
	const groups = chunkArray(articles, 5);
	for (const group of groups) {
		for (let i = 0; i < group.length; i++) {
			for (let j = 0; j < group.length; j++) {
				if (i === j) continue;
				const from = group[i];
				const to = group[j];
				const hasLink = existingLinks.some(
					(l) => l.from_page_id === from.id && l.to_page_id === to.id
				);
				if (!hasLink) {
					suggestions.push({
						from_page_id: from.id,
						to_page_id: to.id,
						anchor_text: extractDescriptiveAnchor(to),
						placement_hint: 'body',
						equity_multiplier: 0.8,
						priority: 'medium',
						from_title: from.title,
						to_title: to.title
					});
				}
			}
		}
	}

	return suggestions;
}

/** Placement label for UI (Section 17.6 / SITEMAP) */
export function getPlacementLabel(hint: LinkSuggestion['placement_hint']): string {
	switch (hint) {
		case 'intro':
			return 'Place in first 400 words';
		case 'body':
			return 'Place in end of body text';
		default:
			return 'Place in other text';
	}
}

/** Equity label for UI */
export function getEquityLabel(multiplier: number): string {
	if (multiplier >= 1) return '1.00× Very High';
	if (multiplier >= 0.8) return '0.80× High';
	if (multiplier >= 0.5) return '0.50× Medium';
	if (multiplier >= 0.3) return '0.30× Low';
	return '0.15× Very Low';
}
