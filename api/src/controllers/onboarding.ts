import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import fetch from 'node-fetch';

const SERPER_API_KEY = process.env.SERPER_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_HAIKU_MODEL || 'claude-haiku-4-5-20251001';

function extractDomain(url: string): string {
	try {
		const u = new URL(url.startsWith('http') ? url : `https://${url}`);
		return u.hostname.replace(/^www\./, '');
	} catch {
		return (
			url
				.replace(/^https?:\/\//, '')
				.replace(/^www\./, '')
				.split('/')[0] || url
		);
	}
}

async function serperSearch(
	query: string
): Promise<{
	organic?: Array<{ title: string; link: string; snippet?: string }>;
	relatedSearches?: Array<{ query: string }>;
}> {
	if (!SERPER_API_KEY) {
		return { organic: [], relatedSearches: [] };
	}
	const res = await fetch('https://google.serper.dev/search', {
		method: 'POST',
		headers: {
			'X-API-KEY': SERPER_API_KEY,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ q: query, num: 10 })
	});
	if (!res.ok) {
		const text = await res.text();
		console.error('[Onboarding] Serper error:', res.status, text);
		return { organic: [], relatedSearches: [] };
	}
	const data = (await res.json()) as {
		organic?: Array<{ title: string; link: string; snippet?: string }>;
		relatedSearches?: Array<{ query: string }>;
	};
	return {
		organic: data.organic || [],
		relatedSearches: data.relatedSearches || []
	};
}

async function callClaudeTopicStrategy(payload: {
	businessName: string;
	niche: string;
	customerDescription: string;
	url: string;
	domainAuthority: number;
	platform: string;
	competitorData: Array<{ url: string; keywords: string[] }>;
	serpData: string;
}): Promise<
	Array<{
		title: string;
		keyword: string;
		monthly_searches: number;
		keyword_difficulty: number;
		cpc: number;
		funnel_stage: string;
		authority_fit: string;
		priority_score: number;
		ai_reasoning: string;
	}>
> {
	if (!ANTHROPIC_API_KEY) {
		return [];
	}
	const competitorBlock = payload.competitorData
		.map((c) => `${c.url} — top keywords: ${c.keywords.slice(0, 8).join(', ') || 'none'}`)
		.join('\n');

	const userPrompt = `Business: ${payload.businessName}
What they offer: ${payload.niche}
Target customers: ${payload.customerDescription}
Website: ${payload.url}
Domain Authority (estimated): ${payload.domainAuthority}/100
Platform: ${payload.platform}

Competitors analyzed:
${competitorBlock}

SERP data for top opportunity keywords:
${payload.serpData}

Generate 15-25 keyword opportunities. For each, return JSON in this exact format (no markdown, no extra text):
{"title":"human-readable topic title","keyword":"exact target keyword","monthly_searches":number,"keyword_difficulty":0-100,"cpc":number,"funnel_stage":"tofu|mofu|bofu","authority_fit":"achievable|buildToward|locked","priority_score":number,"ai_reasoning":"2-sentence plain English explanation"}

Authority fit rules:
- achievable: keyword_difficulty <= domain_authority + 10
- buildToward: keyword_difficulty <= domain_authority + 25
- locked: keyword_difficulty > domain_authority + 25

Priority score = (commercial_intent_weight × cpc × monthly_searches) / keyword_difficulty where bofu=3, mofu=2, tofu=1
Sort by priority_score descending. Put achievable topics first.
Return a JSON array of objects.`;

	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': ANTHROPIC_API_KEY,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model: CLAUDE_MODEL,
			max_tokens: 4000,
			messages: [{ role: 'user', content: userPrompt }],
			system:
				'You are an expert SEO strategist. You write in plain English. Return only a valid JSON array of topic objects, no other text.'
		})
	});

	if (!res.ok) {
		const text = await res.text();
		console.error('[Onboarding] Claude error:', res.status, text);
		return [];
	}

	const data = (await res.json()) as { content?: Array<{ type: string; text: string }> };
	const text = data.content?.find((c) => c.type === 'text')?.text || '[]';
	try {
		const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		console.error('[Onboarding] Claude parse error:', text.slice(0, 200));
		return [];
	}
}

