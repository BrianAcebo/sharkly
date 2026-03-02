import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';

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
			return res.status(500).json({ error: 'Failed to fetch audit results' });
		}

		if (!audit) {
			// No audit yet - check if one is in progress
			const { data: site } = await supabase
				.from('sites')
				.select('last_audit_at, audit_score, audit_health_status')
				.eq('id', siteId)
				.single();

			return res.json({
				audit: null,
				inProgress: !site?.last_audit_at,
				site
			});
		}

		// Transform to match frontend expectations
		const formattedAudit = {
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

		return res.json({ audit: formattedAudit, inProgress: false });
	} catch (error) {
		console.error('[AuditController] Error:', error);
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
			.limit(10);

		if (error) {
			console.error('[AuditController] Error fetching history:', error);
			return res.status(500).json({ error: 'Failed to fetch audit history' });
		}

		return res.json({ audits: audits || [] });
	} catch (error) {
		console.error('[AuditController] Error:', error);
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
			.select('url, organization_id')
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

		// Start audit in background
		const { technicalAuditService } = await import('../services/technicalAuditService.js');
		technicalAuditService.runFullAudit(site.url, siteId, site.organization_id).catch((e) => {
			console.error('[AuditController] Audit failed:', e);
		});

		return res.json({ ok: true, message: 'Audit started in background' });
	} catch (error) {
		console.error('[AuditController] Error:', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};
