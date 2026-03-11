-- Phase 1a: Targets table — organizing layer for content strategy
-- A target = a page you want to rank (service, product, area of business)
-- Topics belong to targets; strategy generation runs per target

CREATE TABLE IF NOT EXISTS public.targets (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id              uuid        NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name                 text        NOT NULL,
  destination_page_url text,
  destination_page_label text,
  seed_keywords        text[]      NOT NULL DEFAULT '{}',
  sort_order           integer     NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_targets_site_id ON public.targets(site_id);

COMMENT ON TABLE public.targets IS 'Content strategy targets — each target has a topic plan that becomes clusters';

ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view targets for their sites"
  ON public.targets FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert targets for their sites"
  ON public.targets FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update targets for their sites"
  ON public.targets FOR UPDATE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete targets for their sites"
  ON public.targets FOR DELETE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );
