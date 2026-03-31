/**
 * Universal SEO checks — run against any URL.
 * Used by CRO Audit Detail, and can be used by other pages.
 * Fetches the live page and runs basic on-page SEO checks.
 */

import type { Request, Response } from 'express';
import { fetchPageForSeoChecks } from '../utils/competitorFetch.js';
import {
	detectPasswordProtectionFromHtml,
	inferPasswordProtectionFromUniversalSeoChecks,
	PASSWORD_PROTECTED_CRAWL_MESSAGE
} from '../utils/passwordProtectedPage.js';
import { captureApiError } from '../utils/sentryCapture.js';

type SeoCheckResult = {
	status: 'pass' | 'fail' | 'warning';
	message: string;
	weight?: number;
};

function normalizeKeyword(kw: string): string {
	return kw.toLowerCase().replace(/\s+/g, ' ').trim();
}

function keywordInText(keyword: string, text: string): boolean {
	if (!keyword || !text) return false;
	const kwNorm = normalizeKeyword(keyword);
	const textNorm = normalizeKeyword(text);
	const kwWords = kwNorm.split(/\s+/).filter(Boolean);
	if (kwWords.length === 0) return false;
	return kwWords.every((w) => w.length >= 2 && textNorm.includes(w));
}

/**
 * POST /api/seo-checks/run
 * Run SEO checks against a live page URL. No credits. Universal — not tied to ecommerce.
 * Body: { url: string, keyword?: string }
 */
export async function runSeoChecks(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const { url, keyword } = req.body as { url?: string; keyword?: string };
		if (!url || typeof url !== 'string' || !url.trim()) {
			res.status(400).json({ error: 'url is required' });
			return;
		}

		// Validate URL format
		let parsedUrl: URL;
		try {
			parsedUrl = new URL(url.trim());
		} catch {
			res.status(400).json({ error: 'Invalid URL format' });
			return;
		}

		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			res.status(400).json({ error: 'URL must be http or https' });
			return;
		}

		const fetched = await fetchPageForSeoChecks(parsedUrl.toString());
		const checks: Record<string, SeoCheckResult> = {};

		if (!fetched) {
			checks.fetch_error = {
				status: 'fail',
				message: 'Could not fetch the page. The URL may be unreachable, blocked, or returning an error.'
			};
			res.json({
				success: true,
				seo_checks: {
					checks,
					fetched_at: new Date().toISOString(),
					fetch_error: true,
					likely_password_protected: false
				}
			});
			return;
		}

		const { title, h1, metaDescription, metaDescriptionLength: len, schemaTypes } = fetched.meta;
		const html = fetched.html;
		const kw = keyword?.trim() ?? '';

		// Check 1 — Keyword in title (only if keyword provided)
		if (kw) {
			const titleToCheck = title ?? '';
			if (keywordInText(kw, titleToCheck)) {
				checks.keyword_in_title = { status: 'pass', message: 'Keyword found in page title.', weight: 1.0 };
			} else {
				checks.keyword_in_title = {
					status: 'fail',
					message: 'Add your keyword to the meta title to improve relevance for this topic.',
					weight: 1.0
				};
			}
		}

		// Check 2 — Keyword in H1 (only if keyword provided)
		if (kw) {
			const h1ToCheck = h1 ?? '';
			if (keywordInText(kw, h1ToCheck)) {
				checks.keyword_in_h1 = { status: 'pass', message: 'Keyword found in H1.', weight: 0.95 };
			} else {
				checks.keyword_in_h1 = {
					status: 'fail',
					message: "Your H1 doesn't contain the target keyword. Update the main heading to include it.",
					weight: 0.95
				};
			}
		}

		// Check 3 — Keyword in URL slug (only if keyword provided)
		if (kw) {
			const urlSlug = parsedUrl.pathname.toLowerCase().split('/').filter(Boolean).pop() ?? '';
			if (keywordInText(kw, urlSlug.replace(/[-_]/g, ' '))) {
				checks.keyword_in_url = {
					status: 'pass',
					message: 'Keyword reflected in URL slug.',
					weight: 0.85
				};
			} else {
				checks.keyword_in_url = {
					status: 'fail',
					message: "URL doesn't reflect your target keyword.",
					weight: 0.85
				};
			}
		}

		// Check 4 — Meta description 150–160 chars
		if (!metaDescription || !metaDescription.trim()) {
			checks.meta_description = {
				status: 'fail',
				message: 'No meta description. Add one to improve click-through rate from search results.'
			};
		} else if (len >= 150 && len <= 160) {
			checks.meta_description = { status: 'pass', message: `Meta description OK (${len} chars).` };
		} else if (len < 150) {
			checks.meta_description = {
				status: 'warning',
				message: `Meta description too short (${len} chars). Aim for 150–160.`
			};
		} else {
			checks.meta_description = {
				status: 'warning',
				message: `Meta description too long (${len} chars). Aim for 150–160.`
			};
		}

		// Check 5 — Schema present (Product, Organization, or any structured data)
		const hasProduct = schemaTypes.includes('Product');
		const hasOrganization = schemaTypes.includes('Organization');
		const hasCollectionPage = schemaTypes.includes('CollectionPage');
		const hasArticle = schemaTypes.includes('Article');
		const hasAny = schemaTypes.length > 0;
		if (hasProduct || hasCollectionPage || hasOrganization || hasArticle || hasAny) {
			checks.schema = {
				status: 'pass',
				message: `Structured data found: ${schemaTypes.slice(0, 3).join(', ')}${schemaTypes.length > 3 ? '…' : ''}.`
			};
		} else {
			checks.schema = {
				status: 'fail',
				message:
					'No structured data (JSON-LD) detected. Add schema markup to help search engines understand your page.'
			};
		}

		// When no keyword provided, add a note
		if (!kw) {
			checks.keyword_check = {
				status: 'warning',
				message: 'No keyword provided. Run with a keyword to check title, H1, and URL optimization.'
			};
		}

		const htmlPasswordHint = detectPasswordProtectionFromHtml(html);
		const heuristicPasswordHint = inferPasswordProtectionFromUniversalSeoChecks({
			keyword: kw,
			checks
		});
		const likelyPasswordProtected = htmlPasswordHint || heuristicPasswordHint;

		res.json({
			success: true,
			seo_checks: {
				checks,
				fetched_at: new Date().toISOString(),
				fetch_error: false,
				likely_password_protected: likelyPasswordProtected,
				...(likelyPasswordProtected && { password_protection_message: PASSWORD_PROTECTED_CRAWL_MESSAGE })
			}
		});
	} catch (error) {
		console.error('[SEO Checks] Run error:', error);
		captureApiError(error, req, { feature: 'seo-checks-run' });
		res.status(500).json({ error: 'Failed to run SEO checks' });
	}
}
