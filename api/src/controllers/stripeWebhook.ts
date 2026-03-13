import { Request, Response } from 'express';
import Stripe from 'stripe';

import { getStripeClient } from '../utils/stripe.js';
import { supabase } from '../utils/supabaseClient.js';
import {
	computeMaxSeatsForPlan,
	deactivateExtraSeats,
	loadSeatSummary,
	recordSeatEvent,
	syncExtraSeatAddon,
	updateOrgMaxSeats
} from '../utils/seats.js';
import { creditWallet, clearPendingTopUp, debitWallet } from '../utils/wallet.js';
import { markTopUpStatus } from '../utils/walletTopup.js';
import type { PlanCatalogRow, OrganizationRow, StripeSubStatus } from '../types/billing.js';
import { emailService } from '../utils/email.js';
import { createNotificationForOrgOwner, createNotificationForUser } from '../utils/notifications.js';

const stripe = getStripeClient();

const WALLET_PI_PURPOSES = new Set(['wallet_topup', 'wallet_auto_recharge']);

// Extra seat addon code - uses _test suffix in test environment
const getExtraSeatAddonCode = () => {
	const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
	return env === 'live' ? 'extra_seat' : 'extra_seat_test';
};

// =====================================================
// Webhook Logging and Idempotency
// =====================================================

// Log webhook event to stripe_webhook_events with full audit data
const logWebhookEvent = async (
	event: Stripe.Event,
	status: 'received' | 'processing' | 'processed' | 'failed' | 'skipped',
	orgId?: string | null,
	processingError?: string | null
): Promise<void> => {
	try {
		const dataObject = event.data.object as unknown as Record<string, unknown>;
		await supabase.rpc('log_webhook_event', {
			p_stripe_event_id: event.id,
			p_event_type: event.type,
			p_status: status,
			p_org_id: orgId ?? null,
			p_stripe_api_version: event.api_version ?? null,
			p_stripe_customer_id: (dataObject.customer as string) ?? null,
			p_stripe_subscription_id:
				dataObject.object === 'subscription'
					? (dataObject.id as string)
					: ((dataObject.subscription as string) ?? null),
			p_raw_payload: event as unknown as Record<string, unknown>,
			p_data_object_id: (dataObject.id as string) ?? null,
			p_data_object_type: (dataObject.object as string) ?? null,
			p_processing_error: processingError ?? null,
			p_stripe_created_at: event.created ? new Date(event.created * 1000).toISOString() : null
		});
	} catch (e) {
		console.error('[WEBHOOK] Failed to log event', { eventId: event.id, status, error: e });
	}
};

// Check if webhook was already processed (status='processed')
const isWebhookProcessed = async (stripeEventId: string): Promise<boolean> => {
	try {
		const { data, error } = await supabase.rpc('is_webhook_processed', {
			p_stripe_event_id: stripeEventId
		});
		if (error) {
			// Fallback to old function if new one doesn't exist yet
			const { data: oldData } = await supabase.rpc('check_webhook_idempotency', {
				p_stripe_event_id: stripeEventId
			});
			return oldData === true;
		}
		return data === true;
	} catch (e) {
		console.warn('[WEBHOOK] Idempotency check failed', { stripeEventId, e });
		return false;
	}
};

// Increment org's webhook failure count
const incrementWebhookFailures = async (orgId: string): Promise<void> => {
	try {
		await supabase.rpc('increment_webhook_failures', { p_org_id: orgId });
	} catch (e) {
		console.warn('[WEBHOOK] Failed to increment failures', { orgId, e });
	}
};

// Update org's last webhook timestamp
const updateOrgLastWebhook = async (orgId: string): Promise<void> => {
	try {
		await supabase
			.from('organizations')
			.update({
				stripe_last_webhook_at: new Date().toISOString()
			})
			.eq('id', orgId);
	} catch (e) {
		console.warn('[WEBHOOK] Failed to update last webhook', { orgId, e });
	}
};

// =====================================================
// Data Persistence Helpers
// =====================================================

// Save charge to stripe_charges table
const saveCharge = async (orgId: string | null, charge: Stripe.Charge): Promise<void> => {
	try {
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
	} catch (e) {
		console.error('[WEBHOOK] Failed to save charge', { chargeId: charge.id, error: e });
	}
};

// Save refund to stripe_refunds table
const saveRefund = async (orgId: string | null, refund: Stripe.Refund): Promise<void> => {
	try {
		await supabase.from('stripe_refunds').upsert(
			{
				organization_id: orgId,
				stripe_refund_id: refund.id,
				stripe_charge_id: refund.charge as string,
				stripe_payment_intent_id: refund.payment_intent as string | null,
				amount: refund.amount,
				currency: refund.currency || 'usd',
				status: refund.status,
				reason: refund.reason || null,
				raw_payload: refund as unknown as Record<string, unknown>,
				stripe_created_at: new Date(refund.created * 1000).toISOString()
			},
			{ onConflict: 'stripe_refund_id' }
		);
	} catch (e) {
		console.error('[WEBHOOK] Failed to save refund', { refundId: refund.id, error: e });
	}
};

// Save customer to stripe_customers table
const saveCustomer = async (orgId: string | null, customer: Stripe.Customer): Promise<void> => {
	try {
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
	} catch (e) {
		console.error('[WEBHOOK] Failed to save customer', { customerId: customer.id, error: e });
	}
};

// Save payment method to stripe_payment_methods table
const savePaymentMethod = async (orgId: string | null, pm: Stripe.PaymentMethod): Promise<void> => {
	try {
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
	} catch (e) {
		console.error('[WEBHOOK] Failed to save payment method', { pmId: pm.id, error: e });
	}
};

