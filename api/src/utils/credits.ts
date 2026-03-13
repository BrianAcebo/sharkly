/**
 * Credit costs for the API.
 * Keep in sync with ui/app/src/lib/credits.ts when adding new cost types.
 * (Each app has its own copy; no shared folder.)
 */

export const CREDIT_COSTS = {
	SERP_ANALYSIS: 5,
	STRATEGY_GENERATION: 15,
	CLUSTER_GENERATION: 15,
	MONEY_PAGE_BRIEF: 40,
	ARTICLE_BRIEF: 40,
	ARTICLE_GENERATION: 20,
	META_GENERATION: 3,
	CTR_OPTIMIZE: 3,
	CRO_FIXES: 3,
	PAGE_OPTIMIZATION: 25,
	SITE_CRAWL: 10,
	PERFORMANCE_INSIGHT: 2,
	KEYWORD_LOOKUP: 5,
	SECTION_REWRITE: 5,
	FAQ_GENERATION: 5,
	PRODUCT_DESCRIPTION: 10,
	COLLECTION_INTRO: 10,
	TONE_ADJUSTMENT: 5,
	KEYWORD_VOLUME_REFRESH: 2,
	TOXIC_LINK_AUDIT: 15,
	REFRESH_AUTHORITY: 2,
	LINK_VELOCITY_CHECK: 5
} as const;

export const PLANS = {
	builder: { name: 'Builder', credits: 250, price: 39 },
	growth: { name: 'Growth', credits: 600, price: 79 },
	scale: { name: 'Scale', credits: 1100, price: 119 },
	pro: { name: 'Pro', credits: 2500, price: 169 }
} as const;

export const OVERAGE_RATE = 0.05;
