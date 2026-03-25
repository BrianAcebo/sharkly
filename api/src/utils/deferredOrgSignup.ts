import Stripe from 'stripe';
import type { OrganizationRow, PlanCatalogRow, StripeSubStatus } from '../types/billing.js';
import { supabase } from './supabaseClient.js';
import { ensureWallet } from './wallet.js';
import { computeMaxSeatsForPlan, updateOrgMaxSeats } from './seats.js';

export const DEFERRED_ORG_SIGNUP_META = 'deferred_org_signup';
export const DEFERRED_ORG_SIGNUP_VALUE = '1';

async function getPlanFromStripePriceId(priceId: string): Promise<PlanCatalogRow | null> {
	const { data, error } = await supabase
		.from('plan_catalog')
		.select('*')
		.eq('stripe_price_id', priceId)
		.eq('active', true)
		.order('created_at', { ascending: false })
		.limit(1);

	if (error) {
		console.warn('[deferred-org] plan lookup by price failed', { priceId, error });
		return null;
	}
	if (!data?.length) return null;
	return (data[0] as PlanCatalogRow) ?? null;
}

function unixToISO(ts: number | undefined): string | null {
	if (!ts) return null;
	return new Date(ts * 1000).toISOString();
}

/**
 * Creates organizations + user_organizations when Stripe subscription is active/trialing
 * and metadata marks a deferred signup (no org row existed at subscription creation).
 */