// Save subscription snapshot to stripe_subscription_snapshots table
const saveSubscriptionSnapshot = async (
	orgId: string,
	eventType: string,
	subscription: Stripe.Subscription
): Promise<void> => {
	try {
		// Access raw subscription properties (some may not be in strict types)
		const subAny = subscription as unknown as Record<string, unknown>;
		const currentPeriodStart = subAny.current_period_start as number | undefined;
		const currentPeriodEnd = subAny.current_period_end as number | undefined;

		await supabase.from('stripe_subscription_snapshots').insert({
			org_id: orgId,
			stripe_subscription_id: subscription.id,
			stripe_customer_id: subscription.customer as string,
			event_type: eventType,
			status: subscription.status,
			collection_method: subscription.collection_method || null,
			current_period_start: currentPeriodStart
				? new Date(currentPeriodStart * 1000).toISOString()
				: null,
			current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
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
	} catch (e) {
		console.error('[WEBHOOK] Failed to save subscription snapshot', { orgId, eventType, error: e });
	}
};

// =====================================================
// NEW: Subscription Ledger and Payment Failure Logging
// =====================================================

// Log to stripe_subscription_ledger (human-readable timeline)
const logLedgerEvent = async (
	orgId: string,
	eventType: string,
	description: string,
	amountCents?: number | null,
	balanceImpact: 'credit' | 'debit' | 'none' = 'none',
	metadata?: Record<string, unknown> | null,
	stripeEventId?: string | null
): Promise<void> => {
	try {
		await supabase.from('stripe_subscription_ledger').insert({
			organization_id: orgId,
			event_type: eventType,
			description,
			amount_cents: amountCents ?? null,
			balance_impact: balanceImpact,
			metadata: metadata ?? null,
			stripe_event_id: stripeEventId ?? null
		});
	} catch (e) {
		console.warn('[WEBHOOK] Failed to log ledger event', { orgId, eventType, e });
	}
};

// Log payment failure to stripe_payment_failures
const logPaymentFailure = async (
	orgId: string | null,
	invoiceId?: string | null,
	chargeId?: string | null,
	paymentIntentId?: string | null,
	failureCode?: string | null,
	failureMessage?: string | null,
	declineCode?: string | null,
	stripeCreatedAt?: number | null
): Promise<void> => {
	if (!orgId) return;
	try {
		// Determine next action based on failure
		let nextAction = 'contact_customer';
		if (declineCode === 'insufficient_funds') {
			nextAction = 'request_different_payment_method';
		} else if (failureCode === 'card_declined') {
			nextAction = 'update_payment_method';
		} else if (failureCode === 'expired_card') {
			nextAction = 'update_payment_method';
		}

		await supabase.rpc('log_payment_failure', {
			p_org_id: orgId,
			p_invoice_id: invoiceId ?? null,
			p_charge_id: chargeId ?? null,
			p_payment_intent_id: paymentIntentId ?? null,
			p_failure_code: failureCode ?? null,
			p_failure_message: failureMessage ?? null,
			p_decline_code: declineCode ?? null,
			p_next_action: nextAction,
			p_stripe_created_at: stripeCreatedAt ? new Date(stripeCreatedAt * 1000).toISOString() : null
		});
	} catch (e) {
		console.warn('[WEBHOOK] Failed to log payment failure', { orgId, invoiceId, e });
	}
};

// Save invoice to existing stripe_invoices table
const saveInvoice = async (orgId: string, invoice: Stripe.Invoice): Promise<void> => {
	try {
		// Access raw invoice properties (some may not be in strict types)
		const invoiceAny = invoice as unknown as Record<string, unknown>;
		const tax = invoiceAny.tax as number | null | undefined;

		await supabase.from('stripe_invoices').upsert(
			{
				org_id: orgId,
				stripe_invoice_id: invoice.id,
				stripe_customer_id: invoice.customer as string | null,
				status: invoice.status || null,
				hosted_invoice_url: invoice.hosted_invoice_url || null,
				invoice_pdf: invoice.invoice_pdf || null,
				currency: invoice.currency || 'usd',
				amount_due: invoice.amount_due || 0,
				amount_paid: invoice.amount_paid || 0,
				amount_remaining: invoice.amount_remaining || 0,
				total: invoice.total || 0,
				subtotal: invoice.subtotal || 0,
				tax: tax ?? null,
				period_start: invoice.period_start
					? new Date(invoice.period_start * 1000).toISOString()
					: null,
				period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
				finalized_at: invoice.status_transitions?.finalized_at
					? new Date(invoice.status_transitions.finalized_at * 1000).toISOString()
					: null,
				paid_at: invoice.status_transitions?.paid_at
					? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
					: null,
				raw_payload: invoice as unknown as Record<string, unknown>
			},
			{
				onConflict: 'stripe_invoice_id'
			}
		);
	} catch (e) {
		console.error('[WEBHOOK] Failed to save invoice', { orgId, invoiceId: invoice.id, error: e });
	}
};

// =====================================================
// Credit tier change helper
// =====================================================
const handleTierCreditsChange = async (
	org: OrganizationRow,
	newPlan: PlanCatalogRow,
	isUpgrade: boolean
): Promise<void> => {
	try {
		// Call the change_org_tier RPC
		// For upgrades: prorate=true (give new credits minus usage)
		// For downgrades: prorate=false (defer to next billing cycle)
		const { data, error } = await supabase.rpc('change_org_tier', {
			p_org_id: org.id,
			p_new_monthly_credits: newPlan.included_credits,
			p_prorate: isUpgrade
		});

		if (error) {
			console.error('[WEBHOOK] Failed to change org tier credits', {
				orgId: org.id,
				newPlan: newPlan.plan_code,
				isUpgrade,
				error
			});
			return;
		}

		// CRITICAL SAFEGUARD: Verify that included_credits_remaining was properly set
		// If it's still 0, force-set it to the new plan's credits
		// This prevents the bug where remaining credits don't get initialized
		const { data: orgCheck } = await supabase
			.from('organizations')
			.select('included_credits_remaining')
			.eq('id', org.id)
			.single();

		if (orgCheck && orgCheck.included_credits_remaining === 0 && newPlan.included_credits > 0) {
			console.warn(
				'[WEBHOOK] CRITICAL: included_credits_remaining was not set by RPC, forcing reset',
				{
					orgId: org.id,
					expectedCredits: newPlan.included_credits
				}
			);

			await supabase
				.from('organizations')
				.update({
					included_credits_remaining: newPlan.included_credits,
					updated_at: new Date().toISOString()
				})
				.eq('id', org.id);
		}

		console.log('[WEBHOOK] Tier credits changed successfully', {
			orgId: org.id,
			oldMonthly: org.included_credits,
			newMonthly: newPlan.included_credits,
			isUpgrade,
			result: data
		});
	} catch (e) {
		console.error('[WEBHOOK] Exception during tier credits change', {
			orgId: org.id,
			error: e
		});
	}
};

// =====================================================
// Extra seat addon detection and handling
// =====================================================
const getExtraSeatAddonPriceId = async (): Promise<string | null> => {
	try {
		const { data } = await supabase
			.from('addon_catalog')
			.select('stripe_price_id')
			.eq('addon_code', getExtraSeatAddonCode())
			.maybeSingle();
		return data?.stripe_price_id ?? null;
	} catch {
		return null;
	}
};

const extractExtraSeatCountFromStripe = async (
	subscription: Stripe.Subscription
): Promise<number> => {
	const seatAddonPriceId = await getExtraSeatAddonPriceId();
	if (!seatAddonPriceId) return 0;

	const seatItem = subscription.items?.data?.find((item) => item.price?.id === seatAddonPriceId);

	return seatItem?.quantity ?? 0;
};

// Get current extra seat count from seat_events table
const getExtraSeatCountFromDB = async (orgId: string): Promise<number> => {
	try {
		const { data, error } = await supabase.rpc('get_extra_seat_count', {
			p_org_id: orgId
		});
		if (error) {
			console.warn('[WEBHOOK] Failed to get extra seat count from DB', { orgId, error });
			return 0;
		}
		return data ?? 0;
	} catch {
		return 0;
	}
};

const handleExtraSeatCreditChange = async (
	org: OrganizationRow,
	seatDelta: number // positive = adding, negative = removing
): Promise<void> => {
	if (seatDelta === 0) return;

	try {
		// Call the adjust_credits_for_seat_change RPC
		// This only handles CREDIT adjustment - seat_events is managed by seats.ts
		const { data, error } = await supabase.rpc('adjust_credits_for_seat_change', {
			p_org_id: org.id,
			p_seat_delta: seatDelta,
			p_immediate: true
		});

		if (error) {
			console.error('[WEBHOOK] Failed to adjust credits for seat change', {
				orgId: org.id,
				seatDelta,
				error
			});
			return;
		}

		// Check if removal failed due to insufficient credits
		if (data && !data.success && data.error === 'insufficient_credits_for_removal') {
			console.log('[WEBHOOK] Deferring seat credit removal due to insufficient credits', {
				orgId: org.id,
				seatDelta,
				currentRemaining: data.current_remaining
			});

			// Retry with immediate=false (deferred)
			const { error: deferError } = await supabase.rpc('adjust_credits_for_seat_change', {
				p_org_id: org.id,
				p_seat_delta: seatDelta,
				p_immediate: false
			});

			if (deferError) {
				console.error('[WEBHOOK] Failed to defer seat credit removal', {
					orgId: org.id,
					deferError
				});
			}
			return;
		}

		console.log('[WEBHOOK] Extra seat credits adjusted successfully', {
			orgId: org.id,
			seatDelta,
			result: data
		});
	} catch (e) {
		console.error('[WEBHOOK] Exception during seat credit adjustment', {
			orgId: org.id,
			error: e
		});
	}
};

const handleExtraSeatChatMessageChange = async (
	org: OrganizationRow,
	seatDelta: number // positive = adding, negative = removing
): Promise<void> => {
	if (seatDelta === 0) return;

	try {
		// Call the adjust_chat_messages_for_seat_change RPC
		const { data, error } = await supabase.rpc('adjust_chat_messages_for_seat_change', {
			p_org_id: org.id,
			p_seat_delta: seatDelta
		});

		if (error) {
			console.error('[WEBHOOK] Failed to adjust chat messages for seat change', {
				orgId: org.id,
				seatDelta,
				error
			});
			return;
		}

		console.log('[WEBHOOK] Extra seat chat messages adjusted successfully', {
			orgId: org.id,
			seatDelta,
			result: data
		});
	} catch (e) {
		console.error('[WEBHOOK] Exception during seat chat message adjustment', {
			orgId: org.id,
			error: e
		});
	}
};

const findOrganizationBySubscriptionOrCustomer = async (
	subscriptionId: string | null,
	customerId: string | null
): Promise<OrganizationRow | null> => {
	if (!subscriptionId && !customerId) {
		return null;
	}

	if (subscriptionId) {
		const { data, error } = await supabase
			.from('organizations')
			.select('*')
			.eq('stripe_subscription_id', subscriptionId)
			.maybeSingle();

		if (error) {
			console.error('[WEBHOOK] Failed to lookup org by subscription', { subscriptionId, error });
		}

		if (data) {
			return data as OrganizationRow;
		}
	}

	if (customerId) {
		const { data, error } = await supabase
			.from('organizations')
			.select('*')
			.eq('stripe_customer_id', customerId)
			.maybeSingle();

		if (error) {
			console.error('[WEBHOOK] Failed to lookup org by customer', { customerId, error });
		}

		if (data) {
			return data as OrganizationRow;
		}
	}

	return null;
};

const getPlanFromPriceId = async (priceId: string): Promise<PlanCatalogRow | null> => {
	const { data, error } = await supabase
		.from('plan_catalog')
		.select('*')
		.eq('stripe_price_id', priceId)
		.eq('active', true)
		.order('created_at', { ascending: false })
		.limit(1);

	if (error) {
		console.warn('[WEBHOOK] Failed to load plan for price', { priceId, error });
		return null;
	}

	if (!data || data.length === 0) {
		return null;
	}

	if (data.length > 1) {
		console.warn('[WEBHOOK] Multiple plans found for price ID, using most recent', {
			priceId,
			count: data.length
		});
	}

	return (data[0] as PlanCatalogRow) ?? null;
};

const mapPlanFields = (plan: PlanCatalogRow | null, isNewSubscription = false) => {
	if (!plan) {
		return {};
	}

	const chatMessages = plan.included_chat_messages ?? 0;

	const fields: Partial<OrganizationRow> = {
		plan_code: plan.plan_code,
		plan_price_cents: plan.base_price_cents,
		included_seats: plan.included_seats,
		// new credit field: allowance (do not touch remaining here, it is managed by monthly reset)
		included_credits_monthly: plan.included_credits,
		// legacy compatibility (kept in sync for reads that still reference it)
		included_credits: plan.included_credits,
		// Fin (AI Assistant): regular plan feature — chat messages from plan_catalog.included_chat_messages
		included_chat_messages_monthly: chatMessages,
		...(isNewSubscription && chatMessages > 0 && { chat_messages_remaining: chatMessages }),
		// Downgrade: clear remaining when plan has 0 chat messages
		...(chatMessages === 0 && { chat_messages_remaining: 0 })
	};

	// For new subscriptions, also set initial remaining values for credits
	if (isNewSubscription) {
		fields.included_credits_remaining = plan.included_credits;
	}

	return fields;
};

const logSubscriptionChange = async (
	orgId: string,
	event: string,
	fromPlan: string | null,
	toPlan: string | null,
	prorationCents: number,
	raw: unknown
) => {
	const { error } = await supabase.from('subscription_ledger').insert({
		org_id: orgId,
		stripe_subscription_id: (raw as Stripe.Subscription | undefined)?.id ?? null,
		event,
		from_plan: fromPlan,
		to_plan: toPlan,
		proration_cents: prorationCents,
		raw: raw as Record<string, unknown>
	});

	if (error) {
		console.warn('[WEBHOOK] Failed to log subscription change', { orgId, event, error });
	}
};

const handleWalletPaymentIntent = async (event: Stripe.Event) => {
	const pi = event.data.object as Stripe.PaymentIntent;
	const metadata = (pi.metadata ?? {}) as Record<string, string>;
	const purpose = metadata.purpose;

	if (!WALLET_PI_PURPOSES.has(purpose ?? '')) {
		return;
	}

	const organizationId = metadata.organizationId;
	const amountCents = Number(metadata.amountCents ?? pi.amount_received ?? pi.amount ?? 0);

	if (!organizationId || amountCents <= 0) {
		console.warn('[WEBHOOK] Wallet PI missing org or amount', {
			paymentIntentId: pi.id,
			purpose,
			organizationId,
			amountCents
		});
		return;
	}

	const markStatus = async (status: 'succeeded' | 'failed' | 'canceled') => {
		try {
			await markTopUpStatus(pi.id, status);
		} catch (error) {
			console.warn('[WEBHOOK] Failed to mark top-up status', {
				paymentIntentId: pi.id,
				status,
				error
			});
		}
	};

	const clearPending = async () => {
		try {
			await clearPendingTopUp(organizationId, amountCents);
		} catch (error) {
			console.warn('[WEBHOOK] Failed to clear pending top-up', { paymentIntentId: pi.id, error });
		}
	};

	const recordAutoRechargeResult = async (
		status: 'succeeded' | 'failed',
		failureReason?: string | null
	) => {
		try {
			const { error } = await supabase.rpc('wallet_auto_recharge_result', {
				p_payment_intent_id: pi.id,
				p_status: status,
				p_amount_cents: amountCents,
				p_failure_reason: failureReason ?? null
			});

			if (error) {
				throw error;
			}
		} catch (error) {
			console.warn('[WEBHOOK] Failed to record auto recharge result', {
				paymentIntentId: pi.id,
				status,
				error
			});
		}
	};

	try {
		if (event.type === 'payment_intent.succeeded') {
			await creditWallet(organizationId, amountCents, {
				transactionType: 'credit_top_up',
				referenceType: 'stripe_payment_intent',
				referenceId: pi.id,
				description:
					purpose === 'wallet_auto_recharge' ? 'Wallet auto-recharge' : 'Stripe wallet top-up'
			});
			await clearPending();
			await markStatus('succeeded');

			if (purpose === 'wallet_auto_recharge') {
				await recordAutoRechargeResult('succeeded');
			}

			console.log('[WEBHOOK] Wallet credited from payment intent', {
				paymentIntentId: pi.id,
				organizationId,
				amountCents,
				purpose
			});
		} else {
			await clearPending();
			const status = event.type === 'payment_intent.canceled' ? 'canceled' : 'failed';
			await markStatus(status);

			if (purpose === 'wallet_auto_recharge') {
				await recordAutoRechargeResult('failed', pi.last_payment_error?.message ?? status);
			}

			console.log('[WEBHOOK] Wallet payment intent failed/canceled', {
				paymentIntentId: pi.id,
				organizationId,
				amountCents,
				purpose,
				status
			});
		}
	} catch (error) {
		console.error('[WEBHOOK] Wallet payment intent handling failed', {
			paymentIntentId: pi.id,
			event: event.type,
			error
		});
	}
};

const handleWalletRefund = async (event: Stripe.Event) => {
	const charge = event.data.object as Stripe.Charge;
	const amountCents = Number(charge.amount_refunded || charge.amount || 0);

	if (amountCents <= 0) {
		return;
	}

	let organizationId: string | null = null;

	try {
		if (typeof charge.payment_intent === 'string') {
			const pi = await stripe.paymentIntents.retrieve(charge.payment_intent);
			const purpose = (pi.metadata ?? {}) as Record<string, string>;
			if (WALLET_PI_PURPOSES.has(purpose.purpose ?? '')) {
				organizationId = purpose.organizationId ?? null;
			}
		}
	} catch (error) {
		console.warn('[WEBHOOK] Failed to retrieve PI for refund mapping', {
			chargeId: charge.id,
			error
		});
	}

	if (!organizationId) {
		return;
	}

	try {
		await debitWallet(organizationId, amountCents, {
			transactionType: 'credit_refund',
			referenceType: 'stripe_charge',
			referenceId: charge.id,
			description: 'Refund of wallet top-up'
		});
		await markTopUpStatus(String(charge.payment_intent ?? ''), 'refunded');
	} catch (error) {
		console.error('[WEBHOOK] Failed to debit wallet after refund', {
			organizationId,
			chargeId: charge.id,
			error
		});
	}
};

const handleChargeDispute = async (event: Stripe.Event) => {
	const charge = event.data.object as Stripe.Charge;
	let organizationId: string | null = null;

	try {
		if (typeof charge.payment_intent === 'string') {
			const pi = await stripe.paymentIntents.retrieve(charge.payment_intent);
			const metadata = (pi.metadata ?? {}) as Record<string, string>;
			if (WALLET_PI_PURPOSES.has(metadata.purpose ?? '')) {
				organizationId = metadata.organizationId ?? null;
			}
		}
	} catch (error) {
		console.warn('[WEBHOOK] Failed to retrieve PI for dispute mapping', {
			chargeId: charge.id,
			error
		});
	}

	if (!organizationId) {
		return;
	}

	try {
		const { error } = await supabase
			.from('usage_wallets')
			.update({ status: 'suspended', updated_at: new Date().toISOString() })
			.eq('organization_id', organizationId);

		if (error) {
			console.error('[WEBHOOK] Failed to suspend wallet due to dispute', { organizationId, error });
		}
	} catch (error) {
		console.error('[WEBHOOK] Exception while suspending wallet for dispute', {
			organizationId,
			error
		});
	}
};

const ensurePlanMetadata = async (subscription: Stripe.Subscription, org: OrganizationRow) => {
	const items = subscription.items?.data ?? [];
	const activeItem = items.find((item) => !item.deleted && (item.quantity ?? 0) > 0) ?? items[0];
	const priceId = activeItem?.price?.id;

	if (!priceId) {
		return { plan: null, planChanged: false } as const;
	}

	const plan = await getPlanFromPriceId(priceId);
	const planChanged = Boolean(plan && plan.plan_code !== org.plan_code);
	return { plan, planChanged } as const;
};

const handleSubscriptionEvent = async (event: Stripe.Event) => {
	const incoming = event.data.object as Stripe.Subscription;
	const subscriptionId = incoming.id;
	const customerId = incoming.customer as string | null;

	const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);

	if (!org) {
		console.warn('[WEBHOOK] Org not found for subscription event', {
			eventType: event.type,
			subscriptionId,
			customerId,
			reason: 'This may indicate a subscription created outside your app or a Stripe test event'
		});
		// Still log the event for audit purposes
		await logWebhookEvent(event, 'skipped', null, 'Organization not found for subscription');
		return;
	}

	let subscription = incoming;
	try {
		subscription = await stripe.subscriptions.retrieve(subscriptionId, {
			expand: ['items.data.price.product']
		});
	} catch (error) {
		console.warn('[WEBHOOK] Failed to retrieve subscription, using event payload', {
			subscriptionId,
			error
		});
	}

	const now = new Date();
	const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
	const trialHasEnded = trialEnd ? now >= trialEnd : false;
	const wasTrialing = org.stripe_status === 'trialing';
	const isNoLongerTrialing = subscription.status !== 'trialing';

	const { plan, planChanged } = await ensurePlanMetadata(subscription, org);

	// Detect tier upgrade vs downgrade for credit handling
	const oldMonthlyCredits = org.included_credits ?? 0;
	const newMonthlyCredits = plan?.included_credits ?? oldMonthlyCredits;
	const isUpgrade = newMonthlyCredits > oldMonthlyCredits;
	const isDowngrade = newMonthlyCredits < oldMonthlyCredits;

	// Detect extra seat changes by comparing Stripe quantity to DB seat_events
	const oldExtraSeats = await getExtraSeatCountFromDB(org.id);
	const newExtraSeats = await extractExtraSeatCountFromStripe(subscription);
	const seatDelta = newExtraSeats - oldExtraSeats;
	const seatsChanged = seatDelta !== 0;

	const updateData: Record<string, unknown> = {
		stripe_subscription_id: subscription.id,
		stripe_status: subscription.status as StripeSubStatus,
		trial_end: subscription.trial_end
			? new Date(subscription.trial_end * 1000).toISOString()
			: null,
		updated_at: new Date().toISOString()
	};

	if (trialHasEnded || (wasTrialing && isNoLongerTrialing)) {
		updateData.trial_ending_soon = false;
	}

	const isNewSubscription =
		event.type === 'customer.subscription.created' || !org.stripe_subscription_id;
	Object.assign(updateData, mapPlanFields(plan, isNewSubscription));

	// CRITICAL: For new subscriptions, ensure included_credits_remaining is set to monthly amount
	// This prevents the common bug where credits remain at 0 after initial payment
	if (isNewSubscription && plan && plan.included_credits) {
		updateData.included_credits_remaining = plan.included_credits;
		console.log('[WEBHOOK] Initializing included_credits_remaining for new subscription', {
			orgId: org.id,
			credits: plan.included_credits
		});
	}

	if (subscription.cancel_at_period_end !== undefined) {
		updateData.cancel_at_period_end = subscription.cancel_at_period_end;
	}

	if (subscription.collection_method) {
		updateData.stripe_collection_method = subscription.collection_method;
	}

	if (subscription.pause_collection) {
		updateData.stripe_pause_collection = subscription.pause_collection;
	} else {
		updateData.stripe_pause_collection = null;
	}

	if (subscription.latest_invoice && typeof subscription.latest_invoice === 'string') {
		updateData.stripe_latest_invoice_id = subscription.latest_invoice;
	}

	if (subscription.metadata && Object.keys(subscription.metadata).length > 0) {
		updateData.stripe_subscription_metadata = subscription.metadata as Record<string, unknown>;
	}

	// CRITICAL: Sync stripe_status to organization status
	if (subscription.status === 'incomplete') {
		// First payment not yet confirmed — give the customer a chance to complete it
		updateData.status = 'payment_required';
		console.log('[WEBHOOK] Marking org as payment_required due to incomplete subscription', {
			orgId: org.id
		});
	} else if (subscription.status === 'incomplete_expired') {
		// Payment was never completed and the window closed — subscription is dead.
		// Requires a BRAND NEW subscription, not a payment method update.
		updateData.status = 'disabled';
		updateData.payment_action_required = false; // clear so payment-required gate doesn't show
		console.log('[WEBHOOK] Marking org as disabled due to incomplete_expired subscription', {
			orgId: org.id
		});
	} else if (subscription.status === 'canceled') {
		// Subscription canceled - disable org
		updateData.status = 'disabled';
		console.log('[WEBHOOK] Marking org as disabled due to canceled subscription', {
			orgId: org.id
		});
	} else if (subscription.status === 'past_due') {
		// Payment past due - mark as past_due
		updateData.status = 'past_due';
		console.log('[WEBHOOK] Marking org as past_due due to payment failure', {
			orgId: org.id
		});
	} else if (subscription.status === 'active' || subscription.status === 'trialing') {
		// Active or trialing - org should be active
		// CRITICAL: Only transition OUT of payment_pending when we have a good stripe status
		if (org.status === 'payment_pending') {
			updateData.status = 'provisioning';
			console.log('[WEBHOOK] Transitioning org from payment_pending to provisioning', {
				orgId: org.id,
				stripe_status: subscription.status
			});
		} else if (org.status === 'payment_required') {
			// If org was marked as payment_required and now stripe says active, activate it
			updateData.status = 'active';
			console.log('[WEBHOOK] Transitioning org from payment_required to active', {
				orgId: org.id,
				stripe_status: subscription.status
			});
		}
	}

	// Update subscription-related timestamps
	if (event.type === 'customer.subscription.created') {
		updateData.stripe_subscription_created_at = new Date(subscription.created * 1000).toISOString();
	}
	if (subscription.canceled_at) {
		updateData.stripe_subscription_canceled_at = new Date(
			subscription.canceled_at * 1000
		).toISOString();
	}
	if (subscription.billing_cycle_anchor) {
		updateData.stripe_billing_cycle_anchor = new Date(
			subscription.billing_cycle_anchor * 1000
		).toISOString();
	}

	const { error } = await supabase.from('organizations').update(updateData).eq('id', org.id);

	if (error) {
		console.error('[WEBHOOK] Failed to update organization from subscription event', {
			orgId: org.id,
			error
		});
		return;
	}

	// Handle tier credit changes (upgrade/downgrade)
	if (planChanged && plan) {
		await logSubscriptionChange(org.id, event.type, org.plan_code, plan.plan_code, 0, subscription);

		// Adjust credits based on tier change
		if (isUpgrade || isDowngrade) {
			await handleTierCreditsChange(org, plan, isUpgrade);

			console.log('[WEBHOOK] Tier change processed', {
				orgId: org.id,
				oldPlan: org.plan_code,
				newPlan: plan.plan_code,
				oldCredits: oldMonthlyCredits,
				newCredits: newMonthlyCredits,
				isUpgrade,
				isDowngrade
			});
		}
	}

	// Handle extra seat add-on changes
	if (seatsChanged) {
		// 1. Record the seat event (tracks delta in seat_events table)
		await recordSeatEvent({
			orgId: org.id,
			action: seatDelta > 0 ? 'seats_added' : 'seats_removed',
			delta: seatDelta,
			reason: 'stripe_subscription_updated'
		});

		// 2. Adjust credits based on the seat change
		await handleExtraSeatCreditChange(org, seatDelta);

		// 3. Adjust chat messages based on the seat change
		await handleExtraSeatChatMessageChange(org, seatDelta);

		console.log('[WEBHOOK] Extra seats change processed', {
			orgId: org.id,
			oldSeats: oldExtraSeats,
			newSeats: newExtraSeats,
			seatDelta
		});
	}

	if (plan && plan.included_seats !== undefined) {
		try {
			const computedMaxSeats = await computeMaxSeatsForPlan(plan.plan_code, plan.included_seats);
			if (computedMaxSeats !== null) {
				await updateOrgMaxSeats(org.id, computedMaxSeats);
			}
		} catch (seatError) {
			console.warn('[WEBHOOK] Failed to compute/update max seats for plan', {
				orgId: org.id,
				seatError
			});
		}
	}

	// Trial lifecycle notifications (owner only)
	try {
		const { data: ownerProfile } = await supabase
			.from('profiles')
			.select('email')
			.eq('id', org.owner_id)
			.maybeSingle();

		const ownerEmail = ownerProfile?.email ?? null;
		if (ownerEmail && trialEnd) {
			// Trial started (transition into trialing)
			if (subscription.status === 'trialing' && !wasTrialing) {
				await emailService.sendTrialStarted(ownerEmail, org.name, trialEnd.toISOString());
				await logSubscriptionChange(
					org.id,
					'trial.started_email',
					org.plan_code,
					org.plan_code,
					0,
					subscription
				);
			}

			// Trial ended (transition out of trialing or reached end)
			if ((wasTrialing && isNoLongerTrialing) || trialHasEnded) {
				await emailService.sendTrialEnded(ownerEmail, org.name, trialEnd.toISOString());
				await logSubscriptionChange(
					org.id,
					'trial.ended_email',
					org.plan_code,
					org.plan_code,
					0,
					subscription
				);
			}
		}
	} catch (notifyError) {
		console.warn('[WEBHOOK] Failed to send trial lifecycle email', { orgId: org.id, notifyError });
	}
};

const handleSubscriptionDeleted = async (event: Stripe.Event) => {
	const subscription = event.data.object as Stripe.Subscription;
	const subscriptionId = subscription.id;
	const customerId = subscription.customer as string | null;

	const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);

	if (!org) {
		console.warn('[WEBHOOK] Org not found for subscription deletion', {
			subscriptionId,
			customerId
		});
		return;
	}

	const summaryBeforeCancellation = await loadSeatSummary(org.id);

	const updateData: Record<string, unknown> = {
		stripe_status: 'canceled' as StripeSubStatus,
		status: 'disabled',
		stripe_subscription_id: null,
		payment_action_required: false, // clear so "payment required" gate doesn't block "Start New Subscription" UI
		updated_at: new Date().toISOString()
	};

	const { error } = await supabase.from('organizations').update(updateData).eq('id', org.id);

	if (error) {
		console.error('[WEBHOOK] Failed to mark organization canceled', { orgId: org.id, error });
		return;
	}

	try {
		if (summaryBeforeCancellation.extraSeatsPurchased > 0) {
			if (
				summaryBeforeCancellation.extraSeatAddonPriceId &&
				summaryBeforeCancellation.stripeSubscriptionId
			) {
				try {
					await syncExtraSeatAddon({
						orgId: org.id,
						stripeSubscriptionId: summaryBeforeCancellation.stripeSubscriptionId,
						addonPriceId: summaryBeforeCancellation.extraSeatAddonPriceId,
						quantity: 0
					});
				} catch (addonError) {
					console.warn('[WEBHOOK] Failed to sync extra seat addon during cancellation', {
						orgId: org.id,
						addonError
					});
				}

				await recordSeatEvent({
					orgId: org.id,
					action: 'subscription_cancelled_reset',
					delta: -summaryBeforeCancellation.extraSeatsPurchased,
					reason: 'subscription_cancelled'
				});
			}

			await deactivateExtraSeats({
				orgId: org.id,
				includedSeats: summaryBeforeCancellation.includedSeats
			});
			await updateOrgMaxSeats(org.id, summaryBeforeCancellation.includedSeats);
		}
	} catch (seatError) {
		console.warn('[WEBHOOK] Failed to reset seat state on cancellation', {
			orgId: org.id,
			seatError
		});
	}

	// Log to human-readable ledger
	await logLedgerEvent(
		org.id,
		'subscription_canceled',
		`Subscription canceled. Account disabled.`,
		null,
		'none',
		{ plan: org.plan_code, seats_released: summaryBeforeCancellation.extraSeatsPurchased },
		event.id
	);
};

