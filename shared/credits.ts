/**
 * Single source of truth for all credit costs across the app.
 * Used by: frontend (Workspace, Strategy, ClusterDetail, SettingsCredits), API (pages, clusters).
 * When changing values here, update shared/credits.mjs so the Node API uses the same costs.
 */

export const CREDIT_COSTS = {
	SERP_ANALYSIS: 5,
	/** AI strategy suggestion generation — Serper competitor research + Claude Sonnet */
	STRATEGY_GENERATION: 15,
	CLUSTER_GENERATION: 15,
	/** Focus page / money page brief generation */
	MONEY_PAGE_BRIEF: 40,
	/** Supporting article content generation (~1,000 words) */
	ARTICLE_GENERATION: 20,
	META_GENERATION: 3,
	CTR_OPTIMIZE: 3,
	/** Get Specific Fixes — CRO checklist AI suggestions (system-1-cro-layer §8.6) */
	CRO_FIXES: 3,
	PAGE_OPTIMIZATION: 25,
	SITE_CRAWL: 10,
	PERFORMANCE_INSIGHT: 2,
	/** Keyword lookup modal: 1 Serper + 1 Haiku classification */
	KEYWORD_LOOKUP: 5,
	/** Section-level rewrite in workspace */
	SECTION_REWRITE: 5,
	/** Standalone FAQ generation */
	FAQ_GENERATION: 5,
	/** Product description rewriter (ecommerce) */
	PRODUCT_DESCRIPTION: 10,
	/** Tone adjustment after generation */
	TONE_ADJUSTMENT: 5,
	/** Refresh monthly search volume for a single keyword — 1 Serper call */
	KEYWORD_VOLUME_REFRESH: 2,
	/** S1-7: Toxic link audit — DataForSEO backlinks + toxic scoring */
	TOXIC_LINK_AUDIT: 15,
	/** Refresh Domain Authority from Moz (1 API call) */
	REFRESH_AUTHORITY: 2,
	/** S2-14: Link velocity check — DataForSEO referring domains + monthly growth evaluation */
	LINK_VELOCITY_CHECK: 5
} as const;

export const CREDIT_COST_LABELS = {
	CRAWL: 'Site crawl / technical audit',
	STRATEGY_GENERATION: 'Topic strategy generation',
	CLUSTER_GENERATION: 'Cluster generation',
	ARTICLE_GENERATION: 'Article generation',
	MONEY_PAGE_BRIEF: 'Focus page brief',
	KEYWORD_LOOKUP: 'Keyword lookup',
	CTR_OPTIMIZE: 'CTR / meta optimization',
	SECTION_REWRITE: 'Section rewrite',
	FAQ_GENERATION: 'FAQ generation',
	PRODUCT_DESCRIPTION: 'Product description rewrite',
	TONE_ADJUSTMENT: 'Tone adjustment',
	META_GENERATION: 'Meta title & description',
	KEYWORD_VOLUME_REFRESH: 'Keyword volume refresh',
	SITE_CRAWL: 'Site crawl / technical audit',
	PERFORMANCE_INSIGHT: 'AI performance interpretation',
	PAGE_OPTIMIZATION: 'Optimize existing page',
	TOXIC_LINK_AUDIT: 'Toxic link audit',
	REFRESH_AUTHORITY: 'Domain authority refresh',
	LINK_VELOCITY_CHECK: 'Link velocity check'
};

export type CreditCostKey = keyof typeof CREDIT_COSTS;

/** Cost to generate all content in a cluster: focus pages × MONEY_PAGE_BRIEF + articles × ARTICLE_GENERATION */
export function getGenerateAllCreditsCost(focusPageCount: number, articleCount: number): number {
	return (
		focusPageCount * CREDIT_COSTS.MONEY_PAGE_BRIEF + articleCount * CREDIT_COSTS.ARTICLE_GENERATION
	);
}

export const PLANS = {
	builder: { name: 'Builder', credits: 250, price: 39 },
	growth: { name: 'Growth', credits: 600, price: 79 },
	scale: { name: 'Scale', credits: 1100, price: 119 },
	pro: { name: 'Pro', credits: 2500, price: 169 }
} as const;

export const OVERAGE_RATE = 0.05;
