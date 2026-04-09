import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { CREDIT_COSTS } from '../utils/credits.js';
import { createNotificationForUser, maybeNotifyCreditsLow } from '../utils/notifications.js';
import { captureApiError } from '../utils/sentryCapture.js';

/** Shared shape for GET /latest and GET /snapshot/:auditResultId */
function formatAuditResponse(audit: Record<string, any>) {
	return {
		id: audit.id,
		siteId: audit.site_id,
		createdAt: audit.created_at,
		crawlabilityCheck: {
			isCrawlable: audit.crawlability_is_crawlable,
			siteReachable: audit.crawlability_site_reachable,
			dnsResolvable: audit.crawlability_dns_resolvable,
			sslValid: audit.crawlability_ssl_valid,
			statusCode: audit.crawlability_status_code,
			robotsTxtExists: audit.crawlability_robots_exists,
			botAllowed: audit.crawlability_bot_allowed,
			responseTime: audit.crawlability_response_time,
			issues: audit.crawlability_issues
		},
		crawlResults: {
			totalPagesCrawled: audit.crawl_total_pages,
			totalIssuesFound: audit.crawl_total_issues,
			criticalIssues: audit.crawl_critical_issues,
			warningIssues: audit.crawl_warning_issues,
			infoIssues: audit.crawl_info_issues,
			avgResponseTime: audit.crawl_avg_response_time,
			pagesWithSSL: audit.crawl_pages_with_ssl,
			indexablePages: audit.crawl_indexable_pages,
			issuesByType: audit.crawl_issues_by_type
		},
		domainAuthority: {
			estimated: audit.domain_authority_estimated,
			method: audit.domain_authority_method,
			confidence: audit.domain_authority_confidence,
			error: audit.domain_authority_error || undefined
		},
		coreWebVitals: {
			lcpEstimate: audit.cwv_lcp_estimate,
			clsEstimate: audit.cwv_cls_estimate,
			inpEstimate: audit.cwv_inp_estimate,
			status: audit.cwv_status,
			error: audit.cwv_error || undefined
		},
		indexationStatus: {
			pagesIndexed: audit.indexation_pages_indexed,
			totalPages: audit.indexation_total_pages,
			estimatedCrawlBudget: audit.indexation_crawl_budget,
			gscConnected: audit.indexation_gsc_connected,
			error: audit.indexation_error || undefined
		},
		overallScore: audit.overall_score,
		healthStatus: audit.health_status,
		recommendations: audit.recommendations || [],
		apiErrors: audit.api_errors || {}
	};
}

