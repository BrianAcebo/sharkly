import fetch from 'node-fetch';

const SERPER_API_KEY = process.env.SERPER_API_KEY || '';

export type SerperResult = {
	organic?: Array<{ title: string; link: string; snippet?: string }>;
	relatedSearches?: Array<{ query: string }>;
	peopleAlsoAsk?: Array<{ question: string; snippet?: string }>;
	searchInformation?: { totalResults?: string; timeTakenDisplayed?: number };
};

export async function serperSearch(query: string, num = 10): Promise<SerperResult> {
	if (!SERPER_API_KEY) return { organic: [], relatedSearches: [], peopleAlsoAsk: [] };
	const res = await fetch('https://google.serper.dev/search', {
		method: 'POST',
		headers: { 'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json' },
		body: JSON.stringify({ q: query, num })
	});
	if (!res.ok) {
		const text = await res.text();
		console.error('[Serper] Error:', res.status, text);
		return { organic: [], relatedSearches: [], peopleAlsoAsk: [] };
	}
	const data = (await res.json()) as SerperResult;
	return {
		organic: data.organic || [],
		relatedSearches: data.relatedSearches || [],
		peopleAlsoAsk: data.peopleAlsoAsk || [],
		searchInformation: data.searchInformation || {}
	};
}

/** Parse "About 1,230 results" → 1230 */
export function parseSearchResultCount(totalResults?: string): number {
	if (!totalResults) return 0;
	const match = /[\d,]+/.exec(totalResults);
	if (!match) return 0;
	return parseInt(match[0].replace(/,/g, ''), 10) || 0;
}
