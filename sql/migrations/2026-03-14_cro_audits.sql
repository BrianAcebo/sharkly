-- CRO Studio — live page audit records (cro-studio.md).
-- Audits SEO pages (focus + articles) and destination pages.
-- Fetches rendered HTML via URL; no Workspace/Tiptap dependency.

CREATE TABLE IF NOT EXISTS public.cro_audits (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  site_id                 uuid REFERENCES public.sites(id) ON DELETE SET NULL,

  -- Page info
  page_url                text NOT NULL,
  page_type               text NOT NULL CHECK (page_type IN ('seo_page', 'destination_page')),
  page_label              text,

  -- Connections (optional — standalone pages have these as null)
  cluster_id              uuid REFERENCES public.clusters(id) ON DELETE SET NULL,
  target_id               uuid REFERENCES public.targets(id) ON DELETE SET NULL,
  destination_url         text,  -- for seo_page: the destination this page hands off to

  -- Audit results
  cro_score               integer,   -- seo_page: 0-5, destination_page: 0-10
  max_score               integer,
  checklist               jsonb,     -- full audit checklist results
  architecture_violations jsonb,     -- destination_page: trust-before-CTA, CTA-above-fold
  bias_inventory          jsonb,     -- destination_page: 11-bias inventory

  -- Metadata
  audited_at              timestamptz,
  audit_error             boolean NOT NULL DEFAULT false,
  audit_error_message     text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cro_audits_org_updated ON public.cro_audits(organization_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_cro_audits_cluster_id ON public.cro_audits(cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cro_audits_target_id ON public.cro_audits(target_id) WHERE target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cro_audits_site_id ON public.cro_audits(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cro_audits_page_type ON public.cro_audits(organization_id, page_type);

COMMENT ON TABLE public.cro_audits IS 'CRO Studio: live page audit records — SEO pages (5-item checklist) and destination pages (10-step journey)';

ALTER TABLE public.cro_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select" ON public.cro_audits FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_insert" ON public.cro_audits FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_update" ON public.cro_audits FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_delete" ON public.cro_audits FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ));
