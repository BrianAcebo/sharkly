-- Phase 1b: Add target_id to topics + backfill existing topics
-- Topics belong to targets; backfill creates "Main Strategy" target per site

ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS target_id uuid REFERENCES public.targets(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_topics_target_id ON public.topics(target_id);

-- Backfill: create default target per site that has topics
INSERT INTO public.targets (site_id, name, destination_page_url, destination_page_label, seed_keywords, sort_order)
SELECT t.site_id, 'Main Strategy', NULL, NULL, ARRAY[]::text[], 0
FROM (SELECT DISTINCT site_id FROM public.topics) t
WHERE NOT EXISTS (
  SELECT 1 FROM public.targets WHERE targets.site_id = t.site_id
);

-- Assign existing topics to their site's default target
UPDATE public.topics t
SET target_id = (
  SELECT id FROM public.targets
  WHERE site_id = t.site_id
  ORDER BY sort_order ASC, created_at ASC
  LIMIT 1
)
WHERE target_id IS NULL;
