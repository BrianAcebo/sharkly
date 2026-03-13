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
				'Analyze current data and suggest prioritized next actions for the user. Can take optional site_id or cluster_id for context. Free — no credits.',
			parameters: {
				type: 'object',
				properties: {
					site_id: {
						type: 'string',
						description: 'Optional — focus suggestions on this site'
					},
					cluster_id: {
						type: 'string',
						description: 'Optional — focus suggestions on this cluster'
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
				const siteId = args.site_id;
				const clusterId = args.cluster_id;
				if (!siteId && !clusterId) {
					const { data: sites } = await supabase
						.from('sites')
						.select('id, name')
						.eq('organization_id', organizationId)
						.limit(5);
					return {
						success: true,
						result: {
							suggestions: [
								'List your sites with get_sites_summary to see what you have.',
								'Run get_audit_summary for a site to check technical health.',
								'Check get_weekly_priority_stack for recommended actions.'
							],
							sites: sites || []
						}
					};
				}
				const suggestions: string[] = [];
				if (siteId) {
					const { error } = await verifySiteAccess(siteId, organizationId);
					if (error) return { success: false, result: null, error };
					suggestions.push(
						'Review your clusters with get_clusters_summary.',
						'Check get_audit_summary for technical issues.',
						'See get_weekly_priority_stack for top priorities.'
					);
				}
				if (clusterId) {
					suggestions.push(
						'Review cluster pages with get_cluster_details.',
						'Check for content gaps and funnel alignment.'
					);
				}
				return { success: true, result: { suggestions } };
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
				technicalAuditService.runFullAudit(site.url, siteId, organizationId).catch((e) => {
					console.error('[AI Tools] Audit failed:', e);
					supabase
						.from('organizations')
						.update({ included_credits_remaining: creditsRemaining })
						.eq('id', organizationId);
				});
				return {
					success: true,
					result: {
						message: `Audit started for ${site.name}. Results will appear in Technical SEO in a few minutes.`,
						creditsUsed: cost
					},
					creditsCost: cost
				};
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
