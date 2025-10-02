import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
import { UsageWallet, getWalletByOrg, OrgUsageSnapshot } from '../utils/wallet';
import type { WalletStatus } from '../types/billing';

const getOrgUsageSnapshot = async (organizationId: string): Promise<OrgUsageSnapshot | null> => {
	const { data, error } = await supabase
		.rpc('usage_included_remaining', { p_organization_id: organizationId })
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return null;
		}
		throw error;
	}

	return data as OrgUsageSnapshot;
};

const isTrialActive = (snapshot: OrgUsageSnapshot | null): boolean => {
	if (!snapshot) return false;
	if (snapshot.stripe_status === 'trialing') return true;
	if (!snapshot.trial_end) return false;
	return new Date(snapshot.trial_end).getTime() > Date.now();
};

const buildWalletStatus = (
  snapshot: OrgUsageSnapshot | null,
  wallet: UsageWallet | null
): WalletStatus => {
	const trialing = isTrialActive(snapshot);
	const minutesRemaining = snapshot?.included_minutes_remaining ?? null;
	const smsRemaining = snapshot?.included_sms_remaining ?? null;
	const emailsRemaining = snapshot?.included_emails_remaining ?? null;

  const included = {
    minutesRemaining,
    smsRemaining,
    emailRemaining: emailsRemaining
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
		(minutesRemaining ?? 0) > 0 ||
		(smsRemaining ?? 0) > 0 ||
		(emailsRemaining ?? 0) > 0;

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

		const [snapshot, wallet] = await Promise.all([
      getOrgUsageSnapshot(organizationId),
      getWalletByOrg(organizationId)
		]);

    const status = buildWalletStatus(snapshot, wallet);
		return res.json(status);
	} catch (error) {
		console.error('Failed to fetch wallet status:', error);
		return res.status(500).json({ error: 'Failed to fetch wallet status' });
	}
};


