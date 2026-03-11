-- S1-6: YMYL Niche Detection
-- See docs/product-gaps-master.md V1.4d, docs/PRODUCT-ROADMAP.md S1-6
-- Detected from niche (law, medical, financial, health, etc.). Stricter EEAT + prompt constraints.

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS is_ymyl boolean DEFAULT false;

COMMENT ON COLUMN public.sites.is_ymyl IS 'True when niche matches YMYL (law, medical, financial, health). Stricter EEAT and citation requirements.';

-- Backfill: set is_ymyl from current niche for existing sites
UPDATE public.sites
SET is_ymyl = true
WHERE is_ymyl = false
  AND (
    lower(coalesce(niche, '') || ' ' || coalesce(name, '') || ' ' || coalesce(description, ''))
    ~ 'law|legal|lawyer|attorney|solicitor|medical|health|doctor|physician|dentist|nurse|financial|finance|investment|insurance|mortgage|mental health|therapy|psychology|psychiatric|counselling|counseling|pharmacy|medication|drugs|supplements'
  );
