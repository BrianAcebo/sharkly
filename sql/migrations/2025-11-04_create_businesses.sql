-- Businesses table to support case subjects of type "business"

CREATE TABLE IF NOT EXISTS public.businesses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    ein_tax_id text,
    officers jsonb NOT NULL DEFAULT '[]'::jsonb,          -- array of Person refs or objects
    addresses jsonb NOT NULL DEFAULT '[]'::jsonb,         -- array of Address objects/refs
    registration jsonb NOT NULL DEFAULT '{}'::jsonb,      -- state/SEC data
    domains jsonb NOT NULL DEFAULT '[]'::jsonb,           -- array of Domain refs
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businesses_org ON public.businesses (organization_id);
CREATE INDEX IF NOT EXISTS idx_businesses_name ON public.businesses (name);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS trg_businesses_updated_at ON public.businesses;
    CREATE TRIGGER trg_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;


