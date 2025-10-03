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
import { getTwilioClientForSubaccount } from '../utils/twilioClient';
import { ensureTwilioResourcesForOrganization } from '../utils/twilioProvisioning';
import { ensureWallet } from '../utils/wallet';

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
      areaCode,
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

    // If renewing existing organization, continue legacy path; otherwise, for new org do payment-first flow
    if (!orgId) {
      // NEW ORG: Payment-first onboarding
      // 1) Create (or get) Stripe Customer for the user
      let stripeCustomerId: string | null = null;
      try {
        const existing = await stripe.customers.list({ email: req.user?.email || undefined, limit: 1 });
        if (existing.data.length > 0) {
          stripeCustomerId = existing.data[0].id;
        }
      } catch (e) {
        console.warn('[onboard] customers.list failed', e);
      }
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          name,
          email: req.user?.email || undefined,
          metadata: { user_id: userId, org_pre_name: name, plan_code: planCode }
        });
        stripeCustomerId = customer.id;
      }

      // 2) Create Subscription with metadata (no org yet). Require payment confirmation.
      const sub = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: plan.stripe_price_id }],
        collection_method: 'charge_automatically',
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        trial_period_days: trialDays && trialDays > 0 ? trialDays : undefined,
        metadata: { user_id: userId, org_pre_name: name, plan_code: planCode },
        expand: ['latest_invoice.payment_intent']
      });

      const invoice = sub.latest_invoice as Stripe.Invoice | null;
      const clientSecret = invoice && (invoice as unknown as { payment_intent?: { client_secret?: string } }).payment_intent
        ? ((invoice as unknown as { payment_intent: { client_secret?: string } }).payment_intent.client_secret || null)
        : null;

      return res.json({ ok: true, org: null, subscriptionClientSecret: clientSecret } as OrgOnboardResponse);
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
      // Create new organization in a pending state; membership will be added after payment/trial is confirmed
      const { data: newOrg, error: createError } = await supabase
        .from('organizations')
        .insert({
          name,
          owner_id: userId,
          org_status: 'payment_required',
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

      // Defer Twilio provisioning until payment/trial confirmation
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

    // Enforce a payment method for ALL subscriptions, including trials
    if (!defaultPaymentMethodId) {
      if (!isRenewal) {
        try {
          await supabase.from('organizations').delete().eq('id', org.id);
        } catch (cleanupError) {
          console.warn('Failed to cleanup organization when no PM provided:', cleanupError);
        }
      }
      return res.status(400).json({
        ok: false,
        error: 'A valid payment method is required before creating an organization or subscription (including trials).',
        code: 'payment_method_required'
      } as ApiError);
    }

    if (shouldAttachNewPaymentMethod && defaultPaymentMethodId) {
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

    // Create or get Stripe subscription
    let stripeSubscriptionId = org.stripe_subscription_id;
    // If previous subscription was canceled or expired, create a new one under the SAME customer
    const existingStatus = org.stripe_status as StripeSubStatus | null;
    if (stripeSubscriptionId && (existingStatus === 'canceled' || existingStatus === 'incomplete_expired')) {
      stripeSubscriptionId = null;
    }
    let subscriptionClientSecret: string | null = null;
    let computedOrgStatus: OrgStatus = 'payment_required';

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
      // Determine org status based on subscription state
      if (subscription.status === 'active' || subscription.status === 'trialing') {
        computedOrgStatus = 'active';
      } else if (subscription.status === 'past_due') {
        computedOrgStatus = 'past_due';
      } else {
        computedOrgStatus = 'payment_required';
      }
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
          const currentDefaultId =
            typeof subDefault === 'string'
              ? subDefault
              : (subDefault && (subDefault as Stripe.PaymentMethod).id) || null;
          if (!currentDefaultId) {
            await stripe.subscriptions.update(subscription.id, {
              default_payment_method: defaultPaymentMethodId
            });
          }

          // If there's a payment intent requiring a payment method, attach it
          const invoiceWithPI = invoice as unknown as { payment_intent?: { id?: string } | string };
          if (invoiceWithPI && invoiceWithPI.payment_intent) {
            const piId =
              typeof invoiceWithPI.payment_intent === 'string'
                ? invoiceWithPI.payment_intent
                : invoiceWithPI.payment_intent.id;
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

    // Removed: usage-only subscription creation. Usage is funded via wallet top-ups.
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
      org_status: computedOrgStatus,
      updated_at: new Date().toISOString()
    };

    // Apply plan metadata immediately for new orgs; for renewals, defer plan application
    if (!isRenewal) {
      subscriptionData = {
        ...subscriptionData,
        plan_code: planCode,
        plan_price_cents: plan.base_price_cents,
        included_seats: plan.included_seats,
        included_minutes: plan.included_minutes,
        included_sms: plan.included_sms,
        included_emails: plan.included_emails
      };
    }

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

    // For new orgs, add user as owner ONLY when subscription is active or in trialing state
    if (!isRenewal) {
      const canAttachUser =
        (updatedOrg as OrganizationRow).stripe_status === 'active' ||
        (updatedOrg as OrganizationRow).stripe_status === 'trialing';

      if (canAttachUser) {
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

        // Now that org is confirmed (active/trial), ensure Twilio resources (subaccount + messaging service) exist
        try {
          const provisioning = await ensureTwilioResourcesForOrganization({
            orgId: org.id,
            orgName: name,
            twilioSubaccountSid: (updatedOrg as OrganizationRow).twilio_subaccount_sid,
            twilioMessagingServiceSid: (updatedOrg as OrganizationRow).twilio_messaging_service_sid ?? null
          });

          await supabase
            .from('organizations')
            .update({
              twilio_subaccount_sid: provisioning.subaccountSid,
              twilio_messaging_service_sid: provisioning.messagingServiceSid,
              updated_at: new Date().toISOString()
            })
            .eq('id', org.id);

          // Sync any pre-existing purchased numbers from the Twilio subaccount into Supabase
          try {
            if (provisioning.subaccountSid) {
              const subClient = getTwilioClientForSubaccount({ accountSid: provisioning.subaccountSid });

              const numbersApi = subClient as unknown as {
                incomingPhoneNumbers: {
                  list: (args: { limit?: number }) => Promise<Array<{
                    sid: string;
                    phoneNumber: string;
                    capabilities?: { sms?: boolean; voice?: boolean; mms?: boolean };
                  }>>;
                };
              };

              const PUBLIC_URL = process.env.PUBLIC_URL || '';
              const baseUrl = PUBLIC_URL.replace(/\/$/, '');
              const smsWebhookUrl = baseUrl ? `${baseUrl}/api/webhooks/twilio/sms-inbound` : undefined;
              const voiceWebhookUrl = baseUrl ? `${baseUrl}/api/twilio/voice/call` : undefined;

              const existingNumbers = await numbersApi.incomingPhoneNumbers.list({ limit: 200 });

              for (const num of existingNumbers) {
                const { data: exists } = await supabase
                  .from('phone_numbers')
                  .select('id')
                  .eq('org_id', org.id)
                  .eq('sid', num.sid)
                  .maybeSingle();

                if (!exists) {
                  await supabase
                    .from('phone_numbers')
                    .insert({
                      org_id: org.id,
                      seat_id: null,
                      phone_number: num.phoneNumber,
                      sid: num.sid,
                      capabilities: { sms: Boolean(num.capabilities?.sms), voice: Boolean(num.capabilities?.voice), mms: Boolean(num.capabilities?.mms) },
                      status: 'available',
                      sms_webhook_url: smsWebhookUrl ?? null,
                      voice_webhook_url: voiceWebhookUrl ?? null
                    });
                }
              }
            }
          } catch (syncErr) {
            console.error('Failed syncing existing Twilio numbers into Supabase:', syncErr);
          }

          // Ensure the org has at least `included_seats` phone numbers purchased (count only available+assigned)
          try {
            const { count: existingCount } = await supabase
              .from('phone_numbers')
              .select('id', { count: 'exact', head: true })
              .eq('org_id', org.id)
              .in('status', ['available', 'assigned']);

            const needed = Math.max((plan.included_seats ?? 0) - (existingCount ?? 0), 0);

            if (needed > 0 && provisioning.subaccountSid) {
              const subClient = getTwilioClientForSubaccount({ accountSid: provisioning.subaccountSid });

              const sub = subClient as unknown as {
                availablePhoneNumbers: (country: string) => {
                  local: {
                    list: (args: { smsEnabled?: boolean; voiceEnabled?: boolean; limit?: number }) => Promise<Array<{ phoneNumber: string }>>;
                  };
                };
                incomingPhoneNumbers: { create: (args: { phoneNumber: string; smsUrl?: string; statusCallback?: string; voiceUrl?: string; voiceMethod?: string }) => Promise<{ sid: string; phoneNumber: string }> };
                messaging: { v1: { services: (sid: string) => { phoneNumbers: { create: (args: { phoneNumberSid: string }) => Promise<unknown> } } } };
              };

              const PUBLIC_URL = process.env.PUBLIC_URL || '';
              const baseUrl = PUBLIC_URL.replace(/\/$/, '');
              const smsWebhookUrl = baseUrl ? `${baseUrl}/api/webhooks/twilio/sms-inbound` : undefined;
              const smsStatusCallback = baseUrl ? `${baseUrl}/api/webhooks/twilio/sms-status` : undefined;
              const voiceWebhookUrl = baseUrl ? `${baseUrl}/api/twilio/voice/call` : undefined;
              // Status callbacks are set via statusCallback

              // Fetch candidate numbers only if needed > 0
              const candidateArgs: { smsEnabled?: boolean; voiceEnabled?: boolean; limit?: number; areaCode?: string } = { smsEnabled: true, voiceEnabled: true, limit: needed };
              if (!isRenewal && areaCode) candidateArgs.areaCode = areaCode;
              const candidates = needed > 0 ? await sub.availablePhoneNumbers('US').local.list(candidateArgs) : [];

              for (const cand of candidates) {
                try {
                  const purchased = await sub.incomingPhoneNumbers.create({
                    phoneNumber: cand.phoneNumber,
                    smsUrl: smsWebhookUrl,
                    statusCallback: smsStatusCallback,
                    voiceUrl: voiceWebhookUrl,
                    voiceMethod: 'POST'
                  });

                  if (provisioning.messagingServiceSid) {
                    await sub.messaging.v1
                      .services(provisioning.messagingServiceSid)
                      .phoneNumbers.create({ phoneNumberSid: purchased.sid });
                  }

                  await supabase
                    .from('phone_numbers')
                    .insert({
                      org_id: org.id,
                      seat_id: null,
                      phone_number: purchased.phoneNumber,
                      sid: purchased.sid,
                      capabilities: { sms: true, voice: true },
                      status: 'available',
                      sms_webhook_url: smsWebhookUrl ?? null,
                      voice_webhook_url: voiceWebhookUrl ?? null
                    });
                } catch (purchaseErr) {
                  console.error('Failed to purchase number for org', org.id, purchaseErr);
                }
              }
            }
          } catch (ensureNumsErr) {
            console.error('Failed ensuring included phone numbers for org:', ensureNumsErr);
          }

          // Ensure the owner has an active seat
          let ownerSeatId: string | null = null;
          const { data: existingSeat } = await supabase
            .from('seats')
            .select('id, status')
            .eq('org_id', org.id)
            .eq('user_id', userId)
            .single();

          if (!existingSeat) {
            const { data: newSeat } = await supabase
              .from('seats')
              .insert({ org_id: org.id, user_id: userId, status: 'active', created_at: new Date().toISOString() })
              .select('id')
              .single();
            ownerSeatId = newSeat?.id ?? null;
          } else {
            ownerSeatId = existingSeat.id;
            if (existingSeat.status !== 'active') {
              await supabase.from('seats').update({ status: 'active' }).eq('id', existingSeat.id);
            }
          }

          // Ensure a phone number is assigned to the owner's seat
          if (ownerSeatId) {
            const { data: assigned } = await supabase
              .from('phone_numbers')
              .select('id')
              .eq('org_id', org.id)
              .eq('seat_id', ownerSeatId)
              .eq('status', 'assigned')
              .single();

            if (!assigned) {
              // Try to reuse an available number in this org first (numbers may have been purchased above)
              const { data: available } = await supabase
                .from('phone_numbers')
                .select('id, sid, phone_number')
                .eq('org_id', org.id)
                .eq('status', 'available')
                .limit(1)
                .maybeSingle();

              const orgRow = (await supabase
                .from('organizations')
                .select('twilio_subaccount_sid, twilio_messaging_service_sid')
                .eq('id', org.id)
                .single()).data as { twilio_subaccount_sid: string; twilio_messaging_service_sid: string | null };

              const PUBLIC_URL = process.env.PUBLIC_URL || '';
              const baseUrl = PUBLIC_URL.replace(/\/$/, '');
              const smsWebhookUrl = baseUrl ? `${baseUrl}/api/webhooks/twilio/sms-inbound` : undefined;
              const smsStatusCallback = baseUrl ? `${baseUrl}/api/webhooks/twilio/sms-status` : undefined;
              const voiceWebhookUrl = baseUrl ? `${baseUrl}/api/twilio/voice/call` : undefined;

              if (available?.id) {
                // Assign existing available number to the seat
                await supabase
                  .from('phone_numbers')
                  .update({ seat_id: ownerSeatId, status: 'assigned', updated_at: new Date().toISOString() })
                  .eq('id', available.id)
                  .eq('org_id', org.id);
              } else if (orgRow?.twilio_subaccount_sid) {
                // Purchase a new number on the subaccount and assign
                try {
                  const subClient = getTwilioClientForSubaccount({ accountSid: orgRow.twilio_subaccount_sid });

                  // Search for a US local number with SMS and Voice
                  const sub = subClient as unknown as {
                    availablePhoneNumbers: (country: string) => {
                      local: {
                        list: (args: { smsEnabled?: boolean; voiceEnabled?: boolean; limit?: number }) => Promise<Array<{ phoneNumber: string }>>;
                      };
                    };
                  };
                  const cArgs: { smsEnabled?: boolean; voiceEnabled?: boolean; limit?: number; areaCode?: string } = { smsEnabled: true, voiceEnabled: true, limit: 1 };
                  if (!isRenewal && areaCode) cArgs.areaCode = areaCode;
                  const candidates = await sub
                    .availablePhoneNumbers('US')
                    .local.list(cArgs);

                  if (Array.isArray(candidates) && candidates.length > 0) {
                    const num = candidates[0];
                    const purchased = await (subClient as unknown as { incomingPhoneNumbers: { create: (args: { phoneNumber: string; smsUrl?: string; statusCallback?: string; voiceUrl?: string; voiceMethod?: string }) => Promise<{ sid: string; phoneNumber: string }> } }).incomingPhoneNumbers.create({
                      phoneNumber: num.phoneNumber,
                      smsUrl: smsWebhookUrl,
                      statusCallback: smsStatusCallback,
                      voiceUrl: voiceWebhookUrl,
                      voiceMethod: 'POST'
                    });

                    // Attach to messaging service if present
                    if (orgRow.twilio_messaging_service_sid) {
                      const msgApi = (subClient as unknown as { messaging: { v1: { services: (sid: string) => { phoneNumbers: { create: (args: { phoneNumberSid: string }) => Promise<unknown> } } } } }).messaging.v1;
                      await msgApi.services(orgRow.twilio_messaging_service_sid).phoneNumbers.create({ phoneNumberSid: purchased.sid });
                    }

                    // Store and assign
                    const { data: inserted } = await supabase
                      .from('phone_numbers')
                      .insert({
                        org_id: org.id,
                        seat_id: ownerSeatId,
                        phone_number: purchased.phoneNumber,
                        sid: purchased.sid,
                        capabilities: { sms: true, voice: true },
                        status: 'assigned',
                        sms_webhook_url: smsWebhookUrl ?? null,
                        voice_webhook_url: voiceWebhookUrl ?? null
                      })
                      .select('id')
                      .single();

                    if (!inserted) {
                      console.warn('Failed to persist purchased phone number for org', org.id);
                    }
                  } else {
                    console.warn('No Twilio phone numbers available for purchase');
                  }
                } catch (purchaseError) {
                  console.error('Failed to purchase/assign phone number during onboarding:', purchaseError);
                }
              }
            }
          }
        } catch (twilioError) {
          console.error('Failed to provision Twilio resources after activation:', twilioError);
        }
      }
    }

    await ensureWallet(updatedOrg.id);

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

