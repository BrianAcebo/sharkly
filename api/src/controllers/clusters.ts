import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { createNotificationForUser } from '../utils/notifications.js';
import { serperSearch } from '../utils/serper.js';
import { getKeywordSuggestions } from '../utils/dataforseo.js';
import type { DfsKeyword } from '../utils/dataforseo.js';
import { CREDIT_COSTS } from '../utils/credits.js';
import { classifyPageType } from '../utils/croChecklist.js';
import { detectKeywordCannibalization } from '../utils/keywordCannibalization.js';
import { captureApiError, captureApiWarning } from '../utils/sentryCapture.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';
const CLAUDE_SONNET_MODEL = process.env.CLAUDE_SONNET_MODEL || 'claude-sonnet-4-5-20250929';
const GPT_CONTENT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';

/** Simple Claude call — used for zone seed generation (Phase 0) */
async function callClaudeForZones(system: string, user: string): Promise<string | null> {
	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: CLAUDE_SONNET_MODEL,
				max_tokens: 800,
				messages: [{ role: 'user', content: user }],
				system
			})
		});
		if (!res.ok) return null;
		const d = (await res.json()) as { content?: Array<{ type: string; text: string }> };
		return d.content?.find((c) => c.type === 'text')?.text ?? null;
	} catch {
		return null;
	}
}

