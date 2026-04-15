/**
 * Keywords Controller
 * Keyword lookup modal: returns volume, difficulty, buyer intent, authority fit,
 * and 6-8 related keyword suggestions.
 * Cost: 5 credits (1 Serper.dev call + 1 Claude Haiku classification)
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { serperSearch } from '../utils/serper.js';
import Anthropic from '@anthropic-ai/sdk';
import { CREDIT_COSTS } from '../utils/credits.js';
import { captureApiError } from '../utils/sentryCapture.js';
import { resolveSiteDomainAuthority } from '../utils/siteDomainAuthority.js';
import { getKeywordSearchIntents } from '../utils/dataforseo.js';
import { fallbackSearchIntentFromKeyword } from '../utils/searchIntentFallback.js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_HAIKU_MODEL = process.env.CLAUDE_HAIKU_MODEL || 'claude-3-haiku-20240307';

/**
 * POST /api/keywords/lookup
 * Body: { keyword, siteId, organizationId }
 */
/**
 * POST /api/keywords/search-intent
 * DataForSEO Labs search intent (ML). No credits — small DataForSEO charge only.
 * Body: { keyword: string }
 */
export async function lookupSearchIntent(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const keyword = typeof req.body?.keyword === 'string' ? req.body.keyword.trim() : '';
		if (!keyword || keyword.length < 2) {
			res.status(400).json({ error: 'keyword is required' });
			return;
		}

		const { items, configured, error } = await getKeywordSearchIntents([keyword]);
		if (!configured) {
			res.json({
				keyword,
				source: 'fallback' as const,
				kind: fallbackSearchIntentFromKeyword(keyword),
				raw_label: null as string | null,
				probability: null as number | null,
				reason: 'DataForSEO credentials not configured'
			});
			return;
		}

		if (error || items.length === 0) {
			res.json({
				keyword,
				source: 'fallback' as const,
				kind: fallbackSearchIntentFromKeyword(keyword),
				raw_label: null,
				probability: null,
				reason: error ?? 'No intent data returned'
			});
			return;
		}

		const match =
			items.find((i) => i.keyword.toLowerCase() === keyword.toLowerCase()) ?? items[0];
		res.json({
			keyword: match.keyword,
			source: 'dataforseo' as const,
			kind: match.label,
			raw_label: match.label,
			probability: match.probability
		});
	} catch (error) {
		console.error('[Keywords] search-intent error:', error);
		captureApiError(error, req, { feature: 'keywords-search-intent' });
		res.status(500).json({ error: 'Failed to resolve search intent' });
	}
}

