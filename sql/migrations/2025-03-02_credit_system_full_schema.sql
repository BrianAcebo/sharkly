-- CRITICAL: Credit System Database Schema and RPC Functions
-- This migration creates all required tables and RPC functions for the credit system
-- It's designed to be idempotent - safe to re-run

-- Drop existing RPC functions if they exist (we'll recreate them)
DROP FUNCTION IF EXISTS public.get_org_credits(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.spend_credits(uuid, integer, text, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.add_wallet_funds(uuid, integer, text) CASCADE;
DROP FUNCTION IF EXISTS public.get_org_credit_usage_month(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.initialize_org_credits() CASCADE;
DROP FUNCTION IF EXISTS public.change_org_tier(uuid, integer, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.reset_monthly_included_credits_for_org(uuid) CASCADE;

-- 1. Main credit balance table
CREATE TABLE IF NOT EXISTS public.org_credit_balance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  included_monthly integer NOT NULL DEFAULT 0,
  included_remaining integer NOT NULL DEFAULT 0,
  wallet_balance_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_credit_balance_org_id ON public.org_credit_balance(organization_id);

ALTER TABLE public.org_credit_balance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view credit balance for their organization" ON public.org_credit_balance;
CREATE POLICY "Users can view credit balance for their organization"
  ON public.org_credit_balance FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can update credit balance" ON public.org_credit_balance;
CREATE POLICY "Service role can update credit balance"
  ON public.org_credit_balance FOR UPDATE
  USING (true);

-- 2. Usage Wallet table (for overflow payments)
CREATE TABLE IF NOT EXISTS public.usage_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'usd',
  balance_cents integer NOT NULL DEFAULT 0,
  threshold_cents integer NOT NULL DEFAULT 200,
  top_up_amount_cents integer NOT NULL DEFAULT 1000,
  pending_top_up_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'payment_required',
  last_top_up_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_wallet_org_id ON public.usage_wallet(organization_id);

ALTER TABLE public.usage_wallet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their organization's wallet" ON public.usage_wallet;
CREATE POLICY "Users can view their organization's wallet"
  ON public.usage_wallet FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can update wallet" ON public.usage_wallet;
CREATE POLICY "Service role can update wallet"
  ON public.usage_wallet FOR UPDATE
  USING (true);

-- 3. Credit transactions table (audit trail)
CREATE TABLE IF NOT EXISTS public.credit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  credits_delta integer NOT NULL,
  from_included boolean NOT NULL DEFAULT true,
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_events_org_id ON public.credit_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_events_created_at ON public.credit_events(created_at);

ALTER TABLE public.credit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view credit events for their organization" ON public.credit_events;
CREATE POLICY "Users can view credit events for their organization"
  ON public.credit_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can insert credit events" ON public.credit_events;
CREATE POLICY "Service role can insert credit events"
  ON public.credit_events FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Get organization credits
CREATE OR REPLACE FUNCTION public.get_org_credits(p_org_id uuid)
RETURNS TABLE (
  org_id uuid,
  included_monthly integer,
  included_remaining integer,
  wallet_balance_cents integer,
  wallet_remaining integer,
  remaining_total integer,
  needs_topup boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ocb.organization_id,
    ocb.included_monthly,
    ocb.included_remaining,
    COALESCE(uw.balance_cents, 0) as wallet_balance_cents,
    COALESCE(uw.balance_cents, 0) / 5 as wallet_remaining,
    (ocb.included_remaining + COALESCE(uw.balance_cents, 0) / 5) as remaining_total,
    (ocb.included_remaining <= 0 AND COALESCE(uw.balance_cents, 0) <= 0) as needs_topup
  FROM public.org_credit_balance ocb
  LEFT JOIN public.usage_wallet uw ON ocb.organization_id = uw.organization_id
  WHERE ocb.organization_id = p_org_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Spend credits (with included > wallet prioritization)
CREATE OR REPLACE FUNCTION public.spend_credits(
  p_org_id uuid,
  p_credits integer,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS TABLE (
  ok boolean,
  reason text,
  from_included integer,
  from_wallet integer,
  wallet_debit_cents integer,
  included_remaining integer,
  wallet_remaining integer
) AS $$
DECLARE
  v_included_remaining integer;
  v_wallet_balance_cents integer;
  v_from_included integer := 0;
  v_from_wallet integer := 0;
  v_wallet_debit_cents integer := 0;
BEGIN
  -- Get current balances
  SELECT ocb.included_remaining, COALESCE(uw.balance_cents, 0)
  INTO v_included_remaining, v_wallet_balance_cents
  FROM public.org_credit_balance ocb
  LEFT JOIN public.usage_wallet uw ON ocb.organization_id = uw.organization_id
  WHERE ocb.organization_id = p_org_id
  FOR UPDATE;

  -- Check if we have enough credits
  IF v_included_remaining + (v_wallet_balance_cents / 5) < p_credits THEN
    RETURN QUERY SELECT false, 'insufficient_credits'::text, 0::integer, 0::integer, 0::integer, v_included_remaining, (v_wallet_balance_cents / 5)::integer;
    RETURN;
  END IF;

  -- Deduct from included first
  IF v_included_remaining >= p_credits THEN
    v_from_included := p_credits;
    UPDATE public.org_credit_balance 
    SET included_remaining = included_remaining - v_from_included,
        updated_at = now()
    WHERE organization_id = p_org_id;
  ELSE
    -- Use all remaining included credits
    v_from_included := v_included_remaining;
    -- Calculate remainder from wallet
    v_from_wallet := p_credits - v_from_included;
    v_wallet_debit_cents := v_from_wallet * 5;

    UPDATE public.org_credit_balance 
    SET included_remaining = 0,
        updated_at = now()
    WHERE organization_id = p_org_id;

    UPDATE public.usage_wallet
    SET balance_cents = balance_cents - v_wallet_debit_cents,
        updated_at = now()
    WHERE organization_id = p_org_id;
  END IF;

  -- Log the transaction
  INSERT INTO public.credit_events (
    organization_id,
    event_type,
    credits_delta,
    from_included,
    reference_type,
    reference_id,
    description
  ) VALUES (
    p_org_id,
    'spend',
    -p_credits,
    (v_from_wallet = 0),
    p_reference_type,
    p_reference_id,
    p_description
  );

  -- Get updated values
  SELECT ocb.included_remaining, COALESCE(uw.balance_cents, 0)
  INTO v_included_remaining, v_wallet_balance_cents
  FROM public.org_credit_balance ocb
  LEFT JOIN public.usage_wallet uw ON ocb.organization_id = uw.organization_id
  WHERE ocb.organization_id = p_org_id;

  RETURN QUERY SELECT 
    true,
    'success'::text,
    v_from_included,
    v_from_wallet,
    v_wallet_debit_cents,
    v_included_remaining,
    (v_wallet_balance_cents / 5)::integer;
END;
$$ LANGUAGE plpgsql;

-- Add wallet funds
CREATE OR REPLACE FUNCTION public.add_wallet_funds(
  p_org_id uuid,
  p_amount_cents integer,
  p_description text DEFAULT 'Wallet top-up'
)
RETURNS TABLE (
  success boolean,
  wallet_id uuid,
  added_cents integer,
  added_dollars numeric,
  added_credits integer,
  new_balance_cents integer,
  new_balance_credits integer
) AS $$
DECLARE
  v_wallet_id uuid;
  v_new_balance integer;
BEGIN
  -- Update or create wallet
  UPDATE public.usage_wallet
  SET balance_cents = balance_cents + p_amount_cents,
      status = 'active',
      last_top_up_at = now(),
      updated_at = now()
  WHERE organization_id = p_org_id
  RETURNING id, balance_cents INTO v_wallet_id, v_new_balance;

  IF NOT FOUND THEN
    INSERT INTO public.usage_wallet (organization_id, balance_cents, status, last_top_up_at)
    VALUES (p_org_id, p_amount_cents, 'active', now())
    RETURNING id, balance_cents INTO v_wallet_id, v_new_balance;
  END IF;

  -- Log transaction
  INSERT INTO public.credit_events (
    organization_id,
    event_type,
    credits_delta,
    from_included,
    description
  ) VALUES (
    p_org_id,
    'wallet_topup',
    p_amount_cents / 5,
    false,
    p_description
  );

  RETURN QUERY SELECT
    true,
    v_wallet_id,
    p_amount_cents,
    (p_amount_cents::numeric / 100),
    p_amount_cents / 5,
    v_new_balance,
    v_new_balance / 5;
END;
$$ LANGUAGE plpgsql;

-- Get monthly usage stats
CREATE OR REPLACE FUNCTION public.get_org_credit_usage_month(p_org_id uuid)
RETURNS TABLE (
  period_start text,
  period_end text,
  total_credits_spent integer,
  from_included_credits integer,
  from_wallet_credits integer,
  wallet_spent_cents integer,
  wallet_spent_dollars numeric,
  event_count integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    date_trunc('month', now())::date::text as period_start,
    (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date::text as period_end,
    COALESCE(SUM(ABS(credits_delta)), 0)::integer as total_credits_spent,
    COALESCE(SUM(CASE WHEN from_included AND credits_delta < 0 THEN ABS(credits_delta) ELSE 0 END), 0)::integer as from_included_credits,
    COALESCE(SUM(CASE WHEN NOT from_included AND credits_delta < 0 THEN ABS(credits_delta) ELSE 0 END), 0)::integer as from_wallet_credits,
    COALESCE(SUM(CASE WHEN NOT from_included AND credits_delta < 0 THEN ABS(credits_delta) * 5 ELSE 0 END), 0)::integer as wallet_spent_cents,
    (COALESCE(SUM(CASE WHEN NOT from_included AND credits_delta < 0 THEN ABS(credits_delta) * 5 ELSE 0 END), 0)::numeric / 100) as wallet_spent_dollars,
    COUNT(*)::integer as event_count
  FROM public.credit_events
  WHERE organization_id = p_org_id
    AND created_at >= date_trunc('month', now())
    AND created_at < date_trunc('month', now()) + interval '1 month';
END;
$$ LANGUAGE plpgsql STABLE;

-- Initialize credit balance for new organization
CREATE OR REPLACE FUNCTION public.initialize_org_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.org_credit_balance (organization_id, included_monthly, included_remaining)
  VALUES (NEW.id, COALESCE(NEW.included_credits_monthly, 0), COALESCE(NEW.included_credits_remaining, 0))
  ON CONFLICT (organization_id) DO NOTHING;

  INSERT INTO public.usage_wallet (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize credits when org is created
DROP TRIGGER IF EXISTS trg_initialize_org_credits ON public.organizations;
CREATE TRIGGER trg_initialize_org_credits
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.initialize_org_credits();

-- Reset monthly included credits
CREATE OR REPLACE FUNCTION public.reset_monthly_included_credits_for_org(p_org_id uuid)
RETURNS boolean AS $$
BEGIN
  UPDATE public.org_credit_balance
  SET included_remaining = included_monthly,
      updated_at = now()
  WHERE organization_id = p_org_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Change organization tier
CREATE OR REPLACE FUNCTION public.change_org_tier(
  p_org_id uuid,
  p_new_monthly_credits integer,
  p_prorate boolean DEFAULT true
)
RETURNS TABLE (
  success boolean,
  message text
) AS $$
DECLARE
  v_old_monthly integer;
  v_old_used integer;
  v_new_remaining integer;
BEGIN
  SELECT included_monthly, (included_monthly - included_remaining)
  INTO v_old_monthly, v_old_used
  FROM public.org_credit_balance
  WHERE organization_id = p_org_id;

  IF v_old_monthly IS NULL THEN
    RETURN QUERY SELECT false, 'Organization not found'::text;
    RETURN;
  END IF;

  IF p_prorate THEN
    v_new_remaining := p_new_monthly_credits - v_old_used;
  ELSE
    v_new_remaining := included_remaining;
  END IF;

  UPDATE public.org_credit_balance
  SET 
    included_monthly = p_new_monthly_credits,
    included_remaining = GREATEST(v_new_remaining, 0),
    updated_at = now()
  WHERE organization_id = p_org_id;

  RETURN QUERY SELECT true, 'Tier changed successfully'::text;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATA INITIALIZATION - Sync existing organizations
-- ============================================================================

-- Sync included_credits from organizations table
INSERT INTO public.org_credit_balance (organization_id, included_monthly, included_remaining)
SELECT 
  id,
  COALESCE(included_credits_monthly, 0),
  COALESCE(included_credits_remaining, 0)
FROM public.organizations
WHERE id NOT IN (SELECT organization_id FROM public.org_credit_balance)
ON CONFLICT (organization_id) DO UPDATE
SET 
  included_monthly = EXCLUDED.included_monthly,
  included_remaining = EXCLUDED.included_remaining,
  updated_at = now();

-- Ensure wallets exist for all organizations
INSERT INTO public.usage_wallet (organization_id)
SELECT id FROM public.organizations
WHERE id NOT IN (SELECT organization_id FROM public.usage_wallet)
ON CONFLICT (organization_id) DO NOTHING;
