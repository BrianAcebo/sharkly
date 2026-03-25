-- Allow deferred signup row before a subscription exists (customer + SetupIntent first, then subscription with default_payment_method).

ALTER TABLE public.stripe_deferred_org_signups
	ALTER COLUMN stripe_subscription_id DROP NOT NULL;

COMMENT ON COLUMN public.stripe_deferred_org_signups.stripe_subscription_id IS
	'Set when the subscription is created (after payment method is on file). Null while only the Stripe customer exists.';
