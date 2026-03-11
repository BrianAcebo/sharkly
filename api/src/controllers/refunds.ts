import { Request, Response } from 'express';
import { getStripeClient } from '../utils/stripe.js';
import { supabase } from '../utils/supabaseClient.js';

const stripe = getStripeClient();

// =====================================================
// Check Subscription Refund Eligibility
// =====================================================
export const checkSubscriptionRefundEligibility = async (req: Request, res: Response) => {
	try {
		const organizationId = (req as any).organizationId;
		if (!organizationId) {
			return res.status(401).json({ error: 'Organization context required' });
		}

		const { data, error } = await supabase.rpc('check_subscription_refund_eligibility', {
			p_org_id: organizationId
		});

		if (error) {
			console.error('[REFUND] Eligibility check failed:', error);
			return res.status(500).json({ error: 'Failed to check refund eligibility' });
		}

		return res.json(data);
	} catch (error) {
		console.error('[REFUND] Error checking eligibility:', error);
		return res.status(500).json({ error: 'Failed to check refund eligibility' });
	}
};

// =====================================================
// Check Wallet Refund Eligibility
// =====================================================
export const checkWalletRefundEligibility = async (req: Request, res: Response) => {
	try {
		const organizationId = (req as any).organizationId;
		if (!organizationId) {
			return res.status(401).json({ error: 'Organization context required' });
		}

		const { data, error } = await supabase.rpc('check_wallet_refund_eligibility', {
			p_org_id: organizationId
		});

		if (error) {
			console.error('[REFUND] Wallet eligibility check failed:', error);
			return res.status(500).json({ error: 'Failed to check wallet refund eligibility' });
		}

		return res.json(data);
	} catch (error) {
		console.error('[REFUND] Error checking wallet eligibility:', error);
		return res.status(500).json({ error: 'Failed to check wallet refund eligibility' });
	}
};

// =====================================================
// Request Subscription Refund
// =====================================================
export const requestSubscriptionRefund = async (req: Request, res: Response) => {
	try {
		const organizationId = (req as any).organizationId;
		const userId = (req as any).userId;

		if (!organizationId) {
			return res.status(401).json({ error: 'Organization context required' });
		}

		const { reason } = req.body as { reason?: string };

		// Check eligibility first
		const { data: eligibility, error: eligError } = await supabase.rpc(
			'check_subscription_refund_eligibility',
			{ p_org_id: organizationId }
		);

		if (eligError) {
			console.error('[REFUND] Eligibility check failed:', eligError);
			return res.status(500).json({ error: 'Failed to check refund eligibility' });
		}

		const eligibilityData = eligibility as {
			eligible: boolean;
			refund_amount_cents: number;
			original_amount_cents: number;
			stripe_invoice_id: string;
			stripe_charge_id?: string;
			denial_reasons: string[];
			requires_manual_review: boolean;
		};

		// If not eligible and amount is large, suggest email
		if (!eligibilityData.eligible) {
			if (eligibilityData.requires_manual_review) {
				return res.status(400).json({
					error: 'Manual review required',
					message:
						'Your refund request requires manual review. Please email hello@sharkly.co with your request.',
					denial_reasons: eligibilityData.denial_reasons
				});
			}
			return res.status(400).json({
				error: 'Not eligible for refund',
				denial_reasons: eligibilityData.denial_reasons
			});
		}

		// Get the charge ID from the invoice if not provided
		let chargeId: string | undefined = eligibilityData.stripe_charge_id;
		if (!chargeId && eligibilityData.stripe_invoice_id) {
			try {
				const invoice = await stripe.invoices.retrieve(eligibilityData.stripe_invoice_id);
				// charge can be string, Charge object, or null - extract the ID
				const chargeVal = (invoice as unknown as { charge?: string | { id: string } | null })
					.charge;
				chargeId = typeof chargeVal === 'string' ? chargeVal : chargeVal?.id || undefined;
			} catch (e) {
				console.error('[REFUND] Failed to get charge from invoice:', e);
			}
		}

		if (!chargeId) {
			return res.status(400).json({ error: 'Could not find charge to refund' });
		}

		// Create refund request record
		const { data: refundRequest, error: insertError } = await supabase
			.from('refund_requests')
			.insert({
				organization_id: organizationId,
				user_id: userId,
				refund_type: 'subscription',
				status: 'pending',
				stripe_charge_id: chargeId,
				stripe_invoice_id: eligibilityData.stripe_invoice_id,
				original_amount_cents: eligibilityData.original_amount_cents,
				refund_amount_cents: eligibilityData.refund_amount_cents,
				auto_eligible: true,
				eligibility_check: eligibility,
				reason: reason || null
			})
			.select()
			.single();

		if (insertError) {
			console.error('[REFUND] Failed to create refund request:', insertError);
			return res.status(500).json({ error: 'Failed to create refund request' });
		}

		// Process refund through Stripe
		try {
			const refund = await stripe.refunds.create({
				charge: chargeId,
				amount: eligibilityData.refund_amount_cents,
				reason: 'requested_by_customer',
				metadata: {
					refund_request_id: refundRequest.id,
					organization_id: organizationId,
					refund_type: 'subscription'
				}
			});

			// Update refund request with Stripe refund ID and mark as processed
			const { error: processError } = await supabase.rpc('process_subscription_refund', {
				p_refund_request_id: refundRequest.id,
				p_stripe_refund_id: refund.id,
				p_processed_by: userId
			});

			if (processError) {
				console.error('[REFUND] Failed to process refund in DB:', processError);
				// Refund went through Stripe but DB update failed - log for manual reconciliation
			}

			return res.json({
				success: true,
				refund_id: refundRequest.id,
				stripe_refund_id: refund.id,
				refund_amount_cents: eligibilityData.refund_amount_cents,
				refund_amount_dollars: (eligibilityData.refund_amount_cents / 100).toFixed(2),
				message:
					'Refund processed successfully. It may take 5-10 business days to appear on your statement.'
			});
		} catch (stripeError: any) {
			console.error('[REFUND] Stripe refund failed:', stripeError);

			// Update refund request as failed
			await supabase
				.from('refund_requests')
				.update({
					status: 'failed',
					notes: stripeError.message || 'Stripe refund failed'
				})
				.eq('id', refundRequest.id);

			return res.status(500).json({
				error: 'Refund processing failed',
				message: stripeError.message || 'Please contact hello@sharkly.co'
			});
		}
	} catch (error) {
		console.error('[REFUND] Error processing subscription refund:', error);
		return res.status(500).json({ error: 'Failed to process refund' });
	}
};

