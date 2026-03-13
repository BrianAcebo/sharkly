import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { fetchDomainAuthority } from '../utils/moz.js';
import { CREDIT_COSTS } from '../utils/credits.js';
import { wouldConflictWithKeyword } from '../utils/keywordCannibalization.js';

/**
 * POST /api/sites/:id/refresh-authority
 *
 * Fetches the latest Domain Authority from Moz for the given site and
 * persists it to the `sites.domain_authority` column.
 *
 * Charges REFRESH_AUTHORITY (2) credits when Moz API is configured.
 *
 * Called:
 *  - Automatically after a site is created (via frontend useSites hook)
 *  - Manually when the user clicks "Refresh" in Site Settings
 *  - Before strategy generation to ensure fresh DA data
 */
export const refreshAuthority = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ error: 'Unauthorized' });

	const siteId = req.params.id;
	if (!siteId) return res.status(400).json({ error: 'siteId is required' });

	// Verify the site belongs to this user's organization
	const { data: userOrg } = await supabase
		.from('user_organizations')
		.select('organization_id')
		.eq('user_id', userId)
		.maybeSingle();

	if (!userOrg?.organization_id) return res.status(400).json({ error: 'No organization found' });

	const { data: site, error: siteErr } = await supabase
		.from('sites')
		.select('id, url, domain_authority')
		.eq('id', siteId)
		.eq('organization_id', userOrg.organization_id)
		.single();

	if (siteErr || !site) return res.status(404).json({ error: 'Site not found' });

	// Only charge when Moz is configured (we will make a paid API call)
	if (process.env.MOZ_API_KEY) {
		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', userOrg.organization_id)
			.single();

		const cost = CREDIT_COSTS.REFRESH_AUTHORITY;
		const creditsRemaining = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (creditsRemaining < cost) {
			return res.status(402).json({
				error: 'Insufficient credits',
				required: cost,
				available: creditsRemaining,
				needs_topup: true,
			});
		}

		const newCredits = Math.max(0, creditsRemaining - cost);
		const { error: deductErr } = await supabase
			.from('organizations')
			.update({
				included_credits_remaining: newCredits,
				...(org?.included_credits != null && { included_credits: newCredits }),
			})
			.eq('id', userOrg.organization_id);

		if (deductErr) {
			console.error('[Sites] Failed to deduct credits:', deductErr);
			return res.status(500).json({ error: 'Failed to deduct credits' });
		}
	}

	const result = await fetchDomainAuthority(site.url);

	if (result.method === 'not_configured') {
		return res.status(200).json({
			domain_authority: site.domain_authority ?? 0,
			updated: false,
			message: 'Moz API not configured — using existing value',
		});
	}

	// Save to DB even if 0 (brand-new domains legitimately have DA 0–1)
	const { error: updateErr } = await supabase
		.from('sites')
		.update({ domain_authority: result.da })
		.eq('id', siteId);

	if (updateErr) {
		console.error('[Sites] Failed to update DA:', updateErr);
		return res.status(500).json({ error: 'Failed to save domain authority' });
	}

	return res.json({
		domain_authority: result.da,
		updated: true,
		method: result.method,
		confidence: result.confidence,
		...(process.env.MOZ_API_KEY && { creditsUsed: CREDIT_COSTS.REFRESH_AUTHORITY }),
	});
};

/**
 * GET /api/sites/:siteId/check-cannibalization?keyword=...
 * S2-3: Check if adding this keyword would create cannibalization with existing pages/topics.
 */
export const checkCannibalization = async (req: Request, res: Response) => {
	const userId = req.user?.id;
	if (!userId) return res.status(401).json({ error: 'Unauthorized' });

	const siteId = req.params.siteId;
	const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : '';
	if (!siteId || !keyword) {
		return res.status(400).json({ error: 'siteId and keyword query param required' });
	}

	const { data: userOrg } = await supabase
		.from('user_organizations')
		.select('organization_id')
		.eq('user_id', userId)
		.maybeSingle();
	if (!userOrg?.organization_id) return res.status(403).json({ error: 'No organization' });

	const { data: site } = await supabase
		.from('sites')
		.select('id, organization_id')
		.eq('id', siteId)
		.eq('organization_id', userOrg.organization_id)
		.single();
	if (!site) return res.status(404).json({ error: 'Site not found' });

	// Fetch all pages and topics for this site
	const { data: pages } = await supabase
		.from('pages')
		.select('id, title, keyword, published_url, type')
		.eq('site_id', siteId);

	const { data: topics } = await supabase
		.from('topics')
		.select('id, title, keyword')
		.eq('site_id', siteId);

	const allItems = [
		...(pages ?? []).map((p) => ({
			id: p.id,
			title: p.title,
			keyword: (p as { keyword?: string }).keyword,
			published_url: (p as { published_url?: string }).published_url,
			type: (p as { type?: string }).type
		})),
		...(topics ?? []).map((t) => ({
			id: (t as { id: string }).id,
			title: (t as { title?: string }).title ?? '',
			keyword: (t as { keyword?: string }).keyword,
			published_url: null as string | null,
			type: 'topic'
		}))
	];

	const conflict = wouldConflictWithKeyword(allItems, keyword);
	return res.json({
		hasConflict: !!conflict,
		conflict: conflict ?? undefined
	});
};
