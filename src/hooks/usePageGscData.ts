/**
 * usePageGscData — L10: Page-level GSC attribution in workspace
 *
 * Fetches impressions, clicks, CTR, and avg position for a specific page
 * by matching performance_data.page against the page's published URL.
 * GSC can store URLs as full URLs or paths — we try multiple match variants.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export interface PageGscMetrics {
	impressions: number;
	clicks: number;
	ctr: number;
	position: number;
}

interface UsePageGscDataOptions {
	siteId?: string;
	/** Page URL: published_url (full or path) or constructed from siteUrl + slug */
	pageUrl?: string | null;
	siteUrl?: string | null;
	/** Slug only — used to construct URL when pageUrl not available */
	slug?: string | null;
	days?: number;
	enabled?: boolean;
}

interface UsePageGscDataResult {
	metrics: PageGscMetrics | null;
	loading: boolean;
	error: string | null;
	refetch: () => Promise<void>;
}

/** Normalize URL to path for comparison (strip protocol, domain, trailing slash) */
function toComparePath(url: string): string {
	if (!url || typeof url !== 'string') return '';
	const lower = url.trim().toLowerCase();
	// Remove protocol and domain
	const withoutProtocol = lower.replace(/^https?:\/\//, '');
	const pathOnly = withoutProtocol.replace(/^[^/]+/, '') || withoutProtocol;
	// Normalize: remove leading/trailing slashes, collapse
	const normalized = pathOnly.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
	return normalized || pathOnly;
}

/** Check if a performance_data.page matches our page (flexible URL matching) */
function pageMatches(gscPage: string, pageUrl: string | null, siteUrl: string | null, slug: string | null): boolean {
	if (!gscPage) return false;

	const gscPath = toComparePath(gscPage);

	// Try exact match first
	if (pageUrl && (gscPage === pageUrl || toComparePath(pageUrl) === gscPath)) return true;

	// Try constructed URL from site + slug
	if (siteUrl && slug) {
		const base = siteUrl.replace(/\/$/, '');
		const built = slug.startsWith('/') ? `${base}${slug}` : `${base}/${slug}`;
		if (gscPage === built || toComparePath(built) === gscPath) return true;
	}

	// Try path-only match (slug vs GSC path)
	if (slug) {
		const slugNorm = slug.replace(/^\/+|\/+$/g, '');
		if (gscPath === slugNorm || gscPath.endsWith('/' + slugNorm) || gscPath === '/' + slugNorm) return true;
	}

	// GSC page might be full URL — check if it ends with our path
	if (pageUrl) {
		const ourPath = toComparePath(pageUrl);
		if (ourPath && (gscPath === ourPath || gscPath.endsWith('/' + ourPath))) return true;
	}

	return false;
}

export function usePageGscData({
	siteId,
	pageUrl,
	siteUrl,
	slug,
	days = 28,
	enabled = true
}: UsePageGscDataOptions = {}): UsePageGscDataResult {
	const [metrics, setMetrics] = useState<PageGscMetrics | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchData = useCallback(async () => {
		if (!enabled || !siteId) {
			setMetrics(null);
			return;
		}

		// Need at least one way to identify the page
		if (!pageUrl && !slug) {
			setMetrics(null);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const startDate = new Date();
			startDate.setDate(startDate.getDate() - days);
			const startDateStr = startDate.toISOString().split('T')[0];

			const { data, error: fetchError } = await supabase
				.from('performance_data')
				.select('page, clicks, impressions, ctr, position')
				.eq('site_id', siteId)
				.gte('date', startDateStr);

			if (fetchError) throw fetchError;

			const rows = (data ?? []).filter((r) =>
				pageMatches(r.page, pageUrl ?? null, siteUrl ?? null, slug ?? null)
			);

			if (rows.length === 0) {
				setMetrics(null);
				return;
			}

			const totalClicks = rows.reduce((s, r) => s + (r.clicks ?? 0), 0);
			const totalImpressions = rows.reduce((s, r) => s + (r.impressions ?? 0), 0);
			const totalCtr = rows.reduce((s, r) => s + (parseFloat(String(r.ctr)) || 0), 0);
			const totalPosition = rows.reduce((s, r) => s + (parseFloat(String(r.position)) || 0), 0);

			setMetrics({
				impressions: totalImpressions,
				clicks: totalClicks,
				ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
				position: rows.length > 0 ? totalPosition / rows.length : 0
			});
		} catch (err) {
			console.error('[usePageGscData] Error:', err);
			setError(err instanceof Error ? err.message : 'Failed to load page performance');
			setMetrics(null);
		} finally {
			setLoading(false);
		}
	}, [siteId, pageUrl, siteUrl, slug, days, enabled]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return {
		metrics,
		loading,
		error,
		refetch: fetchData
	};
}
