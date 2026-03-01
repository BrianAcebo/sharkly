/**
 * Advanced Crawler Service
 * Google-comparable web crawler based on Complete SEO System documentation
 * Implements Stage One: Discovery & Crawling + Layers 1-5 of Technical SEO Audit
 */

import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { supabase } from '../utils/supabaseClient';
import { URL } from 'url';

// Types for crawler results
export interface CrawlResult {
	url: string;
	statusCode: number;
	title: string;
	h1: string;
	metaDescription: string;
	canonical: string;
	robots: string;
	isIndexable: boolean;
	responseTime: number;
	hasSSL: boolean;
	redirectUrl?: string;
	lastModified?: string;
	issues: TechnicalIssue[];
	coreWebVitals?: CoreWebVitalsEstimate;
	schema?: any[];
}

export interface TechnicalIssue {
	type:
		| 'missing_title'
		| 'missing_h1'
		| 'missing_meta_description'
		| 'missing_canonical'
		| 'noindex'
		| 'broken_link'
		| 'redirect_chain'
		| 'slow_response'
		| 'ssl_mismatch'
		| 'thin_content'
		| 'duplicate_content'
		| 'missing_schema'
		| 'lazy_loaded_content'
		| 'large_page_size'
		| 'too_many_links'
		| 'js_only_content'
		| 'soft_404';
	severity: 'critical' | 'warning' | 'info';
	description: string;
	recommendation: string;
	affectedUrl?: string;
}

export interface CoreWebVitalsEstimate {
	lcp: number; // in milliseconds
	cls: number; // cumulative layout shift
	inp: number; // interaction to next paint
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
}

const CRAWL_CONFIG = {
	MAX_PAGES_PER_SITE: 500,
	TIMEOUT_MS: 30000,
	USER_AGENT: 'Mozilla/5.0 (compatible; SharklyBot/1.0; +https://sharkly.co)',
	MAX_REDIRECTS: 2,
	SLOW_RESPONSE_THRESHOLD: 3000, // ms
	LARGE_PAGE_THRESHOLD: 5242880, // 5MB
	MAX_LINKS_PER_PAGE: 1000,
	MIN_CONTENT_LENGTH: 300 // characters
};

