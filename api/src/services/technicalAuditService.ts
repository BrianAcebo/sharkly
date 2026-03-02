/**
 * Technical Audit Service
 * Comprehensive technical SEO audit during site creation
 * Includes: crawlability check, full crawl, DA estimation, CWV, indexation
 */

import { crawlabilityChecker, CrawlabilityResult } from './crawlabilityChecker.js';
import { crawlerService, CrawlResult } from './crawlerService.js';
import { supabase } from '../utils/supabaseClient.js';
import axios from 'axios';

export interface TechnicalAuditResult {
	siteId: string;
	crawlabilityCheck: CrawlabilityResult;
	crawlResults: {
		totalPagesCrawled: number;
		totalIssuesFound: number;
		criticalIssues: number;
		warningIssues: number;
		infoIssues: number;
		avgResponseTime: number;
		pagesWithSSL: number;
		indexablePages: number;
		issuesByType: Record<string, number>;
	};
	domainAuthority: {
		estimated: number;
		method: string;
		confidence: 'low' | 'medium' | 'high';
	};
	coreWebVitals: {
		lcpEstimate: number;
		clsEstimate: number;
		inpEstimate: number;
		status: 'good' | 'needs_improvement' | 'poor';
	};
	indexationStatus: {
		pagesIndexed: number | null;
		totalPages: number;
		estimatedCrawlBudget: string;
		gscConnected: boolean;
	};
	overallScore: number; // 0-100
	healthStatus: 'critical' | 'warning' | 'good';
	recommendations: string[];
	scanStartedAt: string;
	scanCompletedAt: string;
}

export class TechnicalAuditService {
	/**
	 * Run complete technical audit for a site
	 */
	async runFullAudit(siteUrl: string, siteId: string, organizationId: string): Promise<TechnicalAuditResult> {
		const scanStartedAt = new Date().toISOString();
		console.log('[TechnicalAudit] Starting full audit for:', siteUrl);

		// 1. Check crawlability first
		console.log('[TechnicalAudit] Step 1: Checking crawlability...');
		const crawlabilityCheck = await crawlabilityChecker.checkCrawlability(siteUrl);

		if (!crawlabilityCheck.isCrawlable) {
			console.warn('[TechnicalAudit] Site not crawlable, returning early results');
			return {
				siteId,
				crawlabilityCheck,
				crawlResults: {
					totalPagesCrawled: 0,
					totalIssuesFound: crawlabilityCheck.issues.length,
					criticalIssues: crawlabilityCheck.issues.filter((i) => i.type === 'critical').length,
					warningIssues: crawlabilityCheck.issues.filter((i) => i.type === 'warning').length,
					infoIssues: 0,
					avgResponseTime: crawlabilityCheck.responseTime,
					pagesWithSSL: crawlabilityCheck.sslValid ? 0 : 0,
					indexablePages: 0,
					issuesByType: {}
				},
				domainAuthority: {
					estimated: 0,
					method: 'skipped',
					confidence: 'low'
				},
				coreWebVitals: {
					lcpEstimate: 0,
					clsEstimate: 0,
					inpEstimate: 0,
					status: 'poor'
				},
				indexationStatus: {
					pagesIndexed: null,
					totalPages: 0,
					estimatedCrawlBudget: 'unknown',
					gscConnected: false
				},
				overallScore: 0,
				healthStatus: 'critical',
				recommendations: crawlabilityCheck.issues.map((i) => i.solution),
				scanStartedAt,
				scanCompletedAt: new Date().toISOString()
			};
		}

		// 2. Run technical crawl
		console.log('[TechnicalAudit] Step 2: Running technical crawl...');
		let crawlResults: CrawlResult[] = [];
		try {
			crawlResults = await crawlerService.crawlSite(siteId, siteUrl, 'system', organizationId, 50); // Limit to 50 pages for onboarding
		} catch (e) {
			console.error('[TechnicalAudit] Crawl failed:', e);
			// Continue with other checks even if crawl fails
		}

		// 3. Get Domain Authority from Moz API
		console.log('[TechnicalAudit] Step 3: Fetching domain authority from Moz...');
		let daEstimate;
		try {
			daEstimate = await this.estimateDomainAuthority(siteUrl);
		} catch (e) {
			console.error('[TechnicalAudit] DA fetch failed:', e);
			daEstimate = {
				estimated: 0,
				method: 'not_configured',
				confidence: 'low' as const
			};
		}

		// 4. Get Real Core Web Vitals from Google PSI
		console.log('[TechnicalAudit] Step 4: Fetching Core Web Vitals from Google PSI...');
		let cwvEstimate;
		try {
			cwvEstimate = await this.fetchCoreWebVitals(siteUrl);
		} catch (e) {
			console.error('[TechnicalAudit] CWV fetch failed:', e);
			cwvEstimate = {
				lcpEstimate: 0,
				clsEstimate: 0,
				inpEstimate: 0,
				status: 'poor' as const
			};
		}

		// 5. Check indexation status
		console.log('[TechnicalAudit] Step 5: Checking indexation status...');
		const indexationStatus = await this.checkIndexationStatus(organizationId, siteUrl);

		// 6. Analyze results and generate recommendations
		const issueAnalysis = this.analyzeIssues(crawlResults);
		const recommendations = this.generateRecommendations(crawlResults, daEstimate.estimated, issueAnalysis);
		const overallScore = this.calculateAuditScore(crawlResults, daEstimate.estimated, cwvEstimate, issueAnalysis);
		const healthStatus = this.determineHealthStatus(overallScore, issueAnalysis.criticalCount);

		const result: TechnicalAuditResult = {
			siteId,
			crawlabilityCheck,
			crawlResults: {
				totalPagesCrawled: crawlResults.length,
				totalIssuesFound: issueAnalysis.totalCount,
				criticalIssues: issueAnalysis.criticalCount,
				warningIssues: issueAnalysis.warningCount,
				infoIssues: issueAnalysis.infoCount,
				avgResponseTime: crawlResults.length > 0 ? crawlResults.reduce((sum, r) => sum + r.responseTime, 0) / crawlResults.length : 0,
				pagesWithSSL: crawlResults.filter((r) => r.hasSSL).length,
				indexablePages: crawlResults.filter((r) => r.isIndexable).length,
				issuesByType: issueAnalysis.byType
			},
			domainAuthority: daEstimate,
			coreWebVitals: cwvEstimate,
			indexationStatus,
			overallScore,
			healthStatus,
			recommendations,
			scanStartedAt,
			scanCompletedAt: new Date().toISOString()
		};

		// 7. Store audit results in database
		await this.storeAuditResults(siteId, result, crawlResults);

		return result;
	}

