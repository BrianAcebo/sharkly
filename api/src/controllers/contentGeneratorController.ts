/**
 * Content Generator Controller
 * AI-powered content generation for SEO optimization
 * Uses spendCreditsForAction RPC which automatically handles:
 * - Included credits first, then wallet credits
 * - Returns insufficient_credits error if needed
 */

import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import { supabase } from '../utils/supabaseClient';
import { CREDIT_COSTS } from '../utils/credits.js';

const GPT_CONTENT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';
const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});

/**
 * POST /api/content/meta-suggestions
 * Generate meta title and description suggestions (6 credits total)
 */
export async function generateMetaSuggestions(req: Request, res: Response): Promise<void> {
	try {
		const { organizationId } = req.body;
		const { keyword, pageTitle, content } = req.body;

		if (!organizationId || !keyword) {
			res.status(400).json({ error: 'organizationId and keyword required' });
			return;
		}

		// Generate meta titles and descriptions via GPT
		const completion = await openai.chat.completions.create({
			model: GPT_CONTENT_MODEL,
			messages: [
				{
					role: 'system',
					content: `You are an SEO expert. Generate meta titles and descriptions optimized for CTR.
Return ONLY valid JSON (no markdown, no extra text):
{
  "titles": ["title1", "title2", "title3"],
  "descriptions": ["desc1", "desc2", "desc3"]
}`
				},
				{
					role: 'user',
					content: `Generate 3 SEO meta title/description pairs for:
Keyword: "${keyword}"
Page title: "${pageTitle || 'N/A'}"
Content: "${content ? content.slice(0, 500) : 'N/A'}"

Requirements:
- Title: <60 chars, include keyword naturally in first 30 chars
- Description: 150-160 chars, compelling CTR without misleading
- Accurate to content (prevents bounces)`
				}
			],
			temperature: 0.7,
			max_tokens: 600
		});

		const suggestions = JSON.parse(completion.choices[0].message.content || '{}');

		// Spend credits using RPC (handles included + wallet automatically)
		const { data: spendResult, error: spendError } = await supabase.rpc('spend_credits', {
			p_org_id: organizationId,
			p_credits: CREDIT_COSTS.META_GENERATION,
			p_reference_type: 'content_generation',
			p_reference_id: null,
			p_description: `Meta suggestions for keyword: ${keyword}`
		});

		if (spendError || !spendResult?.ok) {
			res.status(402).json({
				error: 'Insufficient credits',
				required: CREDIT_COSTS.META_GENERATION,
				needs_topup: spendResult?.reason?.includes('insufficient') || false
			});
			return;
		}

		res.json({
			success: true,
			data: {
				keyword,
				suggestions: {
					titles: suggestions.titles || [],
					descriptions: suggestions.descriptions || []
				},
				creditsUsed: CREDIT_COSTS.META_GENERATION
			}
		});
	} catch (error) {
		console.error('Error generating meta suggestions:', error);
		res.status(500).json({ error: 'Failed to generate meta suggestions' });
	}
}

/**
 * POST /api/content/product-description
 * Rewrite product description for SEO (10 credits)
 */