// =====================================================
// Request Wallet Refund
// =====================================================
export const requestWalletRefund = async (req: Request, res: Response) => {
	try {
		const organizationId = (req as any).organizationId;
		const userId = (req as any).userId;

		if (!organizationId) {
			return res.status(401).json({ error: 'Organization context required' });
		}

		const { reason } = req.body as { reason?: string };

		// Check eligibility
		const { data: eligibility, error: eligError } = await supabase.rpc(
			'check_wallet_refund_eligibility',
			{ p_org_id: organizationId }
		);

		if (eligError) {
			console.error('[REFUND] Wallet eligibility check failed:', eligError);
			return res.status(500).json({ error: 'Failed to check refund eligibility' });
		}

		const eligibilityData = eligibility as {
			eligible: boolean;
			refund_amount_cents: number;
			reason?: string;
		};

		if (!eligibilityData.eligible) {
			return res.status(400).json({
				error: 'Not eligible for wallet refund',
				reason: eligibilityData.reason
			});
		}

		// Find the most recent successful wallet top-up charge
		const { data: recentDeposits } = await supabase
			.from('usage_transactions')
			.select('reference_id')
			.eq('organization_id', organizationId)
			.eq('transaction_type', 'deposit')
			.eq('direction', 'credit')
			.order('created_at', { ascending: false })
			.limit(5);

		// Try to find a payment intent ID from deposits
		let chargeId: string | null = null;

		// Look for charges in stripe_charges table
		const { data: charges } = await supabase
			.from('stripe_charges')
			.select('stripe_charge_id, amount')
			.eq('organization_id', organizationId)
			.eq('status', 'succeeded')
			.order('created_at', { ascending: false })
			.limit(10);

		if (charges && charges.length > 0) {
			// Find charges that look like wallet top-ups (not subscription charges)
			// We'll refund proportionally from the most recent charges
			chargeId = charges[0].stripe_charge_id;
		}

		if (!chargeId) {
			// Fallback: search Stripe directly for recent charges
			try {
				const { data: org } = await supabase
					.from('organizations')
					.select('stripe_customer_id')
					.eq('id', organizationId)
					.single();

				if (org?.stripe_customer_id) {
					const stripeCharges = await stripe.charges.list({
						customer: org.stripe_customer_id,
						limit: 10
					});

					// Find a successful charge that's not an invoice charge (those are subscriptions)
					const walletCharge = stripeCharges.data.find(
						(c) =>
							c.status === 'succeeded' &&
							!(c as unknown as { invoice?: unknown }).invoice &&
							(c.metadata?.purpose === 'wallet_topup' ||
								c.metadata?.purpose === 'wallet_auto_recharge')
					);

					if (walletCharge) {
						chargeId = walletCharge.id;
					}
				}
			} catch (e) {
				console.error('[REFUND] Failed to search Stripe charges:', e);
			}
		}

		// If we still don't have a charge, we'll need to refund via customer credit
		if (!chargeId) {
			return res.status(400).json({
				error: 'Could not find wallet deposit charge to refund',
				message:
					"Please email hello@sharkly.co with your refund request. We'll process it manually within 1-2 business days."
			});
		}

		// Create refund request record
		const { data: refundRequest, error: insertError } = await supabase
			.from('refund_requests')
			.insert({
				organization_id: organizationId,
				user_id: userId,
				refund_type: 'wallet',
				status: 'pending',
				stripe_charge_id: chargeId,
				original_amount_cents: eligibilityData.refund_amount_cents,
				refund_amount_cents: eligibilityData.refund_amount_cents,
				auto_eligible: true,
				eligibility_check: eligibility,
				reason: reason || null
			})
			.select()
			.single();

		if (insertError) {
			console.error('[REFUND] Failed to create refund request:', insertError);
			return res.status(500).json({ error: 'Failed to create refund request' });
		}

		// Process refund through Stripe
		try {
			const refund = await stripe.refunds.create({
				charge: chargeId,
				amount: eligibilityData.refund_amount_cents,
				reason: 'requested_by_customer',
				metadata: {
					refund_request_id: refundRequest.id,
					organization_id: organizationId,
					refund_type: 'wallet'
				}
			});

			// Update DB
			const { error: processError } = await supabase.rpc('process_wallet_refund', {
				p_refund_request_id: refundRequest.id,
				p_stripe_refund_id: refund.id,
				p_processed_by: userId
			});

			if (processError) {
				console.error('[REFUND] Failed to process wallet refund in DB:', processError);
			}

			return res.json({
				success: true,
				refund_id: refundRequest.id,
				stripe_refund_id: refund.id,
				refund_amount_cents: eligibilityData.refund_amount_cents,
				refund_amount_dollars: (eligibilityData.refund_amount_cents / 100).toFixed(2),
				message:
					'Wallet refund processed successfully. It may take 5-10 business days to appear on your statement.'
			});
		} catch (stripeError: any) {
			console.error('[REFUND] Stripe wallet refund failed:', stripeError);

			await supabase
				.from('refund_requests')
				.update({
					status: 'failed',
					notes: stripeError.message || 'Stripe refund failed'
				})
				.eq('id', refundRequest.id);

			return res.status(500).json({
				error: 'Refund processing failed',
				message: stripeError.message || 'Please contact hello@sharkly.co'
			});
		}
	} catch (error) {
		console.error('[REFUND] Error processing wallet refund:', error);
		return res.status(500).json({ error: 'Failed to process refund' });
	}
};

