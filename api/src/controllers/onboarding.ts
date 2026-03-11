import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { technicalAuditService } from '../services/technicalAuditService.js';
import { serperSearch, parseSearchResultCount } from '../utils/serper.js';

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

	const isNewDomain = payload.domainAuthority <= 5;
	const authorityRules = isNewDomain
		? `Authority fit rules (NEW DOMAIN — DA ≤ 5):
- achievable: keyword_difficulty <= 15
- buildToward: keyword_difficulty 16-30
- locked: keyword_difficulty > 30
This site is brand new. Only return keywords that a new site can realistically rank for.`
		: `Authority fit rules:
- achievable: keyword_difficulty <= ${payload.domainAuthority + 10}
- buildToward: keyword_difficulty <= ${payload.domainAuthority + 25}
- locked: keyword_difficulty > ${payload.domainAuthority + 25}`;

	const userPrompt = `Business: ${payload.businessName}
What they offer: ${payload.niche}
Target customers: ${payload.customerDescription}
Website: ${payload.url}
Domain Authority (DA): ${payload.domainAuthority}/100${isNewDomain ? ' — NEW DOMAIN' : ''}
Platform: ${payload.platform}

Competitors analyzed:
${competitorBlock}

SERP data for top opportunity keywords:
${payload.serpData}

Generate 15-25 keyword opportunities. For each, return JSON in this exact format (no markdown, no extra text):
{"title":"human-readable topic title","keyword":"exact target keyword","monthly_searches":number,"keyword_difficulty":0-100,"cpc":number,"funnel_stage":"tofu|mofu|bofu","authority_fit":"achievable|buildToward|locked","priority_score":number,"ai_reasoning":"2-sentence plain English explanation"}

${authorityRules}

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
			domainAuthority?: number;
		};

		if (!body.url || !body.businessName) {
			return res.status(400).json({ error: 'Missing required fields: url, businessName' });
		}

		const url = body.url.startsWith('http') ? body.url : `https://${body.url}`;
		extractDomain(url); // retained for future use (competitor domain comparison)
		const competitorUrls = (body.competitorUrls || []).filter(Boolean).slice(0, 3);
		const domainAuthority = Math.max(0, Math.min(100, Number(body.domainAuthority ?? 10)));
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
				domain_authority: domainAuthority
			})
			.select('id')
			.single();

		if (siteErr || !site) {
			console.error('[Onboarding] Site creation failed:', siteErr);
			return res.status(500).json({ error: 'Failed to create site' });
		}

		// Run technical audit in background (don't block response)
		// Will be available on dashboard when complete
		technicalAuditService.runFullAudit(url, site.id, organizationId).catch((e) => {
			console.error('[Onboarding] Technical audit failed (non-blocking):', e);
		});

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

		// 5. Claude topic strategy — use real DA with new-domain protocol
		const effectiveDa = domainAuthority;
		const topics = await callClaudeTopicStrategy({
			businessName: body.businessName,
			niche,
			customerDescription,
			url,
			domainAuthority: effectiveDa,
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
			const { data: insertedTopics } = await supabase.from('topics').insert(rows).select('id, keyword, monthly_searches');

			// 6b. KGR scoring — run allintitle: call for each topic (max 15 to avoid rate limits)
			// KGR = allintitle_count / monthly_searches; < 0.25 = Quick Win
			if (insertedTopics && insertedTopics.length > 0) {
				const kgrCandidates = insertedTopics.slice(0, 15);
				await Promise.allSettled(
					kgrCandidates.map(async (t) => {
						try {
							const monthlySearches = Number(t.monthly_searches) || 1;
							const { searchInformation } = await serperSearch(`allintitle:${t.keyword}`, 1);
							const allintitleCount = parseSearchResultCount(searchInformation?.totalResults);
							const kgrScore = allintitleCount / monthlySearches;
							await supabase
								.from('topics')
								.update({ kgr_score: Math.round(kgrScore * 1000) / 1000 })
								.eq('id', t.id);
						} catch {
							// KGR scoring failure is non-fatal
						}
					})
				);
			}
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
