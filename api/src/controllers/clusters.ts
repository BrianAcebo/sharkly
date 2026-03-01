import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import fetch from 'node-fetch';
import { CREDIT_COSTS } from '../../../shared/credits.mjs';

const SERPER_API_KEY = process.env.SERPER_API_KEY || '';

async function serperSearch(query: string): Promise<{ relatedSearches?: Array<{ query: string }> }> {
	if (!SERPER_API_KEY) return { relatedSearches: [] };
	const res = await fetch('https://google.serper.dev/search', {
		method: 'POST',
		headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
		body: JSON.stringify({ q: query, num: 5 })
	});
	if (!res.ok) return { relatedSearches: [] };
	const data = (await res.json()) as { relatedSearches?: Array<{ query: string }> };
	return { relatedSearches: data.relatedSearches || [] };
}

export const createCluster = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const { topicId } = req.body as { topicId: string };
		if (!topicId) return res.status(400).json({ error: 'topicId is required' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg?.organization_id) {
			return res.status(400).json({ error: 'No organization. Complete onboarding first.' });
		}

		const orgId = userOrg.organization_id;

		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', orgId)
			.single();

		const creditsRemaining = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (creditsRemaining < CLUSTER_CREDIT_COST) {
			return res.status(402).json({
				error: 'Insufficient credits',
				required: CLUSTER_CREDIT_COST,
				available: creditsRemaining
			});
		}

		const { data: topic, error: topicErr } = await supabase
			.from('topics')
			.select('id, site_id, title, keyword, monthly_searches, keyword_difficulty, funnel_stage')
			.eq('id', topicId)
			.single();

		if (topicErr || !topic) {
			return res.status(404).json({ error: 'Topic not found' });
		}

		const siteId = topic.site_id;

		const { data: cluster, error: clusterErr } = await supabase
			.from('clusters')
			.insert({
				site_id: siteId,
				topic_id: topicId,
				title: topic.title,
				target_keyword: topic.keyword,
				status: 'active',
				funnel_coverage: { tofu: 0, mofu: 0, bofu: 0 },
				completion_pct: 0
			})
			.select('id')
			.single();

		if (clusterErr || !cluster) {
			console.error('[Clusters] Create failed:', clusterErr);
			return res.status(500).json({ error: 'Failed to create cluster' });
		}

		const { relatedSearches } = await serperSearch(topic.keyword);
		const articleKeywords = (relatedSearches || []).slice(0, 8).map((r) => r.query);

		const centerX = 400;
		const centerY = 300;
		const spread = 120;
		const positions: Array<[number, number]> = [
			[centerX, centerY],
			[centerX - spread * 2, centerY - spread],
			[centerX - spread, centerY - spread * 1.5],
			[centerX + spread, centerY - spread * 1.5],
			[centerX + spread * 2, centerY - spread],
			[centerX - spread * 2, centerY + spread],
			[centerX - spread, centerY + spread * 1.5],
			[centerX + spread, centerY + spread * 1.5],
			[centerX + spread * 2, centerY + spread]
		];

		const focusTitle = `${topic.title} Services`;
		await supabase.from('pages').insert({
			cluster_id: cluster.id,
			site_id: siteId,
			type: 'focus_page',
			title: focusTitle,
			keyword: topic.keyword,
			monthly_searches: topic.monthly_searches,
			keyword_difficulty: topic.keyword_difficulty,
			funnel_stage: topic.funnel_stage || 'bofu',
			status: 'planned',
			target_word_count: 1400,
			sort_order: 0,
			position_x: positions[0][0],
			position_y: positions[0][1]
		});

		const articleRows = articleKeywords.map((kw, i) => ({
			cluster_id: cluster.id,
			site_id: siteId,
			type: 'article',
			title: kw.charAt(0).toUpperCase() + kw.slice(1),
			keyword: kw,
			monthly_searches: Math.max(100, 1000 - i * 100),
			keyword_difficulty: Math.min(40, (topic.keyword_difficulty || 30) + i * 2),
			funnel_stage: i < 3 ? 'tofu' : i < 6 ? 'mofu' : 'bofu',
			status: 'planned',
			target_word_count: 900 + i * 50,
			sort_order: i + 1,
			position_x: positions[i + 1]?.[0] ?? centerX + (i % 3) * spread,
			position_y: positions[i + 1]?.[1] ?? centerY + Math.floor(i / 3) * spread
		}));

		if (articleRows.length > 0) {
			await supabase.from('pages').insert(articleRows);
		}

		await supabase.from('topics').update({ status: 'active', cluster_id: cluster.id }).eq('id', topicId);

		const newCredits = Math.max(0, creditsRemaining - CREDIT_COSTS.CLUSTER_GENERATION);
		await supabase
			.from('organizations')
			.update({
				included_credits_remaining: newCredits,
				...(org?.included_credits != null && { included_credits: newCredits })
			})
			.eq('id', orgId);

		return res.json({ clusterId: cluster.id });
	} catch (err) {
		console.error('[Clusters] Error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
};
