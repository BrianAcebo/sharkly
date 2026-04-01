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

function deriveClusterAngle(topicTitle: string, topicKeyword: string): string {
	const combined = (topicTitle + ' ' + topicKeyword).toLowerCase();
	if (/\b(app|apps|tool|tools|software|plugin|plugins|extension|extensions)\b/.test(combined)) {
		return 'tools and apps — every supporting article must evaluate, compare, or explain specific apps/tools for its sub-topic. Frame each article title through the lens of "which tools help with X" or "do [type] apps actually work for X".';
	}
	if (/\b(vs|versus|compare|comparison|alternative|alternatives)\b/.test(combined)) {
		return 'comparison — every supporting article must compare specific options, platforms, or approaches within its sub-topic. Frame each title as a direct comparison or evaluation.';
	}
	if (/\bhow to\b/.test(combined)) {
		return 'step-by-step process — every supporting article must explain a specific how-to method or process within the topic. Frame each title as an actionable guide for one specific task.';
	}
	if (/\b(checklist|audit|guide|system|framework)\b/.test(combined)) {
		return 'structured guide — every supporting article must cover a distinct phase, component, or sub-checklist of the overall topic. Each article title should reference a specific actionable area.';
	}
	if (/\b(cost|price|pricing|budget|affordable|cheap|expensive)\b/.test(combined)) {
		return 'cost and value — every supporting article must address pricing, ROI, or value considerations for a specific aspect of the topic.';
	}
	return 'topical depth — every supporting article must go deeper on one specific sub-question a reader would have after reading the focus page. Avoid repeating the focus page angle; instead cover the specific practical questions it raises.';
}

// ---------------------------------------------------------------------------
// isTopicallyRelevant — the critical gate that prevents off-topic DFS keywords
// from entering a cluster via backfill.
//
// Strategy: extract the words that make the focus keyword SPECIFIC (not generic
// SEO/industry words), then require the candidate to share at least one.
//
// "shopify url structure seo" → differentiators: ["url", "structure"]
//   "shopify url canonicalization"  → shares "url"       → PASS
//   "shopify redirect seo"          → shares nothing     → borderline — also PASS
//     (redirect is a URL-structure concept, but the gate is intentionally loose
//      — the AI prompt is the tight topical filter. This gate only blocks truly
//      unrelated keywords like "best ecommerce seo agency")
//   "best ecommerce seo agency"     → shares nothing     → FAIL
// ---------------------------------------------------------------------------
const TOPICALITY_STOPWORDS = new Set([
	'seo',
	'search',
	'engine',
	'optimization',
	'google',
	'rank',
	'ranking',
	'keyword',
	'keywords',
	'content',
	'website',
	'web',
	'digital',
	'marketing',
	'strategy',
	'guide',
	'tips',
	'best',
	'top',
	'how',
	'what',
	'why',
	'when',
	'does',
	'can',
	'for',
	'the',
	'and',
	'with',
	'your',
	'this',
	'that',
	'from',
	'into',
	'using',
	'use',
	'get',
	'make',
	'help',
	'work',
	'need',
	'want',
	'online',
	'traffic',
	'organic',
	'page',
	'pages',
	'site',
	'sites'
]);

function extractTopicDifferentiators(keyword: string): string[] {
	return keyword
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, '')
		.split(/\s+/)
		.filter((w) => w.length >= 3 && !TOPICALITY_STOPWORDS.has(w));
}

