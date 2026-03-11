/**
 * GSC (Google Search Console) Service
 * Handles syncing performance data from Google Search Console API
 */

import { supabase } from '../utils/supabaseClient.js';
import { encrypt, decrypt } from '../utils/encryption.js';

interface GSCRow {
	keys: [string, string, string]; // [query, page, date]
	clicks: number;
	impressions: number;
	ctr: number;
	position: number;
}

interface PerformanceRow {
	site_id: string;
	gsc_property_url: string;
	date: string;
	query: string;
	page: string;
	clicks: number;
	impressions: number;
	ctr: number;
	position: number;
}

/**
 * One row in navboost_signals — weekly aggregated CTR per query+page pair.
 * Used by rankingsController to calculate Navboost momentum via linear regression.
 * US8595225B1: topic-specific behavioral ranking signal, 13-month rolling window.
 */
interface NavboostSignalRow {
	site_id: string;
	query: string;
	page: string;
	week_start: string; // ISO date of Monday that starts this week
	total_clicks: number;
	total_impressions: number;
	avg_ctr: number; // clicks / impressions for the week
	avg_position: number;
}

export class GSCService {
	private googleClientId: string;
	private googleClientSecret: string;
	private encryptionKey: string;

	constructor() {
		this.googleClientId = process.env.GOOGLE_CLIENT_ID || '';
		this.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
		this.encryptionKey = process.env.ENCRYPTION_KEY || '';

		if (!this.googleClientId || !this.googleClientSecret || !this.encryptionKey) {
			throw new Error('Missing required GSC environment variables');
		}
	}

	/**
	 * Sync GSC performance data for all connected sites
	 * Pulls 28 days of Search Analytics data and stores in performance_data table,
	 * then aggregates into navboost_signals for Navboost momentum scoring.
	 */
	async syncAllPerformanceData(): Promise<{
		synced: number;
		rows_inserted: number;
		navboost_rows_upserted: number;
		error?: string;
	}> {
		try {
			const { data: tokenRows, error: fetchError } = await supabase.from('gsc_tokens').select('*');

			if (fetchError) throw fetchError;

			let totalSynced = 0;
			let totalRows = 0;
			let totalNavboostRows = 0;

			for (const token of tokenRows ?? []) {
				try {
					const syncResult = await this.syncSitePerformanceData(token);
					totalSynced++;
					totalRows += syncResult.rowsInserted;

					// After each site sync, aggregate into navboost_signals
					const navboostResult = await this.aggregateNavboostSignals(token.site_id);
					totalNavboostRows += navboostResult.rowsUpserted;
				} catch (error) {
					console.error(`Sync error for site ${token.site_id}:`, error);
					// Continue with next site on error
				}
			}

			return {
				synced: totalSynced,
				rows_inserted: totalRows,
				navboost_rows_upserted: totalNavboostRows
			};
		} catch (error) {
			console.error('GSC sync error:', error);
			return {
				synced: 0,
				rows_inserted: 0,
				navboost_rows_upserted: 0,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Sync GSC performance data for a specific site
	 */
	async syncSitePerformanceData(token: {
		site_id: string;
		encrypted_refresh_token: string;
		gsc_property_url: string;
		id: string;
	}): Promise<{ rowsInserted: number }> {
		try {
			const refreshToken = decrypt(token.encrypted_refresh_token, this.encryptionKey);
			const accessToken = await this.refreshAccessToken(refreshToken);
			const gscData = await this.fetchSearchAnalyticsData(accessToken, token.gsc_property_url);

			const rows: PerformanceRow[] = (gscData.rows ?? []).map((r: GSCRow) => ({
				site_id: token.site_id,
				gsc_property_url: token.gsc_property_url,
				date: r.keys[2],
				query: r.keys[0],
				page: r.keys[1],
				clicks: r.clicks,
				impressions: r.impressions,
				ctr: r.ctr,
				position: r.position
			}));

			if (rows.length === 0) {
				return { rowsInserted: 0 };
			}

			const { error: upsertError } = await supabase.from('performance_data').upsert(rows);
			if (upsertError) throw upsertError;

			await supabase
				.from('gsc_tokens')
				.update({ last_synced_at: new Date().toISOString() })
				.eq('id', token.id);

			return { rowsInserted: rows.length };
		} catch (error) {
			console.error(`Error syncing site ${token.site_id}:`, error);
			throw error;
		}
	}

	/**
	 * Aggregate daily performance_data into weekly navboost_signals.
	 *
	 * US8595225B1 (Navboost): Google scores pages on topic-specific behavioral signals
	 * over a rolling window. We model this as weekly CTR aggregates over 13 months,
	 * which the rankingsController then uses to run linear regression and classify
	 * momentum as Building / Flat / Weakening.
	 *
	 * Week boundary: Monday (ISO week start).
	 * Window: 13 months rolling (57 weeks) — mirrors the patent's confirmed history window.
	 * Upserts on (site_id, query, page, week_start) so re-runs are idempotent.
	 */
	async aggregateNavboostSignals(siteId: string): Promise<{ rowsUpserted: number }> {
		try {
			// Pull 13 months of daily data for this site
			const windowStart = new Date(Date.now() - 57 * 7 * 86400000).toISOString().split('T')[0];

			const { data: rows, error } = await supabase
				.from('performance_data')
				.select('query, page, date, clicks, impressions, ctr, position')
				.eq('site_id', siteId)
				.gte('date', windowStart);

			if (error) throw error;
			if (!rows || rows.length === 0) return { rowsUpserted: 0 };

			// Group by (query, page, week_start)
			const weekMap = new Map<
				string,
				{
					query: string;
					page: string;
					week_start: string;
					clicks: number;
					impressions: number;
					positions: number[];
				}
			>();

			for (const row of rows) {
				const weekStart = this.getISOWeekMonday(row.date);
				const key = `${row.query}|||${row.page}|||${weekStart}`;

				if (!weekMap.has(key)) {
					weekMap.set(key, {
						query: row.query,
						page: row.page,
						week_start: weekStart,
						clicks: 0,
						impressions: 0,
						positions: []
					});
				}

				const entry = weekMap.get(key)!;
				entry.clicks += row.clicks;
				entry.impressions += row.impressions;
				entry.positions.push(row.position);
			}

			// Build upsert payload
			const navboostRows: NavboostSignalRow[] = [];
			for (const entry of weekMap.values()) {
				const avgPosition = entry.positions.reduce((sum, p) => sum + p, 0) / entry.positions.length;
				const avgCtr = entry.impressions > 0 ? entry.clicks / entry.impressions : 0;

				navboostRows.push({
					site_id: siteId,
					query: entry.query,
					page: entry.page,
					week_start: entry.week_start,
					total_clicks: entry.clicks,
					total_impressions: entry.impressions,
					avg_ctr: Math.round(avgCtr * 10000) / 10000, // 4 decimal places
					avg_position: Math.round(avgPosition * 100) / 100
				});
			}

			if (navboostRows.length === 0) return { rowsUpserted: 0 };

			const { error: upsertError } = await supabase
				.from('navboost_signals')
				.upsert(navboostRows, { onConflict: 'site_id,query,page,week_start' });

			if (upsertError) throw upsertError;

			// Prune rows older than 13 months to keep the table clean
			await supabase
				.from('navboost_signals')
				.delete()
				.eq('site_id', siteId)
				.lt('week_start', windowStart);

			return { rowsUpserted: navboostRows.length };
		} catch (error) {
			console.error(`Navboost aggregation error for site ${siteId}:`, error);
			throw error;
		}
	}

	/**
	 * Get the ISO Monday (week start) for a given date string (YYYY-MM-DD).
	 * Used to bucket daily rows into weekly aggregates for Navboost scoring.
	 */
	private getISOWeekMonday(dateStr: string): string {
		const d = new Date(dateStr);
		const day = d.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat
		const diff = day === 0 ? -6 : 1 - day; // shift to Monday
		d.setUTCDate(d.getUTCDate() + diff);
		return d.toISOString().split('T')[0];
	}

	/**
	 * Refresh Google OAuth access token using refresh token
	 */
	private async refreshAccessToken(refreshToken: string): Promise<string> {
		const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				refresh_token: refreshToken,
				client_id: this.googleClientId,
				client_secret: this.googleClientSecret,
				grant_type: 'refresh_token'
			})
		});

