# Billing System Overview

_Last updated: October 2025_

## 1. Architecture Snapshot
- **Wallet-first** billing: every organization owns a `usage_wallets` record that tracks balance, thresholds, and status (`active`, `payment_required`, `suspended`).
- **Top-ups & Auto-recharge**: funds are added through Stripe PaymentIntents (`wallet_topup` or `wallet_auto_recharge`). Optional auto-recharge rules live in `usage_wallet_auto_recharge`.
- **Stripe subscription** still handles plan seats. Usage (voice/SMS) debits the wallet immedately—no invoice roll-ups.
- **Usage pricing** pulls from `usage_overage_catalog` (with `price_cents`, `stripe_price_id`, `env`). This now drives UI calculations and auto-recharge presets.
- **Access gating**: Calls & Chat require an active, funded wallet. Email is free once trial/plan is active.

## 2. Key Data Model
- `usage_wallets`: balance, threshold, top-up amount, status, timestamps.
- `usage_wallet_auto_recharge`: enabled flag, amount/threshold, payment method, FK to wallet (via organization_id).
- `usage_wallet_auto_recharge_events`: audit of auto top-up runs (success/failure).
- `usage_topups`: log of wallet top-up intents (pending/succeeded/failed).
- `usage_overage_catalog`: authoritative voice & SMS per-unit pricing (`voice_minutes_overage`, `sms_overage`, `*_test`). Includes `price_cents` and `stripe_price_id` synced from Stripe.
- `organizations`: stores trial dates, wallet thresholds, top-up defaults, usage wallet status.

### Supabase RPC Helpers
- `wallet_get_or_create`, `wallet_mark_topup_pending`, `wallet_credit`, `wallet_debit`, `wallet_clear_pending`.
- `upsert_usage_wallet_auto_recharge`: enforces thresholds, (re)enables auto top-up.
- `wallet_auto_recharge_result`: logs Stripe webhook outcomes.

## 3. Stripe Workflow
1. **Top-up/Auto-Recharge Intent**
   - `POST /api/billing/wallet/topup/:orgId/intent`
   - `createTopUpPaymentIntent` ensures wallet exists (via `ensureWallet`).
   - `wallet_mark_topup_pending` increments pending balance.
   - PaymentIntent metadata tags `purpose`.
2. **Webhook Handling (`stripeWebhook.ts`)**
   - `payment_intent.succeeded`: credits wallet, clears pending, logs top-up record, triggers auto-recharge results.
   - `payment_intent.payment_failed` / `canceled`: clears pending, records failure, disables auto-recharge after repeated failures.
   - `customer.subscription.*`: updates plan status, seats, trial flags—no invoice usage rollups remain.
   - `charge.dispute` / refund events debit wallet and can suspend.
   - Invoice lifecycle events only set payment flags—no legacy monthly billing writes.

## 4. API Surface (`api/src/routes/billing.ts`)
- `GET /wallet/status?orgId=` → aggregated trial + wallet view.
- `GET /wallet/auto-recharge/:orgId` → current auto-recharge settings.
- `PUT /wallet/auto-recharge/:orgId` → `upsert_usage_wallet_auto_recharge` RPC.
- `POST /wallet/topup/:orgId/intent` → returns `client_secret` if card confirmation is needed (rare—default is off-session using saved payment method).
- `GET /invoices` → Stripe invoice list (subscription receipts only).
- `GET /usage-catalog` → voice/SMS pricing (cents per unit).

All routes require auth via `requireAuth` middleware.

## 5. Frontend Overview
### Shared Hook: `usePaymentStatus`
- Fetches payment status, wallet status, auto-recharge settings in one call.
- Exposes `startTopup`, `saveAutoRecharge`, `refreshWallet`, plus setters for threshold/top-up amount.

### Wallet Deposit Modal (`WalletDepositModal.tsx`)
- Two-step flow: "Add Usage Credit" → optional "Auto-recharge".
- Amount presets ($10/$25/$50/$100) + custom input.
- Purchase power accordion uses `useUsageRates` (fed by `/usage-catalog`).
- All payments are off-session against the default Stripe method. Header CTA links to Billing to manage cards.
- Auto-recharge step offers explicit **Save** vs **Skip** (skip disables auto recharge).
- Usage after deposit auto-opens second step to encourage enabling auto recharge.

### Billing Page (`Billing.tsx`)
- Cards:
  - Wallet status: balance, status pill, auto-recharge summary.
  - Wallet actions: Deposit funds, Manage auto recharge (prefers modal step 2).
  - Trial banner separated from wallet cards.
- Tabs: Overview, Usage Costs (future), Pricing Calculator, Invoices (with pagination).
- Pulls invoices via backend router (restored endpoint).

### Gating Calls & Chat
- `Calls.tsx` / `Chat.tsx` check `walletStatus`. If deposit required or suspended, open WalletDepositModal and block UI with red alert.
- `WebRTCCallProvider` listens to `lastWalletStatus`. It creates the Twilio Device only if wallet has positive balance and is active. Drains wallet triggers disconnect and "Wallet required" state. Auto-refresh on call attempt ensures up-to-date balance.
- Dialer (`ActiveCallBar.tsx`) disables call buttons when wallet not ready and toasts guidance.
- Email page bypasses wallet gating (usage is free).

## 6. Usage Pricing Logic
- `useUsageRates` calls `/api/billing/usage-catalog` and memoizes results.
- Rates drive purchase power slider (voice vs SMS allocation) and future calculators.
- Backfill ensures wallet flows function even if rates missing (fallback zero, UI explains).

## 7. Wallet Auto-Recharge Integrity
- Migration (202510150002) added FK from `usage_wallet_auto_recharge.organization_id` → `usage_wallets.organization_id`, plus `usage_wallet_auto_recharge_events`.
- Auto recharge creation path ensures a wallet exists for any record (backfill for legacy rows).
- Webhook writes to events table for audit / debugging.
- Frontend auto-recharge step reads existing values and resets success banners when modal closes.

## 8. Operational Notes
- Ensure env vars:
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-side RPC access)
  - `VOICE_STATUS_CALLBACK_URL` / `WEBHOOK_PUBLIC_HOST` for Twilio.
- Ngrok or public tunnel required for Stripe/Twilio webhooks in development.
- Use `npm run dev` + `npm run dev:api` (front/back) rather than yarn.
- Call `supabase status` (CLI) to verify DB migrations applied.

## 9. Testing & Monitoring
- Manual deposit via Billing page should:
  1. Create PaymentIntent (check Stripe Dashboard).
  2. Receive webhook → wallet balance increments.
  3. UI refreshes (modal closes, auto-recharge summary updates).
- Auto recharge test: set threshold above current balance, manually debit via voice usage simulation (or run RPC). Check `usage_wallet_auto_recharge_events` for status row.
- Twilio call gating: attempt call with empty wallet → red alert + `Wallet required` status; deposit resets gating.

## 10. Future Enhancements (Backlog)
- Add usage analytics back (powered by wallet transactions).
- Batch webhook retries for auto recharge failures.
- UI messaging around wallet suspension reasons.
- Sync `usage_overage_catalog` pricing automatically from Stripe product catalog (script TBD).

---
This document aims to be the single reference for engineers working on Paperboat's wallet billing. Keep it updated when database schema, API endpoints, or UI flows change.
