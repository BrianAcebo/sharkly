import type Stripe from 'stripe';

import { supabase } from './supabaseClient';
import { getStripeClient } from './stripe';
import { markTopUpPending, clearPendingTopUp, getWalletByOrg, ensureWallet, type UsageWallet } from './wallet';

type TopUpPurpose = 'wallet_topup' | 'wallet_auto_recharge';

export interface CreateTopUpParams {
	organizationId: string;
	amountCents?: number;
	currency?: string;
	paymentMethodId?: string | null;
	autoConfirm?: boolean;
	purpose?: TopUpPurpose;
	metadata?: Record<string, string>;
}

export interface CreateTopUpResult {
  clientSecret: string | null;
  paymentIntentId: string;
  wallet: UsageWallet;
}

export async function createTopUpPaymentIntent(params: CreateTopUpParams): Promise<CreateTopUpResult> {
  const { organizationId } = params;

  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('id, stripe_customer_id, wallet_top_up_amount_cents')
    .eq('id', organizationId)
    .maybeSingle();

  if (orgErr || !org) {
    throw orgErr ?? new Error('Organization not found');
  }

	let wallet = await getWalletByOrg(organizationId);
	if (!wallet) {
		wallet = await ensureWallet(organizationId, {
			thresholdCents: org.wallet_top_up_amount_cents ?? undefined,
			topUpAmountCents: org.wallet_top_up_amount_cents ?? undefined
		});
	}

  const amountCents = params.amountCents ?? wallet.top_up_amount_cents ?? org.wallet_top_up_amount_cents ?? 0;
  if (!amountCents || amountCents <= 0) {
    throw new Error('Invalid top-up amount');
  }

  const currency = params.currency || wallet.currency || 'usd';
  const purpose: TopUpPurpose = params.purpose ?? 'wallet_topup';

  // Mark pending atomically in DB so concurrent attempts are guarded
  const pendingWallet = await markTopUpPending(organizationId, amountCents);

  const stripe = getStripeClient();

  let paymentMethodId = params.paymentMethodId ?? null;
  const shouldAutoConfirm = Boolean(paymentMethodId || params.autoConfirm);

  if (shouldAutoConfirm && !paymentMethodId) {
    if (!org.stripe_customer_id) {
      throw new Error('Stripe customer missing from organization');
    }

    try {
      const customer = await stripe.customers.retrieve(org.stripe_customer_id, {
        expand: ['invoice_settings.default_payment_method']
      });

      if ((customer as Stripe.DeletedCustomer).deleted) {
        throw new Error('Stripe customer is deleted');
      }

      const defaultPaymentMethod = (customer as Stripe.Customer).invoice_settings?.default_payment_method;

      if (typeof defaultPaymentMethod === 'string') {
        paymentMethodId = defaultPaymentMethod;
      } else if (defaultPaymentMethod && 'id' in defaultPaymentMethod) {
        paymentMethodId = defaultPaymentMethod.id;
      }
    } catch (err) {
      console.error('[walletTopup] Failed to load default payment method', err);
      throw new Error('Failed to locate default payment method. Update it from the billing page.');
    }

    if (!paymentMethodId) {
      throw new Error('No default payment method on file. Update it from the billing page.');
    }
  }

  try {
    const metadata: Record<string, string> = {
      organizationId,
      purpose,
      amountCents: String(amountCents),
      ...params.metadata
    };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      customer: org.stripe_customer_id || undefined,
      payment_method: paymentMethodId || undefined,
      automatic_payment_methods: paymentMethodId || shouldAutoConfirm ? undefined : { enabled: true },
      confirm: shouldAutoConfirm,
      off_session: shouldAutoConfirm,
      metadata
    });

    // Best-effort record in usage_topups if table exists
    try {
      await supabase.from('usage_topups').insert({
        organization_id: organizationId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: amountCents,
        currency,
        purpose,
        status: 'pending'
      });
    } catch (insertErr) {
      // Table might not exist yet; ignore but log server-side
      console.warn('[walletTopup] Failed to record usage_topup row', insertErr);
    }

    return {
      clientSecret: paymentIntent.client_secret ?? null,
      paymentIntentId: paymentIntent.id,
      wallet: pendingWallet || wallet
    };
  } catch (stripeErr) {
    // Clear pending on failure
    try {
      await clearPendingTopUp(organizationId, amountCents);
    } catch (clearErr) {
      console.error('[walletTopup] Failed to clear pending after Stripe error', clearErr);
    }
    throw stripeErr;
  }
}

export async function markTopUpStatus(paymentIntentId: string, status: 'succeeded' | 'failed' | 'canceled' | 'refunded') {
  try {
    await supabase
      .from('usage_topups')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('stripe_payment_intent_id', paymentIntentId);
  } catch (e) {
    console.warn('[walletTopup] Failed to update usage_topups status', { paymentIntentId, status, error: e });
  }
}


