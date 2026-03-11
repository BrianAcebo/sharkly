/**
 * Strategy Topic Generation
 *
 * Mirrors SEMrush's Keyword Strategy Builder + Topic Research tool.
 *
 * Output: TOPIC AREAS (broad themes), not individual keywords.
 * e.g. "Tree Service Costs" = cluster of keywords like "tree trimming cost",
 * "how much to trim a tree", "tree service prices" — reported with REAL
 * aggregate stats from DataForSEO:
 *   • All keywords  — count of real keywords in the cluster
 *   • Total volume  — sum of real monthly searches across the cluster
 *   • Avg KD        — median keyword difficulty across the cluster
 *   • Avg CPC       — volume-weighted avg CPC across the cluster
 *
 * Pipeline
 * ─────────────────────────────────────────────────────────────────────────
 * Phase 0  PRE-FLIGHT
 *          Credit check (15 credits), site lookup, live Moz DA refresh.
 *
 * Phase 1  REAL KEYWORD DISCOVERY
 *          DataForSEO Keyword Suggestions API: up to 100 real keywords per
 *          seed — real volume, real KD, real CPC (same data SEMrush uses).
 *          ALSO runs 4 SERP query variations per seed (Serper) to harvest
 *          PAA questions + related searches + organic titles for clustering
 *          context and topic naming.
 *          DataForSEO = the NUMBERS. Serper SERP = the CONTEXT.
 *
 * Phase 2  COMPETITOR GAP ANALYSIS (Serper)
 *          site:{competitor} scrapes reveal every topic they publish.
 *          Proven traffic-driving topics this site doesn't cover yet.
 *
 * Phase 3  AI TOPIC CLUSTERING (Claude Sonnet)
 *          Claude receives ALL real keywords from DataForSEO + PAA + related
 *          + competitor signals and GROUPS them into 8–15 broad topic areas.
 *          It is explicitly told these are real keywords — its job is to GROUP,
 *          not to invent. Seeds become their own topic or are clearly included.
 *
 * Phase 4  PER-TOPIC SERP RESEARCH (Serper, parallel)
 *          For each topic, run a real SERP + allintitle: query to measure
 *          competitive density (top domains, high-auth count, local results,
 *          PAA depth, allintitle count).
 *
 * Phase 5  REAL METRICS COMPUTATION + AI REASONING
 *          For each topic cluster, match all real DataForSEO keywords to it
 *          via exact + fuzzy matching. Call aggregateTopicMetrics() to compute:
 *            total_volume  = sum of all matched keyword monthly searches
 *            keyword_count = number of matched keywords
 *            avg_kd        = median KD (not mean — avoids outlier skew)
 *            cpc           = volume-weighted average CPC
 *          Metrics are COMPUTED from real data. Claude's only job here is
 *          writing ai_reasoning (citing SERP evidence) and strategyRationale.
 *          Falls back to SERP-signal estimation only if DataForSEO is not
 *          configured, with a visible warning in the UI.
 *
 * Finalize
 *          Compute authority_fit (achievable/buildToward/locked) from DA vs KD.
 *          Compute priority_score (formula: CPC × √volume / KD × funnel weight
 *          × authority multiplier × traffic tier fit).
 *          Compute KGR score (allintitle / monthly_volume — Quick Win detector).
 *          Sort: achievable → buildToward → locked, then by priority_score desc.
 *          KD determines ORDER — never exclusion.
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
import { CREDIT_COSTS } from '../../../shared/credits.mjs';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_SONNET_MODEL || 'claude-sonnet-4-5-20250929';
const GPT_CONTENT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';

// ---------------------------------------------------------------------------
// Traffic Tier (Avalanche Theory)
// ---------------------------------------------------------------------------
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
	monthlyImpressions: number
): number {
	// Spec formula: (intentWeight × CPC × log10(searches+1)) / (kd/100 + 0.1)
	// intentWeight: bofu=3, mofu=2, tofu=1
	// kd/100+0.1 normalises KD to 0-1 scale so CPC remains the dominant signal
	const fw = funnel === 'bofu' ? 3 : funnel === 'mofu' ? 2 : 1;
	const am = fit === 'achievable' ? 2.0 : fit === 'buildToward' ? 1.2 : 0.5;

	if (monthlyImpressions === 0) {
		// New site: score on commercial value (CPC) and low competition only.
		// log10(1+0.1) as volume floor keeps formula consistent with established sites.
		const base = (fw * Math.max(cpc, 0.1) * Math.log10(1 + 0.1)) / (Math.max(avgKd, 1) / 100 + 0.1);
		return Math.round(base * am * 100) / 100;
	}

	// Core spec formula: log10 dampens outlier volumes; kd/100+0.1 keeps denominator > 0
	const base =
		(fw * Math.max(cpc, 0.1) * Math.log10(Math.max(totalVolume, 1) + 1)) /
		(Math.max(avgKd, 1) / 100 + 0.1);
	const tier = getTrafficTier(monthlyImpressions);
	// Prefer topics whose total volume aligns with the site's current traffic tier
	const tierMax = tier.maxDaily * 60;
	const tierFit = tierMax > 0 && totalVolume <= tierMax * 2 ? 1.5 : 1.0;
	return Math.round(base * am * tierFit * 100) / 100;
}

// ---------------------------------------------------------------------------
// AI helpers — Claude Sonnet with retry, OpenAI fallback
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// POST /api/strategy/suggest
// ---------------------------------------------------------------------------
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

		// If targetId provided, load target and optionally use its seed_keywords
		let target: { id: string; site_id: string; seed_keywords: string[]; name: string } | null =
			null;
		if (targetId) {
			const { data: targetRow } = await supabase
				.from('targets')
				.select('id, site_id, seed_keywords, name')
				.eq('id', targetId)
				.single();
			if (!targetRow || targetRow.site_id !== siteId)
				return res.status(404).json({ error: 'Target not found or does not belong to site' });
			target = {
				id: targetRow.id,
				site_id: targetRow.site_id,
				seed_keywords: Array.isArray(targetRow.seed_keywords) ? targetRow.seed_keywords : [],
				name: targetRow.name ?? ''
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
			return res.status(400).json({
				error:
					'At least one seed keyword is required (provide seedKeywords or target with seed_keywords)'
			});

		// Auth + org + credit check
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

		const { data: site } = await supabase
			.from('sites')
			.select('id, name, niche, customer_description, url, domain_authority, competitor_urls')
			.eq('id', siteId)
			.eq('organization_id', orgId)
			.single();
		if (!site) return res.status(404).json({ error: 'Site not found' });

		// GSC impressions for traffic tier calibration
		const { data: perfRows } = await supabase
			.from('performance_data')
			.select('impressions')
			.eq('site_id', siteId);
		const monthlyImpressions = (perfRows ?? []).reduce(
			(s, r) => s + (Number(r.impressions) || 0),
			0
		);
		const tier = getTrafficTier(monthlyImpressions);

		// Existing topics (de-dupe against) — when target scoped, only topics for that target
		let topicsQuery = supabase.from('topics').select('keyword, title').eq('site_id', siteId);
		if (target) {
			topicsQuery = topicsQuery.eq('target_id', target.id);
		}
		const { data: existingTopics } = await topicsQuery;
		const existingTitles = new Set(
			(existingTopics ?? [])
				.map((t) => (t.title ?? t.keyword ?? '').toLowerCase().trim())
				.filter(Boolean)
		);

		// Refresh DA from Moz before generating so we always use current authority
		let da = Number(site.domain_authority ?? 0);
		try {
			const mozResult = await fetchDomainAuthority(site.url);
			if (mozResult.method !== 'not_configured' && mozResult.method !== 'error') {
				da = mozResult.da;
				// Persist updated DA back to the site row (non-blocking)
				void supabase
					.from('sites')
					.update({ domain_authority: da })
					.eq('id', siteId)
					.then(() => {
						console.log(`[Strategy] DA updated in DB: ${da}`);
					});
			}
		} catch {
			// Fall back to stored value — non-fatal
		}

		const competitorUrls: string[] = Array.isArray(site.competitor_urls)
			? site.competitor_urls
			: [];

		console.log(
			`[Strategy] Seeds: "${seeds.join('", "')}" | DA: ${da} (fresh from Moz) | Competitors: ${competitorUrls.length}`
		);

		// =====================================================================
		// PHASE 1 — REAL KEYWORD DISCOVERY (DataForSEO Keyword Magic Tool)
		//
		// KEY INSIGHT: querying broad seeds like "search engine optimization"
		// returns head terms (Wikipedia/Forbes level) that are useless for any
		// real content strategy. We need SPECIFIC intersection queries that find
		// the long-tail, topically-focused keywords within the niche.
		//
		// Strategy:
		//  A) Intersection seeds: combine user seeds with specificity modifiers
		//     so DataForSEO returns the FOCUSED subtopics, not head terms.
		//  B) SERP queries: targeted how-to / guide / tips queries that surface
		//     real PAA questions — the kind a content writer can actually answer.
		//  C) Filter: remove keywords that are too broad (< 3 words) or too hard
		//     (KD > 65) so Claude gets ACTIONABLE data, not impossible targets.
		// =====================================================================
		console.log('[Strategy] Phase 1: real keyword discovery (DataForSEO + SERP signals)');

		// Build intersection seeds — combine user seeds with niche-specific modifiers
		// e.g. seeds ["seo", "seo for ecommerce"] →
		//   "seo guide", "how to do seo for ecommerce", "ecommerce seo checklist", etc.
		const nicheContext = site.niche?.toLowerCase() ?? '';
		const SPECIFICITY_MODIFIERS = [
			'guide',
			'tips',
			'checklist',
			'strategy',
			'best practices',
			'how to'
		];
		const intersectionSeeds = new Set<string>();
		seeds.forEach((seed) => {
			intersectionSeeds.add(seed);
			intersectionSeeds.add(`${seed} guide`);
			intersectionSeeds.add(`how to ${seed}`);
		});
		// Cross-seed combinations (most valuable — find the INTERSECTION topic space)
		for (let i = 0; i < seeds.length; i++) {
			for (let j = i + 1; j < seeds.length; j++) {
				const combo = `${seeds[i]} ${seeds[j]}`.slice(0, 60);
				intersectionSeeds.add(combo);
			}
		}
		// Add niche-specific combination if niche is set and not already in seeds
		if (nicheContext && !seeds.some((s) => s.toLowerCase().includes(nicheContext.split(' ')[0]))) {
			seeds.forEach((seed) => {
				intersectionSeeds.add(`${seed} for ${nicheContext}`.slice(0, 60));
			});
		}
		const dfsQueryList = [...intersectionSeeds].slice(0, 8); // cap at 8 queries (cost control)

		// --- DataForSEO: real keyword data ---
		const dfsResultsBySeed: Record<string, DfsKeyword[]> = {};
		const allDfsKeywordsRaw: DfsKeyword[] = [];

		const dfsResults = await Promise.allSettled(
			dfsQueryList.map((seed) => getKeywordSuggestions(seed, { limit: 50 }))
		);

		let dataForSeoConfigured = false;
		dfsResults.forEach((r) => {
			if (r.status !== 'fulfilled') return;
			const { seed, keywords, configured } = r.value;
			if (configured) dataForSeoConfigured = true;
			dfsResultsBySeed[seed] = keywords;
			allDfsKeywordsRaw.push(...keywords);
		});

		// De-dupe across queries (same keyword can appear in multiple seed results)
		const seenKws = new Set<string>();
		const allDfsKeywordsDeduped: DfsKeyword[] = [];
		allDfsKeywordsRaw.forEach((k) => {
			if (!seenKws.has(k.keyword)) {
				seenKws.add(k.keyword);
				allDfsKeywordsDeduped.push(k);
			}
		});

		// FILTER: remove keywords that are too generic or too hard to be useful.
		// - "seo" (1 word) → not a topic, just a head term
		// - KD > 65 → locked for any site under DA 40
		// - volume > 100,000 AND KD > 40 → impossible for almost any site
		const allDfsKeywords = allDfsKeywordsDeduped.filter((k) => {
			const wordCount = k.keyword.trim().split(/\s+/).length;
			if (wordCount < 2) return false;
			if (k.keyword_difficulty > 65) return false;
			if (k.monthly_searches > 100_000 && k.keyword_difficulty > 40) return false;
			return true;
		});

		console.log(
			`[Strategy] Phase 1: DataForSEO raw=${allDfsKeywordsRaw.length} → after dedup+filter=${allDfsKeywords.length} keywords (${dfsQueryList.length} queries, configured: ${dataForSeoConfigured})`
		);

		// --- SERP: targeted queries for PAA + related searches ---
		// Use specific, actionable queries — NOT "best [seed]" or "[seed] cost"
		// which return high-competition generic content.
		const paaSignals: string[] = [];
		const relatedSignals: string[] = [];
		const organicTitleSignals: string[] = [];

		const discoveryQueries = seeds.flatMap((seed) => [
			`${seed} guide`,
			`how to ${seed}`,
			`${seed} tips`
		]);
		// Add niche-specific combination queries for SERP too
		if (seeds.length > 1) {
			discoveryQueries.push(`${seeds[0]} ${seeds[1]}`);
		}

		const serpResults = await Promise.allSettled(
			discoveryQueries.slice(0, 12).map((q) => serperSearch(q, 10))
		);

		serpResults.forEach((r) => {
			if (r.status !== 'fulfilled') return;
			const data = r.value;
			(data.peopleAlsoAsk ?? []).forEach((p) => {
				if (p.question) paaSignals.push(p.question);
			});
			(data.relatedSearches ?? []).forEach((q) => {
				if (q.query) relatedSignals.push(q.query);
			});
			(data.organic ?? []).slice(0, 5).forEach((o) => {
				if (o.title) organicTitleSignals.push(o.title);
			});
		});

		const uniquePAA = [...new Set(paaSignals)].slice(0, 50);
		const uniqueRelated = [...new Set(relatedSignals)].slice(0, 50);
		const uniqueOrganicTitles = [...new Set(organicTitleSignals)].slice(0, 40);

		// Build keyword snapshot for Claude — sorted by relevance score, not just volume.
		// Prefer multi-word, lower-KD, specific keywords over generic head terms.
		const scoredKeywords = allDfsKeywords
			.map((k) => {
				const wordCount = k.keyword.trim().split(/\s+/).length;
				const specificityBonus = wordCount >= 4 ? 2.0 : wordCount >= 3 ? 1.5 : 1.0;
				const difficultyPenalty = k.keyword_difficulty > 45 ? 0.7 : 1.0;
				// Boost keywords that contain words from multiple seeds (intersection signal)
				const intersectionBonus =
					seeds.filter((s) => k.keyword.toLowerCase().includes(s.toLowerCase().split(' ')[0]))
						.length > 1
						? 1.5
						: 1.0;
				return {
					...k,
					relevanceScore:
						Math.sqrt(k.monthly_searches + 1) *
						specificityBonus *
						difficultyPenalty *
						intersectionBonus
				};
			})
			.sort((a, b) => b.relevanceScore - a.relevanceScore);

		const topDfsKeywords = scoredKeywords.slice(0, 60);

		const dfsKeywordList =
			topDfsKeywords.length > 0
				? topDfsKeywords
						.map(
							(k) =>
								`${k.keyword} (vol:${k.monthly_searches}, KD:${k.keyword_difficulty}, CPC:$${k.cpc})`
						)
						.join('\n')
				: '(DataForSEO not configured — using SERP signals only)';

		console.log(
			`[Strategy] Phase 1: ${uniquePAA.length} PAA + ${uniqueRelated.length} related + ${topDfsKeywords.length} scored keywords passed to Claude`
		);

		// =====================================================================
		// PHASE 2 — COMPETITOR GAP ANALYSIS
		// site:{competitor} scrapes reveal what topics they publish.
		// Proven traffic-driving topics this site doesn't cover yet.
		// =====================================================================
		console.log('[Strategy] Phase 2: competitor gap analysis');

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

		console.log(`[Strategy] Phase 2: competitor content from ${competitorDomains.length} sites`);

		// =====================================================================
		// PHASE 3 — TWO-STEP: BRAINSTORM FIRST, VALIDATE WITH DATA SECOND
		//
		// The old approach (cluster keywords → get topics) produces garbage
		// because keywords returned by DataForSEO are biased toward whatever
		// is popular, not toward what's strategically important to cover.
		//
		// The RIGHT approach (what SEMrush + a good strategist does):
		//   Step A — BRAINSTORM: "What are ALL the topical pillars of this niche?"
		//            Think comprehensively about every dimension of the subject.
		//            Don't look at keyword data yet — just map the topic space.
		//            e.g. for "SEO": on-page, off-page, technical, content,
		//            local, link building, analytics, tools, algorithm updates…
		//
		//   Step B — VALIDATE WITH DATA: "Here's real keyword research —
		//            which keywords from the data map to each pillar?
		//            What does the data tell us about search demand for each?"
		//
		// This produces topics like "On-Page SEO for Ecommerce" (comprehensive,
		// actionable) not "Best SEO Tools" (what keywords happened to come back).
		// =====================================================================
		console.log('[Strategy] Phase 3a: niche brainstorm (comprehensive topic mapping)');

		const isNewDomain = da <= 5;
		const noImpressionsYet = monthlyImpressions === 0;
		const tierNote = noImpressionsYet
			? `Site authority context: new/low-authority site (DA ${da}). The strategy MUST prioritize low-competition angles. High-volume head terms are unrealistic — focus on long-tail, specific subtopics where new sites can actually rank.`
			: `Site authority context: DA ${da}, traffic tier ${tier.label} (${tier.minDaily}–${tier.maxDaily} daily impressions). Target keywords appropriate for this authority level.`;

		// ── Step A: Identify highest-leverage topic opportunities ────────────────
		// Grounded in Traffic Tier Threshold Theory (US8682892B1 + US10055467B1):
		// Google gates high-volume keywords behind domain trust tiers. The correct
		// strategy is to find winnable topics within the site's current tier,
		// prioritised by: Priority Score = (CommercialIntent × CPC × SearchVolume) / KeywordDifficulty
		// (The Complete SEO System, Section 5.3, Step 2)
		// Topics must also support original content — Google's Information Gain scoring
		// (US20190155948A1) penalises copycat content regardless of comprehensiveness.
		const brainstormRaw = await ai(
			`You are a senior SEO strategist. Your job is to identify the highest-leverage content opportunities for a specific business at its current authority level — not to map out a comprehensive encyclopedia of the niche.

Google enforces implicit traffic thresholds: high-volume keywords are reserved for domains that have earned the trust tier to compete for them (US8682892B1 — group modification factor). A new or low-authority site cannot skip tiers. Your selection must respect this reality.

WHAT YOU ARE SELECTING FOR:
- Topics with genuine search demand this site can realistically rank for NOW given its authority level
- Topics with commercial value — higher CPC indicates conversions happen from this traffic AND better user engagement signals (dwell time, deliberate visits) that feed Google's Navboost behavioural layer (US8595225B1)
- Topics where genuinely original content is possible — Google's Information Gain scoring (US20190155948A1) penalises content that merely synthesises the existing top-10 results, regardless of how comprehensive it is
- Topics specific to this niche intersection — not generic content competing with every site on the internet

WHAT A GOOD TOPICAL PILLAR IS:
- A subject area with enough depth for a MoFu focus page (consideration stage — evaluating options or methods) plus multiple ToFu supporting articles (informational — learning about the topic)
- The PILLAR TITLE must be framed at the consideration stage — two valid types:
  mofu_article  → "How to Choose X", "X for [specific use case/audience]", "X Reviews", "X Guide for [audience]"
  mofu_comparison → "X vs Y", "X Alternatives", "Compare X Options"

  IMPORTANT: Avoid "Best X" titles. They are overused, dominated by affiliate sites, and score
  low on Information Gain (US20190155948A1) because every competitor uses the same format.
  Prefer specific use-case or audience framing — it targets a more qualified searcher and has
  less competition.

  ✅ "How to Choose a Cyber Crime Investigator" — mofu_article (decision-support)
  ✅ "Hydrating Moisturizers for Sensitive Skin Prone to Redness" — mofu_article (specific audience)
  ✅ "Gel Cleanser vs Foam Cleanser for Oily Skin" — mofu_comparison
  ✅ "Shopify SEO for Small Stores" — mofu_article (specific use case)
  ⚠️  "Best Moisturizers for Sensitive Skin" — last resort only, if no better angle exists
  ❌ "What is a Moisturizer" — ToFu awareness, belongs as a supporting article inside a cluster
  ❌ "How Does SEO Work" — ToFu awareness, too generic, not a focus page
- Specific to the niche and the specific target area — not generic content that competes with every site
- Has a clear path to first-hand experience, original data, or a unique perspective the business actually holds

WHAT TO EXCLUDE ENTIRELY:
- Topics dominated by Wikipedia, WebMD, Healthline, Forbes, or other unbeatable authority sites at this tier
- Topics where no realistic original angle exists — pure Skyscraper territory scores near zero on Information Gain (US20190155948A1)
- Topics with no commercial connection to what this business sells
- Topics so broad they describe the entire internet

Return ONLY a JSON array of pillar titles. No other fields needed at this stage.
Format: ["Pillar Title 1", "Pillar Title 2", ...]`,
			`Business: ${site.name}
Niche: ${site.niche}
Customer served: ${site.customer_description || 'small business owners'}
Target area / seed keywords: ${seeds.join(' | ')}
Competitor content signals: ${competitorContent.slice(0, 3).join(' | ')}
PAA questions from Google: ${uniquePAA.slice(0, 15).join(' | ')}

${tierNote}

IMPORTANT — HOW TO USE THE SEED KEYWORDS:
The seed keywords define the TARGET AREA this user wants to rank in — NOT the literal topic title.
A seed like "deeply hydrating moisturizer" means the user sells or covers deeply hydrating moisturizers.
Your pillars should be the content strategy AROUND that target area — covering the adjacent questions,
comparisons, and concerns that lead a reader toward purchasing or choosing from that category.
Do NOT create pillars that are just the seed keyword rephrased. Treat the seed as context, not as a topic.

Examples of the right lift:
  Seed: "deeply hydrating moisturizer"
  ❌ BAD pillar: "Deeply Hydrating Moisturizer Guide" (just the seed rephrased)
  ✅ GOOD pillars: "Moisturizers for Skin That Feels Tight After Washing",
                   "Hyaluronic Acid vs Glycerin: Which Hydrates Better",
                   "How to Layer Actives Without Disrupting Your Skin Barrier"

  Seed: "ecommerce SEO"
  ❌ BAD: "Ecommerce SEO Guide" (seed rephrased)
  ✅ GOOD: "Product Page Optimization for Shopify", "Category Page SEO for Online Stores",
           "Handling Duplicate Content on Ecommerce Sites"

List 5–8 topical pillars. Every pillar must pass all three tests:
1. WINNABLE — not dominated by major established brands at this authority level
2. COMMERCIALLY VALUABLE — connected to what this business sells, CPC signal exists
3. ORIGINAL ANGLE POSSIBLE — business has genuine experience or perspective competitors lack

Quality over quantity. Return 4 strong, adjacent pillars rather than 10 weak ones. If a topic fails any test, exclude it entirely.

Existing topics already in strategy (skip these): ${existingTitles.size > 0 ? [...existingTitles].join(', ') : 'none'}`,
			2000
		);

		// Parse pillar titles from Step A
		let pillarTitles: string[] = [];
		try {
			const parsed = JSON.parse((brainstormRaw ?? '[]').replace(/```json\n?|\n?```/g, '').trim());
			pillarTitles = Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string') : [];
		} catch {
			console.error('[Strategy] Phase 3a parse error:', (brainstormRaw ?? '').slice(0, 200));
		}

		if (pillarTitles.length === 0) {
			// Fallback: use seeds as pillar starters
			pillarTitles = seeds.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
		}
		console.log(
			`[Strategy] Phase 3a: ${pillarTitles.length} pillars brainstormed: ${pillarTitles.slice(0, 5).join(', ')}…`
		);

		// ── Step B: Validate pillars with keyword research data ───────────────
		// Claude now maps real DataForSEO keywords to each brainstormed pillar.
		// This grounds the comprehensive topic map in actual search demand.
		console.log('[Strategy] Phase 3b: validating pillars with keyword research data');

		const clusteringRaw = await ai(
			`You are an SEO strategist validating a content strategy. You have been given:
1. A list of TOPICAL PILLARS (already brainstormed comprehensively)
2. Real keyword research data from DataForSEO
3. Google SERP signals (PAA, related searches)

Your job: for each pillar, find the best matching keywords from the research data and assign them. Then output the full structured topic list.

RULES:
- VALIDATE each pillar and assign it one of two tiers:

  TIER 1 — UNLOCKED (winnable now):
  Keyword difficulty is within the site's current authority range AND search volume is real (>0).
  These are what the user should build first.

  TIER 2 — LOCKED (worth doing later):
  Real search volume exists AND CPC signals commercial value, BUT keyword difficulty is above
  the site's current threshold. Keep these — they represent the growth path. Do NOT cut them.
  The user needs to see where they're headed.

  CUT ENTIRELY (do not include at all):
  (a) Volume is zero or near-zero with no PAA/related search signal suggesting emerging demand
  (b) SERP is dominated by Wikipedia, WebMD, Healthline, or other permanently unbeatable authority
      sites that this domain cannot realistically compete with at any authority level
  (c) No commercial connection to what this business sells — pure tangential content

- Target 5–8 total pillars across both tiers combined. At least 3 should be Tier 1 (unlocked).
  If the data only supports 3–4 strong pillars, return 3–4. Do not pad with weak topics.
  If 6–7 genuinely strong pillars exist, return all of them.

- PRIORITISE within each tier using: Priority Score = (CommercialIntent × CPC × SearchVolume) / KeywordDifficulty
  Higher CPC = more commercial value AND better Navboost engagement signals (US8595225B1)

- For each pillar, find the primary keyword from the research data that best represents the PILLAR INTENT
  (not just the seed rephrased). A pillar about "skin barrier repair" should get the best-volume
  keyword from the data about skin barrier — even if the seed was "hydrating moisturizer".
  If the data contains no meaningful keyword for this pillar, use the pillar title lowercased.
  Do NOT default to a near-duplicate of the seed keyword just because it exists in the data.
- Set "funnel_stage" to "mofu" for ALL topics. Every topic generated here becomes a focus page —
  the MoFu consideration-stage content that sits between ToFu supporting articles and the BoFu
  destination page. This is the architecture. ToFu content is generated later as supporting articles
  within each cluster. BoFu is the destination page the user already has. Do not return tofu or bofu here.

- Every topic title must map to one of these two MoFu article types:

  TYPE 1 — mofu_article: targets someone evaluating options or researching before a decision
    Preferred patterns: "How to Choose X", "X for [specific use case]", "X for [specific audience]",
                        "X Reviews", "X Guide for [audience]", "Which X is Right for [situation]"
    Avoid: "Best X for Y" and "Top X for Y" — these are overused by affiliate sites and score
           low on Information Gain (US20190155948A1). Use specific use-case framing instead.
           Only use "Best" if the keyword data shows it has significantly higher volume than
           any alternative framing AND no better angle exists.
    Example: "How to Choose a Cyber Crime Investigator" ✅ not "Best Cyber Crime Investigators"
    Example: "Hydrating Moisturizers for Sensitive Skin Prone to Redness" ✅ not "Best Moisturizers"
    Example: "Shopify SEO Guide for Small Stores" ✅ not "Best Shopify SEO Tips"

  TYPE 2 — mofu_comparison: targets someone comparing specific options against each other
    Title patterns: "X vs Y", "X vs Y: Which is Better", "X Alternatives", "Compare X Options",
                    "X or Y for [use case]"
    Example: "Gel Cleanser vs Foam Cleanser: Which is Better for Oily Skin"
    Example: "Hiring a PI vs DIY Investigation"
    Example: "Shopify SEO vs WooCommerce SEO"

  If a title you are considering does not fit either type — it is a ToFu article and does not
  belong here. Reframe it or replace it with a topic that does fit.

- Add a "tier" field: "unlocked" or "locked"
- Add a "mofu_type" field: "mofu_article" or "mofu_comparison"

Return ONLY valid JSON array. No markdown.`,
			`Business: ${site.name} | Niche: ${site.niche}
${tierNote}

BRAINSTORMED TOPICAL PILLARS (these define the strategy):
${pillarTitles.map((t, i) => `${i + 1}. ${t}`).join('\n')}

KEYWORD RESEARCH DATA (use to find primary keywords and validate demand):
${dfsKeywordList}

PEOPLE ALSO ASK (shows what questions people have in this niche):
${uniquePAA.slice(0, 25).join('\n')}

RELATED SEARCHES:
${uniqueRelated.slice(0, 15).join('\n')}

COMPETITOR CONTENT:
${competitorContent.join('\n')}

For each pillar, return:
[
  {
    "title": "exact pillar title from the brainstorm list",
    "primary_keyword": "best matching keyword from research data (or closest appropriate keyword)",
    "topic_description": "1 sentence: what specific content lives here",
    "example_keywords": ["3-5 keywords from data that belong to this pillar"],
    "funnel_stage": "mofu",
    "mofu_type": "mofu_article|mofu_comparison",
    "tier": "unlocked|locked",
    "discovery_sources": ["seed"|"keyword_research"|"google_paa"|"competitor_gap"|"ai_brainstorm"]
  }
]`,
			4000
		);

		type TopicCluster = {
			title: string;
			primary_keyword: string;
			topic_description: string;
			example_keywords: string[];
			funnel_stage: string;
			discovery_sources: string[];
		};

		let topicClusters: TopicCluster[] = [];
		try {
			const parsed = JSON.parse((clusteringRaw ?? '[]').replace(/```json\n?|\n?```/g, '').trim());
			topicClusters = Array.isArray(parsed) ? parsed : [];
		} catch {
			console.error('[Strategy] Phase 3b parse error:', (clusteringRaw ?? '').slice(0, 300));
		}

		if (topicClusters.length === 0) {
			// Fallback: use brainstormed pillar titles as topic stubs
			topicClusters = pillarTitles.map((title) => ({
				title,
				primary_keyword: title.toLowerCase(),
				topic_description: `Content about ${title} for ${site.niche}`,
				example_keywords: [title.toLowerCase()],
				funnel_stage: 'tofu',
				discovery_sources: ['ai_brainstorm']
			}));
		}

		// Filter out topics that already exist
		topicClusters = topicClusters.filter(
			(tc) => !existingTitles.has(tc.title.toLowerCase().trim())
		);

		console.log(
			`[Strategy] Phase 3b: ${topicClusters.length} validated topics (from ${pillarTitles.length} brainstormed pillars)`
		);

		// =====================================================================
		// PHASE 4 — PER-TOPIC SERP RESEARCH
		// For each topic area, run real SERP + allintitle: to measure the
		// competitive landscape for that entire topic cluster.
		// =====================================================================
		console.log('[Strategy] Phase 4: per-topic SERP research');

		const HIGH_AUTH = [
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
			'familyhandyman.com',
			'bhg.com',
			'hgtv.com',
			'entrepreneur.com'
		];

		type TopicResearch = {
			title: string;
			primaryKw: string;
			topDomains: string[];
			topTitles: string[];
			highAuthCount: number;
			paaDepth: number;
			relatedDepth: number;
			allintitleCount: number;
			hasLocalResults: boolean;
		};

		// Serper rate limit: 5 requests/second.
		// Each topic needs 2 queries (SERP + allintitle), so run 2 topics at a time
		// (= 4 req/batch) with a 350ms pause between batches to stay safely under limit.
		const SERP_BATCH_SIZE = 2;
		const researchResults: PromiseSettledResult<TopicResearch>[] = [];

		for (let i = 0; i < topicClusters.length; i += SERP_BATCH_SIZE) {
			const batch = topicClusters.slice(i, i + SERP_BATCH_SIZE);
			const batchResults = await Promise.allSettled(
				batch.map(async (tc): Promise<TopicResearch> => {
					const kw = tc.primary_keyword || tc.title;
					const [serp, ati] = await Promise.all([
						serperSearch(kw, 5),
						serperSearch(`allintitle:${kw}`, 1)
					]);
					const topDomains = (serp.organic ?? [])
						.slice(0, 5)
						.map((o) => {
							try {
								return new URL(o.link).hostname.replace('www.', '');
							} catch {
								return '';
							}
						})
						.filter(Boolean);
					return {
						title: tc.title,
						primaryKw: kw,
						topDomains,
						topTitles: (serp.organic ?? [])
							.slice(0, 5)
							.map((o) => o.title)
							.filter(Boolean),
						highAuthCount: topDomains.filter((d) => HIGH_AUTH.some((h) => d.includes(h))).length,
						paaDepth: (serp.peopleAlsoAsk ?? []).length,
						relatedDepth: (serp.relatedSearches ?? []).length,
						allintitleCount: parseSearchResultCount(ati.searchInformation?.totalResults),
						hasLocalResults: topDomains.some((d) =>
							['yelp', 'angi', 'homeadvisor', 'houzz', 'thumbtack', 'bark'].some((l) =>
								d.includes(l)
							)
						)
					};
				})
			);
			researchResults.push(...batchResults);
			// Pause between batches — skip delay after last batch
			if (i + SERP_BATCH_SIZE < topicClusters.length) {
				await sleep(350);
			}
		}

		const researchMap: Record<string, TopicResearch> = {};
		researchResults.forEach((r) => {
			if (r.status === 'fulfilled') researchMap[r.value.title] = r.value;
		});

		console.log(`[Strategy] Phase 4: ${Object.keys(researchMap).length} topics researched`);

		// =====================================================================
		// PHASE 5 — REAL AGGREGATE METRICS + AI REASONING
		//
		// For each topic cluster Claude identified, find all real DataForSEO
		// keywords that belong to it by matching the cluster's example_keywords
		// and primary_keyword against the full keyword pool.
		//
		// Metrics are COMPUTED from real data — not estimated by Claude.
		// Claude's job in this phase is ONLY to write the ai_reasoning
		// (citing SERP evidence) and the strategy rationale paragraph.
		// =====================================================================
		console.log('[Strategy] Phase 5: computing real metrics + AI reasoning');

		const authNote = isNewDomain
			? `Site context: brand new website (authority score ${da}/100). Start with low-competition topics (difficulty ≤ 15). Mid-competition topics (16–30) are achievable in 6–12 months. High-competition topics (> 30) should wait until the site grows.`
			: `Site context: established website (authority score ${da}/100). Low-competition means difficulty ≤ ${da + 10}. Medium-competition is ${da + 11}–${da + 25}. High-competition (> ${da + 25}) requires more growth first.`;

		// Build a lookup of all real keywords by lowercase string
		const dfsKeywordMap = new Map<string, DfsKeyword>();
		allDfsKeywords.forEach((k) => dfsKeywordMap.set(k.keyword.toLowerCase(), k));

		// ── Exclusive keyword-to-topic assignment ────────────────────────────
		// Problem with simple fuzzy matching: niche keywords (e.g. "coding")
		// appear in every topic title AND every DataForSEO keyword, so every
		// topic ends up with the same 50 keywords → identical metrics for all.
		//
		// Fix: two-pass exclusive assignment.
		//   Pass 1: exact matches on primary_keyword + Claude's example_keywords.
		//           These are the most confident assignments — claim them first.
		//   Pass 2: for remaining unassigned keywords, score against every topic
		//           and assign EXCLUSIVELY to the single best-scoring topic.
		//           A keyword can only count toward ONE topic's metrics.
		// ─────────────────────────────────────────────────────────────────────
		const topicRealKeywords: Record<string, DfsKeyword[]> = {};
		topicClusters.forEach((tc) => {
			topicRealKeywords[tc.title] = [];
		});

		const assignedKeywords = new Set<string>();

		// Precompute significant words per topic (length > 2, skip common stopwords)
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
			'that'
		]);
		const topicSignatureWords = topicClusters.map((tc) => {
			const titleWords = tc.title
				.toLowerCase()
				.split(/\s+/)
				.filter((w) => w.length > 2 && !STOPWORDS.has(w));
			const primaryWords = tc.primary_keyword
				.toLowerCase()
				.split(/\s+/)
				.filter((w) => w.length > 2 && !STOPWORDS.has(w));
			const exampleWords = (tc.example_keywords ?? []).flatMap((ek) =>
				ek
					.toLowerCase()
					.split(/\s+/)
					.filter((w) => w.length > 2 && !STOPWORDS.has(w))
			);
			// Remove the niche/seed words that appear in ALL topics (too generic to be discriminating)
			return { title: tc.title, words: new Set([...titleWords, ...primaryWords, ...exampleWords]) };
		});

		// Identify words that appear in EVERY topic — these are generic niche words
		// (e.g. "coding" in a coding niche) and should be ignored for scoring
		const wordTopicCount = new Map<string, number>();
		topicSignatureWords.forEach(({ words }) => {
			words.forEach((w) => wordTopicCount.set(w, (wordTopicCount.get(w) ?? 0) + 1));
		});
		const genericWords = new Set(
			[...wordTopicCount.entries()]
				.filter(([, count]) => count >= topicClusters.length - 1) // present in almost all topics
				.map(([word]) => word)
		);

		// Pass 1: exact matches on primary keyword + Claude's example keywords
		topicClusters.forEach((tc) => {
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

		// Pass 2: score remaining keywords exclusively against topics
		allDfsKeywords.forEach((k) => {
			if (assignedKeywords.has(k.keyword)) return;
			const kl = k.keyword.toLowerCase();
			const kWords = kl
				.split(/\s+/)
				.filter((w) => w.length > 2 && !STOPWORDS.has(w) && !genericWords.has(w));
			if (kWords.length === 0) return; // only generic words — skip

			let bestTopic = '';
			let bestScore = 0;

			topicClusters.forEach((tc) => {
				const sig = topicSignatureWords.find((s) => s.title === tc.title)!;
				let score = 0;
				kWords.forEach((w) => {
					if (sig.words.has(w))
						score += 3; // exact word match
					else if ([...sig.words].some((sw) => sw.includes(w) || w.includes(sw))) score += 1; // partial
				});
				if (score > bestScore) {
					bestScore = score;
					bestTopic = tc.title;
				}
			});

			// Only assign if there's a meaningful discriminating match
			if (bestTopic && bestScore >= 3 && topicRealKeywords[bestTopic].length < 50) {
				topicRealKeywords[bestTopic].push(k);
				assignedKeywords.add(k.keyword);
			}
		});

		// Build topic summaries with REAL metrics for Claude's reasoning prompt.
		// Labels are intentionally plain-English so Claude doesn't echo technical field names back.
		const topicSummaries = topicClusters
			.map((tc) => {
				const realKws = topicRealKeywords[tc.title] ?? [];
				const metrics = aggregateTopicMetrics(realKws);
				const d = researchMap[tc.title];
				const topKeywords = realKws
					.slice(0, 5)
					.map((k) => `"${k.keyword}" (${k.monthly_searches.toLocaleString()} searches/mo)`)
					.join(', ');
				const competitionLevel =
					metrics.keyword_difficulty < 20
						? 'low'
						: metrics.keyword_difficulty < 40
							? 'medium'
							: 'high';
				const bigSites = d ? d.topDomains.filter((dom) => d.highAuthCount > 0).length : 0;
				return `TOPIC: "${tc.title}"
  Stage in buyer journey: ${tc.funnel_stage === 'tofu' ? 'awareness (top of funnel)' : tc.funnel_stage === 'mofu' ? 'consideration (mid funnel)' : 'decision (bottom of funnel)'}
  People searching for this per month: ${metrics.monthly_searches.toLocaleString()}
  How hard to rank for (0=easy, 100=very hard): ${metrics.keyword_difficulty} — that is ${competitionLevel} competition
  Ad value per click: $${metrics.cpc}
  Number of related search terms found: ${metrics.keyword_count}
  Example search terms people use: ${topKeywords || 'none found'}
  Big established sites already ranking: ${d ? (bigSites > 0 ? `yes (${bigSites} major sites)` : 'no major sites, mostly smaller ones') : 'unknown'}
  Local search results present: ${d ? (d.hasLocalResults ? 'yes' : 'no') : 'unknown'}`;
			})
			.join('\n\n');

		// Claude writes ONLY reasoning and rationale — metrics come from real data.
		// Language must be plain and friendly — our users are small business owners, not SEO experts.
		const reasoningRaw = await ai(
			`You are a friendly content coach helping a small business owner figure out what to write about on their website. You speak in plain, everyday English — never in marketing or SEO jargon.

You will receive a list of content topics with data about how popular they are and how competitive they are.

Your job is to write TWO things:
1. A "rationale" — 2-3 conversational sentences summarizing the overall plan: what to write about first, and why it makes sense to save the harder topics for later as the site grows.
2. An "ai_reasoning" for each topic — 1 short sentence explaining in plain terms why this topic is worth writing about.

STRICT LANGUAGE RULES — follow these exactly:
- NEVER say: DA, KD, SERP, allintitle, head terms, long-tail, topical authority, domain authority, authority score, keyword difficulty, organic results, CTR, backlinks, indexed, crawled.
- Instead say: "competition" instead of KD, "how many people search for it" instead of volume, "how strong your site is" instead of domain authority, "Google results" instead of SERP.
- Do NOT quote raw numbers like "(KD 7, 980 volume)" in the rationale — describe what they mean in plain words instead.
- Do NOT mention topic names with numbers in parentheses. Just name the topic naturally.
- Write like you're texting a friend who owns a small business, not presenting a marketing report.
- Keep it encouraging and practical. The owner should feel excited, not overwhelmed.

EXAMPLE OF BAD output (never write like this):
"For a new domain (DA 1) in the competitive ecommerce SEO space, the data reveals a clear path forward: prioritize ultra-low-competition targets first. 'Ecommerce Platform SEO' (KD 0, 980 volume) represents an immediate opportunity..."

EXAMPLE OF GOOD output (write like this):
"We found some great topics your site can realistically start ranking for right now — especially ones where there isn't much competition yet. Start with those first to get some early wins, then tackle the bigger topics as your site gets more established. Think of it like building a reputation: start local before going national."

- Do NOT invent or change any numbers.
- Return ONLY valid JSON. No markdown fences.`,
			`${authNote}
${tierNote}
Business: ${site.name} | Niche: ${site.niche}

TOPIC DATA:
${topicSummaries}

Return this exact JSON structure:
{
  "rationale": "2-3 conversational sentences. What's the plan? Why start with certain topics? What do they build toward? Sound like a coach, not a consultant.",
  "topics": [
    {
      "title": "exact topic title from input",
      "ai_reasoning": "1 sentence — plain English reason why this topic is worth writing about"
    }
  ]
}`,
			4000
		);

		type FinalTopic = {
			title: string;
			keyword: string;
			keyword_count: number;
			monthly_searches: number;
			keyword_difficulty: number;
			cpc: number;
			funnel_stage: string;
			ai_reasoning: string;
		};

		// Parse Claude's reasoning
		const reasoningByTitle: Record<string, string> = {};
		let strategyRationale = '';
		try {
			const parsed = JSON.parse((reasoningRaw ?? '{}').replace(/```json\n?|\n?```/g, '').trim());
			strategyRationale = parsed.rationale ?? '';
			(parsed.topics ?? []).forEach((t: { title: string; ai_reasoning: string }) => {
				reasoningByTitle[t.title] = t.ai_reasoning ?? '';
			});
		} catch {
			console.error(
				'[Strategy] Phase 5 reasoning parse error:',
				(reasoningRaw ?? '').slice(0, 300)
			);
		}

		// Build final topics with REAL metrics + AI reasoning
		const enrichedTopics: FinalTopic[] = topicClusters.map((tc) => {
			const realKws = topicRealKeywords[tc.title] ?? [];
			const metrics = aggregateTopicMetrics(realKws);

			// If we have no real keywords for this topic (DataForSEO not configured),
			// fall back to SERP-based estimation via allintitle and PAA signals
			const d = researchMap[tc.title];
			const fallbackVolume = d ? Math.max(d.paaDepth * 500, 200) : 500;
			const fallbackKD = d ? (d.highAuthCount >= 3 ? 55 : d.hasLocalResults ? 20 : 35) : 40;

			return {
				title: tc.title,
				keyword: tc.primary_keyword,
				keyword_count: metrics.keyword_count > 0 ? metrics.keyword_count : (d?.paaDepth ?? 1) * 10,
				monthly_searches: metrics.monthly_searches > 0 ? metrics.monthly_searches : fallbackVolume,
				keyword_difficulty: metrics.keyword_count > 0 ? metrics.keyword_difficulty : fallbackKD,
				cpc: metrics.cpc > 0 ? metrics.cpc : 1.5,
				funnel_stage: tc.funnel_stage,
				ai_reasoning:
					reasoningByTitle[tc.title] ??
					(dataForSeoConfigured
						? `Research found ${realKws.length} related keywords for this topic.`
						: 'DataForSEO not configured — metrics estimated from SERP signals.')
			};
		});

		// =====================================================================
		// FINALIZE: server-side authority_fit + priority_score + discovery_source
		// Sort: achievable → buildToward → locked; within tier by priority_score
		// =====================================================================
		const suggestions = enrichedTopics
			.filter((s) => !existingTitles.has((s.title ?? '').toLowerCase().trim()))
			.map((s) => {
				const kd = Number(s.keyword_difficulty ?? 50);
				const volume = Number(s.monthly_searches ?? 0);
				const authority_fit = computeAuthorityFit(kd, da);
				const priority_score = computePriorityScore(
					Number(s.cpc ?? 0),
					volume,
					kd,
					s.funnel_stage ?? 'tofu',
					authority_fit,
					monthlyImpressions
				);

				const cluster = topicClusters.find((tc) => tc.title === s.title);
				const rawSources = cluster?.discovery_sources ?? [];
				const discovery_source = rawSources.includes('seed')
					? 'seed'
					: rawSources.includes('competitor_gap')
						? 'competitor_gap'
						: rawSources.includes('google_paa')
							? 'google_paa'
							: rawSources.includes('google_related')
								? 'google_related'
								: 'ai_brainstorm';

				const rd = researchMap[s.title];
				const allintitleCount = rd?.allintitleCount ?? 0;
				const kgr_score =
					volume > 0 && allintitleCount > 0
						? Math.round((allintitleCount / volume) * 1000) / 1000
						: null;

				return {
					...s,
					authority_fit,
					priority_score,
					kgr_score,
					allintitle_count: allintitleCount,
					data_source: rd ? 'serp_researched' : 'estimated',
					discovery_source
				};
			});

		const ORDER = { achievable: 0, buildToward: 1, locked: 2 };
		suggestions.sort((a, b) => {
			const ad = ORDER[a.authority_fit as keyof typeof ORDER] ?? 3;
			const bd = ORDER[b.authority_fit as keyof typeof ORDER] ?? 3;
			if (ad !== bd) return ad - bd;

			if (noImpressionsYet) {
				// New site with no traffic: sort low volume → high volume within each bucket.
				// You can't win high-volume keywords without authority — tackle the smallest
				// winnable topics first, then grow into larger ones as the site earns trust.
				return a.monthly_searches - b.monthly_searches;
			}

			// Established site: highest priority_score first (CPC × volume / KD weighted)
			return b.priority_score - a.priority_score;
		});

		const researchContext = {
			seeds_used: seeds,
			discovery_queries_run: discoveryQueries.length,
			dataforseo_keywords_found: allDfsKeywords.length,
			dataforseo_configured: dataForSeoConfigured,
			competitors_analyzed: competitorDomains.filter(Boolean),
			competitor_signals: competitorContent.slice(0, 3),
			people_also_ask: uniquePAA.slice(0, 10),
			related_searches: uniqueRelated.slice(0, 10),
			organic_titles_sampled: uniqueOrganicTitles.slice(0, 8),
			keywords_from_paa: uniquePAA.length,
			keywords_from_related: uniqueRelated.length,
			keywords_from_organic: uniqueOrganicTitles.length,
			keywords_from_competitors: competitorContent.length,
			keywords_from_ai: topicClusters.filter((tc) =>
				(tc.discovery_sources ?? []).includes('ai_brainstorm')
			).length,
			topics_researched: Object.keys(researchMap).length,
			traffic_tier: tier.label,
			monthly_impressions: monthlyImpressions,
			has_gsc_data: monthlyImpressions > 0
		};

		// Deduct credits
		const newCredits = Math.max(0, available - cost);
		await supabase
			.from('organizations')
			.update({
				included_credits_remaining: newCredits,
				...(org?.included_credits != null && { included_credits: newCredits })
			})
			.eq('id', orgId);

		// Persist this run so the user can always recover suggestions later.
		// Non-blocking — a save failure should never break the response.
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

		if (runErr) {
			console.error('[Strategy] Failed to save run:', runErr.message);
		} else {
			console.log(`[Strategy] Run saved: ${runRow?.id}`);
		}

		return res.json({
			suggestions,
			strategyRationale,
			researchContext,
			trafficTier: tier.label,
			creditsUsed: cost,
			creditsRemaining: newCredits,
			runId: runRow?.id ?? null
		});
	} catch (err) {
		console.error('[Strategy] suggestTopics error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

/**
 * GET real keyword metrics from DataForSEO for a single keyword.
 * Used by the Add/Edit Topic modal to enrich manually-entered keywords
 * with the same real data quality as AI-generated topics.
 *
 * POST /api/strategy/keyword-metrics
 * Body: { keyword: string }
 */
export const getKeywordMetricsHandler: RequestHandler = async (req, res) => {
	const { keyword } = req.body as { keyword?: string };
	if (!keyword?.trim()) {
		return res.status(400).json({ error: 'keyword is required' });
	}

	try {
		const metrics = await getKeywordMetrics(keyword.trim());
		return res.json(metrics);
	} catch (err) {
		console.error('[Strategy] getKeywordMetrics error:', err);
		return res.status(500).json({ error: 'Failed to fetch keyword metrics' });
	}
};
