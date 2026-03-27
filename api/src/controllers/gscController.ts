/**
 * GSC Controller
 * Handles GSC-related HTTP endpoints
 */

import { Request, Response } from 'express';
import { GSCService } from '../services/gscService.js';
import { generateRandomString } from '../utils/helpers.js';
import { captureApiError } from '../utils/sentryCapture.js';

const gscService = new GSCService();

// Store OAuth states in memory (in production, use Redis/database)
const oauthStates = new Map<string, { siteId: string; createdAt: number }>();

// Cache OAuth tokens temporarily during the flow
const oauthTokenCache = new Map<string, {
	accessToken: string;
	refreshToken: string;
	siteId: string;
	properties?: Array<{ siteUrl: string }>;
	createdAt: number;
}>();

/**
 * POST /api/gsc/sync
 * Sync GSC performance data for all connected sites
 * Optional: Can be authenticated via CRON_API_KEY for scheduled jobs
 */
export async function syncPerformanceData(req: Request, res: Response): Promise<void> {
	try {
		// Optional: Verify cron API key if configured
		const cronApiKey = process.env.CRON_API_KEY;
		if (cronApiKey) {
			const authHeader = req.headers.authorization;
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				res.status(401).json({
					success: false,
					error: 'Missing or invalid authorization header'
				});
				return;
			}

			const token = authHeader.slice(7); // Remove 'Bearer ' prefix
			if (token !== cronApiKey) {
				res.status(403).json({
					success: false,
					error: 'Invalid API key'
				});
				return;
			}
		}

		const result = await gscService.syncAllPerformanceData();

		if (result.error) {
			captureApiError(new Error(String(result.error)), req, { feature: 'gsc-sync-all' });
			res.status(500).json({
				success: false,
				error: result.error
			});
			return;
		}

		res.json({
			success: true,
			synced: result.synced,
			rows_inserted: result.rows_inserted,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('GSC sync error:', error);
		captureApiError(error, req, { feature: 'gsc-sync' });
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}

/**
 * GET /api/gsc/oauth/start
 * Initiate OAuth flow for GSC connection
 * Redirects to Google OAuth consent screen
 */
/**
 * GET /api/gsc/oauth/start
 * Initiate GSC OAuth flow
 * Redirects to Google
 */
export async function startGSCOAuth(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.query;

		if (!siteId || typeof siteId !== 'string') {
			res.status(400).json({
				success: false,
				error: 'Missing siteId'
			});
			return;
		}

		// Generate state for CSRF protection
		const state = generateRandomString(32);
		oauthStates.set(state, { siteId, createdAt: Date.now() });

		// Clean up old states (older than 10 minutes)
		for (const [key, value] of oauthStates.entries()) {
			if (Date.now() - value.createdAt > 10 * 60 * 1000) {
				oauthStates.delete(key);
			}
		}

		// Build Google OAuth URL
		const params = new URLSearchParams({
			client_id: process.env.GOOGLE_CLIENT_ID || '',
			redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/gsc/oauth/callback`,
			response_type: 'code',
			scope: 'https://www.googleapis.com/auth/webmasters.readonly',
			access_type: 'offline',
			prompt: 'consent',
			state
		});

		res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
	} catch (error) {
		console.error('GSC OAuth start error:', error);
		captureApiError(error, req, { feature: 'gsc-oauth-start' });
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}

/**
 * GET /api/gsc/oauth/callback
 * OAuth callback from Google
 * Exchanges authorization code for tokens and saves to database
 */
export async function handleGSCOAuthCallback(req: Request, res: Response): Promise<void> {
	try {
		const { code, state, error } = req.query;

		if (error) {
			throw new Error(`Google OAuth error: ${error}`);
		}

		if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
			throw new Error('Missing authorization code or state');
		}

		// Verify state exists and hasn't expired
		const stateData = oauthStates.get(state);
		if (!stateData) {
			throw new Error('Invalid or expired state');
		}

	oauthStates.delete(state); // Use state once
	const siteId = stateData.siteId;

	// Exchange code for tokens
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code,
				client_id: process.env.GOOGLE_CLIENT_ID || '',
				client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
				redirect_uri: `${process.env.BACKEND_URL || 'http://localhost'}/api/gsc/oauth/callback`,
				grant_type: 'authorization_code'
			})
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json();
			throw new Error(errorData.error_description || 'Token exchange failed');
		}

		const tokenData = (await tokenResponse.json()) as {
			access_token: string;
			refresh_token?: string;
		};

		if (!tokenData.access_token || !tokenData.refresh_token) {
			throw new Error('Missing required tokens from Google');
		}

		// Validate access by fetching GSC properties
		const gscRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
			headers: { Authorization: `Bearer ${tokenData.access_token}` }
		});

	if (!gscRes.ok) {
		throw new Error('Failed to access Google Search Console');
	}

	const gscData = (await gscRes.json()) as { siteEntry?: Array<{ siteUrl: string }> };
	const properties = gscData.siteEntry ?? [];

	// Generate a cache key for this OAuth transaction
	const cacheKey = generateRandomString(32);

	// Store tokens in cache temporarily
	oauthTokenCache.set(cacheKey, {
		accessToken: tokenData.access_token,
		refreshToken: tokenData.refresh_token,
		siteId,
		properties: properties.length > 0 ? properties : undefined,
		createdAt: Date.now()
	});

	// Clean up old cache entries (older than 10 minutes)
	for (const [key, value] of oauthTokenCache.entries()) {
		if (Date.now() - value.createdAt > 10 * 60 * 1000) {
			oauthTokenCache.delete(key);
		}
	}

	console.log('OAuth tokens cached with key:', cacheKey);

	res.redirect(
		`${process.env.FRONTEND_URL || 'http://localhost:5173'}/gsc-select-property?siteId=${siteId}&cacheKey=${cacheKey}`
	);
	} catch (error) {
		console.error('GSC OAuth callback error:', error);
		captureApiError(error, req, { feature: 'gsc-oauth-callback' });
		const errorMsg = encodeURIComponent(error instanceof Error ? error.message : 'Unknown error');
		res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/sites?gsc_error=${errorMsg}`);
	}
}

/**
 * POST /api/gsc/save
 * Save GSC token after user selects property
 */
export async function saveGSCToken(req: Request, res: Response): Promise<void> {
	try {
		const { gscPropertyUrl, cacheKey } = req.body;

		if (!gscPropertyUrl) {
			res.status(400).json({
				success: false,
				error: 'Missing gscPropertyUrl'
			});
			return;
		}

		if (!cacheKey || typeof cacheKey !== 'string') {
			res.status(400).json({
				success: false,
				error: 'Missing or invalid cacheKey'
			});
			return;
		}

		// Get tokens from cache
		const cachedTokens = oauthTokenCache.get(cacheKey);
		if (!cachedTokens || !cachedTokens.siteId || !cachedTokens.refreshToken || !cachedTokens.accessToken) {
			res.status(400).json({
				success: false,
				error: 'OAuth session expired. Please start again.'
			});
			return;
		}

		// Save tokens (encrypted server-side)
		await gscService.saveGSCToken(
			cachedTokens.siteId,
			gscPropertyUrl,
			cachedTokens.refreshToken,
			cachedTokens.accessToken
		);

		// Clear cache
		oauthTokenCache.delete(cacheKey);

		res.json({
			success: true,
			message: 'GSC connected successfully'
		});
	} catch (error) {
		console.error('GSC save error:', error);
		captureApiError(error, req, { feature: 'gsc-save-token' });
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}

/**
 * GET /api/gsc/properties
 * Get GSC properties from cache (or fetch from Google if needed)
 */
export async function getGSCProperties(req: Request, res: Response): Promise<void> {
	try {
		const { cacheKey } = req.query;

		if (!cacheKey || typeof cacheKey !== 'string') {
			res.status(400).json({
				success: false,
				error: 'Missing cacheKey. Please start the connection again.'
			});
			return;
		}

		const cachedTokens = oauthTokenCache.get(cacheKey);

		if (!cachedTokens) {
			res.status(400).json({
				success: false,
				error: 'No GSC session found or expired. Please start the connection again.'
			});
			return;
		}

		// If properties weren't cached, fetch them from Google now
		let properties = cachedTokens.properties;
		if (!properties) {
			const gscRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
				headers: { Authorization: `Bearer ${cachedTokens.accessToken}` }
			});

			if (!gscRes.ok) {
				throw new Error('Failed to fetch GSC properties from Google');
			}

			const gscData = (await gscRes.json()) as { siteEntry?: Array<{ siteUrl: string }> };
			properties = gscData.siteEntry ?? [];

			// Update cache with properties
			cachedTokens.properties = properties;
		}

		res.json({
			properties
		});
	} catch (error) {
		console.error('GSC properties error:', error);
		captureApiError(error, req, { feature: 'gsc-properties' });
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}

/**
 * POST /api/gsc/disconnect
 * Disconnect GSC for a specific site
 * Requires authentication and site ownership
 */
export async function disconnectGSC(req: Request, res: Response): Promise<void> {
	try {
		const { siteId } = req.body;

		if (!siteId) {
			res.status(400).json({
				success: false,
				error: 'Missing siteId'
			});
			return;
		}

		await gscService.deleteGSCToken(siteId);

		res.json({
			success: true,
			message: 'GSC disconnected successfully'
		});
	} catch (error) {
		console.error('GSC disconnect error:', error);
		captureApiError(error, req, { feature: 'gsc-disconnect' });
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}
