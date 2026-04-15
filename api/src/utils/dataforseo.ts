/**
 * DataForSEO API utility
 *
 * Used for REAL keyword research data — search volume, keyword difficulty,
 * CPC. These replace Claude-estimated numbers with actual market data.
 *
 * Relevant endpoints:
 *   POST /v3/dataforseo_labs/google/keyword_suggestions/live
 *     → Given a seed keyword, returns hundreds of related keywords each with
 *       real volume, KD (0-100), and CPC from the DataForSEO database.
 *       This is the equivalent of SEMrush's Keyword Magic Tool.
 *
 *   POST /v3/dataforseo_labs/google/bulk_keyword_difficulty/live
 *     → Given a list of up to 1000 keywords, returns KD for each.
 *
 * Auth: HTTP Basic — base64(login:password)
 * Docs: https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live/
 *
 * Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in .env
 */

const BASE_URL = 'https://api.dataforseo.com';

function getAuth(): string | null {
	const login = process.env.DATAFORSEO_LOGIN;
	const password = process.env.DATAFORSEO_PASSWORD;
	if (!login || !password) return null;
	return Buffer.from(`${login}:${password}`).toString('base64');
}

export interface DfsKeyword {
	keyword: string;
	monthly_searches: number;   // real search volume
	keyword_difficulty: number; // KD 0-100
	cpc: number;                // avg CPC in USD
	competition: number;        // 0-1 paid competition
}

export interface DfsKeywordSuggestionsResult {
	seed: string;
	keywords: DfsKeyword[];
	configured: boolean; // false if DATAFORSEO creds not set
}

/**
 * Fetch keyword suggestions for a seed term.
 * Returns up to `limit` related keywords with real volume/KD/CPC.
 * Falls back to empty array if DataForSEO is not configured.
 */
export async function getKeywordSuggestions(
	seed: string,
	opts: {
		locationCode?: number;  // default 2840 = United States
		languageCode?: string;  // default 'en'
		limit?: number;         // default 50 — balances keyword coverage vs. cost ($0.0001/item)
	} = {}
): Promise<DfsKeywordSuggestionsResult> {
	const auth = getAuth();
	if (!auth) {
		return { seed, keywords: [], configured: false };
	}

	const { locationCode = 2840, languageCode = 'en', limit = 50 } = opts;

	try {
		const res = await fetch(`${BASE_URL}/v3/dataforseo_labs/google/keyword_suggestions/live`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify([
				{
					keyword: seed,
					location_code: locationCode,
					language_code: languageCode,
					limit,
					include_seed_keyword: true,
					order_by: ['keyword_info.search_volume,desc'],
				},
			]),
		});

		if (!res.ok) {
			const errText = await res.text();
			console.error(`[DataForSEO] keyword_suggestions error ${res.status}:`, errText.slice(0, 300));
			return { seed, keywords: [], configured: true };
		}

		const data = (await res.json()) as {
			tasks?: Array<{
				status_code: number;
				result?: Array<{
					items?: Array<{
						keyword: string;
						keyword_info?: {
							search_volume?: number | null;
							cpc?: number | null;
							competition?: number | null;
						};
						keyword_properties?: {
							keyword_difficulty?: number | null;
						};
					}>;
				}>;
			}>;
		};

		const task = data.tasks?.[0];
		if (!task || task.status_code !== 20000) {
			console.warn('[DataForSEO] Task failed:', task?.status_code);
			return { seed, keywords: [], configured: true };
		}

		const items = task.result?.[0]?.items ?? [];
		const keywords: DfsKeyword[] = items
			.filter((item) => item.keyword)
			.map((item) => ({
				keyword: item.keyword,
				monthly_searches: Math.round(item.keyword_info?.search_volume ?? 0),
				keyword_difficulty: Math.round(item.keyword_properties?.keyword_difficulty ?? 50),
				cpc: Math.round((item.keyword_info?.cpc ?? 0) * 100) / 100,
				competition: Math.round((item.keyword_info?.competition ?? 0) * 100) / 100,
			}))
			.filter((k) => k.monthly_searches > 0);

	console.log(
		`[DataForSEO] "${seed}" → ${keywords.length} keywords | top-5: ${keywords.slice(0, 5).map((k) => `"${k.keyword}" vol=${k.monthly_searches} KD=${k.keyword_difficulty} cpc=$${k.cpc}`).join(' | ')}`
	);
	return { seed, keywords, configured: true };

	} catch (err) {
		console.error('[DataForSEO] fetch error:', err instanceof Error ? err.message : err);
		return { seed, keywords: [], configured: true };
	}
}

/**
 * Aggregate real keyword data for a topic cluster.
 * Given a list of keywords that belong to a topic, compute:
 *   - total_volume   (sum of all keyword monthly searches)
 *   - avg_kd         (median KD to avoid outlier skew)
 *   - avg_cpc        (weighted average by volume)
 *   - keyword_count  (number of keywords found)
 */
