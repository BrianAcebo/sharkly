/**
 * Rankings Controller
 * Handles GSC ranking data and CTR optimization suggestions
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
import { OpenAI } from 'openai';

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY
});

/**
 * GET /api/rankings/:siteId
 * Get rankings for a site with optional date range and sorting
 */
export async function getRankings(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;
		const { days = 30, sortBy = 'impressions', order = 'desc' } = req.query;

		if (!siteId) {
			res.status(400).json({ error: 'Site ID required' });
			return;
		}

	// Calculate date range
	const endDate = new Date();
	const startDate = new Date(endDate.getTime() - parseInt(days as string) * 86400000);
	const startDateStr = startDate.toISOString().split('T')[0];
	const endDateStr = endDate.toISOString().split('T')[0];

	// Fetch all performance data for the site within date range
	const { data, error } = await supabase
		.from('performance_data')
		.select('query, page, clicks, impressions, ctr, position')
		.eq('site_id', siteId)
		.gte('date', startDateStr)
		.lte('date', endDateStr);

	if (error) throw error;

	// Aggregate data by keyword (query)
	const aggregated = new Map<
		string,
		{
			keyword: string;
			pageUrl: string;
			totalClicks: number;
			totalImpressions: number;
			avgCtr: number;
			avgPosition: number;
			dataPoints: number;
		}
	>();

	(data || []).forEach((row: any) => {
		const key = row.query;
		if (!aggregated.has(key)) {
			aggregated.set(key, {
				keyword: row.query,
				pageUrl: row.page,
				totalClicks: 0,
				totalImpressions: 0,
				avgCtr: 0,
				avgPosition: 0,
				dataPoints: 0
			});
		}
		const agg = aggregated.get(key)!;
		agg.totalClicks += row.clicks || 0;
		agg.totalImpressions += row.impressions || 0;
		agg.avgCtr += parseFloat(row.ctr) || 0;
		agg.avgPosition += parseFloat(row.position) || 0;
		agg.dataPoints += 1;
	});

	// Transform data for API response
	const rankings = Array.from(aggregated.values()).map((agg) => ({
		keyword: agg.keyword,
		pageUrl: agg.pageUrl,
		clicks: agg.totalClicks,
		impressions: agg.totalImpressions,
		ctr: agg.dataPoints > 0 ? agg.avgCtr / agg.dataPoints : 0,
		position: agg.dataPoints > 0 ? agg.avgPosition / agg.dataPoints : 0,
		change: 0, // TODO: calculate position change vs previous period
		momentum:
			agg.dataPoints > 0
				? agg.avgCtr / agg.dataPoints < 0.02
					? 'declining'
					: agg.avgCtr / agg.dataPoints > 0.04
						? 'building'
						: 'flat'
				: 'flat'
	}));

		// Sort by requested column
		const sortColumn = sortBy as string;
		rankings.sort((a: any, b: any) => {
			const aVal = a[sortColumn] || 0;
			const bVal = b[sortColumn] || 0;
			return order === 'desc' ? bVal - aVal : aVal - bVal;
		});

		res.json({
			success: true,
			data: rankings,
			count: rankings.length
		});
	} catch (error) {
		console.error('Error fetching rankings:', error);
		res.status(500).json({ error: 'Failed to fetch rankings' });
	}
}

/**
 * POST /api/rankings/:siteId/optimize-ctr
 * Get CTR optimization suggestions for low-performing pages (3 credits)
 */
export async function optimizeCTR(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;
		const { keyword, pageUrl, currentTitle, currentDescription } = req.body;

		if (!siteId || !keyword || !pageUrl) {
			res.status(400).json({ error: 'siteId, keyword, and pageUrl required' });
			return;
		}

		// Get SERP data for context
		const { data: serpData } = await supabase
			.from('performance_data')
			.select('*')
			.eq('site_id', siteId)
			.eq('keyword', keyword)
			.eq('page_url', pageUrl)
			.limit(10);

		// Generate meta suggestions via GPT
		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: `You are a CTR optimization expert. Generate 3 compelling meta title and description combinations that:
1. Include the target keyword naturally in the title
2. Are accurate to the page content (no clickbait that causes quick bounces)
3. Create urgency or curiosity
4. Follow character limits (title <60, description 150-160)
5. Are optimized for Google's display (no special characters that get replaced)

Return as JSON array with "titles" and "descriptions" arrays.`
				},
				{
					role: 'user',
					content: `Generate CTR optimization suggestions for:
Keyword: "${keyword}"
Current Title: "${currentTitle || 'Not set'}"
Current Description: "${currentDescription || 'Not set'}"
Recent CTR data: ${JSON.stringify(serpData?.slice(0, 5))}`
				}
			],
			temperature: 0.7,
			max_tokens: 500
		});

		const suggestions = JSON.parse(completion.choices[0].message.content || '{}');

		res.json({
			success: true,
			data: {
				keyword,
				pageUrl,
				suggestions: {
					titles: suggestions.titles || [],
					descriptions: suggestions.descriptions || []
				}
			}
		});
	} catch (error) {
		console.error('Error optimizing CTR:', error);
		res.status(500).json({ error: 'Failed to generate CTR suggestions' });
	}
}

/**
 * POST /api/rankings/:siteId/meta-suggestions
 * Generate meta title and description suggestions (3 credits)
 */
export async function generateMetaSuggestions(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;
		const { keyword, pageTitle, content } = req.body;

		if (!siteId || !keyword) {
			res.status(400).json({ error: 'siteId and keyword required' });
			return;
		}

		// Generate suggestions via GPT
		const completion = await openai.chat.completions.create({
			model: 'gpt-4o-mini',
			messages: [
				{
					role: 'system',
					content: `Generate 3 SEO-optimized meta title and description combinations.
Requirements:
- Title: <60 chars, keyword in first 30 chars
- Description: 150-160 chars
- Accurate to content (prevents bounces)
- Creates CTR compulsion without misleading

Return JSON: { "titles": [...], "descriptions": [...] }`
				},
				{
					role: 'user',
					content: `Keyword: "${keyword}"
Page title: "${pageTitle || 'Unknown'}"
Content preview: "${content ? content.slice(0, 300) : 'N/A'}"`
				}
			],
			temperature: 0.7,
			max_tokens: 500
		});

		const suggestions = JSON.parse(completion.choices[0].message.content || '{}');

		res.json({
			success: true,
			data: {
				keyword,
				suggestions: {
					titles: suggestions.titles || [],
					descriptions: suggestions.descriptions || []
				}
			}
		});
	} catch (error) {
		console.error('Error generating meta suggestions:', error);
		res.status(500).json({ error: 'Failed to generate meta suggestions' });
	}
}
