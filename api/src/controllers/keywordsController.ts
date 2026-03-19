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

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const CLAUDE_HAIKU_MODEL = process.env.CLAUDE_HAIKU_MODEL || 'claude-3-haiku-20240307';

/**
 * POST /api/keywords/lookup
 * Body: { keyword, siteId, organizationId }
 */
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
			.select('included_credits_remaining, included_credits, da_estimate')
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

		// 2. Claude Haiku: classify keyword metrics
		const siteDA = org?.da_estimate ?? 20;
		const prompt = `You are an SEO keyword analyst. Analyze this keyword and return JSON metrics.

Keyword: "${keyword}"
Related searches found: ${relatedSearches.slice(0, 5).join(', ')}
Top results: ${organic.slice(0, 3).map((r: { title: string; link: string }) => r.title).join(' | ')}
Site Domain Authority: ${siteDA}

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

Authority fit rules (site DA = ${siteDA}):
- "Ready Now": KD < DA + 5
- "Build Toward": KD between DA + 5 and DA + 20
- "Not Yet": KD > DA + 20

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
		res.status(500).json({ error: 'Failed to look up keyword' });
	}
}
