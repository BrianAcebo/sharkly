/**
 * Strategy Topic Generation — v5.0 (Data-First Edition)
 *
 * Rebuilt to match exactly how a senior SEO strategist works manually:
 *
 *   1. Start with the business's services/products as seed topics
 *   2. Map the full competitive landscape into topic zones (AI domain knowledge)
 *   3. Pull real keyword data for EVERY zone simultaneously:
 *      DataForSEO (volume/KD/CPC) + Google SERP (organic titles) + PAA (user questions)
 *   4. Profile each zone from the actual data — metrics first, no guessing
 *   5. AI synthesizes topic titles FROM the keyword clusters
 *   6. Fill gaps with AI suggestions backed by PAA/SERP signals, clearly labeled
 *   7. Per-topic SERP research for competition density and format signals
 *   8. Final metrics computed from real data, priority scored and sorted
 *
 * THE CRITICAL FIX FROM v4:
 * Topics are derived FROM keyword zone data, not generated independently then
 * matched to data afterward. Every topic has real metrics because it was
 * built from real metrics. The primary_keyword comes from DataForSEO, not Claude.
 *
 * ─── PATENT GROUNDING ────────────────────────────────────────────────────────
 *
 * Zone profiling / topic count:
 *   US9135307B1 — Google pre-classifies domains as high/low quality. Topical
 *   depth is required before pre-classification fires. Topic count = number
 *   of zones with real search demand, not a preset.
 *
 * Priority Score:
 *   US8682892B1 + US10055467B1 — Traffic tier thresholds. KD above tier = locked.
 *   US8595225B1 — Navboost. High-dwell topics compound over 13 months. navboostMult.
 *   US20190155948A1 — Information Gain. No original element = unsustained rankings. igsMult.
 *
 * Internal linking / content briefs:
 *   US8117209B1 — Body text links in first 400 words pass maximum equity.
 *
 * Passage scoring:
 *   US9940367B1 + US9959315B1 — H2s as answerable questions, first-sentence answers.
 *
 * ─── PIPELINE ────────────────────────────────────────────────────────────────
 *
 * Phase 0  PRE-FLIGHT: credit check · DA refresh · GSC impressions · dedup
 * Phase 1  LANDSCAPE MAPPING: AI generates 12-18 zone seeds from domain knowledge
 * Phase 2  PARALLEL RESEARCH: DataForSEO + SERP + PAA for every zone simultaneously
 * Phase 3  ZONE PROFILING: compute vol/KD/CPC/best_keyword per zone from real data
 * Phase 4  COMPETITOR GAP: site:{competitor} scrapes
 * Phase 5  AI SYNTHESIS: derive topics FROM zone data (data-first, IGS-gated)
 * Phase 6  PER-TOPIC SERP: allintitle · format · PAA depth · competition density
 * Phase 7  METRICS + PRIORITY: exclusive assignment · real aggregation · scoring
 * Phase 8  AI REASONING: plain-English coaching using real computed numbers
 */

import { Request, Response, RequestHandler } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { serperSearch, parseSearchResultCount } from '../utils/serper.js';
import { fetchDomainAuthority } from '../utils/moz.js';
import {
	getKeywordSuggestions,
	aggregateTopicMetrics,
	getKeywordMetrics,
	type DfsKeyword
} from '../utils/dataforseo.js';
import { CREDIT_COSTS } from '../utils/credits.js';
import { createNotificationForUser } from '../utils/notifications.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_SONNET_MODEL || 'claude-sonnet-4-5-20250929';

const GPT_CONTENT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';

// ─────────────────────────────────────────────────────────────────────────────
// Traffic Tier — US8682892B1 + US10055467B1
// ─────────────────────────────────────────────────────────────────────────────
const TRAFFIC_TIERS = [
	{ minDaily: 0, maxDaily: 10, label: 'Level 0' },
	{ minDaily: 10, maxDaily: 20, label: 'Level 10' },
	{ minDaily: 20, maxDaily: 50, label: 'Level 20' },
	{ minDaily: 50, maxDaily: 100, label: 'Level 50' },
	{ minDaily: 100, maxDaily: 200, label: 'Level 100' },
	{ minDaily: 200, maxDaily: 500, label: 'Level 200' },
	{ minDaily: 500, maxDaily: 1000, label: 'Level 500' },
	{ minDaily: 1000, maxDaily: 1500, label: 'Level 1,000' },
	{ minDaily: 1500, maxDaily: 2000, label: 'Level 1,500' },
	{ minDaily: 2000, maxDaily: 3000, label: 'Level 2,000' },
	{ minDaily: 5000, maxDaily: 7500, label: 'Level 5,000' },
	{ minDaily: 10000, maxDaily: 12500, label: 'Level 10,000' },
	{ minDaily: 25000, maxDaily: 50000, label: 'Level 25,000' }
] as const;

/** Write NDJSON line for streaming responses */
function writeNdjson(res: Response, obj: object): void {
	res.write(JSON.stringify(obj) + '\n');
}

function getTrafficTier(monthlyImpressions: number) {
	const daily = monthlyImpressions / 30;
	for (let i = TRAFFIC_TIERS.length - 1; i >= 0; i--) {
		if (daily >= TRAFFIC_TIERS[i].minDaily) return TRAFFIC_TIERS[i];
	}
	return TRAFFIC_TIERS[0];
}

function computeAuthorityFit(avgKd: number, da: number): 'achievable' | 'buildToward' | 'locked' {
	if (da <= 5) {
		if (avgKd <= 15) return 'achievable';
		if (avgKd <= 30) return 'buildToward';
		return 'locked';
	}
	if (avgKd <= da + 10) return 'achievable';
	if (avgKd <= da + 25) return 'buildToward';
	return 'locked';
}

function computePriorityScore(
	cpc: number,
	totalVolume: number,
	avgKd: number,
	funnel: string,
	fit: string,
	monthlyImpressions: number,
	navboostMultiplier: number,
	igsMultiplier: number
): number {
	if (igsMultiplier === 0) return 0;
	const fw = funnel === 'bofu' ? 3 : funnel === 'mofu' ? 2 : 1;
	const am = fit === 'achievable' ? 2.0 : fit === 'buildToward' ? 1.2 : 0.5;
	if (monthlyImpressions === 0) {
		const base = (fw * Math.max(cpc, 0.1) * Math.log10(1 + 0.1)) / (Math.max(avgKd, 1) / 100 + 0.1);
		return Math.round(base * am * navboostMultiplier * igsMultiplier * 100) / 100;
	}
	const base =
		(fw * Math.max(cpc, 0.1) * Math.log10(Math.max(totalVolume, 1) + 1)) /
		(Math.max(avgKd, 1) / 100 + 0.1);
	const tier = getTrafficTier(monthlyImpressions);
	const tierMax = tier.maxDaily * 60;
	const tierFit = tierMax > 0 && totalVolume <= tierMax * 2 ? 1.5 : 1.0;
	return Math.round(base * am * tierFit * navboostMultiplier * igsMultiplier * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI helpers
// ─────────────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callClaude(
	system: string,
	user: string,
	maxTokens = 6000,
	retries = 3
): Promise<string | null> {
	for (let attempt = 0; attempt <= retries; attempt++) {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: CLAUDE_MODEL,
				max_tokens: maxTokens,
				messages: [{ role: 'user', content: user }],
				system
			})
		});
		if (res.ok) {
			const d = (await res.json()) as { content?: Array<{ type: string; text: string }> };
			return d.content?.find((c) => c.type === 'text')?.text ?? null;
		}
		if ((res.status === 529 || res.status === 500 || res.status === 503) && attempt < retries) {
			await sleep(2000 * Math.pow(2, attempt));
			continue;
		}
		console.error(`[Strategy] Claude ${res.status}:`, await res.text());
		return null;
	}
	return null;
}

