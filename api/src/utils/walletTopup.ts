import { supabase } from './supabaseClient';
import { getStripeClient } from './stripe';
import { markTopUpPending, clearPendingTopUp, getWalletByOrg, type UsageWallet } from './wallet';

export interface CreateTopUpParams {
  organizationId: string;
  amountCents?: number;
  currency?: string;
  paymentMethodId?: string;
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
    .single();

  if (orgErr || !org) {
    throw new Error('Organization not found');
  }

  const wallet = await getWalletByOrg(organizationId);
  if (!wallet) {
    throw new Error('Wallet not found for organization');
  }

  const amountCents = params.amountCents ?? wallet.top_up_amount_cents ?? org.wallet_top_up_amount_cents ?? 0;
  if (!amountCents || amountCents <= 0) {
    throw new Error('Invalid top-up amount');
  }

  const currency = params.currency || wallet.currency || 'usd';

  // Mark pending atomically in DB so concurrent attempts are guarded
  let pendingWallet: UsageWallet | null = null;
  try {
    pendingWallet = await markTopUpPending(organizationId, amountCents);
  } catch (e) {
    throw e;
  }

  const stripe = getStripeClient();

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      customer: org.stripe_customer_id || undefined,
      automatic_payment_methods: { enabled: true },
      metadata: {
        organizationId,
        purpose: 'wallet_topup',
        amountCents: String(amountCents)
      }
    });

    // Best-effort record in usage_topups if table exists
    try {
      await supabase.from('usage_topups').insert({
        organization_id: organizationId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: amountCents,
        currency,
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