const handleSubscriptionPaused = async (event: Stripe.Event) => {
	const subscription = event.data.object as Stripe.Subscription;
	const org = await findOrganizationBySubscriptionOrCustomer(
		subscription.id,
		subscription.customer as string | null
	);

	if (!org) {
		return;
	}

	const { error } = await supabase
		.from('organizations')
		.update({
			stripe_status: 'paused' as StripeSubStatus,
			updated_at: new Date().toISOString()
		})
		.eq('id', org.id);

	if (error) {
		console.error('[WEBHOOK] Failed to mark organization paused', { orgId: org.id, error });
		return;
	}

	await logSubscriptionChange(
		org.id,
		'customer.subscription.paused',
		org.plan_code,
		org.plan_code,
		0,
		subscription
	);

	// Log to human-readable ledger
	await logLedgerEvent(
		org.id,
		'subscription_paused',
		`Subscription paused. Billing is on hold.`,
		null,
		'none',
		{ plan: org.plan_code },
		event.id
	);
};

const handleSubscriptionResumed = async (event: Stripe.Event) => {
	const subscription = event.data.object as Stripe.Subscription;
	const org = await findOrganizationBySubscriptionOrCustomer(
		subscription.id,
		subscription.customer as string | null
	);

	if (!org) {
		return;
	}

	const { error } = await supabase
		.from('organizations')
		.update({
			stripe_status: 'active' as StripeSubStatus,
			status: 'provisioning',
			updated_at: new Date().toISOString()
		})
		.eq('id', org.id);

	if (error) {
		console.error('[WEBHOOK] Failed to mark organization resumed', { orgId: org.id, error });
		return;
	}

	await logSubscriptionChange(
		org.id,
		'customer.subscription.resumed',
		org.plan_code,
		org.plan_code,
		0,
		subscription
	);

	// Log to human-readable ledger
	await logLedgerEvent(
		org.id,
		'subscription_resumed',
		`Subscription resumed. Billing reactivated.`,
		null,
		'none',
		{ plan: org.plan_code },
		event.id
	);
};

const handleSubscriptionPastDue = async (event: Stripe.Event) => {
	const subscription = event.data.object as Stripe.Subscription;
	const org = await findOrganizationBySubscriptionOrCustomer(
		subscription.id,
		subscription.customer as string | null
	);

	if (!org) {
		return;
	}

	const currentRetryCount = org.payment_retry_count ?? 0;
	const newRetryCount = currentRetryCount + 1;
	const retryIntervals = [1, 3, 7, 14, 30];
	const retryDays = retryIntervals[Math.min(newRetryCount - 1, retryIntervals.length - 1)];
	const nextRetryAt = new Date();
	nextRetryAt.setDate(nextRetryAt.getDate() + retryDays);

	const { error } = await supabase
		.from('organizations')
		.update({
			status: 'past_due',
			stripe_status: 'past_due' as StripeSubStatus,
			payment_action_required: true,
			last_payment_failed_at: new Date().toISOString(),
			payment_retry_count: newRetryCount,
			next_payment_retry_at: nextRetryAt.toISOString(),
			updated_at: new Date().toISOString()
		})
		.eq('id', org.id);

	if (error) {
		console.error('[WEBHOOK] Failed to mark organization past_due', { orgId: org.id, error });
		return;
	}

	await logSubscriptionChange(
		org.id,
		'customer.subscription.past_due',
		org.plan_code,
		org.plan_code,
		0,
		subscription
	);
};

