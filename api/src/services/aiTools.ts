/**
 * AI Tools for OpenAI Function Calling
 * Sharkly SEO Assistant — read project data, explain findings, suggest next actions.
 * Growth: read + explain + suggest. Scale: + trigger audits.
 */

import { supabase } from '../utils/supabaseClient.js';

// Tool definitions for OpenAI function calling
export const AI_TOOLS = [
	{
		type: 'function' as const,
		function: {
			name: 'get_sites_summary',
			description:
				'List all sites (projects) for the organization. Use this first to understand what sites exist. Each site has a name, niche, URL, and domain authority.',
			parameters: {
				type: 'object',
				properties: {},
				required: []
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_site_details',
			description:
				'Get detailed info about a specific site: name, niche, URL, domain authority, competitor URLs, content settings. Use site_id from get_sites_summary.',
			parameters: {
				type: 'object',
				properties: {
					site_id: { type: 'string', description: 'UUID of the site' }
				},
				required: ['site_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_clusters_summary',
			description:
				'List content clusters for a site. Clusters are topic groups with a target keyword and destination page. Use site_id from get_sites_summary.',
			parameters: {
				type: 'object',
				properties: {
					site_id: { type: 'string', description: 'UUID of the site' }
				},
				required: ['site_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_cluster_details',
			description:
				'Get details about a cluster: target keyword, pages, funnel stages, cluster intelligence warnings. Use cluster_id from get_clusters_summary.',
			parameters: {
				type: 'object',
				properties: {
					cluster_id: { type: 'string', description: 'UUID of the cluster' }
				},
				required: ['cluster_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_page_summary',
			description:
				'Get a page summary: keyword, title, type, funnel stage, status, UPSA score. Use page_id from cluster or page list.',
			parameters: {
				type: 'object',
				properties: {
					page_id: { type: 'string', description: 'UUID of the page' }
				},
				required: ['page_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_audit_summary',
			description:
				'Get the latest technical audit summary for a site: health score, critical issues, recommendations. Use site_id.',
			parameters: {
				type: 'object',
				properties: {
					site_id: { type: 'string', description: 'UUID of the site' }
				},
				required: ['site_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_weekly_priority_stack',
			description:
				'Get the weekly priority stack for a site — top recommended actions ranked by impact. Use site_id.',
			parameters: {
				type: 'object',
				properties: {
					site_id: { type: 'string', description: 'UUID of the site' }
				},
				required: ['site_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'get_refresh_queue',
			description:
				'Get pages that need content refresh — stale pages with declining rankings. Use site_id.',
			parameters: {
				type: 'object',
				properties: {
					site_id: { type: 'string', description: 'UUID of the site' }
				},
				required: ['site_id']
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'suggest_next_actions',
			description:
				'Returns prioritized next actions using live data: org credits, latest technical audit, low SEO-score pages, and stale content (6+ months without update). Optional site_id scopes to one site; optional cluster_id narrows page lists to that cluster. Free — no credits.',
			parameters: {
				type: 'object',
				properties: {
					site_id: {
						type: 'string',
						description: 'Optional — focus on this site (recommended for concrete recommendations)'
					},
					cluster_id: {
						type: 'string',
						description: 'Optional — narrow page-level actions to this cluster (requires site_id or resolves site from cluster)'
					}
				},
				required: []
			}
		}
	},
	{
		type: 'function' as const,
		function: {
			name: 'trigger_technical_audit',
			description:
				'(Scale plan only) Trigger a full technical SEO audit for a site. Crawls the site, checks crawlability, Core Web Vitals, indexation. Costs credits. Use site_id.',
			parameters: {
				type: 'object',
				properties: {
					site_id: { type: 'string', description: 'UUID of the site to audit' }
				},
				required: ['site_id']
			}
		}
	}
];

// Tool execution functions
type ToolContext = {
	organizationId: string;
	userId: string;
	planCode?: string | null;
};

async function verifySiteAccess(
	siteId: string,
	orgId: string
): Promise<{ site: any; error?: string }> {
	const { data: site, error } = await supabase
		.from('sites')
		.select('id, name, url, niche, domain_authority, customer_description, organization_id')
		.eq('id', siteId)
		.eq('organization_id', orgId)
		.single();
	if (error || !site) return { site: null, error: 'Site not found or access denied' };
	return { site };
}

function hasScalePlan(planCode: string | null): boolean {
	if (!planCode) return false;
	const base = planCode.replace(/_test$/, '');
	return ['scale', 'pro'].includes(base);
}

type SuggestedAction = {
	priority: 'high' | 'medium' | 'low';
	title: string;
	description: string;
	action_url?: string;
	source: 'credits' | 'audit' | 'priority_stack' | 'refresh_queue' | 'cluster' | 'org_overview';
};

const PRIORITY_ORDER: Record<SuggestedAction['priority'], number> = {
	high: 0,
	medium: 1,
	low: 2
};

function dedupeActions(actions: SuggestedAction[]): SuggestedAction[] {
	const seen = new Set<string>();
	const out: SuggestedAction[] = [];
	for (const a of actions) {
		const key = `${a.source}|${a.action_url ?? ''}|${a.title.slice(0, 80)}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(a);
	}
	return out;
}

async function buildOrgNextActions(organizationId: string): Promise<{ success: boolean; result: any }> {
	const { data: sites } = await supabase
		.from('sites')
		.select(
			'id, name, url, audit_score, audit_health_status, critical_issues_count, last_audit_at, created_at'
		)
		.eq('organization_id', organizationId)
		.order('created_at', { ascending: false })
		.limit(20);

	const { data: org } = await supabase
		.from('organizations')
		.select('included_credits_remaining, included_credits_monthly')
		.eq('id', organizationId)
		.single();

	const actions: SuggestedAction[] = [];
	const remaining = Number(org?.included_credits_remaining ?? 0);
	const monthly = Number(org?.included_credits_monthly ?? 1);

	if (monthly > 0 && remaining / monthly < 0.2) {
		actions.push({
			priority: 'high',
			title: 'Credits running low',
			description: `${remaining} of ${monthly} monthly credits remaining — top up before running crawls or generation.`,
			action_url: '/billing',
			source: 'credits'
		});
	}

	const siteList = sites || [];

	for (const s of siteList) {
		if (!s.last_audit_at) {
			actions.push({
				priority: 'high',
				title: `Run a technical audit: ${s.name}`,
				description: 'This site has no completed audit on record — crawl health and issue counts are unknown.',
				action_url: `/audit/${s.id}`,
				source: 'org_overview'
			});
		}
	}

	const scored = siteList
		.filter((s) => s.last_audit_at && (s.audit_score ?? 100) < 65)
		.sort((a, b) => (a.audit_score ?? 100) - (b.audit_score ?? 100))
		.slice(0, 4);

	for (const s of scored) {
		const crit = s.critical_issues_count ?? 0;
		actions.push({
			priority: s.audit_health_status === 'critical' || crit > 5 ? 'high' : 'medium',
			title: `Technical health needs attention: ${s.name}`,
			description: `Audit score ${s.audit_score ?? '—'}/100${crit ? ` · ${crit} critical issues` : ''}.`,
			action_url: `/audit/${s.id}`,
			source: 'org_overview'
		});
	}

	const finalActions = dedupeActions(actions).sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]).slice(0, 25);

	const summaryParts: string[] = [];
	if (finalActions.length === 0) {
		summaryParts.push('No urgent items surfaced from site summaries — pick a site for detailed actions.');
	} else {
		summaryParts.push(`${finalActions.length} prioritized action(s) from credits + per-site audit snapshots.`);
	}

	return {
		success: true,
		result: {
			scope: 'organization',
			sites_preview: siteList.slice(0, 8).map((s) => ({
				id: s.id,
				name: s.name,
				audit_score: s.audit_score,
				last_audit_at: s.last_audit_at
			})),
			credits: { remaining, monthly },
			actions: finalActions,
			action_count: finalActions.length,
			summary: summaryParts.join(' ')
		}
	};
}

type ClusterRow = {
	id: string;
	site_id: string;
	title?: string | null;
	target_keyword?: string | null;
	cluster_intelligence?: unknown;
};

async function buildSiteNextActions(
	organizationId: string,
	siteId: string,
	clusterScope: ClusterRow | null
): Promise<{ success: boolean; result: any }> {
	const { data: siteRow } = await supabase.from('sites').select('name, url').eq('id', siteId).single();
	const siteName = (siteRow as { name?: string })?.name ?? 'This site';

	const { data: audit } = await supabase
		.from('audit_results')
		.select(
			'overall_score, health_status, crawl_total_pages, crawl_total_issues, crawl_critical_issues, recommendations, created_at'
		)
		.eq('site_id', siteId)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	const { data: org } = await supabase
		.from('organizations')
		.select('included_credits_remaining, included_credits_monthly')
		.eq('id', organizationId)
		.single();

	const actions: SuggestedAction[] = [];
	const remaining = Number(org?.included_credits_remaining ?? 0);
	const monthly = Number(org?.included_credits_monthly ?? 1);

	if (monthly > 0 && remaining / monthly < 0.2) {
		actions.push({
			priority: 'high',
			title: 'Credits running low',
			description: `${remaining} of ${monthly} monthly credits remaining.`,
			action_url: '/billing',
			source: 'credits'
		});
	}

	if (audit) {
		const score = audit.overall_score ?? 0;
		const crit = audit.crawl_critical_issues ?? 0;
		const total = audit.crawl_total_issues ?? 0;
		if (audit.health_status === 'critical' || score < 45) {
			actions.push({
				priority: 'high',
				title: `Technical health: ${audit.health_status} (${score}/100)`,
				description: `${crit} critical issues, ${total} total — review crawl, CWV, and indexation on the audit report.`,
				action_url: `/audit/${siteId}`,
				source: 'audit'
			});
		} else if (score < 70) {
			actions.push({
				priority: 'medium',
				title: `Audit score ${score}/100 — improvement opportunity`,
				description: `${crit} critical · ${total} total issues.`,
				action_url: `/audit/${siteId}`,
				source: 'audit'
			});
		}
		const recs = Array.isArray(audit.recommendations) ? audit.recommendations : [];
		for (const r of recs.slice(0, 2)) {
			const text = typeof r === 'string' ? r : String(r);
			if (!text.trim()) continue;
			actions.push({
				priority: 'low',
				title: text.length > 90 ? `${text.slice(0, 87)}…` : text,
				description: 'From the latest technical audit recommendations.',
				action_url: `/audit/${siteId}`,
				source: 'audit'
			});
		}
	} else {
		actions.push({
			priority: 'high',
			title: 'No technical audit on file for this site',
			description: `Run an audit for ${siteName} to measure crawl issues, Core Web Vitals, and indexation.`,
			action_url: `/audit/${siteId}`,
			source: 'audit'
		});
	}

	let clusterIds: string[] = [];
	if (clusterScope) {
		clusterIds = [clusterScope.id];
	} else {
		const { data: clusterRows } = await supabase.from('clusters').select('id').eq('site_id', siteId);
		clusterIds = (clusterRows ?? []).map((c) => c.id);
	}

	if (clusterIds.length > 0) {
		const { data: lowPages } = await supabase
			.from('pages')
			.select('id, title, seo_score')
			.in('cluster_id', clusterIds)
			.eq('status', 'published')
			.or('seo_score.lt.70,seo_score.is.null')
			.limit(24);

		for (const p of (lowPages ?? []).slice(0, 5)) {
			actions.push({
				priority: 'medium',
				title: `Raise SEO score: ${p.title}`,
				description: `Published page at ${p.seo_score ?? '—'}/115.`,
				action_url: `/workspace/${p.id}`,
				source: 'priority_stack'
			});
		}
	}

	const { data: pubPages } = await supabase
		.from('pages')
		.select('id, title, last_updated_meaningful, updated_at, cluster_id')
		.eq('site_id', siteId)
		.eq('status', 'published');

	let pages = pubPages || [];
	if (clusterScope) {
		pages = pages.filter((p) => p.cluster_id === clusterScope.id);
	}
	const staleCutoff = new Date();
	staleCutoff.setMonth(staleCutoff.getMonth() - 6);
	const stale = pages.filter((p) => {
		const d = p.last_updated_meaningful || p.updated_at;
		return d && new Date(d as string) < staleCutoff;
	});
	for (const p of stale.slice(0, 5)) {
		actions.push({
			priority: 'medium',
			title: `Refresh outdated content: ${p.title}`,
			description: 'No meaningful update in over 6 months.',
			action_url: `/workspace/${p.id}`,
			source: 'refresh_queue'
		});
	}

	if (clusterScope?.cluster_intelligence != null && clusterScope.cluster_intelligence !== '') {
		actions.push({
			priority: 'low',
			title: clusterScope.title
				? `Review cluster plan: ${clusterScope.title}`
				: 'Review cluster intelligence',
			description: 'Cluster-level signals and gaps are saved on the cluster page.',
			action_url: `/clusters/${clusterScope.id}`,
			source: 'cluster'
		});
	}

	const finalActions = dedupeActions(actions)
		.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
		.slice(0, 25);

	const scope = clusterScope ? 'cluster' : 'site';
	const summary = `Merged ${finalActions.length} action(s) for ${siteName}${clusterScope ? ` (cluster scoped)` : ''}: credits, audit, low-score pages, stale refresh queue.`;

	return {
		success: true,
		result: {
			scope,
			site_id: siteId,
			site_name: siteName,
			cluster_id: clusterScope?.id,
			cluster_title: clusterScope?.title ?? undefined,
			audit_summary: audit
				? {
						overall_score: audit.overall_score,
						health_status: audit.health_status,
						crawl_critical_issues: audit.crawl_critical_issues,
						crawl_total_issues: audit.crawl_total_issues,
						audited_at: audit.created_at
					}
				: null,
			credits: { remaining, monthly },
			actions: finalActions,
			action_count: finalActions.length,
			summary
		}
	};
}

async function suggestNextActionsMerged(
	organizationId: string,
	siteIdArg: string | undefined,
	clusterIdArg: string | undefined
): Promise<{ success: boolean; result: any; error?: string }> {
	if (!siteIdArg && !clusterIdArg) {
		return buildOrgNextActions(organizationId);
	}

	if (clusterIdArg && !siteIdArg) {
		const { data: cluster, error: cErr } = await supabase
			.from('clusters')
			.select('id, site_id, title, target_keyword, cluster_intelligence')
			.eq('id', clusterIdArg)
			.single();
		if (cErr || !cluster) {
			return { success: false, result: null, error: 'Cluster not found' };
		}
		const { error } = await verifySiteAccess(cluster.site_id, organizationId);
		if (error) return { success: false, result: null, error };
		return buildSiteNextActions(organizationId, cluster.site_id, cluster as ClusterRow);
	}

	if (siteIdArg && clusterIdArg) {
		const { data: cluster, error: cErr } = await supabase
			.from('clusters')
			.select('id, site_id, title, target_keyword, cluster_intelligence')
			.eq('id', clusterIdArg)
			.single();
		if (cErr || !cluster) {
			return { success: false, result: null, error: 'Cluster not found' };
		}
		if (cluster.site_id !== siteIdArg) {
			return { success: false, result: null, error: 'cluster_id does not belong to this site' };
		}
		const { error } = await verifySiteAccess(siteIdArg, organizationId);
		if (error) return { success: false, result: null, error };
		return buildSiteNextActions(organizationId, siteIdArg, cluster as ClusterRow);
	}

	if (siteIdArg) {
		const { error } = await verifySiteAccess(siteIdArg, organizationId);
		if (error) return { success: false, result: null, error };
		return buildSiteNextActions(organizationId, siteIdArg, null);
	}

	return { success: false, result: null, error: 'Invalid arguments' };
}

export async function executeTool(
	toolName: string,
	args: Record<string, any>,
	context: ToolContext
): Promise<{ success: boolean; result: any; error?: string; creditsCost?: number }> {
	const { organizationId, userId, planCode } = context;
	try {
		switch (toolName) {
			case 'get_sites_summary': {
				const { data } = await supabase
					.from('sites')
					.select('id, name, url, niche, domain_authority')
					.eq('organization_id', organizationId)
					.order('created_at', { ascending: false });
				return { success: true, result: { sites: data || [], count: (data || []).length } };
			}
			case 'get_site_details': {
				const siteId = args.site_id;
				if (!siteId) return { success: false, result: null, error: 'site_id is required' };
				const { site, error } = await verifySiteAccess(siteId, organizationId);
				if (error) return { success: false, result: null, error };
				return { success: true, result: site };
			}
			case 'get_clusters_summary': {
				const siteId = args.site_id;
				if (!siteId) return { success: false, result: null, error: 'site_id is required' };
				const { error } = await verifySiteAccess(siteId, organizationId);
				if (error) return { success: false, result: null, error };
				const { data } = await supabase
					.from('clusters')
					.select('id, target_keyword, title, destination_page_url, status')
					.eq('site_id', siteId)
					.order('created_at', { ascending: false });
				return { success: true, result: { clusters: data || [], count: (data || []).length } };
			}
			case 'get_cluster_details': {
				const clusterId = args.cluster_id;
				if (!clusterId) return { success: false, result: null, error: 'cluster_id is required' };
				const { data: cluster } = await supabase
					.from('clusters')
					.select('id, target_keyword, title, site_id, destination_page_url, cluster_intelligence')
					.eq('id', clusterId)
					.single();
				if (!cluster) return { success: false, result: null, error: 'Cluster not found' };
				const { error } = await verifySiteAccess(cluster.site_id, organizationId);
				if (error) return { success: false, result: null, error };
				const { data: pages } = await supabase
					.from('pages')
					.select('id, keyword, title, type, funnel_stage, status')
					.eq('cluster_id', clusterId);
				return { success: true, result: { ...cluster, pages: pages || [] } };
			}
			case 'get_page_summary': {
				const pageId = args.page_id;
				if (!pageId) return { success: false, result: null, error: 'page_id is required' };
				const { data: page } = await supabase
					.from('pages')
					.select('id, keyword, title, type, page_type, funnel_stage, status, site_id')
					.eq('id', pageId)
					.single();
				if (!page) return { success: false, result: null, error: 'Page not found' };
				const { error } = await verifySiteAccess(page.site_id, organizationId);
				if (error) return { success: false, result: null, error };
				return { success: true, result: page };
			}
			case 'get_audit_summary': {
				const siteId = args.site_id;
				if (!siteId) return { success: false, result: null, error: 'site_id is required' };
				const { error } = await verifySiteAccess(siteId, organizationId);
				if (error) return { success: false, result: null, error };
				const { data: audit } = await supabase
					.from('audit_results')
					.select(
						'overall_score, health_status, crawl_total_pages, crawl_total_issues, crawl_critical_issues, recommendations, created_at'
					)
					.eq('site_id', siteId)
					.order('created_at', { ascending: false })
					.limit(1)
					.maybeSingle();
				if (!audit)
					return {
						success: true,
						result: {
							message:
								'No audit run yet for this site. Run a technical audit from the Technical SEO page.'
						}
					};
				return { success: true, result: audit };
			}
			case 'get_weekly_priority_stack': {
				const siteId = args.site_id;
				if (!siteId) return { success: false, result: null, error: 'site_id is required' };
				const { error } = await verifySiteAccess(siteId, organizationId);
				if (error) return { success: false, result: null, error };
				const items: Array<{ title: string; description: string; actionUrl: string }> = [];
				const { data: org } = await supabase
					.from('organizations')
					.select('included_credits_remaining, included_credits_monthly')
					.eq('id', organizationId)
					.single();
				if (org) {
					const remaining = Number(org.included_credits_remaining ?? 0);
					const monthly = Number(org.included_credits_monthly ?? 1);
					if (monthly > 0 && remaining / monthly < 0.2) {
						items.push({
							title: 'Credits running low',
							description: `${remaining} of ${monthly} remaining`,
							actionUrl: '/billing'
						});
					}
				}
				const { data: clusterRows } = await supabase
					.from('clusters')
					.select('id')
					.eq('site_id', siteId);
				const clusterIds = (clusterRows ?? []).map((c) => c.id);
				if (clusterIds.length > 0) {
					const { data: lowPages } = await supabase
						.from('pages')
						.select('id, title, seo_score')
						.in('cluster_id', clusterIds)
						.eq('status', 'published')
						.or('seo_score.lt.70,seo_score.is.null');
					for (const p of (lowPages ?? []).slice(0, 3)) {
						items.push({
							title: `Improve: ${p.title}`,
							description: `SEO score ${p.seo_score ?? '—'}/115`,
							actionUrl: `/workspace/${p.id}`
						});
					}
				}
				return { success: true, result: { items, count: items.length } };
			}
			case 'get_refresh_queue': {
				const siteId = args.site_id;
				if (!siteId) return { success: false, result: null, error: 'site_id is required' };
				const { error } = await verifySiteAccess(siteId, organizationId);
				if (error) return { success: false, result: null, error };
				const { data: site } = await supabase.from('sites').select('url').eq('id', siteId).single();
				const siteUrl = (site as { url?: string })?.url ?? null;
				const { data: pages } = await supabase
					.from('pages')
					.select('id, title, keyword, published_url, updated_at, last_updated_meaningful')
					.eq('site_id', siteId)
					.eq('status', 'published');
				const staleMonths = 6;
				const staleDate = new Date();
				staleDate.setMonth(staleDate.getMonth() - staleMonths);
				const stale = (pages || []).filter((p) => {
					const d = p.last_updated_meaningful || p.updated_at;
					return d && new Date(d) < staleDate;
				});
				return {
					success: true,
					result: {
						items: stale.slice(0, 10),
						count: stale.length,
						message: stale.length ? `${stale.length} pages may need refresh` : 'No stale pages'
					}
				};
			}
			case 'suggest_next_actions': {
				return suggestNextActionsMerged(organizationId, args.site_id, args.cluster_id);
			}
			case 'trigger_technical_audit': {
				if (!hasScalePlan(planCode ?? null)) {
					return {
						success: false,
						result: null,
						error:
							'Technical audits require Scale or Pro plan. Upgrade to run audits from the assistant.'
					};
				}
				const siteId = args.site_id;
				if (!siteId) return { success: false, result: null, error: 'site_id is required' };
				const { site, error } = await verifySiteAccess(siteId, organizationId);
				if (error) return { success: false, result: null, error };
				const { CREDIT_COSTS } = await import('../utils/credits.js');
				const cost = CREDIT_COSTS.SITE_CRAWL;
				const { data: org } = await supabase
					.from('organizations')
					.select('included_credits_remaining, included_credits')
					.eq('id', organizationId)
					.single();
				const creditsRemaining = Number(
					org?.included_credits_remaining ?? org?.included_credits ?? 0
				);
				if (creditsRemaining < cost) {
					return {
						success: false,
						result: null,
						error: `Insufficient credits. Need ${cost}, have ${creditsRemaining}. Add credits in Billing.`
					};
				}
				const newCredits = Math.max(0, creditsRemaining - cost);
				await supabase
					.from('organizations')
					.update({
						included_credits_remaining: newCredits,
						included_credits: org?.included_credits != null ? newCredits : undefined
					})
					.eq('id', organizationId);

				const { technicalAuditService } = await import('./technicalAuditService.js');
				try {
					const auditResult = await technicalAuditService.runFullAudit(
						site.url,
						siteId,
						organizationId
					);
					const preview = auditResult.recommendations.slice(0, 5);
					return {
						success: true,
						result: {
							site_id: siteId,
							site_name: site.name,
							message: `Audit finished for ${site.name}: overall score ${auditResult.overallScore}/100 (${auditResult.healthStatus}). ${auditResult.crawlResults.criticalIssues} critical issues, ${auditResult.crawlResults.totalIssuesFound} total across ${auditResult.crawlResults.totalPagesCrawled} pages crawled.`,
							overall_score: auditResult.overallScore,
							health_status: auditResult.healthStatus,
							pages_crawled: auditResult.crawlResults.totalPagesCrawled,
							critical_issues: auditResult.crawlResults.criticalIssues,
							warning_issues: auditResult.crawlResults.warningIssues,
							total_issues: auditResult.crawlResults.totalIssuesFound,
							recommendations_preview: preview,
							report_url: `/audit/${siteId}`,
							technical_seo_url: '/technical',
							credits_used: cost
						},
						creditsCost: cost
					};
				} catch (auditErr) {
					console.error('[AI Tools] Audit failed:', auditErr);
					await supabase
						.from('organizations')
						.update({
							included_credits_remaining: creditsRemaining,
							...(org?.included_credits != null && { included_credits: creditsRemaining })
						})
						.eq('id', organizationId);
					return {
						success: false,
						result: null,
						error:
							auditErr instanceof Error
								? auditErr.message
								: 'Technical audit failed. Credits were refunded.'
					};
				}
			}
			default:
				return { success: false, result: null, error: `Unknown tool: ${toolName}` };
		}
	} catch (e) {
		console.error(`[AI Tool] Error executing ${toolName}:`, e);
		return {
			success: false,
			result: null,
			error: e instanceof Error ? e.message : 'Tool execution failed'
		};
	}
}
