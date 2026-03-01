/**
 * Crawler Controller
 * Handles site crawling, technical audits, and issue detection
 */

import { Request, Response } from 'express';
import { crawlerService } from '../services/crawlerService';
import { crawlabilityChecker } from '../services/crawlabilityChecker';
import { supabase } from '../utils/supabaseClient';

/**
 * POST /api/crawler/check-crawlability
 * Pre-crawl validation to check if site is crawlable
 */
export async function checkCrawlability(req: Request, res: Response): Promise<void> {
	try {
		const { siteUrl } = req.body;

		if (!siteUrl) {
			res.status(400).json({ error: 'siteUrl required' });
			return;
		}

		const result = await crawlabilityChecker.checkCrawlability(siteUrl);

		res.json({
			success: true,
			data: result
		});
	} catch (error) {
		console.error('Error checking crawlability:', error);
		res.status(500).json({ error: 'Failed to check crawlability' });
	}
}

/**
 * POST /api/crawler/start
 * Start a site crawl (8 credits)
 */
export async function startCrawl(req: Request, res: Response): Promise<void> {
	try {
		const { organizationId, siteId, siteUrl, userId, maxPages = 100 } = req.body;

		if (!organizationId || !siteId || !siteUrl || !userId) {
			res.status(400).json({ error: 'organizationId, siteId, siteUrl, and userId required' });
			return;
		}

		// Check credits (8 credits for crawl)
		const CRAWL_CREDITS = 8;
		const { data: spendResult, error: spendError } = await supabase.rpc('spend_credits', {
			p_org_id: organizationId,
			p_credits: CRAWL_CREDITS,
			p_reference_type: 'site_crawl',
			p_reference_id: siteId,
			p_description: `Site crawl for ${siteUrl}`
		});

		if (spendError || !spendResult?.ok) {
			res.status(402).json({
				error: 'Insufficient credits',
				required: CRAWL_CREDITS,
				needs_topup: true
			});
			return;
		}

		// Start crawl
		const results = await crawlerService.crawlSite(siteId, siteUrl, userId, organizationId, maxPages);

		// Aggregate issues
		const allIssues = results.flatMap((r) => r.issues);
		const criticalCount = allIssues.filter((i) => i.severity === 'critical').length;
		const warningCount = allIssues.filter((i) => i.severity === 'warning').length;

		res.json({
			success: true,
			data: {
				pagesScanned: results.length,
				issuesFound: allIssues.length,
				critical: criticalCount,
				warnings: warningCount,
				avgResponseTime: Math.round(results.reduce((a, b) => a + b.responseTime, 0) / results.length),
				results,
				creditsUsed: CRAWL_CREDITS
			}
		});
	} catch (error) {
		console.error('Error starting crawl:', error);
		res.status(500).json({ error: 'Failed to start crawl' });
	}
}

/**
 * GET /api/crawler/results/:siteId
 * Get latest crawl results for a site
 */
export async function getCrawlResults(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;

		if (!siteId) {
			res.status(400).json({ error: 'siteId required' });
			return;
		}

		// Get all issues for this site
		const { data: issues, error } = await supabase
			.from('technical_issues')
			.select('*')
			.eq('site_id', siteId)
			.order('crawl_date', { ascending: false });

		if (error) throw error;

		// Aggregate by severity
		const critical = issues?.filter((i) => i.severity === 'critical') || [];
		const warnings = issues?.filter((i) => i.severity === 'warning') || [];
		const info = issues?.filter((i) => i.severity === 'info') || [];

		res.json({
			success: true,
			data: {
				total: issues?.length || 0,
				critical: critical.length,
				warnings: warnings.length,
				info: info.length,
				issues: issues || [],
				byType: aggregateByType(issues || []),
				bySeverity: {
					critical: critical,
					warnings: warnings,
					info: info
				}
			}
		});
	} catch (error) {
		console.error('Error fetching crawl results:', error);
		res.status(500).json({ error: 'Failed to fetch results' });
	}
}

/**
 * GET /api/crawler/issues/:siteId
 * Get specific issue details
 */
export async function getIssueDetails(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;
		const { issueType, severity } = req.query;

		if (!siteId) {
			res.status(400).json({ error: 'siteId required' });
			return;
		}

		let query = supabase
			.from('technical_issues')
			.select('*')
			.eq('site_id', siteId);

		if (issueType) {
			query = query.eq('issue_type', issueType as string);
		}

		if (severity) {
			query = query.eq('severity', severity as string);
		}

		const { data: issues, error } = await query.order('created_at', { ascending: false });

		if (error) throw error;

		res.json({
			success: true,
			data: {
				count: issues?.length || 0,
				issues
			}
		});
	} catch (error) {
		console.error('Error fetching issues:', error);
		res.status(500).json({ error: 'Failed to fetch issues' });
	}
}

/**
 * POST /api/crawler/fix-bulk
 * Mark multiple issues as resolved
 */
export async function markIssuesResolved(req: Request, res: Response): Promise<void> {
	try {
		const { issueIds } = req.body;

		if (!issueIds || !Array.isArray(issueIds)) {
			res.status(400).json({ error: 'issueIds array required' });
			return;
		}

		const { error } = await supabase
			.from('technical_issues')
			.update({ resolved: true, updated_at: new Date().toISOString() })
			.in('id', issueIds);

		if (error) throw error;

		res.json({
			success: true,
			data: {
				resolved: issueIds.length
			}
		});
	} catch (error) {
		console.error('Error marking issues resolved:', error);
		res.status(500).json({ error: 'Failed to update issues' });
	}
}

/**
 * Helper: Aggregate issues by type for dashboard display
 */
function aggregateByType(issues: any[]): Record<string, number> {
	const aggregate: Record<string, number> = {};
	issues.forEach((issue) => {
		aggregate[issue.issue_type] = (aggregate[issue.issue_type] || 0) + 1;
	});
	return aggregate;
}
