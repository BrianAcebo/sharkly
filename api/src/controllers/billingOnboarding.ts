import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient';
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
} from '../types/billing';
import { getStripeClient } from '../utils/stripe';

const stripe = getStripeClient();

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
      website,
      industry,
      ein,
      tz = 'America/New_York',
      address,
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
    const { data: plan, error: planError } = await supabase
      .from('plan_catalog')
      .select('*')
      .eq('plan_code', planCode)
      .eq('active', true)
      .single();

    if (planError || !plan) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Invalid plan code or plan not active' 
      } as ApiError);
    }

    // Get or create organization
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
      // Create new organization
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name,
          owner_id: userId,
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

      org = newOrg;
    }

    // Create or get Stripe customer (ONE customer per org)
    let stripeCustomerId = org.stripe_customer_id;
    if (!stripeCustomerId) {
      // Try to recover existing customer by metadata
      try {
        // @ts-expect-error Stripe search not in older types
        const searchResult = await (stripe.customers as any).search?.({
          query: `metadata['organization_id']:'${org.id}'`
        });
        if (searchResult?.data?.length) {
          stripeCustomerId = searchResult.data[0].id;
        }
      } catch (searchErr) {
        console.warn('Stripe search failed, fallback to list by email.', searchErr);
      }

      // Fallback: list by email and match metadata.organization_id
      if (!stripeCustomerId && req.user?.email) {
        try {
          const listResult = await stripe.customers.list({ email: req.user.email, limit: 10 });
          const matched = listResult.data.find((c) => (c.metadata as Record<string, string> | undefined)?.organization_id === org.id) || null;
          if (matched) {
            stripeCustomerId = matched.id;
          }
        } catch (listErr) {
          console.warn('Stripe customers.list failed:', listErr);
        }
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
    const shouldAttachNewPaymentMethod = Boolean(paymentMethodIdFromRequest) && !useExistingPaymentMethod;

    if (!defaultPaymentMethodId && stripeCustomerId) {
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
    if (useExistingPaymentMethod && paymentMethodIdFromRequest) {
      try {
        const pm = await stripe.paymentMethods.retrieve(paymentMethodIdFromRequest);
        const pmCustomer = typeof pm.customer === 'string' ? pm.customer : null;
        if (!pmCustomer) {
          return res.status(400).json({
            ok: false,
            error: 'This payment method is single-use or detached. Save it with a SetupIntent on this customer first.',
            code: 'pm_single_use'
          } as ApiError);
        }
        if (pmCustomer !== stripeCustomerId) {
          return res.status(400).json({
            ok: false,
            error: 'Payment method belongs to a different customer. Please re-add it to this organization.',
            code: 'pm_wrong_customer'
          } as ApiError);
        }
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodIdFromRequest }
        });
        defaultPaymentMethodId = paymentMethodIdFromRequest;
      } catch (e) {
        console.error('Error setting default payment method from existing list:', e);
        return res.status(400).json({ ok: false, error: 'Failed to use selected payment method' } as ApiError);
      }
    }

    if (!defaultPaymentMethodId) {
      if (!trialDays || trialDays <= 0) {
        return res.status(400).json({
          ok: false,
          error: 'No payment method available for this customer. Please add a new payment method.',
          code: 'payment_method_required'
        } as ApiError);
      }
    }

    if (shouldAttachNewPaymentMethod && defaultPaymentMethodId) {
      try {
        // Ensure payment method is attached to this customer
        const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);
        const pmCustomer = typeof pm.customer === 'string' ? pm.customer : null;
        // Single-use or detached
        if (!pmCustomer) {
          return res.status(400).json({
            ok: false,
            error: 'This payment method is single-use or detached. Save it with a SetupIntent on this customer first.',
            code: 'pm_single_use'
          } as ApiError);
        }
        // Wrong customer
        if (pmCustomer !== stripeCustomerId) {
          return res.status(400).json({
            ok: false,
            error: 'Payment method belongs to a different customer. Please re-add it to this organization.',
            code: 'pm_wrong_customer'
          } as ApiError);
        }
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: defaultPaymentMethodId
          }
        });
      } catch (attachError) {
        console.error('Error attaching new payment method to customer:', attachError);
        throw attachError;
      }
    }

    // Create or get Stripe subscription
    let stripeSubscriptionId = org.stripe_subscription_id;
    // If previous subscription was canceled or expired, create a new one under the SAME customer
    const existingStatus = org.stripe_status as StripeSubStatus | null;
    if (stripeSubscriptionId && (existingStatus === 'canceled' || existingStatus === 'incomplete_expired')) {
      stripeSubscriptionId = null;
    }
    let subscriptionClientSecret: string | null = null;

    if (!stripeSubscriptionId) {
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
        // If we're using a saved/default payment method, we can allow Stripe to attempt the payment
        // otherwise (new card flow) we require client confirmation
        payment_behavior: useExistingPaymentMethod || !!defaultPaymentMethodId ? 'allow_incomplete' : 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        collection_method: 'charge_automatically',
        expand: ['latest_invoice.payment_intent']
      };

      if (defaultPaymentMethodId) {
        subscriptionParams.default_payment_method = defaultPaymentMethodId;
      }

      if (trialDays && trialDays > 0) {
        subscriptionParams.trial_period_days = trialDays;
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams);
      stripeSubscriptionId = subscription.id;

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      if (invoice && (invoice as unknown as { payment_intent?: { client_secret: string } }).payment_intent) {
        const paymentIntent = (invoice as unknown as { payment_intent: { client_secret: string } }).payment_intent;
        subscriptionClientSecret = paymentIntent.client_secret;
      } else if (trialDays && trialDays > 0) {
        subscriptionClientSecret = null;
      }

      // Ensure the subscription has the selected/default payment method set
      if (defaultPaymentMethodId) {
        try {
          // Update subscription default payment method if not set
          const subDefault = (subscription as unknown as { default_payment_method?: string | Stripe.PaymentMethod | null }).default_payment_method;
          const currentDefaultId = typeof subDefault === 'string' ? subDefault : (subDefault && 'id' in (subDefault as any) ? (subDefault as any).id : null);
          if (!currentDefaultId) {
            await stripe.subscriptions.update(subscription.id, {
              default_payment_method: defaultPaymentMethodId
            });
          }

          // If there's a payment intent requiring a payment method, attach it
          if (invoice && (invoice as any).payment_intent) {
            const piId = (invoice as any).payment_intent.id ?? ((invoice as any).payment_intent as any);
            if (piId) {
              try {
                await stripe.paymentIntents.update(piId, {
                  payment_method: defaultPaymentMethodId
                });
                const pi = await stripe.paymentIntents.retrieve(piId);
                if (pi.status === 'requires_confirmation') {
                  await stripe.paymentIntents.confirm(pi.id);
                }
              } catch (confirmErr) {
                console.warn('PaymentIntent update/confirm failed; subscription may remain incomplete:', confirmErr);
              }
            }
          }
        } catch (subUpdateErr) {
          console.warn('Failed to set default payment method on subscription:', subUpdateErr);
        }
      }
    }

    // Mirror Stripe subscription data to organization
    let subscriptionData: Partial<OrganizationRow> = {
      name,
      website: website || null,
      industry: industry || null,
      ein: ein || null,
      tz,
      address_street: address?.street || null,
      address_city: address?.city || null,
      address_state: address?.state || null,
      address_zip: address?.zip || null,
      address_country: address?.country || null,
      stripe_customer_id: stripeCustomerId,
      org_status: 'active' as OrgStatus,
      plan_code: planCode,
      plan_price_cents: plan.base_price_cents,
      included_seats: plan.included_seats,
      included_minutes: plan.included_minutes,
      included_sms: plan.included_sms,
      included_emails: plan.included_emails,
      updated_at: new Date().toISOString()
    };

    console.log('subscriptionData', subscriptionData);

    // If subscription was created, mirror subscription data
    if (stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

        console.log('subscription', subscription);
        
        subscriptionData = {
          ...subscriptionData,
          stripe_subscription_id: subscription.id,
          stripe_status: subscription.status as StripeSubStatus,
          trial_end: subscription.trial_end ? unixToISO(subscription.trial_end) : null,
        };
      } catch (error) {
        console.error('Error retrieving subscription for mirroring:', error);
        // Fallback to basic data if subscription retrieval fails
        subscriptionData = {
          ...subscriptionData,
          stripe_subscription_id: stripeSubscriptionId,
          stripe_status: 'incomplete' as StripeSubStatus,
        };
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

    // For new orgs, add user as owner; for renewals, the membership already exists
    if (!isRenewal) {
      const { error: userOrgError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: userId,
          organization_id: org.id,
          role: 'owner'
        });

      if (userOrgError) {
        console.error('Error adding user to organization:', userOrgError);
        return res.status(500).json({ 
          ok: false, 
          error: 'Failed to add user to organization' 
        } as ApiError);
      }
    }

    const response: OrgOnboardResponse = {
      ok: true,
      org: updatedOrg as OrganizationRow,
      subscriptionClientSecret
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

