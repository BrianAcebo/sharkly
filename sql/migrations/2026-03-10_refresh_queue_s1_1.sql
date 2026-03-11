-- S1-1. Content Refresh Queue — product-gaps-master.md V1.6
-- Add last_updated_meaningful to pages for staleness detection.
-- When null, the app falls back to updated_at.

ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS last_updated_meaningful timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.pages.last_updated_meaningful IS 'S1-1: When content was last meaningfully updated (user-set or from publish). Null = use updated_at. Used for Content Refresh Queue.';
