import { Request, Response } from 'express';
import { supabase } from '../utils/supabaseClient.js';
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
} from '../types/billing.js';
import { getStripeClient } from '../utils/stripe.js';
import { ensureWallet } from '../utils/wallet.js';
import {
	DEFERRED_ORG_SIGNUP_META,
	DEFERRED_ORG_SIGNUP_VALUE,
	cancelDeferredIncompleteSubscriptionsExcept,
	createOrganizationFromDeferredSubscription
} from '../utils/deferredOrgSignup.js';
import { captureApiError, captureApiWarning } from '../utils/sentryCapture.js';

const stripe = getStripeClient();

/**
 * Newer Stripe API puts the invoice PaymentIntent client secret on `invoice.confirmation_secret`.
 * Older payloads use expanded `payment_intent`. If we miss both, we fall back to SetupIntent — that only
 * saves the card and leaves `default_incomplete` subscriptions stuck in `incomplete` (no invoice.paid).
 */
function syncInvoicePaymentClientSecret(sub: Stripe.Subscription): string | null {
	const li = sub.latest_invoice;
	if (!li || typeof li === 'string') return null;
	const inv = li as Stripe.Invoice;
	const fromConfirm = inv.confirmation_secret?.client_secret;
	if (fromConfirm) return fromConfirm;
	const piRaw = (inv as unknown as { payment_intent?: string | Stripe.PaymentIntent | null })
		.payment_intent;
	if (piRaw && typeof piRaw === 'object' && 'client_secret' in piRaw) {
		return (piRaw as Stripe.PaymentIntent).client_secret ?? null;
	}
	return null;
}

async function ensureSubscriptionPaymentClientSecret(
	stripeClient: Stripe,
	subscription: Stripe.Subscription
): Promise<string | null> {
	const sync = syncInvoicePaymentClientSecret(subscription);
	if (sync) return sync;

	const li = subscription.latest_invoice;
	if (!li) return null;
	const invoiceId = typeof li === 'string' ? li : li.id;
	if (!invoiceId) return null;

	try {
		const inv = await stripeClient.invoices.retrieve(invoiceId, {
			expand: ['payment_intent']
		});
		const fromConfirm = inv.confirmation_secret?.client_secret;
		if (fromConfirm) return fromConfirm;
		const piRaw = (inv as unknown as { payment_intent?: string | Stripe.PaymentIntent | null })
			.payment_intent;
		if (piRaw && typeof piRaw === 'object' && 'client_secret' in piRaw) {
			return (piRaw as Stripe.PaymentIntent).client_secret ?? null;
		}
		if (typeof piRaw === 'string') {
			const pi = await stripeClient.paymentIntents.retrieve(piRaw);
			return pi.client_secret ?? null;
		}
	} catch (e) {
		console.warn('[ONBOARD] could not resolve subscription invoice PaymentIntent client secret', e);
	}
	return null;
}

/**
 * Charge the subscription's first invoice after we have a payment method on file.
 * Sets subscription default PM, finalizes draft invoices, then invoices.pay; if that fails, confirms the invoice PI.
 * (Client-only SetupIntent never pays the invoice — this is what actually moves `incomplete` → `active`/`trialing`.)
 */
