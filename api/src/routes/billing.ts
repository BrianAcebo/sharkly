import express from 'express';

import { requireAuth } from '../middleware/auth';
import { getWalletStatus, getUsageCatalog } from '../controllers/billingUsage';
import { getStripeClient } from '../utils/stripe';
import { supabase } from '../utils/supabaseClient';
import { listActivePlans } from '../controllers/billingPublic';

const router = express.Router();
const stripe = getStripeClient();

router.use('/public', (req, _res, next) => {
  next();
});

router.use((req, res, next) => {
  if (req.path.startsWith('/public')) {
    next();
  } else {
    requireAuth(req, res, next);
  }
});

router.get('/public/plans', listActivePlans);

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

    const { createTopUpPaymentIntent } = await import('../utils/walletTopup');

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

