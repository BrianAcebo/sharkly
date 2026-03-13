/**
 * Rankings Controller
 * Handles GSC ranking data and CTR optimization suggestions
 *
 * Patent grounding:
 *   US8595225B1  — Navboost: topic-specific CTR behavioral ranking (DOJ confirmed 2023)
 *   US10055467B1 — Behavioral multiplier: repeat-click fraction over time
 *   Spec §17.2   — navboost_signals weekly time-series model + linear regression momentum
 *
 * Corrections vs previous version:
 *   1. Position change: was hardcoded to 0. Now compares current vs previous
 *      period avg position per keyword. Positive = moved up, negative = dropped.
 *   2. Navboost momentum: was static CTR threshold. Now linear regression slope
 *      over 13 weeks of weekly-aggregated CTR data per spec §17.2.
 *   3. navboost_signals: now populated with weekly rows (one per keyword per week)
 *      so the regression has real time-series data to work with.
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { OpenAI } from 'openai';
import { CREDIT_COSTS } from '../utils/credits.js';

const GPT_CONTENT_MODEL = process.env.GPT_CONTENT_MODEL || 'gpt-4o-mini';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function callClaude(system: string, user: string, maxTokens = 1000): Promise<string> {
	const res = await fetch('https://api.anthropic.com/v1/messages', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-api-key': ANTHROPIC_API_KEY,
			'anthropic-version': '2023-06-01'
		},
		body: JSON.stringify({
			model: 'claude-sonnet-4-5',
			max_tokens: maxTokens,
			system,
			messages: [{ role: 'user', content: user }]
		})
	});
	if (!res.ok) {
		const errBody = await res.text();
		throw new Error(`Claude API error ${res.status}: ${errBody}`);
	}
	const json = (await res.json()) as { content: Array<{ type: string; text: string }> };
	return json.content.find((b) => b.type === 'text')?.text ?? '';
}

async function checkAndDeductCredits(
	orgId: string,
	cost: number
): Promise<{ ok: boolean; error?: string; available?: number }> {
	const { data: org } = await supabase
		.from('organizations')
		.select('included_credits_remaining, included_credits')
		.eq('id', orgId)
		.single();

	const available = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
	if (available < cost) return { ok: false, error: 'Insufficient credits', available };

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

// ---------------------------------------------------------------------------
// Linear regression slope — Navboost momentum (US8595225B1 + spec §17.2)
//
// Takes weekly CTR values oldest-first and returns the slope of the best-fit
// line. Positive = CTR trending up (building). Negative = trending down
// (weakening). Near-zero = flat.
//
// Why regression instead of a threshold:
//   A static threshold cannot detect trend. A keyword dropping from 8% → 4%
//   CTR shows healthy absolute CTR but is in severe decline. Google's Navboost
//   measures the PATTERN of clicks over time — the trend is the signal.
// ---------------------------------------------------------------------------
function linearRegressionSlope(values: number[]): number {
	const n = values.length;
	if (n < 2) return 0;
	const xMean = (n - 1) / 2;
	const yMean = values.reduce((sum, v) => sum + v, 0) / n;
	let numerator = 0;
	let denominator = 0;
	for (let i = 0; i < n; i++) {
		numerator += (i - xMean) * (values[i] - yMean);
		denominator += (i - xMean) ** 2;
	}
	return denominator === 0 ? 0 : numerator / denominator;
}

type NavboostMomentum = 'building' | 'flat' | 'weakening';

// Threshold: ±0.002 per week (~0.2 percentage point movement).
// Chosen over ±0.001 to avoid flagging normal week-to-week noise as a trend.
// IMPORTANT: useNavboostSignals.ts (frontend) must use the same ±0.002 — keep in sync.
function classifyMomentum(slope: number): NavboostMomentum {
	if (slope > 0.002) return 'building';
	if (slope < -0.002) return 'weakening';
	return 'flat';
}

// ---------------------------------------------------------------------------
// Get ISO week Monday date — canonical week_start key
// ---------------------------------------------------------------------------
function getWeekStart(dateStr: string): string {
	const date = new Date(dateStr);
	const day = date.getDay();
	const mondayOffset = day === 0 ? -6 : 1 - day;
	const monday = new Date(date);
	monday.setDate(date.getDate() + mondayOffset);
	return monday.toISOString().split('T')[0];
}

// ---------------------------------------------------------------------------
// populateNavboostSignals — spec §17.2 weekly time-series model
//
// Groups performance_data rows by keyword + ISO week, calculates weekly avg
// CTR, and upserts into navboost_signals. One row per keyword per week.
// This is the data store the momentum regression reads from.
//
// Called fire-and-forget from getRankings — non-blocking.
//
// Requires this table structure (run migration SQL before deploying):
//   ALTER TABLE navboost_signals ADD COLUMN IF NOT EXISTS week_start date;
//   ALTER TABLE navboost_signals ADD COLUMN IF NOT EXISTS avg_ctr numeric;
//   ALTER TABLE navboost_signals ADD COLUMN IF NOT EXISTS data_points integer DEFAULT 1;
//   ALTER TABLE navboost_signals
//     ADD CONSTRAINT IF NOT EXISTS navboost_signals_site_query_page_week_key
//     UNIQUE (site_id, query, page, week_start);
// ---------------------------------------------------------------------------
async function populateNavboostSignals(
	siteId: string,
	data: Array<{
		query: string;
		page: string;
		ctr: number;
		clicks: number;
		impressions: number;
		date: string;
	}>
): Promise<void> {
	try {
		// Group by keyword + ISO week
		const weeklyMap = new Map<
			string,
			{
				query: string;
				page: string;
				weekStart: string;
				ctrs: number[];
				totalClicks: number;
				totalImpressions: number;
			}
		>();

		for (const row of data) {
			const weekStart = getWeekStart(row.date);
			const key = `${row.query}::${weekStart}`;

			if (!weeklyMap.has(key)) {
				weeklyMap.set(key, {
					query: row.query,
					page: row.page,
					weekStart,
					ctrs: [],
					totalClicks: 0,
					totalImpressions: 0
				});
			}
			const entry = weeklyMap.get(key)!;
			entry.ctrs.push(parseFloat(String(row.ctr)) || 0);
			entry.totalClicks += row.clicks || 0;
			entry.totalImpressions += row.impressions || 0;
		}

		const upsertRows = Array.from(weeklyMap.values()).map((entry) => ({
			site_id: siteId,
			query: entry.query,
			page: entry.page,
			week_start: entry.weekStart,
			avg_ctr:
				Math.round((entry.ctrs.reduce((s, v) => s + v, 0) / entry.ctrs.length) * 10000) / 10000,
			data_points: entry.ctrs.length,
			last_7days_clicks: entry.totalClicks,
			last_7days_impressions: entry.totalImpressions,
			updated_at: new Date().toISOString()
		}));

		if (upsertRows.length === 0) return;

		// Upsert in batches of 200
		const BATCH = 200;
		for (let i = 0; i < upsertRows.length; i += BATCH) {
			await supabase.from('navboost_signals').upsert(upsertRows.slice(i, i + BATCH), {
				onConflict: 'site_id,query,page,week_start'
			});
		}
	} catch (err) {
		console.error(
			'[Rankings] populateNavboostSignals error:',
			err instanceof Error ? err.message : err
		);
	}
}

// ---------------------------------------------------------------------------
// loadNavboostHistory — reads last 13 weeks of weekly CTR per keyword
// Returns Map<keyword, number[]> with values oldest-first for regression
// 13-week window per 2024 Google API leak (13-month window, weekly granularity)
// ---------------------------------------------------------------------------
async function loadNavboostHistory(
	siteId: string,
	keywords: string[]
): Promise<Map<string, number[]>> {
	const result = new Map<string, number[]>();
	if (keywords.length === 0) return result;

	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - 91); // 13 weeks
	const cutoffStr = cutoff.toISOString().split('T')[0];

	const { data, error } = await supabase
		.from('navboost_signals')
		.select('query, week_start, avg_ctr')
		.eq('site_id', siteId)
		.in('query', keywords)
		.gte('week_start', cutoffStr)
		.order('week_start', { ascending: true });

	if (error || !data) return result;

	for (const row of data) {
		if (!result.has(row.query)) result.set(row.query, []);
		result.get(row.query)!.push(row.avg_ctr);
	}

	return result;
}

// ---------------------------------------------------------------------------
// GET /api/rankings/:siteId
// Returns rankings with real position change delta and Navboost momentum
// ---------------------------------------------------------------------------
export async function getRankings(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;
		const { days = 30, sortBy = 'impressions', order = 'desc' } = req.query;

		if (!siteId) {
			res.status(400).json({ error: 'Site ID required' });
			return;
		}

		const periodDays = parseInt(days as string, 10) || 30;

		// Current period
		const endDate = new Date();
		const startDate = new Date(endDate.getTime() - periodDays * 86400000);
		const startDateStr = startDate.toISOString().split('T')[0];
		const endDateStr = endDate.toISOString().split('T')[0];

		// Previous period — same length, immediately before current
		const prevEndDate = new Date(startDate.getTime() - 86400000);
		const prevStartDate = new Date(prevEndDate.getTime() - periodDays * 86400000);
		const prevStartDateStr = prevStartDate.toISOString().split('T')[0];
		const prevEndDateStr = prevEndDate.toISOString().split('T')[0];

		// Fetch current period
		const { data: currentData, error: currentError } = await supabase
			.from('performance_data')
			.select('query, page, clicks, impressions, ctr, position, date')
			.eq('site_id', siteId)
			.gte('date', startDateStr)
			.lte('date', endDateStr);

		if (currentError) throw currentError;

		// Fetch previous period for position change delta
		const { data: prevData } = await supabase
			.from('performance_data')
			.select('query, position')
			.eq('site_id', siteId)
			.gte('date', prevStartDateStr)
			.lte('date', prevEndDateStr);

		// Populate weekly Navboost signals — fire-and-forget
		if (currentData && currentData.length > 0) {
			populateNavboostSignals(
				siteId,
				currentData as Array<{
					query: string;
					page: string;
					ctr: number;
					clicks: number;
					impressions: number;
					date: string;
				}>
			);
		}

		// ── Aggregate current period by keyword ──────────────────────────────
		const currentAgg = new Map<
			string,
			{
				keyword: string;
				pageUrl: string;
				totalClicks: number;
				totalImpressions: number;
				ctrSum: number;
				positionSum: number;
				dataPoints: number;
			}
		>();

		for (const row of currentData ?? []) {
			const key = row.query;
			if (!currentAgg.has(key)) {
				currentAgg.set(key, {
					keyword: row.query,
					pageUrl: row.page,
					totalClicks: 0,
					totalImpressions: 0,
					ctrSum: 0,
					positionSum: 0,
					dataPoints: 0
				});
			}
			const agg = currentAgg.get(key)!;
			agg.totalClicks += row.clicks || 0;
			agg.totalImpressions += row.impressions || 0;
			agg.ctrSum += parseFloat(row.ctr) || 0;
			agg.positionSum += parseFloat(row.position) || 0;
			agg.dataPoints += 1;
		}

		// ── Aggregate previous period by keyword ─────────────────────────────
		const prevAgg = new Map<string, { positionSum: number; dataPoints: number }>();

		for (const row of prevData ?? []) {
			const key = row.query;
			if (!prevAgg.has(key)) prevAgg.set(key, { positionSum: 0, dataPoints: 0 });
			const agg = prevAgg.get(key)!;
			agg.positionSum += parseFloat(row.position) || 0;
			agg.dataPoints += 1;
		}

		// ── Load 13-week Navboost CTR history for regression ─────────────────
		const keywords = Array.from(currentAgg.keys());
		const navboostHistory = await loadNavboostHistory(siteId, keywords);

		// ── Build final rankings array ────────────────────────────────────────
		const rankings = Array.from(currentAgg.values()).map((agg) => {
			const avgPosition = agg.dataPoints > 0 ? agg.positionSum / agg.dataPoints : 0;
			const avgCtr = agg.dataPoints > 0 ? agg.ctrSum / agg.dataPoints : 0;

			// Position change: positive = moved up, negative = dropped
			// Lower position number = better. change = prevPos - currentPos
			let change = 0;
			const prev = prevAgg.get(agg.keyword);
			if (prev && prev.dataPoints > 0) {
				const prevAvgPos = prev.positionSum / prev.dataPoints;
				change = Math.round((prevAvgPos - avgPosition) * 10) / 10;
			}

			// Navboost momentum: linear regression over 13-week CTR history
			// Falls back to current avg as single point if no history yet
			const weeklyCtr = navboostHistory.get(agg.keyword) ?? [avgCtr];
			const slope = linearRegressionSlope(weeklyCtr);
			const momentum: NavboostMomentum = classifyMomentum(slope);

			return {
				keyword: agg.keyword,
				pageUrl: agg.pageUrl,
				clicks: agg.totalClicks,
				impressions: agg.totalImpressions,
				ctr: avgCtr,
				position: avgPosition,
				change,
				momentum,
				momentumSlope: weeklyCtr.length >= 2 ? Math.round(slope * 10000) / 10000 : null,
				weeksOfData: weeklyCtr.length
			};
		});

		// Sort
		const sortColumn = sortBy as string;
		rankings.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
			const aVal = (a[sortColumn] as number) || 0;
			const bVal = (b[sortColumn] as number) || 0;
			return order === 'desc' ? bVal - aVal : aVal - bVal;
		});

		res.json({ success: true, data: rankings, count: rankings.length });
	} catch (error) {
		console.error('Error fetching rankings:', error);
		res.status(500).json({ error: 'Failed to fetch rankings' });
	}
}

// ---------------------------------------------------------------------------
// POST /api/rankings/:siteId/optimize-ctr
// CTR optimization suggestions (3 credits)
// ---------------------------------------------------------------------------
export async function optimizeCTR(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;
		const { keyword, pageUrl, currentTitle, currentDescription } = req.body;

		if (!siteId || !keyword || !pageUrl) {
			res.status(400).json({ error: 'siteId, keyword, and pageUrl required' });
			return;
		}

		const { data: site } = await supabase
			.from('sites')
			.select('organization_id')
			.eq('id', siteId)
			.single();
		if (!site?.organization_id) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		const creditCheck = await checkAndDeductCredits(
			site.organization_id,
			CREDIT_COSTS.CTR_OPTIMIZE
		);
		if (!creditCheck.ok) {
			res.status(402).json({
				error: creditCheck.error,
				required: CREDIT_COSTS.CTR_OPTIMIZE,
				available: creditCheck.available
			});
			return;
		}

		const { data: serpData } = await supabase
			.from('performance_data')
			.select('*')
			.eq('site_id', siteId)
			.eq('keyword', keyword)
			.eq('page_url', pageUrl)
			.limit(10);

		const completion = await openai.chat.completions.create({
			model: GPT_CONTENT_MODEL,
			messages: [
				{
					role: 'system',
					content: `You are a CTR optimization expert. Generate 3 compelling meta title and description combinations that:
1. Include the target keyword naturally in the title
2. Are accurate to the page content (no clickbait that causes quick bounces)
3. Create urgency or curiosity
4. Follow character limits (title ≤60 characters, description 150–155 characters)
5. Are optimized for Google's display (no special characters that get replaced)

Return as JSON with "titles" and "descriptions" arrays.`
				},
				{
					role: 'user',
					content: `Keyword: "${keyword}"
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

// ---------------------------------------------------------------------------
// POST /api/rankings/:siteId/meta-suggestions
// Meta title + description suggestions (3 credits)
// ---------------------------------------------------------------------------
export async function generateMetaSuggestions(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.params;
		const { keyword, pageTitle, content } = req.body;

		if (!siteId || !keyword) {
			res.status(400).json({ error: 'siteId and keyword required' });
			return;
		}

		const { data: site } = await supabase
			.from('sites')
			.select('organization_id')
			.eq('id', siteId)
			.single();
		if (!site?.organization_id) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		const creditCheck = await checkAndDeductCredits(
			site.organization_id,
			CREDIT_COSTS.META_GENERATION
		);
		if (!creditCheck.ok) {
			res.status(402).json({
				error: creditCheck.error,
				required: CREDIT_COSTS.META_GENERATION,
				available: creditCheck.available
			});
			return;
		}

		const rawSuggestions = await callClaude(
			`You are an expert SEO copywriter. Generate 3 distinct meta title and description combinations.

TITLES:
- Strictly ≤60 characters
- Primary keyword in the first 30 characters
- Accurate — titles that cause bounces hurt Navboost [US8595225B1]
- Each title uses a different angle (benefit-led, question, list)

DESCRIPTIONS:
- Strictly 150–160 characters
- Must include: primary keyword + value proposition + CTA
- Accurate to the page — no clickbait
- Each matches its corresponding title angle

Return ONLY valid JSON, no markdown fences:
{ "titles": ["...", "...", "..."], "descriptions": ["...", "...", "..."] }`,
			`Primary keyword: "${keyword}"
Page title: "${pageTitle || 'Unknown'}"
Content preview: "${content ? String(content).slice(0, 400) : 'N/A'}"`
		);

		const suggestions = JSON.parse(
			rawSuggestions
				.replace(/```json\s*/gi, '')
				.replace(/```\s*/g, '')
				.trim()
		);

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
