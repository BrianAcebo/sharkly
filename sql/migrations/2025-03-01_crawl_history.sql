-- Crawl History Tracking
-- Stores metadata about each crawl run for progress tracking and auditing

CREATE TABLE IF NOT EXISTS public.crawl_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Crawl metadata
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer,
  
  -- Results summary
  pages_scanned integer NOT NULL DEFAULT 0,
  total_issues integer NOT NULL DEFAULT 0,
  critical_issues integer NOT NULL DEFAULT 0,
  warning_issues integer NOT NULL DEFAULT 0,
  info_issues integer NOT NULL DEFAULT 0,
  
  -- Performance metrics
  avg_response_time_ms integer,
  slowest_page_url text,
  largest_page_url text,
  largest_page_size_bytes integer,
  
  -- Status
  status text NOT NULL DEFAULT 'running',
  -- Statuses: running | completed | failed | cancelled
  error_message text,
  
  -- Indexing
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crawl_history_site_id ON public.crawl_history(site_id);
CREATE INDEX IF NOT EXISTS idx_crawl_history_user_id ON public.crawl_history(user_id);
CREATE INDEX IF NOT EXISTS idx_crawl_history_start_time ON public.crawl_history(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_history_status ON public.crawl_history(status);

-- RLS for crawl_history
ALTER TABLE public.crawl_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view crawl history for sites in their organization"
  ON public.crawl_history FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert crawl history for sites in their organization"
  ON public.crawl_history FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can update crawl history"
  ON public.crawl_history FOR UPDATE
  USING (true);