function isTopicallyRelevant(candidateKw: string, focusKeyword: string): boolean {
	const focusDiffs = extractTopicDifferentiators(focusKeyword);
	// If we can't extract differentiators, let everything through (very generic topic)
	if (focusDiffs.length === 0) return true;

	const candidateWords = candidateKw
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, '')
		.split(/\s+/)
		.filter((w) => w.length >= 3);

	for (const diff of focusDiffs) {
		for (const cw of candidateWords) {
			// Exact match or substring (catches "url" in "urls", "redirect" in "redirects")
			if (cw === diff || cw.includes(diff) || diff.includes(cw)) return true;
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// AI curation
// ---------------------------------------------------------------------------
type AIArticlePlan = {
	title: string;
	keyword: string;
	rationale: string;
	source: 'research' | 'ai';
};

type AICurationResult = {
	selected: string[];
	generated: string[];
	plans: AIArticlePlan[];
};

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
	'want',
	'help',
	'work',
	'will',
	'without',
	'after',
	'before',
	'during'
]);

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
	clusterAngle: string,
	dfsKeywords: Array<{ keyword: string; volume: number; kd: number; cpc: number }>,
	paaQuestions: string[],
	relatedSearches: string[],
	needed: number,
	blockedKeywords: string[],
	topicalKeywordSupply: number,
	siteContext?: {
		name?: string | null;
		niche?: string | null;
		customer_description?: string | null;
		domain_authority?: number | null;
	}
): Promise<AICurationResult> {
	const differentiators = extractDifferentiatingQualifiers(topicKeyword);
	const differentiatorPhrase =
		differentiators.length > 0 ? differentiators.join(', ') : topicKeyword;

	const da = siteContext?.domain_authority ?? 0;
	const authNote =
		da <= 5
			? `New site (DA ${da}). Prioritise low-competition angles (KD ≤ 15).`
			: `DA ${da}. Achievable KD ≤ ${da + 10}. Avoid KD > ${da + 25}.`;

	const blockedSection =
		blockedKeywords.length > 0
			? `\nALREADY CLAIMED BY OTHER CLUSTERS — DO NOT USE (or near-duplicates):\n${blockedKeywords.slice(0, 60).join('\n')}\n`
			: '';

	// Tell AI honestly when research is thin so it generates ideas instead of padding with off-topic DFS
	const supplyNote =
		topicalKeywordSupply < needed
			? `\nRESEARCH SUPPLY: Only ${topicalKeywordSupply} on-topic keywords were found for this specific topic. You MUST generate your own article ideas to fill the remaining ${needed - topicalKeywordSupply} slots. Generate ideas that are directly about "${topicKeyword}" — do NOT reach for off-topic keywords from the research pool just to hit the count. A well-conceived AI article about this topic beats an off-topic research keyword every time.\n`
			: '';

	const system = `You are a senior SEO content strategist building a topical cluster for ${siteContext?.name ?? 'a business'} — ${siteContext?.niche ?? 'a specialist brand'} serving ${siteContext?.customer_description ?? 'their target audience'}.

You are building supporting articles for ONE specific topic: "${topicKeyword}". Every article must be directly about this topic. You use keyword research as SIGNAL — not as a shopping list. If research doesn't have enough relevant keywords, you generate your own ideas that are topically correct.

AUTHORITY CONTEXT: ${authNote}

Return ONLY valid JSON. No markdown, no explanations.`;

	const dfsLines = dfsKeywords
		.slice(0, 100)
		.map((k) => `${k.keyword} | vol:${k.volume} | KD:${k.kd} | CPC:$${k.cpc.toFixed(2)}`)
		.join('\n');

	const paaLines = paaQuestions.length > 0 ? paaQuestions.join('\n') : 'none';
	const relatedLines = relatedSearches.length > 0 ? relatedSearches.join('\n') : 'none';
	const siteName = siteContext?.name ?? 'this business';
	const maxKd = da <= 5 ? 15 : da + 10;

	const user = `CLUSTER BRIEF — ${siteName} | ${siteContext?.niche ?? 'this industry'}
Customer: ${siteContext?.customer_description ?? 'their target audience'} | ${authNote}

Cluster topic keyword: "${topicKeyword}"
Cluster topic title: "${topicTitle}"
Focus page (MoFu — already being written): "${focusPageTitle}"

CLUSTER ANGLE — every article MUST be framed through this lens:
${clusterAngle}

ANGLE ENFORCEMENT:
- Every article title must reflect the cluster angle.
- The keyword from research is your DATA signal for volume/difficulty. The title is your EDITORIAL decision.
- Example: "Best Shopify SEO Apps" cluster → site speed article = "Best Shopify Site Speed Apps for SEO", NOT "How to Speed Up Shopify".
${supplyNote}${blockedSection}
RESEARCH DATA — on-topic keywords for "${topicKeyword}" (keyword | monthly searches | KD | CPC):
${dfsLines || 'No keyword data available'}

Google People Also Ask:
${paaLines}

Google Related Searches:
${relatedLines}

YOUR TASK — DESIGN ${needed} ToFu SUPPORTING ARTICLES:

Step 1: Read the research. Find genuinely DIFFERENT questions people have specifically about "${topicKeyword}". Only use keywords that are directly about this topic — skip generic SEO, agency, or off-topic results.
Step 2: For each on-topic question, design one article. Use the best matching keyword for metrics. Write a title that fits the cluster angle.
Step 3: If research doesn't have enough on-topic keywords, GENERATE your own article ideas about "${topicKeyword}". Ask yourself: what specific aspects of "${topicKeyword}" hasn't been covered yet? What do practitioners need to know?
Step 4: Prefer winnable keywords. Target KD ≤ ${maxKd} where possible.
Step 5: TOPICALITY CHECK — read every article in your list. If any article could appear in a completely different topic cluster (e.g. "best ecommerce agencies" in a "url structure" cluster), replace it.

NON-NEGOTIABLE RULES:
0. TOPICAL RELEVANCE: Every article must be directly about "${topicKeyword}". This is non-negotiable. An off-topic article is worse than no article.

1. CLUSTER ANGLE: Every title must reflect the cluster angle. Keyword = data. Title = editorial.

2. CROSS-CLUSTER REJECTION: Keywords in the ALREADY CLAIMED list belong to other clusters. Reject them. Generate topically correct replacements.

3. Every article must be ToFu (informational). Never produce: "best X", "top X", "X vs Y", "X review" — those duplicate the focus page.

4. Never produce a near-duplicate of the focus page:
   Focus keyword: "${topicKeyword}"
   ❌ "${differentiatorPhrase} guide"
   ❌ "best ${differentiatorPhrase}"
   ❌ Minor synonym swap covering the same intent

5. Every article must answer a DIFFERENT underlying question.

6. QUALITY OVER COUNT: If you genuinely cannot find ${needed} distinct, topically relevant angles, return fewer with "rationale" explaining why. Never pad with off-topic content.

Return a JSON array:
[
  {
    "title": "Human article title framed through the cluster angle",
    "keyword": "primary keyword from research OR a natural AI-generated search phrase about ${topicKeyword}",
    "rationale": "one sentence: what specific question this answers and how it fits the cluster",
    "source": "research or ai"
  }
]

Return exactly ${needed} items. Every single one must be directly about "${topicKeyword}".`;

	const parseResult = (text: string): AICurationResult | null => {
		try {
			const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
			const parsed = JSON.parse(cleaned);
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
					return {
						selected: plans.filter((p) => p.source === 'research').map((p) => p.keyword),
						generated: plans.filter((p) => p.source === 'ai').map((p) => p.keyword),
						plans
					};
				}
			}
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
			console.warn(
				`[Clusters] Claude Sonnet curation error: ${res.status} ${(await res.text()).slice(0, 200)}`
			);
		}
	} catch (err) {
		console.warn(
			'[Clusters] AI curation (Sonnet) exception:',
			err instanceof Error ? err.message : err
		);
	}

	try {
		if (!OPENAI_API_KEY) {
			console.warn('[Clusters] No OPENAI_API_KEY');
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

// Dynamic gap-fill — topically scoped, no hardcoded templates
async function callDynamicGapFill(
	topicKeyword: string,
	focusPageTitle: string,
	clusterAngle: string,
	alreadyCovered: string[],
	needed: number,
	siteContext?: { name?: string | null; niche?: string | null }
): Promise<string[]> {
	const raw = await callClaudeForZones(
		`You are an SEO editor generating supporting article keywords. Return ONLY a JSON array of strings. No markdown, no explanation.`,
		`Focus page: "${focusPageTitle}" (keyword: "${topicKeyword}")
Business: ${siteContext?.name ?? 'unknown'} | Niche: ${siteContext?.niche ?? 'unknown'}
Cluster editorial angle: ${clusterAngle}

Already covered:
${alreadyCovered.join('\n')}

Generate ${needed + 2} more supporting article PRIMARY KEYWORDS that:
1. Are genuinely different from what's already covered
2. Are DIRECTLY about "${topicKeyword}" — not about the broader industry or unrelated topics
3. Are natural search phrases (3-6 words) someone would type when researching this specific topic
4. Each can anchor a standalone article about one specific aspect of "${topicKeyword}"

Return ONLY: ["keyword one", "keyword two", ...]`
	);
	return parseJSONSafe<string[]>(raw, []);
}

type ArticleCandidate = {
	keyword: string;
	monthly_searches: number | null;
	keyword_difficulty: number | null;
	cpc: number | null;
	source: 'dataforseo' | 'paa' | 'related' | 'ai';
	score: number;
	aiTitle?: string;
};

const scoreKw = (k: Pick<DfsKeyword, 'cpc' | 'monthly_searches' | 'keyword_difficulty'>) =>
	((k.cpc + 0.1) * Math.sqrt(k.monthly_searches)) / (k.keyword_difficulty + 1);

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

const QUESTION_STARTERS = new Set(['which', 'whose', 'where', 'whether', 'whom']);

function meaningfulWords(kw: string): Set<string> {
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
	if (na.includes(nb) || nb.includes(na)) return true;
	const ca = corePhrase(a);
	const cb = corePhrase(b);
	if (ca === cb && ca.length > 0) return true;
	if (ca.length > 4 && cb.length > 4 && (ca.includes(cb) || cb.includes(ca))) return true;
	const stripQ = (s: string) =>
		s
			.split(' ')
			.filter((w) => !QUESTION_STARTERS.has(w))
			.join(' ');
	const qa = corePhrase(stripQ(na));
	const qb = corePhrase(stripQ(nb));
	if (qa.length > 4 && qb.length > 4 && (qa === qb || qa.includes(qb) || qb.includes(qa)))
		return true;
	const wa = meaningfulWords(a);
	const wb = meaningfulWords(b);
	if (wa.size === 0 || wb.size === 0) return false;
	const intersection = [...wa].filter((x) => wb.has(x)).length;
	const union = new Set([...wa, ...wb]).size;
	return intersection / union > 0.65;
}

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

function detectPageType(keyword: string): string {
	const kw = keyword.toLowerCase();
	if (
		/\b(buy|shop|order|hire|near me|service|services|quote|get started|sign up|free trial)\b/.test(
			kw
		)
	)
		return 'Service / Landing Page';
	if (/\b(price|pricing|cost|how much|affordable|cheap)\b/.test(kw)) return 'Pricing Guide';
	if (/\bvs\b|\bversus\b/.test(kw)) return 'Versus Comparison';
	if (/\balternative(s)?\b/.test(kw)) return 'Alternatives Listicle';
	if (/\breview(s)?\b/.test(kw)) return 'Review Article';
	if (/\b(best|top)\b.*\b(for|to|when|tool|app|platform|software|plugin)\b/.test(kw))
		return 'Comparison Listicle';
	if (/\b(best|top) \d+\b|\b\d+ best\b/.test(kw)) return 'Listicle';
	if (/\bbest\b|\btop\b/.test(kw)) return 'Comparison Listicle';
	if (/\bhow (to|do|does|can|should|i|you)\b/.test(kw)) return 'How-To Guide';
	if (/\bwhat (is|are|does|means?)\b/.test(kw)) return 'Educational Article';
	if (/\bdefinition\b|\bexplained?\b|\bmeaning\b|\bglossary\b/.test(kw))
		return 'Educational Article';
	if (/\bwhy\b/.test(kw)) return 'Explainer Article';
	if (/\bwhen (to|should|do|is)\b/.test(kw)) return 'Q&A Article';
	if (/\bchecklist\b/.test(kw)) return 'Checklist Article';
	if (/\bstatistic(s)?\b|\bstat(s)?\b|\bdata\b|\bstudy\b|\bstudies\b|\bresearch\b/.test(kw))
		return 'Statistics Article';
	if (/\bguide\b|\btutorial\b|\bwalkthrough\b/.test(kw)) return 'Complete Guide';
	const intent = detectSearchIntent(kw);
	if (intent === 'transactional') return 'Landing Page';
	if (intent === 'commercial') return 'Comparison Article';
	return 'Informational Article';
}

function focusPageTitle(topicTitle: string, _keyword: string): string {
	return topicTitle;
}

function computePositions(articleCount: number): Array<[number, number]> {
	const cx = 400,
		cy = 300;
	const positions: Array<[number, number]> = [[cx, cy]];
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

	const top3 = articlePages.slice(0, 3);
	for (const article of top3) {
		links.push({
			cluster_id: clusterId,
			from_page_id: focusPageId,
			to_page_id: article.id,
			anchor_text: article.keyword,
			placement_hint:
				'Link to this supporting article in the relevant section that covers this subtopic.',
			equity_multiplier: 0.8,
			priority: 2,
			implemented: false
		});
	}

	if (links.length === 0) return;
	try {
		const { error } = await supabase.from('internal_links').insert(links);
		if (error) console.warn('[Clusters] Internal links insert warning:', error.message);
	} catch (err) {
		console.warn('[Clusters] Internal links insert failed (non-fatal):', err);
	}
}

function findDfsMatchFromMaps(
	kw: string,
	dfsMap: Map<string, DfsKeyword>,
	dfsByWord: Map<string, DfsKeyword[]>,
	usedFuzzyDfsKeywords: Set<string>
): DfsKeyword | null {
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
				!usedFuzzyDfsKeywords.has(c.kw.keyword)
		)
		.sort((a, b) => scoreKw(b.kw) - scoreKw(a.kw))[0];
	if (best && normalizeKw(best.kw.keyword) !== normalizeKw(kw)) {
		usedFuzzyDfsKeywords.add(best.kw.keyword);
	}
	return best?.kw ?? null;
}

function buildCandidateFromPlan(
	plan: AIArticlePlan,
	accepted: ArticleCandidate[],
	crossClusterArticleKeywords: string[],
	otherFocusKeywords: string[],
	dfsMap: Map<string, DfsKeyword>,
	dfsByWord: Map<string, DfsKeyword[]>,
	usedFuzzyDfsKeywords: Set<string>
): ArticleCandidate | null {
	const kw = plan.keyword;
	if (!kw.trim() || kw.trim().split(/\s+/).length < 3) return null;
	if (accepted.some((a) => isNearDuplicate(a.keyword, kw))) return null;
	if (crossClusterArticleKeywords.some((existing) => isNearDuplicate(existing, kw))) {
		console.log(`[Clusters] Cross-cluster collision rejected: "${kw}"`);
		return null;
	}
	if (otherFocusKeywords.some((existing) => isNearDuplicate(existing, kw))) {
		console.log(`[Clusters] Focus-page collision rejected: "${kw}"`);
		return null;
	}
	const match = findDfsMatchFromMaps(kw, dfsMap, dfsByWord, usedFuzzyDfsKeywords);
	return {
		keyword: kw,
		aiTitle: plan.title,
		monthly_searches: match?.monthly_searches ?? null,
		keyword_difficulty: match?.keyword_difficulty ?? null,
		cpc: match?.cpc ?? null,
		source: match ? 'dataforseo' : 'ai',
		score: match ? scoreKw(match) * 1.1 : plan.source === 'research' ? 40 : 30
	};
}

// ---------------------------------------------------------------------------
// createCluster
// ---------------------------------------------------------------------------
export const createCluster = async (req: Request, res: Response) => {
	let userId: string | undefined;
	let orgId: string | undefined;
	let creditsDeducted = false;
	try {
		userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const { topicId, maxArticles } = req.body as { topicId: string; maxArticles?: number };
		if (!topicId) return res.status(400).json({ error: 'topicId is required' });
		const articleLimit = Math.min(20, Math.max(3, Math.round(maxArticles ?? 6)));

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();
		if (!userOrg?.organization_id)
			return res.status(400).json({ error: 'No organization. Complete onboarding first.' });
		orgId = userOrg.organization_id;

		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', orgId)
			.single();
		const creditsRemaining = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (creditsRemaining < CREDIT_COSTS.CLUSTER_GENERATION) {
			return res
				.status(402)
				.json({
					error: 'Insufficient credits',
					required: CREDIT_COSTS.CLUSTER_GENERATION,
					available: creditsRemaining
				});
		}

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
		if (topicErr || !topic) return res.status(404).json({ error: 'Topic not found' });

		const siteId = topic.site_id;
		const { data: site } = await supabase
			.from('sites')
			.select('name, niche, customer_description, domain_authority')
			.eq('id', siteId)
			.single();

		// Cross-cluster dedup context
		const { data: existingSitePages } = await supabase
			.from('pages')
			.select('keyword, type, cluster_id, site_id')
			.eq('site_id', siteId);
		const crossClusterArticleKeywords: string[] = (existingSitePages ?? [])
			.filter((p) => p.type === 'article' && p.cluster_id != null)
			.map((p) => p.keyword as string)
			.filter(Boolean);
		const otherFocusKeywords: string[] = (existingSitePages ?? [])
			.filter((p) => p.type === 'focus_page')
			.map((p) => p.keyword as string)
			.filter((kw) => kw && kw.toLowerCase() !== topic.keyword.toLowerCase());

		console.log(
			`[Clusters] Cross-cluster context: ${crossClusterArticleKeywords.length} article kws, ${otherFocusKeywords.length} focus kws`
		);

		const clusterAngle = deriveClusterAngle(topic.title, topic.keyword);
		console.log(`[Clusters] Cluster angle: ${clusterAngle.slice(0, 80)}...`);

		// Cluster insert
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

		// ── Phase 0: Topic zone mapping — SCOPED TO THE SPECIFIC TOPIC ───────────
		console.log(`[Clusters] Phase 0: topic zone mapping for "${topic.keyword}"`);

		const zoneRaw = await callClaudeForZones(
			`You are a senior SEO strategist generating DataForSEO search seeds.
Seeds pull keyword data from a database. Short common phrases return hundreds of results, long specific phrases return zero.
Return ONLY valid JSON, no markdown.`,
			`Business: ${site?.name ?? 'Unknown'} | Niche: ${site?.niche ?? 'Unknown'}
Focus topic keyword: "${topic.keyword}"

Generate 5-7 DataForSEO seed keywords covering distinct sub-angles of this SPECIFIC topic.

CRITICAL — seeds must be about the specific topic, not the broader industry:
- Seeds must be SHORT: 2-4 words maximum
- Each seed covers a different ASPECT of "${topic.keyword}" — not the broader niche
- Do NOT include the focus keyword itself

EXAMPLE — focus: "shopify url structure seo"
GOOD zones (about the specific topic): ["url structure", "canonical urls shopify", "shopify redirects seo", "url slug optimization", "shopify url best practices"]
BAD zones (too broad): ["shopify seo", "ecommerce seo", "seo tips", "technical seo"] ← these are the broad industry, not the specific topic

EXAMPLE — focus: "shopify product page seo"
GOOD zones: ["product page seo", "ecommerce meta tags", "product description seo", "schema markup shopify", "product image alt text"]
BAD zones: ["shopify marketing", "ecommerce tips", "online store seo"]

EXAMPLE — focus: "shopify seo apps"
GOOD zones: ["shopify seo apps", "seo plugin shopify", "shopify meta tags app", "shopify sitemap app", "shopify structured data"]
BAD zones: ["shopify apps", "seo tools", "ecommerce apps"]

Return:
{
  "zone_seeds": ["5-7 short seeds scoped to the SPECIFIC topic, not the broader industry"],
  "reasoning": "one sentence on what angles you mapped"
}`
		);

		const zoneData = parseJSONSafe<{ zone_seeds: string[]; reasoning?: string }>(zoneRaw, {
			zone_seeds: []
		});
		const allZoneSeeds = [
			topic.keyword,
			...(zoneData.zone_seeds ?? []).filter((z: string) => z && z.trim().length > 0)
		].slice(0, 9);
		console.log(`[Clusters] Phase 0: ${allZoneSeeds.length} zones — ${allZoneSeeds.join(' | ')}`);

		// ── Phase 1: Parallel keyword research ──────────────────────────────────
		console.log(`[Clusters] Phase 1: parallel research across ${allZoneSeeds.length} zones`);
		const [dfsZoneResults, serpZoneResults] = await Promise.all([
			Promise.allSettled(allZoneSeeds.map((seed) => getKeywordSuggestions(seed, { limit: 50 }))),
			Promise.allSettled(allZoneSeeds.map((seed) => serperSearch(seed, 10)))
		]);

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

		const allPAASignals: string[] = [];
		const allRelatedSignals: string[] = [];
		serpZoneResults.forEach((r) => {
			if (r.status !== 'fulfilled') return;
			(r.value.peopleAlsoAsk ?? []).forEach((p) => {
				if (p.question) allPAASignals.push(p.question);
			});
			(r.value.relatedSearches ?? []).forEach((s) => {
				if (s.query) allRelatedSignals.push(s.query);
			});
		});

		const uniquePAA = [...new Set(allPAASignals)];
		const uniqueRelated = [...new Set(allRelatedSignals)];
		console.log(
			`[Clusters] Phase 1: ${allDfsKeywords.length} DFS keywords | PAA: ${uniquePAA.length} | Related: ${uniqueRelated.length}`
		);

		// ── Phase 2: Quality filter + TOPICAL RELEVANCE GATE ────────────────────
		// This is the core fix: only topically relevant keywords reach the AI or backfill.
		const qualifyingDfs = allDfsKeywords.filter((k) => {
			const kLower = k.keyword.toLowerCase();
			if (kLower === topic.keyword.toLowerCase()) return false;
			if (k.keyword.split(/\s+/).length < 2) return false;
			if (k.keyword_difficulty > 65) return false;
			if (k.monthly_searches < 20) return false;
			return true;
		});

		// Topical relevance split: relevant goes to AI + backfill, off-topic is discarded
		const topicallyRelevantDfs = qualifyingDfs.filter((k) =>
			isTopicallyRelevant(k.keyword, topic.keyword)
		);
		const rankedDfs = [...topicallyRelevantDfs].sort((a, b) => scoreKw(b) - scoreKw(a));
		const topicalKeywordSupply = topicallyRelevantDfs.length;

		// Filter PAA and related for topical relevance too
		const paaQuestions = uniquePAA
			.filter((q) => isTopicallyRelevant(q, topic.keyword))
			.slice(0, 20);
		const related = uniqueRelated.filter((r) => isTopicallyRelevant(r, topic.keyword)).slice(0, 20);

		console.log(
			`[Clusters] Phase 2: ${qualifyingDfs.length} qualifying DFS → ${topicallyRelevantDfs.length} topically relevant | ` +
				`PAA: ${paaQuestions.length} | Related: ${related.length}`
		);

		// ── Phase 2: AI curation ─────────────────────────────────────────────────
		const focusPgTitle = focusPageTitle(topic.title, topic.keyword);
		const dfsForAI = rankedDfs.map((k) => ({
			keyword: k.keyword,
			volume: k.monthly_searches,
			kd: k.keyword_difficulty,
			cpc: k.cpc
		}));
		const blockedForAI = [
			...crossClusterArticleKeywords.slice(0, 40),
			...otherFocusKeywords.slice(0, 20)
		];
		const aiRequestCount = articleLimit * 2 + 5;

		console.log(
			`[Clusters] Phase 2: AI curation — requesting ${aiRequestCount} (target: ${articleLimit}) | ` +
				`${topicalKeywordSupply} on-topic DFS keywords | ${blockedForAI.length} blocked`
		);

		const aiResult = await callAICuration(
			topic.keyword,
			topic.title,
			focusPgTitle,
			clusterAngle,
			dfsForAI,
			paaQuestions,
			related,
			aiRequestCount,
			blockedForAI,
			topicalKeywordSupply,
			site ?? undefined
		);
		console.log(
			`[Clusters] Phase 2: AI selected ${aiResult.selected.length} from research, generated ${aiResult.generated.length} new ideas`
		);

		// ── Phase 3: Build candidate list ────────────────────────────────────────
		const dfsMap = new Map(allDfsKeywords.map((k) => [normalizeKw(k.keyword), k]));
		const dfsByWord = new Map<string, DfsKeyword[]>();
		for (const k of allDfsKeywords) {
			for (const word of normalizeKw(k.keyword).split(' ')) {
				if (word.length < 4) continue;
				if (!dfsByWord.has(word)) dfsByWord.set(word, []);
				dfsByWord.get(word)!.push(k);
			}
		}
		const usedFuzzyDfsKeywords = new Set<string>();

		const accepted: ArticleCandidate[] = [
			{
				keyword: topic.keyword,
				monthly_searches: null,
				keyword_difficulty: null,
				cpc: null,
				source: 'dataforseo',
				score: 0
			}
		];

		if (aiResult.plans && aiResult.plans.length > 0) {
			for (const plan of aiResult.plans) {
				const candidate = buildCandidateFromPlan(
					plan,
					accepted,
					crossClusterArticleKeywords,
					otherFocusKeywords,
					dfsMap,
					dfsByWord,
					usedFuzzyDfsKeywords
				);
				if (candidate) accepted.push(candidate);
			}
		} else {
			for (const kw of [...aiResult.selected, ...aiResult.generated]) {
				const plan: AIArticlePlan = { title: kw, keyword: kw, rationale: '', source: 'research' };
				const candidate = buildCandidateFromPlan(
					plan,
					accepted,
					crossClusterArticleKeywords,
					otherFocusKeywords,
					dfsMap,
					dfsByWord,
					usedFuzzyDfsKeywords
				);
				if (candidate) accepted.push(candidate);
			}
		}

		// AI total-failure fallback — uses TOPICALLY RELEVANT DFS only
		if (
			aiResult.selected.length === 0 &&
			aiResult.generated.length === 0 &&
			aiResult.plans.length === 0
		) {
			console.warn(
				'[Clusters] AI curation returned nothing — falling back to topically relevant research'
			);
			for (const k of rankedDfs) {
				// rankedDfs is already topically filtered
				if (accepted.some((a) => isNearDuplicate(a.keyword, k.keyword))) continue;
				if (crossClusterArticleKeywords.some((ex) => isNearDuplicate(ex, k.keyword))) continue;
				if (otherFocusKeywords.some((ex) => isNearDuplicate(ex, k.keyword))) continue;
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
				// paaQuestions is already topically filtered
				if (q.trim().split(/\s+/).length < 3) continue;
				if (accepted.some((a) => isNearDuplicate(a.keyword, q))) continue;
				if (crossClusterArticleKeywords.some((ex) => isNearDuplicate(ex, q))) continue;
				if (otherFocusKeywords.some((ex) => isNearDuplicate(ex, q))) continue;
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

		// Final dedup pass
		const seenNormalized = new Set<string>();
		seenNormalized.add(normalizeKw(topic.keyword));
		const deduped = accepted
			.filter((a) => a.keyword.toLowerCase() !== topic.keyword.toLowerCase())
			.sort((a, b) => b.score - a.score)
			.filter((a) => {
				const n = normalizeKw(a.keyword);
				if (seenNormalized.has(n)) return false;
				for (const seen of seenNormalized) {
					if (isNearDuplicate(seen, a.keyword)) return false;
				}
				seenNormalized.add(n);
				return true;
			});

		let sortedCandidates = deduped.slice(0, articleLimit);

		// ── Gap-fill round 1: AI with full context ────────────────────────────────
		if (sortedCandidates.length < articleLimit) {
			const remaining = articleLimit - sortedCandidates.length;
			const usedKeywords = new Set([
				normalizeKw(topic.keyword),
				...sortedCandidates.map((a) => normalizeKw(a.keyword))
			]);
			const alreadyCovered = [topic.keyword, ...sortedCandidates.map((a) => a.keyword)];
			console.log(`[Clusters] Gap-fill: short by ${remaining} — AI round 2`);

			const gapResult = await callAICuration(
				topic.keyword,
				topic.title,
				focusPgTitle,
				clusterAngle,
				dfsForAI,
				paaQuestions,
				related,
				remaining + 3,
				[...blockedForAI, ...alreadyCovered],
				topicalKeywordSupply,
				site ?? undefined
			);
			const gapPlans =
				gapResult.plans.length > 0
					? gapResult.plans
					: [...gapResult.selected, ...gapResult.generated].map((kw) => ({
							title: kw,
							keyword: kw,
							rationale: '',
							source: 'research' as const
						}));

			const gapFill: ArticleCandidate[] = [];
			for (const plan of gapPlans) {
				if (gapFill.length >= remaining) break;
				if (alreadyCovered.some((c) => isNearDuplicate(c, plan.keyword))) continue;
				if (crossClusterArticleKeywords.some((ex) => isNearDuplicate(ex, plan.keyword))) continue;
				if (otherFocusKeywords.some((ex) => isNearDuplicate(ex, plan.keyword))) continue;
				if (usedKeywords.has(normalizeKw(plan.keyword))) continue;
				usedKeywords.add(normalizeKw(plan.keyword));
				const match = findDfsMatchFromMaps(plan.keyword, dfsMap, dfsByWord, usedFuzzyDfsKeywords);
				gapFill.push({
					keyword: plan.keyword,
					aiTitle: plan.title,
					monthly_searches: match?.monthly_searches ?? null,
					keyword_difficulty: match?.keyword_difficulty ?? null,
					cpc: match?.cpc ?? null,
					source: match ? 'dataforseo' : 'ai',
					score: match ? scoreKw(match) : 28
				});
			}
			console.log(`[Clusters] Gap-fill: AI contributed ${gapFill.length}/${remaining}`);

			// DFS backfill — ONLY from the topically relevant pool (rankedDfs)
			// NEVER pull from the full DFS pool — that's what caused the "best ecommerce agencies" problem
			if (gapFill.length < remaining) {
				const stillNeeded = remaining - gapFill.length;
				console.log(`[Clusters] Gap-fill: topical DFS backfill for last ${stillNeeded} slots`);
				for (const k of rankedDfs) {
					if (gapFill.length >= remaining) break;
					if (usedKeywords.has(normalizeKw(k.keyword))) continue;
					if (sortedCandidates.some((a) => isNearDuplicate(a.keyword, k.keyword))) continue;
					if (gapFill.some((a) => isNearDuplicate(a.keyword, k.keyword))) continue;
					if (crossClusterArticleKeywords.some((ex) => isNearDuplicate(ex, k.keyword))) continue;
					if (otherFocusKeywords.some((ex) => isNearDuplicate(ex, k.keyword))) continue;
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

		// ── Gap-fill round 2: dynamic Claude call (topically scoped) ─────────────
		if (sortedCandidates.length < articleLimit) {
			const stillNeeded = articleLimit - sortedCandidates.length;
			const usedKw = new Set([
				normalizeKw(topic.keyword),
				...sortedCandidates.map((a) => normalizeKw(a.keyword))
			]);
			const alreadyCoveredFinal = [topic.keyword, ...sortedCandidates.map((a) => a.keyword)];
			console.log(`[Clusters] Dynamic gap-fill: generating ${stillNeeded} contextual keywords`);

			const dynamicKeywords = await callDynamicGapFill(
				topic.keyword,
				focusPgTitle,
				clusterAngle,
				alreadyCoveredFinal,
				stillNeeded,
				site ?? undefined
			);
			const dynamicFill: ArticleCandidate[] = [];
			for (const kw of dynamicKeywords) {
				if (dynamicFill.length >= stillNeeded) break;
				if (!kw.trim() || kw.trim().split(/\s+/).length < 3) continue;
				// Dynamic keywords also must pass topicality gate
				if (!isTopicallyRelevant(kw, topic.keyword)) {
					console.log(`[Clusters] Dynamic gap-fill topicality reject: "${kw}"`);
					continue;
				}
				const nKw = normalizeKw(kw);
				if (usedKw.has(nKw)) continue;
				if (alreadyCoveredFinal.some((c) => isNearDuplicate(c, kw))) continue;
				if (dynamicFill.some((a) => isNearDuplicate(a.keyword, kw))) continue;
				if (crossClusterArticleKeywords.some((ex) => isNearDuplicate(ex, kw))) continue;
				if (otherFocusKeywords.some((ex) => isNearDuplicate(ex, kw))) continue;
				usedKw.add(nKw);
				const match = findDfsMatchFromMaps(kw, dfsMap, dfsByWord, usedFuzzyDfsKeywords);
				dynamicFill.push({
					keyword: kw,
					monthly_searches: match?.monthly_searches ?? null,
					keyword_difficulty: match?.keyword_difficulty ?? null,
					cpc: match?.cpc ?? null,
					source: match ? 'dataforseo' : 'ai',
					score: match ? scoreKw(match) : 20
				});
			}
			console.log(`[Clusters] Dynamic gap-fill: contributed ${dynamicFill.length}/${stillNeeded}`);
			sortedCandidates = [...sortedCandidates, ...dynamicFill].slice(0, articleLimit);
		}

		// If still short after all rounds, deliver what we have — quality over padding
		console.log(
			`[Clusters] Phase 3 final: ${sortedCandidates.length}/${articleLimit} articles — ` +
				`${sortedCandidates.filter((a) => a.source === 'dataforseo').length} with real metrics, ` +
				`${sortedCandidates.filter((a) => a.source === 'ai').length} AI-only`
		);

		const articleCandidates = sortedCandidates.slice(0, articleLimit);
		const positions = computePositions(articleCandidates.length);
		const focusIntent = detectSearchIntent(topic.keyword);
		const focusFunnelStage = topic.funnel_stage || intentToFunnelStage(focusIntent);

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

		const articleRows = articleCandidates.map((article, i) => {
			const title =
				(article as ArticleCandidate & { aiTitle?: string }).aiTitle ??
				article.keyword.charAt(0).toUpperCase() + article.keyword.slice(1);
			const articleIntent = detectSearchIntent(article.keyword);
			const stage: 'tofu' | 'mofu' | 'bofu' = 'tofu';
			return {
				cluster_id: cluster.id,
				site_id: siteId,
				type: 'article',
				title,
				keyword: article.keyword,
				monthly_searches: article.monthly_searches,
				keyword_difficulty: article.keyword_difficulty,
				cpc: article.cpc ?? null,
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
					captureApiWarning(`credit_back_action failed: ${refundErr.message}`, req, {
						orgId,
						amount: CREDIT_COSTS.CLUSTER_GENERATION,
						actionKey: 'cluster_generation'
					});
				} else {
					console.log(
						`[Clusters] Refunded ${CREDIT_COSTS.CLUSTER_GENERATION} credits to org ${orgId}`
					);
					await createNotificationForUser(userId, orgId, {
						title: 'Cluster creation failed',
						message: `${CREDIT_COSTS.CLUSTER_GENERATION} credits were automatically refunded. Cluster creation failed.`,
						type: 'credit_refund',
						priority: 'high',
						action_url: '/clusters',
						metadata: {
							credits_refunded: CREDIT_COSTS.CLUSTER_GENERATION,
							reason: 'cluster_creation_failed'
						},
						skipToast: true
					});
				}
			} catch (refundEx) {
				console.error(
					'[Clusters] refundCredits threw:',
					refundEx instanceof Error ? refundEx.message : refundEx
				);
				captureApiError(refundEx, req, { feature: 'clusters-create-refund', orgId, userId });
			}
		}
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// ---------------------------------------------------------------------------
// regenerateCluster
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

		const { data: cluster, error: clusterErr } = await supabase
			.from('clusters')
			.select('id, target_keyword, title, site_id, sites(organization_id)')
			.eq('id', clusterId)
			.single();
		if (clusterErr || !cluster) return res.status(404).json({ error: 'Cluster not found' });

		const sitesData = cluster.sites as
			| { organization_id: string }
			| { organization_id: string }[]
			| null;
		orgId = Array.isArray(sitesData) ? sitesData[0]?.organization_id : sitesData?.organization_id;
		if (!orgId) return res.status(500).json({ error: 'Could not resolve organization' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();
		if (!userOrg || userOrg.organization_id !== orgId)
			return res.status(403).json({ error: 'Access denied' });

		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', orgId)
			.single();
		const creditsAvailable = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (creditsAvailable < CREDIT_COSTS.CLUSTER_GENERATION) {
			return res
				.status(402)
				.json({
					error: 'Insufficient credits',
					required: CREDIT_COSTS.CLUSTER_GENERATION,
					available: creditsAvailable
				});
		}

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

		const { data: existingPages } = await supabase
			.from('pages')
			.select('keyword, type')
			.eq('cluster_id', clusterId);
		const existingKeywords = new Set((existingPages ?? []).map((p) => normalizeKw(p.keyword)));

		const { data: existingSitePages } = await supabase
			.from('pages')
			.select('keyword, type, cluster_id')
			.eq('site_id', cluster.site_id);
		const crossClusterArticleKeywords: string[] = (existingSitePages ?? [])
			.filter((p) => p.type === 'article' && p.cluster_id != null && p.cluster_id !== clusterId)
			.map((p) => p.keyword as string)
			.filter(Boolean);
		const otherFocusKeywords: string[] = (existingSitePages ?? [])
			.filter((p) => p.type === 'focus_page' && p.cluster_id !== clusterId)
			.map((p) => p.keyword as string)
			.filter((kw) => kw && kw.toLowerCase() !== cluster.target_keyword.toLowerCase());

		const clusterAngle = deriveClusterAngle(cluster.title, cluster.target_keyword);
		console.log(
			`[Clusters/Regen] Starting for "${cluster.target_keyword}" (limit: ${articleLimit})`
		);

		const dfsLimit = Math.min(200, Math.max(50, articleLimit * 8));
		const [dfsResult, serperResult] = await Promise.all([
			getKeywordSuggestions(cluster.target_keyword, { limit: dfsLimit }),
			serperSearch(cluster.target_keyword, 10)
		]);

		const topicQualifiers = extractDifferentiatingQualifiers(cluster.target_keyword);
		const qualifyingDfs = dfsResult.keywords.filter((k) => {
			const kLower = k.keyword.toLowerCase();
			if (kLower === cluster.target_keyword.toLowerCase()) return false;
			if (existingKeywords.has(normalizeKw(k.keyword))) return false;
			if (k.keyword.split(/\s+/).length < 3) return false;
			if (k.keyword_difficulty > 55) return false;
			if (k.monthly_searches < 30) return false;
			if (topicQualifiers.length > 0) return topicQualifiers.some((q) => kLower.includes(q));
			return true;
		});

		// Apply topical relevance filter in regen too
		const topicallyRelevantDfs = qualifyingDfs.filter((k) =>
			isTopicallyRelevant(k.keyword, cluster.target_keyword)
		);
		const rankedDfs = [...topicallyRelevantDfs].sort((a, b) => scoreKw(b) - scoreKw(a));
		const topicalKeywordSupply = topicallyRelevantDfs.length;

		const paaQuestions = (serperResult.peopleAlsoAsk ?? [])
			.map((p) => p.question)
			.filter(
				(q) =>
					Boolean(q) &&
					!existingKeywords.has(normalizeKw(q)) &&
					isTopicallyRelevant(q, cluster.target_keyword)
			);
		const related = (serperResult.relatedSearches ?? [])
			.map((r) => r.query)
			.filter(
				(r) =>
					Boolean(r) &&
					!existingKeywords.has(normalizeKw(r)) &&
					isTopicallyRelevant(r, cluster.target_keyword)
			);

		const focusPgTitle = focusPageTitle(cluster.title, cluster.target_keyword);
		const dfsForAI = rankedDfs.map((k) => ({
			keyword: k.keyword,
			volume: k.monthly_searches,
			kd: k.keyword_difficulty,
			cpc: k.cpc
		}));
		const aiRequestCount = articleLimit + Math.max(5, Math.ceil(articleLimit * 0.6));
		const blockedForAI = [
			...crossClusterArticleKeywords.slice(0, 40),
			...otherFocusKeywords.slice(0, 20)
		];

		const aiResult = await callAICuration(
			cluster.target_keyword,
			cluster.title,
			focusPgTitle,
			clusterAngle,
			dfsForAI,
			paaQuestions,
			related,
			aiRequestCount,
			blockedForAI,
			topicalKeywordSupply
		);

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

		const accepted: ArticleCandidate[] = [
			{
				keyword: cluster.target_keyword,
				monthly_searches: null,
				keyword_difficulty: null,
				cpc: null,
				source: 'dataforseo',
				score: 0
			}
		];

		const isDupeRegen = (kw: string) =>
			accepted.some((a) => isNearDuplicate(a.keyword, kw)) || existingKeywords.has(normalizeKw(kw));

		const processKw = (kw: string, aiTitle?: string, source?: 'research' | 'ai') => {
			if (kw.trim().split(/\s+/).length < 3) return;
			if (isDupeRegen(kw)) return;
			if (crossClusterArticleKeywords.some((ex) => isNearDuplicate(ex, kw))) return;
			if (otherFocusKeywords.some((ex) => isNearDuplicate(ex, kw))) return;
			const match = findDfsMatchFromMaps(kw, dfsMap, dfsByWord, usedFuzzyDfsRegen);
			accepted.push({
				keyword: kw,
				aiTitle,
				monthly_searches: match?.monthly_searches ?? null,
				keyword_difficulty: match?.keyword_difficulty ?? null,
				cpc: match?.cpc ?? null,
				source: match ? 'dataforseo' : 'ai',
				score: match ? scoreKw(match) * 1.1 : source === 'research' ? 40 : 30
			});
		};

		if (aiResult.plans && aiResult.plans.length > 0) {
			for (const plan of aiResult.plans) processKw(plan.keyword, plan.title, plan.source);
		} else {
			for (const kw of [...aiResult.selected, ...aiResult.generated])
				processKw(kw, undefined, 'research');
		}

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
		const intentDeduped: ArticleCandidate[] = [];
		for (const a of accepted.slice(1)) {
			const g = intentGroup(a.keyword);
			const count = intentGroupCounts[g] ?? 0;
			const limit = intentGroupLimits[g] ?? 5;
			if (count < limit) {
				intentDeduped.push(a);
				intentGroupCounts[g] = count + 1;
			}
		}

		const finalCandidates = intentDeduped
			.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
			.slice(0, articleLimit + Math.ceil(articleLimit * 0.3));

		const suggestions = finalCandidates.map((a) => {
			const intent = detectSearchIntent(a.keyword);
			const stage = intentToFunnelStage(intent);
			return {
				keyword: a.keyword,
				title: (a as ArticleCandidate & { aiTitle?: string }).aiTitle ?? undefined,
				monthly_searches: a.monthly_searches,
				keyword_difficulty: a.keyword_difficulty,
				cpc: a.cpc,
				funnel_stage: stage,
				page_type: detectPageType(a.keyword),
				source: a.source
			};
		});

		const { data: savedRun } = await supabase
			.from('cluster_runs')
			.insert({ cluster_id: clusterId, organization_id: orgId, suggestions })
			.select('id')
			.single();

		console.log(
			`[Clusters/Regen] Done — ${suggestions.length} suggestions, runId: ${savedRun?.id}`
		);
		return res.json({ suggestions, runId: savedRun?.id ?? null });
	} catch (err) {
		console.error('[Clusters/Regen] Error:', err);
		captureApiError(err, req, { feature: 'clusters-regenerate', orgId, userId });
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
					captureApiWarning(`credit_back_action failed: ${refundErr.message}`, req, {
						orgId,
						amount: CREDIT_COSTS.CLUSTER_GENERATION,
						actionKey: 'cluster_generation'
					});
				} else {
					console.log(
						`[Clusters/Regen] Refunded ${CREDIT_COSTS.CLUSTER_GENERATION} credits to org ${orgId}`
					);
					await createNotificationForUser(userId, orgId, {
						title: 'Cluster regeneration failed',
						message: `${CREDIT_COSTS.CLUSTER_GENERATION} credits were automatically refunded. Cluster regeneration failed.`,
						type: 'credit_refund',
						priority: 'high',
						action_url: '/clusters',
						metadata: {
							credits_refunded: CREDIT_COSTS.CLUSTER_GENERATION,
							reason: 'cluster_regeneration_failed'
						},
						skipToast: true
					});
				}
			} catch (refundEx) {
				console.error(
					'[Clusters/Regen] Refund threw:',
					refundEx instanceof Error ? refundEx.message : refundEx
				);
				captureApiError(refundEx, req, { feature: 'clusters-regenerate-refund', orgId, userId });
			}
		}
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// ---------------------------------------------------------------------------
// generateArticleBrief
// ---------------------------------------------------------------------------
export const generateArticleBrief = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });
		const { clusterId, pageId } = req.params;
		if (!clusterId || !pageId)
			return res.status(400).json({ error: 'clusterId and pageId are required' });

		const { data: cluster, error: clusterErr } = await supabase
			.from('clusters')
			.select('id, site_id, sites(organization_id)')
			.eq('id', clusterId)
			.single();
		if (clusterErr || !cluster) return res.status(404).json({ error: 'Cluster not found' });

		const sitesData = cluster.sites as
			| { organization_id: string }
			| { organization_id: string }[]
			| null;
		const orgId = Array.isArray(sitesData)
			? sitesData[0]?.organization_id
			: sitesData?.organization_id;
		if (!orgId) return res.status(500).json({ error: 'Could not resolve organization' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();
		if (!userOrg || userOrg.organization_id !== orgId)
			return res.status(403).json({ error: 'Access denied' });

		const { data: page, error: pageErr } = await supabase
			.from('pages')
			.select(
				'id, type, keyword, title, cluster_id, site_id, funnel_stage, monthly_searches, keyword_difficulty, cpc'
			)
			.eq('id', pageId)
			.eq('cluster_id', clusterId)
			.single();
		if (pageErr || !page) return res.status(404).json({ error: 'Page not found in this cluster' });
		if (page.type !== 'article')
			return res
				.status(400)
				.json({
					error:
						'This endpoint is for article pages only. Use /api/pages/:pageId/brief for focus pages.'
				});

		const briefCost = CREDIT_COSTS.ARTICLE_BRIEF ?? CREDIT_COSTS.MONEY_PAGE_BRIEF ?? 3;
		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', orgId)
			.single();
		const available = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (available < briefCost)
			return res
				.status(402)
				.json({ error: 'Insufficient credits', required: briefCost, available });

		const newCredits = Math.max(0, available - briefCost);
		await supabase
			.from('organizations')
			.update({
				included_credits_remaining: newCredits,
				...(org?.included_credits != null && { included_credits: newCredits })
			})
			.eq('id', orgId);

		req.params.pageId = pageId;
		req.body = { ...req.body, _articleBriefContext: { clusterId, orgId } };
		const { generateBrief } = await import('./pages.js');
		return generateBrief(req, res);
	} catch (err) {
		console.error('[Clusters/ArticleBrief] Error:', err);
		captureApiError(err, req, { feature: 'clusters-article-brief' });
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// ---------------------------------------------------------------------------
// getClusterIntelligence
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

		const { data: cluster, error: clusterErr } = await supabase
			.from('clusters')
			.select('id, site_id, destination_page_url, architecture')
			.eq('id', clusterId)
			.single();
		if (clusterErr || !cluster) {
			res.status(404).json({ error: 'Cluster not found' });
			return;
		}

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

		const { data: pages } = await supabase
			.from('pages')
			.select(
				'id, title, type, keyword, page_type, funnel_stage, content, published_url, cro_checklist'
			)
			.eq('cluster_id', clusterId);
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

		const { data: internalLinks } = await supabase
			.from('internal_links')
			.select('from_page_id, to_page_id, implemented')
			.eq('cluster_id', clusterId);
		const siteUrl: string | null = null;

		const { evaluateClusterIntelligence } = await import('../services/clusterIntelligence.js');
		const result = evaluateClusterIntelligence(
			{ destination_page_url: cluster.destination_page_url, architecture: cluster.architecture },
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

		await supabase.from('clusters').update({ cluster_intelligence: result }).eq('id', clusterId);
		res.json(result);
	} catch (err) {
		console.error('[Clusters/Intelligence] Error:', err);
		captureApiError(err, req, { feature: 'clusters-intelligence' });
		res.status(500).json({ error: 'Internal server error' });
	}
};
