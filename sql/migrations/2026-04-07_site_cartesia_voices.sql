-- Blog-to-video Stage 1: per-site Cartesia voice + org-scoped cloned voices

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS cartesia_voice_id text;

COMMENT ON COLUMN public.sites.cartesia_voice_id IS 'Cartesia voice UUID for blog-to-video narration; nullable = use product default';

CREATE TABLE IF NOT EXISTS public.organization_cartesia_voices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cartesia_voice_id text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT organization_cartesia_voices_unique_voice
    UNIQUE (organization_id, cartesia_voice_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_cartesia_voices_org
  ON public.organization_cartesia_voices(organization_id);

ALTER TABLE public.organization_cartesia_voices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org Cartesia voices for their organization"
  ON public.organization_cartesia_voices FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert org Cartesia voices for their organization"
  ON public.organization_cartesia_voices FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update org Cartesia voices for their organization"
  ON public.organization_cartesia_voices FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete org Cartesia voices for their organization"
  ON public.organization_cartesia_voices FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );
