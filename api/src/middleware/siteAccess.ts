/**
 * requireSiteAccess — Ensures user's org has access to the site in :siteId param.
 * Must run after requireAuth.
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { captureApiError } from '../utils/sentryCapture.js';

export async function requireSiteAccess(
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> {
	try {
		const userId = req.user?.id;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized' });
			return;
		}

		const siteId = req.params.siteId;
		if (!siteId) {
			res.status(400).json({ error: 'Missing siteId' });
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

		const { data: site } = await supabase
			.from('sites')
			.select('id')
			.eq('id', siteId)
			.eq('organization_id', userOrg.organization_id)
			.maybeSingle();

		if (!site) {
			res.status(404).json({ error: 'Site not found' });
			return;
		}

		next();
	} catch (err) {
		console.error('[requireSiteAccess] Error:', err);
		captureApiError(err, req, { feature: 'requireSiteAccess' });
		res.status(500).json({ error: 'Failed to verify site access' });
	}
}
