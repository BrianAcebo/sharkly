/**
 * Single source of truth for all credit costs across the app.
 * Used by: frontend (Workspace, Strategy, ClusterDetail, SettingsCredits), API (pages, clusters).
 * When changing values here, update shared/credits.mjs so the Node API uses the same costs.
 */

export const CREDIT_COSTS = {
	SERP_ANALYSIS: 5,
	CLUSTER_GENERATION: 15,
	/** Focus page / money page brief generation */
	MONEY_PAGE_BRIEF: 40,
	/** Supporting article content generation (~1,000 words) */
	ARTICLE_GENERATION: 20,
	META_GENERATION: 3,
	PAGE_OPTIMIZATION: 25,
	SITE_CRAWL: 10,
	PERFORMANCE_INSIGHT: 2,
} as const;

export type CreditCostKey = keyof typeof CREDIT_COSTS;

/** Cost to generate all content in a cluster: focus pages × MONEY_PAGE_BRIEF + articles × ARTICLE_GENERATION */
export function getGenerateAllCreditsCost(focusPageCount: number, articleCount: number): number {
	return focusPageCount * CREDIT_COSTS.MONEY_PAGE_BRIEF + articleCount * CREDIT_COSTS.ARTICLE_GENERATION;
}

export const PLANS = {
	builder: { name: 'Builder', credits: 250, price: 39 },
	growth: { name: 'Growth', credits: 600, price: 79 },
	scale: { name: 'Scale', credits: 1100, price: 119 },
	pro: { name: 'Pro', credits: 2500, price: 169 },
} as const;

export const OVERAGE_RATE = 0.05;
