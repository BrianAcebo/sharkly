-- Allow site-level videos without a workspace page (Videos hub / standalone projects).
-- Keep at most one draft per page when page_id is set.

DROP INDEX IF EXISTS videos_one_draft_per_page;

CREATE UNIQUE INDEX IF NOT EXISTS videos_one_draft_per_page
  ON public.videos (page_id)
  WHERE status = 'draft' AND page_id IS NOT NULL;

ALTER TABLE public.videos
  ALTER COLUMN page_id DROP NOT NULL;

COMMENT ON COLUMN public.videos.page_id IS
  'Workspace page when created from the article editor; NULL for standalone site videos.';
