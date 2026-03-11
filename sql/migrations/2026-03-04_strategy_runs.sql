-- Saves every strategy generation run so users can always go back and
-- recover topics from any previous run, even if they dismissed the modal.

CREATE TABLE IF NOT EXISTS public.strategy_runs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id             uuid        NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  seeds_used          text[]      NOT NULL DEFAULT '{}',
  suggestions         jsonb       NOT NULL DEFAULT '[]',
  strategy_rationale  text,
  research_context    jsonb,
  traffic_tier        text,
  credits_used        integer     NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategy_runs_site_id      ON public.strategy_runs(site_id);
CREATE INDEX IF NOT EXISTS idx_strategy_runs_org_id       ON public.strategy_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_strategy_runs_created_at   ON public.strategy_runs(site_id, created_at DESC);

ALTER TABLE public.strategy_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's strategy runs"
  ON public.strategy_runs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert strategy runs for their organization"
  ON public.strategy_runs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization's strategy runs"
  ON public.strategy_runs FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
    )
  );
