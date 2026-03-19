-- CRO Studio — persist AI-generated cognitive load explanation and emotional arc (1 and 3 credits respectively).

ALTER TABLE public.cro_audits ADD COLUMN IF NOT EXISTS cognitive_load_explanation text;
ALTER TABLE public.cro_audits ADD COLUMN IF NOT EXISTS emotional_arc_result text;

COMMENT ON COLUMN public.cro_audits.cognitive_load_explanation IS 'AI-generated plain-English explanation of cognitive load (1 credit, on-demand)';
COMMENT ON COLUMN public.cro_audits.emotional_arc_result IS 'AI-generated emotional arc deep analysis (3 credits, on-demand)';
