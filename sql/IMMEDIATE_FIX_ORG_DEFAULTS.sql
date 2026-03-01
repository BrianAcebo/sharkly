-- IMMEDIATE FIX for existing organizations
-- Copy and paste this directly into Supabase SQL Editor

-- Fix organizations with included_credits but no stripe_status
UPDATE public.organizations
SET
  stripe_status = 'trialing',
  plan_code = 'starter_test',
  plan_price_cents = 0,
  included_seats = COALESCE(included_seats, 3),
  updated_at = now()
WHERE
  included_credits_monthly > 0
  AND (stripe_status IS NULL OR stripe_status = 'incomplete_expired' OR plan_code IS NULL);

-- Verify the fix
SELECT 
  id,
  name,
  plan_code,
  stripe_status,
  included_credits_monthly,
  included_credits_remaining
FROM public.organizations
WHERE plan_code = 'starter_test'
ORDER BY updated_at DESC;
