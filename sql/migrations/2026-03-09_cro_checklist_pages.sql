-- System 1 CRO Layer: Add cro_checklist and cro_score to pages table.
-- See docs/system-1-cro-layer.md
--
-- cro_checklist: JSONB holding evaluated 8-item checklist result
-- Structure: { evaluated_at, page_type, score, max_score, items: { "1": {status, evidence}, ... } }
--
-- cro_score: Integer 0-100, derived from cro_checklist. Used by cluster health bar.
-- Formula: Math.round((score / max_score) * 100)
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS cro_checklist jsonb DEFAULT NULL;

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS cro_score integer DEFAULT 0;