async function callOpenAI(system: string, user: string): Promise<string | null> {
	if (!OPENAI_API_KEY) return null;
	try {
		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
			body: JSON.stringify({
				model: GPT_CONTENT_MODEL,
				max_tokens: 6000,
				messages: [
					{ role: 'system', content: system },
					{ role: 'user', content: user }
				]
			})
		});
		if (!res.ok) return null;
		const d = (await res.json()) as { choices?: Array<{ message: { content: string } }> };
		return d.choices?.[0]?.message?.content ?? null;
	} catch {
		return null;
	}
}

const ai = (system: string, user: string, maxTokens?: number) =>
	callClaude(system, user, maxTokens).then((r) => r ?? callOpenAI(system, user));

function parseJSON<T>(raw: string | null, fallback: T): T {
	if (!raw) return fallback;
	try {
		return JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim()) as T;
	} catch {
		return fallback;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type CategoryBreadth = 'narrow' | 'medium' | 'broad';
type NavboostPotential = 'high' | 'medium' | 'low';
type IgsFeasibility = 'strong' | 'borderline' | 'failed';
type DominantFormat = 'how-to' | 'comparison' | 'listicle' | 'review' | 'tool' | 'guide';
type DataConfidence = 'data_backed' | 'paa_backed' | 'ai_suggested';

interface ZoneProfile {
	seed: string;
	keywords: DfsKeyword[];
	total_volume: number;
	median_kd: number;
	weighted_cpc: number;
	keyword_count: number;
	best_keyword: string;
	best_keyword_volume: number;
	best_keyword_kd: number;
	best_keyword_cpc: number;
	top_5_keywords: string;
	paa_questions: string[];
	organic_titles: string[];
	has_data: boolean;
	commercial_score: number;
	navboost_score: number;
}

interface SynthesizedTopic {
	title: string;
	primary_keyword: string;
	primary_keyword_volume: number;
	primary_keyword_kd: number;
	primary_keyword_cpc: number;
	topic_description: string;
	example_keywords: string[];
	funnel_stage: string;
	mofu_type: 'mofu_article' | 'mofu_comparison';
	igs_feasibility: IgsFeasibility;
	original_angle: string;
	navboost_potential: NavboostPotential;
	data_confidence: DataConfidence;
	source_zone: string;
	tier: 'unlocked' | 'locked';
	discovery_sources: string[];
}

interface TopicResearch {
	title: string;
	primaryKw: string;
	topDomains: string[];
	topTitles: string[];
	highAuthCount: number;
	paaDepth: number;
	paaQuestions: string[];
	relatedDepth: number;
	allintitleCount: number;
	hasLocalResults: boolean;
	dominantFormat: DominantFormat;
	hasOriginalDataInTop5: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone profiling
// ─────────────────────────────────────────────────────────────────────────────
function buildZoneProfile(
	seed: string,
	keywords: DfsKeyword[],
	paaQuestions: string[],
	organicTitles: string[]
): ZoneProfile {
	// Defensive: always ensure arrays are safe — guards against undefined from failed API calls
	const safePAA = Array.isArray(paaQuestions) ? paaQuestions : [];
	const safeTitles = Array.isArray(organicTitles) ? organicTitles : [];
	const safeKws = Array.isArray(keywords) ? keywords : [];

	if (safeKws.length === 0) {
		return {
			seed,
			keywords: safeKws,
			paa_questions: safePAA,
			organic_titles: safeTitles,
			total_volume: 0,
			median_kd: 50,
			weighted_cpc: 0,
			keyword_count: 0,
			best_keyword: seed,
			best_keyword_volume: 0,
			best_keyword_kd: 50,
			best_keyword_cpc: 0,
			top_5_keywords: 'No keyword data found',
			has_data: false,
			commercial_score: 0,
			navboost_score: safePAA.length
		};
	}
	const totalVolume = safeKws.reduce((s, k) => s + k.monthly_searches, 0);
	const sorted = [...safeKws].sort((a, b) => a.keyword_difficulty - b.keyword_difficulty);
	const mid = Math.floor(sorted.length / 2);
	const medianKd =
		sorted.length % 2 === 0
			? (sorted[mid - 1].keyword_difficulty + sorted[mid].keyword_difficulty) / 2
			: sorted[mid].keyword_difficulty;
	const weightedCpc =
		totalVolume > 0
			? safeKws.reduce((s, k) => s + k.cpc * k.monthly_searches, 0) / totalVolume
			: safeKws.reduce((s, k) => s + k.cpc, 0) / safeKws.length;
	const best = [...safeKws].sort((a, b) => b.monthly_searches - a.monthly_searches)[0];
	const top5 = safeKws
		.slice(0, 5)
		.map((k) => `"${k.keyword}" vol:${k.monthly_searches} KD:${k.keyword_difficulty} $${k.cpc}`)
		.join(' | ');
	const commercialScore = Math.max(weightedCpc, 0.1) * Math.log10(Math.max(totalVolume, 1) + 1);
	const comparisonSignal = safeTitles.some(
		(t) => t.toLowerCase().includes(' vs ') || t.toLowerCase().includes('alternative')
	)
		? 2
		: 0;
	return {
		seed,
		keywords: safeKws,
		paa_questions: safePAA,
		organic_titles: safeTitles,
		total_volume: totalVolume,
		median_kd: Math.round(medianKd),
		weighted_cpc: Math.round(weightedCpc * 100) / 100,
		keyword_count: safeKws.length,
		best_keyword: best.keyword,
		best_keyword_volume: best.monthly_searches,
		best_keyword_kd: best.keyword_difficulty,
		best_keyword_cpc: best.cpc,
		top_5_keywords: top5,
		has_data: true,
		commercial_score: Math.round(commercialScore * 100) / 100,
		navboost_score: safePAA.length + comparisonSignal
	};
}

function formatZoneForPrompt(z: ZoneProfile, index: number): string {
	if (!z.has_data) {
		return `ZONE ${index + 1}: "${z.seed}"
  Data: NO KEYWORD DATA
  PAA questions (${z.paa_questions.length}): ${z.paa_questions.slice(0, 4).join(' | ') || 'none'}
  Organic titles seen: ${z.organic_titles.slice(0, 3).join(' | ') || 'none'}
  Status: potential AI gap topic`;
	}
	return `ZONE ${index + 1}: "${z.seed}"
  Keywords: ${z.keyword_count} | Monthly searches: ${z.total_volume.toLocaleString()} | Median KD: ${z.median_kd} | CPC: $${z.weighted_cpc}
  Best keyword: "${z.best_keyword}" (vol:${z.best_keyword_volume.toLocaleString()} KD:${z.best_keyword_kd} CPC:$${z.best_keyword_cpc})
  Top 5: ${z.top_5_keywords}
  PAA (${z.paa_questions.length}): ${z.paa_questions.slice(0, 4).join(' | ') || 'none'}
  Organic titles: ${z.organic_titles.slice(0, 3).join(' | ') || 'none'}
  Commercial score: ${z.commercial_score} | Navboost score: ${z.navboost_score}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERP helpers
// ─────────────────────────────────────────────────────────────────────────────
const FORMAT_SIGNALS: Record<DominantFormat, string[]> = {
	'how-to': ['how to', 'step by step', 'guide to', 'tutorial'],
	comparison: ['vs', 'versus', 'compare', 'alternatives', ' or '],
	listicle: ['best ', 'top ', 'ways to', 'tips'],
	review: ['review', 'rating', 'pros and cons'],
	tool: ['calculator', 'tool', 'template', 'generator', 'checker'],
	guide: ['guide', 'complete', 'ultimate', 'comprehensive']
};

function detectDominantFormat(titles: string[]): DominantFormat {
	const scores: Record<DominantFormat, number> = {
		'how-to': 0,
		comparison: 0,
		listicle: 0,
		review: 0,
		tool: 0,
		guide: 0
	};
	const combined = titles.join(' ').toLowerCase();
	for (const [format, signals] of Object.entries(FORMAT_SIGNALS)) {
		signals.forEach((s) => {
			if (combined.includes(s)) scores[format as DominantFormat]++;
		});
	}
	return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as DominantFormat) || 'guide';
}

const HIGH_AUTH_DOMAINS = [
	'wikipedia.org',
	'forbes.com',
	'nytimes.com',
	'wsj.com',
	'healthline.com',
	'webmd.com',
	'investopedia.com',
	'shopify.com',
	'hubspot.com',
	'nerdwallet.com',
	'reddit.com',
	'quora.com',
	'amazon.com',
	'yelp.com',
	'angi.com',
	'homeadvisor.com',
	'thisoldhouse.com',
	'entrepreneur.com',
	'ahrefs.com',
	'moz.com',
	'semrush.com',
	'backlinko.com',
	'neilpatel.com'
];

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/strategy/suggest
// ─────────────────────────────────────────────────────────────────────────────
export const suggestTopics = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const { siteId, seedKeywords, targetId } = req.body as {
			siteId?: string;
			seedKeywords?: string[];
			targetId?: string;
		};
		if (!siteId) return res.status(400).json({ error: 'siteId is required' });

		// Load target
		let target: {
			id: string;
			site_id: string;
			seed_keywords: string[];
			name: string;
			destination_page_url: string | null;
		} | null = null;
		if (targetId) {
			const { data: tr } = await supabase
				.from('targets')
				.select('id, site_id, seed_keywords, name, destination_page_url')
				.eq('id', targetId)
				.single();
			if (!tr || tr.site_id !== siteId)
				return res.status(404).json({ error: 'Target not found or does not belong to site' });
			target = {
				id: tr.id,
				site_id: tr.site_id,
				seed_keywords: Array.isArray(tr.seed_keywords) ? tr.seed_keywords : [],
				name: tr.name ?? '',
				destination_page_url: tr.destination_page_url ?? null
			};
		}

		const seedInput =
			Array.isArray(seedKeywords) && seedKeywords.length > 0
				? seedKeywords
				: target?.seed_keywords?.length
					? target.seed_keywords
					: [];
		const seeds: string[] = seedInput
			.map((s) => (typeof s === 'string' ? s.trim() : ''))
			.filter(Boolean)
			.slice(0, 5);
		if (seeds.length === 0)
			return res.status(400).json({ error: 'At least one seed keyword is required' });

		// Auth + credits
		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();
		if (!userOrg?.organization_id) return res.status(400).json({ error: 'No organization found' });
		const orgId = userOrg.organization_id;

		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', orgId)
			.single();
		const available = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		const cost = CREDIT_COSTS.STRATEGY_GENERATION;
		if (available < cost)
			return res.status(402).json({ error: 'Insufficient credits', required: cost, available });

		const newCredits = Math.max(0, available - cost);
		const { error: deductErr } = await supabase
			.from('organizations')
			.update({
				included_credits_remaining: newCredits,
				...(org?.included_credits != null && { included_credits: newCredits })
			})
			.eq('id', orgId);
		if (deductErr) return res.status(500).json({ error: 'Failed to deduct credits' });

		// Site
		const { data: site } = await supabase
			.from('sites')
			.select('id, name, niche, customer_description, url, domain_authority, competitor_urls')
			.eq('id', siteId)
			.eq('organization_id', orgId)
			.single();
		if (!site) return res.status(404).json({ error: 'Site not found' });

		// GSC impressions
		const { data: perfRows } = await supabase
			.from('performance_data')
			.select('impressions')
			.eq('site_id', siteId);
		const monthlyImpressions = (perfRows ?? []).reduce(
			(s, r) => s + (Number(r.impressions) || 0),
			0
		);
		const tier = getTrafficTier(monthlyImpressions);

		// Dedup existing
		let topicsQuery = supabase.from('topics').select('keyword, title').eq('site_id', siteId);
		if (target) topicsQuery = topicsQuery.eq('target_id', target.id);
		const { data: existingTopics } = await topicsQuery;
		const existingTitles = new Set(
			(existingTopics ?? [])
				.map((t) => (t.title ?? t.keyword ?? '').toLowerCase().trim())
				.filter(Boolean)
		);

		// Moz DA refresh
		let da = Number(site.domain_authority ?? 0);
		try {
			const mozResult = await fetchDomainAuthority(site.url);
			if (mozResult.method !== 'not_configured' && mozResult.method !== 'error') {
				da = mozResult.da;
				void supabase
					.from('sites')
					.update({ domain_authority: da })
					.eq('id', siteId)
					.then(() => console.log(`[Strategy] DA: ${da}`));
			}
		} catch {
			/* non-fatal */
		}

		const isNewDomain = da <= 5;
		const noImpressionsYet = monthlyImpressions === 0;
		const competitorUrls: string[] = Array.isArray(site.competitor_urls)
			? site.competitor_urls
			: [];
		const tierNote = noImpressionsYet
			? `New/low-authority site (DA ${da}). Prioritize low-competition — high-volume head terms are unrealistic.`
			: `DA ${da}, tier ${tier.label} (${tier.minDaily}–${tier.maxDaily} daily impressions).`;
		const destContext = target?.destination_page_url
			? `Destination page: ${target.destination_page_url}`
			: '';

		console.log(
			`[Strategy] v5.0 | Seeds: "${seeds.join('", "')}" | DA: ${da} | Tier: ${tier.label}`
		);

		// =====================================================================
		// PHASE 1 — COMPETITIVE LANDSCAPE MAPPING
		// AI maps the category into specific zone seeds using domain knowledge.
		// These are actual sub-topic areas, not modifier variants of the seed.
		// =====================================================================
		console.log('[Strategy] Phase 1: competitive landscape mapping');

		const landscapeRaw = await ai(
			`You are a senior SEO strategist mapping the COMPLETE competitive landscape of a topic category.

Your job: given a business and its seed keywords, identify ALL the distinct topic ZONES within
this category — every specific sub-topic that people actively search for.

Zone seeds are used as DataForSEO search queries. Each must be:
- A specific, searchable phrase (not a broad head term like "seo" or "marketing")
- Representing a DISTINCT user intent — not a variation of another zone
- Phrased the way a searcher actually types it

IMPORTANT: Be EXHAUSTIVE. Cover every angle of the category. Do not stop at the obvious ones.
For broad categories, you should always return 15-18 zones. Missing a zone means missing a
topic opportunity for the user. It is better to return too many than too few.

FULL EXAMPLE — "ecommerce seo" (broad category → 18 zones):
"shopify product page seo", "ecommerce category page optimization",
"duplicate product descriptions seo", "faceted navigation seo crawl budget",
"ecommerce schema markup", "product image alt text seo",
"ecommerce internal linking", "online store page speed optimization",
"ecommerce link building", "local seo ecommerce store",
"woocommerce seo", "ecommerce technical seo audit",
"ecommerce site architecture seo", "product page conversion seo",
"ecommerce blog content strategy", "seasonal seo ecommerce",
"international ecommerce seo", "ecommerce keyword research"

FULL EXAMPLE — "private investigator" (medium category → 10 zones):
"surveillance investigation services", "infidelity investigation private investigator",
"background check investigator", "cyber crime investigation services",
"bug sweep hidden camera detection", "missing persons investigator",
"insurance fraud investigation", "corporate espionage investigation",
"private investigator cost", "private investigator laws"

FULL EXAMPLE — "hydrating moisturizer" (narrow category → 6 zones):
"moisturizer for dry skin", "hyaluronic acid moisturizer",
"moisturizer for sensitive skin", "lightweight hydrating moisturizer",
"moisturizer vs serum hydration", "best moisturizer ingredients"

Category breadth rules:
- narrow (single product/ingredient/service): 5-8 zones
- medium (product line/service category): 8-12 zones
- broad (full discipline/domain/industry): 12-16 zones

IMPORTANT: Each zone seed will be searched in DataForSEO. Zones that are too niche or
too long-tail will return 0 keywords. Prefer zone seeds that are specific enough to be
focused but common enough that people actually search for them as a category.
Bad zone (too obscure): "ecommerce hreflang tag implementation for international stores"
Good zone (searchable): "international ecommerce seo"
Bad zone: "ecommerce javascript rendering seo issues"
Good zone: "ecommerce technical seo audit"
Quality over quantity — 12 searchable zones beat 18 obscure ones.

Return ONLY valid JSON, no markdown.`,
			`Business: ${site.name}
Niche: ${site.niche}
Customer: ${site.customer_description || 'general audience'}
Seed keywords: ${seeds.join(', ')}
${destContext}

Map the distinct topic zones in this category. For broad categories, return 12-16 zones.
For medium categories, return 8-12 zones. For narrow, return 5-8 zones.
Prioritize zones that are specific enough to be focused but common enough to return
keyword data — avoid overly technical or niche phrases that nobody searches directly.

Return:
{
  "category_breadth": "narrow|medium|broad",
  "breadth_reasoning": "1 sentence why — include how many zones you identified",
  "zone_seeds": ["all zone seeds — push toward the maximum for the breadth level"],
  "high_commercial_zones": ["3-5 zone seeds most likely high CPC / commercial intent"],
  "high_navboost_zones": ["2-4 zone seeds likely to produce long-session content"]
}`,
			1500
		);

		const landscape = parseJSON<{
			category_breadth: CategoryBreadth;
			breadth_reasoning: string;
			zone_seeds: string[];
			high_commercial_zones: string[];
			high_navboost_zones: string[];
		}>(landscapeRaw, {
			category_breadth: 'medium',
			breadth_reasoning: 'Defaulted.',
			zone_seeds: seeds,
			high_commercial_zones: [],
			high_navboost_zones: []
		});

		// Always include the user's original seeds
		const allZoneSeeds = [...new Set([...seeds, ...landscape.zone_seeds])].slice(0, 16);
		console.log(
			`[Strategy] Phase 1: breadth=${landscape.category_breadth} | ${allZoneSeeds.length} zones`
		);

		// =====================================================================
		// PHASE 2 — PARALLEL KEYWORD RESEARCH
		// All three sources fire simultaneously for every zone.
		// Results kept grouped by zone seed — NOT flattened.
		// =====================================================================
		console.log('[Strategy] Phase 2: parallel keyword research');

		// A) DataForSEO per zone (cap 12 for cost control)
		const dfsZoneSeeds = allZoneSeeds.slice(0, 16); // up to 16 zones queried ($0.0001/keyword, ~$0.01/zone)
		let dataForSeoConfigured = false;

		const dfsZoneResults = await Promise.allSettled(
			dfsZoneSeeds.map((seed) => getKeywordSuggestions(seed, { limit: 50 }))
		);

		const rawKeywordsByZone: Record<string, DfsKeyword[]> = {};
		dfsZoneResults.forEach((r) => {
			if (r.status !== 'fulfilled') return;
			const { seed, keywords, configured } = r.value;
			if (configured) dataForSeoConfigured = true;
			rawKeywordsByZone[seed] = keywords;
		});

		// B+C) SERP + PAA per zone simultaneously
		const serpZoneResults = await Promise.allSettled(
			allZoneSeeds.slice(0, 18).map((seed) => serperSearch(seed, 10))
		);

		const paaByZone: Record<string, string[]> = {};
		const organicTitlesByZone: Record<string, string[]> = {};
		const allPAASignals: string[] = [];
		const allRelatedSignals: string[] = [];

		serpZoneResults.forEach((r, idx) => {
			if (r.status !== 'fulfilled') return;
			const seed = allZoneSeeds[idx];
			const data = r.value;
			paaByZone[seed] = (data.peopleAlsoAsk ?? []).map((p) => p.question).filter(Boolean);
			organicTitlesByZone[seed] = (data.organic ?? [])
				.slice(0, 7)
				.map((o) => o.title)
				.filter(Boolean);
			allPAASignals.push(...paaByZone[seed]);
			(data.relatedSearches ?? []).forEach((q) => {
				if (q.query) allRelatedSignals.push(q.query);
			});
		});

		const uniquePAA = [...new Set(allPAASignals)].slice(0, 60);
		const uniqueRelated = [...new Set(allRelatedSignals)].slice(0, 40);
		console.log(
			`[Strategy] Phase 2: ${Object.keys(rawKeywordsByZone).length} DFS zones | PAA: ${uniquePAA.length}`
		);

		// =====================================================================
		// PHASE 3 — ZONE PROFILING
		// Compute real aggregate metrics per zone from DataForSEO results.
		// De-dup globally (keyword assigned to first zone it appears in).
		// =====================================================================
		console.log('[Strategy] Phase 3: zone profiling');

		const globalSeenKws = new Set<string>();
		const deduplicatedByZone: Record<string, DfsKeyword[]> = {};

		for (const seed of allZoneSeeds) {
			const raw = rawKeywordsByZone[seed] ?? [];
			const deduped: DfsKeyword[] = [];
			for (const kw of raw) {
				if (!globalSeenKws.has(kw.keyword)) {
					globalSeenKws.add(kw.keyword);
					deduped.push(kw);
				}
			}
			deduplicatedByZone[seed] = deduped.filter((k) => {
				const wc = k.keyword.trim().split(/\s+/).length;
				if (wc < 2) return false;
				if (k.keyword_difficulty > 65) return false;
				if (k.monthly_searches > 100_000 && k.keyword_difficulty > 40) return false;
				return true;
			});
		}

		const zoneProfiles: ZoneProfile[] = allZoneSeeds.map((seed) =>
			buildZoneProfile(
				seed,
				deduplicatedByZone[seed] ?? [],
				paaByZone[seed] ?? [],
				organicTitlesByZone[seed] ?? []
			)
		);

		// Flat keyword pool for Phase 7 exclusive assignment
		const allDfsKeywords: DfsKeyword[] = zoneProfiles.flatMap((z) => z.keywords);
		const strongZones = zoneProfiles.filter((z) => z.has_data && z.keyword_count > 0);
		const weakZones = zoneProfiles.filter((z) => !z.has_data || z.keyword_count === 0);

		console.log(
			`[Strategy] Phase 3: ${strongZones.length} strong | ${weakZones.length} gap zones | ${allDfsKeywords.length} keywords`
		);

		// =====================================================================
		// DATAFORSEO HARD STOP — Option A
		//
		// If DataForSEO is configured (credentials present) but returned 0 keywords
		// across ALL zones, the account is out of funds or the API is down.
		// A strategy with no keyword data has 0 volume, 0% KD, $0.00 CPC on every
		// topic — this is misleading and damages user trust.
		//
		// Action: refund credits, abort with a clear error message.
		// The user can add DataForSEO funds and regenerate — no data is lost.
		//
		// We only abort when DataForSEO is CONFIGURED but broken.
		// If it was never configured (no credentials), we allow PAA/SERP-only runs
		// since that's an intentional setup choice, not a payment failure.
		// =====================================================================
		if (dataForSeoConfigured && allDfsKeywords.length === 0) {
			console.error(
				`[Strategy] ABORT: DataForSEO configured but returned 0 keywords across ` +
					`${dfsZoneSeeds.length} zones. Likely cause: account balance is zero (402) ` +
					`or API is down. Refunding ${cost} credits to org ${orgId}.`
			);

			// Refund credits via credit_back_action (same as billing admin — audit trail + proper credit restoration)
			const { data: refundData, error: refundErr } = await supabase.rpc('credit_back_action', {
				p_org_id: orgId,
				p_action_key: 'strategy_generation',
				p_credits: cost,
				p_reason: 'DataForSEO returned no keyword data — keyword research account may need top-up'
			});

			if (refundErr) {
				console.error(
					'[Strategy] CRITICAL: Failed to refund credits after DataForSEO failure:',
					refundErr.message
				);
			} else {
				console.log(
					`[Strategy] Credits refunded via credit_back_action: ${cost} credits returned to org ${orgId}`,
					refundData ? ` (refund_id: ${(refundData as { refund_id?: string })?.refund_id})` : ''
				);
				// In-app notification (no toast) — appears in notification panel
				await createNotificationForUser(userId, orgId, {
					title: 'Strategy generation failed',
					message: `Strategy generation failed and ${cost} credits were refunded. The keyword research account may need to be topped up.`,
					type: 'strategy_refund',
					priority: 'high',
					action_url: '/strategy',
					metadata: { credits_refunded: cost, reason: 'keyword_data_unavailable' },
					skipToast: true
				});
			}

			return res.status(503).json({
				error: 'keyword_data_unavailable',
				message:
					"We couldn't pull keyword data for your strategy right now. " +
					'This is usually because the keyword research account needs to be topped up. ' +
					"Your credits have been fully refunded — you haven't been charged. " +
					'Please try again once the issue is resolved.',
				creditsRefunded: cost,
				creditsRemaining: available
			});
		}

		// NDJSON streaming — set headers after all early returns
		res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('X-Accel-Buffering', 'no');

		writeNdjson(res, { type: 'step', id: 'authority' });
		writeNdjson(res, { type: 'step', id: 'keywords' });
		writeNdjson(res, { type: 'step', id: 'google' });

		// =====================================================================
		// PHASE 4 — COMPETITOR GAP ANALYSIS
		// =====================================================================
		console.log('[Strategy] Phase 4: competitor gap analysis');

		const competitorContent: string[] = [];
		const competitorDomains: string[] = [];

		await Promise.allSettled(
			competitorUrls.slice(0, 3).map(async (url) => {
				const domain = url
					.replace(/^https?:\/\//, '')
					.replace(/^www\./, '')
					.split('/')[0];
				competitorDomains.push(domain);
				const { organic } = await serperSearch(`site:${domain}`, 10);
				const titles = (organic ?? [])
					.slice(0, 10)
					.map((o) => o.title)
					.filter(Boolean);
				if (titles.length) competitorContent.push(`${domain}: ${titles.join(' | ')}`);
			})
		);
		writeNdjson(res, { type: 'step', id: 'competitors' });

		// =====================================================================
		// PHASE 5 — AI TOPIC SYNTHESIS (data-first, IGS-gated)
		//
		// Claude receives full zone profiles with real computed metrics.
		// For strong zones: derives topic FROM keyword cluster data.
		// For weak zones: AI-backed suggestion with PAA/SERP justification.
		// primary_keyword must come from the zone's actual DataForSEO data.
		// =====================================================================
		console.log('[Strategy] Phase 5: AI topic synthesis from zone data');

		const authNote = isNewDomain
			? `New site (DA ${da}). Achievable=KD≤15. BuildToward=KD 16-30. Locked=KD>30.`
			: `DA ${da}. Achievable=KD≤${da + 10}. BuildToward=KD ${da + 11}-${da + 25}. Locked=KD>${da + 25}.`;

		// Note: if DataForSEO is NOT configured at all (no credentials), strongZones
		// may be 0 but we continue — that's an intentional no-credentials setup.
		// The hard abort above handles the configured-but-broken case.
		const zonesBriefing = zoneProfiles.map((z, i) => formatZoneForPrompt(z, i)).join('\n\n');

		const synthesisRaw = await ai(
			`You are a senior SEO strategist analyzing real keyword research data to build a content strategy.
You have zone profiles — each zone is a sub-topic area with real DataForSEO keyword data.

YOUR JOB:
For each strong zone (has keyword data): synthesize a MoFu focus page topic derived FROM the data.
For weak zones (no data but PAA/SERP signal): suggest an AI-backed topic with explicit reasoning.

CRITICAL RULES:
1. The topic title must represent what the keyword data SHOWS people are searching for
2. primary_keyword MUST be an exact keyword from that zone's DataForSEO results
3. primary_keyword_volume/kd/cpc MUST match that keyword's real DataForSEO values
4. Do NOT invent keywords. If a zone has no data, use the best_keyword field and mark as paa_backed/ai_suggested

TOPIC TITLE RULES:
- mofu_article: "How to [action]", "[X] for [specific audience/situation]", "[X] Guide for [use case]"
- mofu_comparison: "[X] vs [Y]", "[X] Alternatives", "Compare [X] Options"
- Avoid: "Complete Guide", "Everything About", "Best X" (overused, low IGS)

IGS FEASIBILITY [US20190155948A1 — Helpful Content Update]:
- "strong": business has genuine first-hand data/experience/expertise specific to this topic
- "borderline": some angle possible but requires effort to differentiate from generic content
- "failed": dominated by major authorities; business cannot add original value — SKIP THESE

NAVBOOST POTENTIAL [US8595225B1 — DOJ confirmed most important ranking signal]:
- "high": comparison/decision content, 5+ PAA questions, commercial proximity → long dwell
- "medium": moderate engagement depth expected
- "low": quick informational, user leaves fast

DATA CONFIDENCE:
- "data_backed": zone has keyword data (keyword_count > 0) — PREFERRED
- "paa_backed": no keyword data but 4+ PAA questions confirming real user demand
- "ai_suggested": minimal signals — only use to fill genuine gaps, NOT as padding

TOPIC COUNT RULE — DATA FIRST:
The strategy must be built on hard data, not inflated with AI guesses.

STEP 1: Include ALL strong zones (has keyword data, keyword_count > 0). These are the spine.
STEP 2: Include paa_backed zones ONLY if they cover a genuinely distinct angle not already
  covered by a strong zone, AND have 4+ PAA questions as evidence of real demand.
STEP 3: Include ai_suggested topics ONLY to fill critical gaps where:
  - The business clearly serves this need (e.g. a Shopify SEO tool covering WooCommerce)
  - AND no strong zone already covers this angle
  - AND there is at least some PAA or organic title signal
  - MAXIMUM 2-3 ai_suggested topics regardless of category breadth

TOPIC CAPS BY BREADTH:
- narrow: 4-6 total (mostly data_backed)
- medium: 6-10 total (mostly data_backed, 1-2 gap fills)
- broad: 8-14 total (mostly data_backed, 2-3 gap fills max)

SKIP a zone if ANY of these are true:
- Zero keyword data AND fewer than 4 PAA questions AND no strong organic title signal
- Topic is already covered by another stronger zone in this list
- No meaningful commercial connection to this business
- You would only include it to hit a target number — do NOT pad

QUALITY OVER QUANTITY. 8 data-backed topics beat 18 half-empty ones.
A user acting on hollow AI suggestions wastes real time and effort with no results.

Return ONLY valid JSON array, no markdown.`,
			`Business: ${site.name} | Niche: ${site.niche}
Customer: ${site.customer_description || 'general audience'}
${authNote}
${tierNote}
${destContext}

ZONE PROFILES (real keyword research):
${zonesBriefing}

ALL PAA QUESTIONS:
${uniquePAA.slice(0, 30).join('\n')}

RELATED SEARCHES:
${uniqueRelated.slice(0, 20).join(' | ')}

COMPETITOR CONTENT:
${competitorContent.join('\n') || 'None available'}

HIGH COMMERCIAL ZONES: ${landscape.high_commercial_zones.join(', ')}
HIGH NAVBOOST ZONES: ${landscape.high_navboost_zones.join(', ')}

Existing topics to skip: ${existingTitles.size > 0 ? [...existingTitles].join(', ') : 'none'}

For each valid zone return:
[
  {
    "title": "MoFu focus page title derived from the keyword data",
    "primary_keyword": "exact keyword from this zone's DataForSEO results",
    "primary_keyword_volume": 0,
    "primary_keyword_kd": 0,
    "primary_keyword_cpc": 0.0,
    "topic_description": "1 sentence: what content lives here and why it serves this business",
    "example_keywords": ["3-5 real keywords from the zone's DataForSEO data"],
    "funnel_stage": "mofu",
    "mofu_type": "mofu_article|mofu_comparison",
    "igs_feasibility": "strong|borderline|failed",
    "original_angle": "specific: what first-hand data, experience, or expertise this business has for THIS topic",
    "navboost_potential": "high|medium|low",
    "data_confidence": "data_backed|paa_backed|ai_suggested",
    "source_zone": "the zone seed this came from",
    "tier": "unlocked|locked",
    "discovery_sources": ["seed|keyword_research|google_paa|competitor_gap|ai_brainstorm"]
  }
]`,
			6000
		);

		let synthesizedTopics = parseJSON<SynthesizedTopic[]>(synthesisRaw, []);

		// Fallback if parse fails
		if (synthesizedTopics.length === 0) {
			synthesizedTopics = zoneProfiles
				.filter((z) => z.has_data && z.keyword_count > 0)
				.slice(0, 10)
				.map((z) => ({
					title: z.seed.charAt(0).toUpperCase() + z.seed.slice(1),
					primary_keyword: z.best_keyword,
					primary_keyword_volume: z.best_keyword_volume,
					primary_keyword_kd: z.best_keyword_kd,
					primary_keyword_cpc: z.best_keyword_cpc,
					topic_description: `Content about ${z.seed} for ${site.niche}`,
					example_keywords: z.keywords.slice(0, 3).map((k) => k.keyword),
					funnel_stage: 'mofu',
					mofu_type: 'mofu_article' as const,
					igs_feasibility: 'borderline' as IgsFeasibility,
					original_angle: `First-hand experience from ${site.name}`,
					navboost_potential:
						z.navboost_score >= 4
							? 'high'
							: z.navboost_score >= 2
								? 'medium'
								: ('low' as NavboostPotential),
					data_confidence: 'data_backed' as DataConfidence,
					source_zone: z.seed,
					tier: 'unlocked' as const,
					discovery_sources: ['keyword_research']
				}));
		}

		// Exclude IGS-failed and existing
		synthesizedTopics = synthesizedTopics.filter(
			(tc) => tc.igs_feasibility !== 'failed' && !existingTitles.has(tc.title.toLowerCase().trim())
		);

		// Lookup map for zone data — used by quality gate and zero-patch below
		const zoneProfileMap = new Map(zoneProfiles.map((z) => [z.seed, z]));

		// ── Zero-patch: restore real numbers if Claude returned 0s ───────────────
		// Claude sometimes copies the template placeholder (0) instead of the real
		// zone data value. Patch from zone profile before quality gate runs.
		synthesizedTopics = synthesizedTopics.map((tc) => {
			const zone = zoneProfileMap.get(tc.source_zone);
			if (!zone || !zone.has_data) return tc;
			const vol =
				tc.primary_keyword_volume > 0 ? tc.primary_keyword_volume : zone.best_keyword_volume;
			const kd = tc.primary_keyword_kd > 0 ? tc.primary_keyword_kd : zone.best_keyword_kd;
			const cpc = tc.primary_keyword_cpc > 0 ? tc.primary_keyword_cpc : zone.best_keyword_cpc;
			const kw = tc.primary_keyword?.trim() ? tc.primary_keyword : zone.best_keyword;
			if (
				vol !== tc.primary_keyword_volume ||
				kd !== tc.primary_keyword_kd ||
				cpc !== tc.primary_keyword_cpc
			) {
				console.log(
					`[Strategy] Zero-patch "${tc.title}": vol ${tc.primary_keyword_volume}→${vol} KD ${tc.primary_keyword_kd}→${kd} CPC ${tc.primary_keyword_cpc}→${cpc}`
				);
			}
			return {
				...tc,
				primary_keyword: kw,
				primary_keyword_volume: vol,
				primary_keyword_kd: kd,
				primary_keyword_cpc: cpc
			};
		});

		// ── Data quality gate ────────────────────────────────────────────────────
		// AI-suggested topics with no PAA signal and no volume are hollow padding.
		// They waste the user's credit budget and provide no rankable direction.
		// Rules:
		//   - data_backed topics: always keep (real keyword data)
		//   - paa_backed topics: keep only if 3+ PAA questions for this zone
		//   - ai_suggested topics: max 3 total, only if zone has PAA or organic signal
		// ─────────────────────────────────────────────────────────────────────────
		const dataBackedTopics = synthesizedTopics.filter((tc) => tc.data_confidence === 'data_backed');
		const paaBackedTopics = synthesizedTopics.filter((tc) => {
			if (tc.data_confidence !== 'paa_backed') return false;
			const zone = zoneProfileMap.get(tc.source_zone);
			return (zone?.paa_questions.length ?? 0) >= 3;
		});
		const aiSuggestedTopics = synthesizedTopics
			.filter((tc) => {
				if (tc.data_confidence !== 'ai_suggested') return false;
				const zone = zoneProfileMap.get(tc.source_zone);
				// Must have at least some signal — PAA or organic titles
				const hasPAA = (zone?.paa_questions.length ?? 0) >= 2;
				const hasOrganic = (zone?.organic_titles.length ?? 0) >= 2;
				return hasPAA || hasOrganic;
			})
			.slice(0, 3); // hard cap: max 3 AI-suggested topics

		const beforeFilter = synthesizedTopics.length;
		synthesizedTopics = [...dataBackedTopics, ...paaBackedTopics, ...aiSuggestedTopics];

		console.log(
			`[Strategy] Phase 5: ${synthesizedTopics.length} topics after quality gate ` +
				`(${dataBackedTopics.length} data-backed | ${paaBackedTopics.length} paa-backed | ` +
				`${aiSuggestedTopics.length} ai-suggested | ${beforeFilter - synthesizedTopics.length} cut as hollow)`
		);
		writeNdjson(res, { type: 'step', id: 'brainstorm' });

		// =====================================================================
		// PHASE 6 — PER-TOPIC SERP RESEARCH
		// =====================================================================
		console.log('[Strategy] Phase 6: per-topic SERP research');

		const SERP_BATCH = 2;
		const serpResearchResults: PromiseSettledResult<TopicResearch>[] = [];

		for (let i = 0; i < synthesizedTopics.length; i += SERP_BATCH) {
			const batch = synthesizedTopics.slice(i, i + SERP_BATCH);
			const batchResults = await Promise.allSettled(
				batch.map(async (tc): Promise<TopicResearch> => {
					const kw = tc.primary_keyword || tc.title;
					const [serp, ati] = await Promise.all([
						serperSearch(kw, 10),
						serperSearch(`allintitle:${kw}`, 1)
					]);
					const items = serp.organic ?? [];
					const topDomains = items
						.slice(0, 7)
						.map((o) => {
							try {
								return new URL(o.link).hostname.replace('www.', '');
							} catch {
								return '';
							}
						})
						.filter(Boolean);
					const topTitles = items
						.slice(0, 7)
						.map((o) => o.title)
						.filter(Boolean);
					const paas = (serp.peopleAlsoAsk ?? []).map((p) => p.question).filter(Boolean);
					const hasOriginalDataInTop5 = topTitles.some((t) =>
						[
							'study',
							'survey',
							'data',
							'research',
							'found that',
							'analyzed',
							'tested',
							'experiment'
						].some((sig) => t.toLowerCase().includes(sig))
					);
					return {
						title: tc.title,
						primaryKw: kw,
						topDomains,
						topTitles,
						highAuthCount: topDomains.filter((d) => HIGH_AUTH_DOMAINS.some((h) => d.includes(h)))
							.length,
						paaDepth: paas.length,
						paaQuestions: paas.slice(0, 8),
						relatedDepth: (serp.relatedSearches ?? []).length,
						allintitleCount: parseSearchResultCount(ati.searchInformation?.totalResults),
						hasLocalResults: topDomains.some((d) =>
							['yelp', 'angi', 'homeadvisor', 'houzz', 'thumbtack', 'bark'].some((l) =>
								d.includes(l)
							)
						),
						dominantFormat: detectDominantFormat(topTitles),
						hasOriginalDataInTop5
					};
				})
			);
			serpResearchResults.push(...batchResults);
			if (i + SERP_BATCH < synthesizedTopics.length) await sleep(350);
		}

		const researchMap: Record<string, TopicResearch> = {};
		serpResearchResults.forEach((r) => {
			if (r.status === 'fulfilled') researchMap[r.value.title] = r.value;
		});

		// Refine navboost_potential with real PAA depth
		synthesizedTopics = synthesizedTopics.map((tc) => {
			const rd = researchMap[tc.title];
			if (!rd) return tc;
			let navboost = tc.navboost_potential;
			if (rd.paaDepth >= 6) navboost = 'high';
			else if (rd.paaDepth >= 3 && navboost !== 'high') navboost = 'medium';
			else if (rd.paaDepth <= 1 && navboost === 'high') navboost = 'medium';
			return { ...tc, navboost_potential: navboost };
		});

		console.log(`[Strategy] Phase 6: ${Object.keys(researchMap).length} topics SERP-researched`);
		writeNdjson(res, { type: 'step', id: 'validate' });
		writeNdjson(res, { type: 'step', id: 'competition' });

		// =====================================================================
		// PHASE 7 — REAL METRICS + PRIORITY SCORING
		// Exclusive keyword-to-topic assignment (two-pass).
		// Falls back to Phase 5 primary_keyword data for topics with no assignment.
		// =====================================================================
		console.log('[Strategy] Phase 7: metrics + priority scoring');

		const dfsKeywordMap = new Map<string, DfsKeyword>();
		allDfsKeywords.forEach((k) => dfsKeywordMap.set(k.keyword.toLowerCase(), k));

		const topicRealKeywords: Record<string, DfsKeyword[]> = {};
		synthesizedTopics.forEach((tc) => {
			topicRealKeywords[tc.title] = [];
		});

		const assignedKeywords = new Set<string>();
		const STOPWORDS = new Set([
			'the',
			'and',
			'for',
			'with',
			'how',
			'what',
			'why',
			'are',
			'you',
			'your',
			'our',
			'its',
			'this',
			'that',
			'best',
			'top'
		]);

		const topicSigWords = synthesizedTopics.map((tc) => {
			const words = new Set(
				[
					...tc.title.toLowerCase().split(/\s+/),
					...tc.primary_keyword.toLowerCase().split(/\s+/),
					...(tc.example_keywords ?? []).flatMap((ek) => ek.toLowerCase().split(/\s+/))
				].filter((w) => w.length > 2 && !STOPWORDS.has(w))
			);
			return { title: tc.title, words };
		});

		const wordTopicCount = new Map<string, number>();
		topicSigWords.forEach(({ words }) => {
			words.forEach((w) => wordTopicCount.set(w, (wordTopicCount.get(w) ?? 0) + 1));
		});
		const genericWords = new Set(
			[...wordTopicCount.entries()]
				.filter(([, c]) => c >= synthesizedTopics.length - 1)
				.map(([w]) => w)
		);

		// Pass 1: exact
		synthesizedTopics.forEach((tc) => {
			const addExact = (kw: string) => {
				const match = dfsKeywordMap.get(kw.toLowerCase());
				if (match && !assignedKeywords.has(match.keyword)) {
					topicRealKeywords[tc.title].push(match);
					assignedKeywords.add(match.keyword);
				}
			};
			addExact(tc.primary_keyword);
			(tc.example_keywords ?? []).forEach(addExact);
		});

		// Pass 2: scored exclusive
		allDfsKeywords.forEach((k) => {
			if (assignedKeywords.has(k.keyword)) return;
			const kWords = k.keyword
				.toLowerCase()
				.split(/\s+/)
				.filter((w) => w.length > 2 && !STOPWORDS.has(w) && !genericWords.has(w));
			if (kWords.length === 0) return;
			let bestTopic = '',
				bestScore = 0;
			synthesizedTopics.forEach((tc) => {
				const sig = topicSigWords.find((s) => s.title === tc.title)!;
				let score = 0;
				kWords.forEach((w) => {
					if (sig.words.has(w)) score += 3;
					else if ([...sig.words].some((sw) => sw.includes(w) || w.includes(sw))) score += 1;
				});
				if (score > bestScore) {
					bestScore = score;
					bestTopic = tc.title;
				}
			});
			if (bestTopic && bestScore >= 3 && topicRealKeywords[bestTopic].length < 60) {
				topicRealKeywords[bestTopic].push(k);
				assignedKeywords.add(k.keyword);
			}
		});

		// Multipliers
		const NAV_MULT: Record<NavboostPotential, number> = { high: 1.3, medium: 1.0, low: 0.7 };
		const IGS_MULT: Record<IgsFeasibility, number> = { strong: 1.0, borderline: 0.8, failed: 0.0 };
		const CONF_MULT: Record<DataConfidence, number> = {
			data_backed: 1.0,
			paa_backed: 0.9,
			ai_suggested: 0.75
		};

		// Topic summaries for Phase 8
		const topicSummaries = synthesizedTopics
			.map((tc) => {
				const realKws = topicRealKeywords[tc.title] ?? [];
				const metrics = aggregateTopicMetrics(realKws);
				const d = researchMap[tc.title];
				const vol =
					metrics.monthly_searches > 0 ? metrics.monthly_searches : tc.primary_keyword_volume;
				const kd = metrics.keyword_count > 0 ? metrics.keyword_difficulty : tc.primary_keyword_kd;
				const cpc = metrics.cpc > 0 ? metrics.cpc : tc.primary_keyword_cpc;
				const comp = kd < 20 ? 'low' : kd < 40 ? 'medium' : 'high';
				return `"${tc.title}"
  Confidence: ${tc.data_confidence} | Navboost: ${tc.navboost_potential} | IGS: ${tc.igs_feasibility}
  Vol: ${vol.toLocaleString()}/mo | KD: ${kd} (${comp}) | CPC: $${cpc}
  Original angle: ${tc.original_angle}
  PAA: ${d?.paaDepth ?? 0} questions | Format: ${d?.dominantFormat ?? 'unknown'} | Competitors with original data: ${d?.hasOriginalDataInTop5 ? 'yes' : 'no'}`;
			})
			.join('\n\n');

		writeNdjson(res, { type: 'step', id: 'metrics' });

		// =====================================================================
		// PHASE 8 — AI REASONING
		// =====================================================================
		console.log('[Strategy] Phase 8: AI reasoning');

		const reasoningRaw = await ai(
			`You are a friendly content coach helping a small business owner understand their content strategy.
Plain everyday English. Zero SEO jargon.

Write:
1. "rationale" — 2-3 sentences. What's the plan? Why these topics? What's achievable now vs later?
   Reference the original angles to make it feel concrete and specific to THIS business.
2. "ai_reasoning" per topic — 1 sentence. Why this topic for THIS specific business.
   If confidence is "ai_suggested", say it's based on questions people are asking.

NEVER say: DA, KD, SERP, CTR, backlinks, domain authority, keyword difficulty, Navboost, IGS.
Write like texting a friend who owns a small business.
Return ONLY valid JSON, no markdown.`,
			`${authNote}
Business: ${site.name} | Niche: ${site.niche}
Category: ${landscape.category_breadth} — ${landscape.breadth_reasoning}

TOPICS:
${topicSummaries}

Return: { "rationale": "2-3 sentences", "topics": [{ "title": "exact title", "ai_reasoning": "1 sentence" }] }`,
			3000
		);

		const reasoningByTitle: Record<string, string> = {};
		let strategyRationale = '';
		try {
			const parsed = JSON.parse((reasoningRaw ?? '{}').replace(/```json\n?|\n?```/g, '').trim());
			strategyRationale = parsed.rationale ?? '';
			(parsed.topics ?? []).forEach((t: { title: string; ai_reasoning: string }) => {
				reasoningByTitle[t.title] = t.ai_reasoning ?? '';
			});
		} catch {
			console.error('[Strategy] Phase 8 parse error:', (reasoningRaw ?? '').slice(0, 200));
		}

		writeNdjson(res, { type: 'step', id: 'rank' });

		// =====================================================================
		// FINALIZE
		// =====================================================================
		const suggestions = synthesizedTopics
			.filter((tc) => !existingTitles.has((tc.title ?? '').toLowerCase().trim()))
			.map((tc) => {
				const realKws = topicRealKeywords[tc.title] ?? [];
				const metrics = aggregateTopicMetrics(realKws);
				const d = researchMap[tc.title];

				// Real metrics first; fall back to Phase 5 zone-derived values
				const monthly_searches =
					metrics.monthly_searches > 0 ? metrics.monthly_searches : tc.primary_keyword_volume;
				const keyword_difficulty =
					metrics.keyword_count > 0 ? metrics.keyword_difficulty : tc.primary_keyword_kd;
				const cpc = metrics.cpc > 0 ? metrics.cpc : tc.primary_keyword_cpc;
				const keyword_count =
					metrics.keyword_count > 0 ? metrics.keyword_count : realKws.length || 1;

				const authority_fit = computeAuthorityFit(keyword_difficulty, da);
				const navMult = NAV_MULT[tc.navboost_potential] ?? 1.0;
				const igsMult = IGS_MULT[tc.igs_feasibility] ?? 0.8;
				const confMult = CONF_MULT[tc.data_confidence] ?? 0.75;

				const priority_score = computePriorityScore(
					cpc,
					monthly_searches,
					keyword_difficulty,
					tc.funnel_stage ?? 'mofu',
					authority_fit,
					monthlyImpressions,
					navMult * confMult,
					igsMult
				);

				const rawSources = tc.discovery_sources ?? [];
				const discovery_source = rawSources.includes('seed')
					? 'seed'
					: rawSources.includes('competitor_gap')
						? 'competitor_gap'
						: rawSources.includes('google_paa')
							? 'google_paa'
							: rawSources.includes('keyword_research')
								? 'keyword_research'
								: 'ai_brainstorm';

				const allintitleCount = d?.allintitleCount ?? 0;
				const kgr_score =
					monthly_searches > 0 && allintitleCount > 0
						? Math.round((allintitleCount / monthly_searches) * 1000) / 1000
						: null;

				return {
					title: tc.title,
					keyword: tc.primary_keyword,
					keyword_count,
					monthly_searches,
					keyword_difficulty,
					cpc,
					funnel_stage: tc.funnel_stage,
					mofu_type: tc.mofu_type,
					authority_fit,
					priority_score,
					kgr_score,
					allintitle_count: allintitleCount,
					data_source: d ? 'serp_researched' : 'zone_computed',
					data_confidence: tc.data_confidence,
					discovery_source,
					navboost_potential: tc.navboost_potential,
					igs_feasibility: tc.igs_feasibility,
					original_angle: tc.original_angle,
					dominant_format: d?.dominantFormat ?? 'guide',
					has_original_data_in_top5: d?.hasOriginalDataInTop5 ?? false,
					paa_questions: d?.paaQuestions ?? [],
					ai_reasoning:
						reasoningByTitle[tc.title] ??
						(tc.data_confidence === 'data_backed'
							? `Found ${keyword_count} related keywords people are searching for in this area.`
							: tc.data_confidence === 'paa_backed'
								? 'Based on questions people are actively asking Google about this topic.'
								: 'AI-identified gap — shows demand signals not yet tracked by keyword tools.')
				};
			})
			.filter((s) => s.priority_score > 0);

		const ORDER = { achievable: 0, buildToward: 1, locked: 2 };
		suggestions.sort((a, b) => {
			const ad = ORDER[a.authority_fit as keyof typeof ORDER] ?? 3;
			const bd = ORDER[b.authority_fit as keyof typeof ORDER] ?? 3;
			if (ad !== bd) return ad - bd;
			if (noImpressionsYet) return a.monthly_searches - b.monthly_searches;
			return b.priority_score - a.priority_score;
		});

		// Collect all organic titles across zones for researchContext (frontend compat)
		const allOrganicTitlesSampled = [
			...new Set(Object.values(organicTitlesByZone).flatMap((titles) => titles))
		].slice(0, 40);

		const researchContext = {
			// v5.0 fields
			strategy_version: '5.0',
			category_breadth: landscape.category_breadth,
			breadth_reasoning: landscape.breadth_reasoning,
			zone_seeds_generated: allZoneSeeds.length,
			strong_zones: strongZones.length,
			weak_gap_zones: weakZones.length,
			dfs_zones_queried: dfsZoneSeeds.length,
			topics_data_backed: suggestions.filter((s) => s.data_confidence === 'data_backed').length,
			topics_paa_backed: suggestions.filter((s) => s.data_confidence === 'paa_backed').length,
			topics_ai_suggested: suggestions.filter((s) => s.data_confidence === 'ai_suggested').length,
			// v4 compatible fields (frontend reads these)
			seeds_used: seeds,
			discovery_queries_run: allZoneSeeds.length,
			dataforseo_keywords_found: allDfsKeywords.length,
			dataforseo_configured: dataForSeoConfigured,
			competitors_analyzed: competitorDomains.filter(Boolean),
			competitor_signals: competitorContent.slice(0, 3),
			people_also_ask: uniquePAA.slice(0, 10),
			related_searches: uniqueRelated.slice(0, 10),
			organic_titles_sampled: allOrganicTitlesSampled.slice(0, 8),
			keywords_from_paa: uniquePAA.length,
			keywords_from_related: uniqueRelated.length,
			keywords_from_organic: allOrganicTitlesSampled.length,
			keywords_from_competitors: competitorContent.length,
			keywords_from_ai: suggestions.filter((s) => s.data_confidence === 'ai_suggested').length,
			topics_researched: Object.keys(researchMap).length,
			traffic_tier: tier.label,
			monthly_impressions: monthlyImpressions,
			has_gsc_data: monthlyImpressions > 0
		};

		const runInsert: Record<string, unknown> = {
			site_id: siteId,
			organization_id: orgId,
			seeds_used: seeds,
			suggestions,
			strategy_rationale: strategyRationale,
			research_context: researchContext,
			traffic_tier: tier.label,
			credits_used: cost
		};
		if (target) runInsert.target_id = target.id;

		const { data: runRow, error: runErr } = await supabase
			.from('strategy_runs')
			.insert(runInsert)
			.select('id')
			.single();
		if (runErr) console.error('[Strategy] Failed to save run:', runErr.message);
		else console.log(`[Strategy] Run saved: ${runRow?.id} | ${suggestions.length} topics | v5.0`);

		writeNdjson(res, {
			type: 'done',
			suggestions,
			strategyRationale,
			researchContext,
			trafficTier: tier.label,
			categoryBreadth: landscape.category_breadth,
			creditsUsed: cost,
			creditsRemaining: newCredits,
			runId: runRow?.id ?? null
		});
		res.end();
	} catch (err) {
		console.error('[Strategy] suggestTopics error:', err);
		if (res.headersSent) {
			try {
				// Refund credits when stream started but error occurred
				const { data: userOrg } = await supabase
					.from('user_organizations')
					.select('organization_id')
					.eq('user_id', req.user?.id ?? '')
					.maybeSingle();
				if (userOrg?.organization_id) {
					await supabase.rpc('credit_back_action', {
						p_org_id: userOrg.organization_id,
						p_action_key: 'strategy_generation',
						p_credits: CREDIT_COSTS.STRATEGY_GENERATION,
						p_reason: 'Strategy generation failed mid-stream'
					});
				}
				writeNdjson(res, {
					type: 'error',
					message: 'Internal server error. Your credits have been refunded.'
				});
				res.end();
			} catch {
				// ignore
			}
		} else {
			return res.status(500).json({ error: 'Internal server error' });
		}
	}
};

/**
 * POST /api/strategy/keyword-metrics
 * Real keyword metrics for a single keyword (Add/Edit Topic modal).
 */
export const getKeywordMetricsHandler: RequestHandler = async (req, res) => {
	const { keyword } = req.body as { keyword?: string };
	if (!keyword?.trim()) return res.status(400).json({ error: 'keyword is required' });
	try {
		const metrics = await getKeywordMetrics(keyword.trim());
		return res.json(metrics);
	} catch (err) {
		console.error('[Strategy] getKeywordMetrics error:', err);
		return res.status(500).json({ error: 'Failed to fetch keyword metrics' });
	}
};
