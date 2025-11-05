-- Create people table and add polymorphic subject_type to cases
-- Safe to run multiple times (IF NOT EXISTS guards)

-- people
CREATE TABLE IF NOT EXISTS public.people (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    avatar text,
    location jsonb NOT NULL DEFAULT '{}'::jsonb,
    devices jsonb NOT NULL DEFAULT '[]'::jsonb,
    social_profiles jsonb NOT NULL DEFAULT '[]'::jsonb,
    aliases text[] NOT NULL DEFAULT '{}'::text[],
    tags text[] NOT NULL DEFAULT '{}'::text[],
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_people_org ON public.people (organization_id);
CREATE INDEX IF NOT EXISTS idx_people_name ON public.people (name);

-- updated_at trigger (optional if function exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS trg_people_updated_at ON public.people;
    CREATE TRIGGER trg_people_updated_at
    BEFORE UPDATE ON public.people
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- cases.subject_type (person|business) for polymorphic linkage
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS subject_type text;

-- backfill: default existing to 'person' when subject_id is present and subject_type is null
UPDATE public.cases
   SET subject_type = COALESCE(subject_type, CASE WHEN subject_id IS NOT NULL THEN 'person' ELSE NULL END)
 WHERE subject_type IS NULL;


