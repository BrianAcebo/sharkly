/**
 * Detect storefront / site password gates so crawlers don't misread failures as bad SEO.
 * Used by universal SEO checks (live fetch) and CRO live URL parsing.
 */

const HTML_SCAN_MAX = 350_000;

/** User-facing copy — surfaced in API + UI when this situation applies */
export const PASSWORD_PROTECTED_CRAWL_MESSAGE =
	'This page may be behind a gate or site password. Remove password protection or use a public URL to get accurate checks.';

/**
 * Strong signals in raw HTML (Shopify password template, etc.).
 */
export function detectPasswordProtectionFromHtml(html: string): boolean {
	if (!html || html.length < 80) return false;
	const sample = html.slice(0, HTML_SCAN_MAX);
	const lower = sample.toLowerCase();

	if (lower.includes('this store is password protected')) return true;
	if (lower.includes('enter store password')) return true;
	if (lower.includes('store password') && lower.includes('shopify') && lower.includes('password'))
		return true;
	if (/shopify-section-password|template-password|password\.liquid|password-page/i.test(sample))
		return true;
	if (
		lower.includes('cdn.shopify.com') &&
		/password[\s_-]?page|template[\s_-]?password/i.test(lower)
	)
		return true;

	if (lower.includes('site is password protected')) return true;
	if (lower.includes('private site') && lower.includes('password') && lower.includes('enter'))
		return true;

	return false;
}

/**
 * Heuristic: keyword-in-URL passes (derived from URL string only) but every HTML-based check failed.
 * Typical of password gates where title/H1/meta/schema don't match the real product page.
 */
export function inferPasswordProtectionFromUniversalSeoChecks(params: {
	keyword: string;
	checks: Record<string, { status: string } | undefined>;
}): boolean {
	const kw = params.keyword?.trim();
	if (!kw) return false;

	const c = params.checks;
	if (c.keyword_in_url?.status !== 'pass') return false;
	if (c.keyword_in_title?.status !== 'fail') return false;
	if (c.keyword_in_h1?.status !== 'fail') return false;
	if (c.meta_description?.status !== 'fail') return false;
	if (c.schema?.status !== 'fail') return false;

	return true;
}
