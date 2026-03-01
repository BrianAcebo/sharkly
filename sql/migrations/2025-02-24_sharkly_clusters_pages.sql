-- Sharkly: clusters and pages (focus pages + articles)
-- Requires: sites, topics (2025-02-23_sharkly_topics_competitors.sql)

-- Clusters table
CREATE TABLE IF NOT EXISTS public.clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_keyword text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'complete', 'archived')),
  funnel_coverage jsonb DEFAULT '{"tofu":0,"mofu":0,"bofu":0}'::jsonb,
  cro_score integer DEFAULT 0,
  completion_pct integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clusters_site_id ON public.clusters(site_id);
CREATE INDEX IF NOT EXISTS idx_clusters_topic_id ON public.clusters(topic_id);

ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clusters for their sites"
  ON public.clusters FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert clusters for their sites"
  ON public.clusters FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update clusters for their sites"
  ON public.clusters FOR UPDATE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

-- Pages table (focus pages + articles)
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('focus_page', 'article')),
  title text NOT NULL,
  keyword text DEFAULT '',
  monthly_searches integer DEFAULT 0,
  keyword_difficulty integer DEFAULT 0,
  funnel_stage text DEFAULT 'mofu' CHECK (funnel_stage IN ('tofu', 'mofu', 'bofu')),
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'brief_generated', 'draft', 'published')),
  content text,
  word_count integer DEFAULT 0,
  seo_score integer DEFAULT 0,
  meta_title text,
  meta_description text,
  target_word_count integer DEFAULT 1000,
  brief_data jsonb,
  published_url text,
  sort_order integer DEFAULT 0,
  position_x integer DEFAULT 0,
  position_y integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pages_cluster_id ON public.pages(cluster_id);
CREATE INDEX IF NOT EXISTS idx_pages_site_id ON public.pages(site_id);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pages for their sites"
  ON public.pages FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pages for their sites"
  ON public.pages FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update pages for their sites"
  ON public.pages FOR UPDATE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

-- Add cluster_id to topics (links topic to its cluster when started)
ALTER TABLE public.topics ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES public.clusters(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_topics_cluster_id ON public.topics(cluster_id);
