import { Request, Response } from 'express';
import Stripe from 'stripe';

import { getStripeClient } from '../utils/stripe.js';
import { supabase } from '../utils/supabaseClient.js';
import {
  computeMaxSeatsForPlan,
  deactivateExtraSeats,
  loadSeatSummary,
  recordSeatEvent,
  syncExtraSeatAddon,
  updateOrgMaxSeats
} from '../utils/seats.js';
import { creditWallet, clearPendingTopUp, debitWallet } from '../utils/wallet.js';
import { markTopUpStatus } from '../utils/walletTopup.js';
import type { PlanCatalogRow, OrganizationRow, StripeSubStatus } from '../types/billing.js';
import { emailService } from '../utils/email.js';

const stripe = getStripeClient();

const WALLET_PI_PURPOSES = new Set(['wallet_topup', 'wallet_auto_recharge']);

const findOrganizationBySubscriptionOrCustomer = async (
  subscriptionId: string | null,
  customerId: string | null
): Promise<OrganizationRow | null> => {
  if (!subscriptionId && !customerId) {
    return null;
  }

  if (subscriptionId) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();

    if (error) {
      console.error('[WEBHOOK] Failed to lookup org by subscription', { subscriptionId, error });
    }

    if (data) {
      return data as OrganizationRow;
    }
  }

  if (customerId) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (error) {
      console.error('[WEBHOOK] Failed to lookup org by customer', { customerId, error });
    }

    if (data) {
      return data as OrganizationRow;
    }
  }

  return null;
};

const getPlanFromPriceId = async (priceId: string): Promise<PlanCatalogRow | null> => {
  const { data, error } = await supabase
    .from('plan_catalog')
    .select('*')
    .eq('stripe_price_id', priceId)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    console.warn('[WEBHOOK] Failed to load plan for price', { priceId, error });
    return null;
  }

  return (data as PlanCatalogRow) ?? null;
};

const mapPlanFields = (plan: PlanCatalogRow | null) => {
  if (!plan) {
    return {};
  }

  return {
    plan_code: plan.plan_code,
    plan_price_cents: plan.base_price_cents,
    included_seats: plan.included_seats,
    included_credits: plan.included_credits,
  } satisfies Partial<OrganizationRow>;
};

const logSubscriptionChange = async (
  orgId: string,
  event: string,
  fromPlan: string | null,
  toPlan: string | null,
  prorationCents: number,
  raw: unknown
) => {
  const { error } = await supabase.from('subscription_ledger').insert({
    org_id: orgId,
    stripe_subscription_id: (raw as Stripe.Subscription | undefined)?.id ?? null,
    event,
    from_plan: fromPlan,
    to_plan: toPlan,
    proration_cents: prorationCents,
    raw: raw as Record<string, unknown>
  });

  if (error) {
    console.warn('[WEBHOOK] Failed to log subscription change', { orgId, event, error });
  }
};

