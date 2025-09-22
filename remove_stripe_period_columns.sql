-- Remove current_period_start and current_period_end columns from organizations table
-- These properties don't exist in Stripe Basil API subscription objects

-- Remove current_period_start column
ALTER TABLE public.organizations 
DROP COLUMN IF EXISTS current_period_start;

-- Remove current_period_end column  
ALTER TABLE public.organizations 
DROP COLUMN IF EXISTS current_period_end;

-- Add comment to document the change
COMMENT ON TABLE public.organizations IS 'Organizations table - current_period_start and current_period_end removed as they do not exist in Stripe Basil API subscription objects';