function parseJSONSafe<T>(raw: string | null, fallback: T): T {
	if (!raw) return fallback;
	try {
		return JSON.parse(raw.replace(/\`\`\`json\n?|\n?\`\`\`/g, '').trim()) as T;
	} catch {
		return fallback;
	}
}

// ---------------------------------------------------------------------------
// AI curation + gap-fill — Claude Haiku with OpenAI fallback.
//
// Pipeline philosophy (mirrors how a human SEO analyst works in SEMrush):
//   1. Dump ALL real keyword research (DFS + PAA + related) to AI
//   2. AI reads through the list and picks the genuinely useful articles —
//      using both the keyword metrics AND topical judgment (ignoring "near me",
//      navigational, generic industry results)
//   3. If the curated list is still short of the requested count, AI adds
//      its own creative suggestions to fill the gap
//
// This way: curated picks always have real DFS metrics; AI-only suggestions
// fill in only when real research is genuinely thin.
// ---------------------------------------------------------------------------

// AI designs the full article plan — not just keyword selection.
type AIArticlePlan = {
	title: string; // human-readable article title
	keyword: string; // primary keyword (from research or AI-generated)
	rationale: string; // what question this answers that no other article in the list does
	source: 'research' | 'ai';
};

type AICurationResult = {
	selected: string[]; // kept for backward compat with metric lookup
	generated: string[]; // kept for backward compat
	plans: AIArticlePlan[]; // the real output — full article designs with titles
};

// ---------------------------------------------------------------------------
// Extract "differentiating qualifiers" — the words that make a topic keyword
// SPECIFIC vs generic. Used to pre-filter DFS data before AI curation.
//
// e.g. "best ecommerce platform for seo"
//   → strip stopwords + generic domain words → ["seo"]
// e.g. "shopify product page optimization"
//   → strip → ["shopify", "optimization"]
// e.g. "how to trim trees before hurricanes"
//   → strip → ["trim", "trees", "hurricanes"]
// ---------------------------------------------------------------------------
const CURATION_STOPWORDS = new Set([
	'best',
	'top',
	'good',
	'great',
	'how',
	'to',
	'what',
	'is',
	'are',
	'why',
	'do',
	'does',
	'can',
	'for',
	'the',
	'a',
	'an',
	'with',
	'and',
	'or',
	'of',
	'in',
	'on',
	'at',
	'by',
	'vs',
	'guide',
	'tutorial',
	'review',
	'reviews',
	'list',
	'tips',
	'examples',
	'ways',
	'using',
	'use',
	'get',
	'make',
	'create',
	'build',
	'your',
	'my',
	'our',
	'complete',
	'ultimate',
	'full',
	'quick',
	'easy',
	'simple',
	'free',
	'paid',
	'online',
	'beginner',
	'beginners',
	'advanced',
	'expert',
	'professional',
	'small',
	'large',
	'big',
	'new',
	'old',
	'start',
	'starting',
	'started',
	'most',
	'more',
	'less',
	'better',
	'worse',
	'increase',
	'decrease',
	'improve',
	'understand',
	'learn',
	'find',
	'need',
	'need',
	'want',
	'help',
	'work',
	'will',
	'without',
	'with',
	'after',
	'before',
	'during'
]);
// Words too generic to serve as topical differentiators on their own
const GENERIC_DOMAIN_WORDS = new Set([
	'business',
	'company',
	'website',
	'service',
	'services',
	'product',
	'products',
	'store',
	'shop',
	'brand',
	'marketing',
	'content',
	'page',
	'pages',
	'site',
	'digital',
	'web',
	'internet',
	'media',
	'social',
	'email',
	'blog',
	'platform',
	'software',
	'tool',
	'tools',
	'app',
	'apps',
	'system',
	'solution',
	'strategy',
	'approach',
	'method',
	'process',
	'technique',
	'people',
	'user',
	'users',
	'customer',
	'customers',
	'audience',
	'traffic',
	'search',
	'result',
	'results',
	'data',
	'site',
	'sites',
	'type',
	'types',
	'option',
	'options'
]);

function extractDifferentiatingQualifiers(keyword: string): string[] {
	return keyword
		.toLowerCase()
		.replace(/[^\w\s]/g, '')
		.split(/\s+/)
		.filter((w) => w.length >= 3 && !CURATION_STOPWORDS.has(w) && !GENERIC_DOMAIN_WORDS.has(w));
}

async function callAICuration(
	topicKeyword: string,
	topicTitle: string,
	focusPageTitle: string,
	dfsKeywords: Array<{ keyword: string; volume: number; kd: number; cpc: number }>,
	paaQuestions: string[],
	relatedSearches: string[],
	needed: number,
	siteContext?: {
		name?: string | null;
		niche?: string | null;
		customer_description?: string | null;
		domain_authority?: number | null;
	}
): Promise<AICurationResult> {
	// Extract what actually makes this topic specific (not generic stopwords/industry words)
	const differentiators = extractDifferentiatingQualifiers(topicKeyword);
	const differentiatorPhrase =
		differentiators.length > 0 ? differentiators.join(', ') : topicKeyword;

	// Build explicit in-scope / out-of-scope examples from the actual topic keyword
	const topicWords = topicKeyword.toLowerCase().split(/\s+/);
	const outOfScopeExample =
		topicWords.length >= 4
			? `"${topicKeyword.replace(/\b(seo|optimization|marketing|strategy)\b/i, 'basics')}" (drops the core subject)`
			: `a generic version of this topic without "${differentiatorPhrase}"`;

	const da = siteContext?.domain_authority ?? 0;
	const authNote =
		da <= 5
			? `New site (DA ${da}). Prioritise low-competition angles (KD ≤ 15).`
			: `DA ${da}. Achievable KD ≤ ${da + 10}. Avoid KD > ${da + 25}.`;

	const system = `You are a senior SEO content strategist building a topical cluster for ${siteContext?.name ?? 'a business'} — ${siteContext?.niche ?? 'a specialist brand'} serving ${siteContext?.customer_description ?? 'their target audience'}.

You think exactly like a human editor at an SEO agency: you commission writers to cover the REAL questions people have about a topic, using keyword research as signal — not as a shopping list.

AUTHORITY CONTEXT: ${authNote}

Your job is to design ToFu supporting articles that surround the focus page with topical depth, each answering a genuinely different user question, each rankable independently.

Return ONLY valid JSON. No markdown, no explanations.`;

	const dfsLines = dfsKeywords
		.slice(0, 100)
		.map((k) => `${k.keyword} | vol:${k.volume} | KD:${k.kd} | CPC:$${k.cpc.toFixed(2)}`)
		.join('\n');

	const paaLines = paaQuestions.length > 0 ? paaQuestions.join('\n') : 'none';
	const relatedLines = relatedSearches.length > 0 ? relatedSearches.join('\n') : 'none';

	const siteName = siteContext?.name ?? 'this business';
	const siteNiche = siteContext?.niche ?? 'this industry';
	const siteCustomer = siteContext?.customer_description ?? 'their target audience';
	const maxKd = da <= 5 ? 15 : da + 10;

	const user = `CLUSTER BRIEF — ${siteName} | ${siteNiche}
Customer: ${siteCustomer} | ${authNote}

Cluster topic keyword: "${topicKeyword}"
Cluster topic title: "${topicTitle}"
Focus page (MoFu — already being written): "${focusPageTitle}"

RESEARCH DATA — multi-zone keyword research across the full question landscape of this topic.
This is signal for understanding what people search, not a keyword shopping list.

DataForSEO keywords (keyword | monthly searches | KD | CPC):
${dfsLines || 'No keyword data available'}

Google People Also Ask:
${paaLines}

Google Related Searches:
${relatedLines}

YOUR TASK — DESIGN ${needed} ToFu SUPPORTING ARTICLES:
Think like a senior editor at an SEO agency commissioning writers, not like a system selecting keywords.

Step 1: Read the research. Identify the genuinely DIFFERENT questions people have about "${topicKeyword}". The multi-zone research above covers the full landscape — use it to find angles a single keyword search would miss.
Step 2: For each distinct question, design one article. Use the best matching keyword from research as the primary keyword. If no good match exists, invent a natural search phrase ${siteName} could realistically rank for.
Step 3: Apply IGS thinking [US20190155948A1]: for each article — can ${siteName} add something original that content farms can't? First-hand experience, specific data, practitioner insight? Prefer these angles.
Step 4: Prefer winnable keywords. ${authNote} Target KD ≤ ${maxKd} where possible.
Step 5: Final check — could a writer produce each article completely independently? If two articles answer the same question with different wording → replace one with a genuinely different angle.

NON-NEGOTIABLE RULES:
0. CROSS-CLUSTER REJECTION: If a keyword from the research belongs to a DIFFERENT topic cluster (e.g. "shopify seo" in a "link building" cluster), REJECT it. Do not use it. Invent a topically correct replacement. You are the firewall against keyword cannibalization.

1. Every article must be ToFu (informational/educational). The focus page covers comparisons, overviews, options — never produce: "best X", "top X", "X vs Y", "X review", "X comparison". Those duplicate the focus page.

2. Never produce a near-duplicate of the focus page:
   Focus keyword: "${topicKeyword}"
   ❌ Add adjective → "gentle ${topicKeyword}", "deep ${topicKeyword}"
   ❌ Add modifier → "best ${topicKeyword}", "${topicKeyword} guide"
   ❌ Swap synonym → minor word replacement covering the same intent
   Test: if a writer would research the same competitor pages → it's a duplicate.

3. Every article must answer a DIFFERENT underlying question. No two articles cover the same intent with different wording.

4. If research is thin, go beyond the literal keywords. Think: what does someone need to know before, during, and after dealing with "${topicKeyword}"? What does ${siteName} know from direct experience that a generic content farm doesn't?

Return a JSON array — one object per article:
[
  {
    "title": "Natural article title a human writer would pitch",
    "keyword": "primary keyword from research or invented natural search phrase",
    "rationale": "one sentence: what specific question this answers that NO other article in this list covers",
    "source": "research or ai"
  }
]

Return exactly ${needed} items. Each must be editorially distinct — a different writer, different question, different reader.`;

	const parseResult = (text: string): AICurationResult | null => {
		try {
			const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
			const parsed = JSON.parse(cleaned);
			// New format: array of article plans [{title, keyword, rationale, source}]
			if (Array.isArray(parsed)) {
				const plans: AIArticlePlan[] = parsed
					.filter(
						(p): p is Record<string, unknown> =>
							typeof p === 'object' &&
							p !== null &&
							typeof p.keyword === 'string' &&
							(p.keyword as string).trim().length > 0
					)
					.map(
						(p) =>
							({
								title:
									typeof p.title === 'string'
										? (p.title as string).trim()
										: (p.keyword as string).trim(),
								keyword: (p.keyword as string).trim().toLowerCase(),
								rationale: typeof p.rationale === 'string' ? (p.rationale as string).trim() : '',
								source: p.source === 'ai' ? 'ai' : 'research'
							}) as AIArticlePlan
					);
				if (plans.length > 0) {
					const selected = plans.filter((p) => p.source === 'research').map((p) => p.keyword);
					const generated = plans.filter((p) => p.source === 'ai').map((p) => p.keyword);
					return { selected, generated, plans };
				}
			}
			// Legacy fallback: old {selected, generated} format
			if (
				typeof parsed === 'object' &&
				parsed !== null &&
				(Array.isArray((parsed as Record<string, unknown>).selected) ||
					Array.isArray((parsed as Record<string, unknown>).generated))
			) {
				const legacy = parsed as { selected?: unknown; generated?: unknown };
				return {
					selected: ((legacy.selected as string[]) ?? []).filter(
						(s): s is string => typeof s === 'string'
					),
					generated: ((legacy.generated as string[]) ?? []).filter(
						(s): s is string => typeof s === 'string'
					),
					plans: []
				};
			}
		} catch {
			/* fall through */
		}
		return null;
	};

	// Use Claude Sonnet for curation — topical relevance judgment needs stronger reasoning
	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': ANTHROPIC_API_KEY,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: CLAUDE_SONNET_MODEL,
				max_tokens: 2000,
				messages: [{ role: 'user', content: user }],
				system
			})
		});
		if (res.ok) {
			const d = (await res.json()) as { content?: Array<{ type: string; text: string }> };
			const text = d.content?.find((c) => c.type === 'text')?.text ?? '';
			console.log(`[Clusters] AI curation (Sonnet) response: ${text.slice(0, 400)}`);
			const result = parseResult(text);
			if (result) return result;
		} else {
			const errText = await res.text();
			console.warn(
				`[Clusters] Claude Sonnet curation error: ${res.status} ${errText.slice(0, 200)}`
			);
		}
	} catch (err) {
		console.warn(
			'[Clusters] AI curation (Sonnet) exception:',
			err instanceof Error ? err.message : err
		);
	}

	// Fallback to OpenAI
	try {
		if (!OPENAI_API_KEY) {
			console.warn('[Clusters] No OPENAI_API_KEY for AI curation fallback');
			return { selected: [], generated: [], plans: [] };
		}
		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
			body: JSON.stringify({
				model: GPT_CONTENT_MODEL,
				max_tokens: 2000,
				messages: [
					{ role: 'system', content: system },
					{ role: 'user', content: user }
				]
			})
		});
		if (!res.ok) {
			console.warn(`[Clusters] OpenAI curation error: ${res.status}`);
			return { selected: [], generated: [], plans: [] };
		}
		const d = (await res.json()) as { choices?: Array<{ message: { content: string } }> };
		const text = d.choices?.[0]?.message?.content ?? '';
		console.log(`[Clusters] AI curation (OpenAI) response: ${text.slice(0, 400)}`);
		const result = parseResult(text);
		if (result) return result;
	} catch (err) {
		console.warn(
			'[Clusters] AI curation (OpenAI) exception:',
			err instanceof Error ? err.message : err
		);
	}

	return { selected: [], generated: [], plans: [] };
}

type ArticleCandidate = {
	keyword: string;
	monthly_searches: number | null;
	keyword_difficulty: number | null;
	cpc: number | null;
	source: 'dataforseo' | 'paa' | 'related' | 'ai';
	score: number;
};

// Score formula — rewards high CPC (commercial value), decent volume, low competition
const scoreKw = (k: Pick<DfsKeyword, 'cpc' | 'monthly_searches' | 'keyword_difficulty'>) =>
	((k.cpc + 0.1) * Math.sqrt(k.monthly_searches)) / (k.keyword_difficulty + 1);

// ---------------------------------------------------------------------------
// Near-duplicate detection
// Catches: punctuation variants, substring containment, SERP modifier variants,
// and high word overlap.
//
// SERP modifiers are suffixes that change where the result appears (reddit, free,
// 2025, near me) but NOT the underlying article topic. Strip them before comparing
// so "best X for seo reddit" ≈ "best X for seo free" ≈ "best X for seo".
// ---------------------------------------------------------------------------
const SERP_MODIFIERS = new Set([
	'reddit',
	'free',
	'cheap',
	'affordable',
	'online',
	'2024',
	'2025',
	'2026',
	'near',
	'me',
	'review',
	'reviews',
	'alternative',
	'alternatives',
	'list',
	'tool',
	'tools',
	'software',
	'app',
	'apps',
	'download',
	'plugin',
	'plugins'
]);

// Generic words that don't contribute to an article's unique "angle"
// Used when stripping topic base words to find the distinguishing part of a keyword
const QUALIFIER_STOPWORDS = new Set([
	'best',
	'top',
	'how',
	'to',
	'for',
	'the',
	'a',
	'an',
	'is',
	'are',
	'what',
	'why',
	'when',
	'where',
	'guide',
	'tips',
	'ways',
	'vs',
	'versus',
	'and',
	'or',
	'of',
	'in',
	'on',
	'at',
	'by',
	'with',
	'free',
	'online',
	'use',
	'using',
	'get',
	'make',
	'create',
	'build',
	'find',
	'need',
	'know',
	'start',
	'type',
	'types',
	'way',
	'do',
	'does',
	'did',
	'will',
	'can',
	'should',
	'would',
	'could',
	'about',
	'your',
	'you',
	'that',
	'this'
]);

function normalizeKw(kw: string): string {
	return kw
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function corePhrase(kw: string): string {
	return normalizeKw(kw)
		.split(' ')
		.filter((w) => !SERP_MODIFIERS.has(w))
		.join(' ');
}

// Question-word starters that don't carry semantic meaning for dedup purposes.
// "which X is best" ≈ "best X" — the "which" prefix doesn't differentiate content.
const QUESTION_STARTERS = new Set(['which', 'whose', 'where', 'whether', 'whom']);

function meaningfulWords(kw: string): Set<string> {
	// Extended STOP list — includes question starters so "which X is Y" ≈ "best X for Y"
	const STOP = new Set([
		'a',
		'an',
		'the',
		'for',
		'of',
		'to',
		'in',
		'on',
		'at',
		'is',
		'are',
		'or',
		'and',
		'vs',
		'with',
		'by',
		'from',
		'that',
		'this',
		'it',
		'be',
		'as',
		'do',
		'does',
		'how',
		'what',
		'why',
		'when',
		'who',
		'can',
		'will',
		'should',
		'i',
		'my',
		'which',
		'whose',
		'where',
		'whether',
		'whom'
	]);
	return new Set(
		corePhrase(kw)
			.split(' ')
			.filter((w) => w.length > 2 && !STOP.has(w))
	);
}

function isNearDuplicate(a: string, b: string): boolean {
	const na = normalizeKw(a);
	const nb = normalizeKw(b);
	if (na === nb) return true;
	// One is a substring of the other (catches "X reddit", "X free", "X 2025" variants)
	if (na.includes(nb) || nb.includes(na)) return true;
	// Core phrase match after stripping SERP modifiers
	const ca = corePhrase(a);
	const cb = corePhrase(b);
	if (ca === cb && ca.length > 0) return true;
	if (ca.length > 4 && cb.length > 4 && (ca.includes(cb) || cb.includes(ca))) return true;
	// Semantic question-rephrasing: strip question starters then compare core phrases
	// Catches: "which X is best for Y" ≈ "best X for Y", "what is X for Y" ≈ "X for Y"
	const stripQStarters = (s: string) =>
		s
			.split(' ')
			.filter((w) => !QUESTION_STARTERS.has(w))
			.join(' ');
	const qa = corePhrase(stripQStarters(na));
	const qb = corePhrase(stripQStarters(nb));
	if (qa.length > 4 && qb.length > 4 && (qa === qb || qa.includes(qb) || qb.includes(qa)))
		return true;
	// Jaccard similarity on meaningful words — lowered threshold to 0.65 to catch
	// more semantic rephrasing variants (question forms, word order changes, etc.)
	const wa = meaningfulWords(a);
	const wb = meaningfulWords(b);
	if (wa.size === 0 || wb.size === 0) return false;
	const intersection = [...wa].filter((x) => wb.has(x)).length;
	const union = new Set([...wa, ...wb]).size;
	return intersection / union > 0.65;
}

// ---------------------------------------------------------------------------
// Search intent detection
// Determines the searcher's goal: informational (learn), commercial (compare/pick),
// or transactional (buy/hire). Used for funnel staging and focus page title.
// ---------------------------------------------------------------------------
type SearchIntent = 'informational' | 'commercial' | 'transactional';

function detectSearchIntent(keyword: string): SearchIntent {
	const kw = keyword.toLowerCase();
	if (
		/\b(buy|price|pricing|cost|hire|near me|discount|deal|free trial|sign up|get started|order|quote|shop)\b/.test(
			kw
		)
	)
		return 'transactional';
	if (
		/\b(best|top|vs|versus|compare|comparison|review|reviews|worth it|ranking|alternative|alternatives|recommend)\b/.test(
			kw
		)
	)
		return 'commercial';
	return 'informational';
}

function intentToFunnelStage(intent: SearchIntent): 'tofu' | 'mofu' | 'bofu' {
	if (intent === 'transactional') return 'bofu';
	if (intent === 'commercial') return 'mofu';
	return 'tofu';
}

// Derives a human-readable content format recommendation from the keyword.
// Used to advise users on what kind of page to build in the workspace.
// NOTE: For pages.page_type we use classifyPageType (canonical CRO types).
// detectPageType is kept for cluster_runs suggestions and legacy display fallback.
function detectPageType(keyword: string): string {
	const kw = keyword.toLowerCase();
	// Transactional / service pages
	if (
		/\b(buy|shop|order|hire|near me|service|services|quote|get started|sign up|free trial)\b/.test(
			kw
		)
	)
		return 'Service / Landing Page';
	if (/\b(price|pricing|cost|how much|affordable|cheap)\b/.test(kw)) return 'Pricing Guide';
	// Commercial comparison pages
	if (/\bvs\b|\bversus\b/.test(kw)) return 'Versus Comparison';
	if (/\balternative(s)?\b/.test(kw)) return 'Alternatives Listicle';
	if (/\breview(s)?\b/.test(kw)) return 'Review Article';
	if (/\b(best|top)\b.*\b(for|to|when|tool|app|platform|software|plugin)\b/.test(kw))
		return 'Comparison Listicle';
	if (/\b(best|top) \d+\b|\b\d+ best\b/.test(kw)) return 'Listicle';
	if (/\bbest\b|\btop\b/.test(kw)) return 'Comparison Listicle';
	// How-to / tutorial
	if (/\bhow (to|do|does|can|should|i|you)\b/.test(kw)) return 'How-To Guide';
	// What is / definition
	if (/\bwhat (is|are|does|means?)\b/.test(kw)) return 'Educational Article';
	if (/\bdefinition\b|\bexplained?\b|\bmeaning\b|\bglossary\b/.test(kw))
		return 'Educational Article';
	// Why / explainer
	if (/\bwhy\b/.test(kw)) return 'Explainer Article';
	// When / checklist
	if (/\bwhen (to|should|do|is)\b/.test(kw)) return 'Q&A Article';
	if (/\bchecklist\b/.test(kw)) return 'Checklist Article';
	// Statistics / research
	if (/\bstatistic(s)?\b|\bstat(s)?\b|\bdata\b|\bstudy\b|\bstudies\b|\bresearch\b/.test(kw))
		return 'Statistics Article';
	// Guide / tutorial
	if (/\bguide\b|\btutorial\b|\bwalkthrough\b/.test(kw)) return 'Complete Guide';
	// Default by intent
	const intent = detectSearchIntent(kw);
	if (intent === 'transactional') return 'Landing Page';
	if (intent === 'commercial') return 'Comparison Article';
	return 'Informational Article';
}

function focusPageTitle(topicTitle: string, _keyword: string): string {
	// Topic title is already MoFu-framed from strategy — never append suffixes.
	return topicTitle;
}

// ---------------------------------------------------------------------------
// Radial position layout — supports up to 21 nodes (1 focus + 20 articles)
// Inner ring: 8 articles at radius 150, outer ring: 12 articles at radius 280
// ---------------------------------------------------------------------------
function computePositions(articleCount: number): Array<[number, number]> {
	const cx = 400;
	const cy = 300;
	const positions: Array<[number, number]> = [[cx, cy]]; // focus page at center

	const innerCount = Math.min(articleCount, 8);
	for (let i = 0; i < innerCount; i++) {
		const angle = (2 * Math.PI * i) / innerCount - Math.PI / 2;
		positions.push([
			Math.round(cx + 150 * Math.cos(angle)),
			Math.round(cy + 150 * Math.sin(angle))
		]);
	}

	const outerCount = Math.min(articleCount - innerCount, 12);
	for (let i = 0; i < outerCount; i++) {
		const angle = (2 * Math.PI * i) / outerCount - Math.PI / 2;
		positions.push([
			Math.round(cx + 280 * Math.cos(angle)),
			Math.round(cy + 280 * Math.sin(angle))
		]);
	}

	return positions;
}

// ---------------------------------------------------------------------------
// Internal link generation — Reverse Silo algorithm (Spec §17.6)
// Patent basis: US8117209B1 (Reasonable Surfer Model)
//
// Rules:
// 1. Every article links UP to the focus page (reverse silo — must-have)
// 2. Articles link to sibling articles in groups of 5
// 3. Focus page links DOWN to 3 articles (distributes equity)
// ---------------------------------------------------------------------------
async function generateInternalLinkSuggestions(
	clusterId: string,
	focusPageId: string,
	focusKeyword: string,
	articlePages: Array<{ id: string; keyword: string; title: string }>
): Promise<void> {
	const links: Array<{
		cluster_id: string;
		from_page_id: string;
		to_page_id: string;
		anchor_text: string;
		placement_hint: string;
		equity_multiplier: number;
		priority: number;
		implemented: boolean;
	}> = [];

	// Rule 1: Every article → focus page (highest priority, equity 1.0)
	for (const article of articlePages) {
		links.push({
			cluster_id: clusterId,
			from_page_id: article.id,
			to_page_id: focusPageId,
			anchor_text: focusKeyword,
			placement_hint:
				'Include a contextual link to the main guide in the first or second paragraph where it naturally fits.',
			equity_multiplier: 1.0,
			priority: 1,
			implemented: false
		});
	}

	// Rule 2: Article → sibling articles in groups of 5
	const groupSize = 5;
	for (let i = 0; i < articlePages.length; i++) {
		const groupStart = Math.floor(i / groupSize) * groupSize;
		const groupEnd = Math.min(groupStart + groupSize, articlePages.length);
		const siblings = articlePages
			.slice(groupStart, groupEnd)
			.filter((_, j) => groupStart + j !== i);
		for (const sibling of siblings) {
			links.push({
				cluster_id: clusterId,
				from_page_id: articlePages[i].id,
				to_page_id: sibling.id,
				anchor_text: sibling.keyword,
				placement_hint:
					'Link to this related article within a relevant section using natural anchor text.',
				equity_multiplier: 0.8,
				priority: 2,
				implemented: false
			});
		}
	}

	// Rule 3: Focus page → top 3 articles (equity distribution)
	const top3 = articlePages.slice(0, 3);
	for (const article of top3) {
		links.push({
			cluster_id: clusterId,
			from_page_id: focusPageId,
			to_page_id: article.id,
			anchor_text: article.keyword,
			placement_hint:
				'Link to this supporting article in the relevant section that covers this subtopic.',
			equity_multiplier: 0.8, // spec: focus→article downlink equity [Reasonable Surfer US8117209B1]
			priority: 2,
			implemented: false
		});
	}

	if (links.length === 0) return;

	// Insert — non-fatal if internal_links table doesn't exist
	try {
		const { error } = await supabase.from('internal_links').insert(links);
		if (error) {
			console.warn('[Clusters] Internal links insert warning:', error.message);
		}
	} catch (err) {
		console.warn('[Clusters] Internal links insert failed (non-fatal):', err);
	}
}

export const createCluster = async (req: Request, res: Response) => {
	let userId: string | undefined;
	let orgId: string | undefined;
	let creditsDeducted = false;
	try {
		userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const { topicId, maxArticles } = req.body as { topicId: string; maxArticles?: number };
		if (!topicId) return res.status(400).json({ error: 'topicId is required' });
		// Clamp user-chosen count to 3–20; default 6 if not provided
		const articleLimit = Math.min(20, Math.max(3, Math.round(maxArticles ?? 6)));

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg?.organization_id) {
			return res.status(400).json({ error: 'No organization. Complete onboarding first.' });
		}

		orgId = userOrg.organization_id;

		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', orgId)
			.single();

		const creditsRemaining = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (creditsRemaining < CREDIT_COSTS.CLUSTER_GENERATION) {
			return res.status(402).json({
				error: 'Insufficient credits',
				required: CREDIT_COSTS.CLUSTER_GENERATION,
				available: creditsRemaining
			});
		}

		// Charge credits before any API calls (DataForSEO, Serper, AI)
		const creditsAfterCreate = Math.max(0, creditsRemaining - CREDIT_COSTS.CLUSTER_GENERATION);
		const { error: deductErr } = await supabase
			.from('organizations')
			.update({
				included_credits_remaining: creditsAfterCreate,
				...(org?.included_credits != null && { included_credits: creditsAfterCreate })
			})
			.eq('id', orgId);
		if (deductErr) {
			console.error('[Clusters] Failed to deduct credits:', deductErr);
			return res.status(500).json({ error: 'Failed to deduct credits' });
		}
		creditsDeducted = true;

		const { data: topic, error: topicErr } = await supabase
			.from('topics')
			.select(
				'id, site_id, target_id, title, keyword, monthly_searches, keyword_difficulty, cpc, funnel_stage'
			)
			.eq('id', topicId)
			.single();

		if (topicErr || !topic) {
			return res.status(404).json({ error: 'Topic not found' });
		}

		const siteId = topic.site_id;

		// Fetch site for business context — used in zone mapping + AI curation
		const { data: site } = await supabase
			.from('sites')
			.select('name, niche, customer_description, domain_authority')
			.eq('id', siteId)
			.single();

		// Phase 5: Pre-fill cluster destination from target (target's destination is default)
		let clusterInsert: Record<string, unknown> = {
			site_id: siteId,
			topic_id: topicId,
			title: topic.title,
			target_keyword: topic.keyword,
			status: 'active',
			funnel_coverage: { tofu: 0, mofu: 0, bofu: 0 },
			completion_pct: 0
		};
		if (topic.target_id) {
			const { data: target } = await supabase
				.from('targets')
				.select('destination_page_url, destination_page_label')
				.eq('id', topic.target_id)
				.single();
			if (target?.destination_page_url) {
				clusterInsert.architecture = 'B';
				clusterInsert.destination_page_url = target.destination_page_url;
				clusterInsert.destination_page_label =
					target.destination_page_label || target.destination_page_url;
			}
		}

		const { data: cluster, error: clusterErr } = await supabase
			.from('clusters')
			.insert(clusterInsert)
			.select('id')
			.single();

		if (clusterErr || !cluster) {
			console.error('[Clusters] Create failed:', clusterErr);
			return res.status(500).json({ error: 'Failed to create cluster' });
		}

		// ── Phase 0: Topic zone mapping ─────────────────────────────────────────
		// Mirror strategy.ts's multi-zone parallel research, scoped to one topic.
		// A single DFS call on the focus keyword only returns keyword variants of
		// that one phrase — missing the full question landscape around the topic.
		// Zone mapping generates 4-8 distinct sub-angles, each searched separately,
		// producing a keyword pool that's 4-8× richer and covers all article angles.
		console.log(`[Clusters] Phase 0: topic zone mapping for "${topic.keyword}"`);

		const zoneRaw = await callClaudeForZones(
			`You are a senior SEO strategist generating DataForSEO search seeds.
These seeds are NOT article titles — they are short keyword phrases used to pull keyword data from a database.
Short, common phrases return hundreds of results. Long, specific phrases return zero.
Return ONLY valid JSON, no markdown.`,
			`Business: ${site?.name ?? 'Unknown'} | Niche: ${site?.niche ?? 'Unknown'}
Focus topic keyword: "${topic.keyword}"

Generate 5-7 DataForSEO seed keywords that cover the distinct sub-angles of this topic.

CRITICAL RULES FOR SEEDS — this is about getting real data, not describing articles:
- Seeds must be SHORT: 2-3 words maximum. 4+ word seeds almost always return 0 results.
- Seeds must be COMMON: phrases people actually type into Google as a category search, not long-tail questions
- Seeds must be DISTINCT: each seed covers a different angle, not a variation of the same phrase
- Do NOT include the focus keyword itself — it's already covered as the primary zone

BAD seeds (too long/specific → 0 DFS results):
❌ "broken link building ecommerce" → too specific, 0 results
❌ "supplier partnership link acquisition" → nobody searches this
❌ "ecommerce PR link building strategy" → too long
❌ "competitor backlink analysis ecommerce" → too specific

GOOD seeds (short, common → real DFS data):
✓ "link building" → thousands of keywords
✓ "backlink strategy" → hundreds of keywords
✓ "digital PR SEO" → solid data
✓ "guest posting SEO" → real data
✓ "broken link building" → real data (2 words, common phrase)

EXAMPLE — focus topic: "ecommerce link building"
Good zones: ["link building", "backlink strategy", "digital PR SEO", "guest posting SEO", "broken link building", "domain authority"]

EXAMPLE — focus topic: "moisturizer with benzoyl peroxide"
Good zones: ["benzoyl peroxide", "acne moisturizer", "acne skincare routine", "dry skin acne", "skin barrier repair"]

EXAMPLE — focus topic: "shopify product page seo"
Good zones: ["product page SEO", "shopify SEO", "ecommerce meta tags", "product description SEO", "schema markup ecommerce"]

Return:
{
  "zone_seeds": ["5-7 short seeds, 2-3 words each, that will return real DFS data"],
  "reasoning": "one sentence on what angles you mapped"
}`
		);

		const zoneData = parseJSONSafe<{ zone_seeds: string[]; reasoning?: string }>(zoneRaw, {
			zone_seeds: []
		});

		// Always include the topic keyword itself as the primary zone
		const allZoneSeeds = [
			topic.keyword,
			...(zoneData.zone_seeds ?? []).filter((z: string) => z && z.trim().length > 0)
		].slice(0, 9); // cap at 9 zones (1 primary + up to 8 sub-angles)

		console.log(
			`[Clusters] Phase 0: ${allZoneSeeds.length} zones mapped — ${allZoneSeeds.join(' | ')}`
		);

		// ── Phase 1: Parallel keyword research across all zones ──────────────────
		// Fire DFS + Serper simultaneously for every zone — same pattern as strategy.ts.
		// This produces a keyword pool 4-8× richer than a single DFS call.
		console.log(`[Clusters] Phase 1: parallel research across ${allZoneSeeds.length} zones`);

		const [dfsZoneResults, serpZoneResults] = await Promise.all([
			Promise.allSettled(allZoneSeeds.map((seed) => getKeywordSuggestions(seed, { limit: 50 }))),
			Promise.allSettled(allZoneSeeds.map((seed) => serperSearch(seed, 10)))
		]);

		// Merge DFS results — deduplicate globally (keyword assigned to first zone it appears in)
		const globalSeenKws = new Set<string>();
		const allDfsKeywords: DfsKeyword[] = [];
		dfsZoneResults.forEach((r) => {
			if (r.status !== 'fulfilled') return;
			for (const kw of r.value.keywords) {
				if (!globalSeenKws.has(kw.keyword)) {
					globalSeenKws.add(kw.keyword);
					allDfsKeywords.push(kw);
				}
			}
		});

		// Merge Serper PAA + related across all zones
		const allPAASignals: string[] = [];
		const allRelatedSignals: string[] = [];
		serpZoneResults.forEach((r) => {
			if (r.status !== 'fulfilled') return;
			const data = r.value;
			(data.peopleAlsoAsk ?? []).forEach((p) => {
				if (p.question) allPAASignals.push(p.question);
			});
			(data.relatedSearches ?? []).forEach((s) => {
				if (s.query) allRelatedSignals.push(s.query);
			});
		});

		const uniquePAA = [...new Set(allPAASignals)];
		const uniqueRelated = [...new Set(allRelatedSignals)];

		console.log(
			`[Clusters] Phase 1: ${allDfsKeywords.length} DFS keywords across ${allZoneSeeds.length} zones | PAA: ${uniquePAA.length} | Related: ${uniqueRelated.length}`
		);

		// ── Phase 2: Quality filter on merged pool ────────────────────────────────
		// Zone seeds were AI-curated for topical relevance — no need to re-apply a
		// qualifier gate here. That gate was designed for single-zone DFS dumps where
		// unrelated keywords bleed in. With multi-zone research the pool is already scoped.
		// We only filter for basic quality: difficulty, volume, minimum word count.
		const qualifyingDfs = allDfsKeywords.filter((k) => {
			const kLower = k.keyword.toLowerCase();
			if (kLower === topic.keyword.toLowerCase()) return false;
			if (k.keyword.split(/\s+/).length < 2) return false; // allow 2+ words (not just 3+)
			if (k.keyword_difficulty > 65) return false; // slightly higher ceiling than before
			if (k.monthly_searches < 20) return false; // slightly lower floor to keep more data
			return true;
		});

		const rankedDfs = [...qualifyingDfs].sort((a, b) => scoreKw(b) - scoreKw(a));
		const paaQuestions = uniquePAA.slice(0, 20);
		const related = uniqueRelated.slice(0, 20);

		console.log(
			`[Clusters] Phase 2: ${rankedDfs.length} qualifying DFS, ${paaQuestions.length} PAA, ${related.length} related`
		);

		// ── Phase 2: AI curation + gap-fill ─────────────────────────────────────
		// AI reads the full research dump and acts like a human SEO analyst:
		//   - Picks the keywords that make great supporting articles for this topic
		//   - Skips generic, navigational, local, or off-topic results
		//   - Enforces strict diversity — no two articles with the same intent
		//   - Generates additional ideas only when research is thin
		const focusPgTitle = focusPageTitle(topic.title, topic.keyword);
		const dfsForAI = rankedDfs.map((k) => ({
			keyword: k.keyword,
			volume: k.monthly_searches,
			kd: k.keyword_difficulty,
			cpc: k.cpc
		}));

		// 2× buffer gives intent-dedup enough candidates — with multi-zone research
		// the pool is large enough that gap-fill is rarely needed.
		const aiRequestCount = articleLimit * 2 + 5;
		console.log(
			`[Clusters] Phase 2: AI curation — requesting ${aiRequestCount} (target: ${articleLimit}) from ${dfsForAI.length} DFS + ${paaQuestions.length} PAA + ${related.length} related`
		);
		const aiResult = await callAICuration(
			topic.keyword,
			topic.title,
			focusPgTitle,
			dfsForAI,
			paaQuestions,
			related,
			aiRequestCount,
			site ?? undefined
		);
		console.log(
			`[Clusters] Phase 2: AI selected ${aiResult.selected.length} from research, generated ${aiResult.generated.length} new ideas`
		);

		// ── Phase 3: Build final candidate list ──────────────────────────────────
		// Map AI-selected keywords back to DFS data for real metrics.
		// AI-generated gap-fill ideas get metrics via fuzzy DFS lookup.
		const dfsMap = new Map(allDfsKeywords.map((k) => [normalizeKw(k.keyword), k]));

		// Build word index for fuzzy lookup (used for AI-generated keywords)
		const dfsByWord = new Map<string, DfsKeyword[]>();
		for (const k of allDfsKeywords) {
			for (const word of normalizeKw(k.keyword).split(' ')) {
				if (word.length < 4) continue;
				if (!dfsByWord.has(word)) dfsByWord.set(word, []);
				dfsByWord.get(word)!.push(k);
			}
		}

		// Track DFS keywords we've already used for fuzzy matching — prevents multiple different
		// article keywords from inheriting the same volume (e.g. all showing 720).
		const usedFuzzyDfsKeywords = new Set<string>();

		function findDfsMatch(kw: string): DfsKeyword | null {
			const exact = dfsMap.get(normalizeKw(kw));
			if (exact) return exact;
			// Fuzzy word-overlap matching for AI-generated keywords
			const words = normalizeKw(kw)
				.split(' ')
				.filter((w) => w.length >= 4);
			if (words.length === 0) return null;
			const counts = new Map<string, { kw: DfsKeyword; n: number }>();
			for (const w of words) {
				for (const k of dfsByWord.get(w) ?? []) {
					const e = counts.get(k.keyword);
					counts.set(k.keyword, { kw: k, n: (e?.n ?? 0) + 1 });
				}
			}
			const best = [...counts.values()]
				.filter(
					(c) =>
						c.n >= Math.max(1, Math.floor(words.length * 0.4)) &&
						!usedFuzzyDfsKeywords.has(c.kw.keyword)
				)
				.sort((a, b) => scoreKw(b.kw) - scoreKw(a.kw))[0];
			return best?.kw ?? null;
		}

		const accepted: ArticleCandidate[] = [];

		// Seed with topic keyword — prevents near-duplicates of the focus page
		accepted.push({
			keyword: topic.keyword,
			monthly_searches: null,
			keyword_difficulty: null,
			cpc: null,
			source: 'dataforseo',
			score: 0
		});

		const isDupe = (kw: string) => accepted.some((a) => isNearDuplicate(a.keyword, kw));
		const minWords = (kw: string) => kw.trim().split(/\s+/).length >= 3;

		const pushWithDfsTracking = (cand: ArticleCandidate, kw: string, match: DfsKeyword | null) => {
			// If fuzzy match (article kw ≠ DFS kw), mark DFS kw as used so we don't reuse it
			if (match && normalizeKw(match.keyword) !== normalizeKw(kw)) {
				usedFuzzyDfsKeywords.add(match.keyword);
			}
			accepted.push(cand);
		};

		// Primary: use AI article plans (new format with title + keyword + rationale)
		// The AI owns editorial dedup — we just enrich with DFS metrics and do exact-string safety check.
		if (aiResult.plans && aiResult.plans.length > 0) {
			for (const plan of aiResult.plans) {
				const kw = plan.keyword;
				if (!minWords(kw) || isDupe(kw)) continue;
				const match = findDfsMatch(kw);
				pushWithDfsTracking(
					{
						keyword: kw,
						aiTitle: plan.title,
						monthly_searches: match?.monthly_searches ?? null,
						keyword_difficulty: match?.keyword_difficulty ?? null,
						cpc: match?.cpc ?? null,
						source: match ? 'dataforseo' : 'ai',
						score: match ? scoreKw(match) * 1.1 : plan.source === 'research' ? 40 : 30
					} as ArticleCandidate & { aiTitle?: string },
					kw,
					match
				);
			}
		} else {
			// Legacy fallback: old selected/generated format
			for (const kw of aiResult.selected) {
				if (!minWords(kw) || isDupe(kw)) continue;
				const match = findDfsMatch(kw);
				pushWithDfsTracking(
					{
						keyword: kw,
						monthly_searches: match?.monthly_searches ?? null,
						keyword_difficulty: match?.keyword_difficulty ?? null,
						cpc: match?.cpc ?? null,
						source: match ? 'dataforseo' : 'ai',
						score: match ? scoreKw(match) * 1.1 : 45
					},
					kw,
					match
				);
			}
			for (const kw of aiResult.generated) {
				if (!minWords(kw) || isDupe(kw)) continue;
				const match = findDfsMatch(kw);
				pushWithDfsTracking(
					{
						keyword: kw,
						monthly_searches: match?.monthly_searches ?? null,
						keyword_difficulty: match?.keyword_difficulty ?? null,
						cpc: match?.cpc ?? null,
						source: match ? 'dataforseo' : 'ai',
						score: match ? scoreKw(match) : 30
					},
					kw,
					match
				);
			}
		}

		// If AI curation failed (API error), fall back to score-ranked DFS + PAA
		if (aiResult.selected.length === 0 && aiResult.generated.length === 0) {
			console.warn(
				'[Clusters] AI curation returned nothing — falling back to score-ranked research'
			);
			for (const k of rankedDfs) {
				if (isDupe(k.keyword)) continue;
				accepted.push({
					keyword: k.keyword,
					monthly_searches: k.monthly_searches,
					keyword_difficulty: k.keyword_difficulty,
					cpc: k.cpc,
					source: 'dataforseo',
					score: scoreKw(k)
				});
			}
			for (const q of paaQuestions) {
				if (!minWords(q) || isDupe(q)) continue;
				const m = dfsMap.get(normalizeKw(q));
				accepted.push({
					keyword: q,
					monthly_searches: m?.monthly_searches ?? null,
					keyword_difficulty: m?.keyword_difficulty ?? null,
					cpc: m?.cpc ?? null,
					source: 'paa',
					score: m ? scoreKw(m) * 1.3 : 50
				});
			}
		}

		// Lightweight dedup — AI already did editorial dedup above.
		// We only do a final near-duplicate string check here as a safety net.
		// The old intent-group dedup was over-aggressive: it collapsed distinct
		// articles into the same "other:" bucket and dropped them, destroying count.
		const seenNormalized = new Set<string>();
		seenNormalized.add(normalizeKw(topic.keyword));

		const deduped = accepted
			.filter((a) => a.keyword.toLowerCase() !== topic.keyword.toLowerCase())
			.sort((a, b) => b.score - a.score)
			.filter((a) => {
				const n = normalizeKw(a.keyword);
				if (seenNormalized.has(n)) return false;
				// Also check near-duplicate against all already-accepted keywords
				for (const seen of seenNormalized) {
					if (isNearDuplicate(seen, a.keyword)) return false;
				}
				seenNormalized.add(n);
				return true;
			});

		let sortedCandidates = deduped.slice(0, articleLimit);

		// Gap-fill: if dedup left us short, AI fills first (with full DFS context
		// so its suggestions are data-informed), then raw DFS as absolute last resort.
		if (sortedCandidates.length < articleLimit) {
			const usedKeywords = new Set([
				normalizeKw(topic.keyword),
				...sortedCandidates.map((a) => normalizeKw(a.keyword))
			]);
			const remaining = articleLimit - sortedCandidates.length;
			console.log(`[Clusters] Gap-fill: short by ${remaining} — asking AI with full DFS context`);

			// Include topic keyword so gap-fill can't produce near-duplicates of the focus page
			const alreadyCovered = [topic.keyword, ...sortedCandidates.map((a) => a.keyword)];
			const gapResult = await callAICuration(
				topic.keyword,
				topic.title,
				focusPgTitle,
				dfsForAI,
				paaQuestions,
				related,
				remaining + 3,
				site ?? undefined
			);

			const gapIdeas = [...gapResult.selected, ...gapResult.generated].filter(
				(kw) => !alreadyCovered.some((c) => isNearDuplicate(c, kw))
			);

			const gapFill: ArticleCandidate[] = [];
			for (const kw of gapIdeas) {
				if (gapFill.length >= remaining) break;
				if (!kw.trim() || kw.trim().split(/\s+/).length < 3) continue;
				if (usedKeywords.has(normalizeKw(kw))) continue;
				if (sortedCandidates.some((a) => isNearDuplicate(a.keyword, kw))) continue;
				usedKeywords.add(normalizeKw(kw));
				// Enrich with DFS metrics via fuzzy match — AI suggestions backed by real data
				const match = findDfsMatch(kw);
				gapFill.push({
					keyword: kw,
					monthly_searches: match?.monthly_searches ?? null,
					keyword_difficulty: match?.keyword_difficulty ?? null,
					cpc: match?.cpc ?? null,
					source: match ? 'dataforseo' : 'ai',
					score: match ? scoreKw(match) : 28
				});
			}
			console.log(`[Clusters] Gap-fill: AI contributed ${gapFill.length}/${remaining}`);

			// Last resort: fill any remaining slots from raw DFS that weren't AI-selected
			if (gapFill.length < remaining) {
				const stillNeeded = remaining - gapFill.length;
				console.log(`[Clusters] Gap-fill: DFS backfill for last ${stillNeeded} slots`);
				for (const k of rankedDfs) {
					if (gapFill.length >= remaining) break;
					if (usedKeywords.has(normalizeKw(k.keyword))) continue;
					if (sortedCandidates.some((a) => isNearDuplicate(a.keyword, k.keyword))) continue;
					usedKeywords.add(normalizeKw(k.keyword));
					gapFill.push({
						keyword: k.keyword,
						monthly_searches: k.monthly_searches,
						keyword_difficulty: k.keyword_difficulty,
						cpc: k.cpc,
						source: 'dataforseo',
						score: scoreKw(k)
					});
				}
			}

			sortedCandidates = [...sortedCandidates, ...gapFill].slice(0, articleLimit);
		}

		// Hard guarantee: user requested articleLimit — ensure we deliver exactly that.
		// If research + gap-fill still left us short (e.g. niche topic, no DFS), pad with
		// topic-based article keywords so the cluster always matches user expectations.
		if (sortedCandidates.length < articleLimit) {
			const stillNeeded = articleLimit - sortedCandidates.length;
			const usedKw = new Set([
				normalizeKw(topic.keyword),
				...sortedCandidates.map((a) => normalizeKw(a.keyword))
			]);

			// Last resort only — distinct informational angles
			const GUARANTEE_TEMPLATES = [
				(k: string) => `what causes ${k}`,
				(k: string) => `how does ${k} work`,
				(k: string) => `${k} ingredients explained`,
				(k: string) => `how often should you use ${k}`,
				(k: string) => `signs you need ${k}`,
				(k: string) => `${k} side effects to know`,
				(k: string) => `layering ${k} with other products`,
				(k: string) => `${k} in summer vs winter`,
				(k: string) => `${k} application mistakes`,
				(k: string) => `${k} for different skin types`,
				(k: string) => `when to switch from ${k}`,
				(k: string) => `${k} vs regular alternative`
			];

			const keywords =
				topic.keyword.split(/\s+/).length >= 3 ? topic.keyword : topic.title || topic.keyword;

			const guaranteed: ArticleCandidate[] = [];
			for (let i = 0; guaranteed.length < stillNeeded && i < GUARANTEE_TEMPLATES.length * 2; i++) {
				const tpl = GUARANTEE_TEMPLATES[i % GUARANTEE_TEMPLATES.length];
				const kw = tpl(keywords);
				if (kw.split(/\s+/).length < 3) continue;
				const n = normalizeKw(kw);
				if (usedKw.has(n)) continue;
				if (sortedCandidates.some((a) => isNearDuplicate(a.keyword, kw))) continue;
				if (guaranteed.some((a) => isNearDuplicate(a.keyword, kw))) continue;
				usedKw.add(n);
				guaranteed.push({
					keyword: kw,
					monthly_searches: null,
					keyword_difficulty: null,
					cpc: null,
					source: 'ai',
					score: 20
				});
			}
			sortedCandidates = [...sortedCandidates, ...guaranteed].slice(0, articleLimit);
			console.log(
				`[Clusters] Guarantee: padded ${guaranteed.length} articles to meet requested ${articleLimit}`
			);
		}

		console.log(
			`[Clusters] Phase 3 final: ${sortedCandidates.length}/${articleLimit} articles — ` +
				`${sortedCandidates.filter((a) => a.source === 'dataforseo').length} with real metrics, ` +
				`${sortedCandidates.filter((a) => a.source === 'ai').length} AI-only`
		);

		const articleCandidates = sortedCandidates.slice(0, articleLimit);
		console.log(
			`[Clusters] ${articleCandidates.length} articles selected — ` +
				`${articleCandidates.filter((a) => a.source === 'dataforseo').length} DataForSEO, ` +
				`${articleCandidates.filter((a) => a.source === 'paa').length} PAA, ` +
				`${articleCandidates.filter((a) => a.source === 'related').length} related, ` +
				`${articleCandidates.filter((a) => a.source === 'ai').length} AI fallback`
		);

		const positions = computePositions(articleCandidates.length);

		// Derive focus page intent — determines title suffix and funnel stage
		const focusIntent = detectSearchIntent(topic.keyword);
		const focusFunnelStage = topic.funnel_stage || intentToFunnelStage(focusIntent);

		// Insert focus page
		const { data: focusPage, error: focusPageErr } = await supabase
			.from('pages')
			.insert({
				cluster_id: cluster.id,
				site_id: siteId,
				type: 'focus_page',
				title: focusPageTitle(topic.title, topic.keyword),
				keyword: topic.keyword,
				monthly_searches: topic.monthly_searches || null,
				keyword_difficulty: topic.keyword_difficulty || null,
				cpc: (topic as { cpc?: number | null }).cpc ?? null,
				funnel_stage: focusFunnelStage,
				page_type: classifyPageType(topic.keyword, focusFunnelStage, focusIntent, 'focus'),
				status: 'planned',
				target_word_count: 1400,
				sort_order: 0,
				position_x: positions[0][0],
				position_y: positions[0][1]
			})
			.select('id')
			.single();
		if (focusPageErr) {
			console.error(
				'[Clusters] Focus page insert FAILED:',
				focusPageErr.message,
				focusPageErr.details
			);
		} else {
			console.log(`[Clusters] Focus page inserted: ${focusPage?.id}`);
		}

		// Use all candidates — guarantee already padded to articleLimit.
		// Do NOT filter by volume here: breaks the user-requested count.
		const articleCandidatesFinal = articleCandidates;

		const articleRows = articleCandidatesFinal.map((article, i) => {
			// Use AI-designed title if available, otherwise capitalize keyword
			const title =
				(article as ArticleCandidate & { aiTitle?: string }).aiTitle ??
				article.keyword.charAt(0).toUpperCase() + article.keyword.slice(1);
			// Use search intent for accurate funnel staging
			const articleIntent = detectSearchIntent(article.keyword);
			// Supporting articles are always ToFu — they live above the MoFu focus page.
			const stage: 'tofu' | 'mofu' | 'bofu' = 'tofu';
			return {
				cluster_id: cluster.id,
				site_id: siteId,
				type: 'article',
				title,
				keyword: article.keyword,
				monthly_searches: article.monthly_searches, // real data or null
				keyword_difficulty: article.keyword_difficulty, // real data or null
				cpc: article.cpc ?? null, // real data or null
				funnel_stage: stage,
				page_type: classifyPageType(article.keyword, stage, articleIntent, 'article'),
				status: 'planned',
				target_word_count: 900,
				sort_order: i + 1,
				position_x: positions[i + 1]?.[0] ?? 400 + (i % 4) * 120,
				position_y: positions[i + 1]?.[1] ?? 300 + Math.floor(i / 4) * 120
			};
		});

		let insertedArticleIds: Array<{ id: string; keyword: string; title: string }> = [];
		if (articleRows.length > 0) {
			const { data: insertedArticles } = await supabase
				.from('pages')
				.insert(articleRows)
				.select('id, keyword, title');
			insertedArticleIds = insertedArticles ?? [];
		}

		// Generate internal link suggestions (reverse silo)
		if (focusPage?.id && insertedArticleIds.length > 0) {
			generateInternalLinkSuggestions(
				cluster.id,
				focusPage.id,
				topic.keyword,
				insertedArticleIds
			).catch((err) => console.warn('[Clusters] Internal links error (non-fatal):', err));
		}

		await supabase
			.from('topics')
			.update({ status: 'active', cluster_id: cluster.id })
			.eq('id', topicId);

		return res.json({ clusterId: cluster.id });
	} catch (err) {
		console.error('[Clusters] Error:', err);
		captureApiError(err, req, { feature: 'clusters-create', orgId, userId });
		// Refund credits when cluster creation fails after deduction
		if (creditsDeducted && userId && orgId) {
			try {
				const { error: refundErr } = await supabase.rpc('credit_back_action', {
					p_org_id: orgId,
					p_action_key: 'cluster_generation',
					p_credits: CREDIT_COSTS.CLUSTER_GENERATION,
					p_reason: 'Cluster creation failed mid-stream'
				});
				if (refundErr) {
					console.error('[Clusters] CRITICAL: Failed to refund credits:', refundErr.message);
					captureApiWarning(
						`credit_back_action failed after cluster creation error: ${refundErr.message}`,
						req,
						{ orgId, amount: CREDIT_COSTS.CLUSTER_GENERATION, actionKey: 'cluster_generation' }
					);
				} else {
					console.log(`[Clusters] Refunded ${CREDIT_COSTS.CLUSTER_GENERATION} credits to org ${orgId}`);
					await createNotificationForUser(userId, orgId, {
						title: 'Cluster creation failed',
						message: `${CREDIT_COSTS.CLUSTER_GENERATION} credits were automatically refunded. Cluster creation failed.`,
						type: 'credit_refund',
						priority: 'high',
						action_url: '/clusters',
						metadata: { credits_refunded: CREDIT_COSTS.CLUSTER_GENERATION, reason: 'cluster_creation_failed' },
						skipToast: true
					});
				}
			} catch (refundEx) {
				console.error('[Clusters] refundCredits threw:', refundEx instanceof Error ? refundEx.message : refundEx);
				captureApiError(refundEx, req, { feature: 'clusters-create-refund', orgId, userId });
			}
		}
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// ---------------------------------------------------------------------------
// regenerateCluster — re-runs the full research + AI curation pipeline for an
// existing cluster. Charges credits upfront; does NOT insert pages.
//
// Returns a ranked list of article candidates that the user can pick and choose
// from in the UI. The result is persisted to `cluster_runs` for history.
// ---------------------------------------------------------------------------
export const regenerateCluster = async (req: Request, res: Response) => {
	let userId: string | undefined;
	let orgId: string | undefined;
	let creditsDeducted = false;
	try {
		userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const clusterId = req.params.id;
		if (!clusterId) return res.status(400).json({ error: 'Cluster ID required' });

		const maxArticles = Number(req.body?.maxArticles ?? 10);
		const articleLimit = Math.max(3, Math.min(20, maxArticles));

		// Fetch cluster + organization_id via the site it belongs to
		const { data: cluster, error: clusterErr } = await supabase
			.from('clusters')
			.select('id, target_keyword, title, site_id, sites(organization_id)')
			.eq('id', clusterId)
			.single();

		if (clusterErr) {
			console.error('[Clusters/Regen] Cluster not found:', clusterErr);
			return res.status(404).json({ error: 'Cluster not found' });
		}
		if (!cluster) {
			return res.status(404).json({ error: 'Cluster not found' });
		}

		const sitesData = cluster.sites as
			| { organization_id: string }
			| { organization_id: string }[]
			| null;
		orgId = Array.isArray(sitesData)
			? sitesData[0]?.organization_id
			: sitesData?.organization_id;
		if (!orgId) return res.status(500).json({ error: 'Could not resolve organization' });

		// Auth guard: user must belong to the cluster's org
		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== orgId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		// Credit check — regeneration costs the same as initial cluster generation
		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', orgId)
			.single();

		const creditsAvailable = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (creditsAvailable < CREDIT_COSTS.CLUSTER_GENERATION) {
			return res.status(402).json({
				error: 'Insufficient credits',
				required: CREDIT_COSTS.CLUSTER_GENERATION,
				available: creditsAvailable
			});
		}

		// Charge credits before any API calls (DataForSEO, Serper, AI)
		const newCredits = Math.max(0, creditsAvailable - CREDIT_COSTS.CLUSTER_GENERATION);
		const { error: deductErr } = await supabase
			.from('organizations')
			.update({
				included_credits_remaining: newCredits,
				...(org?.included_credits != null && { included_credits: newCredits })
			})
			.eq('id', orgId);
		if (deductErr) {
			console.error('[Clusters/Regen] Failed to deduct credits:', deductErr);
			return res.status(500).json({ error: 'Failed to deduct credits' });
		}
		creditsDeducted = true;

		// Fetch existing pages so we can exclude their keywords from suggestions
		const { data: existingPages } = await supabase
			.from('pages')
			.select('keyword, type')
			.eq('cluster_id', clusterId);

		const existingKeywords = new Set((existingPages ?? []).map((p) => normalizeKw(p.keyword)));

		console.log(
			`[Clusters/Regen] Starting regeneration for cluster "${cluster.target_keyword}" (limit: ${articleLimit})`
		);

		// ── Phase 1: Raw research ────────────────────────────────────────────────
		const dfsLimit = Math.min(200, Math.max(50, articleLimit * 8));
		const [dfsResult, serperResult] = await Promise.all([
			getKeywordSuggestions(cluster.target_keyword, { limit: dfsLimit }),
			serperSearch(cluster.target_keyword, 10)
		]);

		// DFS quality + topical gate (same as createCluster)
		const topicQualifiers = extractDifferentiatingQualifiers(cluster.target_keyword);
		const qualifyingDfs = dfsResult.keywords.filter((k) => {
			const kLower = k.keyword.toLowerCase();
			if (kLower === cluster.target_keyword.toLowerCase()) return false;
			if (existingKeywords.has(normalizeKw(k.keyword))) return false;
			if (k.keyword.split(/\s+/).length < 3) return false;
			if (k.keyword_difficulty > 55) return false;
			if (k.monthly_searches < 30) return false;
			if (topicQualifiers.length > 0) {
				return topicQualifiers.some((q) => kLower.includes(q));
			}
			return true;
		});
		const rankedDfs = [...qualifyingDfs].sort((a, b) => scoreKw(b) - scoreKw(a));

		const paaQuestions = (serperResult.peopleAlsoAsk ?? [])
			.map((p) => p.question)
			.filter((q) => Boolean(q) && !existingKeywords.has(normalizeKw(q)));
		const related = (serperResult.relatedSearches ?? [])
			.map((r) => r.query)
			.filter((r) => Boolean(r) && !existingKeywords.has(normalizeKw(r)));

		// ── Phase 2: AI curation ─────────────────────────────────────────────────
		const focusPgTitle = focusPageTitle(cluster.title, cluster.target_keyword);
		const dfsForAI = rankedDfs.map((k) => ({
			keyword: k.keyword,
			volume: k.monthly_searches,
			kd: k.keyword_difficulty,
			cpc: k.cpc
		}));
		const aiRequestCount = articleLimit + Math.max(5, Math.ceil(articleLimit * 0.6));

		const aiResult = await callAICuration(
			cluster.target_keyword,
			cluster.title,
			focusPgTitle,
			dfsForAI,
			paaQuestions,
			related,
			aiRequestCount
		);

		// ── Phase 3: Build candidate list ────────────────────────────────────────
		const dfsMap = new Map(dfsResult.keywords.map((k) => [normalizeKw(k.keyword), k]));
		const dfsByWord = new Map<string, DfsKeyword[]>();
		for (const k of dfsResult.keywords) {
			for (const word of normalizeKw(k.keyword).split(' ')) {
				if (word.length < 4) continue;
				if (!dfsByWord.has(word)) dfsByWord.set(word, []);
				dfsByWord.get(word)!.push(k);
			}
		}
		const usedFuzzyDfsRegen = new Set<string>();
		function findDfsMatchRegen(kw: string): DfsKeyword | null {
			const exact = dfsMap.get(normalizeKw(kw));
			if (exact) return exact;
			const words = normalizeKw(kw)
				.split(' ')
				.filter((w) => w.length >= 4);
			if (words.length === 0) return null;
			const counts = new Map<string, { kw: DfsKeyword; n: number }>();
			for (const w of words) {
				for (const k of dfsByWord.get(w) ?? []) {
					const e = counts.get(k.keyword);
					counts.set(k.keyword, { kw: k, n: (e?.n ?? 0) + 1 });
				}
			}
			const best = [...counts.values()]
				.filter(
					(c) =>
						c.n >= Math.max(1, Math.floor(words.length * 0.4)) &&
						!usedFuzzyDfsRegen.has(c.kw.keyword)
				)
				.sort((a, b) => scoreKw(b.kw) - scoreKw(a.kw))[0];
			return best?.kw ?? null;
		}

		const accepted: ArticleCandidate[] = [
			// Seed with cluster keyword to prevent near-duplicates of focus page
			{
				keyword: cluster.target_keyword,
				monthly_searches: null,
				keyword_difficulty: null,
				cpc: null,
				source: 'dataforseo',
				score: 0
			}
		];
		const isDupe = (kw: string) =>
			accepted.some((a) => isNearDuplicate(a.keyword, kw)) || existingKeywords.has(normalizeKw(kw));
		const minWords = (kw: string) => kw.trim().split(/\s+/).length >= 3;

		const pushRegen = (cand: ArticleCandidate, kw: string, match: DfsKeyword | null) => {
			if (match && normalizeKw(match.keyword) !== normalizeKw(kw)) {
				usedFuzzyDfsRegen.add(match.keyword);
			}
			accepted.push(cand);
		};

		for (const kw of aiResult.selected) {
			if (!minWords(kw) || isDupe(kw)) continue;
			const match = findDfsMatchRegen(kw);
			pushRegen(
				{
					keyword: kw,
					monthly_searches: match?.monthly_searches ?? null,
					keyword_difficulty: match?.keyword_difficulty ?? null,
					cpc: match?.cpc ?? null,
					source: match ? 'dataforseo' : 'ai',
					score: match ? scoreKw(match) * 1.1 : 45
				},
				kw,
				match
			);
		}
		for (const kw of aiResult.generated) {
			if (!minWords(kw) || isDupe(kw)) continue;
			const match = findDfsMatchRegen(kw);
			pushRegen(
				{
					keyword: kw,
					monthly_searches: match?.monthly_searches ?? null,
					keyword_difficulty: match?.keyword_difficulty ?? null,
					cpc: match?.cpc ?? null,
					source: match ? 'dataforseo' : 'ai',
					score: match ? scoreKw(match) : 30
				},
				kw,
				match
			);
		}

		// Intent-group dedup (same as createCluster)
		const LISTING_SIGNALS =
			/\b(list|lists|best|top|vs|versus|comparison|compare|options|alternatives|overview|ranked|ranking|reviews?)\b/i;
		const HOWTO_SIGNALS =
			/\b(how to|how do|how can|how should|setup|set up|configure|install|implement|optimize|improve|fix|create|build|use)\b/i;
		const PROBLEM_SIGNALS =
			/\b(problem|issue|error|not working|broken|slow|bad|poor|fail|failed|fix)\b/i;
		const WHAT_SIGNALS =
			/\b(what is|what are|what does|what means|definition|explained?|meaning|guide to)\b/i;

		function intentGroup(kw: string): string {
			if (LISTING_SIGNALS.test(kw)) return 'listing';
			if (HOWTO_SIGNALS.test(kw)) return 'howto';
			if (PROBLEM_SIGNALS.test(kw)) return 'problem';
			if (WHAT_SIGNALS.test(kw)) return 'what';
			return 'other';
		}
		const intentGroupLimits: Record<string, number> = {
			listing: 1,
			howto: 3,
			problem: 2,
			what: 2,
			other: 5
		};
		const intentGroupCounts: Record<string, number> = {};

		// Skip the seeded focus keyword (first entry)
		const candidatesAfterSeed = accepted.slice(1);
		const intentDeduped: ArticleCandidate[] = [];
		for (const a of candidatesAfterSeed) {
			const g = intentGroup(a.keyword);
			const count = intentGroupCounts[g] ?? 0;
			const limit = intentGroupLimits[g] ?? 5;
			if (count < limit) {
				intentDeduped.push(a);
				intentGroupCounts[g] = count + 1;
			}
		}

		// Sort and slice to requested limit
		const finalCandidates = intentDeduped
			.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
			.slice(0, articleLimit + Math.ceil(articleLimit * 0.3)); // return a buffer so UI can show more options

		// ── Phase 4: Build suggestions with funnel + page type metadata ──────────
		const suggestions = finalCandidates.map((a) => {
			const intent = detectSearchIntent(a.keyword);
			const stage = intentToFunnelStage(intent);
			return {
				keyword: a.keyword,
				monthly_searches: a.monthly_searches,
				keyword_difficulty: a.keyword_difficulty,
				cpc: a.cpc,
				funnel_stage: stage,
				page_type: detectPageType(a.keyword),
				source: a.source
			};
		});

		// ── Phase 5: Persist run for history ────────────────────────────────────
		const { data: savedRun } = await supabase
			.from('cluster_runs')
			.insert({
				cluster_id: clusterId,
				organization_id: orgId,
				suggestions
			})
			.select('id')
			.single();

		console.log(
			`[Clusters/Regen] Done — ${suggestions.length} suggestions, runId: ${savedRun?.id}, credits deducted: ${CREDIT_COSTS.CLUSTER_GENERATION}`
		);
		return res.json({ suggestions, runId: savedRun?.id ?? null });
	} catch (err) {
		console.error('[Clusters/Regen] Error:', err);
		captureApiError(err, req, { feature: 'clusters-regenerate', orgId, userId });
		// Refund credits when regeneration fails after deduction
		if (creditsDeducted && userId && orgId) {
			try {
				const { error: refundErr } = await supabase.rpc('credit_back_action', {
					p_org_id: orgId,
					p_action_key: 'cluster_generation',
					p_credits: CREDIT_COSTS.CLUSTER_GENERATION,
					p_reason: 'Cluster regeneration failed mid-stream'
				});
				if (refundErr) {
					console.error('[Clusters/Regen] CRITICAL: Failed to refund credits:', refundErr.message);
					captureApiWarning(
						`credit_back_action failed after cluster regeneration error: ${refundErr.message}`,
						req,
						{ orgId, amount: CREDIT_COSTS.CLUSTER_GENERATION, actionKey: 'cluster_generation' }
					);
				} else {
					console.log(`[Clusters/Regen] Refunded ${CREDIT_COSTS.CLUSTER_GENERATION} credits to org ${orgId}`);
					await createNotificationForUser(userId, orgId, {
						title: 'Cluster regeneration failed',
						message: `${CREDIT_COSTS.CLUSTER_GENERATION} credits were automatically refunded. Cluster regeneration failed.`,
						type: 'credit_refund',
						priority: 'high',
						action_url: '/clusters',
						metadata: { credits_refunded: CREDIT_COSTS.CLUSTER_GENERATION, reason: 'cluster_regeneration_failed' },
						skipToast: true
					});
				}
			} catch (refundEx) {
				console.error('[Clusters/Regen] Refund threw:', refundEx instanceof Error ? refundEx.message : refundEx);
				captureApiError(refundEx, req, { feature: 'clusters-regenerate-refund', orgId, userId });
			}
		}
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// ---------------------------------------------------------------------------
// generateArticleBrief — generate a content brief for an article page within
// a cluster. Previously only focus pages could have briefs generated.
//
// This handler validates:
//   1. The page belongs to the caller's organisation (auth guard)
//   2. The page type is 'article' (not focus_page — those go through /pages route)
//   3. Credits are available (uses CREDIT_COSTS.ARTICLE_BRIEF)
//
// After validation it delegates to the brief generation logic in pages.ts
// by constructing an internal req/res compatible call.
//
// Route: POST /api/clusters/:clusterId/articles/:pageId/brief
// ---------------------------------------------------------------------------
export const generateArticleBrief = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const { clusterId, pageId } = req.params;
		if (!clusterId || !pageId) {
			return res.status(400).json({ error: 'clusterId and pageId are required' });
		}

		// Resolve org from cluster → site
		const { data: cluster, error: clusterErr } = await supabase
			.from('clusters')
			.select('id, site_id, sites(organization_id)')
			.eq('id', clusterId)
			.single();

		if (clusterErr || !cluster) {
			return res.status(404).json({ error: 'Cluster not found' });
		}

		const sitesData = cluster.sites as
			| { organization_id: string }
			| { organization_id: string }[]
			| null;
		const orgId = Array.isArray(sitesData)
			? sitesData[0]?.organization_id
			: sitesData?.organization_id;
		if (!orgId) return res.status(500).json({ error: 'Could not resolve organization' });

		// Auth guard
		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== orgId) {
			return res.status(403).json({ error: 'Access denied' });
		}

		// Fetch the page — must be an article belonging to this cluster
		const { data: page, error: pageErr } = await supabase
			.from('pages')
			.select(
				'id, type, keyword, title, cluster_id, site_id, funnel_stage, monthly_searches, keyword_difficulty, cpc'
			)
			.eq('id', pageId)
			.eq('cluster_id', clusterId)
			.single();

		if (pageErr || !page) {
			return res.status(404).json({ error: 'Page not found in this cluster' });
		}

		if (page.type !== 'article') {
			return res.status(400).json({
				error:
					'This endpoint is for article pages only. Use /api/pages/:pageId/brief for focus pages.'
			});
		}

		// Credit check — ARTICLE_BRIEF cost (falls back to MONEY_PAGE_BRIEF if not defined)
		const briefCost = CREDIT_COSTS.ARTICLE_BRIEF ?? CREDIT_COSTS.MONEY_PAGE_BRIEF ?? 3;

		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', orgId)
			.single();

		const available = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (available < briefCost) {
			return res
				.status(402)
				.json({ error: 'Insufficient credits', required: briefCost, available });
		}

		// Deduct credits
		const newCredits = Math.max(0, available - briefCost);
		await supabase
			.from('organizations')
			.update({
				included_credits_remaining: newCredits,
				...(org?.included_credits != null && { included_credits: newCredits })
			})
			.eq('id', orgId);

		// Forward to pages.ts generateBrief by re-using req params
		// Mutate req so the downstream handler sees the correct pageId
		req.params.pageId = pageId;
		req.body = { ...req.body, _articleBriefContext: { clusterId, orgId } };

		// Dynamically import to avoid circular dependency at module load time
		const { generateBrief } = await import('./pages.js');
		return generateBrief(req, res);
	} catch (err) {
		console.error('[Clusters/ArticleBrief] Error:', err);
		captureApiError(err, req, { feature: 'clusters-article-brief' });
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// ---------------------------------------------------------------------------
// L12. Cluster Intelligence — evaluate and return W1–4 warnings
// ---------------------------------------------------------------------------
export const getClusterIntelligence = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const clusterId = req.params.id;
		if (!clusterId) {
			res.status(400).json({ error: 'Cluster ID required' });
			return;
		}

		// Fetch cluster with site for org check and base URL
		const { data: cluster, error: clusterErr } = await supabase
			.from('clusters')
			.select('id, site_id, destination_page_url, architecture')
			.eq('id', clusterId)
			.single();

		if (clusterErr || !cluster) {
			res.status(404).json({ error: 'Cluster not found' });
			return;
		}

		// Verify org access
		const { data: site } = await supabase
			.from('sites')
			.select('id, organization_id')
			.eq('id', cluster.site_id)
			.single();

		if (!site) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== site.organization_id) {
			res.status(403).json({ error: 'Access denied' });
			return;
		}

		// Fetch pages with content for link extraction (W1, W4) and cro_checklist (W5, W6), keyword (W7)
		const { data: pages } = await supabase
			.from('pages')
			.select(
				'id, title, type, keyword, page_type, funnel_stage, content, published_url, cro_checklist'
			)
			.eq('cluster_id', clusterId);

		// S2-3: Fetch ALL site pages for keyword cannibalization detection
		const { data: sitePages } = await supabase
			.from('pages')
			.select('id, title, type, keyword, published_url')
			.eq('site_id', cluster.site_id);

		const cannibalizationConflicts =
			sitePages && sitePages.length > 0
				? detectKeywordCannibalization(
						sitePages.map((p) => ({
							id: p.id,
							title: p.title,
							keyword: p.keyword,
							published_url: p.published_url,
							type: p.type as string
						}))
					)
				: [];

		// Fetch internal_links
		const { data: internalLinks } = await supabase
			.from('internal_links')
			.select('from_page_id, to_page_id, implemented')
			.eq('cluster_id', clusterId);

		// Base URL for W1 URL matching (optional; pages may have full URLs in content)
		// Sites don't have base_url in schema; use empty for path-only matching
		const siteUrl: string | null = null;

		const { evaluateClusterIntelligence } = await import('../services/clusterIntelligence.js');
		const result = evaluateClusterIntelligence(
			{
				destination_page_url: cluster.destination_page_url,
				architecture: cluster.architecture
			},
			(pages ?? []).map((p) => ({
				id: p.id,
				title: p.title,
				type: (p.type as string) || 'article',
				keyword: p.keyword,
				page_type: p.page_type,
				funnel_stage: p.funnel_stage,
				content: p.content,
				published_url: p.published_url,
				cro_checklist: p.cro_checklist as {
					items?: Record<string, { status?: string }>;
					funnel_mismatch?: string;
				} | null
			})),
			(internalLinks ?? []).map((l) => ({
				from_page_id: l.from_page_id,
				to_page_id: l.to_page_id,
				implemented: l.implemented ?? false
			})),
			siteUrl,
			cannibalizationConflicts
		);

		// Persist to cluster_intelligence
		await supabase.from('clusters').update({ cluster_intelligence: result }).eq('id', clusterId);

		res.json(result);
	} catch (err) {
		console.error('[Clusters/Intelligence] Error:', err);
		captureApiError(err, req, { feature: 'clusters-intelligence' });
		res.status(500).json({ error: 'Internal server error' });
	}
};
