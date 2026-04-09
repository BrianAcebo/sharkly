-- Blog-to-video records: script drafts and render pipeline outputs, linked to workspace pages.
-- Supports a future site-wide / org-wide "Videos" list (index on site_id + created_at).
-- Replaces storing draft script JSON on pages.

ALTER TABLE public.pages
  DROP COLUMN IF EXISTS video_script_draft;

CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',
    'queued',
    'processing',
    'complete',
    'failed'
  )),
  /** Blog-to-video script JSON (title, estimated_duration_seconds, narration_script, scenes). */
  script_json jsonb,
  /** Display label — often mirrors script title or page title. */
  title text,
  upstream_job_id text,
  output_url text,
  render_options jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Workspace editor: at most one draft row per page (regenerate updates that row).
CREATE UNIQUE INDEX IF NOT EXISTS videos_one_draft_per_page
  ON public.videos (page_id)
  WHERE status = 'draft';

CREATE INDEX IF NOT EXISTS idx_videos_site_created
  ON public.videos (site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_videos_page_id
  ON public.videos (page_id);

COMMENT ON TABLE public.videos IS
  'Blog-to-video jobs attached to a page: drafts, in-flight renders, and completed outputs. Query by site_id for a future Videos hub.';

COMMENT ON COLUMN public.videos.upstream_job_id IS
  'Video-service / worker job id (e.g. RQ) while queued or processing.';

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view videos for their sites"
  ON public.videos FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert videos for their sites"
  ON public.videos FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update videos for their sites"
  ON public.videos FOR UPDATE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  )
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete videos for their sites"
  ON public.videos FOR DELETE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );
