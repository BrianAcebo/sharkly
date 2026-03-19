import type { CannibalizationConflict } from '../utils/keywordCannibalization.js';

/**
 * L12 + S1-11. Cluster Intelligence Layer — Warnings 1-8
 * cluster-intelligence-layer.md
 *
 * W1-4: over-linking, missing reverse silo, funnel imbalance, external equity leak
 * W5: orphaned product page / focus page no CTA
 * W6: cluster-wide funnel mismatch (hard CTAs on ToFu/MoFu)
 * W7: BoFu focus page (transactional keyword as anchor)
 * W8: S2-3 Keyword cannibalization — 2+ pages competing for same keyword
 */

export type ClusterWarning = {
	type: string;
	severity: 'high' | 'medium' | 'low';
	message: string;
	action: string;
	affectedPages: string[];
	/** How we assess this — e.g. "Checked on your live site via Technical Audit" */
	assessmentNote?: string;
};

export type ClusterIntelligenceResult = {
	evaluated_at: string;
	architecture: 'A' | 'B';
	warnings: ClusterWarning[];
	health: {
		label: 'Strong' | 'Needs Work' | 'Critical Issues';
		color: 'green' | 'amber' | 'red';
		score: number;
	};
};

type CroChecklist = {
	items?: Record<string, { status?: string }>;
	funnel_mismatch?: string | null;
};

type ClusterPageRow = {
	id: string;
	title: string;
	type: string;
	keyword?: string | null;
	page_type?: string | null;
	funnel_stage?: string | null;
	content?: unknown;
	published_url?: string | null;
	cro_checklist?: CroChecklist | null;
};

type InternalLinkRow = {
	from_page_id: string;
	to_page_id: string;
	implemented: boolean;
};

function extractLinksFromContent(doc: unknown): { internal: string[]; external: Array<{ url: string; nofollow: boolean }> } {
	const internal: string[] = [];
	const external: Array<{ url: string; nofollow: boolean }> = [];

	function walk(nodes: unknown[]) {
		if (!Array.isArray(nodes)) return;
		for (const n of nodes) {
			if (n && typeof n === 'object') {
				const node = n as { type?: string; content?: unknown[]; marks?: Array<{ type?: string; attrs?: Record<string, unknown> }> };
				if (node.marks) {
					for (const m of node.marks) {
						if (m?.type === 'link' && m.attrs?.href) {
							const href = String(m.attrs.href);
							const rel = String(m.attrs.rel ?? '');
							const nofollow = /nofollow/i.test(rel);
							if (
								href.startsWith('/') ||
								href.startsWith('#') ||
								(!href.startsWith('http') && !href.startsWith('mailto:'))
							) {
								internal.push(href);
							} else if (href.startsWith('http') && !href.startsWith('mailto:')) {
								external.push({ url: href, nofollow });
							}
						}
					}
				}
				if (node.content) walk(node.content as unknown[]);
			}
		}
	}

	const root = doc as { content?: unknown[] };
	if (root?.content) walk(root.content);
	return { internal, external };
}

/** Normalize URL for comparison (path portion) */
function urlPath(url: string): string {
	try {
		const u = new URL(url, 'https://placeholder/');
		return u.pathname.replace(/^\/+|\/+$/g, '') || u.pathname;
	} catch {
		return url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/+|\/+$/g, '');
	}
}

/** W1: Over-linking to money/product page — >1 article or >30% linking directly */
function detectOverLinking(
	pages: ClusterPageRow[],
	internalLinks: InternalLinkRow[],
	destinationUrl: string | null,
	siteUrl: string | null
): ClusterWarning | null {
	if (!destinationUrl) return null;
	const articles = pages.filter((p) => p.type === 'article');
	if (articles.length === 0) return null;

	const destNorm = urlPath(destinationUrl);
	const articlesWithProductLink: string[] = [];

	for (const p of articles) {
		const content = p.content as { content?: unknown[] } | null;
		const { internal } = extractLinksFromContent(content ?? null);
		const linksToDest = internal.some((href) => {
			const pNorm = urlPath(href);
			return pNorm === destNorm || pNorm.endsWith('/' + destNorm) || destNorm.endsWith('/' + pNorm);
		});
		if (linksToDest) articlesWithProductLink.push(p.title);
	}

	const ratio = articlesWithProductLink.length / articles.length;
	if (articlesWithProductLink.length > 1 || ratio > 0.3) {
		return {
			type: 'over_linking_money',
			severity: 'high',
			message: `${articlesWithProductLink.length} of your articles link directly to your product page. This is splitting your ranking power instead of concentrating it through your main content page. Remove direct product links from these articles and let your main page send one strong link instead.`,
			action: 'Remove the product page link from each of these articles.',
			affectedPages: articlesWithProductLink
		};
	}
	return null;
}

/** W2: Missing reverse silo — articles that don't link to focus page */
function detectMissingReverseSilo(
	pages: ClusterPageRow[],
	internalLinks: InternalLinkRow[]
): ClusterWarning | null {
	const focusPage = pages.find((p) => p.type === 'focus_page');
	if (!focusPage) return null;

	const articles = pages.filter((p) => p.type === 'article');
	if (articles.length === 0) return null;

	const articlesWithFocusLink = new Set(
		internalLinks
			.filter((l) => l.to_page_id === focusPage.id && l.implemented)
			.map((l) => l.from_page_id)
	);

	const missing = articles.filter((a) => !articlesWithFocusLink.has(a.id)).map((a) => a.title);
	if (missing.length === 0) return null;

	const connected = articles.length - missing.length;
	return {
		type: 'missing_reverse_silo',
		severity: missing.length >= articles.length * 0.5 ? 'high' : 'medium',
		message: `${missing.length} of your ${articles.length} articles don't link back to your main content page. Your main page is only receiving ranking power from ${connected} articles instead of all ${articles.length}. Each missing connection is leaving ranking power on the table.`,
		action: 'Add a contextual link to your main page in each of these articles.',
		affectedPages: missing,
		assessmentNote:
			'Assessed from your live site. Set the Published URL for each page in Page settings (Workspace) and run a Technical Audit to check links on your live pages.'
	};
}

/** W3: Funnel stage imbalance */
function detectFunnelImbalance(pages: ClusterPageRow[]): ClusterWarning | null {
	const tofu = pages.filter((p) => {
		const pt = (p.page_type ?? p.funnel_stage ?? '').toLowerCase();
		return pt.includes('tofu') || p.funnel_stage === 'tofu';
	}).length;
	const mofu = pages.filter((p) => {
		const pt = (p.page_type ?? p.funnel_stage ?? '').toLowerCase();
		return pt.includes('mofu') || pt.includes('comparison') || p.funnel_stage === 'mofu';
	}).length;
	const bofu = pages.filter((p) => {
		const pt = (p.page_type ?? p.funnel_stage ?? '').toLowerCase();
		return pt.includes('bofu') || pt.includes('money') || pt.includes('service') || p.funnel_stage === 'bofu';
	}).length;
	const total = pages.length;

	if (tofu >= 5 && mofu === 0) {
		return {
			type: 'funnel_imbalance',
			severity: 'high',
			message: `Your cluster has ${tofu} informational articles but nothing in between them and your main page to guide readers toward a decision. You're attracting awareness traffic with nowhere to take it.`,
			action: 'Add 1-2 comparison or consideration pages between your blog posts and your main content page.',
			affectedPages: []
		};
	}
	if (tofu > bofu * 4 && mofu < 2) {
		return {
			type: 'funnel_imbalance',
			severity: 'medium',
			message: `Your cluster is ${tofu} awareness articles and ${bofu} conversion page. You have a lot of traffic coming in at the top with very little to catch them as they move toward a decision.`,
			action: "Add MoFu content — 'best options for X', 'how to choose X', or comparison pages — to bridge the gap.",
			affectedPages: []
		};
	}
	return null;
}

/** W4: External equity leak — focus page has >2 external links without nofollow */
function detectExternalEquityLeak(pages: ClusterPageRow[]): ClusterWarning | null {
	const focusPage = pages.find((p) => p.type === 'focus_page');
	if (!focusPage) return null;

	const content = focusPage.content as { content?: unknown[] } | null;
	const { external } = extractLinksFromContent(content ?? null);
	const withoutNofollow = external.filter((e) => !e.nofollow);

	if (withoutNofollow.length > 2) {
		return {
			type: 'external_equity_leak',
			severity: 'medium',
			message: `Your main content page has ${withoutNofollow.length} links to external websites without protection. Ranking power you've built through months of content work is flowing out to other sites.`,
			action: "Add rel='nofollow' to these links or remove them — that power should stay in your system.",
			affectedPages: withoutNofollow.slice(0, 5).map((l) => l.url)
		};
	}
	return null;
}

/** W5: Orphaned product page — Arch B: no links to destination; Arch A: focus page has no CTA */
function detectOrphanedProductPage(
	pages: ClusterPageRow[],
	destUrl: string | null,
	arch: 'A' | 'B'
): ClusterWarning | null {
	const focusPage = pages.find((p) => p.type === 'focus_page');
	if (!focusPage) return null;

	if (arch === 'B' && destUrl) {
		const destNorm = urlPath(destUrl);
		let anyPageLinksToProduct = false;
		for (const p of pages) {
			const content = p.content as { content?: unknown[] } | null;
			const { internal } = extractLinksFromContent(content ?? null);
			if (internal.some((href) => urlPath(href) === destNorm || urlPath(href).endsWith('/' + destNorm))) {
				anyPageLinksToProduct = true;
				break;
			}
		}
		if (!anyPageLinksToProduct) {
			return {
				type: 'orphaned_product_page',
				severity: 'high',
				message:
					"Your product page isn't connected to your content cluster. It has no path to receive ranking power or trust signals from your articles.",
				action: 'Add one strong contextual link from your main content page to your product page.',
				affectedPages: [focusPage.title]
			};
		}
	}

	if (arch === 'A') {
		const hasCTA = focusPage.cro_checklist?.items?.['2']?.status === 'pass';
		if (!hasCTA) {
			return {
				type: 'focus_page_no_cta',
				severity: 'high',
				message:
					"Your main content page has no call to action. Visitors who arrive from your supporting articles have nowhere to go.",
				action: 'Add a contact button, phone number, or booking link above the fold.',
				affectedPages: [focusPage.title]
			};
		}
	}
	return null;
}

/** W6: Cluster-wide funnel mismatch — ToFu/MoFu articles with hard CTAs */
function detectClusterWideFunnelMismatch(pages: ClusterPageRow[]): ClusterWarning | null {
	const articles = pages.filter((p) => p.type === 'article');
	const mismatched = articles.filter((p) => {
		const pt = (p.page_type ?? p.funnel_stage ?? '').toLowerCase();
		const isInformational =
			pt.includes('tofu') || pt.includes('mofu') || p.funnel_stage === 'tofu' || p.funnel_stage === 'mofu';
		const fm = p.cro_checklist?.funnel_mismatch;
		const hasHardCTA = fm === 'hard_cta_on_tofu' || fm === 'hard_cta_on_mofu';
		return isInformational && hasHardCTA;
	});

	if (mismatched.length >= 2) {
		return {
			type: 'funnel_mismatch',
			severity: 'high',
			message: `${mismatched.length} of your articles are pushing visitors to buy before they're ready. This is causing them to leave, which tells Google your pages aren't satisfying their search.`,
			action:
				"Change each of these CTAs from a purchase/contact request to a soft offer — a free guide, a 'learn more' link, or an email capture.",
			affectedPages: mismatched.map((p) => p.title)
		};
	}
	return null;
}

