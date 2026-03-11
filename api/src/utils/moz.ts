/**
 * Moz API utility — Domain Authority lookup
 *
 * Uses Moz API v2 /url_metrics (POST) with Basic Authentication.
 * The MOZ_API_KEY env var should be the base64-encoded "access_id:secret_key"
 * string (i.e. the exact value used as the Basic auth token).
 *
 * Shared by:
 *   - technicalAuditService (during site audits)
 *   - sitesController refresh-authority endpoint (on demand / site creation)
 *   - strategy controller (ensure fresh DA before generating strategy)
 */
import axios from 'axios';

export interface DomainAuthorityResult {
	da: number;
	method: 'moz_api' | 'not_configured' | 'error';
	confidence: 'high' | 'low';
}

/**
 * Fetch Domain Authority from Moz API v2 for a given URL.
 * Returns { da: 0, method: 'not_configured' } if MOZ_API_KEY is absent.
 * Returns { da: 0, method: 'error' } if the API call fails.
 */
export async function fetchDomainAuthority(siteUrl: string): Promise<DomainAuthorityResult> {
	const mozApiKey = process.env.MOZ_API_KEY;

	if (!mozApiKey) {
		console.warn('[Moz] MOZ_API_KEY not configured — DA unavailable');
		return { da: 0, method: 'not_configured', confidence: 'low' };
	}

	try {
		// Normalize: strip protocol, www, trailing slashes
		const raw = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
		const domain = new URL(raw).hostname.replace(/^www\./, '');

		console.log('[Moz] Fetching DA for:', domain);

		// Moz API v2 — POST /url_metrics with Basic auth
		// Docs: https://moz.com/help/links-api/v2/url-metrics
		const response = await axios.post(
			'https://api.moz.com/v2/url_metrics',
			{
				targets: [`${domain}/`],
			},
			{
				timeout: 10000,
				headers: {
					Authorization: `Basic ${mozApiKey}`,
					'Content-Type': 'application/json',
					Accept: 'application/json',
				},
			}
		);

		// Response shape: { results: [{ domain_authority: 32, ... }] }
		const results = response.data?.results ?? response.data;
		let da = 0;
		if (Array.isArray(results) && results.length > 0) {
			da = Number(results[0].domain_authority ?? results[0].da ?? 0);
		} else if (response.data?.domain_authority != null) {
			da = Number(response.data.domain_authority);
		}

		console.log('[Moz] DA for', domain, '=', da);
		return { da: Math.round(da), method: 'moz_api', confidence: 'high' };

	} catch (e) {
		const status = axios.isAxiosError(e) ? e.response?.status : null;
		const msg = e instanceof Error ? e.message : String(e);
		console.error(`[Moz] API error${status ? ` (${status})` : ''}:`, msg);

		// If the domain simply has no Moz data yet (new site), return DA 0 gracefully
		if (status === 404 || status === 422) {
			console.warn('[Moz] Domain not yet in Moz index — returning DA 0');
			return { da: 0, method: 'moz_api', confidence: 'high' };
		}

		return { da: 0, method: 'error', confidence: 'low' };
	}
}