async function completeDeferredSubscriptionPayment(
	stripeClient: Stripe,
	subscriptionId: string,
	paymentMethodId: string
): Promise<void> {
	try {
		await stripeClient.subscriptions.update(subscriptionId, {
			default_payment_method: paymentMethodId
		});
	} catch (e) {
		console.warn('[ONBOARD] subscription.update default_payment_method failed', e);
	}

	const sub = await stripeClient.subscriptions.retrieve(subscriptionId, {
		expand: ['latest_invoice']
	});
	if (sub.status !== 'incomplete' && sub.status !== 'incomplete_expired') return;

	const li = sub.latest_invoice;
	const invoiceId = typeof li === 'string' ? li : li?.id;
	if (!invoiceId) {
		console.warn('[ONBOARD] completeDeferred: missing invoice id', { subscriptionId });
		return;
	}

	let inv = await stripeClient.invoices.retrieve(invoiceId, {
		expand: ['payment_intent']
	});

	if (inv.status === 'draft') {
		try {
			inv = await stripeClient.invoices.finalizeInvoice(invoiceId, { auto_advance: true });
		} catch (e) {
			console.warn('[ONBOARD] finalizeInvoice failed (may already be open)', e);
			inv = await stripeClient.invoices.retrieve(invoiceId, { expand: ['payment_intent'] });
		}
	}

	if (inv.status === 'paid' || (inv.amount_due ?? 0) <= 0) return;

	try {
		await stripeClient.invoices.pay(invoiceId, { payment_method: paymentMethodId });
		return;
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.warn('[ONBOARD] invoices.pay failed, will try PaymentIntent.confirm', msg);
	}

	inv = await stripeClient.invoices.retrieve(invoiceId, { expand: ['payment_intent'] });
	const piRaw = (inv as unknown as { payment_intent?: string | Stripe.PaymentIntent | null })
		.payment_intent;
	const piId = typeof piRaw === 'string' ? piRaw : piRaw?.id;
	if (!piId) {
		console.warn('[ONBOARD] completeDeferred: no payment_intent on invoice after pay failure');
		return;
	}

	const piBefore = await stripeClient.paymentIntents.retrieve(piId);
	if (piBefore.status === 'succeeded') return;

	try {
		await stripeClient.paymentIntents.confirm(piId, {
			payment_method: paymentMethodId
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		console.warn(
			'[ONBOARD] paymentIntents.confirm failed (3DS or decline may require client)',
			msg
		);
	}
}

function defaultPaymentMethodIdFromCustomer(cust: Stripe.Customer): string | null {
	const d = cust.invoice_settings?.default_payment_method;
	if (typeof d === 'string') return d;
	if (d && typeof d === 'object' && 'id' in d) return (d as Stripe.PaymentMethod).id;
	return null;
}

async function createSetupIntentForCustomer(opts: {
	customerId: string;
	organizationId?: string | null;
	userId?: string | null;
}) {
	const si = await stripe.setupIntents.create({
		customer: opts.customerId,
		usage: 'off_session',
		payment_method_types: ['card'],
		metadata: {
			organization_id: opts.organizationId ?? '',
			user_id: opts.userId ?? '',
			purpose: 'trial_card_on_file'
		}
	});
	return si.client_secret || null;
}

/** Attach PM to customer and set default — shared by deferred signup paths. */
async function attachPaymentMethodToDeferredCustomer(
	paymentMethodId: string,
	customerId: string,
	userId: string,
	reqUserEmail: string | undefined
): Promise<void> {
	const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
	const pmCustomer = typeof pm.customer === 'string' ? pm.customer : null;
	if (!pmCustomer) {
		await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
	} else if (pmCustomer !== customerId) {
		const prevCustomer = (await stripe.customers.retrieve(pmCustomer)) as Stripe.Customer;
		const prevUserId =
			(prevCustomer.metadata as Record<string, string> | undefined)?.user_id || null;
		const sameOwner = prevUserId
			? prevUserId === userId
			: Boolean(prevCustomer.email && reqUserEmail && prevCustomer.email === reqUserEmail);
		if (!sameOwner) {
			const e = new Error(
				'Payment method belongs to another account. Please use a different card.'
			);
			(e as Error & { code?: string }).code = 'pm_wrong_customer';
			throw e;
		}
		await stripe.paymentMethods.detach(paymentMethodId);
		await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
	}
	await stripe.customers.update(customerId, {
		invoice_settings: { default_payment_method: paymentMethodId }
	});
}

export const onboardOrganization = async (req: Request, res: Response) => {
	try {
		console.log('[ONBOARD] ========== START onboardOrganization ==========');
		const userId = req.user?.id;
		console.log('[ONBOARD] userId:', userId);
		if (!userId) {
			return res.status(401).json({ ok: false, error: 'Unauthorized' } as ApiError);
		}

		const {
			orgId,
			name,
			planCode,
			trialDays,
			tz = 'America/New_York',
			paymentMethodId: paymentMethodIdFromRequest,
			useExistingPaymentMethod
		}: OrgOnboardRequest = req.body;
		console.log('[ONBOARD] Request:', { orgId, name, planCode, trialDays, isRenewal: !!orgId });

		const isRenewal = Boolean(orgId);
		console.log('[ONBOARD] isRenewal:', isRenewal);

		// Validate required fields
		if (!name || !planCode) {
			return res.status(400).json({
				ok: false,
				error: 'Missing required fields: name, planCode'
			} as ApiError);
		}

		// Get the plan from catalog
		const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
		const { data: plan, error: planError } = await supabase
			.from('plan_catalog')
			.select('*')
			.eq('plan_code', planCode)
			.eq('env', env)
			.eq('active', true)
			.single();

		if (planError || !plan) {
			return res.status(400).json({
				ok: false,
				error: 'Invalid plan code or plan not active'
			} as ApiError);
		}

		// New org: Stripe customer + subscription first; DB org is created only after successful payment (webhook).
		if (!orgId) {
			console.log(
				'[ONBOARD] NEW ORG (deferred) — customer + SetupIntent first; subscription created with default_payment_method after card'
			);
			const td = trialDays && trialDays > 0 ? trialDays : 0;
			const tzResolved = typeof tz === 'string' && tz ? tz : 'America/New_York';

			type DeferredRow = {
				stripe_customer_id: string;
				stripe_subscription_id: string | null;
				org_name: string;
				plan_code: string;
			};

			type DeferredRowWithSub = DeferredRow & { stripe_subscription_id: string };

			const respondDeferred = async (row: DeferredRowWithSub): Promise<boolean> => {
				if (paymentMethodIdFromRequest) {
					try {
						await attachPaymentMethodToDeferredCustomer(
							paymentMethodIdFromRequest,
							row.stripe_customer_id,
							userId,
							req.user?.email
						);
						await completeDeferredSubscriptionPayment(
							stripe,
							row.stripe_subscription_id,
							paymentMethodIdFromRequest
						);
					} catch (e) {
						const code = (e as Error & { code?: string }).code;
						if (code === 'pm_wrong_customer') {
							res.status(400).json({
								ok: false,
								error: (e as Error).message,
								code: 'pm_wrong_customer'
							} as ApiError);
							return true;
						}
						console.error('[ONBOARD] deferred PM attach failed', e);
						res.status(400).json({ ok: false, error: 'Failed to save payment method' } as ApiError);
						return true;
					}
				}

				let existingSub: Stripe.Subscription;
				try {
					existingSub = await stripe.subscriptions.retrieve(row.stripe_subscription_id, {
						expand: ['latest_invoice.payment_intent']
					});
				} catch (e) {
					console.warn('[ONBOARD] deferred subscription missing; clearing signup row', e);
					await supabase.from('stripe_deferred_org_signups').delete().eq('user_id', userId);
					return false;
				}

				if (existingSub.status === 'canceled' || existingSub.status === 'incomplete_expired') {
					await supabase.from('stripe_deferred_org_signups').delete().eq('user_id', userId);
					return false;
				}

				let subscriptionClientSecret = await ensureSubscriptionPaymentClientSecret(
					stripe,
					existingSub
				);
				let setupClientSecret: string | null = null;
				const stillNeedsPayment = existingSub.status === 'incomplete';
				if (!subscriptionClientSecret && row.stripe_customer_id && stillNeedsPayment) {
					setupClientSecret = await createSetupIntentForCustomer({
						customerId: row.stripe_customer_id,
						organizationId: null,
						userId
					});
				}

				res.json({
					ok: true,
					org: null,
					subscriptionClientSecret,
					setupClientSecret,
					pendingPayment: true
				} as OrgOnboardResponse);
				return true;
			};

			const { data: deferredExistingRaw } = await supabase
				.from('stripe_deferred_org_signups')
				.select('stripe_customer_id, stripe_subscription_id, org_name, plan_code')
				.eq('user_id', userId)
				.maybeSingle();

			let deferredExisting = deferredExistingRaw as DeferredRow | null;

			if (deferredExisting) {
				const sameIntent =
					deferredExisting.org_name === name && deferredExisting.plan_code === planCode;
				if (!sameIntent) {
					if (deferredExisting.stripe_subscription_id) {
						try {
							const prevSub = await stripe.subscriptions.retrieve(
								deferredExisting.stripe_subscription_id
							);
							if (prevSub.status === 'incomplete') {
								await stripe.subscriptions.cancel(prevSub.id);
							}
						} catch (e) {
							console.warn('[ONBOARD] cancel prior deferred subscription failed', e);
						}
					}
					await supabase.from('stripe_deferred_org_signups').delete().eq('user_id', userId);
					deferredExisting = null;
				} else {
					// Same org name + plan: Stripe customer exists; subscription is created only after PM is on file.
					if (paymentMethodIdFromRequest && !deferredExisting.stripe_subscription_id) {
						// We have a confirmed PM and a customer but no subscription yet — create it now with PM as default.
						// No payment_behavior: 'default_incomplete' — with a valid PM already set, Stripe charges
						// immediately and returns active/trialing, never incomplete.
						try {
							await attachPaymentMethodToDeferredCustomer(
								paymentMethodIdFromRequest,
								deferredExisting.stripe_customer_id,
								userId,
								req.user?.email
							);
						} catch (e) {
							const code = (e as Error & { code?: string }).code;
							if (code === 'pm_wrong_customer') {
								return res.status(400).json({
									ok: false,
									error: (e as Error).message,
									code: 'pm_wrong_customer'
								} as ApiError);
							}
							console.error('[ONBOARD] deferred PM attach failed', e);
							return res
								.status(400)
								.json({ ok: false, error: 'Failed to save payment method' } as ApiError);
						}

						const sub = await stripe.subscriptions.create({
							customer: deferredExisting.stripe_customer_id,
							items: [{ price: plan.stripe_price_id }],
							default_payment_method: paymentMethodIdFromRequest,
							collection_method: 'charge_automatically',
							// NOTE: No payment_behavior: 'default_incomplete' — card is already on file,
							// Stripe will charge immediately and return active or trialing.
							payment_settings: { save_default_payment_method: 'on_subscription' },
							trial_period_days: td > 0 ? td : undefined,
							metadata: {
								user_id: userId,
								[DEFERRED_ORG_SIGNUP_META]: DEFERRED_ORG_SIGNUP_VALUE,
								org_name: name,
								plan_code: planCode,
								trial_days: String(td)
							},
							expand: ['latest_invoice.payment_intent']
						});

						await supabase.from('stripe_deferred_org_signups').upsert(
							{
								user_id: userId,
								stripe_customer_id: deferredExisting.stripe_customer_id,
								stripe_subscription_id: sub.id,
								org_name: name,
								plan_code: planCode,
								trial_days: td,
								tz: tzResolved,
								updated_at: new Date().toISOString()
							},
							{ onConflict: 'user_id' }
						);

						if (sub.status === 'active' || sub.status === 'trialing') {
							const org = await createOrganizationFromDeferredSubscription(stripe, sub);
							if (org?.id) {
								return res.json({
									ok: true,
									org,
									pendingPayment: false
								} as OrgOnboardResponse);
							}
						}

						// 3DS required — return PI secret for client to confirm
						if (sub.status === 'incomplete') {
							const subscriptionClientSecret = await ensureSubscriptionPaymentClientSecret(
								stripe,
								sub
							);
							return res.json({
								ok: true,
								org: null,
								subscriptionClientSecret: subscriptionClientSecret ?? null,
								setupClientSecret: null,
								pendingPayment: true
							} as OrgOnboardResponse);
						}

						// Unexpected status — cancel and bail
						console.error(
							'[ONBOARD] deferred sub created with unexpected status',
							sub.status,
							sub.id
						);
						try {
							await stripe.subscriptions.cancel(sub.id);
						} catch {
							/* best effort */
						}
						return res.status(402).json({
							ok: false,
							error: `Subscription could not be activated (status: ${sub.status}). Please try again.`
						} as ApiError);
					}

					if (paymentMethodIdFromRequest && deferredExisting.stripe_subscription_id) {
						// We have a PM and an existing subscription. If that sub is incomplete, it was created
						// before the card was on file (the old broken flow). Cancel it and create a fresh one
						// with the PM as default — that's the clean path.
						let existingSub: Stripe.Subscription;
						try {
							existingSub = await stripe.subscriptions.retrieve(
								deferredExisting.stripe_subscription_id,
								{
									expand: ['latest_invoice.payment_intent']
								}
							);
						} catch (e) {
							console.warn('[ONBOARD] deferred subscription missing; clearing signup row', e);
							await supabase.from('stripe_deferred_org_signups').delete().eq('user_id', userId);
							// Fall through to create fresh customer + sub below
							return res.status(400).json({
								ok: false,
								error: 'Your previous payment session expired. Please go back and try again.'
							} as ApiError);
						}

						if (existingSub.status === 'active' || existingSub.status === 'trialing') {
							// Already paid (e.g. race with webhook) — just create the org and return
							const org = await createOrganizationFromDeferredSubscription(stripe, existingSub);
							if (org?.id) {
								return res.json({ ok: true, org, pendingPayment: false } as OrgOnboardResponse);
							}
						}

						if (existingSub.status === 'incomplete') {
							// Broken sub from old flow — cancel it and create a fresh one with the PM already set
							console.log(
								'[ONBOARD] canceling stale incomplete sub and creating fresh one with PM',
								existingSub.id
							);
							try {
								await stripe.subscriptions.cancel(existingSub.id);
							} catch {
								/* best effort */
							}

							try {
								await attachPaymentMethodToDeferredCustomer(
									paymentMethodIdFromRequest,
									deferredExisting.stripe_customer_id,
									userId,
									req.user?.email
								);
							} catch (e) {
								const code = (e as Error & { code?: string }).code;
								if (code === 'pm_wrong_customer') {
									return res.status(400).json({
										ok: false,
										error: (e as Error).message,
										code: 'pm_wrong_customer'
									} as ApiError);
								}
								return res
									.status(400)
									.json({ ok: false, error: 'Failed to save payment method' } as ApiError);
							}

							const freshSub = await stripe.subscriptions.create({
								customer: deferredExisting.stripe_customer_id,
								items: [{ price: plan.stripe_price_id }],
								default_payment_method: paymentMethodIdFromRequest,
								collection_method: 'charge_automatically',
								payment_settings: { save_default_payment_method: 'on_subscription' },
								trial_period_days: td > 0 ? td : undefined,
								metadata: {
									user_id: userId,
									[DEFERRED_ORG_SIGNUP_META]: DEFERRED_ORG_SIGNUP_VALUE,
									org_name: name,
									plan_code: planCode,
									trial_days: String(td)
								},
								expand: ['latest_invoice.payment_intent']
							});

							await supabase.from('stripe_deferred_org_signups').upsert(
								{
									user_id: userId,
									stripe_customer_id: deferredExisting.stripe_customer_id,
									stripe_subscription_id: freshSub.id,
									org_name: name,
									plan_code: planCode,
									trial_days: td,
									tz: tzResolved,
									updated_at: new Date().toISOString()
								},
								{ onConflict: 'user_id' }
							);

							if (freshSub.status === 'active' || freshSub.status === 'trialing') {
								const org = await createOrganizationFromDeferredSubscription(stripe, freshSub);
								if (org?.id) {
									return res.json({ ok: true, org, pendingPayment: false } as OrgOnboardResponse);
								}
							}

							if (freshSub.status === 'incomplete') {
								const subscriptionClientSecret = await ensureSubscriptionPaymentClientSecret(
									stripe,
									freshSub
								);
								return res.json({
									ok: true,
									org: null,
									subscriptionClientSecret: subscriptionClientSecret ?? null,
									setupClientSecret: null,
									pendingPayment: true
								} as OrgOnboardResponse);
							}
						}

						// For canceled/expired subs, fall through to create fresh
						await supabase.from('stripe_deferred_org_signups').delete().eq('user_id', userId);
						return res.status(400).json({
							ok: false,
							error: 'Your payment session expired. Please go back and try again.'
						} as ApiError);
					}

					if (!paymentMethodIdFromRequest && !deferredExisting.stripe_subscription_id) {
						const setupOnly = await createSetupIntentForCustomer({
							customerId: deferredExisting.stripe_customer_id,
							organizationId: null,
							userId
						});
						return res.json({
							ok: true,
							org: null,
							subscriptionClientSecret: null,
							setupClientSecret: setupOnly,
							pendingPayment: true
						} as OrgOnboardResponse);
					}

					if (!paymentMethodIdFromRequest && deferredExisting.stripe_subscription_id) {
						if (await respondDeferred(deferredExisting as DeferredRowWithSub)) {
							return;
						}
					}
				}
			}

			if (paymentMethodIdFromRequest && !deferredExisting) {
				return res.status(400).json({
					ok: false,
					error:
						'Select your plan first, or your session expired. Go back to the plan step and continue.'
				} as ApiError);
			}

			// One Stripe customer per user -- search by user_id metadata before ever creating.
			// This prevents duplicate customers when the user changes their org name, plan,
			// or trial selection between attempts (which would change the old fingerprint key).
			let stripeCustomerId: string | null = null;

			try {
				const search = await stripe.customers.search({
					query: `metadata["user_id"]:"${userId}"`,
					limit: 5
				});
				// Prefer a customer already tagged with the deferred signup flag; otherwise take the first
				const match =
					search.data.find(
						(c) =>
							(c.metadata as Record<string, string>)?.[DEFERRED_ORG_SIGNUP_META] ===
							DEFERRED_ORG_SIGNUP_VALUE
					) ??
					search.data[0] ??
					null;
				if (match) {
					stripeCustomerId = match.id;
					// Keep name/email/metadata fresh in case they changed
					await stripe.customers.update(stripeCustomerId, {
						name,
						email: req.user?.email || undefined,
						metadata: {
							...match.metadata,
							user_id: userId,
							[DEFERRED_ORG_SIGNUP_META]: DEFERRED_ORG_SIGNUP_VALUE,
							plan_code: planCode
						}
					});
					console.log('[ONBOARD] reusing existing Stripe customer for new org', stripeCustomerId);
				}
			} catch (searchErr) {
				console.warn('[ONBOARD] customer search failed, will create fresh', searchErr);
			}

			if (!stripeCustomerId) {
				const newCustomer = await stripe.customers.create({
					name,
					email: req.user?.email || undefined,
					metadata: {
						user_id: userId,
						[DEFERRED_ORG_SIGNUP_META]: DEFERRED_ORG_SIGNUP_VALUE,
						plan_code: planCode
					}
				});
				stripeCustomerId = newCustomer.id;
				console.log('[ONBOARD] created new Stripe customer for new org', stripeCustomerId);
			}

			// Recover if Stripe already has an incomplete deferred subscription but our signup row was lost (e.g. refresh).
			try {
				const existingSubs = await stripe.subscriptions.list({
					customer: stripeCustomerId,
					status: 'all',
					limit: 20
				});
				const reuse = existingSubs.data.find((s) => {
					const m = s.metadata as Record<string, string> | undefined;
					return (
						m?.[DEFERRED_ORG_SIGNUP_META] === DEFERRED_ORG_SIGNUP_VALUE &&
						m?.user_id === userId &&
						m?.org_name === name &&
						m?.plan_code === planCode &&
						(s.status === 'incomplete' || s.status === 'trialing')
					);
				});
				if (reuse) {
					const recovered = await stripe.subscriptions.retrieve(reuse.id, {
						expand: ['latest_invoice.payment_intent']
					});
					await cancelDeferredIncompleteSubscriptionsExcept(
						stripe,
						stripeCustomerId,
						userId,
						recovered.id
					);
					await supabase.from('stripe_deferred_org_signups').upsert(
						{
							user_id: userId,
							stripe_customer_id: stripeCustomerId,
							stripe_subscription_id: recovered.id,
							org_name: name,
							plan_code: planCode,
							trial_days: td,
							tz: tzResolved,
							updated_at: new Date().toISOString()
						},
						{ onConflict: 'user_id' }
					);
					let subscriptionClientSecret = await ensureSubscriptionPaymentClientSecret(
						stripe,
						recovered
					);
					let setupClientSecret: string | null = null;
					const recoveredNeedsPayment = recovered.status === 'incomplete';
					if (!subscriptionClientSecret && stripeCustomerId && recoveredNeedsPayment) {
						setupClientSecret = await createSetupIntentForCustomer({
							customerId: stripeCustomerId,
							organizationId: null,
							userId
						});
					}
					return res.json({
						ok: true,
						org: null,
						subscriptionClientSecret,
						setupClientSecret,
						pendingPayment: true
					} as OrgOnboardResponse);
				}
			} catch (listErr) {
				console.warn(
					'[ONBOARD] deferred subscription reuse list failed (continuing to create)',
					listErr
				);
			}

			await cancelDeferredIncompleteSubscriptionsExcept(stripe, stripeCustomerId, userId, null);

			await supabase.from('stripe_deferred_org_signups').upsert(
				{
					user_id: userId,
					stripe_customer_id: stripeCustomerId,
					stripe_subscription_id: null,
					org_name: name,
					plan_code: planCode,
					trial_days: td,
					tz: tzResolved,
					updated_at: new Date().toISOString()
				},
				{ onConflict: 'user_id' }
			);

			const setupClientSecret = await createSetupIntentForCustomer({
				customerId: stripeCustomerId,
				organizationId: null,
				userId
			});

			return res.json({
				ok: true,
				org: null,
				subscriptionClientSecret: null,
				setupClientSecret,
				pendingPayment: true
			} as OrgOnboardResponse);
		}

		if (!orgId) {
			return res.status(400).json({
				ok: false,
				error: 'Organization id is required'
			} as ApiError);
		}

		// Renewal: existing organization only
		let org: OrganizationRow;
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

		if (existingOrg.owner_id && existingOrg.owner_id !== userId) {
			return res.status(403).json({
				ok: false,
				error: 'Only the organization owner can onboard billing'
			} as ApiError);
		}

		org = existingOrg;

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
				console.warn(
					'[billing] customers.search failed (continuing without email fallback)',
					searchErr
				);
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
					console.error(
						'Failed to persist stripe_customer_id after recovery/creation:',
						customerUpdateError
					);
				}
			}
		}

		let defaultPaymentMethodId: string | null = paymentMethodIdFromRequest || null;
		// Note: do not mutate customer default payment method for new orgs; client must confirm PI
		// Only renewals can use a saved/default payment method
		const allowUsingSavedDefault = isRenewal && useExistingPaymentMethod === true;
		// Only renewals should attach/migrate a provided payment method server-side
		const shouldAttachNewPaymentMethod = isRenewal && Boolean(paymentMethodIdFromRequest);

		if (allowUsingSavedDefault && !defaultPaymentMethodId && stripeCustomerId) {
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
		if (isRenewal && useExistingPaymentMethod && paymentMethodIdFromRequest) {
			try {
				const pm = await stripe.paymentMethods.retrieve(paymentMethodIdFromRequest);
				const pmCustomer = typeof pm.customer === 'string' ? pm.customer : null;
				// If PM is unattached, attach it to this customer now
				if (!pmCustomer) {
					await stripe.paymentMethods.attach(paymentMethodIdFromRequest, {
						customer: stripeCustomerId
					});
				}
				if (pmCustomer && pmCustomer !== stripeCustomerId) {
					// Attempt safe migration if the previous customer belongs to the same user
					try {
						const prevCustomer = (await stripe.customers.retrieve(pmCustomer)) as Stripe.Customer;
						const prevUserId =
							(prevCustomer.metadata as Record<string, string> | undefined)?.user_id || null;
						const sameOwner = prevUserId
							? prevUserId === userId
							: prevCustomer.email && req.user?.email && prevCustomer.email === req.user.email;
						if (!sameOwner) {
							return res.status(400).json({
								ok: false,
								error: 'Payment method belongs to another account. Please use a different card.',
								code: 'pm_wrong_customer'
							} as ApiError);
						}
						// Detach and reattach to the new org's customer
						await stripe.paymentMethods.detach(paymentMethodIdFromRequest);
						await stripe.paymentMethods.attach(paymentMethodIdFromRequest, {
							customer: stripeCustomerId
						});
					} catch (migrateError) {
						console.error('Failed to migrate payment method to this customer:', migrateError);
						if (!isRenewal) {
							try {
								await supabase.from('organizations').delete().eq('id', org.id);
							} catch (cleanupError) {
								console.warn(
									'Failed to cleanup organization after PM migration error:',
									cleanupError
								);
							}
						}
						return res
							.status(400)
							.json({
								ok: false,
								error: 'Failed to move payment method to this organization'
							} as ApiError);
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
				return res
					.status(400)
					.json({ ok: false, error: 'Failed to use selected payment method' } as ApiError);
			}
		}

		// Renewals must specify or have a saved payment method; new orgs collect client-side.
		if (isRenewal && useExistingPaymentMethod && !defaultPaymentMethodId) {
			return res.status(400).json({
				ok: false,
				error: 'A saved payment method is required for renewals.',
				code: 'payment_method_required'
			} as ApiError);
		}
		// For new orgs: proceed without a PM here; client will collect & confirm the PaymentIntent.

		if (isRenewal && shouldAttachNewPaymentMethod && defaultPaymentMethodId) {
			try {
				// Ensure payment method is attached to this customer
				const pm = await stripe.paymentMethods.retrieve(defaultPaymentMethodId);
				const pmCustomer = typeof pm.customer === 'string' ? pm.customer : null;
				// If unattached, attach it now to this org's customer
				if (!pmCustomer) {
					await stripe.paymentMethods.attach(defaultPaymentMethodId, {
						customer: stripeCustomerId
					});
				}
				// Wrong customer
				if (pmCustomer && pmCustomer !== stripeCustomerId) {
					try {
						const prevCustomer = (await stripe.customers.retrieve(pmCustomer)) as Stripe.Customer;
						const prevUserId =
							(prevCustomer.metadata as Record<string, string> | undefined)?.user_id || null;
						const sameOwner = prevUserId
							? prevUserId === userId
							: prevCustomer.email && req.user?.email && prevCustomer.email === req.user.email;
						if (!sameOwner) {
							return res.status(400).json({
								ok: false,
								error: 'Payment method belongs to another account. Please use a different card.',
								code: 'pm_wrong_customer'
							} as ApiError);
						}
						await stripe.paymentMethods.detach(defaultPaymentMethodId);
						await stripe.paymentMethods.attach(defaultPaymentMethodId, {
							customer: stripeCustomerId
						});
					} catch (migrateError) {
						console.error('Failed to migrate payment method (new card path):', migrateError);
						if (!isRenewal) {
							try {
								await supabase.from('organizations').delete().eq('id', org.id);
							} catch (cleanupError) {
								console.warn(
									'Failed to cleanup organization after PM migration error:',
									cleanupError
								);
							}
						}
						return res
							.status(400)
							.json({
								ok: false,
								error: 'Failed to move payment method to this organization'
							} as ApiError);
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

		// Do not mutate customer default payment method for new orgs; client confirms payment intent

		// Create or get Stripe subscription
		let stripeSubscriptionId = org.stripe_subscription_id;
		// If previous subscription was canceled or expired, create a new one under the SAME customer
		const existingStatus = org.stripe_status as StripeSubStatus | null;
		if (
			stripeSubscriptionId &&
			(existingStatus === 'canceled' || existingStatus === 'incomplete_expired')
		) {
			stripeSubscriptionId = null;
		}
		let subscriptionClientSecret: string | null = null;
		let setupClientSecret: string | null = null;
		// Status must NEVER be set to active here — only the webhook (invoice.paid) does that.
		// Renewals go to payment_pending just like new orgs; the webhook activates on successful payment.
		let computedOrgStatus: OrgStatus = 'payment_pending';
		console.log(
			'[ONBOARD] computedOrgStatus:',
			computedOrgStatus,
			'(isRenewal:',
			isRenewal,
			', org.status:',
			org.status,
			')'
		);

		if (!stripeSubscriptionId) {
			// Reuse any existing relevant subscription for this org if present
			try {
				const existingList = await stripe.subscriptions.list({
					customer: stripeCustomerId!,
					status: 'all',
					limit: 10
				});
				const candidate = existingList.data.find(
					(s) =>
						s.metadata?.organization_id === org.id &&
						['incomplete', 'trialing', 'active', 'past_due'].includes(s.status)
				);
				if (candidate) {
					try {
						const reused = await stripe.subscriptions.retrieve(candidate.id, {
							expand: ['latest_invoice.payment_intent']
						});
						stripeSubscriptionId = reused.id;
						const inv = reused.latest_invoice as Stripe.Invoice | null;
						if (inv) {
							const paymentIntent = (inv as unknown as { payment_intent?: unknown }).payment_intent;
							if (
								paymentIntent &&
								typeof paymentIntent === 'object' &&
								'client_secret' in (paymentIntent as Record<string, unknown>)
							) {
								const cs = (paymentIntent as { client_secret?: string }).client_secret;
								subscriptionClientSecret = cs || null;
							}
						}
					} catch (reuseFetchErr) {
						if (
							reuseFetchErr instanceof Stripe.errors.StripeInvalidRequestError &&
							reuseFetchErr.code === 'resource_missing'
						) {
							console.warn(
								'[onboard][renewal] found stale subscription reference; clearing local id',
								{
									orgId: org.id,
									subscriptionId: candidate.id
								}
							);
							await supabase
								.from('organizations')
								.update({
									stripe_subscription_id: null,
									stripe_status: 'canceled',
									updated_at: new Date().toISOString()
								})
								.eq('id', org.id);
							org.stripe_subscription_id = null;
						} else {
							throw reuseFetchErr;
						}
					}
				}
			} catch (reuseErr) {
				console.warn('[onboard][renewal] subscription reuse check failed (continuing)', reuseErr);
			}

			// If still none, create a new subscription for renewal.
			// Renewals always have a PM at this point — do NOT use payment_behavior: 'default_incomplete'.
			// With default_payment_method set and charge_automatically, Stripe charges immediately
			// and returns active/trialing rather than incomplete.
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
				payment_settings: { save_default_payment_method: 'on_subscription' },
				collection_method: 'charge_automatically',
				expand: ['latest_invoice.payment_intent']
			};

			// Renewals should always have a PM by this point; set it as default so Stripe charges it
			if (defaultPaymentMethodId) {
				subscriptionParams.default_payment_method = defaultPaymentMethodId;
			}

			if (trialDays && trialDays > 0) {
				subscriptionParams.trial_period_days = trialDays;
			}

			if (!stripeSubscriptionId) {
				const subscription = await stripe.subscriptions.create(subscriptionParams, {
					idempotencyKey: `onboard:${org.id}:${planCode}`
				});
				stripeSubscriptionId = subscription.id;

				const invoice = subscription.latest_invoice as Stripe.Invoice | null;
				// Keep payment_pending — webhook activates the org only after invoice.paid fires
				if (invoice) {
					const paymentIntent = (invoice as unknown as { payment_intent?: unknown }).payment_intent;
					if (
						paymentIntent &&
						typeof paymentIntent === 'object' &&
						'client_secret' in (paymentIntent as Record<string, unknown>)
					) {
						const cs = (paymentIntent as { client_secret?: string }).client_secret;
						subscriptionClientSecret = cs || null;
					} else if (trialDays && trialDays > 0) {
						subscriptionClientSecret = null;
					}
				}
			}

			// Do not auto-confirm or charge; client will confirm using client secret

			// Removed: usage-only subscription creation. Usage is funded via wallet top-ups.
		}

		// If no PI secret was produced (e.g., trials), provide a SetupIntent secret so UI can collect card
		if (!subscriptionClientSecret && stripeCustomerId) {
			setupClientSecret = await createSetupIntentForCustomer({
				customerId: stripeCustomerId,
				organizationId: org.id,
				userId
			});
		}

		// CRITICAL: Ensure new organizations NEVER leave payment_pending state without webhook confirmation
		// If somehow org is not in payment_pending at this point, it must be a renewal (existing customer)
		if (!isRenewal && org.status !== 'payment_pending') {
			console.warn('[CRITICAL] New org was not created in payment_pending state', {
				orgId: org.id,
				status: org.status,
				isRenewal
			});
			// Force it back to payment_pending for safety
			org.status = 'payment_pending' as OrgStatus;
		}

		let subscriptionData: Partial<OrganizationRow> = {
			name,
			tz,
			stripe_customer_id: stripeCustomerId,
			status: computedOrgStatus,
			updated_at: new Date().toISOString()
		};

		// Apply plan metadata immediately for new orgs; for renewals, defer plan application
		if (!isRenewal) {
			subscriptionData = {
				...subscriptionData,
				plan_code: planCode,
				plan_price_cents: plan.base_price_cents,
				included_seats: plan.included_seats,
				// new credit fields
				included_credits_monthly: plan.included_credits,
				included_credits_remaining: plan.included_credits,
				// legacy compatibility
				included_credits: plan.included_credits
			};
		}

		// If subscription was created, mirror subscription data
		if (stripeSubscriptionId) {
			try {
				const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

				subscriptionData = {
					...subscriptionData,
					stripe_subscription_id: subscription.id,
					stripe_status: subscription.status as StripeSubStatus,
					trial_end: subscription.trial_end ? unixToISO(subscription.trial_end) : null
				};
			} catch (error) {
				if (
					error instanceof Stripe.errors.StripeInvalidRequestError &&
					error.code === 'resource_missing'
				) {
					console.warn('Subscription missing during mirroring; clearing local reference', {
						orgId: org.id,
						stripeSubscriptionId
					});
					subscriptionData = {
						...subscriptionData,
						stripe_subscription_id: null,
						stripe_status: 'canceled' as StripeSubStatus
					};
				} else {
					console.error('Error retrieving subscription for mirroring:', error);
					// Fallback to basic data if subscription retrieval fails
					subscriptionData = {
						...subscriptionData,
						stripe_subscription_id: stripeSubscriptionId,
						stripe_status: 'incomplete' as StripeSubStatus
					};
				}
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
			captureApiError(updateError, req, { feature: 'billing-onboard-org-update', orgId: org.id });
			return res.status(500).json({
				ok: false,
				error: 'Failed to update organization with billing information'
			} as ApiError);
		}

		// CRITICAL SAFEGUARD: Verify org status before returning
		// For new orgs, it MUST be payment_pending (not active)
		console.log(
			'[ONBOARD] Updated org returned with status:',
			updatedOrg.status,
			'isRenewal:',
			isRenewal
		);
		if (!isRenewal && updatedOrg.status !== 'payment_pending') {
			console.error('[CRITICAL] Organization returned with wrong status after onboarding!', {
				orgId: updatedOrg.id,
				status: updatedOrg.status,
				isRenewal,
				stripeStatus: updatedOrg.stripe_status
			});
			// Force correct status directly
			console.log('[ONBOARD] FORCE CORRECTING status to payment_pending');
			await supabase
				.from('organizations')
				.update({ status: 'payment_pending' })
				.eq('id', updatedOrg.id);
			updatedOrg.status = 'payment_pending';
		}
		console.log('[ONBOARD] ✓ Final org status:', updatedOrg.status);

		await ensureWallet(updatedOrg.id);

		const response: OrgOnboardResponse = {
			ok: true,
			org: updatedOrg as OrganizationRow,
			subscriptionClientSecret,
			setupClientSecret
		};

		res.json(response);
	} catch (error) {
		console.error('Error onboarding organization:', error);
		captureApiError(error, req, { feature: 'billing-onboard-organization' });
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
			captureApiError(error, req, { feature: 'billing-plan-catalog-query' });
			return res.status(500).json({ error: 'Failed to fetch plan catalog' });
		}

		res.json({ plans });
	} catch (error) {
		console.error('Error fetching plan catalog:', error);
		captureApiError(error, req, { feature: 'billing-plan-catalog' });
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
					captureApiWarning('Failed to retrieve default payment method by id for summary', req, {
						feature: 'billing-pm-summary-retrieve',
						orgId
					});
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
			captureApiError(stripeError, req, { feature: 'billing-pm-summary-stripe', orgId });
			return res.status(500).json({ error: 'Failed to retrieve payment method summary' });
		}
	} catch (error) {
		console.error('Error retrieving customer payment method summary:', error);
		captureApiError(error, req, { feature: 'billing-pm-summary' });
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
			return res.json({
				paymentMethods: [],
				defaultPaymentMethodId: null,
				customerId: null,
				organizationName: org.name
			});
		}

		// Load default payment method id from customer, and list all card payment methods
		const customer = (await stripe.customers.retrieve(org.stripe_customer_id, {
			expand: ['invoice_settings.default_payment_method']
		})) as Stripe.Customer;

		const defaultPm = customer.invoice_settings?.default_payment_method;
		const defaultPaymentMethodId =
			typeof defaultPm === 'string'
				? defaultPm
				: (defaultPm as Stripe.PaymentMethod | null)?.id || null;

		const methods = await stripe.paymentMethods.list({
			customer: org.stripe_customer_id,
			type: 'card'
		});

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
		captureApiError(err, req, { feature: 'billing-payment-methods-list' });
		return res.status(500).json({ error: 'Failed to retrieve payment methods' });
	}
};

/**
 * Pulls subscription state from Stripe and creates the DB org when the subscription is active/trialing.
 * Use after PaymentElement confirms payment when webhooks are not delivered (e.g. local dev).
 */
export const syncDeferredOrganizationAfterPayment = async (req: Request, res: Response) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ ok: false, error: 'Unauthorized' } as ApiError);
		}

		const { data: uo } = await supabase
			.from('user_organizations')
			.select('organization_id')
			.eq('user_id', userId)
			.maybeSingle();

		if (uo?.organization_id) {
			const { data: org, error } = await supabase
				.from('organizations')
				.select('*')
				.eq('id', uo.organization_id)
				.single();
			if (!error && org) {
				return res.json({ ok: true, org: org as OrganizationRow });
			}
		}

		const { data: deferred } = await supabase
			.from('stripe_deferred_org_signups')
			.select('*')
			.eq('user_id', userId)
			.maybeSingle();

		if (!deferred) {
			return res.status(404).json({ ok: false, error: 'No pending signup found' } as ApiError);
		}
		if (!deferred.stripe_subscription_id) {
			return res.status(409).json({
				ok: false,
				error: 'Subscription not started yet — complete the payment step first.',
				code: 'subscription_not_ready'
			} as ApiError);
		}

		let sub = await stripe.subscriptions.retrieve(deferred.stripe_subscription_id, {
			expand: ['latest_invoice.payment_intent', 'items.data.price']
		});

		const customerId =
			typeof sub.customer === 'string' ? sub.customer : deferred.stripe_customer_id;

		if (sub.status === 'incomplete') {
			try {
				const cust = await stripe.customers.retrieve(customerId, {
					expand: ['invoice_settings.default_payment_method']
				});
				if (typeof cust !== 'string' && !cust.deleted) {
					const pmId = defaultPaymentMethodIdFromCustomer(cust);
					if (pmId) {
						await completeDeferredSubscriptionPayment(stripe, sub.id, pmId);
						sub = await stripe.subscriptions.retrieve(deferred.stripe_subscription_id, {
							expand: ['latest_invoice.payment_intent', 'items.data.price']
						});
					}
				}
			} catch (e) {
				console.warn('[sync-deferred] server-side charge attempt failed', e);
			}
		}

		if (sub.status === 'active' || sub.status === 'trialing') {
			let org = await createOrganizationFromDeferredSubscription(stripe, sub);
			if (!org) {
				const { data: existing } = await supabase
					.from('organizations')
					.select('*')
					.eq('stripe_subscription_id', sub.id)
					.maybeSingle();
				org = (existing as OrganizationRow) ?? null;
			}
			if (org?.id) {
				try {
					await cancelDeferredIncompleteSubscriptionsExcept(stripe, customerId, userId, sub.id);
				} catch (e) {
					console.warn('[sync-deferred] cancel stale subs failed', e);
				}
				return res.json({ ok: true, org });
			}
			captureApiWarning(
				'Could not create organization from deferred subscription after active/trialing sub',
				req,
				{ feature: 'billing-sync-deferred-create-org', userId }
			);
			return res
				.status(500)
				.json({ ok: false, error: 'Could not create organization' } as ApiError);
		}

		if (sub.status === 'incomplete') {
			return res.status(409).json({
				ok: false,
				error: 'Payment still processing',
				code: 'subscription_not_ready',
				subscriptionStatus: sub.status
			} as ApiError);
		}

		return res.status(409).json({
			ok: false,
			error: `Unexpected subscription status: ${sub.status}`,
			code: 'unexpected_subscription_status',
			subscriptionStatus: sub.status
		} as ApiError);
	} catch (e) {
		console.error('syncDeferredOrganizationAfterPayment', e);
		captureApiError(e, req, { feature: 'billing-sync-deferred' });
		return res.status(500).json({ ok: false, error: 'Internal server error' } as ApiError);
	}
};
