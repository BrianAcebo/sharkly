import { supabase } from './supabaseClient.js';

export interface OrgUsageSnapshot {
	organization_id: string;
	stripe_status: string | null;
	trial_end: string | null;
  included_minutes_remaining: number | null;
  included_sms_remaining: number | null;
  included_emails_remaining: number | null;
}

export interface UsageWallet {
	id: string;
	organization_id: string;
	currency: string;
	balance_cents: number;
	threshold_cents: number;
	top_up_amount_cents: number;
	pending_top_up_cents: number;
	status: 'active' | 'payment_required' | 'suspended';
	last_top_up_at: string | null;
	created_at: string;
	updated_at: string;
}

export type UsageTransactionType =
	| 'credit_top_up'
	| 'credit_adjustment'
	| 'credit_refund'
	| 'debit_voice'
	| 'debit_sms'
	| 'debit_email'
	| 'debit_other';

interface WalletMutationOptions {
	transactionType?: UsageTransactionType;
	referenceType?: string | null;
	referenceId?: string | null;
	description?: string | null;
}

const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    throw error;
  }
  return data as T;
};

export const ensureWallet = async (
  organizationId: string,
  options?: { thresholdCents?: number; topUpAmountCents?: number }
): Promise<UsageWallet> => {
  return rpc<UsageWallet>('wallet_get_or_create', {
    p_organization_id: organizationId,
    p_threshold_cents: options?.thresholdCents ?? undefined,
    p_top_up_amount_cents: options?.topUpAmountCents ?? undefined
  });
};

export const getWalletByOrg = async (organizationId: string): Promise<UsageWallet | null> => {
  const { data, error } = await supabase
    .from('usage_wallets')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return (data as UsageWallet) ?? null;
};

export const markTopUpPending = async (
	organizationId: string,
	amountCents: number
): Promise<UsageWallet> => {
	return rpc<UsageWallet>('wallet_mark_topup_pending', {
		p_organization_id: organizationId,
		p_amount_cents: amountCents
	});
};

export const clearPendingTopUp = async (
	organizationId: string,
	amountCents: number
): Promise<UsageWallet> => {
	return rpc<UsageWallet>('wallet_clear_pending', {
		p_organization_id: organizationId,
		p_amount_cents: amountCents
	});
};

export const creditWallet = async (
	organizationId: string,
	amountCents: number,
	options?: WalletMutationOptions
): Promise<UsageWallet> => {
	return rpc<UsageWallet>('wallet_credit', {
		p_organization_id: organizationId,
		p_amount_cents: amountCents,
		p_transaction_type: options?.transactionType,
		p_reference_type: options?.referenceType,
		p_reference_id: options?.referenceId,
		p_description: options?.description
	});
};

export const debitWallet = async (
	organizationId: string,
	amountCents: number,
	options?: WalletMutationOptions
): Promise<UsageWallet> => {
  const wallet = await rpc<UsageWallet>('wallet_debit', {
    p_organization_id: organizationId,
    p_amount_cents: amountCents,
    p_transaction_type: options?.transactionType,
    p_reference_type: options?.referenceType,
    p_reference_id: options?.referenceId,
    p_description: options?.description
  });

  // Auto top-up: if wallet is active, no pending top-up, and balance <= threshold, attempt to kick off auto top-up
  try {
    if (
      wallet &&
      wallet.status === 'active' &&
      (wallet.pending_top_up_cents ?? 0) <= 0 &&
      (wallet.balance_cents ?? 0) <= (wallet.threshold_cents ?? 0) &&
      (wallet.top_up_amount_cents ?? 0) > 0
    ) {
      // Fire-and-forget: mark pending and create PI via API util
      const { createTopUpPaymentIntent } = await import('./walletTopup.js');
      createTopUpPaymentIntent({
        organizationId,
        amountCents: wallet.top_up_amount_cents,
        currency: wallet.currency,
        purpose: 'wallet_auto_recharge'
      })
        .then((r) => {
          console.log('[wallet] Auto top-up initiated', { organizationId, paymentIntentId: r.paymentIntentId });
        })
        .catch((e) => {
          console.warn('[wallet] Auto top-up init failed', e);
        });
    }
  } catch (autoErr) {
    console.warn('[wallet] Auto top-up check/trigger failed', autoErr);
  }

  return wallet;
};