export async function createOrganizationFromDeferredSubscription(
	stripe: Stripe,
	subscription: Stripe.Subscription
): Promise<OrganizationRow | null> {
	const subscriptionId = subscription.id;

	const { data: existing } = await supabase
		.from('organizations')
		.select('*')
		.eq('stripe_subscription_id', subscriptionId)
		.maybeSingle();
	if (existing) return existing as OrganizationRow;

	const meta = (subscription.metadata ?? {}) as Record<string, string>;
	if (meta[DEFERRED_ORG_SIGNUP_META] !== DEFERRED_ORG_SIGNUP_VALUE) return null;

	const st = subscription.status;
	if (st !== 'active' && st !== 'trialing') {
		console.log('[deferred-org] skip org create — subscription not active/trialing yet', {
			subscriptionId,
			status: st
		});
		return null;
	}

	const userId = meta.user_id;
	if (!userId) {
		console.warn('[deferred-org] missing user_id in subscription metadata', { subscriptionId });
		return null;
	}

	let orgName = (meta.org_name || '').trim();
	const { data: deferredRow } = await supabase
		.from('stripe_deferred_org_signups')
		.select('*')
		.eq('stripe_subscription_id', subscriptionId)
		.maybeSingle();

	if (!orgName && deferredRow && typeof deferredRow.org_name === 'string') {
		orgName = deferredRow.org_name.trim();
	}
	if (!orgName) {
		console.warn('[deferred-org] missing org name', { subscriptionId });
		return null;
	}

	const items = subscription.items?.data ?? [];
	const activeItem = items.find((item) => !item.deleted && (item.quantity ?? 0) > 0) ?? items[0];
	const priceId = activeItem?.price?.id;
	let plan: PlanCatalogRow | null = null;
	if (priceId) plan = await getPlanFromStripePriceId(priceId);
	if (!plan && meta.plan_code) {
		const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
		const { data: byCode } = await supabase
			.from('plan_catalog')
			.select('*')
			.eq('plan_code', meta.plan_code)
			.eq('env', env)
			.eq('active', true)
			.maybeSingle();
		plan = (byCode as PlanCatalogRow) ?? null;
	}
	if (!plan) {
		console.error('[deferred-org] could not resolve plan', {
			subscriptionId,
			priceId,
			plan_code: meta.plan_code
		});
		return null;
	}

	const customerId =
		typeof subscription.customer === 'string'
			? subscription.customer
			: subscription.customer && !subscription.customer.deleted
				? subscription.customer.id
				: null;
	if (!customerId) return null;

	const tz =
		(deferredRow && typeof deferredRow.tz === 'string' && deferredRow.tz) ||
		meta.tz ||
		'America/New_York';

	const chatMessages = plan.included_chat_messages ?? 0;

	const { data: newOrg, error: insertErr } = await supabase
		.from('organizations')
		.insert({
			name: orgName,
			owner_id: userId,
			status: 'provisioning',
			stripe_status: st as StripeSubStatus,
			stripe_customer_id: customerId,
			stripe_subscription_id: subscriptionId,
			plan_code: plan.plan_code,
			plan_price_cents: plan.base_price_cents,
			included_seats: plan.included_seats,
			included_credits_monthly: plan.included_credits,
			included_credits_remaining: plan.included_credits,
			included_credits: plan.included_credits,
			included_chat_messages_monthly: chatMessages,
			chat_messages_remaining: chatMessages,
			tz,
			trial_end: unixToISO(subscription.trial_end ?? undefined),
			payment_action_required: false,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.select('*')
		.single();

	if (insertErr || !newOrg) {
		const { data: raceOrg } = await supabase
			.from('organizations')
			.select('*')
			.eq('stripe_subscription_id', subscriptionId)
			.maybeSingle();
		if (raceOrg) return raceOrg as OrganizationRow;
		console.error('[deferred-org] insert failed', insertErr);
		return null;
	}

	const org = newOrg as OrganizationRow;

	const { error: uoErr } = await supabase.from('user_organizations').upsert(
		{ user_id: userId, organization_id: org.id, role: 'owner' },
		{ onConflict: 'user_id,organization_id' }
	);
	if (uoErr) {
		console.error('[deferred-org] user_organizations upsert failed', uoErr);
	}

	await ensureWallet(org.id);

	try {
		const computedMaxSeats = await computeMaxSeatsForPlan(plan.plan_code, plan.included_seats);
		if (computedMaxSeats !== null) await updateOrgMaxSeats(org.id, computedMaxSeats);
	} catch (e) {
		console.warn('[deferred-org] max seats update failed', e);
	}

	await supabase.from('stripe_deferred_org_signups').delete().eq('stripe_subscription_id', subscriptionId);

	try {
		await stripe.subscriptions.update(subscriptionId, {
			metadata: {
				...meta,
				organization_id: org.id,
				[DEFERRED_ORG_SIGNUP_META]: '0'
			}
		});
	} catch (e) {
		console.warn('[deferred-org] failed to patch subscription metadata', e);
	}

	try {
		const cust = await stripe.customers.retrieve(customerId);
		if (typeof cust !== 'string' && !cust.deleted) {
			const cm = (cust.metadata ?? {}) as Record<string, string>;
			await stripe.customers.update(customerId, {
				metadata: { ...cm, organization_id: org.id }
			});
		}
	} catch (e) {
		console.warn('[deferred-org] failed to patch customer metadata', e);
	}

	return org;
}

/**
 * Cancels incomplete deferred-signup subscriptions on this customer except `keepSubscriptionId`.
 * Keeps Stripe tidy when users refresh or abandon checkout (only one active/incomplete checkout per intent).
 */
export async function cancelDeferredIncompleteSubscriptionsExcept(
	stripe: Stripe,
	customerId: string,
	userId: string,
	keepSubscriptionId: string | null
): Promise<void> {
	const list = await stripe.subscriptions.list({
		customer: customerId,
		status: 'all',
		limit: 40
	});
	for (const s of list.data) {
		if (keepSubscriptionId && s.id === keepSubscriptionId) continue;
		const m = (s.metadata || {}) as Record<string, string>;
		if (m[DEFERRED_ORG_SIGNUP_META] !== DEFERRED_ORG_SIGNUP_VALUE) continue;
		if (m.user_id !== userId) continue;
		if (s.status !== 'incomplete' && s.status !== 'incomplete_expired') continue;
		try {
			await stripe.subscriptions.cancel(s.id);
			console.log('[deferred-org] canceled stale incomplete subscription', s.id);
		} catch (e) {
			// Already removed in Dashboard, or race with another cancel — safe to ignore
			if (e instanceof Stripe.errors.StripeInvalidRequestError && e.code === 'resource_missing') {
				continue;
			}
			console.warn('[deferred-org] cancel stale incomplete sub failed', s.id, e);
		}
	}
}