const handleWalletPaymentIntent = async (event: Stripe.Event) => {
  const pi = event.data.object as Stripe.PaymentIntent;
  const metadata = (pi.metadata ?? {}) as Record<string, string>;
  const purpose = metadata.purpose;

  if (!WALLET_PI_PURPOSES.has(purpose ?? '')) {
    return;
  }

  const organizationId = metadata.organizationId;
  const amountCents = Number(metadata.amountCents ?? pi.amount_received ?? pi.amount ?? 0);

  if (!organizationId || amountCents <= 0) {
    console.warn('[WEBHOOK] Wallet PI missing org or amount', {
      paymentIntentId: pi.id,
      purpose,
      organizationId,
      amountCents
    });
    return;
  }

  const markStatus = async (status: 'succeeded' | 'failed' | 'canceled') => {
    try {
      await markTopUpStatus(pi.id, status);
    } catch (error) {
      console.warn('[WEBHOOK] Failed to mark top-up status', { paymentIntentId: pi.id, status, error });
    }
  };

  const clearPending = async () => {
    try {
      await clearPendingTopUp(organizationId, amountCents);
    } catch (error) {
      console.warn('[WEBHOOK] Failed to clear pending top-up', { paymentIntentId: pi.id, error });
    }
  };

  const recordAutoRechargeResult = async (status: 'succeeded' | 'failed', failureReason?: string | null) => {
    try {
      const { error } = await supabase.rpc('wallet_auto_recharge_result', {
        p_payment_intent_id: pi.id,
        p_status: status,
        p_amount_cents: amountCents,
        p_failure_reason: failureReason ?? null
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.warn('[WEBHOOK] Failed to record auto recharge result', { paymentIntentId: pi.id, status, error });
    }
  };

  try {
    if (event.type === 'payment_intent.succeeded') {
      await creditWallet(organizationId, amountCents, {
        transactionType: 'credit_top_up',
        referenceType: 'stripe_payment_intent',
        referenceId: pi.id,
        description: purpose === 'wallet_auto_recharge' ? 'Wallet auto-recharge' : 'Stripe wallet top-up'
      });
      await clearPending();
      await markStatus('succeeded');

      if (purpose === 'wallet_auto_recharge') {
        await recordAutoRechargeResult('succeeded');
      }

      console.log('[WEBHOOK] Wallet credited from payment intent', {
        paymentIntentId: pi.id,
        organizationId,
        amountCents,
        purpose
      });
    } else {
      await clearPending();
      const status = event.type === 'payment_intent.canceled' ? 'canceled' : 'failed';
      await markStatus(status);

      if (purpose === 'wallet_auto_recharge') {
        await recordAutoRechargeResult('failed', pi.last_payment_error?.message ?? status);
      }

      console.log('[WEBHOOK] Wallet payment intent failed/canceled', {
        paymentIntentId: pi.id,
        organizationId,
        amountCents,
        purpose,
        status
      });
    }
  } catch (error) {
    console.error('[WEBHOOK] Wallet payment intent handling failed', { paymentIntentId: pi.id, event: event.type, error });
  }
};

const handleWalletRefund = async (event: Stripe.Event) => {
  const charge = event.data.object as Stripe.Charge;
  const amountCents = Number(charge.amount_refunded || charge.amount || 0);

  if (amountCents <= 0) {
    return;
  }

  let organizationId: string | null = null;

  try {
    if (typeof charge.payment_intent === 'string') {
      const pi = await stripe.paymentIntents.retrieve(charge.payment_intent);
      const purpose = (pi.metadata ?? {}) as Record<string, string>;
      if (WALLET_PI_PURPOSES.has(purpose.purpose ?? '')) {
        organizationId = purpose.organizationId ?? null;
      }
    }
  } catch (error) {
    console.warn('[WEBHOOK] Failed to retrieve PI for refund mapping', { chargeId: charge.id, error });
  }

  if (!organizationId) {
    return;
  }

  try {
    await debitWallet(organizationId, amountCents, {
      transactionType: 'credit_refund',
      referenceType: 'stripe_charge',
      referenceId: charge.id,
      description: 'Refund of wallet top-up'
    });
    await markTopUpStatus(String(charge.payment_intent ?? ''), 'refunded');
  } catch (error) {
    console.error('[WEBHOOK] Failed to debit wallet after refund', { organizationId, chargeId: charge.id, error });
  }
};

const handleChargeDispute = async (event: Stripe.Event) => {
  const charge = event.data.object as Stripe.Charge;
  let organizationId: string | null = null;

  try {
    if (typeof charge.payment_intent === 'string') {
      const pi = await stripe.paymentIntents.retrieve(charge.payment_intent);
      const metadata = (pi.metadata ?? {}) as Record<string, string>;
      if (WALLET_PI_PURPOSES.has(metadata.purpose ?? '')) {
        organizationId = metadata.organizationId ?? null;
      }
    }
  } catch (error) {
    console.warn('[WEBHOOK] Failed to retrieve PI for dispute mapping', { chargeId: charge.id, error });
  }

  if (!organizationId) {
    return;
  }

  try {
    const { error } = await supabase
      .from('usage_wallets')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('organization_id', organizationId);

    if (error) {
      console.error('[WEBHOOK] Failed to suspend wallet due to dispute', { organizationId, error });
    }
  } catch (error) {
    console.error('[WEBHOOK] Exception while suspending wallet for dispute', { organizationId, error });
  }
};

const ensurePlanMetadata = async (subscription: Stripe.Subscription, org: OrganizationRow) => {
  const items = subscription.items?.data ?? [];
  const activeItem =
    items.find((item) => !item.deleted && (item.quantity ?? 0) > 0) ?? items[0];
  const priceId = activeItem?.price?.id;

  if (!priceId) {
    return { plan: null, planChanged: false } as const;
  }

  const plan = await getPlanFromPriceId(priceId);
  const planChanged = Boolean(plan && plan.plan_code !== org.plan_code);
  return { plan, planChanged } as const;
};

const handleSubscriptionEvent = async (event: Stripe.Event) => {
  const incoming = event.data.object as Stripe.Subscription;
  const subscriptionId = incoming.id;
  const customerId = incoming.customer as string | null;

  const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);

  if (!org) {
    console.warn('[WEBHOOK] Org not found for subscription event', {
      eventType: event.type,
      subscriptionId,
      customerId
    });
    return;
  }

  let subscription = incoming;
  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price.product']
    });
  } catch (error) {
    console.warn('[WEBHOOK] Failed to retrieve subscription, using event payload', { subscriptionId, error });
  }

  const now = new Date();
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
  const trialHasEnded = trialEnd ? now >= trialEnd : false;
  const wasTrialing = org.stripe_status === 'trialing';
  const isNoLongerTrialing = subscription.status !== 'trialing';

  const { plan, planChanged } = await ensurePlanMetadata(subscription, org);

  const updateData: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    stripe_status: subscription.status as StripeSubStatus,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    updated_at: new Date().toISOString()
  };

  if (trialHasEnded || (wasTrialing && isNoLongerTrialing)) {
    updateData.trial_ending_soon = false;
  }

  Object.assign(updateData, mapPlanFields(plan));

  if (subscription.cancel_at_period_end !== undefined) {
    updateData.cancel_at_period_end = subscription.cancel_at_period_end;
  }

  if (subscription.collection_method) {
    updateData.stripe_collection_method = subscription.collection_method;
  }

  if (subscription.pause_collection) {
    updateData.stripe_pause_collection = subscription.pause_collection;
  } else {
    updateData.stripe_pause_collection = null;
  }

  if (subscription.latest_invoice && typeof subscription.latest_invoice === 'string') {
    updateData.stripe_latest_invoice_id = subscription.latest_invoice;
  }

  if (subscription.metadata && Object.keys(subscription.metadata).length > 0) {
    updateData.stripe_subscription_metadata = subscription.metadata as Record<string, unknown>;
  }

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    updateData.status = 'provisioning';
  }

  const { error } = await supabase.from('organizations').update(updateData).eq('id', org.id);

  if (error) {
    console.error('[WEBHOOK] Failed to update organization from subscription event', { orgId: org.id, error });
    return;
  }

  if (planChanged && plan) {
    await logSubscriptionChange(org.id, event.type, org.plan_code, plan.plan_code, 0, subscription);
  }

  if (plan && plan.included_seats !== undefined) {
    try {
      const computedMaxSeats = await computeMaxSeatsForPlan(plan.plan_code, plan.included_seats);
      if (computedMaxSeats !== null) {
        await updateOrgMaxSeats(org.id, computedMaxSeats);
      }
    } catch (seatError) {
      console.warn('[WEBHOOK] Failed to compute/update max seats for plan', { orgId: org.id, seatError });
    }
  }

  // Trial lifecycle notifications (owner only)
  try {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', org.owner_id)
      .maybeSingle();

    const ownerEmail = ownerProfile?.email ?? null;
    if (ownerEmail && trialEnd) {
      // Trial started (transition into trialing)
      if (subscription.status === 'trialing' && !wasTrialing) {
        await emailService.sendTrialStarted(ownerEmail, org.name, trialEnd.toISOString());
        await logSubscriptionChange(org.id, 'trial.started_email', org.plan_code, org.plan_code, 0, subscription);
      }

      // Trial ended (transition out of trialing or reached end)
      if ((wasTrialing && isNoLongerTrialing) || trialHasEnded) {
        await emailService.sendTrialEnded(ownerEmail, org.name, trialEnd.toISOString());
        await logSubscriptionChange(org.id, 'trial.ended_email', org.plan_code, org.plan_code, 0, subscription);
      }
    }
  } catch (notifyError) {
    console.warn('[WEBHOOK] Failed to send trial lifecycle email', { orgId: org.id, notifyError });
  }
};