	/**
	 * Get domain authority from Moz API
	 * Uses real data from Moz, required for accurate audits
	 */
	private async estimateDomainAuthority(
		siteUrl: string
	): Promise<{ estimated: number; method: string; confidence: 'low' | 'medium' | 'high' }> {
		const mozApiKey = process.env.MOZ_API_KEY;
		if (!mozApiKey) {
			console.warn('[TechnicalAudit] MOZ_API_KEY not configured, cannot get real DA');
			return {
				estimated: 0,
				method: 'not_configured',
				confidence: 'low'
			};
		}

		try {
			const daEstimate = await this.fetchFromMozApi(siteUrl, mozApiKey);
			if (daEstimate) {
				return daEstimate;
			}
		} catch (e) {
			console.error('[TechnicalAudit] Moz API error:', e);
			throw new Error(`Failed to fetch Domain Authority: ${e instanceof Error ? e.message : 'Unknown error'}`);
		}

		throw new Error('Failed to get Domain Authority from Moz');
	}

	/**
	 * Fetch DA from Moz API v2
	 * Uses real Domain Authority data from Moz
	 */
	private async fetchFromMozApi(
		siteUrl: string,
		apiKey: string
	): Promise<{ estimated: number; method: string; confidence: 'low' | 'medium' | 'high' }> {
		try {
			const domain = new URL(siteUrl).hostname.replace(/^www\./, '');
			
			console.log('[TechnicalAudit] Fetching DA from Moz for:', domain);
			
			// Moz API v2 endpoint
			const response = await axios.get('https://api.moz.com/v2/link/top-pages', {
				params: {
					target: domain,
					cols: 'DA,UID',
					limit: 1,
					access_token: apiKey
				},
				timeout: 10000,
				headers: {
					'Accept': 'application/json'
				}
			});

			// Extract DA from response
			let da = 0;
			if (response.data && Array.isArray(response.data) && response.data.length > 0) {
				da = response.data[0].da || 0;
			}

			console.log('[TechnicalAudit] Got DA from Moz:', da);

			return {
				estimated: Math.round(da),
				method: 'moz_api',
				confidence: 'high'
			};
		} catch (e) {
			console.error('[TechnicalAudit] Moz API error:', e instanceof Error ? e.message : String(e));
			throw e;
		}
	}


