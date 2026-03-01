-- Sharkly: topics and competitors for SEO strategy
-- sites = projects in this schema (site_id used as project_id)

-- Add domain_authority to sites (estimated DA 0-100)
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS domain_authority integer DEFAULT 0;

COMMENT ON COLUMN public.sites.domain_authority IS 'Estimated domain authority 0-100 for SEO strategy';

-- Competitors table (detailed analysis per competitor)
CREATE TABLE IF NOT EXISTS public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  url text NOT NULL,
  domain text,
  estimated_da integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_competitors_site_id ON public.competitors(site_id);

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view competitors for their sites"
  ON public.competitors FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert competitors for their sites"
  ON public.competitors FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

-- Topics table (15-25 per site from Claude strategy)
CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  title text NOT NULL,
  keyword text NOT NULL,
  monthly_searches integer DEFAULT 0,
  keyword_difficulty integer DEFAULT 0,
  cpc decimal DEFAULT 0,
  funnel_stage text DEFAULT 'mofu' CHECK (funnel_stage IN ('tofu', 'mofu', 'bofu')),
  authority_fit text DEFAULT 'queued' CHECK (authority_fit IN ('achievable', 'buildToward', 'locked')),
  priority_score decimal DEFAULT 0,
  ai_reasoning text,
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'active', 'complete', 'locked')),
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_topics_site_id ON public.topics(site_id);

ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view topics for their sites"
  ON public.topics FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert topics for their sites"
  ON public.topics FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update topics for their sites"
  ON public.topics FOR UPDATE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );
