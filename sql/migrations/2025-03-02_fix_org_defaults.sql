-- Fix existing organizations that were created without proper billing defaults
-- This ensures all orgs have stripe_status and plan_code set

UPDATE public.organizations
SET 
  stripe_status = COALESCE(stripe_status, 'trialing'),
  plan_code = COALESCE(plan_code, CASE WHEN current_setting('app.environment', true) = 'production' THEN 'starter' ELSE 'starter_test' END),
  plan_price_cents = COALESCE(plan_price_cents, 0),
  included_seats = COALESCE(included_seats, 3),
  updated_at = now()
WHERE 
  stripe_status IS NULL 
  OR plan_code IS NULL
  OR (stripe_status = 'incomplete' AND plan_code IS NULL);

-- Specifically fix organizations with included_credits but no stripe_status
UPDATE public.organizations
SET
  stripe_status = 'trialing',
  plan_code = CASE WHEN current_setting('app.environment', true) = 'production' THEN 'starter' ELSE 'starter_test' END,
  plan_price_cents = 0,
  included_seats = COALESCE(included_seats, 3),
  updated_at = now()
WHERE
  included_credits_monthly > 0
  AND (stripe_status IS NULL OR stripe_status = 'incomplete_expired');

-- Log the updates
SELECT 
  id,
  name,
  plan_code,
  stripe_status,
  included_credits_monthly,
  included_credits_remaining
FROM public.organizations
WHERE plan_code IS NOT NULL AND stripe_status IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
