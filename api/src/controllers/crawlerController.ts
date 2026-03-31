/**
 * Crawler Controller
 * Handles site crawling, technical audits, and issue detection
 */

import { Request, Response } from 'express';
import { crawlerService } from '../services/crawlerService.js';
import { captureApiError } from '../utils/sentryCapture.js';
import { crawlabilityChecker } from '../services/crawlabilityChecker.js';
import { createNotificationForUser } from '../utils/notifications.js';
import { supabase } from '../utils/supabaseClient.js';
import { CREDIT_COSTS } from '../utils/credits.js';

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
		captureApiError(error, req, { feature: 'crawler-check-crawlability' });
		res.status(500).json({ error: 'Failed to check crawlability' });
	}
}

/**
 * POST /api/crawler/start
 * Start a site crawl (10 credits)
 */
export async function startCrawl(req: Request, res: Response): Promise<void> {
	let creditsDeducted = false;
	try {
		const { organizationId, siteId, siteUrl, userId, maxPages = 100 } = req.body;

		if (!organizationId || !siteId || !siteUrl || !userId) {
			res.status(400).json({ error: 'organizationId, siteId, siteUrl, and userId required' });
			return;
		}

		// Fetch site platform (S1-9: Shopify-specific nav dilution recommendation)
		let platform: string | undefined;
		try {
			const { data: site } = await supabase
				.from('sites')
				.select('platform')
				.eq('id', siteId)
				.single();
			platform = site?.platform ?? undefined;
		} catch {
			// non-fatal
		}

		// Check credits and charge upfront (consistent with createCluster/regenerateCluster)
		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', organizationId)
			.single();

		const creditsRemaining = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (creditsRemaining < CREDIT_COSTS.SITE_CRAWL) {
			res.status(402).json({
				error: 'Insufficient credits',
				required: CREDIT_COSTS.SITE_CRAWL,
				available: creditsRemaining,
				needs_topup: true
			});
			return;
		}

		// Deduct credits before crawl (refund on failure in catch)
		const newCredits = Math.max(0, creditsRemaining - CREDIT_COSTS.SITE_CRAWL);
		const { error: deductErr } = await supabase
			.from('organizations')
			.update({
				included_credits_remaining: newCredits,
				...(org?.included_credits != null && { included_credits: newCredits })
			})
			.eq('id', organizationId);
		if (deductErr) {
			console.error('[Crawler] Failed to deduct credits:', deductErr);
			captureApiError(deductErr, req, { feature: 'crawler-start-deduct', organizationId: req.body?.organizationId });
			res.status(500).json({ error: 'Failed to deduct credits' });
			return;
		}
		creditsDeducted = true;

		// Start crawl
		const results = await crawlerService.crawlSite(
			siteId,
			siteUrl,
			userId,
			organizationId,
			maxPages,
			platform
		);

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
				creditsUsed: CREDIT_COSTS.SITE_CRAWL
			}
		});
	} catch (error) {
		console.error('Error starting crawl:', error);
		// Refund credits when crawl fails after deduction
		if (creditsDeducted) {
			const { organizationId, userId } = req.body as { organizationId?: string; userId?: string };
			if (organizationId && userId) {
				try {
					const { error: refundErr } = await supabase.rpc('credit_back_action', {
						p_org_id: organizationId,
						p_action_key: 'site_crawl',
						p_credits: CREDIT_COSTS.SITE_CRAWL,
						p_reason: 'Site crawl failed mid-stream'
					});
					if (refundErr) {
						console.error('[Crawler] CRITICAL: Failed to refund credits:', refundErr.message);
					} else {
						console.log(`[Crawler] Refunded ${CREDIT_COSTS.SITE_CRAWL} credits to org ${organizationId}`);
						await createNotificationForUser(userId, organizationId, {
							title: 'Site crawl failed',
							message: `${CREDIT_COSTS.SITE_CRAWL} credits were automatically refunded. Site crawl failed.`,
							type: 'credit_refund',
							priority: 'high',
							action_url: '/technical',
							metadata: { credits_refunded: CREDIT_COSTS.SITE_CRAWL, reason: 'site_crawl_failed' },
							skipToast: true
						});
					}
				} catch (refundEx) {
					console.error('[Crawler] Refund threw:', refundEx instanceof Error ? refundEx.message : refundEx);
				}
			}
		}
		captureApiError(error, req, { feature: 'crawler-start', siteId: req.body?.siteId });
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

		// Get latest crawl history for metadata (incl. S2-4 igs_health)
		const { data: latestCrawl } = await supabase
			.from('crawl_history')
			.select('id, status, pages_scanned, total_issues, critical_issues, warning_issues, info_issues, avg_response_time_ms, end_time, duration_seconds, igs_health')
			.eq('site_id', siteId)
			.order('end_time', { ascending: false })
			.limit(1)
			.maybeSingle();

		// Get all issues from the most recent crawl
		const { data: issues, error } = await supabase
			.from('technical_issues')
			.select('*')
			.eq('site_id', siteId)
			.order('crawl_date', { ascending: false });

		if (error) throw error;

		const allIssues = issues || [];

		// Aggregate by severity
		const critical = allIssues.filter((i) => i.severity === 'critical');
		const warnings = allIssues.filter((i) => i.severity === 'warning');
		const info = allIssues.filter((i) => i.severity === 'info');

		// Health score: 100 - (5 per critical) - (1 per warning) - (0.1 per info), clamped 0-100
		const rawScore = 100 - critical.length * 5 - warnings.length * 1 - info.length * 0.1;
		const healthScore = Math.max(0, Math.min(100, Math.round(rawScore)));

		// Check if SPA was detected in this crawl
		const isSPA = allIssues.some((i) => i.issue_type === 'spa_no_ssr');
		const spaFramework = isSPA
			? allIssues.find((i) => i.issue_type === 'spa_no_ssr')?.description.match(/uses (.+?) client-side/)?.[1] || 'JavaScript'
			: null;

		// Extract CWV data from PSI issues for easy display
		const cwvTypes = ['cwv_lcp_poor', 'cwv_lcp_needs_improvement', 'cwv_cls_poor', 'cwv_cls_needs_improvement', 'cwv_inp_poor', 'cwv_inp_needs_improvement', 'cwv_all_good'];
		const cwvIssues = allIssues.filter((i) => cwvTypes.includes(i.issue_type));
		const hasCWVData = cwvIssues.length > 0;

		res.json({
			success: true,
			data: {
				total: allIssues.length,
				critical: critical.length,
				warnings: warnings.length,
				info: info.length,
				healthScore,
				isSPA,
				spaFramework,
				hasCWVData,
				cwvSummary: hasCWVData ? cwvIssues.map((i) => ({ type: i.issue_type, description: i.description })) : [],
				igsHealth: (latestCrawl as { igs_health?: { ratio: number; status: string; message: string; lowCount: number; substantialCount: number } } | null)?.igs_health ?? null,
				crawlMeta: latestCrawl || null,
				issues: allIssues,
				byType: aggregateByType(allIssues),
				bySeverity: {
					critical,
					warnings,
					info
				}
			}
		});
	} catch (error) {
		console.error('Error fetching crawl results:', error);
		captureApiError(error, req, { feature: 'crawler-results', siteId: req.params.siteId });
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
		captureApiError(error, req, { feature: 'crawler-issues', siteId: req.params.siteId });
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
		captureApiError(error, req, { feature: 'crawler-fix-bulk' });
		res.status(500).json({ error: 'Failed to update issues' });
	}
}