const handleSubscriptionDeleted = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const subscriptionId = subscription.id;
  const customerId = subscription.customer as string | null;

  const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);

  if (!org) {
    console.warn('[WEBHOOK] Org not found for subscription deletion', { subscriptionId, customerId });
    return;
  }

  const summaryBeforeCancellation = await loadSeatSummary(org.id);

  const updateData: Record<string, unknown> = {
    stripe_status: 'canceled' as StripeSubStatus,
    status: 'disabled',
    stripe_subscription_id: null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('organizations').update(updateData).eq('id', org.id);

  if (error) {
    console.error('[WEBHOOK] Failed to mark organization canceled', { orgId: org.id, error });
    return;
  }

  try {
    if (summaryBeforeCancellation.extraSeatsPurchased > 0) {
      if (summaryBeforeCancellation.extraSeatAddonPriceId && summaryBeforeCancellation.stripeSubscriptionId) {
        try {
          await syncExtraSeatAddon({
            orgId: org.id,
            stripeSubscriptionId: summaryBeforeCancellation.stripeSubscriptionId,
            addonPriceId: summaryBeforeCancellation.extraSeatAddonPriceId,
            quantity: 0
          });
        } catch (addonError) {
          console.warn('[WEBHOOK] Failed to sync extra seat addon during cancellation', { orgId: org.id, addonError });
        }

        await recordSeatEvent({
          orgId: org.id,
          action: 'subscription_cancelled_reset',
          delta: -summaryBeforeCancellation.extraSeatsPurchased,
          reason: 'subscription_cancelled'
        });
      }

      await deactivateExtraSeats({ orgId: org.id, includedSeats: summaryBeforeCancellation.includedSeats });
      await updateOrgMaxSeats(org.id, summaryBeforeCancellation.includedSeats);
    }
  } catch (seatError) {
    console.warn('[WEBHOOK] Failed to reset seat state on cancellation', { orgId: org.id, seatError });
  }
};

