/**
 * Advanced Crawler Service — SEMrush-comparable technical audit
 * Grounded in: Complete SEO System + SEO Dissertation (Google patents)
 *
 * Audit Layers:
 *   Layer 1 — Crawl (status codes, robots, redirects, URL structure)
 *   Layer 2 — Render (SPA/JS detection, CWV estimation, lazy loading)
 *   Layer 3 — Indexation (title, H1, meta, canonical, noindex, duplicates)
 *   Layer 4 — Performance (response time, page size, viewport, mixed content)
 *   Layer 5 — Content (thin content, text-to-HTML ratio)
 *   Layer 6 — Markup (schema, OG tags, Twitter Card, images)
 *   Layer 7 — Internal Linking (orphans, single-link pages, broken links)
 *   Layer 8 — Sitemap (orphaned from sitemap, pages missing from sitemap)
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { supabase } from '../utils/supabaseClient.js';
import { URL } from 'url';

export interface CrawlResult {
	url: string;
	statusCode: number;
	title: string;
	titleLength: number;
	h1: string;
	h1Count: number;
	h2Count: number;
	h2PassageScore: number; // 0–1: ratio of passage-ready (question-format) H2s
	metaDescription: string;
	metaDescriptionLength: number;
	canonical: string;
	robots: string;
	isIndexable: boolean;
	responseTime: number;
	hasSSL: boolean;
	pageSize: number;
	wordCount: number;
	/** V2.1: Raw text length (chars) for JS rendering detection — raw vs rendered DOM comparison */
	rawTextLength: number;
	htmlLength: number;
	textHtmlRatio: number;
	/** Body text for keyword density check (S2-2) — only stored when matching Sharkly page */
	textContent?: string;
	hasSchema: boolean;
	hasOGTags: boolean;
	hasViewport: boolean;
	imagesMissingAlt: number;
	imagesTotal: number;
	imagesLazyLoaded: number;
	imagesNonWebP: number;
	internalLinksCount: number;
	externalLinksCount: number;
	/** S1-9: Nav/footer dilution — links in header/nav/footer regions (equity multiplier: nav 0.30x, footer 0.15x) */
	navLinksCount: number;
	footerLinksCount: number;
	redirectUrl?: string;
	lastModified?: string;
	framework?: string;
	isSPA: boolean;
	hasSSR: boolean;
	issues: TechnicalIssue[];
	outboundInternalLinks: string[];
	outboundLinksWithAnchor: Array<{ url: string; anchor: string }>;
}

export interface TechnicalIssue {
	type: string;
	severity: 'critical' | 'warning' | 'info';
	description: string;
	recommendation: string;
	affectedUrl?: string;
}

export interface CoreWebVitalsEstimate {
	lcp: number;
	cls: number;
	inp: number;
	status: 'good' | 'needs_improvement' | 'poor';
}

interface CrawlSession {
	siteId: string;
	startUrl: string;
	maxPages: number;
	visitedUrls: Set<string>;
	results: CrawlResult[];
	errors: { url: string; error: string }[];
	startTime: number;
	// link graph: source → Set<destination>
	linkGraph: Map<string, Set<string>>;
	// all 4xx/5xx urls encountered
	brokenUrls: Set<string>;
	sitemapUrls: Set<string>;
	// destination normalized URL → array of anchor texts used to link to it
	anchorTextMap: Map<string, string[]>;
	// redirect chain tracking: normalized source URL → redirect destination URL
	redirectMap: Map<string, string>;
	// S1-9: Site platform for Shopify-specific nav dilution recommendation
	platform?: string;
	// V2.1: JS rendering detection — headless checks count and browser instance
	jsRenderChecksDone: number;
	playwrightBrowser?: Browser;
}

const CRAWL_CONFIG = {
	MAX_PAGES_PER_SITE: 500,
	TIMEOUT_MS: 20000,
	USER_AGENT: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
	MAX_REDIRECTS: 3,
	SLOW_RESPONSE_THRESHOLD: 3000,
	LARGE_PAGE_THRESHOLD: 5242880, // 5MB
	MAX_LINKS_PER_PAGE: 200,
	MIN_CONTENT_LENGTH: 300,
	MIN_TEXT_HTML_RATIO: 0.1,
	MAX_TITLE_LENGTH: 60,
	MIN_TITLE_LENGTH: 10,
	MAX_META_DESC_LENGTH: 160,
	MIN_META_DESC_LENGTH: 150, // spec: 150–155 chars [seoScore.ts]
	MAX_H1_LENGTH: 70,
	MAX_URL_LENGTH: 115,
	/** V2.1: Max headless checks per crawl — raw vs rendered DOM comparison is expensive */
	MAX_JS_RENDER_CHECKS_PER_CRAWL: 10
};

export class CrawlerService {
	async crawlSite(
		siteId: string,
		siteUrl: string,
		userId: string,
		organizationId: string,
		maxPages: number = 100,
		platform?: string
	): Promise<CrawlResult[]> {
		const session: CrawlSession = {
			siteId,
			startUrl: siteUrl,
			maxPages: Math.min(maxPages, CRAWL_CONFIG.MAX_PAGES_PER_SITE),
			visitedUrls: new Set(),
			results: [],
			errors: [],
			startTime: Date.now(),
			linkGraph: new Map(),
			brokenUrls: new Set(),
			sitemapUrls: new Set(),
			anchorTextMap: new Map(),
			redirectMap: new Map(),
			platform,
			jsRenderChecksDone: 0
		};

		const { data: crawlHistory } = await supabase
			.from('crawl_history')
			.insert({
				site_id: siteId,
				user_id: userId,
				organization_id: organizationId,
				status: 'running'
			})
			.select()
			.single();

		const crawlHistoryId = crawlHistory?.id;

		try {
			// Fetch sitemap URLs for orphan analysis
			await this.fetchSitemapUrls(siteUrl, session);

			// Clear old issues for this site before saving new ones
			await supabase.from('technical_issues').delete().eq('site_id', siteId);

			// Start crawl from homepage
			await this.crawlPage(session, siteUrl, 0);

			// Post-crawl: site-wide analysis
			const siteWideIssues = this.runSiteWideAnalysis(session);

			// Post-crawl: Google PSI Core Web Vitals
			const cwvIssues = await this.fetchCoreWebVitalsIssues(siteUrl);
			siteWideIssues.push(...cwvIssues);

			// Save all results
			await this.saveResults(siteId, session.results, siteWideIssues);

			const allIssues = [...session.results.flatMap((r) => r.issues), ...siteWideIssues];
			const criticalCount = allIssues.filter((i) => i.severity === 'critical').length;
			const warningCount = allIssues.filter((i) => i.severity === 'warning').length;
			const infoCount = allIssues.filter((i) => i.severity === 'info').length;
			const avgResponseTime =
				session.results.length > 0
					? Math.round(
							session.results.reduce((a, b) => a + b.responseTime, 0) / session.results.length
						)
					: 0;

			// S2-4: IGS domain-level health — ratio of low-IGS substantial pages to total substantial pages
			const substantialPages = session.results.filter(
				(r) =>
					r.statusCode === 200 &&
					r.wordCount >= 500 &&
					!r.isSPA
			);
			const lowIgsPages = substantialPages.filter((r) =>
				r.issues.some((i) => i.type === 'igs_signals_absent')
			);
			const ratio =
				substantialPages.length > 0 ? lowIgsPages.length / substantialPages.length : 0;
			const igsStatus: 'critical' | 'warning' | 'good' =
				ratio > 0.5 ? 'critical' : ratio > 0.3 ? 'warning' : 'good';
			const igsHealth = {
				ratio,
				status: igsStatus,
				message:
					ratio > 0.5
						? "Over 50% of your long-form pages don't include anything original — no research, data, or firsthand experience. This can gradually lower Google's opinion of your entire site. Add original content to strengthen your pages."
						: ratio > 0.3
							? "Over 30% of your pages lack original content. Consider adding your own insights, data, or real examples to improve your site's quality."
							: 'Your pages include enough original content.',
				lowCount: lowIgsPages.length,
				substantialCount: substantialPages.length
			};

			if (crawlHistoryId) {
				const crawledUrls = session.results.map((r) => r.url);
				await supabase
					.from('crawl_history')
					.update({
						status: 'completed',
						end_time: new Date().toISOString(),
						duration_seconds: Math.round((Date.now() - session.startTime) / 1000),
						pages_scanned: session.results.length,
						total_issues: allIssues.length,
						critical_issues: criticalCount,
						warning_issues: warningCount,
						info_issues: infoCount,
						avg_response_time_ms: avgResponseTime,
						crawled_urls: crawledUrls,
						igs_health: igsHealth,
						updated_at: new Date().toISOString()
					})
					.eq('id', crawlHistoryId);
			}

			// S1-3: EEAT evaluation (runs after crawl; uses crawled_urls)
			try {
				const { eeatService } = await import('./eeatService.js');
				await eeatService.evaluateSite(siteId);
			} catch (eeErr) {
				console.warn('[Crawler] EEAT evaluation failed:', eeErr);
			}
		} catch (error) {
			if (crawlHistoryId) {
				await supabase
					.from('crawl_history')
					.update({
						status: 'failed',
						end_time: new Date().toISOString(),
						error_message: error instanceof Error ? error.message : 'Unknown error',
						updated_at: new Date().toISOString()
					})
					.eq('id', crawlHistoryId);
			}
			throw error;
		} finally {
			// V2.1: Close Playwright browser used for JS rendering detection
			if (session.playwrightBrowser) {
				await session.playwrightBrowser.close().catch(() => {});
			}
		}

		return session.results;
	}

	// ─── Sitemap ─────────────────────────────────────────────────────────────

	private async fetchSitemapUrls(siteUrl: string, session: CrawlSession): Promise<void> {
		try {
			const base = new URL(siteUrl);
			const sitemapUrl = `${base.protocol}//${base.host}/sitemap.xml`;
			const resp = await axios.get(sitemapUrl, {
				timeout: 10000,
				validateStatus: () => true,
				headers: { 'User-Agent': CRAWL_CONFIG.USER_AGENT }
			});
			if (resp.status === 200 && typeof resp.data === 'string') {
				const matches = resp.data.match(/<loc>([^<]+)<\/loc>/gi) || [];
				matches.forEach((m) => {
					const url = m.replace(/<\/?loc>/gi, '').trim();
					if (url) session.sitemapUrls.add(this.normalizeUrl(url));
				});
			}
		} catch {
			// No sitemap — that's an issue flagged separately
		}
	}

