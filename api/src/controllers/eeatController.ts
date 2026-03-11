/**
 * S1-3. EEAT Scored Checklist
 * GET /api/sites/:siteId/eeat — fetch or evaluate EEAT checklist
 */

import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { eeatService } from '../services/eeatService.js';

/**
 * GET /api/sites/:siteId/eeat
 * Returns eeat_score and eeat_checklist for the site.
 * If ?evaluate=1, re-runs the evaluation before returning.
 */
export const getEEAT = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const siteId = req.params.siteId;
		const shouldEvaluate = req.query.evaluate === '1' || req.query.evaluate === 'true';

		if (!siteId) {
			res.status(400).json({ error: 'siteId required' });
			return;
		}

		// Verify org access
		const { data: site } = await supabase
			.from('sites')
			.select('id, eeat_score, eeat_checklist, organization_id')
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

		let checklist = site.eeat_checklist as object | null;
		let score = site.eeat_score ?? 0;

		if (shouldEvaluate) {
			const result = await eeatService.evaluateSite(siteId);
			checklist = result as unknown as object;
			score = result.max_score > 0 ? Math.round((result.score / result.max_score) * 100) : 0;
		}

		res.json({
			eeat_score: score,
			eeat_checklist: checklist
		});
	} catch (err) {
		console.error('[EEAT] Error:', err);
		res.status(500).json({ error: 'Failed to get EEAT data' });
	}
};
