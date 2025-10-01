## Billing (Voice) – Current Implementation and Next Steps

This document captures the billing logic now in code so we can extend it to SMS and Email.

### What changed (high‑level)
- Removed per‑call cost accounting and Twilio pricing dependencies.
- Store only usage facts in DB; compute cost at invoice time using Stripe.
- Stopped sending Meter Events per call; now post a single period rollup on `invoice.upcoming`.
- Prevent double billing between trial and non‑trial subscriptions.
- Cancellation webhook clears current‑period usage to immediately reset analytics.
- Pricing Calculator works client‑side using Stripe Voice price and org’s included minutes.

### Data we store
Table: `voice_usage`
- Columns used: `organization_id, agent_id, call_history_id, twilio_call_sid, phone_number, to_number, from_number, direction, country_code, call_duration_seconds, call_duration_minutes`
- Minutes are ceil’d per call (aligns with billing).

We no longer store `total_cost`, `twilio_cost`, `markup_amount`, `currency` in this table.

### Collection points
1) Call status webhook `api/src/routes/twilio/callStatus.ts`
   - On `completed`, insert usage row with seconds and ceil minutes.
   - No per‑call Meter Events.

2) REST intake `POST /api/billing/voice-usage`
   - Validates payload and inserts the same minimal usage fields.
   - No Meter Events; rollup happens on webhook.

### Invoice‑time rollup (source of truth)
Handler: `invoice.upcoming` in `api/src/controllers/stripeWebhook.ts`
- Period window: month start → now (UTC) for now.
- Aggregate total billed minutes = `SUM(voice_usage.call_duration_minutes)` for the org within the window.
- Included minutes: `organizations.included_minutes`.
- Overage minutes: `max(0, ceil(total_minutes − included_minutes))`.
- If overage > 0, post ONE Meter Event to Stripe Billing:
  - `event_name: 'aggregate_by_sum'`
  - `payload: { value: String(overageMinutes), stripe_customer_id }`

Double‑billing guard (trial vs main):
- If the upcoming invoice’s subscription is trialing and not the usage‑only subscription (`metadata.usage_only='voice'`), skip posting.
- During trial, the usage‑only subscription receives the event.
- After trial ends, main subscription receives events and any active usage‑only subscription is canceled elsewhere in the webhook flow.

### Trial handling
- On onboarding with trial, create a separate usage‑only subscription (no trial) carrying the metered overage price.
- After trial ends, webhook ensures the main subscription has the overage price; cancels the usage‑only subscription.

### Cancellation hygiene
Handler: `customer.subscription.deleted` in `stripeWebhook.ts`
- Deletes current‑month rows from `voice_usage`, `sms_usage`, and `call_history`.
- Upserts `monthly_billing` to zeros for the month.
- Attempts to void any draft invoices for the customer.

### Analytics/UI
- Voice analytics seconds and minutes read from `voice_usage` only.
- Cost in analytics is derived from the Stripe Voice overage price (not stored in DB).
- Pricing Calculator (`src/components/billing/PricingCalculator.tsx`):
  - Removes phone input and Twilio pricing table.
  - Fetches Stripe Voice unit price once (`/api/billing/voice-price`).
  - Computes: `billable = ceil(inputMinutes) − included_minutes`; `estimated = billable × unitPrice`.
  - Displays breakdown of entered, included, billable, rate, and total.

### Stripe prerequisites (test and live)
- A Meter with name `aggregate_by_sum`, active.
- A Voice Minutes Overage price linked to that Meter (env‑specific code: `voice_minutes_overage(_test)`).
- For trial flows, a usage‑only subscription created with metadata `{ usage_only: 'voice' }`.

### Endpoints & key files
- Usage intake: `POST /api/billing/voice-usage` → inserts minimal `voice_usage` record.
- Voice analytics: `GET /api/billing/voice-analytics/:organizationId` → sums from `voice_usage`, cost via Stripe price.
- Voice price (for UI): `GET /api/billing/voice-price`.
- Webhooks: `api/src/controllers/stripeWebhook.ts`
  - `invoice.upcoming` rollup and post
  - cancellation reset

### Extending to SMS and Email (plan)
Reuse the same pattern:
1) Capture usage facts per event (no costs):
   - SMS: messages (ceil per segment if needed) → `sms_usage` or generic `usage_events`.
   - Email: messages → consider `usage_events` with `category='email'`.
2) Rollup on `invoice.upcoming`:
   - Aggregate period totals per category.
   - Subtract included units: `organizations.included_sms` / `included_emails`.
   - Post one Meter Event per category with the overage only.
3) UI/Analytics:
   - Show entered vs included vs billable for SMS/Email as done for Voice.
4) Pricing Calculator:
   - Fetch Stripe SMS/Email unit prices (expose endpoints similar to `voice-price`).
   - Client‑side math mirrors Voice.

### Notes / technical debt
- Period window is month‑based; Stripe anchor windows can differ. Next iteration: compute by subscription anchor.
- `usage_events` and `usage_period_rollups` tables exist; Voice still reads from `voice_usage`. We can migrate to generic events for all categories.
- Add idempotency on rollup push if we move to async jobs.

### Test checklist
- Trial org: calls during trial appear only on usage‑only invoice.
- Post‑trial org: calls appear only on main invoice.
- Cancel org: analytics reset instantly; no draft invoice remains.
- Calculator: breakdown uses included minutes and Stripe price; no API 401s.