const handleSubscriptionScheduleEvent = async (event: Stripe.Event) => {
	const schedule = event.data.object as Stripe.SubscriptionSchedule;
	const customerId = schedule.customer as string | null;
	const org = await findOrganizationBySubscriptionOrCustomer(null, customerId);

	if (!org) {
		return;
	}

	await logSubscriptionChange(org.id, event.type, null, null, 0, schedule);
};

const handleInvoicePaid = async (event: Stripe.Event) => {
	console.log('[WEBHOOK] ========== handleInvoicePaid START ==========');
	const invoice = event.data.object as Stripe.Invoice & {
		subscription?: string | Stripe.Subscription | null;
		last_payment_error?: { message?: string } | null;
	};
	const subscriptionId = (invoice.subscription ?? null) as string | null;
	const customerId = invoice.customer as string | null;
	const billingReason = (invoice.billing_reason ?? null) as string | null;
	console.log('[WEBHOOK] Invoice details:', {
		invoiceId: invoice.id,
		billingReason,
		subscriptionId,
		customerId
	});

	const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);
	console.log('[WEBHOOK] Found org:', org?.id, 'current status:', org?.status);

	if (!org) {
		console.log('[WEBHOOK] No org found, returning early');
		return;
	}

	// Save invoice to database
	await saveInvoice(org.id, invoice);

	// Activate the org when a real payment succeeds.
	// payment_pending   → new sub waiting for first payment (or renewal after fix)
	// provisioning      → sub created, waiting for activation
	// payment_required  → sub was incomplete/past-due, customer just paid
	// active            → renewal cycle payment — keep active
	console.log('[WEBHOOK] Checking status transition. Current org.status:', org.status);
	let finalOrgStatus: string = org.status;
	if (
		org.status === 'payment_pending' ||
		org.status === 'provisioning' ||
		org.status === 'payment_required' ||
		org.status === 'past_due'
	) {
		finalOrgStatus = 'active';
		console.log('[WEBHOOK] ✓ Transitioning', org.status, '→ active');
	} else if (org.status === 'active') {
		finalOrgStatus = 'active';
		console.log('[WEBHOOK] Org already active, keeping it active');
	} else {
		console.log('[WEBHOOK] WARNING: Org in unexpected status:', org.status);
	}

	const updateData: Record<string, unknown> = {
		payment_action_required: false,
		last_payment_failed_at: null,
		payment_retry_count: 0,
		next_payment_retry_at: null,
		payment_failure_reason: null,
		stripe_latest_invoice_id: invoice.id,
		stripe_latest_invoice_status: invoice.status,
		stripe_status: 'active',
		status: finalOrgStatus,
		updated_at: new Date().toISOString()
	};

	// Reset monthly allocations on billing cycle renewal
	// This applies to subscription invoices (not one-time charges like wallet top-ups)
	if (
		invoice.billing_reason === 'subscription_cycle' ||
		invoice.billing_reason === 'subscription_create'
	) {
		// Get plan data to reset allocations
		const { data: plan } = await supabase
			.from('plan_catalog')
			.select(
				'included_minutes, included_sms, included_emails, included_ai_credits, included_seats, included_practice_minutes'
			)
			.eq('plan_code', org.plan_code)
			.single();

		if (plan) {
			// Calculate extra AI credits for additional seats beyond plan default
			const extraSeats = Math.max(0, (org.included_seats || 1) - (plan.included_seats || 1));
			const extraAiCredits = extraSeats * 50; // 50 credits per extra seat

			// Add Vela Pro bonus credits if addon is active (+100 credits/month)
			const hasAiAddon = false; // TODO: Implement this if we add an AI addon -> org.has_ai_addon
			const AI_ADDON_BONUS_CREDITS = 100;
			const addonBonusCredits = hasAiAddon ? AI_ADDON_BONUS_CREDITS : 0;

			const totalAiCredits = (plan.included_ai_credits || 0) + extraAiCredits + addonBonusCredits;

			// Reset all monthly allocations
			updateData.included_minutes = plan.included_minutes;
			updateData.included_sms = plan.included_sms;
			updateData.included_emails = plan.included_emails;
			updateData.included_ai_credits = totalAiCredits;
			updateData.ai_credits_remaining = totalAiCredits;
			// Reset free practice minutes for AI voice testing
			updateData.practice_minutes_remaining = plan.included_practice_minutes || 10;

			console.log('[WEBHOOK] Resetting monthly allocations for org', {
				orgId: org.id,
				billingReason: invoice.billing_reason,
				includedMinutes: plan.included_minutes,
				includedSms: plan.included_sms,
				includedAiCredits: totalAiCredits,
				practiceMinutes: plan.included_practice_minutes || 10,
				extraSeats,
				extraAiCredits,
				hasAiAddon,
				addonBonusCredits
			});
		}
	}

	console.log('[WEBHOOK] Updating org with data:', {
		status: updateData.status,
		stripe_status: updateData.stripe_status
	});
	const { error } = await supabase.from('organizations').update(updateData).eq('id', org.id);

	if (error) {
		console.error('[WEBHOOK] Failed to update organization after invoice paid', {
			orgId: org.id,
			error
		});
		return;
	}
	console.log('[WEBHOOK] ✓ Successfully updated org to status:', finalOrgStatus);

	await logSubscriptionChange(
		org.id,
		'invoice.payment_succeeded',
		org.plan_code,
		org.plan_code,
		0,
		invoice
	);

	// Log to human-readable ledger
	await logLedgerEvent(
		org.id,
		'payment_succeeded',
		`Payment of $${((invoice.amount_paid || 0) / 100).toFixed(2)} succeeded for ${billingReason === 'subscription_cycle' ? 'subscription renewal' : billingReason || 'invoice'}`,
		invoice.amount_paid,
		'credit',
		{ billing_reason: billingReason, invoice_id: invoice.id },
		event.id
	);

	// Refresh monthly included credits AND chat messages on subscription billing cycle renewal
	try {
		// Only trigger reset when the invoice is for the subscription cycle boundary or initial subscription creation
		if (billingReason === 'subscription_cycle' || billingReason === 'subscription_create') {
			// Reset credits
			const { error: resetErr } = await supabase.rpc('reset_monthly_included_credits_for_org', {
				p_org_id: org.id
			});
			if (resetErr) {
				console.warn('[WEBHOOK] Failed to reset monthly included credits on invoice.paid', {
					orgId: org.id,
					billingReason,
					error: resetErr
				});
			} else {
				console.log('[WEBHOOK] Monthly included credits reset for org on invoice.paid', {
					orgId: org.id,
					billingReason
				});
			}

			// Reset chat messages
			const { error: chatResetErr } = await supabase.rpc('reset_chat_messages_for_org', {
				p_org_id: org.id
			});
			if (chatResetErr) {
				console.warn('[WEBHOOK] Failed to reset chat messages on invoice.paid', {
					orgId: org.id,
					billingReason,
					error: chatResetErr
				});
			} else {
				console.log('[WEBHOOK] Chat messages reset for org on invoice.paid', {
					orgId: org.id,
					billingReason
				});
			}
		}
	} catch (e) {
		console.warn('[WEBHOOK] Exception during monthly reset on invoice.paid', {
			orgId: org.id,
			billingReason,
			error: e
		});
	}
};