export const completeOnboarding = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const body = req.body as {
			url: string;
			businessName: string;
			niche: string;
			customerDescription: string;
			platform: string;
			competitorUrls: string[];
		};

		if (!body.url || !body.businessName) {
			return res.status(400).json({ error: 'Missing required fields: url, businessName' });
		}

		const url = body.url.startsWith('http') ? body.url : `https://${body.url}`;
		const domain = extractDomain(url);
		const competitorUrls = (body.competitorUrls || []).filter(Boolean).slice(0, 3);
		const platform = body.platform || 'custom';
		const niche = body.niche || '';
		const customerDescription = body.customerDescription || '';

	// 1. Get user's organization (must exist from billing flow)
	const { data: userOrg } = await supabase
		.from('user_organizations')
		.select('organization_id')
		.eq('user_id', userId)
		.maybeSingle();

	if (!userOrg?.organization_id) {
		return res.status(403).json({ 
			error: 'Organization not found. Complete billing setup first.' 
		});
	}

	const organizationId = userOrg.organization_id;

		// 2. Create site
		const { data: site, error: siteErr } = await supabase
			.from('sites')
			.insert({
				organization_id: organizationId,
				name: body.businessName,
				description: niche,
				url,
				platform,
				niche,
				customer_description: customerDescription,
				competitor_urls: competitorUrls,
				domain_authority: 0
			})
			.select('id')
			.single();

		if (siteErr || !site) {
			console.error('[Onboarding] Site creation failed:', siteErr);
			return res.status(500).json({ error: 'Failed to create site' });
		}

		// 3. Competitor analysis (Serper)
		const competitorData: Array<{
			url: string;
			domain: string;
			keywords: string[];
			estimatedDa: number;
		}> = [];
		for (const compUrl of competitorUrls) {
			const compDomain = extractDomain(compUrl);
			const siteQuery = `site:${compDomain}`;
			const { organic } = await serperSearch(siteQuery);
			const keywords = (organic || [])
				.slice(0, 10)
				.map((o) => o.title || o.snippet || '')
				.filter(Boolean);
			competitorData.push({
				url: compUrl,
				domain: compDomain,
				keywords,
				estimatedDa: 30
			});

			await supabase.from('competitors').insert({
				site_id: site.id,
				url: compUrl,
				domain: compDomain,
				estimated_da: 30
			});
		}

		// 4. SERP for top keywords
		const topKeywords = competitorData.flatMap((c) => c.keywords).slice(0, 5);
		const serpQueries = topKeywords.length ? topKeywords : [`${niche} ${body.businessName}`];
		const serpResults: string[] = [];
		for (const q of serpQueries.slice(0, 3)) {
			const { organic } = await serperSearch(q);
			const snippets = (organic || [])
				.slice(0, 5)
				.map((o) => `${o.title}: ${o.snippet || ''}`)
				.join(' | ');
			serpResults.push(`${q}: ${snippets}`);
		}
		const serpData = serpResults.join('\n');

		// 5. Claude topic strategy
		const topics = await callClaudeTopicStrategy({
			businessName: body.businessName,
			niche,
			customerDescription,
			url,
			domainAuthority: 25,
			platform,
			competitorData: competitorData.map((c) => ({ url: c.url, keywords: c.keywords })),
			serpData
		});

		// 6. Insert topics
		if (topics.length > 0) {
			const rows = topics.map((t, i) => ({
				site_id: site.id,
				title: t.title,
				keyword: t.keyword,
				monthly_searches: t.monthly_searches || 0,
				keyword_difficulty: t.keyword_difficulty || 0,
				cpc: t.cpc || 0,
				funnel_stage: t.funnel_stage || 'mofu',
				authority_fit: t.authority_fit || 'achievable',
				priority_score: t.priority_score || 0,
				ai_reasoning: t.ai_reasoning || '',
				status: t.authority_fit === 'locked' ? 'locked' : 'queued',
				sort_order: i + 1
			}));
			await supabase.from('topics').insert(rows);
		}

		// 7. Update profile completed_onboarding
		await supabase.from('profiles').update({ completed_onboarding: true }).eq('id', userId);

		const quickWins = topics.filter((t) => t.authority_fit === 'achievable').length;

		return res.json({
			siteId: site.id,
			organizationId,
			topicsFound: topics.length,
			competitorsAnalyzed: competitorUrls.length,
			quickWinsAvailable: quickWins
		});
	} catch (err) {
		console.error('[Onboarding] Error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
};
