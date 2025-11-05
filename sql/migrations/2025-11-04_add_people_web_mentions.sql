-- Add web_mentions column to people for saving SERP results
ALTER TABLE public.people
  ADD COLUMN IF NOT EXISTS web_mentions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Optional: GIN index for searching within mentions later
CREATE INDEX IF NOT EXISTS idx_people_web_mentions_gin ON public.people USING GIN (web_mentions);


