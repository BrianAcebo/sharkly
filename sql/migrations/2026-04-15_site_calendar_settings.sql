-- Per-site content calendar schedule preferences (cadence, packaging, start date).
-- Used by the Content Calendar "Schedule" tab; one row per site.

CREATE TABLE IF NOT EXISTS public.site_calendar_settings (
  site_id           uuid        PRIMARY KEY REFERENCES public.sites(id) ON DELETE CASCADE,
  cadence           text        NOT NULL DEFAULT 'daily' CHECK (cadence IN ('daily', 'weekly')),
  amount            integer     NOT NULL DEFAULT 1 CHECK (amount >= 1 AND amount <= 50),
  bundle            text        NOT NULL DEFAULT 'article' CHECK (bundle IN ('article', 'cluster')),
  start_date        date        NOT NULL DEFAULT (CURRENT_DATE),
  include_published boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.site_calendar_settings IS 'FullCalendar schedule prefs: articles per day/week, topic order vs one cluster per slot, anchor start date';

ALTER TABLE public.site_calendar_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calendar settings for their sites"
  ON public.site_calendar_settings FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert calendar settings for their sites"
  ON public.site_calendar_settings FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update calendar settings for their sites"
  ON public.site_calendar_settings FOR UPDATE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete calendar settings for their sites"
  ON public.site_calendar_settings FOR DELETE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      JOIN public.user_organizations uo ON uo.organization_id = s.organization_id
      WHERE uo.user_id = auth.uid()
    )
  );
