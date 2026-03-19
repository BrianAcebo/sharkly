/**
 * Updates internal_links.implemented based on crawl results.
 * When a site is crawled, we check if each suggested link (article → focus page, etc.)
 * actually exists in the live HTML. If the crawl finds the link, we set implemented = true.
 *
 * Used by: crawlerService after saveResults
 */

import { supabase } from '../utils/supabaseClient.js';
import { gscPageMatchesSharklyPage } from '../utils/gscUrlMatch.js';
import type { CrawlResult } from './crawlerService.js';

export async function updateInternalLinksFromCrawl(
	siteId: string,
	crawlResults: CrawlResult[],
	siteUrl: string
): Promise<void> {
	try {
		// Fetch pages for this site with published_url (so we can match crawl URL → page)
		const { data: pages, error: pagesErr } = await supabase
			.from('pages')
			.select('id, published_url')
			.eq('site_id', siteId)
			.not('published_url', 'is', null);

		if (pagesErr || !pages || pages.length === 0) return;

		// Fetch internal_links for clusters belonging to this site
		const { data: clusters } = await supabase
			.from('clusters')
			.select('id')
			.eq('site_id', siteId);

		if (!clusters?.length) return;

		const clusterIds = clusters.map((c) => c.id);
		const { data: links, error: linksErr } = await supabase
			.from('internal_links')
			.select('id, from_page_id, to_page_id')
			.in('cluster_id', clusterIds);

		if (linksErr || !links || links.length === 0) return;

		const pageById = new Map(pages.map((p) => [p.id, p]));

		// Build crawl result map: for each crawl URL, we have outboundInternalLinks
		const crawlByPageId = new Map<string, CrawlResult>();
		for (const page of pages) {
			const pubUrl = (page as { published_url?: string }).published_url;
			const crawlResult = crawlResults.find((r) =>
				gscPageMatchesSharklyPage(r.url, pubUrl ?? null, siteUrl)
			);
			if (crawlResult) crawlByPageId.set(page.id, crawlResult);
		}

		const toImplement: string[] = [];
		const toUnimplement: string[] = [];

		for (const link of links) {
			const fromPage = pageById.get(link.from_page_id);
			const toPage = pageById.get(link.to_page_id);
			if (!fromPage || !toPage) continue;

			const crawlResult = crawlByPageId.get(link.from_page_id);
			const toPubUrl = (toPage as { published_url?: string }).published_url ?? null;

			if (!crawlResult) continue; // From-page wasn't crawled — leave implemented as-is

			const linkFound = crawlResult.outboundInternalLinks.some((dest) =>
				gscPageMatchesSharklyPage(dest, toPubUrl, siteUrl)
			);

			if (linkFound) {
				toImplement.push(link.id);
			} else {
				toUnimplement.push(link.id);
			}
		}

		if (toImplement.length > 0) {
			await supabase
				.from('internal_links')
				.update({ implemented: true })
				.in('id', toImplement);
		}
		if (toUnimplement.length > 0) {
			await supabase
				.from('internal_links')
				.update({ implemented: false })
				.in('id', toUnimplement);
		}
	} catch (err) {
		console.warn('[Crawler] Internal link sync failed:', err);
	}
}