const handleInvoicePaymentFailed = async (event: Stripe.Event) => {
	const invoice = event.data.object as Stripe.Invoice & {
		subscription?: string | Stripe.Subscription | null;
		last_payment_error?: { message?: string } | null;
	};
	const subscriptionId = (invoice.subscription ?? null) as string | null;
	const customerId = invoice.customer as string | null;

	const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);

	if (!org) {
		return;
	}

	// Save invoice to database
	await saveInvoice(org.id, invoice);

	// Also save to payment_failure_events
	const { error: failureEventError } = await supabase
		.from('payment_failure_events')
		.insert({
			org_id: org.id,
			stripe_invoice_id: invoice.id,
			error_message:
				(invoice.last_payment_error as { message?: string } | null)?.message ?? 'Payment failed',
			retry_count: (org.payment_retry_count ?? 0) + 1,
			raw_payload: invoice as unknown as Record<string, unknown>
		});
	if (failureEventError) {
		console.warn('[WEBHOOK] Failed to save payment failure event', failureEventError);
	}

	const currentRetryCount = org.payment_retry_count ?? 0;
	const newRetryCount = currentRetryCount + 1;
	const retryIntervals = [1, 3, 7, 14, 30];
	const retryDays = retryIntervals[Math.min(newRetryCount - 1, retryIntervals.length - 1)];
	const nextRetryAt = new Date();
	nextRetryAt.setDate(nextRetryAt.getDate() + retryDays);

	const { error } = await supabase
		.from('organizations')
		.update({
			status: 'past_due',
			stripe_status: 'past_due' as StripeSubStatus,
			payment_action_required: true,
			last_payment_failed_at: new Date().toISOString(),
			payment_retry_count: newRetryCount,
			next_payment_retry_at: nextRetryAt.toISOString(),
			payment_failure_reason:
				(invoice.last_payment_error as { message?: string } | null)?.message ?? 'Payment failed',
			updated_at: new Date().toISOString()
		})
		.eq('id', org.id);

	if (error) {
		console.error('[WEBHOOK] Failed to update organization after invoice failed', {
			orgId: org.id,
			error
		});
		return;
	}

	await logSubscriptionChange(
		org.id,
		'invoice.payment_failed',
		org.plan_code,
		org.plan_code,
		0,
		invoice
	);

	// Log to human-readable ledger
	const failureReason =
		(invoice.last_payment_error as { message?: string } | null)?.message ?? 'Payment failed';
	await logLedgerEvent(
		org.id,
		'payment_failed',
		`Payment of $${((invoice.amount_due || 0) / 100).toFixed(2)} failed: ${failureReason}. Retry attempt ${newRetryCount}.`,
		invoice.amount_due,
		'none',
		{
			billing_reason: (invoice as unknown as { billing_reason?: string }).billing_reason,
			invoice_id: invoice.id,
			retry_count: newRetryCount,
			next_retry_at: nextRetryAt.toISOString(),
			failure_reason: failureReason
		},
		event.id
	);

	// Log payment failure for detailed tracking
	const lastError = invoice.last_payment_error as {
		code?: string;
		message?: string;
		decline_code?: string;
	} | null;
	await logPaymentFailure(
		org.id,
		invoice.id,
		null,
		(invoice as unknown as { payment_intent?: string }).payment_intent ?? null,
		lastError?.code ?? null,
		lastError?.message ?? null,
		lastError?.decline_code ?? null,
		invoice.created
	);

	// In-app notification for org owner
	const failureReasonMsg =
		(invoice.last_payment_error as { message?: string } | null)?.message ?? 'Payment failed';
	await createNotificationForOrgOwner(org.id, {
		title: 'Payment failed',
		message: `Subscription payment failed: ${failureReasonMsg}. Update your payment method to avoid service interruption.`,
		type: 'payment_failed',
		priority: 'high',
		action_url: '/settings/billing',
		metadata: { invoice_id: invoice.id, retry_count: newRetryCount }
	});
};

