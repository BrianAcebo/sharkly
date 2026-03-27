/**
 * S1-8: Internal Link Gap Analysis
 * GET /api/sites/:siteId/internal-link-gaps — site-level prioritised gap list
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { getInternalLinkGaps } from '../services/internalLinkGapService.js';
import { captureApiError } from '../utils/sentryCapture.js';

export async function getInternalLinkGapsHandler(req: Request, res: Response): Promise<void> {
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

		const { data: site, error: siteErr } = await supabase
			.from('sites')
			.select('id')
			.eq('id', siteId)
			.eq('organization_id', userOrg.organization_id)
			.single();

		if (siteErr || !site) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		const result = await getInternalLinkGaps(siteId);
		res.json(result);
	} catch (err) {
		console.error('[InternalLinkGaps] Error:', err);
		captureApiError(err, req, { feature: 'internal-link-gaps', siteId: req.params.siteId });
		res.status(500).json({
			error: err instanceof Error ? err.message : 'Failed to get internal link gaps'
		});
	}
}