export async function rewriteProductDescription(req: Request, res: Response): Promise<void> {
	try {
		const { organizationId } = req.body;
		const { currentDescription, productName, targetKeywords, tone = 'professional' } = req.body;

		if (!organizationId || !currentDescription || !productName) {
			res.status(400).json({ error: 'organizationId, currentDescription, and productName required' });
			return;
		}

		// Generate rewritten descriptions via GPT
		const completion = await openai.chat.completions.create({
			model: GPT_CONTENT_MODEL,
			messages: [
				{
					role: 'system',
					content: `You are an ecommerce copywriter specializing in SEO and conversions.
Rewrite product descriptions to be compelling, SEO-optimized, and conversion-focused.
Return ONLY valid JSON (no markdown, no extra text):
{
  "descriptions": ["version1", "version2", "version3"]
}`
				},
				{
					role: 'user',
					content: `Rewrite this product description 3 times with different angles:
Product: "${productName}"
Current: "${currentDescription}"
Keywords to include: ${targetKeywords ? targetKeywords.join(', ') : 'N/A'}
Tone: ${tone}

Each version should:
1. Include target keywords naturally
2. Be 100-200 words
3. Have strong CTAs
4. Focus on benefits, not just features`
				}
			],
			temperature: 0.8,
			max_tokens: 1200
		});

		const suggestions = JSON.parse(completion.choices[0].message.content || '{}');

		// Spend credits using RPC (handles included + wallet automatically)
		const { data: spendResult, error: spendError } = await supabase.rpc('spend_credits', {
			p_org_id: organizationId,
			p_credits: CREDIT_COSTS.PRODUCT_DESCRIPTION,
			p_reference_type: 'content_generation',
			p_reference_id: null,
			p_description: `Product description rewrite for: ${productName}`
		});

		if (spendError || !spendResult?.ok) {
			res.status(402).json({
				error: 'Insufficient credits',
				required: CREDIT_COSTS.PRODUCT_DESCRIPTION,
				needs_topup: spendResult?.reason?.includes('insufficient') || false
			});
			return;
		}

		res.json({
			success: true,
			data: {
				productName,
				suggestions: suggestions.descriptions || [],
				creditsUsed: CREDIT_COSTS.PRODUCT_DESCRIPTION
			}
		});
	} catch (error) {
		console.error('Error rewriting product description:', error);
		res.status(500).json({ error: 'Failed to rewrite product description' });
	}
}

/**
 * POST /api/content/faq
 * Generate FAQ section (5 credits)
 */
export async function generateFAQ(req: Request, res: Response): Promise<void> {
	try {
		const { organizationId } = req.body;
		const { topic, content, audience = 'general' } = req.body;

		if (!organizationId || !topic) {
			res.status(400).json({ error: 'organizationId and topic required' });
			return;
		}

		// Generate FAQ via GPT
		const completion = await openai.chat.completions.create({
			model: GPT_CONTENT_MODEL,
			messages: [
				{
					role: 'system',
					content: `You are an expert at creating FAQs that drive engagement and SEO.
Generate 8 common questions and answers for the given topic.
Return ONLY valid JSON (no markdown, no extra text):
{
  "faqs": [
    {"question": "Q1?", "answer": "A1"},
    {"question": "Q2?", "answer": "A2"}
  ]
}`
				},
				{
					role: 'user',
					content: `Create an FAQ for:
Topic: "${topic}"
Audience: ${audience}
Content: "${content ? content.slice(0, 500) : 'General knowledge'}"

Generate 8 questions/answers that:
1. Address common user concerns
2. Include natural keywords
3. Are conversational (100-150 words per answer)
4. Drive both engagement and SEO`
				}
			],
			temperature: 0.7,
			max_tokens: 1500
		});

		const suggestions = JSON.parse(completion.choices[0].message.content || '{}');

		// Spend credits using RPC (handles included + wallet automatically)
		const { data: spendResult, error: spendError } = await supabase.rpc('spend_credits', {
			p_org_id: organizationId,
			p_credits: CREDIT_COSTS.FAQ_GENERATION,
			p_reference_type: 'content_generation',
			p_reference_id: null,
			p_description: `FAQ generation for: ${topic}`
		});

		if (spendError || !spendResult?.ok) {
			res.status(402).json({
				error: 'Insufficient credits',
				required: CREDIT_COSTS.FAQ_GENERATION,
				needs_topup: spendResult?.reason?.includes('insufficient') || false
			});
			return;
		}

		res.json({
			success: true,
			data: {
				topic,
				faqs: suggestions.faqs || [],
				creditsUsed: CREDIT_COSTS.FAQ_GENERATION
			}
		});
	} catch (error) {
		console.error('Error generating FAQ:', error);
		res.status(500).json({ error: 'Failed to generate FAQ' });
	}
}

/**
 * POST /api/content/rewrite-section
 * Rewrite a section of content (5 credits)
 */
