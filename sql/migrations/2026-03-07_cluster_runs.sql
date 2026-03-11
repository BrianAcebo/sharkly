-- Persists every cluster regeneration run so users can go back and pick
-- articles from any previous run, exactly like strategy_runs works for topics.

CREATE TABLE IF NOT EXISTS public.cluster_runs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id      uuid        NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Full article candidate list returned by the research + AI pipeline.
  -- Each element: { keyword, monthly_searches, keyword_difficulty, cpc,
  --                 funnel_stage, page_type, source }
  suggestions     jsonb       NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cluster_runs_cluster_id  ON public.cluster_runs(cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_runs_org_id      ON public.cluster_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_cluster_runs_created_at  ON public.cluster_runs(cluster_id, created_at DESC);

ALTER TABLE public.cluster_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's cluster runs"
  ON public.cluster_runs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cluster runs for their organization"
  ON public.cluster_runs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization's cluster runs"
  ON public.cluster_runs FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );
