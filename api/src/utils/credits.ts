/**
 * Credit costs for the API.
 * Keep in sync with ui/app/src/lib/credits.ts when adding new cost types.
 * (Each app has its own copy; no shared folder.)
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

	/** @deprecated Use MONEY_PAGE_BRIEF or FOCUS_PAGE_FULL */
	ARTICLE_BRIEF: 40,

	// Article generation — supporting articles (15 flat) and focus page article regen (15).
	// First article from a paid brief (brief_paid === true, word_count === 0) is FREE.
	ARTICLE_GENERATION: 15,

	META_GENERATION: 3,
	CTR_OPTIMIZE: 3,
	CRO_FIXES: 3,
	CRO_STUDIO_AUDIT: 1,
	/** CRO Studio: single fix (1 credit) */
	CRO_STUDIO_SINGLE_FIX: 1,
	/** CRO Studio: all fixes for SEO page (3 credits) */
	CRO_STUDIO_ALL_FIXES_SEO: 3,
	/** CRO Studio: all fixes for destination page (6 credits) */
	CRO_STUDIO_ALL_FIXES_DEST: 6,
	/** CRO Studio: FAQ (5 Q&A) for destination page — 2 credits */
	CRO_STUDIO_FAQ: 2,
	/** CRO Studio: testimonial request email — 1 credit */
	CRO_STUDIO_TESTIMONIAL_EMAIL: 1,
	/** CRO Studio: emotional arc analysis — 3 credits */
	CRO_STUDIO_EMOTIONAL_ARC: 3,
	PAGE_OPTIMIZATION: 25,
	SITE_CRAWL: 10,
	PERFORMANCE_INSIGHT: 2,
	KEYWORD_LOOKUP: 5,
	SECTION_REWRITE: 5,
	FAQ_GENERATION: 5,
	/** Blog-to-video — full job from article (tiptap) without separate script step */
	VIDEO_GENERATION: 10,
	/** Claude script only (POST /api/video/generate-script) */
	VIDEO_SCRIPT_GENERATION: 3,
	/** Render job from edited script JSON (POST /api/video/create with input_type script_json) */
	VIDEO_RENDER: 7,
	PRODUCT_DESCRIPTION: 3,
	COLLECTION_INTRO: 3,
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

import { supabase } from './supabaseClient.js';

/** Spend credits via RPC (handles included + wallet). Used by domain intel and other features. */
export async function spendCreditsForAction(params: {
	orgId: string;
	creditCost: number;
	category: string;
	description: string;
}): Promise<{ success: boolean; reason?: string }> {
	const { data, error } = await supabase.rpc('spend_credits', {
		p_org_id: params.orgId,
		p_credits: params.creditCost,
		p_reference_type: params.category,
		p_reference_id: null,
		p_description: params.description
	});
	if (error) return { success: false, reason: error.message };
	if (!data?.ok) return { success: false, reason: (data as { reason?: string })?.reason };
	return { success: true };
}