const handleInvoicePaymentActionRequired = async (event: Stripe.Event) => {
	const invoice = event.data.object as Stripe.Invoice & {
		subscription?: string | Stripe.Subscription | null;
		last_payment_error?: { message?: string } | null;
	};
	const subscriptionId = (invoice.subscription ?? null) as string | null;
	const customerId = invoice.customer as string | null;

	const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);

	if (!org) {
		return;
	}

	const { error } = await supabase
		.from('organizations')
		.update({
			payment_action_required: true,
			status: 'payment_required',
			last_payment_failed_at: new Date().toISOString(),
			payment_failure_reason: 'Payment action required',
			updated_at: new Date().toISOString()
		})
		.eq('id', org.id);

	if (error) {
		console.error('[WEBHOOK] Failed to mark payment action required', { orgId: org.id, error });
	}

	await logSubscriptionChange(
		org.id,
		'invoice.payment_action_required',
		org.plan_code,
		org.plan_code,
		0,
		invoice
	);

	await createNotificationForOrgOwner(org.id, {
		title: 'Payment action required',
		message: 'Your subscription requires attention. Please update your payment method.',
		type: 'payment_action_required',
		priority: 'high',
		action_url: '/settings/billing',
		metadata: { invoice_id: invoice.id }
	});
};

const handleSubscriptionTrialWillEnd = async (event: Stripe.Event) => {
	const subscription = event.data.object as Stripe.Subscription;
	const subscriptionId = subscription.id;
	const customerId = subscription.customer as string | null;

	const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);
	if (!org) {
		return;
	}

	// Stripe guarantees ~3-day lead time; compute from org.trial_end if present
	const trialEndIso = org.trial_end ?? null;
	const trialEnd = trialEndIso ? new Date(trialEndIso) : null;

	try {
		const { data: owner } = await supabase
			.from('profiles')
			.select('email')
			.eq('id', org.owner_id)
			.maybeSingle();

		if (owner?.email) {
			await emailService.sendTrialEndingSoon(
				owner.email,
				org.name,
				3,
				(trialEnd ?? new Date()).toISOString()
			);
			await logSubscriptionChange(
				org.id,
				'customer.subscription.trial_will_end_email',
				org.plan_code,
				org.plan_code,
				0,
				subscription
			);
		}

		// In-app notification for org owner
		if (org.owner_id) {
			const trialEndStr = trialEnd ? trialEnd.toLocaleDateString('en-US', { dateStyle: 'medium' }) : 'soon';
			await createNotificationForUser(org.owner_id, org.id, {
				title: 'Trial ending soon',
				message: `Your trial for ${org.name} ends in about 3 days (${trialEndStr}). Add a payment method to continue without interruption.`,
				type: 'trial_ending_soon',
				priority: 'high',
				action_url: '/settings/billing',
				metadata: { trial_end: trialEndIso }
			});
		}
	} catch (e) {
		console.warn('[WEBHOOK] Failed to send trial_will_end email', { orgId: org.id, e });
	}
};