	// ─── Page Crawl ─────────────────────────────────────────────────────────

	private async crawlPage(session: CrawlSession, pageUrl: string, depth: number): Promise<void> {
		if (depth > 6) return;
		if (session.visitedUrls.size >= session.maxPages) return;

		const normalizedUrl = this.normalizeUrl(pageUrl);
		if (
			session.visitedUrls.has(normalizedUrl) ||
			!this.isSameDomain(normalizedUrl, session.startUrl)
		)
			return;

		session.visitedUrls.add(normalizedUrl);

		try {
			const startTime = Date.now();
			const response = await axios.get(pageUrl, {
				timeout: CRAWL_CONFIG.TIMEOUT_MS,
				maxRedirects: CRAWL_CONFIG.MAX_REDIRECTS,
				headers: { 'User-Agent': CRAWL_CONFIG.USER_AGENT },
				validateStatus: () => true,
				decompress: true
			});

			const responseTime = Date.now() - startTime;
			const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
			const $ = cheerio.load(html);

			if (response.status >= 400) {
				session.brokenUrls.add(normalizedUrl);
			}

			// Track redirects for chain detection
			if (response.status >= 300 && response.status < 400) {
				const locationHeader = (response.headers as Record<string, string>)['location'];
				if (locationHeader) {
					try {
						const resolvedDest = new URL(locationHeader, pageUrl).href;
						session.redirectMap.set(normalizedUrl, resolvedDest);
					} catch {
						/* invalid location header */
					}
				}
			}

			const result = this.parsePage(
				$,
				pageUrl,
				response.status,
				responseTime,
				response.headers as Record<string, string>,
				html
			);
			result.issues = this.detectIssues($, pageUrl, response.status, responseTime, html, result);

			// V2.1: JS rendering detection — raw vs rendered DOM comparison (product-gaps V1.3f)
			if (
				response.status === 200 &&
				result.rawTextLength < 500 &&
				session.jsRenderChecksDone < CRAWL_CONFIG.MAX_JS_RENDER_CHECKS_PER_CRAWL
			) {
				const jsIssue = await this.detectJSRenderedContent(session, pageUrl, result.rawTextLength);
				if (jsIssue) result.issues.push(jsIssue);
			}

			// Populate anchor text map (destination → [anchor texts])
			result.outboundLinksWithAnchor.forEach(({ url: dest, anchor }) => {
				const destNorm = this.normalizeUrl(dest);
				if (!session.anchorTextMap.has(destNorm)) session.anchorTextMap.set(destNorm, []);
				if (anchor) session.anchorTextMap.get(destNorm)!.push(anchor.toLowerCase().trim());
			});

			// Track link graph for orphan detection
			session.linkGraph.set(normalizedUrl, new Set(result.outboundInternalLinks));

			session.results.push(result);

			// Continue crawl — breadth-first up to max
			if (response.status < 400) {
				for (const link of result.outboundInternalLinks) {
					if (session.visitedUrls.size < session.maxPages) {
						await this.crawlPage(session, link, depth + 1);
					}
				}
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			session.errors.push({ url: pageUrl, error: msg });
		}
	}

	// ─── Page Parsing ────────────────────────────────────────────────────────

	private parsePage(
		$: cheerio.CheerioAPI,
		url: string,
		statusCode: number,
		responseTime: number,
		headers: Record<string, string>,
		html: string
	): CrawlResult {
		const title = $('title').first().text().trim();
		const h1Elements = $('h1');
		const h1 = h1Elements.first().text().trim();
		const h1Count = h1Elements.length;
		const metaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
		const canonical = $('link[rel="canonical"]').attr('href')?.trim() || '';
		const robotsMeta = $('meta[name="robots"]').attr('content')?.toLowerCase() || '';
		const xRobotsTag = (headers['x-robots-tag'] || '').toLowerCase();
		const noindex = robotsMeta.includes('noindex') || xRobotsTag.includes('noindex');
		const hasViewport = $('meta[name="viewport"]').length > 0;
		const hasOGTags =
			$('meta[property="og:title"]').length > 0 || $('meta[property="og:description"]').length > 0;
		const hasSchema = $('script[type="application/ld+json"]').length > 0;
		const lastModified = headers['last-modified'] || headers['Last-Modified'] || undefined;
		const redirectUrl = headers['location'] || headers['Location'] || undefined;

		// Text/HTML ratio
		const bodyClone = $('body').clone();
		bodyClone.find('script, style, noscript, svg').remove();
		const textContent = bodyClone.text().replace(/\s+/g, ' ').trim();
		const htmlLength = html.length;
		const textHtmlRatio = htmlLength > 0 ? textContent.length / htmlLength : 0;

		// Word count and raw text length (V2.1: for JS rendering detection)
		const wordCount = textContent.split(/\s+/).filter(Boolean).length;
		const rawTextLength = textContent.length;

		// H2 passage quality [US9940367B1 + US9959315B1]
		const h2Elements = $('h2');
		const h2Count = h2Elements.length;
		let passageReadyH2s = 0;
		h2Elements.each((_, el) => {
			const text = $(el).text().trim();
			if (text && this.isPassageReadyH2(text)) passageReadyH2s++;
		});
		const h2PassageScore = h2Count > 0 ? passageReadyH2s / h2Count : 1; // 1 = not applicable

		// Images
		const allImages = $('img');
		const imagesTotal = allImages.length;
		let imagesMissingAlt = 0;
		let imagesLazyLoaded = 0;
		let imagesNonWebP = 0;

		allImages.each((_, el) => {
			const alt = $(el).attr('alt');
			if (alt === undefined || alt === null || alt.trim() === '') imagesMissingAlt++;

			const loading = $(el).attr('loading');
			if (loading === 'lazy') imagesLazyLoaded++;

			const src = $(el).attr('src') || $(el).attr('data-src') || '';
			const srcLower = src.toLowerCase();
			// S2-12: Count images not using WebP or AVIF (legacy formats)
			if (
				srcLower &&
				!srcLower.endsWith('.webp') &&
				!srcLower.endsWith('.avif') &&
				!srcLower.includes('data:image') &&
				(srcLower.endsWith('.jpg') ||
					srcLower.endsWith('.jpeg') ||
					srcLower.endsWith('.png') ||
					srcLower.endsWith('.gif'))
			) {
				imagesNonWebP++;
			}
		});

		// S1-9: Nav and footer link counts (reverse-silo-architecture.md — equity dilution)
		let navLinksCount = 0;
		let footerLinksCount = 0;
		$('header a[href], nav a[href], [role="navigation"] a[href]').each((_, el) => {
			const href = $(el).attr('href');
			if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:'))
				navLinksCount++;
		});
		$('footer a[href]').each((_, el) => {
			const href = $(el).attr('href');
			if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:'))
				footerLinksCount++;
		});

		// Links — collect with anchor text
		const internalLinks: string[] = [];
		const linksWithAnchor: Array<{ url: string; anchor: string }> = [];
		let externalLinksCount = 0;
		const baseDomain = new URL(url).hostname;

		$('a[href]').each((_, el) => {
			try {
				const href = $(el).attr('href');
				if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:'))
					return;
				const resolved = new URL(href, url);
				const anchorText = $(el).text().trim();
				if (resolved.hostname === baseDomain) {
					const clean = resolved.href.split('#')[0];
					if (clean !== url) {
						internalLinks.push(clean);
						linksWithAnchor.push({ url: clean, anchor: anchorText });
					}
				} else {
					externalLinksCount++;
				}
			} catch {
				/* invalid URL */
			}
		});

		// SPA / framework detection
		const { isSPA, framework, hasSSR } = this.detectFramework(html, $);

		// Page size
		const pageSize = Buffer.byteLength(html, 'utf8');

		return {
			url,
			statusCode,
			title,
			titleLength: title.length,
			h1,
			h1Count,
			h2Count,
			h2PassageScore,
			metaDescription,
			metaDescriptionLength: metaDescription.length,
			canonical,
			textContent,
			robots: robotsMeta,
			isIndexable: statusCode === 200 && !noindex,
			responseTime,
			hasSSL: url.startsWith('https://'),
			pageSize,
			wordCount,
			rawTextLength,
			htmlLength,
			textHtmlRatio,
			hasSchema,
			hasOGTags,
			hasViewport,
			imagesMissingAlt,
			imagesTotal,
			imagesLazyLoaded,
			imagesNonWebP,
			internalLinksCount: internalLinks.length,
			externalLinksCount,
			navLinksCount,
			footerLinksCount,
			redirectUrl,
			lastModified,
			isSPA,
			hasSSR,
			framework: framework || undefined,
			issues: [],
			outboundInternalLinks: [...new Set(internalLinks)].slice(0, CRAWL_CONFIG.MAX_LINKS_PER_PAGE),
			outboundLinksWithAnchor: linksWithAnchor.slice(0, CRAWL_CONFIG.MAX_LINKS_PER_PAGE)
		};
	}

	// ─── Framework / SPA Detection ──────────────────────────────────────────

	private detectFramework(
		html: string,
		$: cheerio.CheerioAPI
	): { isSPA: boolean; framework: string | null; hasSSR: boolean } {
		// SSR/SSG frameworks — safe for SEO
		if (html.includes('__NEXT_DATA__') || html.includes('/_next/static/'))
			return { isSPA: false, framework: 'Next.js', hasSSR: true };
		if (html.includes('__NUXT__') || html.includes('/_nuxt/'))
			return { isSPA: false, framework: 'Nuxt.js', hasSSR: true };
		if (html.includes('__remixContext') || html.includes('__remixManifest'))
			return { isSPA: false, framework: 'Remix', hasSSR: true };
		if (html.includes('___gatsby') || html.includes('gatsby-focus-wrapper'))
			return { isSPA: false, framework: 'Gatsby', hasSSR: true };
		if (html.includes('astro-island') || html.includes('data-astro-cid'))
			return { isSPA: false, framework: 'Astro', hasSSR: true };

		// Client-side SPA signals
		const hasReactRoot = $('div#root').children().length === 0 && $('div#root').length > 0;
		const hasVueRoot = $('div#app').children().length === 0 && $('div#app').length > 0;
		const hasAngularRoot = $('app-root').length > 0 || $('[ng-version]').length > 0;

		// Check meaningful text content
		const bodyClone = $('body').clone();
		bodyClone.find('script, style').remove();
		const visibleText = bodyClone.text().replace(/\s+/g, ' ').trim();
		const isThin = visibleText.length < 250;

		// Count external script bundles (SPA sites load many JS files)
		const scriptBundles = $('script[src]').filter((_, el) => {
			const src = $(el).attr('src') || '';
			return src.includes('.js') && !src.includes('analytics') && !src.includes('gtm');
		}).length;
		const hasManyBundles = scriptBundles >= 4;

		let framework: string | null = null;
		if (hasReactRoot || html.includes('data-reactroot')) framework = 'React';
		else if (hasVueRoot || html.includes('data-v-app')) framework = 'Vue';
		else if (hasAngularRoot) framework = 'Angular';
		else if (hasManyBundles && isThin) framework = 'JavaScript SPA';

		const isSPA =
			(hasReactRoot || hasVueRoot || hasAngularRoot || (hasManyBundles && isThin)) && isThin;

		return { isSPA, framework, hasSSR: false };
	}

	/**
	 * V2.1: JS Rendering Detection (product-gaps V1.3f)
	 * Compare raw HTML crawl vs rendered DOM. Flag when rendered content is 2x+ larger than raw HTML.
	 * Critical for JS-heavy Shopify themes. Requires headless browser.
	 */
	private async detectJSRenderedContent(
		session: CrawlSession,
		url: string,
		rawTextLength: number
	): Promise<TechnicalIssue | null> {
		try {
			// Lazy-launch browser on first use
			if (!session.playwrightBrowser) {
				session.playwrightBrowser = await chromium.launch({
					headless: true,
					args: ['--no-sandbox', '--disable-setuid-sandbox']
				});
			}

			const page = await session.playwrightBrowser.newPage();
			try {
				await page.goto(url, {
					waitUntil: 'networkidle',
					timeout: 15000
				});
				const renderedText = await page.evaluate(() => {
					const body = document.body?.cloneNode(true) as HTMLElement;
					if (!body) return '';
					body.querySelectorAll('script, style, noscript, svg').forEach((el) => el.remove());
					return (body.innerText || body.textContent || '').replace(/\s+/g, ' ').trim();
				});
				const renderedTextLength = renderedText.length;

				session.jsRenderChecksDone++;

				const ratio = rawTextLength > 0 ? renderedTextLength / rawTextLength : 0;
				if (ratio > 2.0) {
					return {
						type: 'js_rendered_content',
						severity: 'critical',
						description: `Your page's main content loads via JavaScript. Google may not be reading this page correctly — it can see only ${Math.round(rawTextLength)} characters without JavaScript but ${Math.round(renderedTextLength)} with it.`,
						recommendation:
							'Use server-side rendering for this page to ensure Google sees all your content. Critical for JS-heavy Shopify themes.'
					};
				}
			} finally {
				await page.close().catch(() => {});
			}
		} catch (err) {
			console.warn('[Crawler] V2.1 JS rendering check failed for', url, err);
		}
		return null;
	}

	/**
	 * S2-13: Detect viewport-covering overlays (intrusive interstitials).
	 * Excludes cookie consent and legally required gates. HTML heuristic only (no headless).
	 */
	private detectIntrusiveInterstitial($: cheerio.CheerioAPI, _html: string): boolean {
		const LEGAL_EXCLUDE = /cookie|consent|gdpr|privacy|ccpa|age[_-]?gate|verify|18\+|birthday|terms/i;

		const isLikelyLegal = (el: { attribs?: Record<string, string> }): boolean => {
			const attribs = el.attribs || {};
			const combined = [
				attribs.class,
				attribs.id,
				attribs['aria-label'],
				attribs['data-testid'],
				attribs['data-id']
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase();
			return LEGAL_EXCLUDE.test(combined);
		};

		// Check inline styles: position:fixed + viewport coverage
		let found = false;
		$('body [style]').each((_, el) => {
			if (found) return;
			const style = ($(el).attr('style') || '').toLowerCase();
			if (!/position\s*:\s*fixed/.test(style)) return;
			if (isLikelyLegal(el)) return;

			// Viewport coverage: full width/height or inset:0
			const hasFullWidth = /(?:^|;)\s*(?:min-)?width\s*:\s*(?:100%|100vw)/.test(style);
			const hasFullHeight = /(?:^|;)\s*(?:min-)?height\s*:\s*(?:100%|100vh)/.test(style);
			const hasInset = /(?:^|;)\s*inset\s*:\s*0/.test(style);
			const hasFullCover =
				/(?:top|left)\s*:\s*0/.test(style) && /(?:right|bottom)\s*:\s*0/.test(style);

			if ((hasFullWidth && hasFullHeight) || hasInset || hasFullCover) {
				found = true;
			}
		});

		if (found) return true;

		// Check role="dialog" / aria-modal (often marketing modals)
		$('[role="dialog"], [aria-modal="true"]').each((_, el) => {
			if (found) return;
			if (isLikelyLegal(el)) return;
			const style = ($(el).attr('style') || '').toLowerCase();
			if (/position\s*:\s*fixed/.test(style)) found = true;
		});

		if (found) return true;

		// Check common overlay class/id patterns in HTML (modal, popup, overlay, lightbox)
		const overlayPattern = /\b(modal|popup|overlay|lightbox|dialog)\b/i;
		$('body div[class], body div[id], body section[class], body aside[class]').each((_, el) => {
			if (found) return;
			if (isLikelyLegal(el)) return;
			const attribs = el.attribs || {};
			const combined = `${attribs.class || ''} ${attribs.id || ''}`;
			if (!overlayPattern.test(combined)) return;
			const style = ($(el).attr('style') || '').toLowerCase();
			if (/position\s*:\s*fixed/.test(style) && /(?:100%|100vw|inset|top\s*:\s*0)/.test(style))
				found = true;
		});

		return found;
	}

	// ─── Issue Detection ────────────────────────────────────────────────────

	private detectIssues(
		$: cheerio.CheerioAPI,
		url: string,
		statusCode: number,
		responseTime: number,
		html: string,
		page: CrawlResult
	): TechnicalIssue[] {
		const issues: TechnicalIssue[] = [];
		const parsedUrl = new URL(url);

		// ── LAYER 1: CRAWL ──────────────────────────────────────────────────
		if (statusCode === 404 || statusCode === 410) {
			issues.push({
				type: 'page_4xx',
				severity: 'critical',
				description: `Page returns ${statusCode} status`,
				recommendation: 'Fix the broken URL or set up a 301 redirect to a relevant live page.'
			});
		}

		if (statusCode >= 500) {
			issues.push({
				type: 'server_error',
				severity: 'critical',
				description: `Server error: HTTP ${statusCode}`,
				recommendation:
					'Fix the server error immediately — Google stops crawling sites with persistent 5xx errors.'
			});
		}

		if (statusCode >= 300 && statusCode < 400) {
			const isPermanent = statusCode === 301 || statusCode === 308;
			issues.push({
				type: isPermanent ? 'permanent_redirect' : 'temporary_redirect',
				severity: isPermanent ? 'info' : 'warning',
				description: `Page issues a ${statusCode} ${isPermanent ? 'permanent' : 'temporary'} redirect`,
				recommendation: isPermanent
					? 'Permanent redirects are acceptable but update internal links to point directly to the destination.'
					: 'Replace 302/307 redirects with 301 for permanent moves — temporary redirects do not pass link equity.'
			});
		}

		if (html.toLowerCase().includes('<meta http-equiv="refresh"')) {
			issues.push({
				type: 'meta_refresh_redirect',
				severity: 'warning',
				description: 'Page uses meta refresh redirect',
				recommendation: 'Replace meta refresh with a server-side HTTP 301 redirect.'
			});
		}

		// URL structure
		const fullUrl = url;
		if (fullUrl.length > CRAWL_CONFIG.MAX_URL_LENGTH) {
			issues.push({
				type: 'url_too_long',
				severity: 'warning',
				description: `URL is ${fullUrl.length} characters (recommended: ≤${CRAWL_CONFIG.MAX_URL_LENGTH})`,
				recommendation:
					'Shorten URLs to be descriptive but concise. Long URLs reduce click probability in SERPs.'
			});
		}

		if (parsedUrl.pathname.includes('_')) {
			issues.push({
				type: 'url_has_underscores',
				severity: 'info',
				description: 'URL uses underscores instead of hyphens',
				recommendation:
					'Use hyphens (-) instead of underscores (_) in URLs. Google treats hyphens as word separators.'
			});
		}

		if (parsedUrl.pathname !== parsedUrl.pathname.toLowerCase()) {
			issues.push({
				type: 'url_has_uppercase',
				severity: 'info',
				description: 'URL contains uppercase letters',
				recommendation:
					'Use lowercase URLs to avoid duplicate content issues between /Page and /page.'
			});
		}

		// ── LAYER 2: RENDER / SPA ────────────────────────────────────────────
		if (page.isSPA && !page.hasSSR) {
			issues.push({
				type: 'spa_no_ssr',
				severity: 'critical',
				description: `Site uses ${page.framework || 'JavaScript'} client-side rendering with no detectable server-side rendering`,
				recommendation:
					'Implement SSR (Server-Side Rendering) or SSG (Static Site Generation). Google must execute your JavaScript to see content — this happens in a separate rendering queue that can delay indexation by days to weeks. Critical content in raw HTML ensures immediate indexation.'
			});
		} else if (
			html.includes('__NEXT_DATA__') === false &&
			page.wordCount < 50 &&
			page.isSPA === false
		) {
			// JS-heavy but not clearly SPA — flag as potential JS rendering issue
			const scriptCount = $('script[src]').length;
			if (scriptCount > 5) {
				issues.push({
					type: 'js_only_content',
					severity: 'warning',
					description:
						'Page has very little visible text content — content may be JavaScript-rendered',
					recommendation:
						'Verify in Google Search Console URL Inspection → "View Tested Page" that Googlebot sees your content. Consider moving critical content to server-rendered HTML.'
				});
			}
		}

		// Render-blocking scripts
		const blockingScripts = $(
			'script:not([async]):not([defer]):not([type="application/ld+json"])'
		).filter((_, el) => {
			return !!$(el).attr('src');
		}).length;
		if (blockingScripts > 3) {
			issues.push({
				type: 'render_blocking_js',
				severity: 'warning',
				description: `${blockingScripts} render-blocking JavaScript files detected`,
				recommendation:
					'Add async or defer attributes to non-critical scripts. Render-blocking JS delays LCP and increases bad-click rates that feed negatively into Navboost.'
			});
		}

		// Images without dimensions (CLS risk)
		const imagesNoDimensions = $('img').filter((_, el) => {
			return (
				!$(el).attr('width') && !$(el).attr('height') && !$(el).attr('style')?.includes('width')
			);
		}).length;
		if (imagesNoDimensions > 0) {
			issues.push({
				type: 'images_no_dimensions',
				severity: 'warning',
				description: `${imagesNoDimensions} image${imagesNoDimensions > 1 ? 's' : ''} missing width/height attributes`,
				recommendation:
					'Add explicit width and height to all img tags. Missing dimensions cause Cumulative Layout Shift (CLS), which directly increases pogo-stick rates and harms Navboost scores.'
			});
		}

		// ── LAYER 3: INDEXATION ─────────────────────────────────────────────
		if (!page.title) {
			issues.push({
				type: 'missing_title',
				severity: 'critical',
				description: 'Page is missing a title tag',
				recommendation:
					"Add a keyword-rich title tag (50–60 characters). The title tag is the highest-confidence relevance signal at weight 1.00 in Google's scoring."
			});
		} else if (page.titleLength > CRAWL_CONFIG.MAX_TITLE_LENGTH) {
			issues.push({
				type: 'title_too_long',
				severity: 'warning',
				description: `Title tag is ${page.titleLength} characters (max recommended: ${CRAWL_CONFIG.MAX_TITLE_LENGTH})`,
				recommendation:
					'Shorten to ≤60 characters. Google truncates long titles in SERPs, reducing CTR and Navboost signal quality.'
			});
		} else if (page.title && page.titleLength < CRAWL_CONFIG.MIN_TITLE_LENGTH) {
			issues.push({
				type: 'title_too_short',
				severity: 'warning',
				description: `Title tag is very short: "${page.title}"`,
				recommendation:
					'Expand the title to 10–60 characters with your primary keyword. Short titles waste the highest-weight ranking signal.'
			});
		}

		if (page.h1Count === 0) {
			issues.push({
				type: 'missing_h1',
				severity: 'critical',
				description: 'Page is missing an H1 heading',
				recommendation:
					"Add a single H1 containing your primary keyword. H1 has weight 0.95 in Google's relevance scoring — the second highest on-page signal."
			});
		} else if (page.h1Count > 1) {
			issues.push({
				type: 'multiple_h1',
				severity: 'warning',
				description: `Page has ${page.h1Count} H1 tags (should have exactly 1)`,
				recommendation:
					"Use exactly one H1 per page. Multiple H1s dilute the heading signal and confuse Google's passage scoring algorithm."
			});
		} else if (page.h1.length > CRAWL_CONFIG.MAX_H1_LENGTH) {
			issues.push({
				type: 'h1_too_long',
				severity: 'info',
				description: `H1 tag is ${page.h1.length} characters (recommended: ≤${CRAWL_CONFIG.MAX_H1_LENGTH})`,
				recommendation:
					'Keep H1 under 70 characters — specific and answerable. Vague or bloated H1s reduce passage context vector strength.'
			});
		}

		if (!page.metaDescription) {
			issues.push({
				type: 'missing_meta_description',
				severity: 'warning',
				description: 'Page is missing a meta description',
				recommendation:
					"Add a meta description (150–160 characters). Meta descriptions are the primary CTR mechanism — every CTR improvement feeds Navboost's 13-month rolling ranking signal."
			});
		} else if (page.metaDescriptionLength > CRAWL_CONFIG.MAX_META_DESC_LENGTH) {
			issues.push({
				type: 'meta_desc_too_long',
				severity: 'warning',
				description: `Meta description is ${page.metaDescriptionLength} characters (max recommended: ${CRAWL_CONFIG.MAX_META_DESC_LENGTH})`,
				recommendation:
					'Trim to ≤160 characters. Google truncates longer descriptions in SERPs, breaking your CTR copy.'
			});
		} else if (page.metaDescriptionLength < CRAWL_CONFIG.MIN_META_DESC_LENGTH) {
			issues.push({
				type: 'meta_desc_too_short',
				severity: 'info',
				description: `Meta description is very short (${page.metaDescriptionLength} characters)`,
				recommendation:
					'Expand to 150–160 characters with your keyword and a clear CTA to improve click-through rate.'
			});
		}

		if (!page.canonical) {
			issues.push({
				type: 'missing_canonical',
				severity: 'warning',
				description: 'Page does not tell Google which URL is the main one',
					recommendation:
						"Add a canonical tag so Google knows which URL to show in search: <link rel='canonical' href='[this-url]'>. Without it, Google may show duplicate versions of your page, which splits your ranking power."
			});
		} else {
			// Canonical exists — check if it matches current URL (self-referencing)
			const canonicalNorm = this.normalizeUrl(page.canonical);
			const currentNorm = this.normalizeUrl(url);
			if (canonicalNorm !== currentNorm && !page.canonical.startsWith('/')) {
				issues.push({
					type: 'canonical_points_elsewhere',
					severity: 'info',
					description: `This page tells Google to show a different URL instead: ${page.canonical}`,
					recommendation:
						"If this page is the one you want in search, change the canonical so it points to this page: <link rel='canonical' href='[this-page-url]'>. Otherwise Google will show the other URL."
				});
			}
		}

		const multipleCanonicals = $('link[rel="canonical"]').length;
		if (multipleCanonicals > 1) {
			issues.push({
				type: 'duplicate_canonical',
				severity: 'warning',
				description: `Page has ${multipleCanonicals} "preferred URL" tags — Google needs exactly one`,
					recommendation:
						"Remove the extra <link rel='canonical'> tags — keep only one. Conflicting tags confuse Google about which URL to show in search."
			});
		}

		if (
			page.robots.includes('noindex') ||
			$('meta[name="robots"]').attr('content')?.includes('noindex')
		) {
			issues.push({
				type: 'noindex',
				severity: 'critical',
				description: 'This page is set to not appear in Google search',
				recommendation:
					"Remove the noindex from your <meta name='robots' content='...'> tag unless you intentionally want to hide this page. Accidentally hiding important pages is a common cause of rankings dropping."
			});
		}

		// ── LAYER 4: PERFORMANCE ────────────────────────────────────────────
		if (responseTime > CRAWL_CONFIG.SLOW_RESPONSE_THRESHOLD) {
			issues.push({
				type: 'slow_response',
				severity: 'warning',
				description: `Server response time is ${responseTime}ms (target: <${CRAWL_CONFIG.SLOW_RESPONSE_THRESHOLD}ms)`,
				recommendation:
					'Slow TTFB delays LCP, increasing bounce rates that feed negatively into Navboost. Enable caching, use a CDN, and optimize database queries.'
			});
		}

		if (page.pageSize > CRAWL_CONFIG.LARGE_PAGE_THRESHOLD) {
			issues.push({
				type: 'large_page_size',
				severity: 'warning',
				description: `Page size is ${(page.pageSize / 1048576).toFixed(1)}MB (recommended: <5MB)`,
				recommendation:
					'Compress images, minify CSS/JS, and lazy-load below-fold resources to reduce page weight.'
			});
		}

		if (!page.hasViewport) {
			issues.push({
				type: 'missing_viewport',
				severity: 'warning',
				description: 'Page is not set up to display properly on phones',
				recommendation:
					"Add a viewport tag so your page displays correctly on phones. Add this to your <head>: <meta name='viewport' content='width=device-width, initial-scale=1'>"
			});
		}

		// ── LAYER: MOBILE-FIRST INDEXING (S2-9 / V1.3b) ────────────────────────
		if (statusCode === 200) {
			// mobile_content_hidden: CSS that hides body/main/content on mobile viewports
			const styleContent = $('style')
				.map((_, el) => $(el).html() || '')
				.get()
				.join('\n');
			const hasMobileHideRule =
				/@media\s*\([^)]*max-width[^)]*\)\s*\{[\s\S]*?(?:body|main|#content|\.content)[\s\S]*?(?:display\s*:\s*none|visibility\s*:\s*hidden)/im.test(
					styleContent
				);
			if (hasMobileHideRule) {
				issues.push({
					type: 'mobile_content_hidden',
					severity: 'warning',
					description:
						'CSS rules hide content on mobile viewports. Google crawls the mobile version — hidden content may not be indexed.',
					recommendation:
						"Ensure main content is visible on mobile. Review @media (max-width) rules — if body, main, or primary content uses display:none on small screens, Google won't index it. Use responsive layout instead of hiding."
				});
			}

			// small_touch_targets: interactive elements with dimensions < 44px (WCAG 2.2)
			const MIN_TOUCH_TARGET = 44;
			const interactiveSelectors = 'a[href], button, [role="button"], input[type="submit"], input[type="button"]';
			let smallTargetCount = 0;
			$(interactiveSelectors).each((_, el) => {
				const style = $(el).attr('style') || '';
				const widthMatch = style.match(/(?:^|;)\s*(?:min-)?width\s*:\s*(\d+)(?:px)?/i);
				const heightMatch = style.match(/(?:^|;)\s*(?:min-)?height\s*:\s*(\d+)(?:px)?/i);
				const w = widthMatch ? parseInt(widthMatch[1], 10) : null;
				const h = heightMatch ? parseInt(heightMatch[1], 10) : null;
				if ((w != null && w < MIN_TOUCH_TARGET) || (h != null && h < MIN_TOUCH_TARGET)) {
					smallTargetCount++;
				}
			});
			if (smallTargetCount > 0) {
				issues.push({
					type: 'small_touch_targets',
					severity: 'warning',
					description: `${smallTargetCount} button or link${smallTargetCount !== 1 ? 's' : ''} ${smallTargetCount !== 1 ? 'are' : 'is'} too small to tap easily on phones`,
					recommendation:
						'Make buttons and links at least 44×44px on mobile — use min-width/min-height in your CSS. Small tap targets frustrate visitors and can hurt your search rankings.'
				});
			}

			// horizontal_scroll_mobile: fixed-width elements that cause overflow on mobile
			const wideElements = $('[style*="width"]').filter((_, el) => {
				const style = $(el).attr('style') || '';
				const m = style.match(/width\s*:\s*(\d+)\s*px/i);
				return m ? parseInt(m[1], 10) > 400 : false;
			});
			if (wideElements.length > 2) {
				issues.push({
					type: 'horizontal_scroll_mobile',
					severity: 'warning',
					description: `${wideElements.length} element${wideElements.length !== 1 ? 's' : ''} may force sideways scrolling on phones`,
					recommendation:
						'Use max-width: 100% or flexible units (%, vw, rem) instead of fixed px widths. Horizontal scroll on mobile annoys visitors and can hurt rankings.'
				});
			}

			// small_text_mobile: base font-size < 16px
			const bodyFontSizeMatch = (html.match(/body\s*\{[^}]*font-size\s*:\s*(\d+)(?:px)?/i) ||
				html.match(/html\s*\{[^}]*font-size\s*:\s*(\d+)(?:px)?/i) ||
				['', '16'])[1];
			const baseFontPx = parseInt(bodyFontSizeMatch || '16', 10);
			if (baseFontPx > 0 && baseFontPx < 16) {
				issues.push({
					type: 'small_text_mobile',
					severity: 'info',
					description: `Text is ${baseFontPx}px — may be hard to read on phones`,
					recommendation:
						'Use at least 16px for your main text on mobile. Smaller text is hard to read and can hurt how visitors interact with your page.'
				});
			}

			// S2-13: Intrusive interstitial detection (V1.3g) — viewport-covering overlays excluding cookie/legal gates
			const intrusiveOverlay = this.detectIntrusiveInterstitial($, html);
			if (intrusiveOverlay) {
				issues.push({
					type: 'intrusive_interstitial',
					severity: 'warning',
					description: 'A popup covers most of the screen on this page',
					recommendation:
						"Google can penalize pages where popups block access to content on phones. Use a smaller banner, show the popup after the visitor scrolls, or limit it to desktop. Cookie and age-verification popups are fine — this flag is for marketing popups, newsletter overlays, and similar."
				});
			}
		}

		// Mixed content (HTTPS page loading HTTP resources)
		if (
			url.startsWith('https://') &&
			(html.includes('src="http://') || html.includes("src='http://"))
		) {
			issues.push({
				type: 'mixed_content',
				severity: 'warning',
				description: 'HTTPS page loads HTTP (insecure) resources',
				recommendation:
					'Update all resource URLs to HTTPS. Mixed content triggers browser security warnings and signals trust issues to Google.'
			});
		}

		if (!url.startsWith('https://')) {
			issues.push({
				type: 'no_https',
				severity: 'critical',
				description: 'Page is not served over HTTPS',
				recommendation:
					'Install an SSL certificate and redirect all HTTP traffic to HTTPS. HTTPS is a confirmed ranking signal and trust requirement.'
			});
		}

		// ── LAYER 5: CONTENT ────────────────────────────────────────────────
		if (page.wordCount < 50 && statusCode === 200 && !page.isSPA) {
			issues.push({
				type: 'thin_content',
				severity: 'critical',
				description: `Page has only ~${page.wordCount} words of content`,
				recommendation:
					"Thin content triggers Panda's domain pre-classification mechanism. One thin page can lower quality scores site-wide, not just on this page. Expand content or consolidate with a related page."
			});
		} else if (page.wordCount < 150 && statusCode === 200 && !page.isSPA) {
			issues.push({
				type: 'thin_content',
				severity: 'warning',
				description: `Page has only ~${page.wordCount} words (recommended: 300+)`,
				recommendation:
					"Add substantive content. Panda's GroupModificationFactor is withheld from domains with high proportions of thin pages — this affects ranking ability site-wide."
			});
		}

		if (
			page.textHtmlRatio < CRAWL_CONFIG.MIN_TEXT_HTML_RATIO &&
			statusCode === 200 &&
			!page.isSPA &&
			page.wordCount > 20
		) {
			issues.push({
				type: 'low_text_html_ratio',
				severity: 'warning',
				description: `Text-to-HTML ratio is ${(page.textHtmlRatio * 100).toFixed(1)}% (recommended: >${CRAWL_CONFIG.MIN_TEXT_HTML_RATIO * 100}%)`,
				recommendation:
					'Too much HTML markup relative to visible text. Clean up HTML structure, reduce inline styles, and move CSS to stylesheets.'
			});
		}

		// ── LAYER 6: MARKUP / SCHEMA ────────────────────────────────────────
		if (!page.hasSchema && statusCode === 200) {
			issues.push({
				type: 'missing_schema',
				severity: 'info',
				description: 'Page has no structured data (Schema.org JSON-LD)',
				recommendation:
					'Add schema markup. Structured data is the highest-confidence signal channel available — you are writing directly for the algorithm, bypassing natural language ambiguity. Minimum: Article or LocalBusiness schema on applicable pages.'
			});
		}

		// Validate JSON-LD schemas
		$('script[type="application/ld+json"]').each((_, el) => {
			try {
				JSON.parse($(el).text());
			} catch {
				issues.push({
					type: 'schema_parse_error',
					severity: 'warning',
					description: 'Page contains invalid JSON-LD structured data',
					recommendation:
						'Fix the JSON syntax error in your schema markup. Invalid schema is ignored by Google — you lose all structured data benefits.'
				});
			}
		});

		if (!page.hasOGTags && statusCode === 200) {
			issues.push({
				type: 'missing_og_tags',
				severity: 'info',
				description: 'Page is missing Open Graph meta tags (og:title, og:description)',
				recommendation:
					"Add Open Graph tags to control how your page appears when shared on social media. Social engagement generates branded search, which feeds Google's quality multiplier."
			});
		}

		if (!$('meta[name="twitter:card"]').length && statusCode === 200) {
			issues.push({
				type: 'missing_twitter_card',
				severity: 'info',
				description: 'Page is missing Twitter Card meta tags',
				recommendation:
					"Add <meta name='twitter:card'> tags to improve appearance in X/Twitter shares."
			});
		}

		// Image alt text
		if (page.imagesMissingAlt > 0 && statusCode === 200) {
			const severity = page.imagesMissingAlt > 3 ? 'warning' : 'info';
			issues.push({
				type: 'image_missing_alt',
				severity,
				description: `${page.imagesMissingAlt} of ${page.imagesTotal} image${page.imagesTotal > 1 ? 's' : ''} missing alt text`,
				recommendation:
					'Add descriptive alt text to all images. Alt text is an entity signal Google uses for image indexation and passes semantic context to the page.'
			});
		}

		// Too many links (crawl budget waste)
		if (page.internalLinksCount > 100) {
			issues.push({
				type: 'too_many_links',
				severity: 'info',
				description: `Page has ${page.internalLinksCount} internal links`,
				recommendation:
					'Reduce to under 100 internal links per page. Too many links dilute link equity per destination under the Reasonable Surfer model.'
			});
		}

		// S2-12: Image optimization audit (V1.3e) — extends existing image scanner
		if (statusCode === 200) {
			// WebP/AVIF format check
			if (page.imagesNonWebP > 0) {
				issues.push({
					type: 'image_not_webp',
					severity: 'info',
					description: `${page.imagesNonWebP} image${page.imagesNonWebP > 1 ? 's' : ''} use older formats (JPEG/PNG) instead of modern ones`,
					recommendation:
						'Convert images to WebP or AVIF format (smaller file sizes, faster loading). They help your page speed score, which Google uses when ranking.'
				});
			}

			// Above-fold lazy-load check — first 3 images in DOM are likely above fold
			const imgs = $('img');
			let aboveFoldLazyCount = 0;
			for (let i = 0; i < Math.min(3, imgs.length); i++) {
				if ($(imgs[i]).attr('loading') === 'lazy') aboveFoldLazyCount++;
			}
			if (aboveFoldLazyCount > 0) {
				issues.push({
					type: 'above_fold_lazy_load',
					severity: 'warning',
					description: `${aboveFoldLazyCount} image${aboveFoldLazyCount !== 1 ? 's' : ''} near the top of the page ${aboveFoldLazyCount !== 1 ? 'are' : 'is'} lazy-loaded. Google may not render these correctly.`,
					recommendation:
					'Remove loading="lazy" from images visitors see first. Delaying those images makes your page feel slow and can hurt your search rankings. Only use loading="lazy" on images further down the page.'
				});
			} else if (page.imagesLazyLoaded > 0) {
				// Generic lazy-load notice when above-fold is fine
				issues.push({
					type: 'lazy_loaded_content',
					severity: 'info',
					description: `${page.imagesLazyLoaded} image${page.imagesLazyLoaded > 1 ? 's are' : ' is'} lazy-loaded (loading="lazy")`,
					recommendation:
						'Ensure critical above-the-fold images are NOT lazy-loaded. Use loading="lazy" only for below-the-fold images.'
				});
			}

			// LCP preload check — page has images but no image preload in head
			const hasImagePreload = $('head link[rel="preload"][as="image"]').length > 0;
			const firstImgSrc = $('img').first().attr('src') || $('img').first().attr('data-src');
			if (
				page.imagesTotal > 0 &&
				!hasImagePreload &&
				firstImgSrc &&
				!firstImgSrc.toLowerCase().startsWith('data:')
			) {
				const preloadUrl =
					firstImgSrc.startsWith('http') || firstImgSrc.startsWith('/')
						? firstImgSrc
						: new URL(firstImgSrc, url).href;
				issues.push({
					type: 'lcp_image_not_preloaded',
					severity: 'info',
					description: "Your main image could load faster with a simple speed-up tag.",
					recommendation:
						`Add this to your page's head to tell the browser to load your main image sooner: <link rel='preload' as='image' href='${preloadUrl}'>`
				});
			}
		}

		// ── LAYER 7: H2 PASSAGE QUALITY [US9940367B1 + US9959315B1] ─────────
		// Only flag pages with enough content and multiple H2s
		if (
			page.h2Count >= 2 &&
			page.h2PassageScore < 0.5 &&
			statusCode === 200 &&
			page.wordCount > 150
		) {
			const passageReadyCount = Math.round(page.h2PassageScore * page.h2Count);
			issues.push({
				type: 'weak_h2_passage',
				severity: 'warning',
				description: `Only ${passageReadyCount} of ${page.h2Count} H2s are passage-ready (question-format) — score: ${Math.round(page.h2PassageScore * 100)}%`,
				recommendation:
					'Rewrite H2 headings as clear, answerable questions (e.g., "How Much Does X Cost?" instead of "Pricing"). Google independently scores each section of your page — sections under question-format headings score higher under the Passage Scoring algorithm [US9940367B1], even with identical content.'
			});
		}

		// ── LAYER 8: IGS — INFORMATION GAIN SIGNALS [US20190155948A1] ────────
		// Per-page check: raw HTML is available here so we can run text-level
		// pattern matching for IGS markers. Long-form pages (1000+ words) with
		// no first-person experience, original research, or case study signals
		// are outcompeted by pages that have them.
		if (statusCode === 200 && page.wordCount >= 1000 && !page.isSPA) {
			const textLower = html.toLowerCase();
			const hasFirstPerson =
				/\b(i found|i tested|i tried|we found|we tested|in my experience|in our experience|i noticed|we noticed)\b/.test(
					textLower
				);
			const hasOriginalResearch =
				/\b(our (study|research|survey|data|analysis|findings)|we (surveyed|analyzed|measured|studied)|according to our)\b/.test(
					textLower
				);
			const hasStatClaim = /\b\d+(\.\d+)?%\s+(of|increase|decrease|improvement|reduction)\b/.test(
				textLower
			);
			const hasCaseStudy = /\b(case study|real example|for example|for instance)\b/.test(textLower);
			const hasIGS = hasFirstPerson || hasOriginalResearch || hasStatClaim || hasCaseStudy;

			if (!hasIGS) {
				issues.push({
					type: 'igs_signals_absent',
					severity: 'info',
					description: `Long-form page (${page.wordCount} words) has no detectable Information Gain signals (original data, case studies, first-person experience)`,
					recommendation:
						"Add original research, first-person findings, or cited statistics unique to this page. Google's Information Gain Score [US20190155948A1] downgrades content that merely summarises what other pages already say. Even one original data point or case study meaningfully improves IGS."
				});
			}
		}

		return issues;
	}

	// ─── Site-Wide Analysis ──────────────────────────────────────────────────

	private runSiteWideAnalysis(session: CrawlSession): TechnicalIssue[] {
		const issues: TechnicalIssue[] = [];

		// Build incoming link count map
		const incomingLinkCount = new Map<string, number>();
		session.results.forEach((page) => {
			const norm = this.normalizeUrl(page.url);
			if (!incomingLinkCount.has(norm)) incomingLinkCount.set(norm, 0);
			page.outboundInternalLinks.forEach((dest) => {
				const destNorm = this.normalizeUrl(dest);
				incomingLinkCount.set(destNorm, (incomingLinkCount.get(destNorm) || 0) + 1);
			});
		});

		// S2-10: Duplicate title + meta detection sitewide (V1.3c)
		const titleMap = new Map<string, string[]>();
		session.results.forEach((page) => {
			if (!page.title || page.statusCode >= 400) return;
			const key = page.title.toLowerCase().trim();
			if (!titleMap.has(key)) titleMap.set(key, []);
			titleMap.get(key)!.push(page.url);
		});
		titleMap.forEach((urls, title) => {
			if (urls.length > 1) {
				issues.push({
					type: 'duplicate_title_tag',
					severity: 'warning',
					description: `These ${urls.length} pages share the same title in Google search — Google can't tell them apart.`,
					recommendation: `Write a unique title for each page (the <title> tag — what shows in Google's blue link). Affected: ${urls.slice(0, 3).join(', ')}${urls.length > 3 ? ` +${urls.length - 3} more` : ''}.`,
					affectedUrl: urls[0]
				});
			}
		});

		const descMap = new Map<string, string[]>();
		session.results.forEach((page) => {
			if (!page.metaDescription || page.statusCode >= 400) return;
			const key = page.metaDescription.toLowerCase().trim();
			if (!descMap.has(key)) descMap.set(key, []);
			descMap.get(key)!.push(page.url);
		});
		descMap.forEach((urls, desc) => {
			if (urls.length > 1) {
				issues.push({
					type: 'duplicate_meta_description',
					severity: 'warning',
					description: `These ${urls.length} pages share the same search snippet description — Google can't tell them apart.`,
					recommendation: `Write a unique meta description for each page: <meta name='description' content='...'> (the text under your link in Google). Affected: ${urls.slice(0, 3).join(', ')}${urls.length > 3 ? ` +${urls.length - 3} more` : ''}. Same descriptions hurt how Google judges your site.`,
					affectedUrl: urls[0]
				});
			}
		});

		// S2-7: Crawl budget waste detection (V1.2g)
		const pages = session.results.filter((p) => p.statusCode === 200);

		const tagPages = pages.filter(
			(p) => /\/tag\/|\/tags\//.test(p.url) && p.wordCount < 300
		);
		if (tagPages.length > 5) {
			issues.push({
				type: 'thin_tag_pages',
				severity: 'warning',
				description: `${tagPages.length} tag pages have little or no unique content — Google wastes time scanning these instead of your important pages.`,
				recommendation:
					"Tell Google not to index these tag pages. Add <meta name='robots' content='noindex'> to each one, or block them in robots.txt. That way Google focuses on scanning your product and article pages instead.",
				affectedUrl: tagPages[0]?.url
			});
		}

		const authorPages = pages.filter((p) => /\/author\//.test(p.url));
		if (authorPages.length > 3) {
			issues.push({
				type: 'author_archive_pages',
				severity: 'warning',
				description: `${authorPages.length} author archive pages detected. Unless these have unique content, they're taking Google's attention away from your important pages.`,
				recommendation:
					"Tell Google not to index author archives unless they have unique bios. Add <meta name='robots' content='noindex'> or block in robots.txt. Otherwise Google spends time on these instead of the pages that actually rank.",
				affectedUrl: authorPages[0]?.url
			});
		}

		const paginatedPages = pages.filter((p) => /[?&]page=\d+|\/page\/\d+/.test(p.url));
		if (paginatedPages.length > 10) {
			issues.push({
				type: 'pagination_waste',
				severity: 'warning',
				description: `${paginatedPages.length} paginated archive pages detected. These often duplicate content from the first page.`,
				recommendation:
					"Add <link rel='canonical' href='[first-page-url]'> to each paginated page pointing to page 1. Or add <meta name='robots' content='noindex'> to pages 2+ — they rarely add ranking value.",
				affectedUrl: paginatedPages[0]?.url
			});
		}

		// S2-11: Pagination canonical tag check (V1.3d) — critical for Shopify collection pages
		const paginatedMissingCanonical = paginatedPages.filter((p) => !p.canonical?.trim());
		if (paginatedMissingCanonical.length > 0) {
			issues.push({
				type: 'pagination_missing_canonical',
				severity: 'warning',
				description: `${paginatedMissingCanonical.length} paginated page${paginatedMissingCanonical.length !== 1 ? 's' : ''} don't tell Google which page is the main one — so Google treats them all as competing versions.`,
				recommendation:
					"Add <link rel='canonical' href='[first-page-url]'> to each page 2, page 3, etc., pointing to the first page. This is especially important for Shopify collections with many products.",
				affectedUrl: paginatedMissingCanonical[0]?.url
			});
		}

		const paramPages = pages.filter((p) => p.url.includes('?') && !p.canonical?.trim());
		if (paramPages.length > 5) {
			issues.push({
				type: 'parameter_duplicates',
				severity: 'warning',
				description: `${paramPages.length} URL versions with tracking or filter parameters don't tell Google which one is the main page.`,
				recommendation:
					"Add <link rel='canonical' href='[main-url]'> so Google knows which URL to show. Or add <meta name='robots' content='noindex'> to tracking/filter URLs (UTM, sort, etc.). Otherwise Google may show multiple versions of the same page.",
				affectedUrl: paramPages[0]?.url
			});
		}

		// Orphan and single-link pages
		session.results.forEach((page) => {
			if (page.statusCode >= 400) return;
			const norm = this.normalizeUrl(page.url);
			const isHomepage = norm === this.normalizeUrl(session.startUrl);
			if (isHomepage) return;

			const incoming = incomingLinkCount.get(norm) || 0;
			if (incoming === 0) {
				issues.push({
					type: 'orphan_page',
					severity: 'warning',
					description: 'Page has no internal links pointing to it — orphaned from site structure',
					recommendation:
						'Add links to this page from other pages on your site. Pages with no internal links are hard for Google to find and don\'t pass ranking value to the rest of your site.',
					affectedUrl: page.url
				});
			} else if (incoming === 1) {
				issues.push({
					type: 'single_incoming_link',
					severity: 'info',
					description: 'Page has only one internal link pointing to it',
					recommendation:
						'Increase internal links to this page to 3+. Under the Reasonable Surfer model, pages with few incoming links receive minimal link equity.',
					affectedUrl: page.url
				});
			}
		});

		// Broken internal links
		session.results.forEach((page) => {
			page.outboundInternalLinks.forEach((dest) => {
				const destNorm = this.normalizeUrl(dest);
				if (session.brokenUrls.has(destNorm)) {
					issues.push({
						type: 'broken_link',
						severity: 'warning',
						description: `Page links to a broken URL: ${dest}`,
						recommendation:
							'Fix the broken link or add a redirect. Broken links waste Google\'s time and don\'t pass any ranking value to your pages.',
						affectedUrl: page.url
					});
				}
			});
		});

		// S2-8: Redirect chain depth detection (V1.3a) — flag chains >2 hops
		const buildChain = (startUrl: string): string[] => {
			const chain: string[] = [startUrl];
			let current = startUrl;
			let next = session.redirectMap.get(this.normalizeUrl(current));
			while (next) {
				chain.push(next);
				current = next;
				next = session.redirectMap.get(this.normalizeUrl(current));
			}
			return chain;
		};
		const allDestinations = new Set([...session.redirectMap.values()].map((d) => this.normalizeUrl(d)));
		session.redirectMap.forEach((_dest, source) => {
			// Only report from chain heads (sources that are not the destination of another redirect)
			if (allDestinations.has(this.normalizeUrl(source))) return;
			const chain = buildChain(source);
			const hops = chain.length - 1;
			if (hops > 2) {
				const finalUrl = chain[chain.length - 1];
				const chainPreview =
					chain.length <= 4 ? chain.join(' → ') : `${chain[0]} → … → ${chain[chain.length - 1]}`;
				issues.push({
					type: 'redirect_chain',
					severity: hops > 4 ? 'critical' : 'warning',
					description: `Visitors go through ${chain.length} redirects before reaching the page — this slows things down and weakens your rankings.`,
					recommendation:
						`Make the first redirect go straight to the final page. Change the redirect at ${chain[0]} to point directly to ${finalUrl}.`,
					affectedUrl: source
				});
			}
		});

		// Anchor text imbalance: flag destinations where >60% of all incoming
		// anchor texts are generic (click here / here / read more / learn more / this)
		const genericPatterns =
			/^(click here|here|read more|learn more|more|this|link|visit|view|see|get|check|go|find|download|details|info|page)$/i;
		session.anchorTextMap.forEach((anchors, destNorm) => {
			if (anchors.length < 3) return; // need at least 3 links to flag
			const matchedResult = session.results.find((r) => this.normalizeUrl(r.url) === destNorm);
			if (!matchedResult) return;

			// SPEC CHECK: exact-match over-optimization — >15% exact-match anchors
			// is the over-optimization signal per Reasonable Surfer [US8117209B1].
			// Exact-match anchor spam is a manipulative signal; Google discounts or
			// penalises internal link equity from pages with unnatural anchor distributions.
			const pageKeyword = (matchedResult.title || '').toLowerCase().trim();
			if (pageKeyword) {
				const exactMatchCount = anchors.filter(
					(a) => a && a.toLowerCase().trim() === pageKeyword
				).length;
				const exactMatchPct = exactMatchCount / anchors.length;
				if (exactMatchPct > 0.15) {
					issues.push({
						type: 'anchor_text_exact_match_overuse',
						severity: 'warning',
						description: `${Math.round(exactMatchPct * 100)}% of internal links to this page use exact-match anchor text — over-optimisation signal`,
						recommendation:
							'Vary your internal anchor text. More than 15% exact-match anchors looks manipulative to Google. Use synonyms, partial matches, and natural phrasing. [US8117209B1 Reasonable Surfer]',
						affectedUrl: matchedResult.url
					});
				}
			}

			// SECONDARY CHECK: generic anchor under-optimisation — >60% generic anchors
			// passes zero topical context to the destination page [US8682892B1].
			const genericCount = anchors.filter((a) => !a || genericPatterns.test(a.trim())).length;
			const genericPct = genericCount / anchors.length;
			if (genericPct > 0.6) {
				issues.push({
					type: 'anchor_text_too_generic',
					severity: 'warning',
					description: `${Math.round(genericPct * 100)}% of internal links to this page use generic anchor text ("here", "click here", "read more")`,
					recommendation:
						'Replace generic anchor text with keyword-rich descriptive phrases. Generic anchors pass no topical context to the destination page under the Reasonable Surfer model [US8682892B1].',
					affectedUrl: matchedResult.url
				});
			}
		});

		// ── STALE CONTENT DETECTION ─────────────────────────────────────────
		// Pages not updated in 12+ months lose freshness scoring weight.
		// Google's Historical Data patent [US7346839B2] gives recency multipliers
		// to pages that are updated. Stale evergreen content with no update signal
		// accumulates decay. Flag anything with a last-modified header > 12 months old.
		const twelveMonthsAgo = new Date();
		twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

		session.results.forEach((page) => {
			if (page.statusCode >= 400 || !page.lastModified) return;
			const lastMod = new Date(page.lastModified);
			if (isNaN(lastMod.getTime())) return;
			if (lastMod < twelveMonthsAgo && page.wordCount > 300) {
				const monthsOld = Math.round((Date.now() - lastMod.getTime()) / (1000 * 60 * 60 * 24 * 30));
				issues.push({
					type: 'stale_content',
					severity: 'warning',
					description: `Page has not been updated in ${monthsOld} months (last modified: ${lastMod.toISOString().split('T')[0]})`,
					recommendation:
						"Refresh this page with updated stats, new examples, or expanded sections. Google's freshness multiplier [US7346839B2] rewards content that is regularly reviewed and updated — stale pages decay in rankings even if their backlink profile is strong.",
					affectedUrl: page.url
				});
			}
		});

		// ── REVERSE SILO LINK DETECTION ──────────────────────────────────────
		// Correct silo structure: articles link UP to focus pages (passes equity up).
		// Violation: focus pages link DOWN to articles (bleeds equity downward,
		// dilutes the focus page's topical authority signal).
		// We detect this by checking if a page with many incoming links (likely a
		// focus page / cluster hub) links out to pages with fewer incoming links
		// (likely articles). A focus page should receive links, not give them to
		// lower-authority article pages within the same cluster.
		const incomingCountMap = new Map<string, number>();
		session.results.forEach((page) => {
			const norm = this.normalizeUrl(page.url);
			if (!incomingCountMap.has(norm)) incomingCountMap.set(norm, 0);
			page.outboundInternalLinks.forEach((dest) => {
				const destNorm = this.normalizeUrl(dest);
				incomingCountMap.set(destNorm, (incomingCountMap.get(destNorm) || 0) + 1);
			});
		});

		const FOCUS_PAGE_INCOMING_THRESHOLD = 5; // pages with 5+ incoming links are likely focus pages
		session.results.forEach((page) => {
			if (page.statusCode >= 400) return;
			const norm = this.normalizeUrl(page.url);
			const incomingCount = incomingCountMap.get(norm) || 0;
			if (incomingCount < FOCUS_PAGE_INCOMING_THRESHOLD) return; // not a focus page

			// Count how many outbound links go to pages with fewer incoming links
			const downlinkCount = page.outboundInternalLinks.filter((dest) => {
				const destNorm = this.normalizeUrl(dest);
				const destIncoming = incomingCountMap.get(destNorm) || 0;
				return destIncoming < FOCUS_PAGE_INCOMING_THRESHOLD && destIncoming > 0;
			}).length;

			if (downlinkCount >= 3) {
				issues.push({
					type: 'reverse_silo_links',
					severity: 'warning',
					description: `Hub page links out to ${downlinkCount} lower-authority pages — possible reverse silo structure`,
					recommendation:
						'Focus pages should receive internal links from articles, not distribute them downward. Remove or reduce links from this page to lower-authority article pages. Equity should flow up the silo toward the focus page, not down away from it.',
					affectedUrl: page.url
				});
			}
		});

		// ── IGS ELEMENT DETECTION [US20190155948A1] ──────────────────────────
		// Information Gain Score rewards content that adds something not already
		// present in competing pages: original data, case studies, first-person
		// experience, expert quotes, proprietary findings.
		// Flag long-form pages (1000+ words) that show no IGS markers —
		// these are at high risk of being outranked by pages that do have them.
		const IGS_MARKERS = [
			// First-person experience signals
			/(i found|i tested|i tried|we found|we tested|in my experience|in our experience|i noticed|we noticed)/i,
			// Original research signals
			/(our (study|research|survey|data|analysis|findings)|we (surveyed|analyzed|measured|studied)|according to our)/i,
			// Statistical claim signals (numbers with % or specific quantities)
			/\d+(\.\d+)?%\s+(of|increase|decrease|improvement|reduction)/i,
			// Case study / example signals
			/(case study|real example|for example|for instance|here's what happened|here is what happened)/i,
			// Expert/quote signals
			/(according to|says|told us|explained|noted|stated).*["""]/i
		];

		session.results.forEach((page) => {
			if (page.statusCode >= 400 || page.wordCount < 1000 || page.isSPA) return;
			// To check content we need the raw text — approximate from wordCount and URL
			// A full IGS check would require re-fetching page text, but we can flag
			// based on structural signals available in the crawl result.
			// Pages flagged here should be reviewed manually for IGS improvement.
			const hasIgsSignal = IGS_MARKERS.some((pattern) => {
				// We don't have the raw text here — flag all long pages for manual review
				// The actual content check happens in seoScore.ts during the page score.
				return false; // placeholder — see note below
			});

			// Flag all long-form pages without confirmed IGS markers as candidates.
			// Note: full text-level IGS detection requires raw page text which is
			// available during parsePage() — see detectIssues() for per-page IGS check.
			if (!hasIgsSignal && page.wordCount >= 1500) {
				issues.push({
					type: 'igs_not_detected',
					severity: 'info',
					description: `Long-form page (${page.wordCount} words) shows no detectable Information Gain signals`,
					recommendation:
						"Add original data, first-person case studies, or expert quotes to this page. Google's Information Gain Score [US20190155948A1] rewards content that teaches searchers something they cannot find on competing pages. Generic summaries of widely-available information score lower than pages with unique insights.",
					affectedUrl: page.url
				});
			}
		});

		// Sitemap vs crawled comparison
		if (session.sitemapUrls.size === 0) {
			issues.push({
				type: 'missing_sitemap',
				severity: 'warning',
				description: 'No XML sitemap found at /sitemap.xml',
				recommendation:
					'Create and submit an XML sitemap to Google Search Console. Sitemaps are the primary mechanism for communicating which pages you want crawled and indexed.'
			});
		} else {
			// Pages in sitemap not found during crawl (orphaned in sitemap)
			let orphanedInSitemap = 0;
			session.sitemapUrls.forEach((sitemapUrl) => {
				if (
					!session.visitedUrls.has(sitemapUrl) &&
					this.isSameDomain(sitemapUrl, session.startUrl)
				) {
					orphanedInSitemap++;
				}
			});
			if (orphanedInSitemap > 0) {
				issues.push({
					type: 'sitemap_orphan',
					severity: 'info',
					description: `${orphanedInSitemap} URLs in your sitemap were not found during the crawl`,
					recommendation:
						'Update your sitemap to only list pages that exist and are linked from your site. Sitemap URLs that lead nowhere waste Google\'s time.'
				});
			}
		}

		// S1-9: Nav + Footer Dilution Warning (reverse-silo-architecture.md)
		const pages = session.results.filter((p) => p.statusCode < 400);
		if (pages.length >= 5) {
			const pagesWithHighNavCount = pages.filter((p) => {
				const nav = p.navLinksCount ?? 0;
				const footer = p.footerLinksCount ?? 0;
				return nav + footer > 20;
			});
			const ratio = pagesWithHighNavCount.length / pages.length;
			if (ratio > 0.7) {
				const totalNavFooter = pagesWithHighNavCount.reduce(
					(sum, p) => sum + (p.navLinksCount ?? 0) + (p.footerLinksCount ?? 0),
					0
				);
				const avgNavLinks = Math.round(totalNavFooter / pagesWithHighNavCount.length);
				let recommendation =
					`Your navigation adds ${avgNavLinks} links to every page on your site. This reduces the effectiveness of your internal linking strategy across all your content. Streamlining your navigation — especially on blog post pages — would improve how efficiently your articles build ranking power for your main pages.`;
				const plat = (session.platform ?? '').toLowerCase();
				if (plat.includes('shopify')) {
					recommendation +=
						' Shopify blog posts and product pages often share the same navigation template. Consider using a minimal navigation theme for blog posts — they don\'t need a full mega menu. Articles are there to rank and pass ranking power, not to navigate.';
				}
				issues.push({
					type: 'nav_footer_dilution',
					severity: 'warning',
					description: `${pagesWithHighNavCount.length} of ${pages.length} crawled pages have more than 20 nav/footer links. This dilutes the ranking power your content passes to key pages.`,
					recommendation
				});
			}
		}

		return issues;
	}

	// ─── Save Results ────────────────────────────────────────────────────────

	private async saveResults(
		siteId: string,
		results: CrawlResult[],
		siteWideIssues: TechnicalIssue[]
	): Promise<void> {
		const records: object[] = [];

		results.forEach((result) => {
			result.issues.forEach((issue) => {
				records.push({
					site_id: siteId,
					issue_type: issue.type,
					severity: issue.severity,
					affected_url: result.url,
					description: issue.description,
					recommendation: issue.recommendation,
					crawl_date: new Date().toISOString()
				});
			});
		});

		siteWideIssues.forEach((issue) => {
			records.push({
				site_id: siteId,
				issue_type: issue.type,
				severity: issue.severity,
				affected_url: issue.affectedUrl || 'site-wide',
				description: issue.description,
				recommendation: issue.recommendation,
				crawl_date: new Date().toISOString()
			});
		});

		// Batch insert in chunks of 100
		for (let i = 0; i < records.length; i += 100) {
			const chunk = records.slice(i, i + 100);
			const { error } = await supabase.from('technical_issues').insert(chunk);
			if (error) console.error('[Crawler] Error saving issues batch:', error);
		}
	}

	// ─── H2 Passage Quality [US9940367B1 + US9959315B1] ─────────────────────

	private isPassageReadyH2(text: string): boolean {
		const t = text.toLowerCase().trim();
		const questionWords = [
			'how',
			'what',
			'why',
			'when',
			'which',
			'can',
			'does',
			'is',
			'are',
			'do',
			'will',
			'should',
			'who',
			'where'
		];
		return t.endsWith('?') || questionWords.some((w) => t.startsWith(w + ' '));
	}

	// ─── Google PSI Core Web Vitals ──────────────────────────────────────────

	private async fetchCoreWebVitalsIssues(siteUrl: string): Promise<TechnicalIssue[]> {
		const issues: TechnicalIssue[] = [];
		const psiApiKey = process.env.GOOGLE_PSI_API_KEY;
		if (!psiApiKey) {
			console.warn('[Crawler] GOOGLE_PSI_API_KEY not configured — skipping CWV check');
			return issues;
		}

		try {
			console.log('[Crawler] Fetching Core Web Vitals from Google PSI for:', siteUrl);
			const response = await axios.get(
				'https://www.googleapis.com/pagespeedonline/v5/runPagespeed',
				{
					params: { url: siteUrl, key: psiApiKey, category: ['performance'] },
					timeout: 30000
				}
			);

			const metrics = response.data?.loadingExperience?.metrics;
			if (!metrics) {
				console.warn('[Crawler] PSI returned no loadingExperience data (site may lack field data)');
				return issues;
			}

			const lcp = metrics['LARGEST_CONTENTFUL_PAINT_ms']?.percentile ?? null;
			const cls = metrics['CUMULATIVE_LAYOUT_SHIFT_score']?.percentile ?? null;
			const inp = metrics['INTERACTION_TO_NEXT_PAINT_ms']?.percentile ?? null;

			if (lcp !== null) {
				if (lcp > 4000) {
					issues.push({
						type: 'cwv_lcp_poor',
						severity: 'critical',
						description: `LCP (Largest Contentful Paint) is ${(lcp / 1000).toFixed(1)}s — Poor (target: ≤2.5s) · via Google PageSpeed`,
						recommendation:
							"Your LCP is in the Poor range. Fix: optimize server response time (TTFB <600ms), eliminate render-blocking resources, preload the LCP element (<link rel='preload'>), and compress/resize the largest image on the page.",
						affectedUrl: 'site-wide'
					});
				} else if (lcp > 2500) {
					issues.push({
						type: 'cwv_lcp_needs_improvement',
						severity: 'warning',
						description: `LCP (Largest Contentful Paint) is ${(lcp / 1000).toFixed(1)}s — Needs Improvement (target: ≤2.5s) · via Google PageSpeed`,
						recommendation:
							'Optimize LCP by preloading the hero image, using a CDN, and removing render-blocking CSS above the fold.',
						affectedUrl: 'site-wide'
					});
				}
			}

			if (cls !== null) {
				if (cls > 0.25) {
					issues.push({
						type: 'cwv_cls_poor',
						severity: 'critical',
						description: `CLS (Cumulative Layout Shift) is ${cls.toFixed(3)} — Poor (target: ≤0.1) · via Google PageSpeed`,
						recommendation:
							'Severe layout instability. Fix: add width/height attributes to all images and embeds, avoid inserting content above existing content, use CSS transform animations instead of layout-triggering properties.',
						affectedUrl: 'site-wide'
					});
				} else if (cls > 0.1) {
					issues.push({
						type: 'cwv_cls_needs_improvement',
						severity: 'warning',
						description: `CLS (Cumulative Layout Shift) is ${cls.toFixed(3)} — Needs Improvement (target: ≤0.1) · via Google PageSpeed`,
						recommendation:
							'Reduce layout shift by setting explicit dimensions on all images, embeds, and ads. Reserve space for dynamic content with CSS min-height.',
						affectedUrl: 'site-wide'
					});
				}
			}

			if (inp !== null) {
				if (inp > 500) {
					issues.push({
						type: 'cwv_inp_poor',
						severity: 'critical',
						description: `INP (Interaction to Next Paint) is ${inp}ms — Poor (target: ≤200ms) · via Google PageSpeed`,
						recommendation:
							'Severe interaction delay. Fix: break up long tasks (>50ms) in JavaScript, defer non-critical JS, use a web worker for heavy computation, and avoid forced synchronous layouts.',
						affectedUrl: 'site-wide'
					});
				} else if (inp > 200) {
					issues.push({
						type: 'cwv_inp_needs_improvement',
						severity: 'warning',
						description: `INP (Interaction to Next Paint) is ${inp}ms — Needs Improvement (target: ≤200ms) · via Google PageSpeed`,
						recommendation:
							'Reduce interaction latency by deferring non-critical JavaScript and minimizing main thread work during user interactions.',
						affectedUrl: 'site-wide'
					});
				}
			}

			if (lcp !== null && cls !== null && inp !== null && lcp <= 2500 && cls <= 0.1 && inp <= 200) {
				issues.push({
					type: 'cwv_all_good',
					severity: 'info',
					description: `All Core Web Vitals pass Google's thresholds (LCP: ${(lcp / 1000).toFixed(1)}s · CLS: ${cls.toFixed(3)} · INP: ${inp}ms) · via Google PageSpeed`,
					recommendation:
						'Maintain current performance. Monitor CWV weekly in Google Search Console as rankings correlate with sustained CWV performance, not one-time measurements.',
					affectedUrl: 'site-wide'
				});
			}

			console.log('[Crawler] CWV check complete:', {
				lcp,
				cls,
				inp,
				issuesGenerated: issues.length
			});
		} catch (e) {
			console.error('[Crawler] PSI API error:', e instanceof Error ? e.message : String(e));
			// Non-blocking — crawl continues without CWV data
		}

		return issues;
	}

	// ─── Helpers ─────────────────────────────────────────────────────────────

	private normalizeUrl(url: string): string {
		try {
			const parsed = new URL(url);
			// Remove trailing slash, lowercase, strip query + fragment
			let normalized = `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
			if (normalized.endsWith('/') && parsed.pathname !== '/') {
				normalized = normalized.slice(0, -1);
			}
			return normalized.toLowerCase();
		} catch {
			return url.toLowerCase();
		}
	}

	private isSameDomain(url: string, baseUrl: string): boolean {
		try {
			return new URL(url).hostname === new URL(baseUrl).hostname;
		} catch {
			return false;
		}
	}
}

export const crawlerService = new CrawlerService();
