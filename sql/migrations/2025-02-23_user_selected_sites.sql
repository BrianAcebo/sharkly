-- User selected site per organization (persists across sessions)
-- Requires: sites table (2025-02-23_create_sites.sql)
CREATE TABLE IF NOT EXISTS public.user_selected_sites (
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  selected_site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_selected_sites_user_org
  ON public.user_selected_sites(user_id, organization_id);

ALTER TABLE public.user_selected_sites ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own selection
CREATE POLICY "Users can view own selected site"
  ON public.user_selected_sites FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own selected site"
  ON public.user_selected_sites FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own selected site"
  ON public.user_selected_sites FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