const handleSubscriptionPaused = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const org = await findOrganizationBySubscriptionOrCustomer(subscription.id, subscription.customer as string | null);

  if (!org) {
    return;
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_status: 'paused' as StripeSubStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  if (error) {
    console.error('[WEBHOOK] Failed to mark organization paused', { orgId: org.id, error });
    return;
  }

  await logSubscriptionChange(org.id, 'customer.subscription.paused', org.plan_code, org.plan_code, 0, subscription);
};

const handleSubscriptionResumed = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const org = await findOrganizationBySubscriptionOrCustomer(subscription.id, subscription.customer as string | null);

  if (!org) {
    return;
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_status: 'active' as StripeSubStatus,
      status: 'provisioning',
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  if (error) {
    console.error('[WEBHOOK] Failed to mark organization resumed', { orgId: org.id, error });
    return;
  }

  await logSubscriptionChange(org.id, 'customer.subscription.resumed', org.plan_code, org.plan_code, 0, subscription);
};

const handleSubscriptionPastDue = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const org = await findOrganizationBySubscriptionOrCustomer(subscription.id, subscription.customer as string | null);

  if (!org) {
    return;
  }

  const currentRetryCount = org.payment_retry_count ?? 0;
  const newRetryCount = currentRetryCount + 1;
  const retryIntervals = [1, 3, 7, 14, 30];
  const retryDays = retryIntervals[Math.min(newRetryCount - 1, retryIntervals.length - 1)];
  const nextRetryAt = new Date();
  nextRetryAt.setDate(nextRetryAt.getDate() + retryDays);

  const { error } = await supabase
    .from('organizations')
    .update({
      status: 'past_due',
      stripe_status: 'past_due' as StripeSubStatus,
      payment_action_required: true,
      last_payment_failed_at: new Date().toISOString(),
      payment_retry_count: newRetryCount,
      next_payment_retry_at: nextRetryAt.toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  if (error) {
    console.error('[WEBHOOK] Failed to mark organization past_due', { orgId: org.id, error });
    return;
  }

  await logSubscriptionChange(org.id, 'customer.subscription.past_due', org.plan_code, org.plan_code, 0, subscription);
};

const handleSubscriptionScheduleEvent = async (event: Stripe.Event) => {
  const schedule = event.data.object as Stripe.SubscriptionSchedule;
  const customerId = schedule.customer as string | null;
  const org = await findOrganizationBySubscriptionOrCustomer(null, customerId);

  if (!org) {
    return;
  }

  await logSubscriptionChange(org.id, event.type, null, null, 0, schedule);
};

const handleInvoicePaid = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null; last_payment_error?: { message?: string } | null };
  const subscriptionId = (invoice.subscription ?? null) as string | null;
  const customerId = invoice.customer as string | null;

  const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);

  if (!org) {
    return;
  }

  const updateData: Record<string, unknown> = {
    payment_action_required: false,
    last_payment_failed_at: null,
    payment_retry_count: 0,
    next_payment_retry_at: null,
    payment_failure_reason: null,
    stripe_latest_invoice_id: invoice.id,
    stripe_latest_invoice_status: invoice.status,
    stripe_status: 'active',
    status: org.status === 'disabled' ? 'active' : org.status,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('organizations').update(updateData).eq('id', org.id);

  if (error) {
    console.error('[WEBHOOK] Failed to update organization after invoice paid', { orgId: org.id, error });
    return;
  }

  await logSubscriptionChange(org.id, 'invoice.payment_succeeded', org.plan_code, org.plan_code, 0, invoice);
};

