-- Adds messaging service tracking and phone number table for per-organization provisioning

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS twilio_messaging_service_sid text;

CREATE TABLE IF NOT EXISTS public.phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  seat_id uuid REFERENCES public.seats(id) ON DELETE SET NULL,
  sid text NOT NULL,
  phone_number text NOT NULL,
  capabilities jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'available',
  voice_webhook_url text,
  sms_webhook_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_org_id ON public.phone_numbers(org_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_seat_id ON public.phone_numbers(seat_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_status ON public.phone_numbers(status);


