/**
 * Build three-node cluster journey data for CRO Studio.
 * Spec: cro-studio.md — Cluster Journey Panel
 *
 * Returns: Supporting Article (ToFu) → Focus Page (MoFu) → Destination Page (BoFu)
 * with AIDA, MAP, mindset, and CRO score per node.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface ClusterJourneyNode {
	/** Node role in funnel */
	role: 'supporting' | 'focus' | 'destination';
	/** Page label (title or URL fallback) */
	label: string;
	/** Page URL — links out */
	url: string | null;
	/** AIDA stage(s) per spec */
	aida: string;
	/** MAP stage(s) per spec */
	map: string;
	/** Visitor psychological state — 1 plain-English sentence */
	mindset: string;
	/** CRO audit id if this page has been audited */
	audit_id: string | null;
	/** CRO score (0–100) if audited */
	cro_score: number | null;
	/** Page type for styling */
	page_type: string;
}

export interface ClusterJourneyData {
	nodes: [ClusterJourneyNode, ClusterJourneyNode, ClusterJourneyNode];
}

// Per cro-studio.md AIDA + MAP mapping
const NODE_CONFIG = {
	supporting: {
		aida: 'Attention + Interest',
		map: 'Motivation',
		mindset: 'I have a problem, what are options?',
		page_type: 'ToFu / Informational'
	},
	focus: {
		aida: 'Interest + Desire',
		map: 'Motivation + Ability',
		mindset: "I'm comparing options, who's best?",
		page_type: 'MoFu / Comparison'
	},
	destination: {
		aida: 'Action',
		map: 'Prompt only',
		mindset: "I'm ready — give me a reason NOW",
		page_type: 'BoFu / Convert'
	}
} as const;

/** Normalize URL for matching (lowercase, strip trailing slash) */
function normalizeUrl(url: string | null | undefined): string {
	if (!url || typeof url !== 'string') return '';
	return url.trim().toLowerCase().replace(/\/+$/, '') || '';
}

/**
 * Build cluster journey data for a destination page audit.
 * Fetches cluster, pages, and cro_audits to assemble the three nodes.
 *
 * @param supabase - Supabase client
 * @param clusterId - Cluster ID from the audit
 * @param organizationId - For cro_audits lookup
 * @returns Cluster journey data or null if cluster not found / no destination
 */
export async function buildClusterJourneyData(
	supabase: SupabaseClient,
	clusterId: string,
	organizationId: string
): Promise<ClusterJourneyData | null> {
	const { data: cluster, error: clusterErr } = await supabase
		.from('clusters')
		.select('id, title, destination_page_url, destination_page_label')
		.eq('id', clusterId)
		.single();

	if (clusterErr || !cluster) return null;
	if (!cluster.destination_page_url) return null;

	const destUrl = cluster.destination_page_url.trim();
	let destLabel = cluster.destination_page_label?.trim();
	if (!destLabel) {
		try {
			destLabel = new URL(destUrl, 'https://example.com').pathname || destUrl;
		} catch {
			destLabel = destUrl;
		}
	}

	// Fetch pages in cluster
	const { data: pages } = await supabase
		.from('pages')
		.select('id, title, type, page_type, funnel_stage, published_url')
		.eq('cluster_id', clusterId);

	const focusPage = (pages ?? []).find((p) => p.type === 'focus_page');
	const tofuPages = (pages ?? []).filter(
		(p) =>
			p.type === 'article' &&
			(p.funnel_stage === 'tofu' || (p.page_type as string)?.toLowerCase?.().includes('tofu'))
	);
	const supportingPage = tofuPages[0] ?? null;

	// URLs to look up in cro_audits (supporting, focus, destination)
	const urlsToMatch = [
		supportingPage?.published_url ?? null,
		focusPage?.published_url ?? null,
		destUrl
	].filter(Boolean) as string[];

	// Fetch cro_audits for this org that match any of these URLs
	let auditsByUrl: Record<string, { id: string; cro_score: number; max_score: number }> = {};
	if (urlsToMatch.length > 0) {
		const { data: audits } = await supabase
			.from('cro_audits')
			.select('id, page_url, cro_score, max_score')
			.eq('organization_id', organizationId);

		for (const a of audits ?? []) {
			const norm = normalizeUrl(a.page_url);
			if (!norm) continue;
			for (const u of urlsToMatch) {
				if (normalizeUrl(u) === norm) {
					const score =
						(a.max_score ?? 11) > 0
							? Math.round(((a.cro_score ?? 0) / (a.max_score ?? 11)) * 100)
							: 0;
					auditsByUrl[norm] = { id: a.id, cro_score: score, max_score: a.max_score ?? 11 };
					break;
				}
			}
		}
	}

	const getAudit = (url: string | null) => {
		if (!url) return null;
		return auditsByUrl[normalizeUrl(url)] ?? null;
	};

	const supportingNode: ClusterJourneyNode = {
		role: 'supporting',
		label: supportingPage?.title ?? 'Supporting Article',
		url: supportingPage?.published_url ?? null,
		aida: NODE_CONFIG.supporting.aida,
		map: NODE_CONFIG.supporting.map,
		mindset: NODE_CONFIG.supporting.mindset,
		page_type: NODE_CONFIG.supporting.page_type,
		audit_id: getAudit(supportingPage?.published_url ?? null)?.id ?? null,
		cro_score: getAudit(supportingPage?.published_url ?? null)?.cro_score ?? null
	};

	const focusNode: ClusterJourneyNode = {
		role: 'focus',
		label: focusPage?.title ?? 'Focus Page',
		url: focusPage?.published_url ?? null,
		aida: NODE_CONFIG.focus.aida,
		map: NODE_CONFIG.focus.map,
		mindset: NODE_CONFIG.focus.mindset,
		page_type: NODE_CONFIG.focus.page_type,
		audit_id: getAudit(focusPage?.published_url ?? null)?.id ?? null,
		cro_score: getAudit(focusPage?.published_url ?? null)?.cro_score ?? null
	};

	const destNode: ClusterJourneyNode = {
		role: 'destination',
		label: destLabel,
		url: destUrl,
		aida: NODE_CONFIG.destination.aida,
		map: NODE_CONFIG.destination.map,
		mindset: NODE_CONFIG.destination.mindset,
		page_type: NODE_CONFIG.destination.page_type,
		audit_id: getAudit(destUrl)?.id ?? null,
		cro_score: getAudit(destUrl)?.cro_score ?? null
	};

	return {
		nodes: [supportingNode, focusNode, destNode]
	};
}
