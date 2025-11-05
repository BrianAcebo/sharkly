-- Remove all remaining dependencies on the old subjects registry

-- 1) Drop sync/delete triggers on people/businesses that wrote to public.subjects
DROP TRIGGER IF EXISTS trg_subjects_sync_people    ON public.people;
DROP TRIGGER IF EXISTS trg_subjects_sync_businesses ON public.businesses;
DROP TRIGGER IF EXISTS trg_subjects_delete_person   ON public.people;
DROP TRIGGER IF EXISTS trg_subjects_delete_business ON public.businesses;

-- 2) Drop the associated trigger functions (IF EXISTS handles prior removals)
DROP FUNCTION IF EXISTS public.subjects_sync_people()    CASCADE;
DROP FUNCTION IF EXISTS public.subjects_sync_businesses() CASCADE;
DROP FUNCTION IF EXISTS public.subjects_delete_person()   CASCADE;
DROP FUNCTION IF EXISTS public.subjects_delete_business() CASCADE;

-- 3) Drop any audit trigger that referenced public.subjects (table may already be gone)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='subjects'
  ) THEN
    DROP TRIGGER IF EXISTS trg_audit_subjects ON public.subjects;
  END IF;
END $$;

-- 4) Drop helper view if it was created
DROP VIEW IF EXISTS public.subjects_union;

-- 5) Finally drop the registry table itself if it still exists
DROP TABLE IF EXISTS public.subjects CASCADE;


