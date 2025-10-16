import type { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
import { UsageWallet, getWalletByOrg, OrgUsageSnapshot } from '../utils/wallet';
import type { WalletStatus } from '../types/billing';

const getOrgUsageSnapshot = async (organizationId: string): Promise<OrgUsageSnapshot | null> => {
	const { data, error } = await supabase
		.from('organizations')
		.select('stripe_status, trial_end, included_minutes, included_sms, included_emails')
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
		included_minutes_remaining: data.included_minutes ?? null,
		included_sms_remaining: data.included_sms ?? null,
		included_emails_remaining: data.included_emails ?? null
	} as OrgUsageSnapshot;
};



const isTrialActive = (snapshot: OrgUsageSnapshot | null, organization?: { org_status?: string | null; trial_end?: string | null; stripe_status?: string | null }): boolean => {
	const trialEnd = snapshot?.trial_end || organization?.trial_end || null;
	const stripeStatus = snapshot?.stripe_status;
	const orgStatus = organization?.org_status;

	if (stripeStatus === 'trialing') return true;
	if (orgStatus === 'trialing') return true;
	if (organization?.stripe_status === 'trialing') return true;
	if (!trialEnd) return false;
	return new Date(trialEnd).getTime() > Date.now();
};

const buildWalletStatus = (
  snapshot: OrgUsageSnapshot | null,
  wallet: UsageWallet | null,
  organization?: { org_status?: string | null; trial_end?: string | null; stripe_status?: string | null; wallet_threshold_cents?: number | null; wallet_top_up_amount_cents?: number | null }
): WalletStatus => {
  const trialing = isTrialActive(snapshot, organization);

  const included = {
    minutesRemaining: snapshot?.included_minutes_remaining ?? null,
    smsRemaining: snapshot?.included_sms_remaining ?? null,
    emailRemaining: snapshot?.included_emails_remaining ?? null
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
    (included.minutesRemaining ?? 0) > 0 ||
    (included.smsRemaining ?? 0) > 0 ||
    (included.emailRemaining ?? 0) > 0;

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

export const getWalletStatus = async (req: Request, res: Response) => {
	try {
		const organizationId = (req.query.orgId || req.params.organizationId) as string | undefined;
		if (!organizationId) {
			return res.status(400).json({ error: 'organizationId is required' });
		}

	   const { data: organization, error: orgError } = await supabase
	     .from('organizations')
	     .select('id, org_status, stripe_status, trial_end, wallet_threshold_cents, wallet_top_up_amount_cents')
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
		return res.status(500).json({ error: 'Failed to fetch wallet status' });
	}
};

export const getUsageCatalog = async (req: Request, res: Response) => {
	try {
		const env = process.env.NODE_ENV === 'development' ? 'test' : 'live';

		const { data, error } = await supabase
			.from('usage_overage_catalog')
			.select('overage_code, unit, stripe_price_id, price_cents')
			.eq('active', true)
			.eq('env', env);

		if (error) {
			console.error('Failed to load usage overage catalog', error);
			return res.status(500).json({ error: 'Failed to fetch usage pricing' });
		}

		const records = data ?? [];

		const normalize = (code: string) => code.replace(/_test$/i, '');

		const voice = records.find((row) => normalize(row.overage_code ?? '').includes('voice_minutes'));
		const sms = records.find((row) => normalize(row.overage_code ?? '').includes('sms_overage'));

		return res.json({
			voice: voice
				? {
					stripe_price_id: voice.stripe_price_id,
					amountCents: voice.price_cents ?? null,
					unit: voice.unit
				}
				: null,
			sms: sms
				? {
					stripe_price_id: sms.stripe_price_id,
					amountCents: sms.price_cents ?? null,
					unit: sms.unit
				}
				: null
		});
	} catch (error) {
		console.error('Error fetching usage pricing catalog', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

export const getPublicPlans = async (_req: Request, res: Response) => {
	try {
		const { data, error } = await supabase
			.from('plan_catalog')
			.select(
				'plan_code, name, description, included_seats, included_minutes, included_sms, included_emails, base_price_cents'
			)
			.eq('active', true)
			.order('base_price_cents', { ascending: true });

		if (error) {
			console.error('Failed to load plan catalog', error);
			return res.status(500).json({ error: 'Failed to load pricing' });
		}

		return res.json(data ?? []);
	} catch (error) {
		console.error('getPublicPlans error', error);
		return res.status(500).json({ error: 'Failed to load pricing' });
	}
};