/** W8: S2-3 Keyword cannibalization — conflicts that involve this cluster's pages */
function formatCannibalizationWarnings(
	conflicts: Array<{ keyword: string; pages: Array<{ id: string; title: string }> }>,
	clusterPageIds: Set<string>
): ClusterWarning[] {
	const warnings: ClusterWarning[] = [];
	for (const c of conflicts) {
		const involved = c.pages.filter((p) => clusterPageIds.has(p.id));
		if (involved.length === 0) continue; // conflict doesn't involve this cluster
		const pageList = c.pages.map((p) => p.title).join(', ');
		warnings.push({
			type: 'keyword_cannibalization',
			severity: 'high',
			message: `${c.pages.length} of your pages are competing for the same keyword — "${c.keyword}" is the target on ${pageList}. Google is splitting its ranking signals between them. Consolidate these into one page or differentiate their keywords clearly.`,
			action: 'Consolidate into one page or differentiate keywords (e.g. different intent or qualifier).',
			affectedPages: c.pages.map((p) => p.title)
		});
	}
	return warnings;
}

/** W7: BoFu focus page — anchor targets transactional keyword */
function detectBoFuFocusPage(pages: ClusterPageRow[]): ClusterWarning | null {
	const focusPage = pages.find((p) => p.type === 'focus_page');
	if (!focusPage) return null;

	const pt = (focusPage.page_type ?? '').toLowerCase();
	const isBoFu =
		focusPage.funnel_stage === 'bofu' || pt.includes('money') || pt.includes('service');
	const kwTransactional =
		/\b(near me|in [a-z]+|hire|book|buy|get a quote|cost|price|pricing)\b/i.test(focusPage.keyword || '');

	if (isBoFu || kwTransactional) {
		return {
			type: 'bofu_focus_page',
			severity: 'high',
			message:
				'Your SEO anchor is targeting a buying-intent keyword. Consider making this your destination page and creating a new anchor for a research-stage keyword like "how to choose..."',
			action: 'Create a new focus page for a consideration keyword; use this page as the destination.',
			affectedPages: [focusPage.title]
		};
	}
	return null;
}

function calculateHealth(warnings: ClusterWarning[]): ClusterIntelligenceResult['health'] {
	const weights = { high: 30, medium: 15, low: 5 };
	let deductions = 0;
	for (const w of warnings) {
		deductions += weights[w.severity] ?? 10;
	}
	const score = Math.max(0, 100 - deductions);
	if (score >= 80) return { label: 'Strong', color: 'green', score };
	if (score >= 50) return { label: 'Needs Work', color: 'amber', score };
	return { label: 'Critical Issues', color: 'red', score };
}

export function evaluateClusterIntelligence(
	cluster: {
		destination_page_url?: string | null;
		architecture?: string | null;
	},
	pages: ClusterPageRow[],
	internalLinks: InternalLinkRow[],
	siteUrl?: string | null,
	cannibalizationConflicts?: CannibalizationConflict[]
): ClusterIntelligenceResult {
	const destUrl = cluster.destination_page_url ?? null;
	const arch = (cluster.architecture === 'B' ? 'B' : 'A') as 'A' | 'B';

	const warnings: ClusterWarning[] = [];

	const w1 = detectOverLinking(pages, internalLinks, destUrl, siteUrl ?? null);
	if (w1) warnings.push(w1);

	const w2 = detectMissingReverseSilo(pages, internalLinks);
	if (w2) warnings.push(w2);

	const w3 = detectFunnelImbalance(pages);
	if (w3) warnings.push(w3);

	const w4 = detectExternalEquityLeak(pages);
	if (w4) warnings.push(w4);

	const w5 = detectOrphanedProductPage(pages, destUrl, arch);
	if (w5) warnings.push(w5);

	const w6 = detectClusterWideFunnelMismatch(pages);
	if (w6) warnings.push(w6);

	const w7 = detectBoFuFocusPage(pages);
	if (w7) warnings.push(w7);

	// W8: Keyword cannibalization (S2-3)
	if (cannibalizationConflicts?.length) {
		const clusterPageIds = new Set(pages.map((p) => p.id));
		const w8List = formatCannibalizationWarnings(
			cannibalizationConflicts.map((c) => ({
				keyword: c.keyword,
				pages: c.pages.map((p) => ({ id: p.id, title: p.title }))
			})),
			clusterPageIds
		);
		warnings.push(...w8List);
	}

	const health = calculateHealth(warnings);

	return {
		evaluated_at: new Date().toISOString(),
		architecture: arch,
		warnings,
		health
	};
}
