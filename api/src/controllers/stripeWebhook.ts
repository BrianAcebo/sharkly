import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
import Stripe from 'stripe';
import { OrganizationRow, StripeSubStatus, unixToISO, PlanCatalogRow } from '../types/billing';
import { deactivateExtraSeats, loadSeatSummary, recordSeatEvent, syncExtraSeatAddon, updateOrgMaxSeats } from '../utils/seats';
import { getStripeClient } from '../utils/stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Helper function to find organization by subscription ID or customer ID
const findOrganization = async (subscriptionId: string, customerId: string) => {
  let org: OrganizationRow | null = null;

  // First try to find by subscription ID
  const { data: orgData, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  org = orgData;

  if (error && error.code === 'PGRST116') {
    // No org found by subscription ID, try by customer ID
    const { data: orgByCustomerData, error: customerError } = await supabase
      .from('organizations')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();

    if (customerError) {
      console.error('Organization not found by subscription or customer ID:', { subscriptionId, customerId });
      return null;
    }

    org = orgByCustomerData;
  } else if (error) {
    console.error('Error finding organization by subscription ID:', error);
    return null;
  }

  return org;
};

// Helper function to get plan details from Stripe price ID
const getPlanFromPriceId = async (priceId: string): Promise<PlanCatalogRow | null> => {
  try {
    const { data: plan, error } = await supabase
      .from('plan_catalog')
      .select('*')
      .eq('stripe_price_id', priceId)
      .eq('active', true)
      .single();

    if (error || !plan) {
      console.error(`[WEBHOOK] Plan not found for price ID ${priceId}:`, error);
      return null;
    }

    return plan;
  } catch (error) {
    console.error(`[WEBHOOK] Error fetching plan for price ID ${priceId}:`, error);
    return null;
  }
};

const mapPlanFields = (plan: PlanCatalogRow) => ({
  plan_code: plan.plan_code,
  plan_price_cents: plan.base_price_cents,
  included_seats: plan.included_seats,
  included_minutes: plan.included_minutes,
  included_sms: plan.included_sms,
  included_emails: plan.included_emails
});

// Helper function to log subscription changes
const logSubscriptionChange = async (orgId: string, event: string, fromPlan: string | null, toPlan: string | null, prorationCents: number = 0, rawData: unknown) => {
  try {
    const { error } = await supabase
      .from('subscription_ledger')
      .insert({
        org_id: orgId,
        stripe_subscription_id: (rawData as Record<string, unknown>).id as string,
        event,
        from_plan: fromPlan,
        to_plan: toPlan,
        proration_cents: prorationCents,
        raw: rawData as Record<string, unknown>
      });

    if (error) {
      console.error(`[WEBHOOK] Error logging subscription change:`, error);
    }
  } catch (error) {
    console.error(`[WEBHOOK] Error logging subscription change:`, error);
  }
};

// Stub function for usage rollup (to be implemented later)
const triggerUsageRollup = async (organizationId: string, subscriptionId: string) => {
  console.log(`[USAGE_ROLLUP] Triggering rollup for org ${organizationId}, subscription ${subscriptionId}`);
  // TODO: Implement actual usage rollup logic
  // This should aggregate usage for the current period and push metered usage to Stripe
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('[WEBHOOK] Incoming request', {
    path: req.path,
    method: req.method,
    hasAuthHeader: Boolean(req.headers.authorization),
    contentType: req.headers['content-type']
  });

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    console.log('[WEBHOOK] Signature verified', {
      eventId: event.id,
      eventType: event.type,
      livemode: event.livemode
    });
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  console.log(`[WEBHOOK] Processing event: ${event.type} (livemode: ${event.livemode})`);

  try {
    switch (event.type as string) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionEvent(event);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event);
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

      case 'customer.subscription.past_due':
        await handleSubscriptionPastDue(event);
        break;

      case 'customer.subscription.schedule.created':
        await handleSubscriptionScheduleCreated(event);
        break;

      case 'customer.subscription.schedule.updated':
        await handleSubscriptionScheduleUpdated(event);
        break;

      case 'customer.subscription.schedule.canceled':
        await handleSubscriptionScheduleCanceled(event);
        break;

      case 'customer.subscription.schedule.completed':
        await handleSubscriptionScheduleCompleted(event);
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

      case 'invoice.finalized':
        await handleInvoiceFinalized(event);
        break;

      case 'invoice.upcoming':
        await handleInvoiceUpcoming(event);
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

const handleSubscriptionEvent = async (event: Stripe.Event) => {
  const incomingSubscription = event.data.object as Stripe.Subscription;
  const customerId = incomingSubscription.customer as string;

  console.log(`[WEBHOOK] Processing subscription ${incomingSubscription.id} for customer ${customerId}`);

  const org = await findOrganization(incomingSubscription.id, customerId);
  if (!org) {
    console.error(`[WEBHOOK] Organization not found for subscription ${incomingSubscription.id}`);
    return;
  }

  let subscription: Stripe.Subscription = incomingSubscription;
  try {
    subscription = await stripe.subscriptions.retrieve(incomingSubscription.id, {
      expand: ['items.data.price.product']
    });
    console.log(`[WEBHOOK] Retrieved latest subscription ${subscription.id} for sync`);
  } catch (retrieveError) {
    console.warn('[WEBHOOK] Failed to retrieve latest subscription, falling back to event payload:', retrieveError);
  }

  // Check if trial has ended (status changed from trialing to active/canceled)
  const now = new Date();
  const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
  const trialHasEnded = trialEndDate && now >= trialEndDate;
  const wasTrialing = org.stripe_status === 'trialing';
  const isNoLongerTrialing = subscription.status !== 'trialing';

  // Get the current plan from the subscription
  const subscriptionItems = subscription.items?.data ?? [];
  if (subscriptionItems.length === 0) {
    console.warn(`[WEBHOOK] Subscription ${subscription.id} has no items, skipping plan sync`);
  }

  const activeItem =
    subscriptionItems.find((item) => {
      const quantity = item.quantity ?? 0;
      const isActive = !item.deleted && quantity > 0;
      return isActive;
    }) ?? subscriptionItems[0];

  const currentPriceId = activeItem?.price.id;
  let currentPlan: PlanCatalogRow | null = null;
  let planChanged = false;
  const fromPlan = org.plan_code;

  if (currentPriceId) {
    currentPlan = await getPlanFromPriceId(currentPriceId);
    if (currentPlan && currentPlan.plan_code !== org.plan_code) {
      planChanged = true;
      console.log(`[WEBHOOK] Plan change detected: ${org.plan_code} -> ${currentPlan.plan_code} (price ${currentPriceId})`);
    } else if (!currentPlan) {
      console.warn(`[WEBHOOK] No matching plan found for price ${currentPriceId}, skipping plan sync`);
    }
  }

  // Update subscription mirrors
  const updateData: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    stripe_status: subscription.status as StripeSubStatus,
    trial_end: subscription.trial_end ? unixToISO(subscription.trial_end) : null,
    updated_at: new Date().toISOString()
  };

  // Clear trial_ending_soon flag if trial has ended
  if (trialHasEnded || (wasTrialing && isNoLongerTrialing)) {
    updateData.trial_ending_soon = false;
    console.log(`[WEBHOOK] Trial ended for organization ${org.id}, clearing trial_ending_soon flag`);
  }

  if (currentPlan) {
    Object.assign(updateData, mapPlanFields(currentPlan));
    console.log('[WEBHOOK] Plan metadata from catalog', {
      currentPriceId,
      catalogPlanCode: currentPlan.plan_code,
      catalogName: currentPlan.name,
      included: {
        seats: currentPlan.included_seats,
        minutes: currentPlan.included_minutes,
        sms: currentPlan.included_sms,
        emails: currentPlan.included_emails
      }
    });
  }

  if (subscription.cancel_at_period_end !== undefined) {
    console.log('[WEBHOOK] Stripe cancel_at_period_end', {
      value: subscription.cancel_at_period_end
    });
    updateData.cancel_at_period_end = subscription.cancel_at_period_end;
  }

  if (subscription.current_period_start) {
    updateData.current_period_start = unixToISO(subscription.current_period_start);
  }

  if (subscription.current_period_end) {
    updateData.current_period_end = unixToISO(subscription.current_period_end);
  }

  if (subscription.collection_method) {
    updateData.stripe_collection_method = subscription.collection_method;
  }

  if (subscription.pause_collection) {
    console.log('[WEBHOOK] Stripe pause_collection', subscription.pause_collection);
    updateData.stripe_pause_collection = subscription.pause_collection as Stripe.Subscription.PauseCollection;
  } else {
    updateData.stripe_pause_collection = null;
  }

  if (subscription.latest_invoice && typeof subscription.latest_invoice === 'string') {
    updateData.stripe_latest_invoice_id = subscription.latest_invoice;
  }

  if (subscription.metadata && Object.keys(subscription.metadata).length > 0) {
    updateData.stripe_subscription_metadata = subscription.metadata;
  }

  console.log('[WEBHOOK] Prepared organization update payload', {
    orgId: org.id,
    stripeStatus: updateData.stripe_status,
    planCode: updateData.plan_code,
    planPrice: updateData.plan_price_cents
  });

  // Note: current_period_start and current_period_end are not available in Stripe Basil API
  // These would need to be tracked separately or retrieved from Stripe API if needed

  // Update organization with subscription data
  const { error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('id', org.id);

  if (error) {
    console.error('Error updating organization subscription data:', error, {
      orgId: org.id,
      updateData
    });
    throw error;
  }

  // Update plan details if plan changed
  if (planChanged && currentPlan) {
    // Log the plan change
    await logSubscriptionChange(
      org.id,
      event.type,
      fromPlan,
      currentPlan.plan_code,
      0, // TODO: Calculate proration from Stripe data
      subscription
    );
  }

  console.log(`[WEBHOOK] Updated organization ${org.id} with subscription data`);

  // Ensure metered voice usage item exists on the subscription (env-aware overage catalog)
  try {
    const stripeClient = getStripeClient();
    const isLive = process.env.NODE_ENV === 'production' || process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
    const overageCode = isLive ? 'voice_minutes_overage' : 'voice_minutes_overage_test';

    const { data: overage } = await supabase
      .from('usage_overage_catalog')
      .select('stripe_price_id')
      .eq('overage_code', overageCode)
      .eq('active', true)
      .single();

    if (overage?.stripe_price_id) {
      // If this is the main plan subscription and it's trialing, we do NOT attach the usage item here
      // Instead, a separate usage-only subscription handles usage during trial.
      if (subscription.status !== 'trialing') {
        const sub = await stripeClient.subscriptions.retrieve(subscription.id, { expand: ['items.data.price'] });
        const exists = sub.items.data.some((item) => item.price?.id === overage.stripe_price_id);
        if (!exists) {
          await stripeClient.subscriptionItems.create({
            subscription: subscription.id,
            price: overage.stripe_price_id,
            proration_behavior: 'none'
          });
          console.log('[WEBHOOK] Added voice usage metered item to subscription (post-trial)', {
            subscriptionId: subscription.id,
            price: overage.stripe_price_id
          });
        }

        // Cancel any usage-only subscription once the plan is out of trial
        const usageSubs = await stripeClient.subscriptions.list({ customer: customerId, status: 'active', limit: 100 });
        for (const s of usageSubs.data) {
          if ((s.metadata as Record<string, string> | undefined)?.usage_only === 'voice') {
            await stripeClient.subscriptions.cancel(s.id, { prorate: false });
            console.log('[WEBHOOK] Canceled usage-only subscription after trial end', { usageSubscriptionId: s.id });
          }
        }
      }
    } else {
      console.warn('[WEBHOOK] No active overage catalog row found for env when ensuring metered item', { overageCode });
    }
  } catch (ensureErr) {
    console.warn('[WEBHOOK] Failed to ensure metered voice item on subscription:', ensureErr);
  }
};

const handleTrialWillEnd = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  console.log(`[WEBHOOK] Trial will end for subscription ${subscription.id} for customer ${customerId}`);

  const org = await findOrganization(subscription.id, customerId);
  if (!org) {
    console.error(`[WEBHOOK] Organization not found for subscription ${subscription.id}`);
    return;
  }

  console.log(`[WEBHOOK] Trial ending soon for organization ${org.id} - trial ends at ${subscription.trial_end}`);
  
  // Set trial_ending_soon flag in the database
  const { error } = await supabase
    .from('organizations')
    .update({ 
      trial_ending_soon: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  if (error) {
    console.error('Error setting trial_ending_soon flag:', error);
  } else {
    console.log(`[WEBHOOK] Set trial_ending_soon flag for organization ${org.id}`);
  }
  
  // TODO: Enqueue email notification
  // await sendTrialEndingEmail(org.id, subscription.trial_end);
};

const handleSubscriptionDeleted = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  console.log(`[WEBHOOK] Processing subscription deletion ${subscription.id} for customer ${customerId}`);

  const org = await findOrganization(subscription.id, customerId);
  if (!org) {
    console.error(`[WEBHOOK] Organization not found for deleted subscription ${subscription.id}`);
    return;
  }

  // Set subscription as canceled and disable organization access
  const summaryBeforeCancellation = await loadSeatSummary(org.id);

  const updateData: Record<string, unknown> = {
    stripe_status: 'canceled' as StripeSubStatus,
    org_status: 'disabled',
    stripe_subscription_id: null,
    updated_at: new Date().toISOString()
  };

  // Optionally disable organization immediately
  // updateData.org_status = 'disabled' as OrgStatus;

  const { error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('id', org.id);

  if (error) {
    console.error('Error updating organization for deleted subscription:', error);
    throw error;
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
          console.warn('[WEBHOOK] Failed to update extra seat addon during cancellation:', addonError);
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
  } catch (syncError) {
    console.warn('[WEBHOOK] Failed to reset seat state during cancellation:', syncError);
  }

  console.log(`[WEBHOOK] Marked subscription as canceled for organization ${org.id}`);

  // Reset current-period voice usage so analytics show 0 immediately after cancellation
  try {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { error: usageDelErr } = await supabase
      .from('voice_usage')
      .delete()
      .eq('organization_id', org.id)
      .gte('usage_date', monthStart.toISOString());

    if (usageDelErr) {
      console.warn('[WEBHOOK] Failed to reset voice usage for canceled org:', usageDelErr);
    } else {
      console.log('[WEBHOOK] Reset current-period voice usage after cancellation', {
        orgId: org.id,
        from: monthStart.toISOString()
      });
    }

    // Reset SMS usage for the current period
    const { error: smsDelErr } = await supabase
      .from('sms_usage')
      .delete()
      .eq('organization_id', org.id)
      .gte('usage_date', monthStart.toISOString());
    if (smsDelErr) {
      console.warn('[WEBHOOK] Failed to reset SMS usage for canceled org:', smsDelErr);
    }

    // Reset call history for the current period
    const { error: callsDelErr } = await supabase
      .from('call_history')
      .delete()
      .eq('organization_id', org.id)
      .gte('call_start_time', monthStart.toISOString());
    if (callsDelErr) {
      console.warn('[WEBHOOK] Failed to reset call history for canceled org:', callsDelErr);
    }

    // Zero out monthly billing row for this month and also cancel any pending usage-only invoice draft
    const monthISO = new Date(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), 1).toISOString().split('T')[0];
    const { error: mbUpdateErr } = await supabase
      .from('monthly_billing')
      .upsert({
        organization_id: org.id,
        billing_month: monthISO,
        sms_count: 0,
        sms_cost: 0,
        voice_minutes: 0,
        voice_cost: 0,
        total_cost: 0,
        currency: 'USD',
        status: 'pending',
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id,billing_month' });
    if (mbUpdateErr) {
      console.warn('[WEBHOOK] Failed to zero monthly_billing for canceled org:', mbUpdateErr);
    }

    try {
      const stripeClient = getStripeClient();
      const invoices = await stripeClient.invoices.list({ customer: org.stripe_customer_id as string, status: 'draft', limit: 10 });
      for (const inv of invoices.data) {
        // If invoice looks like the usage-only one (no plan items, has metered item), we can void it
        try {
          await stripeClient.invoices.voidInvoice(inv.id);
          console.log('[WEBHOOK] Voided draft invoice on cancellation', { invoiceId: inv.id });
        } catch (voidErr) {
          console.warn('[WEBHOOK] Failed to void draft invoice:', voidErr);
        }
      }
    } catch (invErr) {
      console.warn('[WEBHOOK] Failed to scan and void draft invoices:', invErr);
    }
  } catch (resetErr) {
    console.warn('[WEBHOOK] Exception while resetting voice usage after cancellation:', resetErr);
  }
};

const handleInvoiceUpcoming = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string;
  const customerId = invoice.customer as string;

  console.log(`[WEBHOOK] Processing upcoming invoice for subscription ${subscriptionId}`);

  const org = await findOrganization(subscriptionId, customerId);
  if (!org) {
    console.error(`[WEBHOOK] Organization not found for upcoming invoice ${subscriptionId}`);
    return;
  }

  // Usage rollup: compute billed minutes since current period start
  try {
    // Decide whether this upcoming invoice should carry usage
    let shouldPostUsage = false;
    try {
      const stripeClient = getStripeClient();
      const sub = await stripeClient.subscriptions.retrieve(subscriptionId);
      const isUsageOnly = ((sub.metadata as Record<string, string> | undefined)?.usage_only === 'voice');
      const isTrialing = sub.status === 'trialing';
      // Post usage only if this is the usage-only subscription, or if this is the main (non-trial) subscription
      shouldPostUsage = isUsageOnly || !isTrialing;
      if (!shouldPostUsage) {
        console.log('[WEBHOOK] Skipping usage post for trialing main subscription');
        return;
      }
    } catch (sErr) {
      console.warn('[WEBHOOK] Failed to retrieve subscription for gating; proceeding with rollup by default', sErr);
      shouldPostUsage = true;
    }

    // Determine current anchor window: from month start to now (simple month-based window for now)
    const periodStart = new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1).toISOString();
    const periodEnd = new Date().toISOString();

    const { data: usageRows, error: usageErr } = await supabase
      .from('voice_usage')
      .select('call_duration_minutes')
      .eq('organization_id', org.id)
      .gte('usage_date', periodStart)
      .lte('usage_date', periodEnd);
    if (usageErr) {
      console.warn('[WEBHOOK] Failed to load voice usage for rollup:', usageErr);
      return;
    }

    const totalMinutes = (usageRows || []).reduce((sum, r) => sum + Number(r.call_duration_minutes || 0), 0);

    // Load included minutes from org; default to 0 if absent
    const included = (org as unknown as { included_minutes?: number }).included_minutes ?? 0;
    const overageMinutes = Math.max(0, Math.ceil(totalMinutes - included));

    console.log('[WEBHOOK] Rollup minutes', { totalMinutes, included, overageMinutes });

    if (overageMinutes > 0 && shouldPostUsage) {
      try {
        const stripeClient = getStripeClient();
        await stripeClient.billing.meterEvents.create({
          event_name: 'aggregate_by_sum',
          timestamp: Math.floor(Date.now() / 1000),
          payload: {
            value: String(overageMinutes),
            stripe_customer_id: org.stripe_customer_id as string
          }
        });
        console.log('[WEBHOOK] Posted overage minutes to meter', { overageMinutes });
      } catch (meterErr) {
        console.warn('[WEBHOOK] Failed posting rollup to Stripe meter:', meterErr);
      }
    } else {
      console.log('[WEBHOOK] No overage minutes to post');
    }
  } catch (rollupErr) {
    console.warn('[WEBHOOK] Exception during usage rollup:', rollupErr);
  }
};

const handleInvoiceFinalized = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string;
  const customerId = invoice.customer as string;

  console.log(`[WEBHOOK] Processing finalized invoice for subscription ${subscriptionId}`);

  const org = await findOrganization(subscriptionId, customerId);
  if (!org) {
    console.error(`[WEBHOOK] Organization not found for finalized invoice ${subscriptionId}`);
    return;
  }

  // Mark rollup as finalized (no further usage pushes for this period)
  console.log(`[WEBHOOK] Marking rollup as finalized for organization ${org.id}`);
  // TODO: Implement rollup finalization logic
};


const handleInvoicePaid = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string;
  const customerId = invoice.customer as string;

  console.log(`[WEBHOOK] Processing paid invoice for subscription ${subscriptionId}`);

  const org = await findOrganization(subscriptionId, customerId);
  if (!org) {
    console.error(`[WEBHOOK] Organization not found for paid invoice ${subscriptionId}`);
    return;
  }

  const updateData: Record<string, unknown> = {
    payment_action_required: false,
    last_payment_failed_at: null,
    payment_retry_count: 0,
    next_payment_retry_at: null,
    payment_failure_reason: null,
    updated_at: new Date().toISOString()
  };

  if (invoice.paid || invoice.status === 'paid') {
    updateData.stripe_latest_invoice_id = invoice.id;
    updateData.stripe_latest_invoice_status = invoice.status;
    updateData.stripe_status = 'active';
  }

  const { error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('id', org.id);

  if (error) {
    console.error('Error updating organization for paid invoice:', error);
    throw error;
  }

  await logSubscriptionChange(
    org.id,
    'invoice.payment_succeeded',
    org.plan_code,
    org.plan_code,
    0,
    invoice
  );

  console.log(`[WEBHOOK] Cleared payment failure flags for organization ${org.id}`);
};

// New webhook handlers for subscription lifecycle events

const handleSubscriptionPaused = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  console.log(`[WEBHOOK] Processing subscription paused ${subscription.id} for customer ${customerId}`);

  const org = await findOrganization(subscription.id, customerId);
  if (!org) {
    console.error(`[WEBHOOK] Organization not found for paused subscription ${subscription.id}`);
    return;
  }

  // Update subscription status to paused
  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_status: 'paused' as StripeSubStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  if (error) {
    console.error('Error updating organization for paused subscription:', error);
    throw error;
  }

  // Log the pause event
  await logSubscriptionChange(
    org.id,
    'customer.subscription.paused',
    org.plan_code,
    org.plan_code,
    0,
    subscription
  );

  console.log(`[WEBHOOK] Marked subscription as paused for organization ${org.id}`);
};

