import express from 'express';

import { requireAuth } from '../middleware/auth.js';
import { getWalletStatus, getUsageCatalog } from '../controllers/billingUsage.js';
import { getStripeClient } from '../utils/stripe.js';
import { supabase } from '../utils/supabaseClient.js';
import billingPublicRoutes from './billingPublic.js';

const router = express.Router();
const stripe = getStripeClient();

router.use((req, res, next) => {
  if (req.path.startsWith('/public')) {
    next();
  } else {
    requireAuth(req, res, next);
  }
});

router.use('/public', billingPublicRoutes);

// Manual webhook trigger for testing (development only)
router.post('/test/confirm-payment', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the user's most recent payment_pending organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', userId)
      .eq('status', 'payment_pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (orgError || !org) {
      return res.status(404).json({ error: 'No pending organization found' });
    }

    // Verify the subscription exists and get its latest invoice
    if (!org.stripe_subscription_id) {
      return res.status(400).json({ error: 'Organization has no subscription' });
    }

    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id, {
      expand: ['latest_invoice.payment_intent']
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    if (!invoice || invoice.status !== 'paid') {
      return res.status(400).json({ 
        error: 'Invoice not in paid state',
        invoiceStatus: invoice?.status,
        subscriptionStatus: subscription.status
      });
    }

    // Manually trigger the status update that would normally come from webhook
    console.log('[TEST] Manually confirming payment for org:', org.id);
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        status: 'active',
        stripe_status: 'active',
        stripe_latest_invoice_id: invoice.id,
        stripe_latest_invoice_status: invoice.status,
        payment_action_required: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', org.id);

    if (updateError) {
      console.error('[TEST] Failed to update org status:', updateError);
      return res.status(500).json({ error: 'Failed to update organization' });
    }

    console.log('[TEST] ✓ Organization activated:', org.id);
    return res.json({ 
      ok: true,
      message: 'Organization activated',
      orgId: org.id,
      status: 'active'
    });
  } catch (error) {
    console.error('[TEST] Error confirming payment:', error);
    return res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

router.get('/wallet/status', getWalletStatus);
router.get('/usage-catalog', getUsageCatalog);
router.get('/wallet/auto-recharge/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const { data, error } = await supabase
      .from('usage_wallet_auto_recharge')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      console.error('Failed to load auto-recharge settings', error);
      return res.status(500).json({ error: 'Failed to load auto-recharge settings' });
    }

    return res.json({ settings: data ?? null });
  } catch (error) {
    console.error('Auto-recharge load error', error);
    return res.status(500).json({ error: 'Failed to load auto-recharge settings' });
  }
});

router.put('/wallet/auto-recharge/:organizationId', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { enabled, amount_cents: amountCents, threshold_cents: thresholdCents, payment_method_id: paymentMethodId } = req.body as {
      enabled?: boolean;
      amount_cents?: number;
      threshold_cents?: number;
      payment_method_id?: string | null;
    };

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const { data, error } = await supabase.rpc('upsert_usage_wallet_auto_recharge', {
      p_organization_id: organizationId,
      p_enabled: Boolean(enabled),
      p_amount_cents: amountCents,
      p_threshold_cents: thresholdCents,
      p_payment_method_id: paymentMethodId ?? null
    });

    if (error) {
      console.error('Failed to save auto-recharge settings', error);
      return res.status(400).json({ error: error.message ?? 'Failed to save auto-recharge settings' });
    }

    return res.json({ settings: data });
  } catch (error) {
    console.error('Auto-recharge save error', error);
    return res.status(500).json({ error: 'Failed to save auto-recharge settings' });
  }
});

router.post('/wallet/topup/:organizationId/intent', async (req, res) => {
  try {
    const { organizationId } = req.params;
    const {
      amount_cents: amountCents,
      auto_confirm: autoConfirm,
      purpose,
      metadata
    } = req.body as {
		amount_cents?: number;
		auto_confirm?: boolean;
		purpose?: 'wallet_topup' | 'wallet_auto_recharge';
		metadata?: Record<string, string>;
	};

    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const { createTopUpPaymentIntent } = await import('../utils/walletTopup.js');

    const intent = await createTopUpPaymentIntent({
      organizationId,
      amountCents,
      autoConfirm,
      purpose: purpose ?? 'wallet_topup',
      metadata
    });

    return res.json({
      client_secret: intent.clientSecret,
      payment_intent_id: intent.paymentIntentId,
      wallet: intent.wallet
    });
  } catch (error) {
    console.error('Wallet top-up intent error', error);
    return res.status(500).json({ error: 'Failed to create wallet top-up intent' });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const customerId = req.query.customerId as string | undefined;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId is required' });
    }

    const limit = Number(req.query.limit ?? 10);
    const startingAfter = (req.query.starting_after as string | undefined) || undefined;
    const endingBefore = (req.query.ending_before as string | undefined) || undefined;

    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit,
      starting_after: startingAfter,
      ending_before: endingBefore,
      expand: ['data.charge']
    });

    return res.json({
      data: invoices.data,
      has_more: invoices.has_more,
      url: invoices.url
    });
  } catch (error) {
    console.error('Invoices fetch error', error);
    return res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

export default router;