		const tokenData = (await tokenRes.json()) as {
			access_token?: string;
			error?: string;
		};

		if (tokenData.error) {
			throw new Error(`Token refresh failed: ${tokenData.error}`);
		}

		if (!tokenData.access_token) {
			throw new Error('No access token returned from Google');
		}

		return tokenData.access_token;
	}

	/**
	 * Fetch Search Analytics data from Google Search Console API
	 */
	private async fetchSearchAnalyticsData(
		accessToken: string,
		gscPropertyUrl: string
	): Promise<{ rows?: GSCRow[] }> {
		const endDate = new Date().toISOString().split('T')[0];
		const startDate = new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0];

		const gscRes = await fetch(
			`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(gscPropertyUrl)}/searchAnalytics/query`,
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					startDate,
					endDate,
					dimensions: ['query', 'page', 'date'],
					rowLimit: 25000
				})
			}
		);

		if (!gscRes.ok) {
			throw new Error(`GSC API error: ${gscRes.status} ${gscRes.statusText}`);
		}

		return await gscRes.json();
	}

	/**
	 * Get GSC token for a site (decrypts refresh token)
	 */
	async getGSCToken(siteId: string): Promise<{ accessToken: string } | null> {
		const { data, error } = await supabase
			.from('gsc_tokens')
			.select('access_token')
			.eq('site_id', siteId)
			.single();

		if (error || !data) return null;

		return {
			accessToken: data.access_token
		};
	}

	/**
	 * Update GSC property URL for a site
	 */
	async updateGSCPropertyUrl(siteId: string, gscPropertyUrl: string): Promise<void> {
		const { error } = await supabase
			.from('gsc_tokens')
			.update({ gsc_property_url: gscPropertyUrl })
			.eq('site_id', siteId);

		if (error) throw error;
	}

	/**
	 * Encrypt and save GSC token
	 */
	async saveGSCToken(
		siteId: string,
		gscPropertyUrl: string | null,
		refreshToken: string,
		accessToken: string
	): Promise<void> {
		const encryptedRefreshToken = encrypt(refreshToken, this.encryptionKey);

		const { error } = await supabase.from('gsc_tokens').upsert({
			site_id: siteId,
			gsc_property_url: gscPropertyUrl,
			encrypted_refresh_token: encryptedRefreshToken,
			access_token: accessToken,
			access_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
		});

		if (error) throw error;
	}

	/**
	 * Delete GSC token for a site
	 */
	async deleteGSCToken(siteId: string): Promise<void> {
		const { error } = await supabase.from('gsc_tokens').delete().eq('site_id', siteId);

		if (error) throw error;
	}
}
