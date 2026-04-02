import express from 'express';

import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';
import { getWalletStatus, getUsageCatalog } from '../controllers/billingUsage.js';
import { getStripeClient } from '../utils/stripe.js';
import { supabase } from '../utils/supabaseClient.js';
import {
	getCROAddonStatus,
	subscribeToCROAddon,
	cancelCROAddon
} from '../utils/croAddon.js';
import billingPublicRoutes from './billingPublic.js';
import { createOrganizationFromDeferredSubscription } from '../utils/deferredOrgSignup.js';
import { captureApiError } from '../utils/sentryCapture.js';

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

		const { data: deferred, error: defErr } = await supabase
			.from('stripe_deferred_org_signups')
			.select('*')
			.eq('user_id', userId)
			.maybeSingle();

		if (defErr || !deferred) {
			return res.status(404).json({ error: 'No pending organization signup (complete plan + payment steps first)' });
		}
		if (!deferred.stripe_subscription_id) {
			return res.status(400).json({
				error: 'Subscription not created yet — finish entering your card on the payment step first.'
			});
		}

		const subscription = await stripe.subscriptions.retrieve(deferred.stripe_subscription_id, {
			expand: ['latest_invoice.payment_intent', 'items.data.price']
		});

		const invoice = subscription.latest_invoice as Stripe.Invoice | null;
		if (!invoice || invoice.status !== 'paid') {
			return res.status(400).json({
				error: 'Invoice not in paid state',
				invoiceStatus: invoice?.status,
				subscriptionStatus: subscription.status
			});
		}

		const createdOrg = await createOrganizationFromDeferredSubscription(stripe, subscription);
		let orgIdToActivate = createdOrg?.id ?? null;
		if (!orgIdToActivate) {
			const { data: existing } = await supabase
				.from('organizations')
				.select('id')
				.eq('stripe_subscription_id', subscription.id)
				.maybeSingle();
			orgIdToActivate = existing?.id ?? null;
		}

		if (!orgIdToActivate) {
			return res.status(400).json({
				error: 'Could not create organization (subscription must be active or trialing)',
				subscriptionStatus: subscription.status
			});
		}

		console.log('[TEST] Manually confirming payment for org:', orgIdToActivate);
		const { error: updateError } = await supabase
			.from('organizations')
			.update({
				status: 'active',
				stripe_status: subscription.status,
				stripe_latest_invoice_id: invoice.id,
				stripe_latest_invoice_status: invoice.status,
				payment_action_required: false,
				updated_at: new Date().toISOString()
			})
			.eq('id', orgIdToActivate);

		if (updateError) {
			console.error('[TEST] Failed to update org status:', updateError);
			captureApiError(updateError, req, { feature: 'billing-test-confirm-org-update' });
			return res.status(500).json({ error: 'Failed to update organization' });
		}

		console.log('[TEST] ✓ Organization activated:', orgIdToActivate);
		return res.json({
			ok: true,
			message: 'Organization activated',
			orgId: orgIdToActivate,
			status: 'active'
		});
	} catch (error) {
		console.error('[TEST] Error confirming payment:', error);
		captureApiError(error, req, { feature: 'billing-test-confirm-payment' });
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
			captureApiError(error, req, { feature: 'billing-wallet-auto-recharge-load' });
			return res.status(500).json({ error: 'Failed to load auto-recharge settings' });
		}

		return res.json({ settings: data ?? null });
	} catch (error) {
		console.error('Auto-recharge load error', error);
		captureApiError(error, req, { feature: 'billing-wallet-auto-recharge-load' });
		return res.status(500).json({ error: 'Failed to load auto-recharge settings' });
	}
});

router.put('/wallet/auto-recharge/:organizationId', async (req, res) => {
	try {
		const { organizationId } = req.params;
		const {
			enabled,
			amount_cents: amountCents,
			threshold_cents: thresholdCents,
			payment_method_id: paymentMethodId
		} = req.body as {
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
			return res
				.status(400)
				.json({ error: error.message ?? 'Failed to save auto-recharge settings' });
		}

		return res.json({ settings: data });
	} catch (error) {
		console.error('Auto-recharge save error', error);
		captureApiError(error, req, { feature: 'billing-wallet-auto-recharge-save' });
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
		captureApiError(error, req, { feature: 'billing-wallet-topup-intent' });
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
			ending_before: endingBefore
		});

		return res.json({
			data: invoices.data,
			has_more: invoices.has_more,
			url: invoices.url
		});
	} catch (error) {
		console.error('Invoices fetch error', error);
		captureApiError(error, req, { feature: 'billing-invoices-list' });
		return res.status(500).json({ error: 'Failed to fetch invoices' });
	}
});

