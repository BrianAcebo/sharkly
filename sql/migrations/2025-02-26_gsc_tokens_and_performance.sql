-- GSC integration tables for storing Google Search Console tokens and performance data

-- gsc_tokens: Store site's Google Search Console OAuth tokens
-- Each site can connect to one GSC property (1:1 relationship)
-- Note: refresh_token is encrypted server-side via Edge Function before storing
CREATE TABLE IF NOT EXISTS public.gsc_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE UNIQUE,
  gsc_property_url text NOT NULL,
  encrypted_refresh_token text NOT NULL,
  access_token text,
  access_token_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gsc_tokens_site_id ON public.gsc_tokens(site_id);
CREATE INDEX IF NOT EXISTS idx_gsc_tokens_gsc_property_url ON public.gsc_tokens(gsc_property_url);

-- RLS: Users in org can view/modify tokens for their org's sites
ALTER TABLE public.gsc_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view GSC tokens for sites in their organization"
  ON public.gsc_tokens FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert GSC tokens for sites in their organization"
  ON public.gsc_tokens FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update GSC tokens for sites in their organization"
  ON public.gsc_tokens FOR UPDATE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete GSC tokens for sites in their organization"
  ON public.gsc_tokens FOR DELETE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );


-- performance_data: Cache of Google Search Analytics data
-- Dimensions: query, page, date | Metrics: clicks, impressions, CTR, position
CREATE TABLE IF NOT EXISTS public.performance_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  gsc_property_url text NOT NULL,
  date date NOT NULL,
  query text NOT NULL,
  page text NOT NULL,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr numeric(5, 4) DEFAULT 0,
  position numeric(6, 2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_performance_record UNIQUE (site_id, gsc_property_url, date, query, page)
);

CREATE INDEX IF NOT EXISTS idx_performance_data_site_id ON public.performance_data(site_id);
CREATE INDEX IF NOT EXISTS idx_performance_data_gsc_property_url ON public.performance_data(gsc_property_url);
CREATE INDEX IF NOT EXISTS idx_performance_data_date ON public.performance_data(date);
CREATE INDEX IF NOT EXISTS idx_performance_data_page ON public.performance_data(page);
CREATE INDEX IF NOT EXISTS idx_performance_data_query ON public.performance_data(query);
CREATE INDEX IF NOT EXISTS idx_performance_data_site_date ON public.performance_data(site_id, date);

-- RLS: Users can view performance data for sites in their organization
ALTER TABLE public.performance_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view performance data for sites in their organization"
  ON public.performance_data FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can insert performance data"
  ON public.performance_data FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update performance data"
  ON public.performance_data FOR UPDATE
  USING (true);


-- navboost_signals: Derived metrics for CTR-based optimization (Navboost)
-- Aggregated from performance_data with trend calculation
CREATE TABLE IF NOT EXISTS public.navboost_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  gsc_property_url text NOT NULL,
  page text NOT NULL,
  query text NOT NULL,
  current_ctr numeric(5, 4) NOT NULL,
  trend_4week numeric(5, 4),
  last_7days_clicks integer DEFAULT 0,
  last_7days_impressions integer DEFAULT 0,
  is_declining boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_navboost_signal UNIQUE (site_id, gsc_property_url, page, query)
);

CREATE INDEX IF NOT EXISTS idx_navboost_signals_site_id ON public.navboost_signals(site_id);
CREATE INDEX IF NOT EXISTS idx_navboost_signals_page ON public.navboost_signals(page);
CREATE INDEX IF NOT EXISTS idx_navboost_signals_is_declining ON public.navboost_signals(is_declining);

-- RLS: Users can view signals for sites in their organization
ALTER TABLE public.navboost_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view navboost signals for sites in their organization"
  ON public.navboost_signals FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can insert navboost signals"
  ON public.navboost_signals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update navboost signals"
  ON public.navboost_signals FOR UPDATE
  USING (true);
