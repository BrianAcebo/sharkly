/**
 * Lightweight competitor page fetch — extracts title, H2s, and word count.
 * Used during brief generation to populate the Competitors tab in Workspace.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (compatible; SharklyBot/1.0; +https://sharkly.co)';
const TIMEOUT_MS = 12_000;

export interface CompetitorPage {
	title: string | null;
	url: string;
	word_count: number;
	h2s: string[];
}

/**
 * Fetch a URL and extract title, H2 headings, and word count.
 * Returns null on fetch/parse error (timeout, non-200, invalid HTML).
 */
export async function fetchCompetitorPage(url: string): Promise<CompetitorPage | null> {
	try {
		const res = await axios.get(url, {
			timeout: TIMEOUT_MS,
			maxRedirects: 3,
			headers: { 'User-Agent': USER_AGENT },
			validateStatus: (s) => s < 500,
			responseType: 'text'
		});
		if (res.status >= 400 || !res.data) return null;

		const html = typeof res.data === 'string' ? res.data : String(res.data ?? '');
		const $ = cheerio.load(html);

		const title = $('title').first().text().trim() || null;
		const h2s: string[] = [];
		$('h2').each((_, el) => {
			const text = $(el).text().trim();
			if (text) h2s.push(text);
		});

		const bodyClone = $('body').clone();
		bodyClone.find('script, style, noscript, svg').remove();
		const textContent = bodyClone.text().replace(/\s+/g, ' ').trim();
		const wordCount = textContent.split(/\s+/).filter(Boolean).length;

		return { title, url, word_count: wordCount, h2s };
	} catch {
		return null;
	}
}

/**
 * Fetch up to `limit` competitor URLs in parallel. Returns only successful results.
 */
export async function fetchCompetitorPages(
	urls: string[],
	limit = 5
): Promise<CompetitorPage[]> {
	const toFetch = urls.slice(0, limit);
	const results = await Promise.allSettled(toFetch.map((u) => fetchCompetitorPage(u)));
	const out: CompetitorPage[] = [];
	for (const r of results) {
		if (r.status === 'fulfilled' && r.value) out.push(r.value);
	}
	return out;
}
