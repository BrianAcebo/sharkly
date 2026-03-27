import type { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { captureApiError } from '../utils/sentryCapture.js';
import { UsageWallet, getWalletByOrg, OrgUsageSnapshot } from '../utils/wallet.js';
import type { WalletStatus } from '../types/billing.js';

const getOrgUsageSnapshot = async (organizationId: string): Promise<OrgUsageSnapshot | null> => {
	const { data, error } = await supabase
		.from('organizations')
		.select('stripe_status, trial_end, included_credits')
		.eq('id', organizationId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return null;
		}
		throw error;
	}

	if (!data) {
		return null;
	}

	return {
		organization_id: organizationId,
		stripe_status: data.stripe_status,
		trial_end: data.trial_end,
		included_credits_remaining: data.included_credits ?? null
	} as OrgUsageSnapshot;
};

const isTrialActive = (
	snapshot: OrgUsageSnapshot | null,
	organization?: {
		status?: string | null;
		trial_end?: string | null;
		stripe_status?: string | null;
	}
): boolean => {
	const trialEnd = snapshot?.trial_end || organization?.trial_end || null;
	const stripeStatus = snapshot?.stripe_status;
	const orgStatus = organization?.status;

	if (stripeStatus === 'trialing') return true;
	if (orgStatus === 'trialing') return true;
	if (organization?.stripe_status === 'trialing') return true;
	if (!trialEnd) return false;
	return new Date(trialEnd).getTime() > Date.now();
};

const buildWalletStatus = (
	snapshot: OrgUsageSnapshot | null,
	wallet: UsageWallet | null,
	organization?: {
		status?: string | null;
		trial_end?: string | null;
		stripe_status?: string | null;
		wallet_threshold_cents?: number | null;
		wallet_top_up_amount_cents?: number | null;
	}
): WalletStatus => {
	const trialing = isTrialActive(snapshot, organization);

	const included = {
		creditsRemaining: snapshot?.included_credits_remaining ?? null
	};

	if (!wallet) {
		return {
			wallet: null,
			included,
			trialing,
			depositRequired: true,
			reason: trialing ? 'trial_requires_deposit' : 'insufficient_wallet'
		};
	}

	const hasIncluded =
		(included.creditsRemaining ?? 0) > 0;

	if (wallet.status === 'suspended') {
		return {
			wallet: {
				status: wallet.status,
				balance_cents: wallet.balance_cents,
				threshold_cents: wallet.threshold_cents,
				top_up_amount_cents: wallet.top_up_amount_cents,
				pending_top_up_cents: wallet.pending_top_up_cents,
				last_top_up_at: wallet.last_top_up_at
			},
			included,
			trialing,
			depositRequired: true,
			reason: 'wallet_suspended'
		};
	}

	if (trialing) {
		const depositRequired = (wallet.balance_cents ?? 0) <= 0;
		return {
			wallet: {
				status: wallet.status,
				balance_cents: wallet.balance_cents,
				threshold_cents: wallet.threshold_cents,
				top_up_amount_cents: wallet.top_up_amount_cents,
				pending_top_up_cents: wallet.pending_top_up_cents,
				last_top_up_at: wallet.last_top_up_at
			},
			included,
			trialing: true,
			depositRequired,
			reason: depositRequired ? 'trial_requires_deposit' : undefined
		};
	}

	if (hasIncluded) {
		return {
			wallet: {
				status: wallet.status,
				balance_cents: wallet.balance_cents,
				threshold_cents: wallet.threshold_cents,
				top_up_amount_cents: wallet.top_up_amount_cents,
				pending_top_up_cents: wallet.pending_top_up_cents,
				last_top_up_at: wallet.last_top_up_at
			},
			included,
			trialing: false,
			depositRequired: false
		};
	}

	const depositRequired = wallet.balance_cents <= 0;
	return {
		wallet: {
			status: wallet.status,
			balance_cents: wallet.balance_cents,
			threshold_cents: wallet.threshold_cents,
			top_up_amount_cents: wallet.top_up_amount_cents,
			pending_top_up_cents: wallet.pending_top_up_cents,
			last_top_up_at: wallet.last_top_up_at
		},
		included,
		trialing: false,
		depositRequired,
		reason: depositRequired ? 'insufficient_wallet' : undefined
	};
};

export const loadUsageCatalog = async () => {
	const env = process.env.NODE_ENV === 'development' ? 'test' : 'live';

	const { data, error } = await supabase
		.from('usage_overage_catalog')
		.select('overage_code, unit, stripe_price_id, price_cents')
		.eq('active', true)
		.eq('env', env);

	if (error) {
		throw error;
	}

	const records = data ?? [];

	const normalize = (code: string) => code.replace(/_test$/i, '');

	const credits = records.find((row) => normalize(row.overage_code ?? '').includes('llm_credits'));

	return {
		credits: credits
			? {
				stripe_price_id: credits.stripe_price_id,
				amountCents: credits.price_cents ?? null,
				unit: credits.unit
			}
			: null,
	};
};

export const getWalletStatus = async (req: Request, res: Response) => {
	try {
		const organizationId = (req.query.orgId || req.params.organizationId) as string | undefined;
		if (!organizationId) {
			return res.status(400).json({ error: 'organizationId is required' });
		}

		const { data: organization, error: orgError } = await supabase
			.from('organizations')
			.select(
				'id, status, stripe_status, trial_end, wallet_threshold_cents, wallet_top_up_amount_cents'
			)
			.eq('id', organizationId)
			.maybeSingle();

		if (orgError) {
			console.warn('Failed to load organization for wallet status', { organizationId, orgError });
		}

		const [snapshot, wallet] = await Promise.all([
			getOrgUsageSnapshot(organizationId),
			getWalletByOrg(organizationId)
		]);

		const status = buildWalletStatus(snapshot, wallet, organization ?? undefined);
		return res.json(status);
	} catch (error) {
		console.error('Failed to fetch wallet status:', error);
		const orgId = (req.query.orgId || req.params.organizationId) as string | undefined;
		captureApiError(error, req, { feature: 'billing-usage-wallet-status', organizationId: orgId });
		return res.status(500).json({ error: 'Failed to fetch wallet status' });
	}
};

export const getUsageCatalog = async (_req: Request, res: Response) => {
	try {
		const catalog = await loadUsageCatalog();
		return res.json(catalog);
	} catch (error) {
		console.error('Failed to load usage overage catalog', error);
		return res.status(500).json({ error: 'Failed to fetch usage pricing' });
	}
};

export const getPublicPlans = async (_req: Request, res: Response) => {
	try {
		const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
		const { data, error } = await supabase
			.from('plan_catalog')
			.select(
				'plan_code, name, description, included_seats, included_credits, base_price_cents'
			)
			.eq('active', true)
			.eq('env', env)
			.order('base_price_cents', { ascending: true });

		if (error) {
			console.error('Failed to load plan catalog', error);
			captureApiError(error, _req, { feature: 'billing-usage-public-plans' });
			return res.status(500).json({ error: 'Failed to load pricing' });
		}

		return res.json(data ?? []);
	} catch (error) {
		console.error('getPublicPlans error', error);
		captureApiError(error, _req, { feature: 'billing-usage-public-plans' });
		return res.status(500).json({ error: 'Failed to load pricing' });
	}
};