// =====================================================
// Credit Back Failed Action
// =====================================================
export const creditBackAction = async (req: Request, res: Response) => {
	try {
		const organizationId = (req as any).organizationId;

		if (!organizationId) {
			return res.status(401).json({ error: 'Organization context required' });
		}

		const { action_key, credits, reason } = req.body as {
			action_key: string;
			credits: number;
			reason?: string;
		};

		if (!action_key || !credits || credits <= 0) {
			return res.status(400).json({ error: 'action_key and credits are required' });
		}

		// Max credit-back is 50 credits to prevent abuse
		if (credits > 50) {
			return res.status(400).json({
				error: 'Credit-back exceeds maximum',
				message: 'For large credit refunds, please email hello@sharkly.co'
			});
		}

		const { data, error } = await supabase.rpc('credit_back_action', {
			p_org_id: organizationId,
			p_action_key: action_key,
			p_credits: credits,
			p_reason: reason || 'Action failed or returned invalid results'
		});

		if (error) {
			console.error('[REFUND] Credit-back failed:', error);
			return res.status(500).json({ error: 'Failed to credit back action' });
		}

		return res.json({
			success: true,
			credits_refunded: credits,
			message: `${credits} credits have been added back to your account.`
		});
	} catch (error) {
		console.error('[REFUND] Error crediting back action:', error);
		return res.status(500).json({ error: 'Failed to credit back action' });
	}
};

// =====================================================
// Get Refund History
// =====================================================
export const getRefundHistory = async (req: Request, res: Response) => {
	try {
		const organizationId = (req as any).organizationId;

		if (!organizationId) {
			return res.status(401).json({ error: 'Organization context required' });
		}

		const { data, error } = await supabase
			.from('refund_requests')
			.select('*')
			.eq('organization_id', organizationId)
			.order('requested_at', { ascending: false })
			.limit(20);

		if (error) {
			console.error('[REFUND] Failed to get refund history:', error);
			return res.status(500).json({ error: 'Failed to get refund history' });
		}

		return res.json(data || []);
	} catch (error) {
		console.error('[REFUND] Error getting refund history:', error);
		return res.status(500).json({ error: 'Failed to get refund history' });
	}
};
