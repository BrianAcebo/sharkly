-- Persist primary keyword search intent at target create/update (DataForSEO Labs).
-- Avoids calling search_intent on every strategy page load.

ALTER TABLE public.targets
  ADD COLUMN IF NOT EXISTS primary_search_intent text,
  ADD COLUMN IF NOT EXISTS search_intent_probability double precision,
  ADD COLUMN IF NOT EXISTS search_intent_source text,
  ADD COLUMN IF NOT EXISTS search_intent_phrase text;

COMMENT ON COLUMN public.targets.primary_search_intent IS 'informational | commercial | transactional | navigational (merged with destination hints)';
COMMENT ON COLUMN public.targets.search_intent_probability IS 'DataForSEO confidence 0–1 when source is dataforseo';
COMMENT ON COLUMN public.targets.search_intent_source IS 'dataforseo | fallback';
COMMENT ON COLUMN public.targets.search_intent_phrase IS 'Keyword phrase used for intent (first seed or target name)';