const handleSubscriptionResumed = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  console.log(`[WEBHOOK] Processing subscription resumed ${subscription.id} for customer ${customerId}`);

  const org = await findOrganization(subscription.id, customerId);
  if (!org) {
    console.error(`[WEBHOOK] Organization not found for resumed subscription ${subscription.id}`);
    return;
  }

  // Update subscription status to active
  const { error } = await supabase
    .from('organizations')
    .update({
      stripe_status: 'active' as StripeSubStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  if (error) {
    console.error('Error updating organization for resumed subscription:', error);
    throw error;
  }

  // Log the resume event
  await logSubscriptionChange(
    org.id,
    'customer.subscription.resumed',
    org.plan_code,
    org.plan_code,
    0,
    subscription
  );

  console.log(`[WEBHOOK] Marked subscription as resumed for organization ${org.id}`);
};

const handleSubscriptionPastDue = async (event: Stripe.Event) => {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  console.log(`[WEBHOOK] Processing subscription past due ${subscription.id} for customer ${customerId}`);

  const org = await findOrganization(subscription.id, customerId);
  if (!org) {
    console.error(`[WEBHOOK] Organization not found for past due subscription ${subscription.id}`);
    return;
  }

  // Update organization status to past_due
  const { error } = await supabase
    .from('organizations')
    .update({
      org_status: 'past_due',
      stripe_status: 'past_due' as StripeSubStatus,
      payment_action_required: true,
      last_payment_failed_at: new Date().toISOString(),
      payment_failure_reason: 'Subscription past due',
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  if (error) {
    console.error('Error updating organization for past due subscription:', error);
    throw error;
  }

  // Log the past due event
  await logSubscriptionChange(
    org.id,
    'customer.subscription.past_due',
    org.plan_code,
    org.plan_code,
    0,
    subscription
  );

  console.log(`[WEBHOOK] Marked subscription as past due for organization ${org.id}`);
};

const handleSubscriptionScheduleCreated = async (event: Stripe.Event) => {
  const schedule = event.data.object as Stripe.SubscriptionSchedule;
  const customerId = schedule.customer as string;

  console.log(`[WEBHOOK] Processing subscription schedule created ${schedule.id} for customer ${customerId}`);

  // Find organization by customer ID
  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !org) {
    console.error(`[WEBHOOK] Organization not found for schedule ${schedule.id}`);
    return;
  }

  // Log the schedule creation
  await logSubscriptionChange(
    org.id,
    'customer.subscription.schedule.created',
    null,
    null,
    0,
    schedule
  );

  console.log(`[WEBHOOK] Logged schedule creation for organization ${org.id}`);
};

const handleSubscriptionScheduleUpdated = async (event: Stripe.Event) => {
  const schedule = event.data.object as Stripe.SubscriptionSchedule;
  const customerId = schedule.customer as string;

  console.log(`[WEBHOOK] Processing subscription schedule updated ${schedule.id} for customer ${customerId}`);

  // Find organization by customer ID
  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !org) {
    console.error(`[WEBHOOK] Organization not found for schedule ${schedule.id}`);
    return;
  }

  // Log the schedule update
  await logSubscriptionChange(
    org.id,
    'customer.subscription.schedule.updated',
    null,
    null,
    0,
    schedule
  );

  console.log(`[WEBHOOK] Logged schedule update for organization ${org.id}`);
};

const handleSubscriptionScheduleCanceled = async (event: Stripe.Event) => {
  const schedule = event.data.object as Stripe.SubscriptionSchedule;
  const customerId = schedule.customer as string;

  console.log(`[WEBHOOK] Processing subscription schedule canceled ${schedule.id} for customer ${customerId}`);

  // Find organization by customer ID
  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !org) {
    console.error(`[WEBHOOK] Organization not found for schedule ${schedule.id}`);
    return;
  }

  // Log the schedule cancellation
  await logSubscriptionChange(
    org.id,
    'customer.subscription.schedule.canceled',
    null,
    null,
    0,
    schedule
  );

  console.log(`[WEBHOOK] Logged schedule cancellation for organization ${org.id}`);
};

