-- Migrate legacy public.subjects to public.people and update FKs/triggers

-- 1) Ensure people table exists (created by earlier migration). Create if missing with minimal shape
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='people'
  ) THEN
    CREATE TABLE public.people (
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
  END IF;
END $$;

-- 2) Copy data from subjects → people (upsert by id), ignoring legacy 'type' column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subjects'
  ) THEN
    INSERT INTO public.people (id, organization_id, name, email, avatar, location, devices, social_profiles, aliases, tags, created_at, updated_at)
    SELECT s.id, s.organization_id, s.name, s.email, s.avatar,
           COALESCE(s.location, '{}'::jsonb),
           COALESCE(s.devices, '[]'::jsonb),
           COALESCE(s.social_profiles, '[]'::jsonb),
           COALESCE(s.aliases, '{}'::text[]),
           COALESCE(s.tags, '{}'::text[]),
           COALESCE(s.created_at, now()),
           COALESCE(s.updated_at, now())
    FROM public.subjects s
    ON CONFLICT (id) DO UPDATE SET
      organization_id = EXCLUDED.organization_id,
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      avatar = EXCLUDED.avatar,
      location = EXCLUDED.location,
      devices = EXCLUDED.devices,
      social_profiles = EXCLUDED.social_profiles,
      aliases = EXCLUDED.aliases,
      tags = EXCLUDED.tags,
      updated_at = EXCLUDED.updated_at;
  END IF;
END $$;

-- 3) Backfill cases.subject_type to 'person' when subject_id present
UPDATE public.cases
   SET subject_type = 'person'
 WHERE subject_id IS NOT NULL
   AND (subject_type IS NULL OR subject_type = '');

-- 4) Re-point FK in case_evidence.subject_id from subjects → people
DO $$
DECLARE
  fk_name text;
BEGIN
  -- find existing FK name if present
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'case_evidence'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'subject_id';

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.case_evidence DROP CONSTRAINT %I', fk_name);
  END IF;

  -- add new FK to people
  ALTER TABLE public.case_evidence
    ADD CONSTRAINT case_evidence_subject_id_fkey
    FOREIGN KEY (subject_id) REFERENCES public.people(id) ON DELETE SET NULL;
END $$;

-- 5) Move audit trigger from subjects → people (if function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_row_change') THEN
    -- drop old trigger if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subjects') THEN
      DROP TRIGGER IF EXISTS trg_audit_subjects ON public.subjects;
    END IF;

    DROP TRIGGER IF EXISTS trg_audit_people ON public.people;
    CREATE TRIGGER trg_audit_people
    AFTER INSERT OR UPDATE OR DELETE ON public.people
    FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
  END IF;
END $$;

-- 6) Optional: keep a readonly legacy copy by renaming subjects → subjects_legacy
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subjects'
  ) THEN
    -- Only rename if not already renamed
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subjects_legacy'
    ) THEN
      ALTER TABLE public.subjects RENAME TO subjects_legacy;
    END IF;
  END IF;
END $$;


