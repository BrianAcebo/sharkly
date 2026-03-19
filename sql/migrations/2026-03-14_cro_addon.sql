-- CRO Studio add-on: $29/month, any plan.
-- Gate CRO Studio navigation and destination page access.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS has_cro_addon boolean DEFAULT false;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS cro_addon_started_at timestamptz;

COMMENT ON COLUMN public.organizations.has_cro_addon IS 'CRO Studio add-on active. When true, user can access CRO Studio and destination page audits. Set via Stripe webhook when cro addon subscription item is active.';
COMMENT ON COLUMN public.organizations.cro_addon_started_at IS 'When the CRO Studio add-on was first activated.';

-- Addon catalog entries for CRO Studio (production and test).
-- Replace stripe_price_id with your actual Stripe price ID before subscribing.
INSERT INTO public.addon_catalog (addon_code, name, unit, price_cents, stripe_price_id, billing_mode, env)
VALUES
  ('cro_studio', 'CRO Studio', 'month', 2900, 'price_cro_studio_replace_me', 'recurring', 'production'),
  ('cro_studio_test', 'CRO Studio (Test)', 'month', 2900, 'price_cro_studio_test_replace_me', 'recurring', 'test')
ON CONFLICT (addon_code) DO UPDATE SET
  name = EXCLUDED.name,
  unit = EXCLUDED.unit,
  price_cents = EXCLUDED.price_cents,
  billing_mode = EXCLUDED.billing_mode,
  env = EXCLUDED.env;
