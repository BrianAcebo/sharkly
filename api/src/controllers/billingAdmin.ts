import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
import { getStripeClient } from '../utils/stripe.js';
import crypto from 'crypto';

const stripe = getStripeClient();

// Admin password hash (SHA-256)
const ADMIN_PASSWORD_HASH = '07375a6c93880188fac0d75a37b0def86f7826d36db61dcb5f5771974e390f07';

// =====================================================
// Admin Credit Adjustment
// =====================================================
// Manually adjust credits for support/refund cases
export const adjustCredits = async (req: Request, res: Response) => {
	try {
		const { orgId, adjustment, reason } = req.body as {
			orgId: string;
			adjustment: number;
			reason: string;
		};

		if (!orgId || typeof adjustment !== 'number' || !reason) {
			return res.status(400).json({
				error: 'Missing required fields: orgId, adjustment, reason'
			});
		}

		// Get admin user ID from auth (optional)
		const adminUserId = (req as any).user?.id ?? null;

		const { data, error } = await supabase.rpc('admin_adjust_credits', {
			p_org_id: orgId,
			p_adjustment: adjustment,
			p_reason: reason,
			p_admin_user_id: adminUserId
		});

		if (error) {
			console.error('[ADMIN] Credit adjustment failed', { orgId, error });
			return res.status(500).json({ error: error.message });
		}

		if (data && !data.success) {
			return res.status(400).json({ error: data.error ?? 'Adjustment failed' });
		}

		console.log('[ADMIN] Credits adjusted', {
			orgId,
			adjustment,
			reason,
			adminUserId,
			result: data
		});

		return res.json(data);
	} catch (error) {
		console.error('[ADMIN] Credit adjustment exception', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// =====================================================
// Preview Tier Change
// =====================================================
// Preview what would happen with a tier change (for UI)
export const previewTierChange = async (req: Request, res: Response) => {
	try {
		const { orgId, newMonthlyCredits, prorate } = req.body as {
			orgId: string;
			newMonthlyCredits: number;
			prorate?: boolean;
		};

		if (!orgId || typeof newMonthlyCredits !== 'number') {
			return res.status(400).json({
				error: 'Missing required fields: orgId, newMonthlyCredits'
			});
		}

		const { data, error } = await supabase.rpc('preview_tier_change', {
			p_org_id: orgId,
			p_new_monthly_credits: newMonthlyCredits,
			p_prorate: prorate ?? false
		});

		if (error) {
			console.error('[ADMIN] Tier preview failed', { orgId, error });
			return res.status(500).json({ error: error.message });
		}

		return res.json(data);
	} catch (error) {
		console.error('[ADMIN] Tier preview exception', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// =====================================================
// Get Billing History
// =====================================================
// Full billing history for an org (subscription events, usage, wallet)
export const getBillingHistory = async (req: Request, res: Response) => {
	try {
		const { orgId } = req.params;
		const limit = Number(req.query.limit ?? 50);

		if (!orgId) {
			return res.status(400).json({ error: 'orgId is required' });
		}

		const { data, error } = await supabase.rpc('get_org_billing_history', {
			p_org_id: orgId,
			p_limit: limit
		});

		if (error) {
			console.error('[ADMIN] Billing history fetch failed', { orgId, error });
			return res.status(500).json({ error: error.message });
		}

		return res.json(data);
	} catch (error) {
		console.error('[ADMIN] Billing history exception', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// =====================================================
// Get Credit Summary
// =====================================================
// Quick credit summary for an org
export const getCreditSummary = async (req: Request, res: Response) => {
	try {
		const { orgId } = req.params;

		if (!orgId) {
			return res.status(400).json({ error: 'orgId is required' });
		}

		const { data, error } = await supabase.rpc('get_org_credits', {
			p_org_id: orgId
		});

		if (error) {
			console.error('[ADMIN] Credit summary fetch failed', { orgId, error });
			return res.status(500).json({ error: error.message });
		}

		return res.json(data);
	} catch (error) {
		console.error('[ADMIN] Credit summary exception', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// =====================================================
// Manual Tier Change
// =====================================================
// Manually change org tier credits (for admin override)
export const changeTierCredits = async (req: Request, res: Response) => {
	try {
		const { orgId, newMonthlyCredits, prorate } = req.body as {
			orgId: string;
			newMonthlyCredits: number;
			prorate?: boolean;
		};

		if (!orgId || typeof newMonthlyCredits !== 'number') {
			return res.status(400).json({
				error: 'Missing required fields: orgId, newMonthlyCredits'
			});
		}

		const { data, error } = await supabase.rpc('change_org_tier', {
			p_org_id: orgId,
			p_new_monthly_credits: newMonthlyCredits,
			p_prorate: prorate ?? false
		});

		if (error) {
			console.error('[ADMIN] Tier change failed', { orgId, error });
			return res.status(500).json({ error: error.message });
		}

		if (data && !data.success) {
			return res.status(400).json({ error: data.error ?? 'Tier change failed' });
		}

		console.log('[ADMIN] Tier credits changed', {
			orgId,
			newMonthlyCredits,
			prorate,
			result: data
		});

		return res.json(data);
	} catch (error) {
		console.error('[ADMIN] Tier change exception', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// =====================================================
// Manual Extra Seats Credit Adjustment
// =====================================================
// Manually adjust credits for seat changes (for admin override)
// Note: This only adjusts CREDITS. Actual seat_events are managed by seats.ts
export const adjustCreditsForSeats = async (req: Request, res: Response) => {
	try {
		const { orgId, seatDelta, immediate } = req.body as {
			orgId: string;
			seatDelta: number; // positive = adding seats, negative = removing
			immediate?: boolean;
		};

		if (!orgId || typeof seatDelta !== 'number') {
			return res.status(400).json({
				error: 'Missing required fields: orgId, seatDelta'
			});
		}

		const { data, error } = await supabase.rpc('adjust_credits_for_seat_change', {
			p_org_id: orgId,
			p_seat_delta: seatDelta,
			p_immediate: immediate ?? true
		});

		if (error) {
			console.error('[ADMIN] Seat credit adjustment failed', { orgId, error });
			return res.status(500).json({ error: error.message });
		}

		if (data && !data.success) {
			return res.status(400).json({
				error: data.error ?? 'Seat credit adjustment failed',
				details: data
			});
		}

		console.log('[ADMIN] Seat credits adjusted', {
			orgId,
			seatDelta,
			immediate,
			result: data
		});

		return res.json(data);
	} catch (error) {
		console.error('[ADMIN] Seat credit adjustment exception', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// =====================================================
// Create Checkout Session for Wallet Top-up
// =====================================================
// Create a Stripe Checkout session for one-time wallet credit purchase
export const createWalletCheckoutSession = async (req: Request, res: Response) => {
	try {
		const { orgId, amountCents, successUrl, cancelUrl } = req.body as {
			orgId: string;
			amountCents: number;
			successUrl: string;
			cancelUrl: string;
		};

		if (!orgId || !amountCents || !successUrl || !cancelUrl) {
			return res.status(400).json({
				error: 'Missing required fields: orgId, amountCents, successUrl, cancelUrl'
			});
		}

		// Get org's Stripe customer ID
		const { data: org, error: orgError } = await supabase
			.from('organizations')
			.select('stripe_customer_id, name')
			.eq('id', orgId)
			.single();

		if (orgError || !org) {
			return res.status(404).json({ error: 'Organization not found' });
		}

		if (!org.stripe_customer_id) {
			return res.status(400).json({ error: 'Organization has no Stripe customer' });
		}

		// Calculate credits
		const creditsToAdd = Math.floor(amountCents / 20); // $0.20 per credit

		// Create Checkout session
		const session = await stripe.checkout.sessions.create({
			mode: 'payment',
			customer: org.stripe_customer_id,
			line_items: [
				{
					price_data: {
						currency: 'usd',
						product_data: {
							name: `${creditsToAdd} Credits`,
							description: `Wallet top-up for ${org.name}`
						},
						unit_amount: amountCents
					},
					quantity: 1
				}
			],
			metadata: {
				purpose: 'wallet_topup',
				type: 'wallet_credits',
				organizationId: orgId,
				amount_cents: String(amountCents),
				credits: String(creditsToAdd),
				description: `${creditsToAdd} credits wallet top-up`
			},
			success_url: successUrl,
			cancel_url: cancelUrl
		});

		console.log('[BILLING] Wallet checkout session created', {
			sessionId: session.id,
			orgId,
			amountCents,
			credits: creditsToAdd
		});

		return res.json({
			sessionId: session.id,
			url: session.url,
			credits: creditsToAdd,
			amountCents
		});
	} catch (error) {
		console.error('[BILLING] Checkout session creation failed', error);
		return res.status(500).json({ error: 'Failed to create checkout session' });
	}
};

// =====================================================
// Get Monthly Usage Summary
// =====================================================
export const getMonthlyUsage = async (req: Request, res: Response) => {
	try {
		const { orgId } = req.params;

		if (!orgId) {
			return res.status(400).json({ error: 'orgId is required' });
		}

		const { data, error } = await supabase.rpc('get_org_credit_usage_month', {
			p_org_id: orgId
		});

		if (error) {
			console.error('[BILLING] Monthly usage fetch failed', { orgId, error });
			return res.status(500).json({ error: error.message });
		}

		return res.json(data);
	} catch (error) {
		console.error('[BILLING] Monthly usage exception', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// =====================================================
// Manual Reset Monthly Credits (Admin use only)
// =====================================================
// Note: Primary reset happens automatically on invoice.paid webhook
// This is only for manual admin intervention if needed
export const resetMonthlyCreditsForOrg = async (req: Request, res: Response) => {
	try {
		const { orgId } = req.body as { orgId: string };

		if (!orgId) {
			return res.status(400).json({ error: 'orgId is required' });
		}

		const { data, error } = await supabase.rpc('reset_monthly_included_credits_for_org', {
			p_org_id: orgId
		});

		if (error) {
			console.error('[ADMIN] Manual credit reset failed', { orgId, error });
			return res.status(500).json({ error: error.message });
		}

		console.log('[ADMIN] Manual credit reset completed', {
			orgId,
			result: data,
			timestamp: new Date().toISOString()
		});

		return res.json({
			success: true,
			orgId,
			details: data
		});
	} catch (error) {
		console.error('[ADMIN] Manual credit reset exception', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// =====================================================
// Refund Admin Functions
// =====================================================

// Look up organization by ID, email, or name for refund processing
export const lookupOrgForRefund = async (req: Request, res: Response) => {
	try {
		const { query } = req.query as { query?: string };

		if (!query || query.length < 2) {
			return res.status(400).json({ error: 'Search query must be at least 2 characters' });
		}

		// Check if query looks like a UUID
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

		// Build the filter - only include ID match if it's a valid UUID
		const filter = isUuid ? `id.eq.${query},name.ilike.%${query}%` : `name.ilike.%${query}%`;

		// Search organizations by ID or name
		const { data: orgs, error } = await supabase
			.from('organizations')
			.select(
				`
        id,
        name,
        plan_code,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_status,
        included_credits_monthly,
        included_credits_remaining,
        last_refund_at,
        refund_count_90d,
        created_at
      `
			)
			.or(filter)
			.limit(10);

		if (error) {
			console.error('[ADMIN] Org lookup failed', error);
			return res.status(500).json({ error: error.message });
		}

		// Get wallet info for each org
		const orgsWithWallet = await Promise.all(
			(orgs || []).map(async (org) => {
				const { data: wallet } = await supabase
					.from('usage_wallets')
					.select('balance_cents')
					.eq('organization_id', org.id)
					.maybeSingle();

				return {
					...org,
					wallet_balance_cents: wallet?.balance_cents ?? 0
				};
			})
		);

		return res.json(orgsWithWallet);
	} catch (error) {
		console.error('[ADMIN] Org lookup exception', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// Get full refund audit info for an organization
export const getRefundAudit = async (req: Request, res: Response) => {
	try {
		const { orgId } = req.params;

		if (!orgId) {
			return res.status(400).json({ error: 'orgId is required' });
		}

		// Get organization info
		const { data: org, error: orgError } = await supabase
			.from('organizations')
			.select(
				`
        id,
        name,
        plan_code,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_status,
        included_credits_monthly,
        included_credits_remaining,
        last_refund_at,
        refund_count_90d,
        created_at
      `
			)
			.eq('id', orgId)
			.single();

		if (orgError || !org) {
			return res.status(404).json({ error: 'Organization not found' });
		}

		// Get wallet balance
		const { data: wallet } = await supabase
			.from('usage_wallets')
			.select('balance_cents')
			.eq('organization_id', orgId)
			.maybeSingle();

		// Check subscription refund eligibility
		const { data: subEligibility } = await supabase.rpc('check_subscription_refund_eligibility', {
			p_org_id: orgId
		});

		// Check wallet refund eligibility
		const { data: walletEligibility } = await supabase.rpc('check_wallet_refund_eligibility', {
			p_org_id: orgId
		});

		// Get recent usage events (last 30) - usage_events uses org_id, category, credit_cost
		const { data: usageEventsRaw } = await supabase
			.from('usage_events')
			.select('id, category, credit_cost, occurred_at, meta')
			.eq('org_id', orgId)
			.order('occurred_at', { ascending: false })
			.limit(30);
		const usageEvents = (usageEventsRaw || []).map((e) => ({
			id: e.id,
			action_key: e.category,
			credits_spent: e.credit_cost ?? 0,
			occurred_at: e.occurred_at,
			metadata: e.meta ?? {}
		}));

		// Get recent action results (last 20) - action_results uses action_type, credits_spent
		const { data: actionResultsRaw } = await supabase
			.from('action_results')
			.select(
				'id, action_type, entity_type, entity_id, success, error_message, credits_spent, created_at'
			)
			.eq('organization_id', orgId)
			.order('created_at', { ascending: false })
			.limit(20);
		const actionResults = (actionResultsRaw || []).map((r) => ({
			...r,
			action_key: r.action_type,
			credits_charged: r.credits_spent ?? 0
		}));

		// Get refund history
		const { data: refundHistory } = await supabase
			.from('refund_requests')
			.select('*')
			.eq('organization_id', orgId)
			.order('requested_at', { ascending: false })
			.limit(10);

		// Get recent invoices
		const { data: invoices } = await supabase
			.from('stripe_invoices')
			.select('*')
			.eq('org_id', orgId)
			.order('created_at', { ascending: false })
			.limit(5);

		// Get payment failures (NEW)
		const { data: paymentFailures } = await supabase
			.from('stripe_payment_failures')
			.select('*')
			.eq('organization_id', orgId)
			.order('created_at', { ascending: false })
			.limit(10);

		// Get subscription ledger (NEW)
		const { data: subscriptionLedger } = await supabase
			.from('stripe_subscription_ledger')
			.select('*')
			.eq('organization_id', orgId)
			.order('created_at', { ascending: false })
			.limit(20);

		return res.json({
			organization: {
				...org,
				wallet_balance_cents: wallet?.balance_cents ?? 0
			},
			eligibility: {
				subscription: subEligibility,
				wallet: walletEligibility
			},
			usage_events: usageEvents || [],
			action_results: actionResults || [],
			refund_history: refundHistory || [],
			recent_invoices: invoices || [],
			payment_failures: paymentFailures || [],
			subscription_ledger: subscriptionLedger || []
		});
	} catch (error) {
		console.error('[ADMIN] Refund audit exception', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// Admin process subscription refund
export const adminProcessSubscriptionRefund = async (req: Request, res: Response) => {
	try {
		const { orgId, reason } = req.body as { orgId: string; reason?: string };
		const adminUserId = (req as any).userId;

		if (!orgId) {
			return res.status(400).json({ error: 'orgId is required' });
		}

		// Check eligibility
		const { data: eligibility, error: eligError } = await supabase.rpc(
			'check_subscription_refund_eligibility',
			{ p_org_id: orgId }
		);

		if (eligError) {
			return res.status(500).json({ error: 'Failed to check eligibility' });
		}

		if (!eligibility?.eligible) {
			return res.status(400).json({
				error: 'Not eligible for refund',
				eligibility
			});
		}

		// Get charge ID
		let chargeId: string | undefined = eligibility.stripe_charge_id;
		if (!chargeId && eligibility.stripe_invoice_id) {
			const invoice = await stripe.invoices.retrieve(eligibility.stripe_invoice_id);
			// charge can be string, Charge object, or null - extract the ID
			const chargeVal = (invoice as unknown as { charge?: string | { id: string } | null }).charge;
			chargeId = typeof chargeVal === 'string' ? chargeVal : chargeVal?.id || undefined;
		}

		if (!chargeId) {
			return res.status(400).json({ error: 'Could not find charge to refund' });
		}

		// Create refund request record
		const { data: refundRequest, error: insertError } = await supabase
			.from('refund_requests')
			.insert({
				organization_id: orgId,
				user_id: adminUserId,
				refund_type: 'subscription',
				status: 'pending',
				stripe_charge_id: chargeId,
				stripe_invoice_id: eligibility.stripe_invoice_id,
				original_amount_cents: eligibility.original_amount_cents,
				refund_amount_cents: eligibility.refund_amount_cents,
				auto_eligible: false, // Admin processed
				eligibility_check: eligibility,
				reason: reason || 'Admin processed refund',
				notes: `Processed by admin ${adminUserId}`
			})
			.select()
			.single();

		if (insertError) {
			return res.status(500).json({ error: 'Failed to create refund request' });
		}

		// Process refund through Stripe
		const refund = await stripe.refunds.create({
			charge: chargeId,
			amount: eligibility.refund_amount_cents,
			reason: 'requested_by_customer',
			metadata: {
				refund_request_id: refundRequest.id,
				organization_id: orgId,
				refund_type: 'subscription',
				admin_user_id: adminUserId || 'unknown'
			}
		});

		// Update DB
		await supabase.rpc('process_subscription_refund', {
			p_refund_request_id: refundRequest.id,
			p_stripe_refund_id: refund.id,
			p_processed_by: adminUserId
		});

		console.log('[ADMIN] Subscription refund processed', {
			orgId,
			refundId: refund.id,
			amount: eligibility.refund_amount_cents,
			adminUserId
		});

		return res.json({
			success: true,
			refund_id: refundRequest.id,
			stripe_refund_id: refund.id,
			refund_amount_cents: eligibility.refund_amount_cents,
			refund_amount_dollars: (eligibility.refund_amount_cents / 100).toFixed(2)
		});
	} catch (error: any) {
		console.error('[ADMIN] Subscription refund failed', error);
		return res.status(500).json({ error: error.message || 'Refund failed' });
	}
};

// Admin process wallet refund
export const adminProcessWalletRefund = async (req: Request, res: Response) => {
	try {
		const { orgId, reason } = req.body as { orgId: string; reason?: string };
		const adminUserId = (req as any).userId;

		if (!orgId) {
			return res.status(400).json({ error: 'orgId is required' });
		}

		// Check eligibility
		const { data: eligibility, error: eligError } = await supabase.rpc(
			'check_wallet_refund_eligibility',
			{ p_org_id: orgId }
		);

		if (eligError) {
			return res.status(500).json({ error: 'Failed to check eligibility' });
		}

		if (!eligibility?.eligible) {
			return res.status(400).json({
				error: 'Not eligible for wallet refund',
				eligibility
			});
		}

		// Find a charge to refund from
		const { data: org } = await supabase
			.from('organizations')
			.select('stripe_customer_id')
			.eq('id', orgId)
			.single();

		if (!org?.stripe_customer_id) {
			return res.status(400).json({ error: 'No Stripe customer found' });
		}

		// Find wallet top-up charge
		const charges = await stripe.charges.list({
			customer: org.stripe_customer_id,
			limit: 20
		});

		const walletCharge = charges.data.find(
			(c) =>
				c.status === 'succeeded' &&
				!c.refunded &&
				(c.metadata?.purpose === 'wallet_topup' || c.metadata?.purpose === 'wallet_auto_recharge')
		);

		if (!walletCharge) {
			return res.status(400).json({
				error: 'Could not find wallet charge to refund',
				message: 'Manual Stripe refund may be required'
			});
		}

		// Create refund request
		const { data: refundRequest, error: insertError } = await supabase
			.from('refund_requests')
			.insert({
				organization_id: orgId,
				user_id: adminUserId,
				refund_type: 'wallet',
				status: 'pending',
				stripe_charge_id: walletCharge.id,
				original_amount_cents: eligibility.refund_amount_cents,
				refund_amount_cents: eligibility.refund_amount_cents,
				auto_eligible: false,
				eligibility_check: eligibility,
				reason: reason || 'Admin processed wallet refund',
				notes: `Processed by admin ${adminUserId}`
			})
			.select()
			.single();

		if (insertError) {
			return res.status(500).json({ error: 'Failed to create refund request' });
		}

		// Process refund
		const refund = await stripe.refunds.create({
			charge: walletCharge.id,
			amount: eligibility.refund_amount_cents,
			reason: 'requested_by_customer',
			metadata: {
				refund_request_id: refundRequest.id,
				organization_id: orgId,
				refund_type: 'wallet',
				admin_user_id: adminUserId || 'unknown'
			}
		});

		// Update DB
		await supabase.rpc('process_wallet_refund', {
			p_refund_request_id: refundRequest.id,
			p_stripe_refund_id: refund.id,
			p_processed_by: adminUserId
		});

		console.log('[ADMIN] Wallet refund processed', {
			orgId,
			refundId: refund.id,
			amount: eligibility.refund_amount_cents,
			adminUserId
		});

		return res.json({
			success: true,
			refund_id: refundRequest.id,
			stripe_refund_id: refund.id,
			refund_amount_cents: eligibility.refund_amount_cents,
			refund_amount_dollars: (eligibility.refund_amount_cents / 100).toFixed(2)
		});
	} catch (error: any) {
		console.error('[ADMIN] Wallet refund failed', error);
		return res.status(500).json({ error: error.message || 'Refund failed' });
	}
};

// Admin credit back action
export const adminCreditBackAction = async (req: Request, res: Response) => {
	try {
		const { orgId, actionKey, credits, reason } = req.body as {
			orgId: string;
			actionKey: string;
			credits: number;
			reason: string;
		};

		if (!orgId || !actionKey || !credits || !reason) {
			return res
				.status(400)
				.json({ error: 'Missing required fields: orgId, actionKey, credits, reason' });
		}

		const { data, error } = await supabase.rpc('credit_back_action', {
			p_org_id: orgId,
			p_action_key: actionKey,
			p_credits: credits,
			p_reason: reason
		});

		if (error) {
			console.error('[ADMIN] Credit-back failed', error);
			return res.status(500).json({ error: error.message });
		}

		console.log('[ADMIN] Action credit-back processed', {
			orgId,
			actionKey,
			credits,
			reason
		});

		return res.json(data);
	} catch (error) {
		console.error('[ADMIN] Credit-back exception', error);
		return res.status(500).json({ error: 'Internal server error' });
	}
};

// =====================================================
// Admin Password Verification
// =====================================================
export const verifyAdminPassword = async (req: Request, res: Response) => {
	try {
		const { password } = req.body as { password: string };

		if (!password) {
			return res.status(400).json({ valid: false, error: 'Password required' });
		}

		const hash = crypto.createHash('sha256').update(password).digest('hex');
		const valid = hash === ADMIN_PASSWORD_HASH;

		if (!valid) {
			console.warn('[ADMIN] Invalid admin password attempt');
		}

		return res.json({ valid });
	} catch (error) {
		console.error('[ADMIN] Password verification error', error);
		return res.status(500).json({ valid: false, error: 'Verification failed' });
	}
};

// =====================================================
// Stripe Subscription Management
// =====================================================

// Cancel subscription
export const cancelSubscription = async (req: Request, res: Response) => {
	try {
		const { orgId, immediately } = req.body as { orgId: string; immediately?: boolean };

		if (!orgId) {
			return res.status(400).json({ error: 'orgId is required' });
		}

		// Get org subscription ID
		const { data: org, error: orgError } = await supabase
			.from('organizations')
			.select('stripe_subscription_id, name')
			.eq('id', orgId)
			.single();

		if (orgError || !org?.stripe_subscription_id) {
			return res.status(404).json({ error: 'Organization or subscription not found' });
		}

		if (immediately) {
			// Cancel immediately
			await stripe.subscriptions.cancel(org.stripe_subscription_id);
			console.log('[ADMIN] Subscription canceled immediately', {
				orgId,
				subId: org.stripe_subscription_id
			});
		} else {
			// Cancel at period end
			await stripe.subscriptions.update(org.stripe_subscription_id, {
				cancel_at_period_end: true
			});
			console.log('[ADMIN] Subscription set to cancel at period end', {
				orgId,
				subId: org.stripe_subscription_id
			});
		}

		return res.json({
			success: true,
			message: immediately
				? 'Subscription canceled immediately'
				: 'Subscription will cancel at end of billing period'
		});
	} catch (error: any) {
		console.error('[ADMIN] Cancel subscription failed', error);
		return res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
	}
};

// Pause subscription (uses Stripe pause_collection)
export const pauseSubscription = async (req: Request, res: Response) => {
	try {
		const { orgId } = req.body as { orgId: string };

		if (!orgId) {
			return res.status(400).json({ error: 'orgId is required' });
		}

		const { data: org, error: orgError } = await supabase
			.from('organizations')
			.select('stripe_subscription_id, name')
			.eq('id', orgId)
			.single();

		if (orgError || !org?.stripe_subscription_id) {
			return res.status(404).json({ error: 'Organization or subscription not found' });
		}

		await stripe.subscriptions.update(org.stripe_subscription_id, {
			pause_collection: {
				behavior: 'mark_uncollectible'
			}
		});

		// Update org status
		await supabase.from('organizations').update({ stripe_status: 'paused' }).eq('id', orgId);

		console.log('[ADMIN] Subscription paused', { orgId, subId: org.stripe_subscription_id });

		return res.json({
			success: true,
			message: 'Subscription paused - billing is on hold'
		});
	} catch (error: any) {
		console.error('[ADMIN] Pause subscription failed', error);
		return res.status(500).json({ error: error.message || 'Failed to pause subscription' });
	}
};

// Resume subscription
export const resumeSubscription = async (req: Request, res: Response) => {
	try {
		const { orgId } = req.body as { orgId: string };

		if (!orgId) {
			return res.status(400).json({ error: 'orgId is required' });
		}

		const { data: org, error: orgError } = await supabase
			.from('organizations')
			.select('stripe_subscription_id, name')
			.eq('id', orgId)
			.single();

		if (orgError || !org?.stripe_subscription_id) {
			return res.status(404).json({ error: 'Organization or subscription not found' });
		}

		// Check current subscription state
		const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);

		if (subscription.pause_collection) {
			// Resume from pause
			await stripe.subscriptions.update(org.stripe_subscription_id, {
				pause_collection: null as any
			});
		} else if (subscription.cancel_at_period_end) {
			// Undo cancel at period end
			await stripe.subscriptions.update(org.stripe_subscription_id, {
				cancel_at_period_end: false
			});
		}

		// Update org status
		await supabase.from('organizations').update({ stripe_status: 'active' }).eq('id', orgId);

		console.log('[ADMIN] Subscription resumed', { orgId, subId: org.stripe_subscription_id });

		return res.json({
			success: true,
			message: 'Subscription resumed'
		});
	} catch (error: any) {
		console.error('[ADMIN] Resume subscription failed', error);
		return res.status(500).json({ error: error.message || 'Failed to resume subscription' });
	}
};

// =====================================================
// Sync from Stripe
// =====================================================
// Pull latest data from Stripe API and update local database
export const syncFromStripe = async (req: Request, res: Response) => {
	try {
		const { orgId } = req.body as { orgId: string };

		if (!orgId) {
			return res.status(400).json({ error: 'orgId is required' });
		}

		// Get org's Stripe IDs
		const { data: org, error: orgError } = await supabase
			.from('organizations')
			.select('stripe_customer_id, stripe_subscription_id, name')
			.eq('id', orgId)
			.single();

		if (orgError || !org) {
			return res.status(404).json({ error: 'Organization not found' });
		}

		if (!org.stripe_customer_id) {
			return res.status(400).json({ error: 'Organization has no Stripe customer' });
		}

		const results = {
			customer: false,
			subscription: false,
			invoices: 0,
			charges: 0,
			paymentMethods: 0
		};

		// 1. Sync Customer
		try {
			const customer = await stripe.customers.retrieve(org.stripe_customer_id);
			if (!customer.deleted) {
				await supabase.from('stripe_customers').upsert(
					{
						organization_id: orgId,
						stripe_customer_id: customer.id,
						email: customer.email || null,
						name: customer.name || null,
						phone: customer.phone || null,
						address: customer.address
							? {
									line1: customer.address.line1,
									line2: customer.address.line2,
									city: customer.address.city,
									state: customer.address.state,
									postal_code: customer.address.postal_code,
									country: customer.address.country
								}
							: null,
						balance: customer.balance || 0,
						currency: customer.currency || 'usd',
						raw_payload: customer as unknown as Record<string, unknown>
					},
					{ onConflict: 'stripe_customer_id' }
				);
				results.customer = true;
			}
		} catch (e) {
			console.warn('[SYNC] Failed to sync customer', e);
		}

		// 2. Sync Subscription
		if (org.stripe_subscription_id) {
			try {
				const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
				const subAny = subscription as unknown as Record<string, unknown>;

				await supabase.from('stripe_subscription_snapshots').insert({
					org_id: orgId,
					stripe_subscription_id: subscription.id,
					stripe_customer_id: subscription.customer as string,
					event_type: 'manual_sync',
					status: subscription.status,
					collection_method: subscription.collection_method || null,
					current_period_start: subAny.current_period_start
						? new Date((subAny.current_period_start as number) * 1000).toISOString()
						: null,
					current_period_end: subAny.current_period_end
						? new Date((subAny.current_period_end as number) * 1000).toISOString()
						: null,
					trial_end: subscription.trial_end
						? new Date(subscription.trial_end * 1000).toISOString()
						: null,
					cancel_at: subscription.cancel_at
						? new Date(subscription.cancel_at * 1000).toISOString()
						: null,
					cancel_at_period_end: subscription.cancel_at_period_end || false,
					default_payment_method_id: subscription.default_payment_method as string | null,
					raw_payload: subscription as unknown as Record<string, unknown>
				});

				// Update org with latest subscription status
				await supabase
					.from('organizations')
					.update({
						stripe_status: subscription.status
					})
					.eq('id', orgId);

				results.subscription = true;
			} catch (e) {
				console.warn('[SYNC] Failed to sync subscription', e);
			}
		}

		// 3. Sync recent Invoices
		try {
			const invoices = await stripe.invoices.list({
				customer: org.stripe_customer_id,
				limit: 20
			});

			for (const invoice of invoices.data) {
				const invoiceAny = invoice as unknown as Record<string, unknown>;
				await supabase.from('stripe_invoices').upsert(
					{
						org_id: orgId,
						stripe_invoice_id: invoice.id,
						stripe_customer_id: invoice.customer as string,
						stripe_subscription_id: (invoiceAny.subscription as string) ?? null,
						status: invoice.status,
						amount_due: invoice.amount_due,
						amount_paid: invoice.amount_paid,
						amount_remaining: invoice.amount_remaining,
						currency: invoice.currency || 'usd',
						invoice_pdf: invoice.invoice_pdf || null,
						hosted_invoice_url: invoice.hosted_invoice_url || null,
						billing_reason: invoice.billing_reason || null,
						stripe_created_at: new Date(invoice.created * 1000).toISOString(),
						due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
						paid_at: invoice.status_transitions?.paid_at
							? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
							: null
					},
					{ onConflict: 'stripe_invoice_id' }
				);
				results.invoices++;
			}
		} catch (e) {
			console.warn('[SYNC] Failed to sync invoices', e);
		}

		// 4. Sync recent Charges
		try {
			const charges = await stripe.charges.list({
				customer: org.stripe_customer_id,
				limit: 20
			});

			for (const charge of charges.data) {
				const card = charge.payment_method_details?.card;
				const chargeAny = charge as unknown as Record<string, unknown>;

				await supabase.from('stripe_charges').upsert(
					{
						organization_id: orgId,
						stripe_charge_id: charge.id,
						stripe_customer_id: charge.customer as string | null,
						stripe_invoice_id: (chargeAny.invoice as string) ?? null,
						stripe_payment_intent_id: charge.payment_intent as string | null,
						amount: charge.amount,
						amount_refunded: charge.amount_refunded || 0,
						currency: charge.currency || 'usd',
						status: charge.status,
						paid: charge.paid,
						refunded: charge.refunded,
						card_brand: card?.brand || null,
						card_last4: card?.last4 || null,
						card_exp_month: card?.exp_month || null,
						card_exp_year: card?.exp_year || null,
						receipt_url: charge.receipt_url || null,
						receipt_email: charge.receipt_email || null,
						description: charge.description || null,
						raw_payload: charge as unknown as Record<string, unknown>,
						stripe_created_at: new Date(charge.created * 1000).toISOString()
					},
					{ onConflict: 'stripe_charge_id' }
				);
				results.charges++;
			}
		} catch (e) {
			console.warn('[SYNC] Failed to sync charges', e);
		}

		// 5. Sync Payment Methods
		try {
			const paymentMethods = await stripe.paymentMethods.list({
				customer: org.stripe_customer_id,
				type: 'card'
			});

			for (const pm of paymentMethods.data) {
				const card = pm.card;
				await supabase.from('stripe_payment_methods').upsert(
					{
						organization_id: orgId,
						stripe_payment_method_id: pm.id,
						stripe_customer_id: pm.customer as string,
						type: pm.type,
						card_brand: card?.brand || null,
						card_last4: card?.last4 || null,
						card_exp_month: card?.exp_month || null,
						card_exp_year: card?.exp_year || null,
						is_default: false,
						raw_payload: pm as unknown as Record<string, unknown>
					},
					{ onConflict: 'stripe_payment_method_id' }
				);
				results.paymentMethods++;
			}
		} catch (e) {
			console.warn('[SYNC] Failed to sync payment methods', e);
		}

		// 6. Log sync event to ledger
		try {
			await supabase.from('stripe_subscription_ledger').insert({
				organization_id: orgId,
				event_type: 'manual_sync',
				description: `Manual sync from Stripe: ${results.invoices} invoices, ${results.charges} charges synced`,
				balance_impact: 'none',
				metadata: results
			});
		} catch (e) {
			console.warn('[SYNC] Failed to log sync event', e);
		}

		console.log('[ADMIN] Stripe sync completed', { orgId, results });

		return res.json({
			success: true,
			message: 'Sync completed',
			results
		});
	} catch (error: any) {
		console.error('[ADMIN] Stripe sync failed', error);
		return res.status(500).json({ error: error.message || 'Sync failed' });
	}
};