const handleSubscriptionScheduleCompleted = async (event: Stripe.Event) => {
  const schedule = event.data.object as Stripe.SubscriptionSchedule;
  const customerId = schedule.customer as string;

  console.log(`[WEBHOOK] Processing subscription schedule completed ${schedule.id} for customer ${customerId}`);

  // Find organization by customer ID
  const { data: org, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !org) {
    console.error(`[WEBHOOK] Organization not found for schedule ${schedule.id}`);
    return;
  }

  // Log the schedule completion
  await logSubscriptionChange(
    org.id,
    'customer.subscription.schedule.completed',
    null,
    null,
    0,
    schedule
  );

  console.log(`[WEBHOOK] Logged schedule completion for organization ${org.id}`);
};

const handleInvoicePaymentActionRequired = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string;
  const customerId = invoice.customer as string;

  console.log(`[WEBHOOK] Processing payment action required for subscription ${subscriptionId}`);

  const org = await findOrganization(subscriptionId, customerId);
  if (!org) {
    console.error(`[WEBHOOK] Organization not found for payment action required ${subscriptionId}`);
    return;
  }

  // Set payment action required flag and update organization status
  console.log(`[WEBHOOK] Setting payment action required flag for organization ${org.id}`);
  
  const { error } = await supabase
    .from('organizations')
    .update({
      payment_action_required: true,
      org_status: 'payment_required',
      last_payment_failed_at: new Date().toISOString(),
      payment_failure_reason: 'Payment action required',
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  if (error) {
    console.error('Error updating organization for payment action required:', error);
    throw error;
  }
  
  // Log the payment action required event
  await logSubscriptionChange(
    org.id,
    'invoice.payment_action_required',
    org.plan_code,
    org.plan_code,
    0,
    invoice
  );

  console.log(`[WEBHOOK] Logged payment action required for organization ${org.id}`);
};

const handleInvoicePaymentFailed = async (event: Stripe.Event) => {
  const invoice = event.data.object as Stripe.Invoice;
  const subscriptionId = (invoice as unknown as Record<string, unknown>).subscription as string;
  const customerId = invoice.customer as string;

  console.log(`[WEBHOOK] Processing payment failed for subscription ${subscriptionId}`);

  const org = await findOrganization(subscriptionId, customerId);
  if (!org) {
    console.error(`[WEBHOOK] Organization not found for payment failed ${subscriptionId}`);
    return;
  }

  console.log(`[WEBHOOK] Payment failed for organization ${org.id}, setting to past_due status`);
  
  // Calculate retry count and next retry time
  const currentRetryCount = org.payment_retry_count || 0;
  const newRetryCount = currentRetryCount + 1;
  
  // Set next retry time based on retry count (exponential backoff)
  const retryIntervals = [1, 3, 7, 14, 30]; // days
  const retryDays = retryIntervals[Math.min(newRetryCount - 1, retryIntervals.length - 1)];
  const nextRetryAt = new Date();
  nextRetryAt.setDate(nextRetryAt.getDate() + retryDays);
  
  // Determine if we should enable dunning (after 3rd retry)
  const shouldEnableDunning = newRetryCount >= 3;
  
  // Update organization with payment failure details
  const { error } = await supabase
    .from('organizations')
    .update({
      org_status: 'past_due',
      payment_action_required: true,
      last_payment_failed_at: new Date().toISOString(),
      payment_retry_count: newRetryCount,
      next_payment_retry_at: nextRetryAt.toISOString(),
      payment_failure_reason: (invoice as unknown as { last_payment_error?: { message?: string } }).last_payment_error?.message || 'Payment failed',
      dunning_enabled: shouldEnableDunning,
      updated_at: new Date().toISOString()
    })
    .eq('id', org.id);

  if (error) {
    console.error('Error updating organization for payment failure:', error);
    throw error;
  }
  
  // Log the payment failed event
  await logSubscriptionChange(
    org.id,
    'invoice.payment_failed',
    org.plan_code,
    org.plan_code,
    0,
    invoice
  );

  console.log(`[WEBHOOK] Updated organization ${org.id} to past_due status (retry ${newRetryCount}/${retryIntervals.length})`);
};