export async function lookupKeyword(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const { keyword, siteId, organizationId } = req.body;
		if (!keyword || !organizationId) {
			res.status(400).json({ error: 'keyword and organizationId are required' });
			return;
		}

		// Credit check
		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', organizationId)
			.single();

		const creditsRemaining = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (creditsRemaining < CREDIT_COSTS.KEYWORD_LOOKUP) {
			res.status(402).json({
				error: 'Insufficient credits',
				required: CREDIT_COSTS.KEYWORD_LOOKUP,
				available: creditsRemaining,
				needs_topup: true
			});
			return;
		}

		// Charge credits before any API calls (Serper, Anthropic)
		const newCredits = Math.max(0, creditsRemaining - CREDIT_COSTS.KEYWORD_LOOKUP);
		await supabase
			.from('organizations')
			.update({
				included_credits_remaining: newCredits,
				...(org?.included_credits != null && { included_credits: newCredits })
			})
			.eq('id', organizationId);

		// 1. Serper.dev: fetch related searches and PAA for context
		const serperData = await serperSearch(`${keyword} site statistics`, 5);
		const relatedSearches = (serperData.relatedSearches || []).map((r: { query: string }) => r.query).slice(0, 10);
		const paaQuestions = (serperData.peopleAlsoAsk || []).map((q: { question: string }) => q.question).slice(0, 5);

		// Get organic results for KD estimation
		const organic = serperData.organic || [];

		// 2. Measured site DA (audit or Moz) — never invent from org defaults
		let siteDA = 0;
		let siteDAKnown = false;
		if (siteId && typeof siteId === 'string') {
			const { data: siteRow } = await supabase
				.from('sites')
				.select('last_audit_at, domain_authority_estimated, domain_authority, organization_id')
				.eq('id', siteId)
				.maybeSingle();
			if (siteRow && siteRow.organization_id === organizationId) {
				const daRes = resolveSiteDomainAuthority(siteRow);
				if (daRes.known && daRes.value != null) {
					siteDA = daRes.value;
					siteDAKnown = true;
				}
			}
		}

		const authorityFitBlock = siteDAKnown
			? `Site Domain Authority (measured): ${siteDA}

Authority fit rules:
- "Ready Now": keyword_difficulty < site DA + 5
- "Build Toward": keyword_difficulty between site DA + 5 and site DA + 20
- "Not Yet": keyword_difficulty > site DA + 20`
			: `Site Domain Authority is NOT measured yet (run a technical audit on this site, or refresh domain authority in Site settings, to get Moz/audit DA). Do not invent a DA.

Authority fit (conservative when DA unknown):
- Default to "Build Toward" unless keyword_difficulty is clearly low (<25)
- Use "Not Yet" for difficult keywords (KD > 45)
- In authority_fit_reason, briefly note that domain authority is not measured yet and a technical audit will improve accuracy`;

		// 2b. Claude Haiku: classify keyword metrics
		const prompt = `You are an SEO keyword analyst. Analyze this keyword and return JSON metrics.

Keyword: "${keyword}"
Related searches found: ${relatedSearches.slice(0, 5).join(', ')}
Top results: ${organic.slice(0, 3).map((r: { title: string; link: string }) => r.title).join(' | ')}

${authorityFitBlock}

Return ONLY valid JSON with this exact shape:
{
  "monthly_searches": <number: realistic estimate 0–300000>,
  "search_volume_label": <"Niche" | "Steady" | "Popular" | "High Traffic">,
  "keyword_difficulty": <number 0–100>,
  "difficulty_label": <"Easy to rank" | "Takes time" | "Very competitive">,
  "buyer_intent": <"Informational" | "Commercial" | "High buyer intent">,
  "cpc_estimate": <number: USD estimate>,
  "authority_fit": <"Ready Now" | "Build Toward" | "Not Yet">,
  "authority_fit_reason": <string: 1 sentence why>,
  "related_keywords": [<6-8 related keyword strings>],
  "related_difficulty": [<6-8 difficulty numbers matching related_keywords>]
}

Volume labels:
- Niche: 0–500/mo
- Steady: 501–5000/mo
- Popular: 5001–50000/mo
- High Traffic: >50000/mo`;

		const message = await anthropic.messages.create({
			model: CLAUDE_HAIKU_MODEL,
			max_tokens: 600,
			messages: [{ role: 'user', content: prompt }]
		});

		const rawText = message.content[0].type === 'text' ? message.content[0].text : '{}';
		let metrics: Record<string, unknown> = {};
		try {
			const jsonMatch = rawText.match(/\{[\s\S]*\}/);
			metrics = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
		} catch {
			console.error('[Keywords] Failed to parse Haiku response:', rawText);
		}

		res.json({
			success: true,
			data: {
				keyword,
				monthly_searches: metrics.monthly_searches ?? 0,
				search_volume_label: metrics.search_volume_label ?? 'Niche',
				keyword_difficulty: metrics.keyword_difficulty ?? 50,
				difficulty_label: metrics.difficulty_label ?? 'Takes time',
				buyer_intent: metrics.buyer_intent ?? 'Informational',
				cpc_estimate: metrics.cpc_estimate ?? 0,
				authority_fit: metrics.authority_fit ?? 'Build Toward',
				authority_fit_reason: metrics.authority_fit_reason ?? '',
				related_keywords: metrics.related_keywords ?? relatedSearches.slice(0, 6),
				related_difficulty: metrics.related_difficulty ?? [],
				paa_questions: paaQuestions,
				credits_used: CREDIT_COSTS.KEYWORD_LOOKUP
			}
		});
	} catch (error) {
		console.error('[Keywords] Lookup error:', error);
		captureApiError(error, req, { feature: 'keywords-lookup' });
		res.status(500).json({ error: 'Failed to look up keyword' });
	}
}
