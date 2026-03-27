/**
 * requireFinAddon — Ensures org has Fin (AI Assistant) access.
 * Fin is a regular plan feature: requires included_chat_messages_monthly > 0.
 * Must run after requireOrgForChat.
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { captureApiError } from '../utils/sentryCapture.js';

export async function requireFinAddon(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const orgId = (req as Request & { organizationId?: string }).organizationId;
		if (!orgId) {
			res.status(401).json({ error: 'Organization context required' });
			return;
		}

		const { data: org } = await supabase
			.from('organizations')
			.select('included_chat_messages_monthly')
			.eq('id', orgId)
			.single();

		const messages = (org as { included_chat_messages_monthly?: number } | null)?.included_chat_messages_monthly ?? 0;
		if (messages <= 0) {
			res.status(403).json({
				error: 'Fin (AI Assistant) is included in Growth, Scale, and Pro plans. Upgrade your plan to access it.',
				code: 'fin_plan_required',
			});
			return;
		}

		next();
	} catch (err) {
		console.error('[requireFinAddon] Error:', err);
		captureApiError(err, req, { feature: 'requireFinAddon' });
		res.status(500).json({ error: 'Failed to verify Fin access' });
	}
}
