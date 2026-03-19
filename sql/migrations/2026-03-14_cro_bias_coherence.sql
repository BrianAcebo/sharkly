-- CRO Studio — add page_subtype and bias_coherence to cro_audits.
-- Spec: cro-studio.md — bias coherence analysis, recommended sets by subtype.

ALTER TABLE public.cro_audits
  ADD COLUMN IF NOT EXISTS page_subtype text;

ALTER TABLE public.cro_audits
  ADD COLUMN IF NOT EXISTS bias_coherence jsonb;

COMMENT ON COLUMN public.cro_audits.page_subtype IS 'Destination page subtype: saas_signup | ecommerce_product | service_booking — used for recommended bias set';
COMMENT ON COLUMN public.cro_audits.bias_coherence IS 'Bias coherence analysis: { score, active_count, conflicts, synergies, recommendations, overoptimised }';
