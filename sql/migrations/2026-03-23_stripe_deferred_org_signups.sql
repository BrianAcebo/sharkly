-- Deferred org signup: Stripe customer + subscription exist before organizations row.
-- Row is removed when payment succeeds and the webhook creates the organization.

CREATE TABLE IF NOT EXISTS public.stripe_deferred_org_signups (
	user_id uuid NOT NULL PRIMARY KEY,
	stripe_customer_id text NOT NULL,
	stripe_subscription_id text NOT NULL,
	org_name text NOT NULL,
	plan_code text NOT NULL,
	trial_days integer NOT NULL DEFAULT 0,
	tz text NOT NULL DEFAULT 'America/New_York',
	created_at timestamp with time zone NOT NULL DEFAULT now(),
	updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS stripe_deferred_org_signups_subscription_key
	ON public.stripe_deferred_org_signups (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS stripe_deferred_org_signups_customer_idx
	ON public.stripe_deferred_org_signups (stripe_customer_id);

COMMENT ON TABLE public.stripe_deferred_org_signups IS 'Pre-payment onboarding: Stripe customer+subscription before organizations row exists; cleared when webhook creates org.';
