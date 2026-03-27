import type { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { loadUsageCatalog } from './billingUsage.js';
import { captureApiError } from '../utils/sentryCapture.js';

export const listActivePlans = async (_req: Request, res: Response) => {
	try {
		const { data, error } = await supabase
			.from('plan_catalog')
			.select(
				'plan_code, name, description, included_seats, included_credits, included_chat_messages, base_price_cents, stripe_price_id, active'
			)
			.eq('active', true)
			.eq('env', process.env.NODE_ENV === 'development' ? 'test' : 'live')
			.order('base_price_cents', { ascending: true });

		if (error) {
			console.error('Failed to load plan catalog', error);
			captureApiError(error, _req, { feature: 'billing-public-plans' });
			return res.status(500).json({ error: 'Failed to load pricing' });
		}

		return res.json(data ?? []);
	} catch (error) {
		console.error('listActivePlans error', error);
		captureApiError(error, _req, { feature: 'billing-public-plans' });
		return res.status(500).json({ error: 'Failed to load pricing' });
	}
};

export const getPublicUsageRates = async (_req: Request, res: Response) => {
	try {
		const catalog = await loadUsageCatalog();
		return res.json(catalog);
	} catch (error) {
		console.error('Failed to load usage rates', error);
		captureApiError(error, _req, { feature: 'billing-public-usage-rates' });
		return res.status(500).json({ error: 'Failed to load usage rates' });
	}
};