const handleInvoicePaymentFailed = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null; last_payment_error?: { message?: string } | null };
  const subscriptionId = (invoice.subscription ?? null) as string | null;
  const customerId = invoice.customer as string | null;

  const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);

  if (!org) {
    return;
  }

  const currentRetryCount = org.payment_retry_count ?? 0;
  const newRetryCount = currentRetryCount + 1;
  const retryIntervals = [1, 3, 7, 14, 30];
  const retryDays = retryIntervals[Math.min(newRetryCount - 1, retryIntervals.length - 1)];
  const nextRetryAt = new Date();
  nextRetryAt.setDate(nextRetryAt.getDate() + retryDays);

  const { error } = await supabase
    .from('organizations')
    .update({
      status: 'past_due',
      stripe_status: 'past_due' as StripeSubStatus,
      payment_action_required: true,
      last_payment_failed_at: new Date().toISOString(),
      payment_retry_count: newRetryCount,
      next_payment_retry_at: nextRetryAt.toISOString(),
      payment_failure_reason: (invoice.last_payment_error as { message?: string } | null)?.message ?? 'Payment failed',
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  if (error) {
    console.error('[WEBHOOK] Failed to update organization after invoice failed', { orgId: org.id, error });
    return;
  }

  await logSubscriptionChange(org.id, 'invoice.payment_failed', org.plan_code, org.plan_code, 0, invoice);
};

const handleInvoicePaymentActionRequired = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null; last_payment_error?: { message?: string } | null };
  const subscriptionId = (invoice.subscription ?? null) as string | null;
  const customerId = invoice.customer as string | null;

  const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);

  if (!org) {
    return;
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      payment_action_required: true,
      status: 'payment_required',
      last_payment_failed_at: new Date().toISOString(),
      payment_failure_reason: 'Payment action required',
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  if (error) {
    console.error('[WEBHOOK] Failed to mark payment action required', { orgId: org.id, error });
  }

  await logSubscriptionChange(org.id, 'invoice.payment_action_required', org.plan_code, org.plan_code, 0, invoice);
};

const handleSubscriptionTrialWillEnd = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const subscriptionId = subscription.id;
  const customerId = subscription.customer as string | null;

  const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);
  if (!org) {
    return;
  }

  // Stripe guarantees ~3-day lead time; compute from org.trial_end if present
  const trialEndIso = org.trial_end ?? null;
  const trialEnd = trialEndIso ? new Date(trialEndIso) : null;

  try {
    const { data: owner } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', org.owner_id)
      .maybeSingle();

    if (owner?.email) {
      await emailService.sendTrialEndingSoon(owner.email, org.name, 3, (trialEnd ?? new Date()).toISOString());
      await logSubscriptionChange(org.id, 'customer.subscription.trial_will_end_email', org.plan_code, org.plan_code, 0, subscription);
    }
  } catch (e) {
    console.warn('[WEBHOOK] Failed to send trial_will_end email', { orgId: org.id, e });
  }
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!signature || typeof signature !== 'string') {
    console.warn('[WEBHOOK] Missing Stripe signature header');
    return res.status(400).json({ error: 'Missing signature' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    console.error('[WEBHOOK] Signature verification failed', error);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type as Stripe.Event['type']) {
      case 'payment_intent.succeeded':
      case 'payment_intent.canceled':
      case 'payment_intent.payment_failed':
        await handleWalletPaymentIntent(event);
        break;
      case 'charge.refunded':
        await handleWalletRefund(event);
        break;
      case 'charge.dispute.created':
        await handleChargeDispute(event);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionEvent(event);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event);
        break;
      case 'customer.subscription.paused':
        await handleSubscriptionPaused(event);
        break;
      case 'customer.subscription.resumed':
        await handleSubscriptionResumed(event);
        break;
      case 'customer.subscription.past_due' as any:
        await handleSubscriptionPastDue(event);
        break;
      case 'customer.subscription.schedule.created' as any:
      case 'customer.subscription.schedule.updated' as any:
      case 'customer.subscription.schedule.canceled' as any:
      case 'customer.subscription.schedule.completed' as any:
        await handleSubscriptionScheduleEvent(event);
        break;
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;
      case 'invoice.payment_action_required':
        await handleInvoicePaymentActionRequired(event);
        break;
      case 'customer.subscription.trial_will_end':
        await handleSubscriptionTrialWillEnd(event);
        break;
      default:
        console.log('[WEBHOOK] Ignoring event', { type: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[WEBHOOK] Error handling event', { type: event.type, error });
    res.status(500).json({ error: 'Webhook handling failed' });
  }
};

