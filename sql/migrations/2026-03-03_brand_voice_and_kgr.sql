-- Brand voice columns on sites + domain_authority (if not yet added) + kgr_score on topics
-- Run this in your Supabase SQL editor.

-- sites: domain authority (may already exist from onboarding insert — safe with IF NOT EXISTS)
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS domain_authority integer NOT NULL DEFAULT 0;

-- sites: brand voice / content settings
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS tone text,
  ADD COLUMN IF NOT EXISTS include_terms text,
  ADD COLUMN IF NOT EXISTS avoid_terms text;

-- topics: Keyword Golden Ratio score (allintitle_count / monthly_searches)
-- < 0.25 = Quick Win opportunity
ALTER TABLE public.topics
  ADD COLUMN IF NOT EXISTS kgr_score numeric;

-- internal_links: reverse-silo link suggestions generated at cluster creation
-- Spec §17.6 / Reasonable Surfer Model (US8117209B1)
CREATE TABLE IF NOT EXISTS public.internal_links (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id    uuid        NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  from_page_id  uuid        NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  to_page_id    uuid        NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  anchor_text   text        NOT NULL,
  placement_hint text,
  equity_multiplier numeric NOT NULL DEFAULT 1.0,
  priority      integer     NOT NULL DEFAULT 1,
  implemented   boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_links_cluster_id  ON public.internal_links(cluster_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_from_page   ON public.internal_links(from_page_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_to_page     ON public.internal_links(to_page_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_implemented ON public.internal_links(implemented);

-- RLS: users can only see internal links for their own org's clusters
ALTER TABLE public.internal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view internal links for their org"
  ON public.internal_links FOR SELECT
  USING (
    cluster_id IN (
      SELECT c.id FROM public.clusters c
      JOIN public.sites s ON s.id = c.site_id
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert internal links for their org"
  ON public.internal_links FOR INSERT
  WITH CHECK (
    cluster_id IN (
      SELECT c.id FROM public.clusters c
      JOIN public.sites s ON s.id = c.site_id
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update internal links for their org"
  ON public.internal_links FOR UPDATE
  USING (
    cluster_id IN (
      SELECT c.id FROM public.clusters c
      JOIN public.sites s ON s.id = c.site_id
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );
