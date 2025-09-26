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

    // Create or get Stripe customer
    let stripeCustomerId = org.stripe_customer_id;
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

      const { error: customerUpdateError } = await supabase
        .from('organizations')
        .update({
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', org.id);

      if (customerUpdateError) {
        console.error('Failed to persist stripe_customer_id after customer creation:', customerUpdateError);
      }
    }

    let defaultPaymentMethodId: string | null = paymentMethodIdFromRequest || null;
    const shouldAttachNewPaymentMethod = Boolean(paymentMethodIdFromRequest) && !useExistingPaymentMethod;

    if (!defaultPaymentMethodId && stripeCustomerId) {
      try {
        const customer = await stripe.customers.retrieve(stripeCustomerId, {
          expand: ['invoice_settings.default_payment_method']
        });

        const customerDefault =
          typeof customer.invoice_settings?.default_payment_method === 'string'
            ? customer.invoice_settings.default_payment_method
            : customer.invoice_settings?.default_payment_method &&
              'id' in customer.invoice_settings.default_payment_method
              ? (customer.invoice_settings.default_payment_method as { id: string }).id
              : null;

        defaultPaymentMethodId = customerDefault;
      } catch (customerError) {
        console.error('Error retrieving customer for default payment method:', customerError);
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
        await stripe.paymentMethods.attach(defaultPaymentMethodId, {
          customer: stripeCustomerId
        });

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
        payment_behavior: 'default_incomplete',
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

    // Add user to user_organizations table as owner
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

      const defaultPM = customer.invoice_settings?.default_payment_method;
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

