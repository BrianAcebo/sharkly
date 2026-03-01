import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import Stripe from 'stripe';
import { 
  StripeSubStatus, 
  OrgStatus, 
  OrganizationRow, 
  OrgOnboardRequest, 
  OrgOnboardResponse, 
  ApiError, 
  unixToISO,
  CustomerPaymentMethodSummary
} from '../types/billing.js';
import { getStripeClient } from '../utils/stripe.js';
import { ensureWallet } from '../utils/wallet.js';

const stripe = getStripeClient();

async function createSetupIntentForCustomer(opts: { customerId: string; organizationId?: string | null; userId?: string | null; }) {
  const si = await stripe.setupIntents.create({
    customer: opts.customerId,
    usage: 'off_session',
    payment_method_types: ['card'],
    metadata: {
      organization_id: opts.organizationId ?? '',
      user_id: opts.userId ?? '',
      purpose: 'trial_card_on_file',
    },
  });
  return si.client_secret || null;
}

export const onboardOrganization = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' } as ApiError);
    }

    const {
      orgId,
      name,
      planCode,
      trialDays,
      tz = 'America/New_York',
      paymentMethodId: paymentMethodIdFromRequest,
      useExistingPaymentMethod
    }: OrgOnboardRequest = req.body;

    const isRenewal = Boolean(orgId);

    // Validate required fields
    if (!name || !planCode) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Missing required fields: name, planCode' 
      } as ApiError);
    }

    // Get the plan from catalog
    const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
    const { data: plan, error: planError } = await supabase
      .from('plan_catalog')
      .select('*')
      .eq('plan_code', planCode)
      .eq('env', env)
      .eq('active', true)
      .single();

    if (planError || !plan) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid plan code or plan not active' 
      } as ApiError);
    }

    // Create organization immediately if orgId is not provided
    if (!orgId) {
      // Reuse any existing pending org owned by this user
      let pendingOrg: OrganizationRow | null = null;
      try {
        const { data: existingPending } = await supabase
          .from('organizations')
          .select('*')
          .eq('owner_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        pendingOrg = (existingPending as unknown as OrganizationRow) || null;
      } catch (lookupErr) {
        console.warn('[onboard] failed to lookup existing pending org (continuing)', lookupErr);
      }

      if (!pendingOrg) {
        const { data: created, error: pendingErr } = await supabase
          .from('organizations')
          .insert({
            name,
            owner_id: userId,
            status: 'active',
            stripe_status: 'incomplete',
            plan_code: planCode,
            included_seats: plan.included_seats,
            // initialize new credit fields from plan
            included_credits_monthly: plan.included_credits,
            included_credits_remaining: plan.included_credits,
            // legacy field maintained temporarily for compatibility
            included_credits: plan.included_credits,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select('*')
          .single();

        if (pendingErr || !created) {
          console.error('Error creating pending organization:', pendingErr);
          return res.status(500).json({ ok: false, error: 'Failed to create organization' } as ApiError);
        }
        pendingOrg = created as unknown as OrganizationRow;
      }

      // Upsert owner membership
      try {
        await supabase
          .from('user_organizations')
          .upsert({ user_id: userId, organization_id: pendingOrg.id, role: 'owner' }, { onConflict: 'user_id,organization_id' });
      } catch (mErr) {
        console.warn('[onboard] membership upsert warning', mErr);
      }

      // Create Stripe Customer for new org's
      let stripeCustomerId: string | null = null;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          name,
          email: req.user?.email || undefined,
          metadata: { user_id: userId, organization_id: pendingOrg.id, plan_code: planCode }
        });
        stripeCustomerId = customer.id;
      }

      // Persist customer on org
      await supabase.from('organizations').update({ stripe_customer_id: stripeCustomerId, updated_at: new Date().toISOString() }).eq('id', pendingOrg.id);

      // Do not mutate customer default payment method here; rely on client confirmation

      // Reuse an existing relevant subscription (same org) if one exists
      try {
        const existingList = await stripe.subscriptions.list({
          customer: stripeCustomerId!,
          status: 'all',
          limit: 10
        });
        const candidate = existingList.data.find((s) =>
          pendingOrg && s.metadata?.organization_id === pendingOrg.id &&
          ['incomplete','trialing','active','past_due'].includes(s.status)
        );
        if (candidate) {
          const reused = await stripe.subscriptions.retrieve(candidate.id, { expand: ['latest_invoice.payment_intent'] });
          const inv = reused.latest_invoice as Stripe.Invoice | null;
          let clientSecret: string | null = null;
          if (inv) {
            const paymentIntent = (inv as unknown as { payment_intent?: unknown }).payment_intent;
            if (paymentIntent && typeof paymentIntent === 'object' && 'client_secret' in (paymentIntent as Record<string, unknown>)) {
              const cs = (paymentIntent as { client_secret?: string }).client_secret;
              clientSecret = cs || null;
            }
          }
          let setupClientSecret: string | null = null;
          if (!clientSecret && stripeCustomerId) {
            setupClientSecret = await createSetupIntentForCustomer({
              customerId: stripeCustomerId,
              organizationId: pendingOrg?.id ?? null,
              userId,
            });
          }

          // Mirror on org and return without creating a new subscription
          await supabase.from('organizations')
            .update({ stripe_subscription_id: reused.id, stripe_status: reused.status as StripeSubStatus, updated_at: new Date().toISOString() })
            .eq('id', pendingOrg.id);
          return res.json({
            ok: true,
            org: pendingOrg as OrganizationRow,
            subscriptionClientSecret: clientSecret,
            setupClientSecret,
            pendingPayment: true
          } as OrgOnboardResponse);
        }
      } catch (reuseErr) {
        console.warn('[onboard] subscription reuse check failed (continuing to create new)', reuseErr);
      }

      // Create subscription requiring client confirmation
      const sub = await stripe.subscriptions.create(
        {
          customer: stripeCustomerId,
          items: [{ price: plan.stripe_price_id }],
          collection_method: 'charge_automatically',
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          trial_period_days: trialDays && trialDays > 0 ? trialDays : undefined,
          metadata: { user_id: userId, organization_id: pendingOrg.id, plan_code: planCode },
          expand: ['latest_invoice.payment_intent']
        },
        {
          idempotencyKey: `onboard:${pendingOrg.id}:${planCode}`
        }
      );

      // Mirror subscription id and status on org
      try {
        await supabase
          .from('organizations')
          .update({ stripe_subscription_id: sub.id, stripe_status: sub.status as StripeSubStatus, updated_at: new Date().toISOString() })
          .eq('id', pendingOrg.id);
      } catch (e) {
        console.warn('[onboard] failed to mirror subscription on org', e);
      }

      const invoice = sub.latest_invoice as Stripe.Invoice | null;
      let clientSecret: string | null = null;
      if (invoice) {
        const paymentIntent = (invoice as unknown as { payment_intent?: unknown }).payment_intent;
        if (paymentIntent && typeof paymentIntent === 'object' && 'client_secret' in (paymentIntent as Record<string, unknown>)) {
          const cs = (paymentIntent as { client_secret?: string }).client_secret;
          clientSecret = cs || null;
        }
      }
      let setupClientSecret: string | null = null;
      if (!clientSecret && stripeCustomerId) {
        setupClientSecret = await createSetupIntentForCustomer({
          customerId: stripeCustomerId,
          organizationId: pendingOrg?.id ?? null,
          userId,
        });
      }

      const response: OrgOnboardResponse = {
        ok: true,
        org: pendingOrg as OrganizationRow,
        subscriptionClientSecret: clientSecret,
        setupClientSecret,
      };
      // Add a hint flag for the UI to show pending state until webhook confirms
      return res.json({ ...response, pendingPayment: true } as unknown as OrgOnboardResponse);
    }

    // Get or create organization (Renewal path)
    let org: OrganizationRow;
    if (orgId) {
      // Try to fetch existing organization
      const { data: existingOrg, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (orgError || !existingOrg) {
        return res.status(404).json({ 
          ok: false, 
          error: 'Organization not found' 
        } as ApiError);
      }

      // Verify ownership
      if (existingOrg.owner_id && existingOrg.owner_id !== userId) {
        return res.status(403).json({ 
          ok: false, 
          error: 'Only the organization owner can onboard billing' 
        } as ApiError);
      }

      org = existingOrg;
    } else {
      // Create new organization with payment_pending status - will be activated by webhook
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name,
          owner_id: userId,
          status: 'payment_pending',
          stripe_status: 'incomplete',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (createError || !newOrg) {
        console.error('Error creating organization:', createError);
        return res.status(500).json({ 
          ok: false, 
          error: 'Failed to create organization' 
        } as ApiError);
      }

      org = newOrg as unknown as OrganizationRow;
    }

    // Create or get Stripe customer (ONE customer per org)
    let stripeCustomerId = org.stripe_customer_id;
    if (!stripeCustomerId) {
      // Try to recover existing customer by metadata
      try {
        const customersObj = stripe.customers as unknown as {
          search?: (args: { query: string }) => Promise<{ data: Array<{ id: string }> }>;
        };
        if (customersObj.search) {
          const searchResult = await customersObj.search({
            query: `metadata['organization_id']:'${org.id}'`
          });
          if (searchResult?.data?.length) {
            stripeCustomerId = searchResult.data[0].id;
          }
        }
      } catch (searchErr) {
        console.warn('[billing] customers.search failed (continuing without email fallback)', searchErr);
      }

      // If still not found, create once and persist
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          name,
          email: req.user?.email || undefined,
          metadata: {
            organization_id: org.id,
            user_id: userId
          }
        });
        stripeCustomerId = customer.id;
      }

      // Persist to organizations if missing
      if (!org.stripe_customer_id && stripeCustomerId) {
        const { error: customerUpdateError } = await supabase
          .from('organizations')
          .update({
            stripe_customer_id: stripeCustomerId,
            updated_at: new Date().toISOString()
          })
          .eq('id', org.id);
        if (customerUpdateError) {
          console.error('Failed to persist stripe_customer_id after recovery/creation:', customerUpdateError);
        }
      }
    }

    let defaultPaymentMethodId: string | null = paymentMethodIdFromRequest || null;
    // Note: do not mutate customer default payment method for new orgs; client must confirm PI
    // Only renewals can use a saved/default payment method
    const allowUsingSavedDefault = isRenewal && useExistingPaymentMethod === true;
    // Only renewals should attach/migrate a provided payment method server-side
    const shouldAttachNewPaymentMethod = isRenewal && Boolean(paymentMethodIdFromRequest);

    if (allowUsingSavedDefault && !defaultPaymentMethodId && stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(stripeCustomerId, {
          expand: ['invoice_settings.default_payment_method']
        });

        const customerObj = customer as unknown as Stripe.Customer;
        const customerDefault =
          typeof customerObj.invoice_settings?.default_payment_method === 'string'
            ? customerObj.invoice_settings.default_payment_method
            : customerObj.invoice_settings?.default_payment_method &&
              'id' in customerObj.invoice_settings.default_payment_method
              ? (customerObj.invoice_settings.default_payment_method as { id: string }).id
              : null;

        defaultPaymentMethodId = customerDefault;
      } catch (customerError) {
        console.error('Error retrieving customer for default payment method:', customerError);
      }
    }

    // If caller wants to use an existing saved PM and provided one, set it as default
    if (isRenewal && useExistingPaymentMethod && paymentMethodIdFromRequest) {
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodIdFromRequest);
        const pmCustomer = typeof pm.customer === 'string' ? pm.customer : null;
        // If PM is unattached, attach it to this customer now
        if (!pmCustomer) {
          await stripe.paymentMethods.attach(paymentMethodIdFromRequest, { customer: stripeCustomerId });
        }
        if (pmCustomer && pmCustomer !== stripeCustomerId) {
          // Attempt safe migration if the previous customer belongs to the same user
          try {
            const prevCustomer = (await stripe.customers.retrieve(pmCustomer)) as Stripe.Customer;
            const prevUserId = (prevCustomer.metadata as Record<string, string> | undefined)?.user_id || null;
            const sameOwner = prevUserId ? prevUserId === userId : (prevCustomer.email && req.user?.email && prevCustomer.email === req.user.email);
            if (!sameOwner) {
              return res.status(400).json({
                ok: false,
                error: 'Payment method belongs to another account. Please use a different card.',
                code: 'pm_wrong_customer'
              } as ApiError);
            }
            // Detach and reattach to the new org's customer
            await stripe.paymentMethods.detach(paymentMethodIdFromRequest);
            await stripe.paymentMethods.attach(paymentMethodIdFromRequest, { customer: stripeCustomerId });
          } catch (migrateError) {
            console.error('Failed to migrate payment method to this customer:', migrateError);
            if (!isRenewal) {
              try {
                await supabase.from('organizations').delete().eq('id', org.id);
              } catch (cleanupError) {
                console.warn('Failed to cleanup organization after PM migration error:', cleanupError);
              }
            }
            return res.status(400).json({ ok: false, error: 'Failed to move payment method to this organization' } as ApiError);
          }
        }
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodIdFromRequest }
        });
        defaultPaymentMethodId = paymentMethodIdFromRequest;
      } catch (e) {
        console.error('Error setting default payment method from existing list:', e);
        if (!isRenewal) {
          try {
            await supabase.from('organizations').delete().eq('id', org.id);
          } catch (cleanupError) {
            console.warn('Failed to cleanup organization after PM failure:', cleanupError);
          }
        }
        return res.status(400).json({ ok: false, error: 'Failed to use selected payment method' } as ApiError);
      }
    }

    // Renewals must specify or have a saved payment method; new orgs collect client-side.
    if (isRenewal && useExistingPaymentMethod && !defaultPaymentMethodId) {
      return res.status(400).json({
        ok: false,
        error: 'A saved payment method is required for renewals.',
        code: 'payment_method_required'
      } as ApiError);
    }
    // For new orgs: proceed without a PM here; client will collect & confirm the PaymentIntent.

    if (isRenewal && shouldAttachNewPaymentMethod && defaultPaymentMethodId) {
      try {
        // Ensure payment method is attached to this customer
        const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);
        const pmCustomer = typeof pm.customer === 'string' ? pm.customer : null;
        // If unattached, attach it now to this org's customer
        if (!pmCustomer) {
          await stripe.paymentMethods.attach(defaultPaymentMethodId, { customer: stripeCustomerId });
        }
        // Wrong customer
        if (pmCustomer && pmCustomer !== stripeCustomerId) {
          try {
            const prevCustomer = (await stripe.customers.retrieve(pmCustomer)) as Stripe.Customer;
            const prevUserId = (prevCustomer.metadata as Record<string, string> | undefined)?.user_id || null;
            const sameOwner = prevUserId ? prevUserId === userId : (prevCustomer.email && req.user?.email && prevCustomer.email === req.user.email);
            if (!sameOwner) {
              return res.status(400).json({
                ok: false,
                error: 'Payment method belongs to another account. Please use a different card.',
                code: 'pm_wrong_customer'
              } as ApiError);
            }
            await stripe.paymentMethods.detach(defaultPaymentMethodId);
            await stripe.paymentMethods.attach(defaultPaymentMethodId, { customer: stripeCustomerId });
          } catch (migrateError) {
            console.error('Failed to migrate payment method (new card path):', migrateError);
            if (!isRenewal) {
              try {
                await supabase.from('organizations').delete().eq('id', org.id);
              } catch (cleanupError) {
                console.warn('Failed to cleanup organization after PM migration error:', cleanupError);
              }
            }
            return res.status(400).json({ ok: false, error: 'Failed to move payment method to this organization' } as ApiError);
          }
        }
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: defaultPaymentMethodId
          }
        });
      } catch (attachError) {
        console.error('Error attaching new payment method to customer:', attachError);
        // Cleanup newly created org if this was a new flow
        if (!isRenewal) {
          try {
            await supabase.from('organizations').delete().eq('id', org.id);
          } catch (cleanupError) {
            console.warn('Failed to cleanup organization after attach failure:', cleanupError);
          }
        }
        throw attachError;
      }
    }

    // Do not mutate customer default payment method for new orgs; client confirms payment intent

    // Create or get Stripe subscription
    let stripeSubscriptionId = org.stripe_subscription_id;
    // If previous subscription was canceled or expired, create a new one under the SAME customer
    const existingStatus = org.stripe_status as StripeSubStatus | null;
    if (stripeSubscriptionId && (existingStatus === 'canceled' || existingStatus === 'incomplete_expired')) {
      stripeSubscriptionId = null;
    }
    let subscriptionClientSecret: string | null = null;
    let setupClientSecret: string | null = null;
    // Organization is only set to active upon successful payment (via webhook)
    // For new orgs, keep it in payment_pending until webhook confirms
    let computedOrgStatus: OrgStatus = isRenewal ? ((org.status as OrgStatus) || 'active') : 'payment_pending';

    if (!stripeSubscriptionId) {
      // Reuse any existing relevant subscription for this org if present
      try {
        const existingList = await stripe.subscriptions.list({
          customer: stripeCustomerId!,
          status: 'all',
          limit: 10
        });
        const candidate = existingList.data.find((s) =>
          s.metadata?.organization_id === org.id &&
          ['incomplete', 'trialing', 'active', 'past_due'].includes(s.status)
        );
        if (candidate) {
          try {
            const reused = await stripe.subscriptions.retrieve(candidate.id, { expand: ['latest_invoice.payment_intent'] });
            stripeSubscriptionId = reused.id;
            const inv = reused.latest_invoice as Stripe.Invoice | null;
            if (inv) {
              const paymentIntent = (inv as unknown as { payment_intent?: unknown }).payment_intent;
              if (paymentIntent && typeof paymentIntent === 'object' && 'client_secret' in (paymentIntent as Record<string, unknown>)) {
                const cs = (paymentIntent as { client_secret?: string }).client_secret;
                subscriptionClientSecret = cs || null;
              }
            }
          } catch (reuseFetchErr) {
            if (reuseFetchErr instanceof Stripe.errors.StripeInvalidRequestError && reuseFetchErr.code === 'resource_missing') {
              console.warn('[onboard][renewal] found stale subscription reference; clearing local id', {
                orgId: org.id,
                subscriptionId: candidate.id
              });
              await supabase
                .from('organizations')
                .update({
                  stripe_subscription_id: null,
                  stripe_status: 'canceled',
                  updated_at: new Date().toISOString()
                })
                .eq('id', org.id);
              org.stripe_subscription_id = null;
            } else {
              throw reuseFetchErr;
            }
          }
        }
      } catch (reuseErr) {
        console.warn('[onboard][renewal] subscription reuse check failed (continuing)', reuseErr);
      }

      // If still none, create a new subscription for renewal
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: stripeCustomerId,
        items: [
          {
            price: plan.stripe_price_id
          }
        ],
        metadata: {
          organization_id: org.id,
          plan_code: planCode
        },
        // Always require client-side confirmation via Payment Element
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        collection_method: 'charge_automatically',
        expand: ['latest_invoice.payment_intent']
      };

      // Only renewals should set a default_payment_method at creation
      if (isRenewal && defaultPaymentMethodId) {
        subscriptionParams.default_payment_method = defaultPaymentMethodId;
      }

      if (trialDays && trialDays > 0) {
        subscriptionParams.trial_period_days = trialDays;
      }

      if (!stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.create(
          subscriptionParams,
          { idempotencyKey: `onboard:${org.id}:${planCode}` }
        );
        stripeSubscriptionId = subscription.id;

      const invoice = subscription.latest_invoice as Stripe.Invoice | null;
      // Keep organization active regardless of subscription creation state
      computedOrgStatus = (org.status as OrgStatus) || 'active';
      if (invoice) {
        const paymentIntent = (invoice as unknown as { payment_intent?: unknown }).payment_intent;
        if (paymentIntent && typeof paymentIntent === 'object' && 'client_secret' in (paymentIntent as Record<string, unknown>)) {
          const cs = (paymentIntent as { client_secret?: string }).client_secret;
          subscriptionClientSecret = cs || null;
        } else if (trialDays && trialDays > 0) {
          subscriptionClientSecret = null;
        }
      }
      }

      // Do not auto-confirm or charge; client will confirm using client secret

    // Removed: usage-only subscription creation. Usage is funded via wallet top-ups.
    }

    // If no PI secret was produced (e.g., trials), provide a SetupIntent secret so UI can collect card
    if (!subscriptionClientSecret && stripeCustomerId) {
      setupClientSecret = await createSetupIntentForCustomer({
        customerId: stripeCustomerId,
        organizationId: org.id,
        userId,
      });
    }

    // CRITICAL: Ensure new organizations NEVER leave payment_pending state without webhook confirmation
    // If somehow org is not in payment_pending at this point, it must be a renewal (existing customer)
    if (!isRenewal && org.status !== 'payment_pending') {
      console.warn('[CRITICAL] New org was not created in payment_pending state', {
        orgId: org.id,
        status: org.status,
        isRenewal
      });
      // Force it back to payment_pending for safety
      org.status = 'payment_pending' as OrgStatus;
    }

    let subscriptionData: Partial<OrganizationRow> = {
      name,
      tz,
      stripe_customer_id: stripeCustomerId,
      status: computedOrgStatus,
      updated_at: new Date().toISOString()
    };

    // Apply plan metadata immediately for new orgs; for renewals, defer plan application
    if (!isRenewal) {
      subscriptionData = {
        ...subscriptionData,
        plan_code: planCode,
        plan_price_cents: plan.base_price_cents,
        included_seats: plan.included_seats,
        // new credit fields
        included_credits_monthly: plan.included_credits,
        included_credits_remaining: plan.included_credits,
        // legacy compatibility
        included_credits: plan.included_credits
      };
    }

    // If subscription was created, mirror subscription data
    if (stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

        subscriptionData = {
          ...subscriptionData,
          stripe_subscription_id: subscription.id,
          stripe_status: subscription.status as StripeSubStatus,
          trial_end: subscription.trial_end ? unixToISO(subscription.trial_end) : null,
        };
      } catch (error) {
        if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === 'resource_missing') {
          console.warn('Subscription missing during mirroring; clearing local reference', {
            orgId: org.id,
            stripeSubscriptionId
          });
          subscriptionData = {
            ...subscriptionData,
            stripe_subscription_id: null,
            stripe_status: 'canceled' as StripeSubStatus,
          };
        } else {
          console.error('Error retrieving subscription for mirroring:', error);
          // Fallback to basic data if subscription retrieval fails
          subscriptionData = {
            ...subscriptionData,
            stripe_subscription_id: stripeSubscriptionId,
            stripe_status: 'incomplete' as StripeSubStatus,
          };
        }
      }
    }

    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(subscriptionData)
      .eq('id', org.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to update organization with billing information' 
      } as ApiError);
    }

    // CRITICAL SAFEGUARD: Verify org status before returning
    // For new orgs, it MUST be payment_pending (not active)
    if (!isRenewal && updatedOrg.status !== 'payment_pending') {
      console.error('[CRITICAL] Organization returned with wrong status after onboarding!', {
        orgId: updatedOrg.id,
        status: updatedOrg.status,
        isRenewal,
        stripeStatus: updatedOrg.stripe_status
      });
      // Force correct status directly
      await supabase
        .from('organizations')
        .update({ status: 'payment_pending' })
        .eq('id', updatedOrg.id);
      updatedOrg.status = 'payment_pending';
    }

    await ensureWallet(updatedOrg.id);

    const response: OrgOnboardResponse = {
      ok: true,
      org: updatedOrg as OrganizationRow,
      subscriptionClientSecret,
      setupClientSecret
    };

    res.json(response);

  } catch (error) {
    console.error('Error onboarding organization:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Internal server error' 
    } as ApiError);
  }
};

