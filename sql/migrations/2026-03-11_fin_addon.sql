-- Fin (AI Assistant) as regular plan feature — not an add-on.
-- Chat messages come from plan_catalog.included_chat_messages per tier.
-- Growth: 200/mo. Scale/Pro: 500/mo. Builder: 0.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS included_chat_messages_monthly integer DEFAULT 0;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS chat_messages_remaining integer DEFAULT 0;
