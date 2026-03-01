import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import fetch from 'node-fetch';
import { serperSearch } from '../utils/serper.js';
import { CREDIT_COSTS } from '../../../shared/credits.mjs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const GPT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';

async function checkAndDeductCredits(orgId: string, cost: number): Promise<{ ok: boolean; error?: string; available?: number }> {
	const { data: org } = await supabase
		.from('organizations')
		.select('included_credits_remaining, included_credits')
		.eq('id', orgId)
		.single();

	const available = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
	if (available < cost) {
		return { ok: false, error: 'Insufficient credits', available };
	}

	const newCredits = Math.max(0, available - cost);
	await supabase
		.from('organizations')
		.update({
			included_credits_remaining: newCredits,
			...(org?.included_credits != null && { included_credits: newCredits })
		})
		.eq('id', orgId);

	return { ok: true };
}

export const generateBrief = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const pageId = req.params.id;
		if (!pageId) return res.status(400).json({ error: 'Page ID required' });

		const { data: page, error: pageErr } = await supabase
			.from('pages')
			.select('id, cluster_id, site_id, type, title, keyword, target_word_count')
			.eq('id', pageId)
			.single();

		if (pageErr || !page) return res.status(404).json({ error: 'Page not found' });
		if (page.type !== 'focus_page') return res.status(400).json({ error: 'Only focus pages can have briefs' });

		const { data: site } = await supabase
			.from('sites')
			.select('id, name, niche, customer_description, url, organization_id')
			.eq('id', page.site_id)
			.single();

		if (!site) return res.status(404).json({ error: 'Site not found' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== site.organization_id) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const creditCheck = await checkAndDeductCredits(site.organization_id, CREDIT_COSTS.MONEY_PAGE_BRIEF);
		if (!creditCheck.ok) {
			return res.status(402).json({ error: creditCheck.error, required: CREDIT_COSTS.MONEY_PAGE_BRIEF, available: creditCheck.available });
		}

		const { organic, relatedSearches, peopleAlsoAsk } = await serperSearch(page.keyword || page.title, 10);

		const competitorBlock = (organic || []).slice(0, 5).map((o) => `${o.title} — ${o.snippet || ''}`).join('\n');
		const paaQuestions = (peopleAlsoAsk || []).map((p) => p.question).join('\n');
		const relatedKeywords = (relatedSearches || []).map((r) => r.query).join(', ');
		const targetWc = page.target_word_count || 1400;

		const userPrompt = `Target keyword: ${page.keyword || page.title}
Business: ${site.name} — ${site.niche || ''}
Target customers: ${site.customer_description || ''}
Brand tone: professional
Include these terms: (none specified)
Avoid these terms: (none specified)

Competitor analysis (top SERP results):
${competitorBlock}

Target word count: ${targetWc}

Related questions from Google:
${paaQuestions || 'None'}

Related keywords:
${relatedKeywords || 'None'}

Create a structured content brief with a "sections" array. Each section: {"type":"H1|H2|H3|intro|cta|faq|schema","heading":"the actual heading text","guidance":"what to write in this section (2-3 sentences)","entities":["entity1","entity2"],"word_count_target":number,"cro_note":"conversion tip if applicable or null"}

Also return:
"schema_type":"LocalBusiness|Article|FAQ|Service|Product"
"meta_title_suggestion":"under 60 chars, keyword first"
"meta_description_suggestion":"150-160 chars, includes keyword + CTA"

Return valid JSON only.`;

		const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${OPENAI_API_KEY}`
			},
			body: JSON.stringify({
				model: GPT_MODEL,
				messages: [
					{
						role: 'system',
						content:
							'You are an expert SEO content strategist. Create detailed content briefs. Write in plain language. Return only valid JSON.'
					},
					{ role: 'user', content: userPrompt }
				],
				temperature: 0.3,
				max_tokens: 3000
			})
		});

		if (!openaiRes.ok) {
			const errText = await openaiRes.text();
			console.error('[Pages] OpenAI brief error:', openaiRes.status, errText);
			return res.status(500).json({ error: 'Failed to generate brief' });
		}

		const openaiData = (await openaiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
		const rawContent = openaiData.choices?.[0]?.message?.content || '{}';
		let briefData: Record<string, unknown>;
		try {
			briefData = JSON.parse(rawContent.replace(/```json\n?|\n?```/g, '').trim());
		} catch {
			console.error('[Pages] Brief parse error:', rawContent.slice(0, 200));
			briefData = { sections: [], meta_title_suggestion: '', meta_description_suggestion: '' };
		}

		await supabase
			.from('pages')
			.update({
				brief_data: briefData,
				status: 'brief_generated',
				meta_title: (briefData.meta_title_suggestion as string) || null,
				meta_description: (briefData.meta_description_suggestion as string) || null,
				updated_at: new Date().toISOString()
			})
			.eq('id', pageId);

		return res.json({ briefData, status: 'brief_generated' });
	} catch (err) {
		console.error('[Pages] generateBrief error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const generateArticle = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });

		const pageId = req.params.id;
		if (!pageId) return res.status(400).json({ error: 'Page ID required' });

		const { data: page, error: pageErr } = await supabase
			.from('pages')
			.select('id, cluster_id, site_id, type, title, keyword, target_word_count, brief_data')
			.eq('id', pageId)
			.single();

		if (pageErr || !page) return res.status(404).json({ error: 'Page not found' });

		const { data: site } = await supabase
			.from('sites')
			.select('id, name, niche, customer_description, organization_id')
			.eq('id', page.site_id)
			.single();

		if (!site) return res.status(404).json({ error: 'Site not found' });

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== site.organization_id) {
			return res.status(403).json({ error: 'Access denied' });
		}

		const creditCheck = await checkAndDeductCredits(site.organization_id, CREDIT_COSTS.ARTICLE_GENERATION);
		if (!creditCheck.ok) {
			return res.status(402).json({ error: creditCheck.error, required: CREDIT_COSTS.ARTICLE_GENERATION, available: creditCheck.available });
		}

		const { organic, relatedSearches, peopleAlsoAsk } = await serperSearch(page.keyword || page.title, 10);

		const competitorHeadings = (organic || []).slice(0, 5).map((o) => o.title).join('\n');
		const paaQuestions = (peopleAlsoAsk || []).map((p) => p.question).join('\n');
		const targetWc = page.target_word_count || 1000;

		const brief = page.brief_data as { sections?: Array<{ heading: string; guidance?: string }> } | null;
		const structureGuidance = brief?.sections?.map((s) => s.heading).join('\n') || competitorHeadings;

		const userPrompt = `Write a complete ${targetWc}-word article targeting: ${page.keyword || page.title}

Business context: ${site.name} — ${site.niche || ''}
Brand tone: professional
Include terms: (none)
Avoid terms: (none)

Structure guidance (use similar H2s, improve on them):
${structureGuidance}

Related questions to answer (use as H3 subsections where relevant):
${paaQuestions || 'None'}

Requirements:
- One H1 (contains the keyword)
- 5-8 H2 sections
- H3s under relevant H2s
- Natural keyword usage (not stuffed)
- FAQ section at end (3-5 questions from PAA if available)
- Strong opening paragraph (keyword in first 100 words)
- Concluding paragraph with clear next step
- Write for ${site.customer_description || 'general audience'}

Output in HTML format (h1, h2, h3, p tags). No markdown.`;

		const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${OPENAI_API_KEY}`
			},
			body: JSON.stringify({
				model: GPT_MODEL,
				messages: [
					{
						role: 'system',
						content:
							'You are an expert SEO content writer. Write naturally and helpfully. Output HTML only (h1, h2, h3, p tags). No markdown.'
					},
					{ role: 'user', content: userPrompt }
				],
				temperature: 0.5,
				max_tokens: 4000
			})
		});

		if (!openaiRes.ok) {
			const errText = await openaiRes.text();
			console.error('[Pages] OpenAI article error:', openaiRes.status, errText);
			return res.status(500).json({ error: 'Failed to generate article' });
		}

		const openaiData = (await openaiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
		const htmlContent = openaiData.choices?.[0]?.message?.content || '';

		const wordCount = htmlContent.split(/\s+/).filter(Boolean).length;

		const tiptapContent = htmlToTiptap(htmlContent);

		await supabase
			.from('pages')
			.update({
				content: JSON.stringify(tiptapContent),
				status: 'draft',
				word_count: wordCount,
				updated_at: new Date().toISOString()
			})
			.eq('id', pageId);

		return res.json({ content: tiptapContent, wordCount, status: 'draft' });
	} catch (err) {
		console.error('[Pages] generateArticle error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

function htmlToTiptap(html: string): unknown {
	const content: Array<{ type: string; attrs?: Record<string, unknown>; content?: unknown[] }> = [];
	const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();

	// Match block elements (Node.js-safe, no document)
	const blockRegex = /<(h[1-6]|p|ul|ol|li|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
	let m;
	while ((m = blockRegex.exec(html)) !== null) {
		const tag = m[1].toLowerCase();
		const inner = m[2];
		const text = stripTags(inner);

		if (tag.startsWith('h')) {
			content.push({
				type: 'heading',
				attrs: { level: parseInt(tag[1], 10) },
				content: [{ type: 'text', text }]
			});
		} else if (tag === 'p') {
			content.push({ type: 'paragraph', content: [{ type: 'text', text }] });
		} else if (tag === 'li') {
			content.push({
				type: 'listItem',
				content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
			});
		} else if (tag === 'blockquote') {
			content.push({
				type: 'blockquote',
				content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
			});
		} else if (tag === 'ul' || tag === 'ol') {
			const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
			let liM;
			while ((liM = liRegex.exec(inner)) !== null) {
				content.push({
					type: 'listItem',
					content: [{ type: 'paragraph', content: [{ type: 'text', text: stripTags(liM[1]) }] }]
				});
			}
		}
	}

	if (content.length === 0) {
		content.push({
			type: 'paragraph',
			content: [{ type: 'text', text: stripTags(html) || ' ' }]
		});
	}

	return { type: 'doc', content };
}