export const getLatestAudit = async (req: Request, res: Response) => {
	try {
		const siteId = req.params.siteId;
		if (!siteId) {
			return res.status(400).json({ error: 'siteId required' });
		}

		// Get latest audit result
		const { data: audit, error: auditError } = await supabase
			.from('audit_results')
			.select('*')
			.eq('site_id', siteId)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (auditError) {
			console.error('[AuditController] Error fetching audit:', auditError);
			captureApiError(auditError, req, { feature: 'audit-latest-query', siteId });
			return res.status(500).json({ error: 'Failed to fetch audit results' });
		}

		if (!audit) {
			// No audit yet — never show inProgress just because last_audit_at is null.
			// inProgress should only be true when a run was explicitly triggered and
			// hasn't completed yet. Without a result row we have no evidence of that.
			return res.json({
				audit: null,
				inProgress: false,
			});
		}

		return res.json({ audit: formatAuditResponse(audit), inProgress: false });
	} catch (error) {
		console.error('[AuditController] Error:', error);
		captureApiError(error, req, { feature: 'audit-latest', siteId: req.params.siteId });
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const getAuditHistory = async (req: Request, res: Response) => {
	try {
		const siteId = req.params.siteId;
		if (!siteId) {
			return res.status(400).json({ error: 'siteId required' });
		}

		const { data: audits, error } = await supabase
			.from('audit_results')
			.select('id, overall_score, health_status, created_at, crawl_total_pages, crawl_total_issues')
			.eq('site_id', siteId)
			.order('created_at', { ascending: false })
			.limit(25);

		if (error) {
			console.error('[AuditController] Error fetching history:', error);
			captureApiError(error, req, { feature: 'audit-history-query', siteId });
			return res.status(500).json({ error: 'Failed to fetch audit history' });
		}

		return res.json({ audits: audits || [] });
	} catch (error) {
		console.error('[AuditController] Error:', error);
		captureApiError(error, req, { feature: 'audit-history', siteId: req.params.siteId });
		return res.status(500).json({ error: 'Internal server error' });
	}
};

/** GET /api/audit/:siteId/snapshot/:auditResultId — one saved audit row (for past runs) */
export const getAuditSnapshot = async (req: Request, res: Response) => {
	try {
		const { siteId, auditResultId } = req.params;
		if (!siteId || !auditResultId) {
			return res.status(400).json({ error: 'siteId and auditResultId required' });
		}

		const { data: audit, error: auditError } = await supabase
			.from('audit_results')
			.select('*')
			.eq('id', auditResultId)
			.eq('site_id', siteId)
			.maybeSingle();

		if (auditError) {
			console.error('[AuditController] Error fetching audit snapshot:', auditError);
			captureApiError(auditError, req, { feature: 'audit-snapshot-query', siteId, auditResultId });
			return res.status(500).json({ error: 'Failed to fetch audit' });
		}

		if (!audit) {
			return res.status(404).json({ error: 'Audit not found' });
		}

		return res.json({ audit: formatAuditResponse(audit), inProgress: false });
	} catch (error) {
		console.error('[AuditController] Error:', error);
		captureApiError(error, req, { feature: 'audit-snapshot', siteId: req.params.siteId });
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const runAudit = async (req: Request, res: Response) => {
	try {
		const siteId = req.params.siteId;
		if (!siteId) {
			return res.status(400).json({ error: 'siteId required' });
		}

		// Get site details
		const { data: site, error: siteError } = await supabase
			.from('sites')
			.select('id, url, name, organization_id')
			.eq('id', siteId)
			.single();

		if (siteError || !site) {
			return res.status(404).json({ error: 'Site not found' });
		}

		// Check user has permission
		const userId = req.user?.id;
		const { data: orgUser } = await supabase
			.from('user_organizations')
			.select('id')
			.eq('organization_id', site.organization_id)
			.eq('user_id', userId)
			.maybeSingle();

		if (!orgUser) {
			return res.status(403).json({ error: 'Not authorized' });
		}

		// Charge credits (crawl + Moz) — same cost as manual crawl
		const cost = CREDIT_COSTS.SITE_CRAWL;
		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', site.organization_id)
			.single();

		const creditsRemaining = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (creditsRemaining < cost) {
			return res.status(402).json({
				error: 'Insufficient credits',
				required: cost,
				available: creditsRemaining,
				needs_topup: true,
			});
		}

		const newCredits = Math.max(0, creditsRemaining - cost);
		const { error: deductErr } = await supabase
			.from('organizations')
			.update({
				included_credits_remaining: newCredits,
				...(org?.included_credits != null && { included_credits: newCredits }),
			})
			.eq('id', site.organization_id);

		if (deductErr) {
			console.error('[AuditController] Failed to deduct credits:', deductErr);
			captureApiError(deductErr, req, { feature: 'audit-run-deduct-credits', siteId, orgId: site.organization_id });
			return res.status(500).json({ error: 'Failed to deduct credits' });
		}

		await maybeNotifyCreditsLow(site.organization_id, newCredits);

		// Start audit in background — refund on failure, notify on success
		const { technicalAuditService } = await import('../services/technicalAuditService.js');
		const siteLabel = site.name || site.url || siteId;
		technicalAuditService
			.runFullAudit(site.url, siteId, site.organization_id)
			.then(async () => {
				if (userId) {
					await createNotificationForUser(userId, site.organization_id, {
						title: 'Site audit complete',
						message: `Audit for ${siteLabel} is ready. View results for issues and recommendations.`,
						type: 'audit_complete',
						priority: 'medium',
						action_url: '/audits',
						metadata: { site_id: siteId }
					});
				}
			})
			.catch((e) => {
				console.error('[AuditController] Audit failed:', e);
				captureApiError(e, undefined, {
					feature: 'audit-background-run',
					siteId,
					organizationId: site.organization_id
				});
				// Refund credits on failure
				supabase
					.from('organizations')
					.update({
						included_credits_remaining: creditsRemaining,
						...(org?.included_credits != null && { included_credits: creditsRemaining }),
					})
					.eq('id', site.organization_id)
					.then(() => console.log('[AuditController] Refunded credits after audit failure'));
			});

		return res.json({ ok: true, message: 'Audit started in background', creditsUsed: cost });
	} catch (error) {
		console.error('[AuditController] Error:', error);
		captureApiError(error, req, { feature: 'audit-run', siteId: req.params.siteId });
		return res.status(500).json({ error: 'Internal server error' });
	}
};