export const getPlanCatalog = async (req: Request, res: Response) => {
  try {
    const { data: plans, error } = await supabase
      .from('plan_catalog')
      .select('*')
      .eq('active', true)
      .eq('env', process.env.NODE_ENV === 'development' ? 'test' : 'live')
      .order('base_price_cents', { ascending: true });

    if (error) {
      console.error('Error fetching plan catalog:', error);
      return res.status(500).json({ error: 'Failed to fetch plan catalog' });
    }

    res.json({ plans });
  } catch (error) {
    console.error('Error fetching plan catalog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomerPaymentMethodSummary = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const orgId = req.query.orgId as string | undefined;
    if (!orgId) {
      return res.status(400).json({ error: 'Missing orgId' });
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, owner_id, stripe_customer_id, stripe_subscription_id, plan_code, name')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (org.owner_id && org.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the organization owner can manage billing' });
    }

    if (!org.stripe_customer_id) {
      return res.json({
        hasDefault: false,
        defaultPaymentMethod: null as CustomerPaymentMethodSummary | null,
        customerId: null,
        subscriptionId: org.stripe_subscription_id || null,
        planCode: org.plan_code,
        organizationName: org.name
      });
    }

    try {
      const customer = await stripe.customers.retrieve(org.stripe_customer_id, {
        expand: ['invoice_settings.default_payment_method']
      });

      let summary: CustomerPaymentMethodSummary | null = null;

      const customerObj = customer as unknown as Stripe.Customer;
      const defaultPM = customerObj.invoice_settings?.default_payment_method;
      if (defaultPM && typeof defaultPM === 'object' && 'id' in defaultPM) {
        const pmObject = defaultPM as Stripe.PaymentMethod;
        if (pmObject.card) {
          summary = {
            id: pmObject.id,
            brand: pmObject.card.brand || null,
            last4: pmObject.card.last4 || null,
            exp_month: pmObject.card.exp_month || null,
            exp_year: pmObject.card.exp_year || null,
            billing_details_name: pmObject.billing_details?.name || null
          };
        } else {
          summary = {
            id: pmObject.id,
            brand: null,
            last4: null,
            exp_month: null,
            exp_year: null,
            billing_details_name: pmObject.billing_details?.name || null
          };
        }
      } else if (typeof defaultPM === 'string') {
        try {
          const paymentMethod = await stripe.paymentMethods.retrieve(defaultPM);
          const card = paymentMethod.card;
          summary = {
            id: paymentMethod.id,
            brand: card?.brand || null,
            last4: card?.last4 || null,
            exp_month: card?.exp_month || null,
            exp_year: card?.exp_year || null,
            billing_details_name: paymentMethod.billing_details?.name || null
          };
        } catch (pmError) {
          console.error('Error retrieving payment method for summary:', pmError);
        }
      }

      return res.json({
        hasDefault: Boolean(summary),
        defaultPaymentMethod: summary,
        customerId: org.stripe_customer_id,
        subscriptionId: org.stripe_subscription_id || null,
        planCode: org.plan_code,
        organizationName: org.name
      });
    } catch (stripeError) {
      console.error('Error retrieving customer payment method summary:', stripeError);
      return res.status(500).json({ error: 'Failed to retrieve payment method summary' });
    }
  } catch (error) {
    console.error('Error retrieving customer payment method summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCustomerPaymentMethods = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const orgId = req.query.orgId as string | undefined;
    if (!orgId) {
      return res.status(400).json({ error: 'Missing orgId' });
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, owner_id, stripe_customer_id, name')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (org.owner_id && org.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the organization owner can manage billing' });
    }

    if (!org.stripe_customer_id) {
      return res.json({ paymentMethods: [], defaultPaymentMethodId: null, customerId: null, organizationName: org.name });
    }

    // Load default payment method id from customer, and list all card payment methods
    const customer = (await stripe.customers.retrieve(org.stripe_customer_id, {
      expand: ['invoice_settings.default_payment_method']
    })) as Stripe.Customer;

    const defaultPm = customer.invoice_settings?.default_payment_method;
    const defaultPaymentMethodId = typeof defaultPm === 'string' ? defaultPm : (defaultPm as Stripe.PaymentMethod | null)?.id || null;

    const methods = await stripe.paymentMethods.list({ customer: org.stripe_customer_id, type: 'card' });

    const summaries: CustomerPaymentMethodSummary[] = methods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || null,
      last4: pm.card?.last4 || null,
      exp_month: pm.card?.exp_month || null,
      exp_year: pm.card?.exp_year || null,
      billing_details_name: pm.billing_details?.name || null
    }));

    return res.json({
      paymentMethods: summaries,
      defaultPaymentMethodId,
      customerId: org.stripe_customer_id,
      organizationName: org.name
    });
  } catch (err) {
    console.error('Error retrieving customer payment methods:', err);
    return res.status(500).json({ error: 'Failed to retrieve payment methods' });
  }
};
