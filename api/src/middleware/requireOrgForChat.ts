/**
 * requireOrgForChat — Resolve organization from x-organization-id header or user's org.
 * Must run after requireAuth. Sets req.organizationId for AI chat and refund routes.
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabaseClient.js';

export async function requireOrgForChat(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const userId = (req as Request & { userId?: string }).userId;
		if (!userId) {
			res.status(401).json({ error: 'Unauthorized', code: 'auth_required' });
			return;
		}

		const headerOrgId = req.headers['x-organization-id'] as string | undefined;
		if (headerOrgId?.trim()) {
			const { data: membership } = await supabase
				.from('user_organizations')
				.select('organization_id')
				.eq('user_id', userId)
				.eq('organization_id', headerOrgId.trim())
				.maybeSingle();

			if (membership) {
				(req as any).organizationId = membership.organization_id;
				(req as any).userId = userId;
				return next();
			}
		}

		// Fallback: user's primary org from user_organizations
		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.order('created_at', { ascending: true })
			.limit(1)
			.maybeSingle();

		if (!userOrg?.organization_id) {
			res.status(403).json({ error: 'No organization', code: 'org_required' });
			return;
		}

		(req as any).organizationId = userOrg.organization_id;
		(req as any).userId = userId;
		next();
	} catch (err) {
		console.error('[requireOrgForChat] Error:', err);
		res.status(500).json({ error: 'Failed to resolve organization' });
	}
}
