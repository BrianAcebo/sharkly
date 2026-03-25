import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { fetchDomainAuthority } from '../utils/moz.js';

/**
 * Creates a site from the first-site wizard. Profile completion is separate (profiles.completed_onboarding).
 * No competitor research, topics, credits, or background technical audit.
 */
export const completeOnboarding = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const body = req.body as {
			url: string;
			businessName: string;
			niche: string;
			customerDescription: string;
			platform: string;
		};

		if (!body.url || !body.businessName) {
			return res.status(400).json({ error: 'Missing required fields: url, businessName' });
		}

		const url = body.url.startsWith('http') ? body.url : `https://${body.url}`;
		const platform = body.platform || 'custom';
		const niche = body.niche || '';
		const customerDescription = body.customerDescription || '';

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (!userOrg?.organization_id) {
			return res.status(403).json({
				error: 'Organization not found. Complete billing setup first.'
			});
		}

		const organizationId = userOrg.organization_id;

		const daResult = await fetchDomainAuthority(url);
		const domainAuthority = Math.max(0, Math.min(100, daResult.da));

		const { data: site, error: siteErr } = await supabase
			.from('sites')
			.insert({
				organization_id: organizationId,
				name: body.businessName,
				description: niche,
				url,
				platform,
				niche,
				customer_description: customerDescription,
				competitor_urls: [],
				domain_authority: domainAuthority
			})
			.select('id')
			.single();

		if (siteErr || !site) {
			console.error('[Onboarding] Site creation failed:', siteErr);
			return res.status(500).json({ error: 'Failed to create site' });
		}

		return res.json({
			siteId: site.id,
			organizationId
		});
	} catch (err) {
		console.error('[Onboarding] Error:', err);
		return res.status(500).json({ error: 'Internal server error' });
	}
};
