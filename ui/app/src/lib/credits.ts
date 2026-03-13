/**
 * Single source of truth for all credit costs across the app.
 * Use: import { CREDIT_COSTS } from '../lib/credits'
 */

export const CREDIT_COSTS = {
	SERP_ANALYSIS: 5,
	STRATEGY_GENERATION: 15,
	CLUSTER_GENERATION: 15,
	MONEY_PAGE_BRIEF: 40,
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
	COLLECTION_INTRO: 'Collection intro generation',
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
