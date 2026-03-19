/**
 * CRO Studio add-on — $29/month, any plan.
 * Gate CRO Studio navigation and destination page audits.
 */

import { supabase } from './supabaseClient.js';
import { getStripeClient } from './stripe.js';
import Stripe from 'stripe';

export interface CROAddonStatus {
	hasAddon: boolean;
	addonStartedAt: string | null;
	addonPriceId: string | null;
	addonPriceCents: number | null;
	stripeSubscriptionId: string | null;
	canSubscribe: boolean;
	canCancel: boolean;
}

/**
 * Get CRO Studio add-on status for an organization
 */
export async function getCROAddonStatus(orgId: string): Promise<CROAddonStatus> {
	const { data: org, error: orgError } = await supabase
		.from('organizations')
		.select('has_cro_addon, cro_addon_started_at, stripe_subscription_id, stripe_status')
		.eq('id', orgId)
		.single();

	if (orgError || !org) {
		throw new Error('Organization not found');
	}

	const addonCode =
		process.env.NODE_ENV === 'production' ? 'cro_studio' : 'cro_studio_test';
	const { data: addon } = await supabase
		.from('addon_catalog')
		.select('addon_code, price_cents, stripe_price_id')
		.eq('addon_code', addonCode)
		.single();

	const hasActiveSubscription =
		org.stripe_subscription_id &&
		['active', 'trialing', 'past_due'].includes(org.stripe_status || '');

	return {
		hasAddon: org.has_cro_addon || false,
		addonStartedAt: org.cro_addon_started_at,
		addonPriceId: addon?.stripe_price_id || null,
		addonPriceCents: addon?.price_cents ?? 2900,
		stripeSubscriptionId: org.stripe_subscription_id,
		canSubscribe: !org.has_cro_addon && !!hasActiveSubscription,
		canCancel: !!org.has_cro_addon && !!hasActiveSubscription
	};
}

/**
 * Subscribe organization to CRO Studio add-on
 */
export async function subscribeToCROAddon(
	orgId: string
): Promise<{ success: boolean; error?: string }> {
	const stripe = getStripeClient();

	const status = await getCROAddonStatus(orgId);

	if (status.hasAddon) {
		return { success: false, error: 'Already subscribed to CRO Studio' };
	}

	if (!status.canSubscribe) {
		return { success: false, error: 'Active subscription required to add CRO Studio' };
	}

	if (!status.addonPriceId || !status.stripeSubscriptionId) {
		return { success: false, error: 'Missing subscription or addon configuration' };
	}

	// Validate Stripe price ID format (avoid placeholder)
	if (
		status.addonPriceId.includes('replace_me') ||
		status.addonPriceId.includes('placeholder')
	) {
		return {
			success: false,
			error:
				'CRO Studio addon not configured. Update addon_catalog.stripe_price_id with your Stripe price ID.'
		};
	}

	/** 150 additional credits per month for CRO Studio addon */
	const CRO_ADDON_CREDITS = 150;

	try {
		const subscription = await stripe.subscriptions.retrieve(status.stripeSubscriptionId, {
			expand: ['items.data.price']
		});

		const existingItem = subscription.items.data.find(
			(item) => (item as Stripe.SubscriptionItem).price?.id === status.addonPriceId
		);

		if (existingItem) {
			console.log('[CRO Addon] Addon already exists in Stripe, updating DB');
		} else {
			await stripe.subscriptionItems.create({
				subscription: status.stripeSubscriptionId,
				price: status.addonPriceId,
				quantity: 1,
				proration_behavior: 'create_prorations'
			});
			console.log('[CRO Addon] Added CRO Studio to Stripe subscription');
		}

		// Fetch current credits so we can add CRO bonus
		const { data: orgCredits, error: creditsFetchErr } = await supabase
			.from('organizations')
			.select('included_credits_remaining, included_credits_monthly, included_credits')
			.eq('id', orgId)
			.single();

		if (creditsFetchErr || !orgCredits) {
			console.warn('[CRO Addon] Could not fetch org credits for bonus', { orgId, err: creditsFetchErr });
		}

		const currentRemaining = Number(orgCredits?.included_credits_remaining ?? orgCredits?.included_credits ?? 0);
		const currentMonthly = Number(orgCredits?.included_credits_monthly ?? orgCredits?.included_credits ?? 0);
		const newRemaining = currentRemaining + CRO_ADDON_CREDITS;
		const newMonthly = currentMonthly + CRO_ADDON_CREDITS;

		const { error: updateError } = await supabase
			.from('organizations')
			.update({
				has_cro_addon: true,
				cro_addon_started_at: new Date().toISOString(),
				included_credits_remaining: newRemaining,
				included_credits_monthly: newMonthly,
				included_credits: newMonthly,
				updated_at: new Date().toISOString()
			})
			.eq('id', orgId);

		if (updateError) {
			console.error('[CRO Addon] Failed to update organization:', updateError);
			return { success: false, error: 'Failed to update subscription status' };
		}

		console.log('[CRO Addon] ✓ Subscribed org to CRO Studio, added +150 credits:', orgId);
		return { success: true };
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : 'Failed to subscribe';
		console.error('[CRO Addon] Subscribe error:', error);
		return { success: false, error: msg };
	}
}

/**
 * Cancel CRO Studio add-on subscription
 */
export async function cancelCROAddon(
	orgId: string
): Promise<{ success: boolean; error?: string }> {
	const stripe = getStripeClient();

	const status = await getCROAddonStatus(orgId);

	if (!status.hasAddon) {
		return { success: false, error: 'Not subscribed to CRO Studio' };
	}

	if (!status.canCancel) {
		return { success: false, error: 'Cannot cancel addon' };
	}

	if (!status.addonPriceId || !status.stripeSubscriptionId) {
		return { success: false, error: 'Missing subscription configuration' };
	}

	try {
		const subscription = await stripe.subscriptions.retrieve(status.stripeSubscriptionId, {
			expand: ['items.data.price']
		});

		const addonItem = subscription.items.data.find(
			(item) => (item as Stripe.SubscriptionItem).price?.id === status.addonPriceId
		) as Stripe.SubscriptionItem | undefined;

		if (addonItem) {
			await stripe.subscriptionItems.del(addonItem.id, {
				proration_behavior: 'create_prorations'
			});
			console.log('[CRO Addon] Removed CRO Studio from Stripe subscription');
		}

		const { error: updateError } = await supabase
			.from('organizations')
			.update({
				has_cro_addon: false,
				cro_addon_started_at: null,
				updated_at: new Date().toISOString()
			})
			.eq('id', orgId);

		if (updateError) {
			console.error('[CRO Addon] Failed to update organization:', updateError);
			return { success: false, error: 'Failed to update subscription status' };
		}

		console.log('[CRO Addon] ✓ Cancelled CRO Studio for org:', orgId);
		return { success: true };
	} catch (error: unknown) {
		const msg = error instanceof Error ? error.message : 'Failed to cancel';
		console.error('[CRO Addon] Cancel error:', error);
		return { success: false, error: msg };
	}
}

/**
 * Check if a Stripe price ID is the CRO Studio addon
 */
export async function isCROAddonPriceId(priceId: string): Promise<boolean> {
	const { data: addons } = await supabase
		.from('addon_catalog')
		.select('stripe_price_id')
		.in('addon_code', ['cro_studio', 'cro_studio_test']);

	return addons?.some((a) => a.stripe_price_id === priceId) || false;
}