// =====================================================
// Checkout Session Completed - One-time wallet top-ups
// =====================================================
const handleCheckoutSessionCompleted = async (event: Stripe.Event) => {
	const session = event.data.object as Stripe.Checkout.Session;
	const metadata = session.metadata ?? {};

	// Only process wallet top-up checkout sessions
	if (metadata.purpose !== 'wallet_topup' && metadata.type !== 'wallet_credits') {
		console.log('[WEBHOOK] Checkout session not for wallet top-up, ignoring', {
			sessionId: session.id,
			purpose: metadata.purpose
		});
		return;
	}

	const organizationId = metadata.organizationId ?? metadata.org_id;
	const amountCents = Number(metadata.amount_cents ?? session.amount_total ?? 0);

	if (!organizationId) {
		console.warn('[WEBHOOK] Checkout session missing organizationId', {
			sessionId: session.id,
			metadata
		});
		return;
	}

	if (amountCents <= 0) {
		console.warn('[WEBHOOK] Checkout session has invalid amount', {
			sessionId: session.id,
			amountCents
		});
		return;
	}

	// Only process completed payments
	if (session.payment_status !== 'paid') {
		console.log('[WEBHOOK] Checkout session payment not completed', {
			sessionId: session.id,
			paymentStatus: session.payment_status
		});
		return;
	}

	try {
		// Credit the wallet using the existing utility
		await creditWallet(organizationId, amountCents, {
			transactionType: 'credit_top_up',
			referenceType: 'stripe_checkout_session',
			referenceId: session.id,
			description: metadata.description ?? 'One-time wallet top-up via checkout'
		});

		console.log('[WEBHOOK] Wallet credited from checkout session', {
			sessionId: session.id,
			organizationId,
			amountCents,
			credits: Math.floor(amountCents / 20) // $0.20 per credit
		});

		// Log to subscription ledger for audit trail
		await supabase.from('subscription_ledger').insert({
			org_id: organizationId,
			event: 'checkout.session.completed.wallet_topup',
			from_plan: null,
			to_plan: null,
			proration_cents: amountCents,
			raw: {
				checkout_session_id: session.id,
				amount_cents: amountCents,
				credits_added: Math.floor(amountCents / 20),
				metadata
			}
		});
	} catch (error) {
		console.error('[WEBHOOK] Failed to credit wallet from checkout session', {
			sessionId: session.id,
			organizationId,
			error
		});
		throw error; // Re-throw to trigger webhook retry
	}
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
	const signature = req.headers['stripe-signature'];
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!webhookSecret) {
		console.error('[WEBHOOK] STRIPE_WEBHOOK_SECRET not configured');
		return res.status(500).json({ error: 'Webhook secret not configured' });
	}

	if (!signature || typeof signature !== 'string') {
		console.warn('[WEBHOOK] Missing Stripe signature header');
		return res.status(400).json({ error: 'Missing signature' });
	}

	let event: Stripe.Event;

	try {
		event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
	} catch (error) {
		console.error('[WEBHOOK] Signature verification failed', error);
		return res.status(400).json({ error: 'Invalid signature' });
	}

	// 1. Log event as 'received' IMMEDIATELY (before any other processing)
	await logWebhookEvent(event, 'received');

	// 2. Check idempotency - skip if already processed
	const alreadyProcessed = await isWebhookProcessed(event.id);
	if (alreadyProcessed) {
		console.log('[WEBHOOK] Event already processed (idempotent)', {
			eventId: event.id,
			type: event.type
		});
		await logWebhookEvent(event, 'skipped', null, 'Already processed');
		return res.json({ received: true, idempotent: true });
	}

	// 3. Find organization for this event
	let orgId: string | null = null;
	try {
		const dataObject = event.data.object;
		let customerId: string | null = null;
		let subscriptionId: string | null = null;

		if ('customer' in dataObject) {
			customerId = dataObject.customer as string | null;
		}
		if ('subscription' in dataObject) {
			subscriptionId =
				(dataObject.subscription as string | Stripe.Subscription | null)?.toString() || null;
		}
		if (dataObject.object === 'subscription' && 'id' in dataObject) {
			subscriptionId = dataObject.id as string;
		}

		if (subscriptionId || customerId) {
			const org = await findOrganizationBySubscriptionOrCustomer(subscriptionId, customerId);
			orgId = org?.id || null;
		}

		// Also check metadata for organizationId
		if (!orgId && 'metadata' in dataObject && dataObject.metadata) {
			const metadata = dataObject.metadata as Record<string, string>;
			orgId = metadata.organizationId || null;
		}
	} catch (e) {
		console.warn('[WEBHOOK] Failed to find organization', { eventId: event.id, error: e });
	}

	// 4. Log as 'processing'
	await logWebhookEvent(event, 'processing', orgId);

	try {
		// 5. Handle the event based on type
		switch (event.type as Stripe.Event['type']) {
			case 'payment_intent.succeeded':
			case 'payment_intent.canceled':
			case 'payment_intent.payment_failed':
				await handleWalletPaymentIntent(event);
				orgId =
					((event.data.object as Stripe.PaymentIntent).metadata ?? {}).organizationId ??
					orgId ??
					null;
				break;
			case 'charge.succeeded': {
				const successCharge = event.data.object as Stripe.Charge;
				await saveCharge(orgId, successCharge);
				// Log to ledger if we have orgId
				if (orgId) {
					await logLedgerEvent(
						orgId,
						'charge_succeeded',
						`Charge of $${(successCharge.amount / 100).toFixed(2)} succeeded`,
						successCharge.amount,
						'credit',
						{ charge_id: successCharge.id },
						event.id
					);
				}
				break;
			}
			case 'charge.failed': {
				const failedCharge = event.data.object as Stripe.Charge;
				await saveCharge(orgId, failedCharge);
				// Log payment failure and ledger entry
				if (orgId) {
					const outcome = failedCharge.outcome as
						| { type?: string; reason?: string; seller_message?: string }
						| undefined;
					await logPaymentFailure(
						orgId,
						(failedCharge as unknown as { invoice?: string }).invoice ?? null,
						failedCharge.id,
						failedCharge.payment_intent as string | null,
						failedCharge.failure_code ?? null,
						failedCharge.failure_message ?? outcome?.seller_message ?? null,
						outcome?.reason ?? null,
						failedCharge.created
					);
					await logLedgerEvent(
						orgId,
						'charge_failed',
						`Charge of $${(failedCharge.amount / 100).toFixed(2)} failed: ${failedCharge.failure_message || 'Unknown reason'}`,
						failedCharge.amount,
						'none',
						{
							charge_id: failedCharge.id,
							failure_code: failedCharge.failure_code,
							failure_message: failedCharge.failure_message
						},
						event.id
					);
				}
				break;
			}
			case 'charge.updated': {
				const updatedCharge = event.data.object as Stripe.Charge;
				await saveCharge(orgId, updatedCharge);
				break;
			}
			case 'charge.refunded': {
				const refundedCharge = event.data.object as Stripe.Charge;
				await saveCharge(orgId, refundedCharge);
				// Log to ledger
				if (orgId && refundedCharge.amount_refunded > 0) {
					await logLedgerEvent(
						orgId,
						'refund_issued',
						`Refund of $${(refundedCharge.amount_refunded / 100).toFixed(2)} issued`,
						refundedCharge.amount_refunded,
						'debit',
						{ charge_id: refundedCharge.id },
						event.id
					);
				}
				await handleWalletRefund(event);
				break;
			}
			case 'refund.created' as Stripe.Event['type']:
			case 'refund.updated' as Stripe.Event['type']:
			case 'charge.refund.updated' as Stripe.Event['type']: {
				const refund = event.data.object as Stripe.Refund;
				await saveRefund(orgId, refund);
				break;
			}
			case 'customer.created':
			case 'customer.updated': {
				const customer = event.data.object as Stripe.Customer;
				await saveCustomer(orgId, customer);
				break;
			}
			case 'payment_method.attached':
			case 'payment_method.updated': {
				const pm = event.data.object as Stripe.PaymentMethod;
				await savePaymentMethod(orgId, pm);
				break;
			}
			case 'charge.dispute.created':
				await handleChargeDispute(event);
				break;
			case 'customer.subscription.created':
			case 'customer.subscription.updated': {
				await handleSubscriptionEvent(event);
				const subscription = event.data.object as Stripe.Subscription;
				if (orgId) {
					await saveSubscriptionSnapshot(orgId, event.type, subscription);
				}
				break;
			}
			case 'customer.subscription.deleted': {
				await handleSubscriptionDeleted(event);
				const deletedSub = event.data.object as Stripe.Subscription;
				if (orgId) {
					await saveSubscriptionSnapshot(orgId, event.type, deletedSub);
				}
				break;
			}
			case 'customer.subscription.paused': {
				await handleSubscriptionPaused(event);
				const pausedSub = event.data.object as Stripe.Subscription;
				if (orgId) {
					await saveSubscriptionSnapshot(orgId, event.type, pausedSub);
				}
				break;
			}
			case 'customer.subscription.resumed': {
				await handleSubscriptionResumed(event);
				const resumedSub = event.data.object as Stripe.Subscription;
				if (orgId) {
					await saveSubscriptionSnapshot(orgId, event.type, resumedSub);
				}
				break;
			}
			case 'customer.subscription.past_due' as Stripe.Event['type']:
				await handleSubscriptionPastDue(event);
				break;
			case 'customer.subscription.schedule.created' as Stripe.Event['type']:
			case 'customer.subscription.schedule.updated' as Stripe.Event['type']:
			case 'customer.subscription.schedule.canceled' as Stripe.Event['type']:
			case 'customer.subscription.schedule.completed' as Stripe.Event['type']:
				await handleSubscriptionScheduleEvent(event);
				break;
			case 'invoice.created':
			case 'invoice.finalized':
			case 'invoice.updated':
			case 'invoice.paid':
			case 'invoice.payment_succeeded': {
				const invoice = event.data.object as Stripe.Invoice;
				if (orgId) {
					await saveInvoice(orgId, invoice);
				}
				if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
					await handleInvoicePaid(event);
				}
				break;
			}
			case 'invoice.payment_failed': {
				const failedInvoice = event.data.object as Stripe.Invoice;
				if (orgId) {
					await saveInvoice(orgId, failedInvoice);
				}
				await handleInvoicePaymentFailed(event);
				break;
			}
			case 'invoice.payment_action_required': {
				const actionRequiredInvoice = event.data.object as Stripe.Invoice;
				if (orgId) {
					await saveInvoice(orgId, actionRequiredInvoice);
				}
				await handleInvoicePaymentActionRequired(event);
				break;
			}
			case 'invoice.voided': {
				const voidedInvoice = event.data.object as Stripe.Invoice;
				if (orgId) {
					await saveInvoice(orgId, voidedInvoice);
				}
				console.log('[WEBHOOK] Invoice voided', { invoiceId: voidedInvoice.id, orgId });
				break;
			}
			case 'customer.subscription.trial_will_end':
				await handleSubscriptionTrialWillEnd(event);
				break;
			case 'checkout.session.completed':
				await handleCheckoutSessionCompleted(event);
				orgId =
					((event.data.object as Stripe.Checkout.Session).metadata ?? {}).organizationId ??
					orgId ??
					null;
				break;
			default:
				console.log('[WEBHOOK] Unhandled event type', { type: event.type });
		}

		// 6. Log as 'processed' and update org's last webhook timestamp
		await logWebhookEvent(event, 'processed', orgId);
		if (orgId) {
			await updateOrgLastWebhook(orgId);
		}

		res.json({ received: true });
	} catch (error) {
		console.error('[WEBHOOK] Error handling event', { type: event.type, error });

		const errorMessage = error instanceof Error ? error.message : 'Unknown error';

		// 7. Log as 'failed' and increment org's failure count
		await logWebhookEvent(event, 'failed', orgId, errorMessage);
		if (orgId) {
			await incrementWebhookFailures(orgId);
		}

		res.status(500).json({ error: 'Webhook handling failed' });
	}
};
