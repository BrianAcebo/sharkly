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
			crawlResults = await crawlerService.crawl(siteUrl, siteId, 50); // Limit to 50 pages for onboarding
		} catch (e) {
			console.error('[TechnicalAudit] Crawl failed:', e);
			// Continue with other checks even if crawl fails
		}

		// 3. Estimate Domain Authority
		console.log('[TechnicalAudit] Step 3: Estimating domain authority...');
		const daEstimate = await this.estimateDomainAuthority(siteUrl);

		// 4. Estimate Core Web Vitals
		console.log('[TechnicalAudit] Step 4: Estimating Core Web Vitals...');
		const cwvEstimate = this.estimateCoreWebVitals(crawlResults);

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
	 * Estimate domain authority (0-100)
	 * Currently uses simple heuristics; can integrate MozBar, Ahrefs, etc.
	 */
	private async estimateDomainAuthority(
		siteUrl: string
	): Promise<{ estimated: number; method: string; confidence: 'low' | 'medium' | 'high' }> {
		try {
			// Try to fetch from Moz API if available
			const mozApiKey = process.env.MOZ_API_KEY;
			if (mozApiKey) {
				const daEstimate = await this.fetchFromMozApi(siteUrl, mozApiKey);
				if (daEstimate) {
					return daEstimate;
				}
			}
		} catch (e) {
			console.warn('[TechnicalAudit] Moz API failed, using heuristic');
		}

		// Fallback: estimate based on domain age, TLD, etc
		const heuristicDA = this.estimateDAHeuristic(siteUrl);
		return {
			estimated: heuristicDA,
			method: 'heuristic',
			confidence: 'low'
		};
	}

	/**
	 * Fetch DA from Moz API
	 */
	private async fetchFromMozApi(
		siteUrl: string,
		apiKey: string
	): Promise<{ estimated: number; method: string; confidence: 'low' | 'medium' | 'high' } | null> {
		try {
			const domain = new URL(siteUrl).hostname.replace(/^www\./, '');
			const response = await axios.get(`https://api.moz.com/v2/url`, {
				params: {
					url: domain,
					cols: 'DomainAuthority',
					access_token: apiKey
				},
				timeout: 5000
			});

			const da = Math.round(response.data.pda || 25);
			return {
				estimated: da,
				method: 'moz_api',
				confidence: 'high'
			};
		} catch (e) {
			return null;
		}
	}

	/**
	 * Simple DA estimation based on domain characteristics
	 */
	private estimateDAHeuristic(siteUrl: string): number {
		try {
			const url = new URL(siteUrl);
			const domain = url.hostname;

			let score = 20; // Base score

			// TLD bonus
			if (domain.endsWith('.edu') || domain.endsWith('.gov')) score += 15;
			else if (domain.endsWith('.com') || domain.endsWith('.org')) score += 5;

			// Subdomain penalty
			if (domain.startsWith('www.')) score -= 0; // No penalty
			else if (!domain.startsWith('www.')) score -= 2; // Slight penalty for subdomains

			// Domain length (shorter is better)
			const domainPart = domain.replace('www.', '').split('.')[0];
			if (domainPart.length < 5) score += 2;
			else if (domainPart.length > 15) score -= 2;

			return Math.max(5, Math.min(score, 50)); // Between 5-50
		} catch {
			return 25; // Default middle ground
		}
	}

	/**
	 * Estimate Core Web Vitals based on crawl data
	 */
	private estimateCoreWebVitals(crawlResults: CrawlResult[]): {
		lcpEstimate: number;
		clsEstimate: number;
		inpEstimate: number;
		status: 'good' | 'needs_improvement' | 'poor';
	} {
		if (crawlResults.length === 0) {
			return {
				lcpEstimate: 0,
				clsEstimate: 0,
				inpEstimate: 0,
				status: 'poor'
			};
		}

		// Average CWV estimates from crawl
		const avgLcp = crawlResults.reduce((sum, r) => sum + (r.coreWebVitals?.lcp || 2500), 0) / crawlResults.length;
		const avgCls = crawlResults.reduce((sum, r) => sum + (r.coreWebVitals?.cls || 0.1), 0) / crawlResults.length;
		const avgInp = crawlResults.reduce((sum, r) => sum + (r.coreWebVitals?.inp || 200), 0) / crawlResults.length;

		// Determine status
		let status: 'good' | 'needs_improvement' | 'poor' = 'good';
		if (avgLcp > 4000 || avgCls > 0.25 || avgInp > 500) status = 'poor';
		else if (avgLcp > 2500 || avgCls > 0.1 || avgInp > 200) status = 'needs_improvement';

		return {
			lcpEstimate: Math.round(avgLcp),
			clsEstimate: Math.round(avgCls * 100) / 100,
			inpEstimate: Math.round(avgInp),
			status
		};
	}

	/**
	 * Check indexation status (if GSC connected)
	 */
	private async checkIndexationStatus(organizationId: string, siteUrl: string): Promise<{
		pagesIndexed: number | null;
		totalPages: number;
		estimatedCrawlBudget: string;
		gscConnected: boolean;
	}> {
		try {
			// Check if org has GSC connection
			const { data: gscData } = await supabase
				.from('gsc_tokens')
				.select('property_name')
				.eq('organization_id', organizationId)
				.maybeSingle();

			if (!gscData) {
				return {
					pagesIndexed: null,
					totalPages: 0,
					estimatedCrawlBudget: 'unknown - connect GSC',
					gscConnected: false
				};
			}

			// Try to fetch indexed pages from GSC
			// This would require additional GSC API call implementation
			return {
				pagesIndexed: null,
				totalPages: 0,
				estimatedCrawlBudget: 'Pending GSC sync',
				gscConnected: true
			};
		} catch (e) {
			return {
				pagesIndexed: null,
				totalPages: 0,
				estimatedCrawlBudget: 'unknown',
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
			recommendations.push('Fix critical technical issues immediately - they're blocking search engines');
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
