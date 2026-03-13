import { Request, Response } from 'express';
import Stripe from 'stripe';
import { supabase } from '../utils/supabaseClient.js';
import { HttpError } from '../error/httpError.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
	apiVersion: '2025-08-27.basil'
});

export const createPaymentIntent = async (req: Request, res: Response) => {
	try {
		const {
			amount,
			currency = 'usd',
			customerId
		}: { amount: number; currency?: string; customerId?: string } = req.body;

		if (!amount) {
			console.error('Missing required fields:', { amount });
			throw new HttpError('Missing required fields', 400);
		}

		if (!customerId) {
			throw new HttpError(
				'Stripe customer required. Create/lookup customer first, then pass customerId.',
				400
			);
		}

		// Create a PaymentIntent only. If a customer is provided, set setup_future_usage
		// so Stripe saves the card during confirmation.
		const paymentIntent = await stripe.paymentIntents.create({
			amount,
			currency,
			customer: customerId || undefined,
			automatic_payment_methods: { enabled: true },
			setup_future_usage: customerId ? 'off_session' : undefined
		});

		// Send response with PI client secret only
		const responseData = { clientSecret: paymentIntent.client_secret };

		res.json(responseData);
	} catch (error) {
		if (error instanceof HttpError) {
			const err = error as { message: string; statusCode: number };
			console.error(`Error ${err.statusCode}: ${err.message}`);
			return res.status(err.statusCode).json({
				error: {
					message: err.message
				}
			});
		} else {
			console.error('An unexpected error occurred:', error);
			return res.status(500).json({
				error: {
					message: 'An unexpected error occurred'
				}
			});
		}
	}
};

export const handleWebhook = async (req: Request, res: Response) => {
	const sig = req.headers['stripe-signature'];

	if (!sig) {
		return res.status(400).json({ error: 'Missing stripe signature' });
	}

	try {
		const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);

		// Handle the event
		switch (event.type) {
			case 'payment_intent.succeeded': {
				const paymentIntent = event.data.object as Stripe.PaymentIntent;
				const { organizationId } = paymentIntent.metadata;

				// Update organization status
				const { error: updateError } = await supabase
					.from('organizations')
					.update({
						status: 'active'
					})
					.eq('id', organizationId);

				if (updateError) {
					console.error('Error updating organization status:', updateError);
					return res.status(500).json({ error: 'Failed to update organization status' });
				}

				// Create subscription record
				const { error: subscriptionError } = await supabase.from('subscriptions').insert({
					organization_id: organizationId,
					stripe_customer_id: paymentIntent.customer,
					status: 'active',
					plan_type: 'monthly',
					current_period_start: new Date(),
					current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
				});

				if (subscriptionError) {
					console.error('Error creating subscription:', subscriptionError);
					return res.status(500).json({ error: 'Failed to create subscription' });
				}

				break;
			}

			case 'payment_intent.payment_failed': {
				const paymentIntent = event.data.object as Stripe.PaymentIntent;
				const { organizationId } = paymentIntent.metadata;

				// Delete the pending organization and its team member record
				const { error: deleteError } = await supabase
					.from('organizations')
					.delete()
					.eq('id', organizationId);

				if (deleteError) {
					console.error('Error deleting failed organization:', deleteError);
				}

				break;
			}
		}

		res.json({ received: true });
	} catch (err) {
		const error = err as Error;
		console.error('Webhook error:', error);
		return res.status(400).send(`Webhook Error: ${error.message}`);
	}
};

export const createSetupIntent = async (req: Request, res: Response) => {
	try {
		const { customerId }: { customerId?: string } = req.body;

		// Allow creating a SetupIntent without a customer for pre-org trial flows.
		// The resulting PaymentMethod will be unattached and can be attached to a newly created customer during onboarding.
		const setupIntent = await stripe.setupIntents.create({
			customer: customerId || undefined,
			automatic_payment_methods: { enabled: true }
		});

		return res.json({ setupClientSecret: setupIntent.client_secret });
	} catch (error) {
		if (error instanceof HttpError) {
			const err = error as { message: string; statusCode: number };
			console.error(`Error ${err.statusCode}: ${err.message}`);
			return res.status(err.statusCode).json({ error: { message: err.message } });
		}
		console.error('Unexpected error creating setup intent:', error);
		return res.status(500).json({ error: { message: 'Failed to create setup intent' } });
	}
};
