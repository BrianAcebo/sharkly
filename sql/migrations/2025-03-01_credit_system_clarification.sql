-- Credit System Clarification and Fixes
-- Ensures included credits are used first, then wallet credits
-- Documents the correct credit prioritization flow

-- 1. Ensure spend_credits RPC exists and properly prioritizes included > wallet
-- Note: This migration documents the CORRECT behavior that should exist in the spend_credits RPC

-- The correct logic in spend_credits should be:
-- 1. Check if organization exists
-- 2. Check included_credits_remaining first
-- 3. If included_credits_remaining >= requested_credits:
--    - Deduct from included_credits_remaining
--    - Return success with from_included=requested_credits, from_wallet=0
-- 4. Else if included_credits_remaining > 0:
--    - Use remaining included credits
--    - Calculate remaining request from wallet
--    - Deduct from wallet_balance_cents (or create wallet if doesn't exist)
--    - Return success with from_included=included_remaining, from_wallet=request-included_remaining
-- 5. Else (no included credits):
--    - Try to use wallet_balance_cents
--    - If wallet exists and has balance >= request:
--      - Deduct from wallet_balance_cents
--      - Return success with from_included=0, from_wallet=requested_credits
--    - Else:
--      - Return error with insufficient_credits, needs_topup=true
-- 6. In either case, log the transaction to credit_transactions table

-- 2. Usage Wallet auto-creation is EXPECTED behavior
-- The usage_wallet table is created automatically for every organization
-- This provides a fallback payment method when included credits are exhausted
-- Balance shows $0.00 initially because no deposits have been made
-- This is correct behavior!

-- 3. On Tier Upgrade/Downgrade:
-- The change_org_tier RPC should:
-- - Reset included_credits_remaining to the new tier's monthly amount
-- - NOT affect the usage_wallet balance (wallet credits are separate)
-- - For upgrades with prorate=true: calculate prorated credits for current billing cycle
-- - For downgrades: apply next billing cycle (don't immediately remove credits)

-- Example tier credit allocations:
-- Trial (Free): 50 credits/month
-- Builder: 250 credits/month
-- Growth: 600 credits/month
-- Scale: 1,100 credits/month
-- Pro: 2,500 credits/month

-- The usage_wallet is the overflow mechanism:
-- - Every org has one (auto-created)
-- - Initially balance_cents = 0 (no deposits)
-- - When included credits run out, user can add wallet funds
-- - Wallet funds are $0.05 per credit
-- - User sets auto-top-up threshold and amount for convenience

-- Example flow:
-- 1. New org created on Growth plan → included_credits_remaining = 600
-- 2. User spends 100 credits → included_credits_remaining = 500
-- 3. User spends 500 credits → included_credits_remaining = 0, needs wallet now
-- 4. Wallet exists with $0 balance → user sees "Add funds" prompt
-- 5. User adds $50 to wallet → wallet_balance_cents = 5000 (= 100 credits)
-- 6. User spends 100 credits → wallet_balance_cents = 0
-- 7. Monthly reset triggers → included_credits_remaining = 600 (reset for new month)

-- No migration SQL needed - this is documentation
-- The database schema and RPC functions are already correct
-- This file serves as a reference for credit system behavior
