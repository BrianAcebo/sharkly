-- Properties entity + linkage to people

CREATE TABLE IF NOT EXISTS public.properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  address_full text,
  address_components jsonb NOT NULL DEFAULT '{}'::jsonb,
  geo jsonb NOT NULL DEFAULT '{}'::jsonb,
  parcel jsonb NOT NULL DEFAULT '{}'::jsonb,
  legal_description text,
  characteristics jsonb NOT NULL DEFAULT '{}'::jsonb,
  valuation jsonb NOT NULL DEFAULT '{}'::jsonb,
  occupancy jsonb NOT NULL DEFAULT '{}'::jsonb,
  mail_address jsonb NOT NULL DEFAULT '{}'::jsonb,
  owners_current jsonb NOT NULL DEFAULT '[]'::jsonb,
  owners_prior jsonb NOT NULL DEFAULT '[]'::jsonb,
  sale_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  mortgages jsonb NOT NULL DEFAULT '[]'::jsonb,
  liens_judgments jsonb NOT NULL DEFAULT '[]'::jsonb,
  utilities_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  confidence numeric,
  first_seen timestamptz,
  last_seen timestamptz,
  provenance jsonb NOT NULL DEFAULT '[]'::jsonb,
  web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_properties_org ON public.properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_address ON public.properties(address_full);

-- Optional updated_at trigger
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS trg_properties_updated_at ON public.properties;
    CREATE TRIGGER trg_properties_updated_at BEFORE UPDATE ON public.properties
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Relationships are handled via public.entity_edges (see 2025-11-05_move_people_emails_to_references.sql)
-- No dedicated people_properties table required.