	/**
	 * Get real Core Web Vitals from Google PageSpeed Insights API
	 */
	private async fetchCoreWebVitals(siteUrl: string): Promise<{
		lcpEstimate: number;
		clsEstimate: number;
		inpEstimate: number;
		status: 'good' | 'needs_improvement' | 'poor';
	}> {
		const psiApiKey = process.env.GOOGLE_PSI_API_KEY;
		if (!psiApiKey) {
			console.warn('[TechnicalAudit] GOOGLE_PSI_API_KEY not configured');
			return {
				lcpEstimate: 0,
				clsEstimate: 0,
				inpEstimate: 0,
				status: 'poor'
			};
		}

		try {
			console.log('[TechnicalAudit] Fetching CWV from Google PSI for:', siteUrl);

			const response = await axios.get('https://www.googleapis.com/pagespeedonline/v5/runPagespeed', {
				params: {
					url: siteUrl,
					key: psiApiKey,
					category: ['performance']
				},
				timeout: 30000
			});

			const loadingExperience = response.data.loadingExperience?.metrics;
			
			if (!loadingExperience) {
				throw new Error('No loading experience data in PSI response');
			}

			// Extract CWV metrics
			const lcp = loadingExperience['LARGEST_CONTENTFUL_PAINT_ms']?.percentile || 2500;
			const cls = loadingExperience['CUMULATIVE_LAYOUT_SHIFT_score']?.percentile || 0.1;
			const inp = loadingExperience['INTERACTION_TO_NEXT_PAINT_ms']?.percentile || 200;

			console.log('[TechnicalAudit] Got CWV from PSI:', { lcp, cls, inp });

			// Determine status based on Google thresholds
			let status: 'good' | 'needs_improvement' | 'poor' = 'good';
			if (lcp > 4000 || cls > 0.25 || inp > 500) status = 'poor';
			else if (lcp > 2500 || cls > 0.1 || inp > 200) status = 'needs_improvement';

			return {
				lcpEstimate: Math.round(lcp),
				clsEstimate: Math.round(cls * 100) / 100,
				inpEstimate: Math.round(inp),
				status
			};
		} catch (e) {
			console.error('[TechnicalAudit] Google PSI error:', e instanceof Error ? e.message : String(e));
			throw new Error(`Failed to fetch Core Web Vitals: ${e instanceof Error ? e.message : 'Unknown error'}`);
		}
	}

	/**
	 * Check indexation status from GSC
	 */
	private async checkIndexationStatus(organizationId: string, siteUrl: string): Promise<{
		pagesIndexed: number | null;
		totalPages: number;
		estimatedCrawlBudget: string;
		gscConnected: boolean;
	}> {
		try {
			// Check if org has GSC connection
			const { data: gscData, error: gscError } = await supabase
				.from('gsc_tokens')
				.select('site_id, encrypted_refresh_token, gsc_property_url')
				.eq('organization_id', organizationId)
				.maybeSingle();

			if (gscError || !gscData) {
				console.log('[TechnicalAudit] No GSC connection found for org:', organizationId);
				return {
					pagesIndexed: null,
					totalPages: 0,
					estimatedCrawlBudget: 'unknown - connect GSC',
					gscConnected: false
				};
			}

			console.log('[TechnicalAudit] Found GSC connection, fetching indexed pages...');

			// Fetch GSC performance data to estimate indexed pages
			const { data: performanceData, error: perfError } = await supabase
				.from('performance_data')
				.select('page')
				.eq('site_id', gscData.site_id)
				.eq('gsc_property_url', gscData.gsc_property_url)
				// Get last 7 days
				.gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

			if (perfError) {
				console.warn('[TechnicalAudit] Failed to fetch GSC performance data:', perfError);
				return {
					pagesIndexed: null,
					totalPages: 0,
					estimatedCrawlBudget: 'unknown - GSC error',
					gscConnected: true
				};
			}

			// Count unique indexed pages from GSC data
			const uniquePages = new Set((performanceData || []).map((row: any) => row.page)).size;

			console.log('[TechnicalAudit] Got indexed pages from GSC:', uniquePages);

			// Estimate crawl budget based on indexed pages
			let crawlBudget = 'Unknown';
			if (uniquePages > 0) {
				if (uniquePages > 50000) crawlBudget = '>50,000 (Enterprise)';
				else if (uniquePages > 10000) crawlBudget = '10,000-50,000 (Large site)';
				else if (uniquePages > 1000) crawlBudget = '1,000-10,000 (Medium site)';
				else crawlBudget = '<1,000 (Small site)';
			}

			return {
				pagesIndexed: uniquePages > 0 ? uniquePages : null,
				totalPages: uniquePages,
				estimatedCrawlBudget: crawlBudget,
				gscConnected: true
			};
		} catch (e) {
			console.error('[TechnicalAudit] Indexation check error:', e);
			return {
				pagesIndexed: null,
				totalPages: 0,
				estimatedCrawlBudget: 'unknown - error',
				gscConnected: false
			};
		}
	}

	/**
	 * Analyze issues from crawl
	 */
	private analyzeIssues(crawlResults: CrawlResult[]): {
		totalCount: number;
		criticalCount: number;
		warningCount: number;
		infoCount: number;
		byType: Record<string, number>;
	} {
		const byType: Record<string, number> = {};
		let critical = 0,
			warning = 0,
			info = 0;

		for (const result of crawlResults) {
			for (const issue of result.issues) {
				byType[issue.type] = (byType[issue.type] || 0) + 1;

				if (issue.severity === 'critical') critical++;
				else if (issue.severity === 'warning') warning++;
				else info++;
			}
		}

		return {
			totalCount: critical + warning + info,
			criticalCount: critical,
			warningCount: warning,
			infoCount: info,
			byType
		};
	}

