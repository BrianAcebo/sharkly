/**
 * DataForSEO Backlinks API — referring domains
 * Used for S1-7 Toxic Link Detection
 * Docs: https://docs.dataforseo.com/v3/backlinks-referring_domains-live/
 */

const BASE_URL = 'https://api.dataforseo.com';

function getAuth(): string | null {
	const login = process.env.DATAFORSEO_LOGIN;
	const password = process.env.DATAFORSEO_PASSWORD;
	if (!login || !password) return null;
	return Buffer.from(`${login}:${password}`).toString('base64');
}

export interface ReferringDomain {
	domain: string;
	rank: number;
	backlinks: number;
	backlinks_spam_score?: number;
	referring_pages: number;
	first_seen?: string;
}

export interface ReferringDomainsResult {
	domains: ReferringDomain[];
	total_count: number;
	configured: boolean;
	error?: string;
}

/**
 * Fetch referring domains for a target (domain or URL).
 * Uses DataForSEO backlinks/referring_domains/live.
 */
export async function getReferringDomains(
	target: string,
	opts: { limit?: number; rankScale?: 'one_hundred' | 'one_thousand' } = {}
): Promise<ReferringDomainsResult> {
	const auth = getAuth();
	if (!auth) {
		return { domains: [], total_count: 0, configured: false };
	}

	const { limit = 500, rankScale = 'one_hundred' } = opts;

	// Normalize target: strip protocol, www
	let domain = target.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
	if (!domain) {
		return { domains: [], total_count: 0, configured: true, error: 'Invalid target' };
	}

	try {
		const res = await fetch(`${BASE_URL}/v3/backlinks/referring_domains/live`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify([
				{
					target: domain,
					limit,
					rank_scale: rankScale,
					order_by: ['rank,asc'], // lowest authority first — most likely toxic
					exclude_internal_backlinks: true,
				},
			]),
		});

		if (!res.ok) {
			const errText = await res.text();
			console.error('[DataForSEO] referring_domains error', res.status, errText.slice(0, 300));
			return { domains: [], total_count: 0, configured: true, error: `API error ${res.status}` };
		}

		const data = (await res.json()) as {
			tasks?: Array<{
				status_code: number;
				result?: Array<{
					total_count: number;
					items?: Array<{
						domain?: string;
						rank?: number;
						backlinks?: number;
						backlinks_spam_score?: number;
						referring_pages?: number;
						first_seen?: string;
					}>;
				}>;
			}>;
		};

		const task = data.tasks?.[0];
		if (!task || task.status_code !== 20000) {
			console.warn('[DataForSEO] referring_domains task failed:', task?.status_code);
			return { domains: [], total_count: 0, configured: true };
		}

		const result = task.result?.[0];
		const items = result?.items ?? [];
		const total_count = result?.total_count ?? 0;

		const domains: ReferringDomain[] = items
			.filter((i) => i.domain)
			.map((i) => ({
				domain: i.domain!,
				rank: i.rank ?? 0,
				backlinks: i.backlinks ?? 0,
				backlinks_spam_score: i.backlinks_spam_score,
				referring_pages: i.referring_pages ?? 0,
				first_seen: i.first_seen,
			}));

		console.log(`[DataForSEO] referring_domains for ${domain}: ${domains.length} domains (total ${total_count})`);
		return { domains, total_count, configured: true };
	} catch (err) {
		console.error('[DataForSEO] referring_domains fetch error:', err);
		return {
			domains: [],
			total_count: 0,
			configured: true,
			error: err instanceof Error ? err.message : 'Unknown error',
		};
	}
}
