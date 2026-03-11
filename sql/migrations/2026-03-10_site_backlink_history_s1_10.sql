-- S1-10: Brand Search Signal Tracker — backlink history for ratio calculation
-- Populated when toxic link audit runs (DataForSEO). Used to detect links growing 3x faster than brand searches.
-- See docs/product-gaps-master.md V1.2f, docs/PRODUCT-ROADMAP.md S1-10

CREATE TABLE IF NOT EXISTS public.site_backlink_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  referring_domains integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_site_backlink_history_site_id ON public.site_backlink_history(site_id);
CREATE INDEX IF NOT EXISTS idx_site_backlink_history_recorded_at ON public.site_backlink_history(site_id, recorded_at DESC);

COMMENT ON TABLE public.site_backlink_history IS 'S1-10: Periodic snapshots of referring domains. Populated by toxic link audit. Used for brand search ratio (links vs brand recognition).';

ALTER TABLE public.site_backlink_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view backlink history for their org sites"
  ON public.site_backlink_history FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Service can insert backlink history"
  ON public.site_backlink_history FOR INSERT
  WITH CHECK (true);