export async function rewriteSection(req: Request, res: Response): Promise<void> {
	try {
		const { organizationId } = req.body;
		const { sectionContent, targetKeywords, angle = 'engaging' } = req.body;

		if (!organizationId || !sectionContent) {
			res.status(400).json({ error: 'organizationId and sectionContent required' });
			return;
		}

		// Generate rewritten sections via GPT
		const completion = await openai.chat.completions.create({
			model: GPT_CONTENT_MODEL,
			messages: [
				{
					role: 'system',
					content: `You are an expert content writer. Rewrite sections for better SEO and readability.
Return ONLY valid JSON (no markdown, no extra text):
{
  "rewrites": ["version1", "version2", "version3"]
}`
				},
				{
					role: 'user',
					content: `Rewrite this section 3 times with different angles:
Original: "${sectionContent}"
Keywords: ${targetKeywords ? targetKeywords.join(', ') : 'N/A'}
Angle: ${angle}

Each version should:
1. Keep the core meaning
2. Include keywords naturally
3. Be same approximate length
4. Improve readability and flow`
				}
			],
			temperature: 0.75,
			max_tokens: 1000
		});

		const suggestions = JSON.parse(completion.choices[0].message.content || '{}');

		// Spend credits using RPC (handles included + wallet automatically)
		const { data: spendResult, error: spendError } = await supabase.rpc('spend_credits', {
			p_org_id: organizationId,
			p_credits: CREDIT_COSTS.SECTION_REWRITE,
			p_reference_type: 'content_generation',
			p_reference_id: null,
			p_description: 'Content section rewrite'
		});

		if (spendError || !spendResult?.ok) {
			res.status(402).json({
				error: 'Insufficient credits',
				required: CREDIT_COSTS.SECTION_REWRITE,
				needs_topup: spendResult?.reason?.includes('insufficient') || false
			});
			return;
		}

		res.json({
			success: true,
			data: {
				rewrites: suggestions.rewrites || [],
				creditsUsed: CREDIT_COSTS.SECTION_REWRITE
			}
		});
	} catch (error) {
		console.error('Error rewriting section:', error);
		res.status(500).json({ error: 'Failed to rewrite section' });
	}
}

/**
 * POST /api/content/adjust-tone
 * Adjust tone of existing content (3 credits)
 */
export async function adjustTone(req: Request, res: Response): Promise<void> {
	try {
		const { organizationId } = req.body;
		const { content, targetTone } = req.body;

		if (!organizationId || !content || !targetTone) {
			res.status(400).json({ error: 'organizationId, content, and targetTone required' });
			return;
		}

		const validTones = ['professional', 'casual', 'friendly', 'authoritative', 'conversational'];
		if (!validTones.includes(targetTone)) {
			res.status(400).json({ error: `Invalid tone. Must be one of: ${validTones.join(', ')}` });
			return;
		}

		// Adjust tone via GPT
		const completion = await openai.chat.completions.create({
			model: GPT_CONTENT_MODEL,
			messages: [
				{
					role: 'system',
					content: `You are an expert at adjusting content tone while preserving meaning.
Rewrite the content in the target tone.
Return ONLY the rewritten content, no JSON, no markdown blocks.`
				},
				{
					role: 'user',
					content: `Rewrite this content in a ${targetTone} tone:

"${content}"`
				}
			],
			temperature: 0.6,
			max_tokens: Math.ceil(content.length / 4) + 100
		});

		const rewritten = completion.choices[0].message.content || '';

		// Spend credits using RPC (handles included + wallet automatically)
		const { data: spendResult, error: spendError } = await supabase.rpc('spend_credits', {
			p_org_id: organizationId,
			p_credits: CREDIT_COSTS.TONE_ADJUSTMENT,
			p_reference_type: 'content_generation',
			p_reference_id: null,
			p_description: `Tone adjustment to: ${targetTone}`
		});

		if (spendError || !spendResult?.ok) {
			res.status(402).json({
				error: 'Insufficient credits',
				required: CREDIT_COSTS.TONE_ADJUSTMENT,
				needs_topup: spendResult?.reason?.includes('insufficient') || false
			});
			return;
		}

		res.json({
			success: true,
			data: {
				originalTone: 'original',
				targetTone,
				rewritten,
				creditsUsed: CREDIT_COSTS.TONE_ADJUSTMENT
			}
		});
	} catch (error) {
		console.error('Error adjusting tone:', error);
		res.status(500).json({ error: 'Failed to adjust tone' });
	}
}
