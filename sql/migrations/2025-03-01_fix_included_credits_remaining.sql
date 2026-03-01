-- IMMEDIATE FIX: Reset included_credits_remaining for organizations where it's at 0 but should be at monthly amount
-- This is a one-time fix for organizations that had the credits not properly initialized after stripe payment

UPDATE public.organizations
SET 
  included_credits_remaining = included_credits_monthly,
  updated_at = now()
WHERE 
  included_credits_remaining = 0 
  AND included_credits_monthly > 0
  AND stripe_subscription_id IS NOT NULL
  AND (stripe_status = 'active' OR stripe_status = 'trialing');

-- This query:
-- 1. Only updates orgs with remaining = 0 but monthly > 0
-- 2. Only updates paid/trialing subscriptions (not free orgs)
-- 3. Sets remaining equal to monthly (full reset)
-- 4. Updates the timestamp for audit trail

-- Affected organizations will now have their credits restored and working