/**
 * Preview of the next invoice (same idea as Stripe Dashboard “Upcoming invoice”).
 */
router.get('/upcoming-invoice', async (req, res) => {
	try {
		const customerId = req.query.customerId as string | undefined;
		const subscriptionId = (req.query.subscriptionId as string | undefined) || undefined;
		if (!customerId) {
			return res.status(400).json({ error: 'customerId is required' });
		}

		const params: Stripe.InvoiceCreatePreviewParams = { customer: customerId };
		if (subscriptionId) {
			params.subscription = subscriptionId;
		}

		try {
			const upcoming = await stripe.invoices.createPreview(params);
			const billedAt =
				upcoming.next_payment_attempt ?? upcoming.period_end ?? null;
			const lines = upcoming.lines.data.map((line: Stripe.InvoiceLineItem) => ({
				id: line.id,
				description: line.description ?? '(Subscription item)',
				amount: line.amount,
				quantity: line.quantity ?? 1,
				period:
					line.period && typeof line.period.start === 'number'
						? { start: line.period.start, end: line.period.end }
						: null
			}));

			return res.json({
				upcoming: {
					billed_at: billedAt,
					next_payment_attempt: upcoming.next_payment_attempt,
					period_end: upcoming.period_end,
					amount_due: upcoming.amount_due,
					total: upcoming.total,
					currency: upcoming.currency,
					lines
				}
			});
		} catch (err) {
			if (
				err instanceof Stripe.errors.StripeInvalidRequestError &&
				(err.code === 'invoice_upcoming_none' ||
					/(invoice_upcoming|no upcoming|upcoming invoice)/i.test(err.message ?? ''))
			) {
				return res.json({ upcoming: null });
			}
			throw err;
		}
	} catch (error) {
		console.error('Upcoming invoice fetch error', error);
		captureApiError(error, req, { feature: 'billing-upcoming-invoice' });
		return res.status(500).json({ error: 'Failed to fetch upcoming invoice' });
	}
});

// ============================================
// CRO Studio Addon Routes
// ============================================

/**
 * GET /api/billing/cro-addon/status
 * Get current CRO Studio addon status for the user's organization
 */
router.get('/cro-addon/status', async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.single();

		if (!userOrg?.organization_id) {
			return res.status(403).json({ error: 'No organization found' });
		}

		const status = await getCROAddonStatus(userOrg.organization_id);
		return res.json(status);
	} catch (error) {
		console.error('[Billing] CRO addon status error:', error);
		captureApiError(error, req, { feature: 'billing-cro-addon-status' });
		return res.status(500).json({ error: 'Failed to get CRO addon status' });
	}
});

/**
 * POST /api/billing/cro-addon/subscribe
 * Subscribe to CRO Studio addon
 */
router.post('/cro-addon/subscribe', async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id, role')
			.eq('user_id', userId)
			.single();

		if (!userOrg?.organization_id) {
			return res.status(403).json({ error: 'No organization found' });
		}

		if (!['owner', 'admin'].includes(userOrg.role || '')) {
			return res.status(403).json({ error: 'Only admins can manage subscriptions' });
		}

		const result = await subscribeToCROAddon(userOrg.organization_id);

		if (!result.success) {
			return res.status(400).json({ error: result.error });
		}

		return res.json({ success: true, message: 'Successfully subscribed to CRO Studio!' });
	} catch (error) {
		console.error('[Billing] CRO addon subscribe error:', error);
		captureApiError(error, req, { feature: 'billing-cro-addon-subscribe' });
		return res.status(500).json({ error: 'Failed to subscribe to CRO addon' });
	}
});

/**
 * POST /api/billing/cro-addon/cancel
 * Cancel CRO Studio addon
 */
router.post('/cro-addon/cancel', async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized' });
		}

		const { data: userOrg } = await supabase
			.from('user_organizations')
			.select('organization_id, role')
			.eq('user_id', userId)
			.single();

		if (!userOrg?.organization_id) {
			return res.status(403).json({ error: 'No organization found' });
		}

		if (!['owner', 'admin'].includes(userOrg.role || '')) {
			return res.status(403).json({ error: 'Only admins can manage subscriptions' });
		}

		const result = await cancelCROAddon(userOrg.organization_id);

		if (!result.success) {
			return res.status(400).json({ error: result.error });
		}

		return res.json({
			success: true,
			message: 'CRO Studio cancelled. CRO Studio features will be locked.'
		});
	} catch (error) {
		console.error('[Billing] CRO addon cancel error:', error);
		captureApiError(error, req, { feature: 'billing-cro-addon-cancel' });
		return res.status(500).json({ error: 'Failed to cancel CRO addon' });
	}
});

export default router;
