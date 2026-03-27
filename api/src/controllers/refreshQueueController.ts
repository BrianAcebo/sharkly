/**
 * S1-1. Content Refresh Queue — product-gaps-master.md V1.6
 *
 * Detect pages where last_updated_meaningful > 6 months AND GSC position/impressions trending down.
 * Prioritized by traffic impact.
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { captureApiError } from '../utils/sentryCapture.js';
import { findPageIdForGscUrl } from '../utils/gscUrlMatch.js';

export type RefreshQueueItem = {
	pageId: string;
	title: string;
	keyword: string;
	publishedUrl: string;
	impressions: number;
	position: number;
	positionTrend: 'declining' | 'stable' | 'improving';
	impressionsTrend: 'declining' | 'stable' | 'improving';
	monthsStale: number;
};

const STALE_MONTHS = 6;
const POSITION_DECLINE_THRESHOLD = 0.5;
const IMPRESSIONS_DECLINE_THRESHOLD = 0.05; // 5% drop

/**
 * GET /api/sites/:siteId/refresh-queue
 *
 * Returns published pages that are:
 * - Stale: last_updated_meaningful (or updated_at) > 6 months ago
 * - Declining: GSC position got worse or impressions dropped
 * Sorted by impressions (highest impact first).
 */
export const getRefreshQueue = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const siteId = req.params.siteId;
		if (!siteId) {
			res.status(400).json({ error: 'siteId required' });
			return;
		}

		// Verify org access
		const { data: site } = await supabase
			.from('sites')
			.select('id, url, organization_id')
			.eq('id', siteId)
			.single();

		if (!site) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg || userOrg.organization_id !== site.organization_id) {
			res.status(403).json({ error: 'Access denied' });
			return;
		}

		const siteUrl = (site as { url?: string }).url ?? null;

		// 1. Fetch published pages with staleness date
		const { data: pages } = await supabase
			.from('pages')
			.select('id, title, keyword, published_url, updated_at, last_updated_meaningful')
			.eq('site_id', siteId)
			.eq('status', 'published');

		if (!pages || pages.length === 0) {
			res.json({ items: [] });
			return;
		}

		// 2. Fetch performance_data for last 90 days (with date for trend)
		const endDate = new Date();
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - 90);
		const startStr = startDate.toISOString().split('T')[0];

		const { data: perfRows } = await supabase
			.from('performance_data')
			.select('page, date, impressions, position, clicks')
			.eq('site_id', siteId)
			.gte('date', startStr);

		if (!perfRows || perfRows.length === 0) {
			res.json({ items: [] });
			return;
		}

		// 3. Build GSC page -> Sharkly page mapping
		const pagesWithUrl = pages.map((p) => ({
			id: p.id,
			published_url: (p as { published_url?: string }).published_url ?? null
		}));

		// 4. Aggregate performance by page URL and time window
		const now = new Date();
		const recentEnd = new Date(now);
		recentEnd.setDate(recentEnd.getDate() - 0);
		const recentStart = new Date(now);
		recentStart.setDate(recentStart.getDate() - 30);
		const olderStart = new Date(now);
		olderStart.setDate(olderStart.getDate() - 60);

		const recentStr = recentStart.toISOString().split('T')[0];
		const olderStr = olderStart.toISOString().split('T')[0];

		type Window = { impressions: number; positionSum: number; positionCount: number };
		const recentByPage = new Map<string, Window>();
		const olderByPage = new Map<string, Window>();

		for (const r of perfRows as { page: string; date: string; impressions: number; position: number }[]) {
			const d = r.date;
			const page = r.page;
			if (d >= recentStr) {
				const w = recentByPage.get(page) ?? {
					impressions: 0,
					positionSum: 0,
					positionCount: 0
				};
				w.impressions += r.impressions;
				w.positionSum += r.position * (r.impressions || 1); // weight by impressions
				w.positionCount += r.impressions || 1;
				recentByPage.set(page, w);
			} else if (d >= olderStr && d < recentStr) {
				const w = olderByPage.get(page) ?? {
					impressions: 0,
					positionSum: 0,
					positionCount: 0
				};
				w.impressions += r.impressions;
				w.positionSum += r.position * (r.impressions || 1);
				w.positionCount += r.impressions || 1;
				olderByPage.set(page, w);
			}
		}

		// 5. For each Sharkly page, find matching GSC URL and check staleness + trend
		const sixMonthsAgo = new Date();
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - STALE_MONTHS);

		const items: RefreshQueueItem[] = [];

		for (const page of pages) {
			const updatedAt = (page as { last_updated_meaningful?: string; updated_at?: string })
				.last_updated_meaningful ??
				(page as { updated_at?: string }).updated_at;
			if (!updatedAt) continue;

			const updated = new Date(updatedAt);
			if (updated > sixMonthsAgo) continue;

			const monthsStale = Math.floor(
				(now.getTime() - updated.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
			);

			// Find GSC URL that matches this page
			const pubUrl = (page as { published_url?: string }).published_url ?? null;
			if (!pubUrl) continue;

			// We need to match: for each GSC URL, check if it matches this page
			let matchedGscUrl: string | null = null;
			for (const gscPage of recentByPage.keys()) {
				const pageId = findPageIdForGscUrl(gscPage, pagesWithUrl, siteUrl);
				if (pageId === page.id) {
					matchedGscUrl = gscPage;
					break;
				}
			}

			if (!matchedGscUrl) continue;

			const recent = recentByPage.get(matchedGscUrl);
			const older = olderByPage.get(matchedGscUrl);

			if (!recent || recent.impressions < 100) continue;
			if (!older || older.impressions < 50) continue;

			const recentPos = recent.positionCount > 0 ? recent.positionSum / recent.positionCount : 0;
			const olderPos = older.positionCount > 0 ? older.positionSum / older.positionCount : 0;
			const positionDeclining = recentPos - olderPos >= POSITION_DECLINE_THRESHOLD;
			const impressionsDeclining =
				(recent.impressions - older.impressions) / Math.max(older.impressions, 1) <=
				-IMPRESSIONS_DECLINE_THRESHOLD;

			if (!positionDeclining && !impressionsDeclining) continue;

			const positionTrend: RefreshQueueItem['positionTrend'] =
				recentPos - olderPos >= POSITION_DECLINE_THRESHOLD
					? 'declining'
					: olderPos - recentPos >= POSITION_DECLINE_THRESHOLD
						? 'improving'
						: 'stable';
			const impDiff = (recent.impressions - older.impressions) / Math.max(older.impressions, 1);
			const impressionsTrend: RefreshQueueItem['impressionsTrend'] =
				impDiff <= -IMPRESSIONS_DECLINE_THRESHOLD ? 'declining' : impDiff >= IMPRESSIONS_DECLINE_THRESHOLD ? 'improving' : 'stable';

			items.push({
				pageId: page.id,
				title: (page as { title: string }).title,
				keyword: (page as { keyword?: string }).keyword ?? '',
				publishedUrl: pubUrl,
				impressions: recent.impressions,
				position: Math.round(recentPos * 10) / 10,
				positionTrend,
				impressionsTrend,
				monthsStale
			});
		}

		items.sort((a, b) => b.impressions - a.impressions);

		res.json({ items });
	} catch (err) {
		console.error('[RefreshQueue] Error:', err);
		captureApiError(err, req, { feature: 'refresh-queue', siteId: req.params.siteId });
		res.status(500).json({ error: 'Internal server error' });
	}
};