	/**
	 * Generate actionable recommendations
	 */
	private generateRecommendations(
		crawlResults: CrawlResult[],
		domainAuthority: number,
		issueAnalysis: { byType: Record<string, number>; criticalCount: number }
	): string[] {
		const recommendations: string[] = [];

		// Critical issues first
		if (issueAnalysis.criticalCount > 0) {
			recommendations.push('Fix critical technical issues immediately - they are blocking search engines');
		}

		// Missing metadata
		if ((issueAnalysis.byType['missing_title'] || 0) > crawlResults.length * 0.2) {
			recommendations.push('Add missing page titles - critical for ranking');
		}
		if ((issueAnalysis.byType['missing_meta_description'] || 0) > crawlResults.length * 0.2) {
			recommendations.push('Write meta descriptions for pages - improve CTR in search results');
		}

		// Thin content
		if ((issueAnalysis.byType['thin_content'] || 0) > crawlResults.length * 0.1) {
			recommendations.push('Expand thin content pages to 300+ words minimum');
		}

		// Performance
		if ((issueAnalysis.byType['slow_response'] || 0) > crawlResults.length * 0.1) {
			recommendations.push('Improve page load speed - use a CDN or optimize server response');
		}

		// Links
		if ((issueAnalysis.byType['broken_link'] || 0) > crawlResults.length * 0.05) {
			recommendations.push('Fix broken internal links - improves crawlability');
		}

		// DA-based recommendations
		if (domainAuthority < 15) {
			recommendations.push('Focus on building backlinks - your domain authority is low');
		}

		// Schema markup
		if ((issueAnalysis.byType['missing_schema'] || 0) > crawlResults.length * 0.5) {
			recommendations.push('Add structured data (schema.org markup) to improve rich snippets');
		}

		return recommendations;
	}

	/**
	 * Calculate overall audit score (0-100)
	 */
	private calculateAuditScore(
		crawlResults: CrawlResult[],
		domainAuthority: number,
		cwv: { lcpEstimate: number; clsEstimate: number; inpEstimate: number },
		issueAnalysis: { totalCount: number; criticalCount: number }
	): number {
		if (crawlResults.length === 0) return 0;

		let score = 100;

		// Deduct for issues
		score -= issueAnalysis.criticalCount * 5;
		score -= issueAnalysis.totalCount * 1;

		// Deduct for poor CWV
		if (cwv.lcpEstimate > 4000) score -= 10;
		else if (cwv.lcpEstimate > 2500) score -= 5;

		if (cwv.clsEstimate > 0.25) score -= 5;
		else if (cwv.clsEstimate > 0.1) score -= 2;

		// Deduct for low SSL coverage
		const sslCoverage = crawlResults.filter((r) => r.hasSSL).length / crawlResults.length;
		if (sslCoverage < 0.95) score -= 10;

		// Deduct for indexability issues
		const indexableCoverage = crawlResults.filter((r) => r.isIndexable).length / crawlResults.length;
		if (indexableCoverage < 0.8) score -= 15;

		return Math.max(0, Math.min(score, 100));
	}

	/**
	 * Determine overall health status
	 */
	private determineHealthStatus(score: number, criticalIssues: number): 'critical' | 'warning' | 'good' {
		if (criticalIssues > 5 || score < 30) return 'critical';
		if (criticalIssues > 0 || score < 60) return 'warning';
		return 'good';
	}

	/**
	 * Store audit results in database
	 */
	private async storeAuditResults(siteId: string, auditResult: TechnicalAuditResult, crawlResults: CrawlResult[]): Promise<void> {
		try {
			// Store site audit summary
			const { error: siteError } = await supabase
				.from('sites')
				.update({
					last_audit_at: new Date().toISOString(),
					audit_score: auditResult.overallScore,
					audit_health_status: auditResult.healthStatus,
					domain_authority_estimated: auditResult.domainAuthority.estimated,
					pages_crawled_count: auditResult.crawlResults.totalPagesCrawled,
					critical_issues_count: auditResult.crawlResults.criticalIssues
				})
				.eq('id', siteId);

			if (siteError) {
				console.error('[TechnicalAudit] Failed to update site:', siteError);
			}

			// Store detailed crawl results if needed (optional - can be heavy)
			// for now we're just storing summary in sites table
		} catch (e) {
			console.error('[TechnicalAudit] Failed to store audit results:', e);
		}
	}
}

export const technicalAuditService = new TechnicalAuditService();
