/**
 * S1-7: Toxic Link Detection + Disavow
 * GET  /api/sites/:siteId/toxic-links-audit — fetch stored audit
 * POST /api/sites/:siteId/toxic-links-audit — run audit (15 credits)
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { runToxicLinksAudit } from '../services/toxicLinksService.js';

const CREDIT_COST = 15;

/**
 * GET /api/sites/:siteId/toxic-links-audit
 * Returns the stored audit from sites.toxic_links_audit.
 */
export async function getToxicLinksAudit(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const siteId = req.params.siteId;
		if (!siteId) {
			res.status(400).json({ error: 'siteId is required' });
			return;
		}

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg?.organization_id) {
			res.status(400).json({ error: 'No organization found' });
			return;
		}

		const { data: site, error } = await supabase
			.from('sites')
			.select('toxic_links_audit')
			.eq('id', siteId)
			.eq('organization_id', userOrg.organization_id)
			.single();

		if (error || !site) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		res.json({ audit: site.toxic_links_audit ?? null });
	} catch (err) {
		console.error('[ToxicLinks] Get error:', err);
		res.status(500).json({ error: 'Failed to fetch toxic links audit' });
	}
}

export async function runToxicLinksAuditHandler(req: Request, res: Response): Promise<void> {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const siteId = req.params.siteId;
		if (!siteId) {
			res.status(400).json({ error: 'siteId is required' });
			return;
		}

		// Verify org access
		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg?.organization_id) {
			res.status(400).json({ error: 'No organization found' });
			return;
		}

		const { data: site, error: siteErr } = await supabase
			.from('sites')
			.select('id, url, organization_id')
			.eq('id', siteId)
			.eq('organization_id', userOrg.organization_id)
			.single();

		if (siteErr || !site) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		// Check credits
		const { data: org } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits')
			.eq('id', userOrg.organization_id)
			.single();

		const creditsRemaining = Number(org?.included_credits_remaining ?? org?.included_credits ?? 0);
		if (creditsRemaining < CREDIT_COST) {
			res.status(402).json({
				error: 'Insufficient credits',
				required: CREDIT_COST,
				available: creditsRemaining,
				needs_topup: true,
			});
			return;
		}

		// Deduct credits BEFORE costly DataForSEO API call — never call without charging
		const newCredits = Math.max(0, creditsRemaining - CREDIT_COST);
		const { error: deductErr } = await supabase
			.from('organizations')
			.update({
				included_credits_remaining: newCredits,
				...(org?.included_credits != null && { included_credits: newCredits }),
			})
			.eq('id', userOrg.organization_id);

		if (deductErr) {
			console.error('[ToxicLinks] Failed to deduct credits:', deductErr);
			res.status(500).json({ error: 'Failed to deduct credits' });
			return;
		}

		try {
			// Run audit (DataForSEO call — credits already deducted)
			const result = await runToxicLinksAudit(siteId);
			res.json({ ...result, creditsUsed: CREDIT_COST });
		} catch (auditErr) {
			// Refund credits if audit fails after deduct
			await supabase
				.from('organizations')
				.update({
					included_credits_remaining: creditsRemaining,
					...(org?.included_credits != null && { included_credits: creditsRemaining }),
				})
				.eq('id', userOrg.organization_id);
			throw auditErr;
		}
	} catch (err) {
		console.error('[ToxicLinks] Audit error:', err);
		res.status(500).json({
			error: err instanceof Error ? err.message : 'Failed to run toxic link audit',
		});
	}
}