/**
 * GET /api/crawler/history/:siteId
 * Past crawl runs (aggregate stats per run) for comparing trends over time
 */
export async function getCrawlHistory(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;
		const userId = req.user?.id;
		if (!siteId) {
			res.status(400).json({ error: 'siteId required' });
			return;
		}
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const { data: site, error: siteErr } = await supabase
			.from('sites')
			.select('id, organization_id')
			.eq('id', siteId)
			.single();

		if (siteErr || !site) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		const { data: membership } = await supabase
			.from('user_organizations')
			.select('id')
			.eq('user_id', userId)
			.eq('organization_id', site.organization_id)
			.maybeSingle();

		if (!membership) {
			res.status(403).json({ error: 'Not authorized' });
			return;
		}

		const { data: rows, error } = await supabase
			.from('crawl_history')
			.select(
				'id, status, pages_scanned, total_issues, critical_issues, warning_issues, info_issues, avg_response_time_ms, end_time, duration_seconds, created_at'
			)
			.eq('site_id', siteId)
			.order('created_at', { ascending: false })
			.limit(25);

		if (error) {
			console.error('[Crawler] crawl_history query failed:', error);
			captureApiError(error, req, { feature: 'crawler-history-query', siteId });
			res.status(500).json({ error: 'Failed to fetch crawl history' });
			return;
		}

		res.json({ success: true, runs: rows || [] });
	} catch (error) {
		console.error('Error fetching crawl history:', error);
		captureApiError(error, req, { feature: 'crawler-history', siteId: req.params.siteId });
		res.status(500).json({ error: 'Failed to fetch crawl history' });
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
