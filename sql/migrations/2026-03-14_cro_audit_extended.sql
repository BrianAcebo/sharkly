-- CRO Studio — extended audit fields (headline_insight, above_fold, objection_coverage, cognitive_load).

ALTER TABLE public.cro_audits ADD COLUMN IF NOT EXISTS headline_insight text;
ALTER TABLE public.cro_audits ADD COLUMN IF NOT EXISTS above_fold jsonb;
ALTER TABLE public.cro_audits ADD COLUMN IF NOT EXISTS objection_coverage jsonb;
ALTER TABLE public.cro_audits ADD COLUMN IF NOT EXISTS cognitive_load jsonb;

COMMENT ON COLUMN public.cro_audits.headline_insight IS 'Single-sentence insight from highest-severity finding (deterministic)';
COMMENT ON COLUMN public.cro_audits.above_fold IS 'Above-fold evaluation: headline_value_prop, trust_signal, cta_present, visual_relevant, score';
COMMENT ON COLUMN public.cro_audits.objection_coverage IS 'Objection coverage: { objections[], addressed, total } per page_subtype';
COMMENT ON COLUMN public.cro_audits.cognitive_load IS 'Cognitive load signals: { level, cta_count_above_fold, competing_headlines, choice_count }';
