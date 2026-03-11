/**
 * S1-8: Internal Link Gap Analysis
 * Site-level aggregation of cluster intelligence warnings.
 * Maps entire internal link structure, identifies gaps, produces prioritised fix list.
 * Spec: docs/PRODUCT-ROADMAP.md S1-8, docs/cluster-intelligence-layer.md
 */

import { supabase } from '../utils/supabaseClient.js';
import { evaluateClusterIntelligence } from './clusterIntelligence.js';

export interface LinkGap {
	type: string;
	severity: 'high' | 'medium' | 'low';
	message: string;
	action: string;
	affectedPages: string[];
	clusterId: string;
	clusterTitle: string;
}

export interface InternalLinkGapResult {
	evaluated_at: string;
	total_clusters: number;
	clusters_with_gaps: number;
	gaps: LinkGap[];
	summary: string;
}

/** Severity order for prioritisation */
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export async function getInternalLinkGaps(siteId: string): Promise<InternalLinkGapResult> {
	const evaluated_at = new Date().toISOString();

	// 1. All clusters for site
	const { data: clusters, error: clusterErr } = await supabase
		.from('clusters')
		.select('id, title, destination_page_url, architecture')
		.eq('site_id', siteId)
		.eq('status', 'active');

	if (clusterErr) throw new Error('Failed to fetch clusters');
	if (!clusters?.length) {
		return {
			evaluated_at,
			total_clusters: 0,
			clusters_with_gaps: 0,
			gaps: [],
			summary: 'No active clusters. Add clusters to your strategy to analyze internal link gaps.'
		};
	}

	const clusterIds = clusters.map((c) => c.id);

	// 2. All pages for these clusters
	const { data: pages, error: pageErr } = await supabase
		.from('pages')
		.select('id, cluster_id, title, type, keyword, page_type, funnel_stage, content, published_url, cro_checklist')
		.in('cluster_id', clusterIds);

	if (pageErr) throw new Error('Failed to fetch pages');

	// 3. All internal_links for these clusters
	const { data: internalLinks, error: linkErr } = await supabase
		.from('internal_links')
		.select('cluster_id, from_page_id, to_page_id, implemented')
		.in('cluster_id', clusterIds);

	if (linkErr) throw new Error('Failed to fetch internal links');

	// Group by cluster
	const pagesByCluster = new Map<string, typeof pages>();
	for (const p of pages ?? []) {
		const list = pagesByCluster.get(p.cluster_id) ?? [];
		list.push(p);
		pagesByCluster.set(p.cluster_id, list);
	}

	const linksByCluster = new Map<string, typeof internalLinks>();
	for (const l of internalLinks ?? []) {
		const list = linksByCluster.get(l.cluster_id) ?? [];
		list.push(l);
		linksByCluster.set(l.cluster_id, list);
	}

	const allGaps: LinkGap[] = [];

	for (const cluster of clusters) {
		const clusterPages = pagesByCluster.get(cluster.id) ?? [];
		const clusterLinks = linksByCluster.get(cluster.id) ?? [];

		const result = evaluateClusterIntelligence(
			{
				destination_page_url: cluster.destination_page_url,
				architecture: cluster.architecture
			},
			clusterPages.map((p) => ({
				id: p.id,
				title: p.title,
				type: (p.type as string) || 'article',
				keyword: p.keyword ?? '',
				page_type: p.page_type,
				funnel_stage: p.funnel_stage,
				content: p.content,
				published_url: p.published_url,
				cro_checklist: p.cro_checklist as { items?: Record<string, { status?: string }>; funnel_mismatch?: string } | null
			})),
			clusterLinks.map((l) => ({
				from_page_id: l.from_page_id,
				to_page_id: l.to_page_id,
				implemented: l.implemented ?? false
			})),
			null
		);

		for (const w of result.warnings) {
			allGaps.push({
				type: w.type,
				severity: w.severity,
				message: w.message,
				action: w.action,
				affectedPages: w.affectedPages,
				clusterId: cluster.id,
				clusterTitle: cluster.title
			});
		}
	}

	// Sort: high first, then by type (missing_reverse_silo and orphaned_product_page are highest impact)
	const typePriority: Record<string, number> = {
		missing_reverse_silo: 0,
		orphaned_product_page: 1,
		focus_page_no_cta: 2,
		over_linking_money: 3,
		funnel_mismatch: 4,
		funnel_imbalance: 5,
		external_equity_leak: 6,
		bofu_focus_page: 7
	};

	allGaps.sort((a, b) => {
		const sev = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
		if (sev !== 0) return sev;
		const typeOrder = (typePriority[a.type] ?? 99) - (typePriority[b.type] ?? 99);
		if (typeOrder !== 0) return typeOrder;
		return a.clusterTitle.localeCompare(b.clusterTitle);
	});

	const clustersWithGaps = new Set(allGaps.map((g) => g.clusterId)).size;

	const summary =
		allGaps.length === 0
			? `All ${clusters.length} clusters have healthy internal link structures.`
			: `${allGaps.length} gap${allGaps.length > 1 ? 's' : ''} across ${clustersWithGaps} of ${clusters.length} clusters. Fix these to strengthen your reverse silo and ranking power.`;

	return {
		evaluated_at,
		total_clusters: clusters.length,
		clusters_with_gaps: clustersWithGaps,
		gaps: allGaps,
		summary
	};
}
