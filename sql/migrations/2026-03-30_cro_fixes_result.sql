-- CRO Studio — persist AI-generated copy fixes per checklist item (survives refresh).

ALTER TABLE public.cro_audits ADD COLUMN IF NOT EXISTS fixes_result jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.cro_audits.fixes_result IS 'Generated copy fixes: { [item_key]: [ { copy, placement, mechanism? }, ... ] } — e.g. handoff, ctaFit, arch_0, journey step id, bias_*';
