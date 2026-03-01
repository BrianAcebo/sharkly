import fetch from 'node-fetch';

const SERPER_API_KEY = process.env.SERPER_API_KEY || '';

export type SerperResult = {
	organic?: Array<{ title: string; link: string; snippet?: string }>;
	relatedSearches?: Array<{ query: string }>;
	peopleAlsoAsk?: Array<{ question: string; snippet?: string }>;
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
		peopleAlsoAsk: data.peopleAlsoAsk || []
	};
}
