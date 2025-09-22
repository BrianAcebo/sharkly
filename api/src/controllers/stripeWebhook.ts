import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
import Stripe from 'stripe';
import { OrganizationRow, StripeSubStatus, unixToISO, PlanCatalogRow } from '../types/billing';

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

// Helper function to update organization plan details
const updateOrganizationPlan = async (orgId: string, plan: PlanCatalogRow) => {
  const updateData = {
    plan_code: plan.plan_code,
    plan_price_cents: plan.base_price_cents,
    included_seats: plan.included_seats,
    included_minutes: plan.included_minutes,
    included_sms: plan.included_sms,
    included_emails: plan.included_emails,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('id', orgId);

  if (error) {
    console.error(`[WEBHOOK] Error updating organization plan for ${orgId}:`, error);
    throw error;
  }

  console.log(`[WEBHOOK] Updated organization ${orgId} plan to ${plan.plan_code}`);
};

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

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
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

      case 'invoice.upcoming':
        await handleInvoiceUpcoming(event);
        break;

      case 'invoice.finalized':
        await handleInvoiceFinalized(event);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event);
        break;

      case 'invoice.payment_action_required':
        await handleInvoicePaymentActionRequired(event);
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
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  console.log(`[WEBHOOK] Processing subscription ${subscription.id} for customer ${customerId}`);

  const org = await findOrganization(subscription.id, customerId);
  if (!org) {
    console.error(`[WEBHOOK] Organization not found for subscription ${subscription.id}`);
    return;
  }

  // Check if trial has ended (status changed from trialing to active/canceled)
  const now = new Date();
  const trialEndDate = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
  const trialHasEnded = trialEndDate && now >= trialEndDate;
  const wasTrialing = org.stripe_status === 'trialing';
  const isNoLongerTrialing = subscription.status !== 'trialing';

  // Get the current plan from the subscription
  const currentPriceId = subscription.items.data[0]?.price.id;
  let currentPlan: PlanCatalogRow | null = null;
  let planChanged = false;
  const fromPlan = org.plan_code;

  if (currentPriceId) {
    currentPlan = await getPlanFromPriceId(currentPriceId);
    if (currentPlan && currentPlan.plan_code !== org.plan_code) {
      planChanged = true;
      console.log(`[WEBHOOK] Plan change detected: ${org.plan_code} -> ${currentPlan.plan_code}`);
    }
  }

  // Update subscription mirrors
  const updateData = {
    stripe_subscription_id: subscription.id,
    stripe_status: subscription.status as StripeSubStatus,
    trial_end: subscription.trial_end ? unixToISO(subscription.trial_end) : null,
    updated_at: new Date().toISOString()
  };

  // Clear trial_ending_soon flag if trial has ended
  if (trialHasEnded || (wasTrialing && isNoLongerTrialing)) {
    (updateData as Record<string, unknown>).trial_ending_soon = false;
    console.log(`[WEBHOOK] Trial ended for organization ${org.id}, clearing trial_ending_soon flag`);
  }

  // Add cancel_at_period_end if the column exists
  if (subscription.cancel_at_period_end !== undefined) {
    (updateData as Record<string, unknown>).cancel_at_period_end = subscription.cancel_at_period_end;
  }

  // Note: current_period_start and current_period_end are not available in Stripe Basil API
  // These would need to be tracked separately or retrieved from Stripe API if needed

  // Update organization with subscription data
  const { error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('id', org.id);

  if (error) {
    console.error('Error updating organization subscription data:', error);
    throw error;
  }

  // Update plan details if plan changed
  if (planChanged && currentPlan) {
    await updateOrganizationPlan(org.id, currentPlan);
    
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
  const updateData: Record<string, unknown> = {
    stripe_status: 'canceled' as StripeSubStatus,
    org_status: 'disabled',
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

  console.log(`[WEBHOOK] Marked subscription as canceled for organization ${org.id}`);
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

  // Trigger usage rollup
  await triggerUsageRollup(org.id, subscriptionId);
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

  // Clear payment failure flags; do not auto-resume, rely on webhook-updated status
  const shouldResume = false;
  
  console.log(`[WEBHOOK] Clearing payment failure flags for organization ${org.id}${shouldResume ? ' and resuming' : ''}`);
  
  const updateData: Record<string, unknown> = {
    payment_action_required: false,
    dunning_enabled: false,
    last_payment_failed_at: null,
    payment_retry_count: 0,
    next_payment_retry_at: null,
    payment_failure_reason: null,
    updated_at: new Date().toISOString()
  };

  // Do not mutate org_status here; webhook lifecycle should drive status

  const { error } = await supabase
    .from('organizations')
    .update(updateData)
    .eq('id', org.id);

  if (error) {
    console.error('Error clearing payment failure flags:', error);
    throw error;
  }

  // Log the payment success event
  await logSubscriptionChange(
    org.id,
    'invoice.payment_succeeded',
    org.plan_code,
    org.plan_code,
    0,
    invoice
  );

  console.log(`[WEBHOOK] Cleared payment failure flags for organization ${org.id}${shouldResume ? ' and resumed to active' : ''}`);
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