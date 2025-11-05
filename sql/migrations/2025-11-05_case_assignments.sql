-- Ensure cases.assigned_to exists as text[] and default owner assignment
DO $$
BEGIN
  -- Add column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'cases' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE public.cases ADD COLUMN assigned_to text[] DEFAULT ARRAY[]::text[];
  END IF;
END $$;

-- Function: default assigned_to to creator when empty
CREATE OR REPLACE FUNCTION public.case_default_assignee()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.assigned_to IS NULL OR array_length(NEW.assigned_to, 1) IS NULL OR array_length(NEW.assigned_to, 1) = 0 THEN
    IF NEW.created_by IS NOT NULL THEN
      NEW.assigned_to := ARRAY[NEW.created_by]::text[];
    ELSE
      NEW.assigned_to := ARRAY[]::text[];
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger
DROP TRIGGER IF EXISTS trg_case_default_assignee ON public.cases;
CREATE TRIGGER trg_case_default_assignee
BEFORE INSERT ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.case_default_assignee();


