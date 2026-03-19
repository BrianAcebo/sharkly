/**
 * Single source of truth for all credit costs across the app.
 * Use: import { CREDIT_COSTS } from '../lib/credits'
 *
 * Focus page pricing model (updated):
 *
 *   First time through a focus page:
 *     FOCUS_PAGE_FULL (40 credits) = competitor research + content brief + first article bundled.
 *     The brief is Step 1, the article is Step 2. One charge, one flow.
 *     brief_data.brief_paid is set to true after brief generation.
 *     First article is free when brief_paid === true and word_count === 0.
 *
 *   After both exist (regeneration):
 *     FOCUS_PAGE_BRIEF_REGEN (25 credits) = redo research & brief only.
 *     ARTICLE_GENERATION (15 credits) = rewrite article from existing brief.
 *
 *   Supporting articles: ARTICLE_GENERATION (15 credits) flat — no brief step.
 */

export const CREDIT_COSTS = {
	SERP_ANALYSIS: 5,
	STRATEGY_GENERATION: 15,
	CLUSTER_GENERATION: 15,

	// Focus page — first time: research + brief + article generation bundled
	FOCUS_PAGE_FULL: 40,

	// Focus page — regen brief only (brief already exists, article already exists)
	FOCUS_PAGE_BRIEF_REGEN: 25,

	// Backward-compatible alias — same value as FOCUS_PAGE_FULL
	MONEY_PAGE_BRIEF: 40,

	// Article generation — supporting articles (15 flat) and focus page article regen (15).
	// First article from a paid brief (brief_paid === true, word_count === 0) is FREE.
	ARTICLE_GENERATION: 15,

	META_GENERATION: 3,
	CTR_OPTIMIZE: 3,
	CRO_FIXES: 3,
	CRO_STUDIO_AUDIT: 1,
	CRO_STUDIO_SINGLE_FIX: 1,
	CRO_STUDIO_ALL_FIXES_SEO: 3,
	CRO_STUDIO_ALL_FIXES_DEST: 6,
	CRO_STUDIO_FAQ: 2,
	CRO_STUDIO_TESTIMONIAL_EMAIL: 1,
	CRO_STUDIO_EMOTIONAL_ARC: 3,
	PAGE_OPTIMIZATION: 25,
	SITE_CRAWL: 10,
	PERFORMANCE_INSIGHT: 2,
	KEYWORD_LOOKUP: 5,
	SECTION_REWRITE: 5,
	FAQ_GENERATION: 5,
	PRODUCT_DESCRIPTION: 3,
	COLLECTION_INTRO: 3,
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
	FOCUS_PAGE_FULL: 'Focus page — Research & Write (brief + article)',
	FOCUS_PAGE_BRIEF_REGEN: 'Redo research & plan (focus page)',
	ARTICLE_GENERATION: 'Article generation',
	MONEY_PAGE_BRIEF: 'Focus page — Research & Write (brief + article)',
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
	// Focus pages: FOCUS_PAGE_FULL bundles brief + first article.
	// Supporting articles: ARTICLE_GENERATION flat.
	return (
		focusPageCount * CREDIT_COSTS.FOCUS_PAGE_FULL + articleCount * CREDIT_COSTS.ARTICLE_GENERATION
	);
}

export const PLANS = {
	builder: { name: 'Builder', credits: 250, price: 39 },
	growth: { name: 'Growth', credits: 600, price: 79 },
	scale: { name: 'Scale', credits: 1100, price: 119 },
	pro: { name: 'Pro', credits: 2500, price: 169 }
} as const;

export const OVERAGE_RATE = 0.05;
