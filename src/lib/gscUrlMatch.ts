/**
 * GSC URL matching — flexible matching between GSC performance_data.page
 * and pages.published_url (which may be full URL or path, with/without protocol).
 */

function toComparePath(url: string): string {
	if (!url || typeof url !== 'string') return '';
	const lower = url.trim().toLowerCase();
	const withoutProtocol = lower.replace(/^https?:\/\//, '');
	const pathOnly = withoutProtocol.replace(/^[^/]+/, '') || withoutProtocol;
	const normalized = pathOnly.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
	return normalized || pathOnly;
}

/** Check if gscPage (from performance_data) matches a Sharkly page's published_url */
export function gscPageMatchesSharklyPage(
	gscPage: string,
	publishedUrl: string | null,
	siteUrl?: string | null
): boolean {
	if (!gscPage) return false;
	const gscPath = toComparePath(gscPage);

	if (publishedUrl) {
		if (gscPage === publishedUrl || toComparePath(publishedUrl) === gscPath) return true;
		const ourPath = toComparePath(publishedUrl);
		if (ourPath && (gscPath === ourPath || gscPath.endsWith('/' + ourPath))) return true;
	}

	if (siteUrl && publishedUrl) {
		const base = siteUrl.replace(/\/$/, '');
		const path = publishedUrl.startsWith('/') ? publishedUrl : '/' + publishedUrl.replace(/^https?:\/\/[^/]+/, '');
		const built = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
		if (toComparePath(built) === gscPath) return true;
	}

	return false;
}

/** Find page ID for a GSC page URL from a list of pages with published_url */
export function findPageIdForGscUrl(
	gscPage: string,
	pages: Array<{ id: string; published_url: string | null }>,
	siteUrl?: string | null
): string | null {
	for (const p of pages) {
		if (gscPageMatchesSharklyPage(gscPage, p.published_url, siteUrl)) return p.id;
	}
	return null;
}
