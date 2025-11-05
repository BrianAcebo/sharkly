-- Add confidence, first_seen, last_seen to people
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS first_seen timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen timestamptz;

-- Optional: simple check constraint for confidence 0..1
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'people_confidence_range'
  ) THEN
    ALTER TABLE public.people
      ADD CONSTRAINT people_confidence_range CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));
  END IF;
END $$;