export class CrawlerService {
	/**
	 * Crawl a website and detect technical issues
	 * Implements Pattern: Stage One (Discovery & Crawling) + Audit Layers
	 */
	async crawlSite(siteId: string, siteUrl: string, userId: string, organizationId: string, maxPages: number = 100): Promise<CrawlResult[]> {
		const session: CrawlSession = {
			siteId,
			startUrl: siteUrl,
			maxPages: Math.min(maxPages, CRAWL_CONFIG.MAX_PAGES_PER_SITE),
			visitedUrls: new Set(),
			results: [],
			errors: [],
			startTime: Date.now()
		};

		// Create crawl history record
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
			// Start crawl from homepage
			await this.crawlPage(session, siteUrl, 0);

			// Save results to database
			await this.saveResults(siteId, session.results);

			// Calculate metrics
			const allIssues = session.results.flatMap((r) => r.issues);
			const criticalCount = allIssues.filter((i) => i.severity === 'critical').length;
			const warningCount = allIssues.filter((i) => i.severity === 'warning').length;
			const infoCount = allIssues.filter((i) => i.severity === 'info').length;
			const avgResponseTime = Math.round(
				session.results.reduce((a, b) => a + b.responseTime, 0) / session.results.length
			);
			const slowestPage = session.results.reduce((max, p) => (p.responseTime > max.responseTime ? p : max));
			const largestPage = session.results.reduce((max, p) => (p.issues.length > max.issues.length ? p : max));

			// Update crawl history with results
			if (crawlHistoryId) {
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
						slowest_page_url: slowestPage.url,
						largest_page_url: largestPage.url,
						updated_at: new Date().toISOString()
					})
					.eq('id', crawlHistoryId);
			}
		} catch (error) {
			// Mark crawl as failed
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
		}

		return session.results;
	}

	/**
	 * Recursively crawl pages
	 */
	private async crawlPage(session: CrawlSession, pageUrl: string, depth: number): Promise<void> {
		// Depth limit: 5 clicks from homepage
		if (depth > 5) return;

		// Respect crawl budget
		if (session.visitedUrls.size >= session.maxPages) return;

		// Skip already visited
		const normalizedUrl = this.normalizeUrl(pageUrl);
		if (session.visitedUrls.has(normalizedUrl) || !this.isSameDomain(normalizedUrl, session.startUrl)) {
			return;
		}

		session.visitedUrls.add(normalizedUrl);

		try {
			const startTime = Date.now();
			const response = await axios.get(pageUrl, {
				timeout: CRAWL_CONFIG.TIMEOUT_MS,
				maxRedirects: CRAWL_CONFIG.MAX_REDIRECTS,
				headers: { 'User-Agent': CRAWL_CONFIG.USER_AGENT },
				validateStatus: () => true // Accept all status codes
			});

			const responseTime = Date.now() - startTime;
			const html = response.data;
			const $ = cheerio.load(html);

			// Parse page elements
			const result = this.parsePage($, pageUrl, response.status, responseTime, response.headers);

			// Detect technical issues (Audit Layers 1-5)
			result.issues = this.detectTechnicalIssues($, pageUrl, response.status, responseTime, html);

			session.results.push(result);

			// Extract internal links for crawling (Crawl Budget Management)
			const internalLinks = this.extractInternalLinks($, session.startUrl);

			// Queue internal links for crawling (depth-first, breadth-managed)
			for (const link of internalLinks.slice(0, 5)) {
				// Max 5 links per page to prevent explosion
				if (session.visitedUrls.size < session.maxPages) {
					await this.crawlPage(session, link, depth + 1);
				}
			}
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			session.errors.push({ url: pageUrl, error: errorMsg });
		}
	}

	/**
	 * Parse page structure and extract signals
	 * Layer 1-3: Crawl, Render, Indexation audits
	 */
	private parsePage(
		$: any,
		url: string,
		statusCode: number,
		responseTime: number,
		headers: any
	): CrawlResult {
		const title = $('title').text() || '';
		const h1 = $('h1').first().text() || '';
		const metaDescription = $('meta[name="description"]').attr('content') || '';
		const canonical = $('link[rel="canonical"]').attr('href') || url;
		const robotsMeta = $('meta[name="robots"]').attr('content') || '';
		const lastModified = headers['last-modified'] || undefined;

		// Check if page is indexable (Layer 3: Indexation)
		const noindex = robotsMeta.includes('noindex') || $('meta[name="robots"]').attr('content')?.includes('noindex');
		const isIndexable = statusCode === 200 && !noindex;

		// Estimate Core Web Vitals based on response time and structure (Layer 4)
		const coreWebVitals = this.estimateCoreWebVitals($, responseTime);

		// Extract schema markup (Layer 5)
		const schema = this.extractSchema($);

		return {
			url,
			statusCode,
			title,
			h1,
			metaDescription,
			canonical,
			robots: robotsMeta,
			isIndexable,
			responseTime,
			hasSSL: url.startsWith('https://'),
			lastModified,
			issues: [],
			coreWebVitals,
			schema
		};
	}

	/**
	 * Detect technical issues across 5 audit layers
	 * Based on Complete SEO System Section 1.7
	 */
	private detectTechnicalIssues(
		$: any,
		url: string,
		statusCode: number,
		responseTime: number,
		html: string
	): TechnicalIssue[] {
		const issues: TechnicalIssue[] = [];

		// LAYER 1: CRAWL AUDIT
		if (statusCode === 404) {
			issues.push({
				type: 'soft_404',
				severity: 'critical',
				description: 'Page returns 404 status code',
				recommendation: 'Either fix the issue or redirect to a relevant page'
			});
		}

		if (statusCode >= 500) {
			issues.push({
				type: 'slow_response',
				severity: 'critical',
				description: `Server error: HTTP ${statusCode}`,
				recommendation: 'Fix server-side errors immediately'
			});
		}

		// Check for redirect chains
		if (html.includes('refresh')) {
			issues.push({
				type: 'redirect_chain',
				severity: 'warning',
				description: 'Page uses meta refresh redirect',
				recommendation: 'Use HTTP 301 redirects instead of meta refresh'
			});
		}

		// LAYER 2: RENDER AUDIT
		// Detect JS-only content
		const bodyText = $('body').text();
		const hasJSFramework = html.includes('__NEXT_DATA__') || html.includes('__nuxt') || html.includes('app-root');
		if (hasJSFramework && bodyText.trim().length < 200) {
			issues.push({
				type: 'js_only_content',
				severity: 'warning',
				description: 'Page appears to use client-side rendering with minimal server content',
				recommendation: 'Implement Server-Side Rendering (SSR) or Static Site Generation (SSG) for critical content'
			});
		}

		// Detect lazy-loaded critical content
		if (html.includes('lazy') && !html.includes('preload')) {
			issues.push({
				type: 'lazy_loaded_content',
				severity: 'warning',
				description: 'Page uses lazy loading but no preload directives detected',
				recommendation: 'Use <link rel="preload"> for critical above-the-fold content'
			});
		}

		// LAYER 3: INDEXATION AUDIT
		const title = $('title').text();
		if (!title || title.length === 0) {
			issues.push({
				type: 'missing_title',
				severity: 'critical',
				description: 'Page missing title tag',
				recommendation: 'Add a descriptive, keyword-rich title tag (50-60 characters)'
			});
		}

		const h1 = $('h1').first().text();
		if (!h1 || h1.length === 0) {
			issues.push({
				type: 'missing_h1',
				severity: 'critical',
				description: 'Page missing H1 heading',
				recommendation: 'Add a single, descriptive H1 tag that answers the user intent'
			});
		}

		const metaDescription = $('meta[name="description"]').attr('content');
		if (!metaDescription || metaDescription.length === 0) {
			issues.push({
				type: 'missing_meta_description',
				severity: 'warning',
				description: 'Page missing meta description',
				recommendation: 'Add a compelling meta description (150-160 characters) with keyword and CTA'
			});
		}

		const canonical = $('link[rel="canonical"]').attr('href');
		if (!canonical) {
			issues.push({
				type: 'missing_canonical',
				severity: 'warning',
				description: 'Page missing self-referencing canonical tag',
				recommendation: 'Add <link rel="canonical" href="[this-page-url]"> to prevent duplicate content issues'
			});
		}

		const noindex = $('meta[name="robots"]').attr('content')?.includes('noindex');
		if (noindex) {
			issues.push({
				type: 'noindex',
				severity: 'critical',
				description: 'Page has noindex meta tag',
				recommendation: 'Remove noindex unless this page should be excluded from search results'
			});
		}

		// Duplicate content detection
		const duplicates = $('link[rel="canonical"]').filter((i: number) => i > 0);
		if (duplicates.length > 0) {
			issues.push({
				type: 'duplicate_content',
				severity: 'warning',
				description: 'Multiple canonical tags detected',
				recommendation: 'Each page should have only one self-referencing canonical tag'
			});
		}

		// LAYER 4: PERFORMANCE AUDIT
		if (responseTime > CRAWL_CONFIG.SLOW_RESPONSE_THRESHOLD) {
			issues.push({
				type: 'slow_response',
				severity: 'warning',
				description: `Page response time is ${responseTime}ms (threshold: ${CRAWL_CONFIG.SLOW_RESPONSE_THRESHOLD}ms)`,
				recommendation: 'Optimize server response time: enable caching, optimize queries, use CDN'
			});
		}

		// Check page size
		const pageSize = Buffer.byteLength(html, 'utf8');
		if (pageSize > CRAWL_CONFIG.LARGE_PAGE_THRESHOLD) {
			issues.push({
				type: 'large_page_size',
				severity: 'warning',
				description: `Page size is ${(pageSize / 1048576).toFixed(2)}MB (recommended: <5MB)`,
				recommendation: 'Reduce page size: compress images, minify CSS/JS, lazy-load below-fold resources'
			});
		}

		// LAYER 5: CONTENT AUDIT
		const contentLength = bodyText.trim().length;
		if (contentLength < CRAWL_CONFIG.MIN_CONTENT_LENGTH) {
			issues.push({
				type: 'thin_content',
				severity: 'warning',
				description: `Page has only ${contentLength} characters of content (minimum: ${CRAWL_CONFIG.MIN_CONTENT_LENGTH})`,
				recommendation: 'Add more substantive, keyword-relevant content to improve topical authority'
			});
		}

		// Link audit
		const internalLinks = $('a[href^="/"], a[href^="http"]').length;
		if (internalLinks > CRAWL_CONFIG.MAX_LINKS_PER_PAGE) {
			issues.push({
				type: 'too_many_links',
				severity: 'info',
				description: `Page has ${internalLinks} links (recommended: <${CRAWL_CONFIG.MAX_LINKS_PER_PAGE})`,
				recommendation: 'Reduce internal link count to 50-100 for crawl budget efficiency'
			});
		}

		// Schema audit
		const schemaScripts = $('script[type="application/ld+json"]');
		if (schemaScripts.length === 0) {
			issues.push({
				type: 'missing_schema',
				severity: 'info',
				description: 'Page missing structured data markup',
				recommendation: 'Add Schema.org JSON-LD markup for rich snippets and Knowledge Graph integration'
			});
		}

		return issues;
	}

	/**
	 * Estimate Core Web Vitals based on page characteristics
	 * Actual CWV requires Chrome User Experience Report (CrUX) data
	 */
	private estimateCoreWebVitals($: any, responseTime: number): CoreWebVitalsEstimate {
		let lcp = responseTime;
		let cls = 0;
		let inp = 100;

		// LCP estimation: base on response time + image count
		const images = $('img').length;
		lcp += images * 100; // Each image ~100ms additional load

		// CLS estimation: detect layout-shift potential
		const widthVaryingElements = $('[style*="width"]').length;
		cls = Math.min(0.25, widthVaryingElements * 0.01); // Up to 0.25 for many dynamic elements

		// INP estimation: based on JS presence
		const hasEventListeners = $.html().includes('addEventListener') || $.html().includes('onclick');
		if (hasEventListeners) {
			inp = 150; // Good responsiveness
		}

		const status =
			lcp < 2500 && cls < 0.1 && inp < 200 ? 'good' : lcp < 4000 ? 'needs_improvement' : 'poor';

		return { lcp, cls, inp, status };
	}

	/**
	 * Extract structured data (Schema.org JSON-LD)
	 */
	private extractSchema($: any): any[] {
		const schemas: any[] = [];
		$('script[type="application/ld+json"]').each((i: number, elem: any) => {
			try {
				const schema = JSON.parse($(elem).text());
				schemas.push(schema);
			} catch (e) {
				// Invalid JSON, skip
			}
		});
		return schemas;
	}

	/**
	 * Extract internal links for crawl queue
	 */
	private extractInternalLinks($: any, baseUrl: string): string[] {
		const links: Set<string> = new Set();
		const baseDomain = new URL(baseUrl).hostname;

		$('a[href]').each((i: number, elem: any) => {
			try {
				const href = $(elem).attr('href');
				if (!href) return;

				const url = new URL(href, baseUrl);

				// Only crawl same domain, http(s), no fragments, no parameters
				if (url.hostname === baseDomain && !url.hash) {
					links.add(url.href.split('?')[0]); // Remove query params
				}
			} catch (e) {
				// Invalid URL, skip
			}
		});

		return Array.from(links);
	}

	/**
	 * Normalize URL for deduplication
	 */
	private normalizeUrl(url: string): string {
		try {
			const parsed = new URL(url);
			return parsed.href.toLowerCase().split('?')[0]; // Remove query params
		} catch (e) {
			return url;
		}
	}

	/**
	 * Check if URL is same domain
	 */
	private isSameDomain(url: string, baseUrl: string): boolean {
		try {
			const urlDomain = new URL(url).hostname;
			const baseDomain = new URL(baseUrl).hostname;
			return urlDomain === baseDomain;
		} catch (e) {
			return false;
		}
	}

	/**
	 * Save crawl results to database
	 */
	private async saveResults(siteId: string, results: CrawlResult[]): Promise<void> {
		for (const result of results) {
			// Save technical issues
			for (const issue of result.issues) {
				const { error } = await supabase.from('technical_issues').insert({
					site_id: siteId,
					issue_type: issue.type,
					severity: issue.severity,
					affected_url: result.url,
					description: issue.description,
					recommendation: issue.recommendation,
					crawl_date: new Date().toISOString()
				});

				if (error) console.error('Error saving issue:', error);
			}
		}
	}
}

export const crawlerService = new CrawlerService();
