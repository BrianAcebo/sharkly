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
	 * Pulls 28 days of Search Analytics data and stores in performance_data table
	 */
	async syncAllPerformanceData(): Promise<{
		synced: number;
		rows_inserted: number;
		error?: string;
	}> {
		try {
			// Fetch all GSC tokens (one per site)
			const { data: tokenRows, error: fetchError } = await supabase.from('gsc_tokens').select('*');

			if (fetchError) throw fetchError;

			let totalSynced = 0;
			let totalRows = 0;

			for (const token of tokenRows ?? []) {
				try {
					const syncResult = await this.syncSitePerformanceData(token);
					totalSynced++;
					totalRows += syncResult.rowsInserted;
				} catch (error) {
					console.error(`Sync error for site ${token.site_id}:`, error);
					// Continue with next site on error
				}
			}

			return {
				synced: totalSynced,
				rows_inserted: totalRows
			};
		} catch (error) {
			console.error('GSC sync error:', error);
			return {
				synced: 0,
				rows_inserted: 0,
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
			// Decrypt refresh token
			const refreshToken = decrypt(token.encrypted_refresh_token, this.encryptionKey);

			// Get new access token
			const accessToken = await this.refreshAccessToken(refreshToken);

			// Fetch Search Analytics data
			const gscData = await this.fetchSearchAnalyticsData(accessToken, token.gsc_property_url);

			// Parse and prepare rows for upsert
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

			// Upsert performance data
			const { error: upsertError } = await supabase.from('performance_data').upsert(rows);

			if (upsertError) throw upsertError;

			// Update last_synced_at
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