export function aggregateTopicMetrics(keywords: DfsKeyword[]): {
	keyword_count: number;
	monthly_searches: number;
	keyword_difficulty: number;
	cpc: number;
} {
	if (keywords.length === 0) {
		return { keyword_count: 0, monthly_searches: 0, keyword_difficulty: 50, cpc: 0 };
	}

	const totalVolume = keywords.reduce((s, k) => s + k.monthly_searches, 0);

	// Median KD (more robust than mean against outliers)
	const sortedKD = [...keywords].sort((a, b) => a.keyword_difficulty - b.keyword_difficulty);
	const mid = Math.floor(sortedKD.length / 2);
	const medianKD = sortedKD.length % 2 === 0
		? (sortedKD[mid - 1].keyword_difficulty + sortedKD[mid].keyword_difficulty) / 2
		: sortedKD[mid].keyword_difficulty;

	// Volume-weighted CPC
	const weightedCPC = totalVolume > 0
		? keywords.reduce((s, k) => s + k.cpc * k.monthly_searches, 0) / totalVolume
		: keywords.reduce((s, k) => s + k.cpc, 0) / keywords.length;

	return {
		keyword_count: keywords.length,
		monthly_searches: totalVolume,
		keyword_difficulty: Math.round(medianKD),
		cpc: Math.round(weightedCPC * 100) / 100,
	};
}

/**
 * Fetch real metrics for a single exact keyword.
 * Uses include_seed_keyword=true so the exact term is always returned.
 * Cost: $0.01 task + $0.0001 × 1 item ≈ $0.0101 per call.
 */
export async function getKeywordMetrics(keyword: string): Promise<{
	monthly_searches: number | null;
	keyword_difficulty: number | null;
	cpc: number | null;
	configured: boolean;
}> {
	const auth = getAuth();
	if (!auth) return { monthly_searches: null, keyword_difficulty: null, cpc: null, configured: false };

	try {
		const res = await fetch(`${BASE_URL}/v3/dataforseo_labs/google/keyword_suggestions/live`, {
			method: 'POST',
			headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
			body: JSON.stringify([{
				keyword,
				location_code: 2840,
				language_code: 'en',
				limit: 1,
				include_seed_keyword: true,
			}]),
		});

		if (!res.ok) return { monthly_searches: null, keyword_difficulty: null, cpc: null, configured: true };

		const data = (await res.json()) as {
			tasks?: Array<{
				result?: Array<{
					items?: Array<{
						keyword: string;
						keyword_info?: { search_volume?: number | null; cpc?: number | null };
						keyword_properties?: { keyword_difficulty?: number | null };
					}>;
				}>;
			}>;
		};

		const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
		// Find exact match first, then fall back to first result
		const match = items.find(i => i.keyword.toLowerCase() === keyword.toLowerCase()) ?? items[0];
		if (!match) return { monthly_searches: null, keyword_difficulty: null, cpc: null, configured: true };

		return {
			monthly_searches: match.keyword_info?.search_volume ?? null,
			keyword_difficulty: match.keyword_properties?.keyword_difficulty ?? null,
			cpc: match.keyword_info?.cpc ?? null,
			configured: true,
		};
	} catch {
		return { monthly_searches: null, keyword_difficulty: null, cpc: null, configured: true };
	}
}

/** Labels from DataForSEO Labs search_intent — https://docs.dataforseo.com/v3/dataforseo_labs/google/search_intent/live/ */
export type DfsSearchIntentLabel =
	| 'informational'
	| 'navigational'
	| 'commercial'
	| 'transactional';

export type DfsSearchIntentItem = {
	keyword: string;
	label: DfsSearchIntentLabel;
	probability: number;
};

/**
 * Google search intent (ML on keyword + SERP signals), up to 1000 keywords per request.
 * Cost: see DataForSEO pricing for search_intent/live.
 */
export async function getKeywordSearchIntents(
	keywords: string[]
): Promise<{ items: DfsSearchIntentItem[]; configured: boolean; error?: string }> {
	const auth = getAuth();
	if (!auth) return { items: [], configured: false };

	const cleaned = [...new Set(keywords.map((k) => k.trim()).filter((k) => k.length >= 3))].slice(0, 100);
	if (cleaned.length === 0) return { items: [], configured: true };

	try {
		const res = await fetch(`${BASE_URL}/v3/dataforseo_labs/google/search_intent/live`, {
			method: 'POST',
			headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
			body: JSON.stringify([
				{
					language_code: 'en',
					keywords: cleaned
				}
			])
		});

		if (!res.ok) {
			return { items: [], configured: true, error: `HTTP ${res.status}` };
		}

		const data = (await res.json()) as {
			tasks?: Array<{
				status_code?: number;
				result?: Array<{
					items?: Array<{
						keyword: string;
						keyword_intent?: { label?: string; probability?: number };
					}>;
				}>;
			}>;
		};

		const task = data.tasks?.[0];
		if (task?.status_code != null && task.status_code !== 20000) {
			return { items: [], configured: true, error: 'Task failed' };
		}

		const rawItems = task?.result?.[0]?.items ?? [];
		const items: DfsSearchIntentItem[] = [];
		for (const row of rawItems) {
			const label = row.keyword_intent?.label as DfsSearchIntentLabel | undefined;
			const prob = row.keyword_intent?.probability ?? 0;
			if (!label || !row.keyword) continue;
			items.push({
				keyword: row.keyword,
				label,
				probability: typeof prob === 'number' ? prob : 0
			});
		}

		return { items, configured: true };
	} catch (err) {
		return {
			items: [],
			configured: true,
			error: err instanceof Error ? err.message : 'Request failed'
		};
	}
}
