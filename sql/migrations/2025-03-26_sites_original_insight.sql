-- Site-level original insight / information gain — used for article generation when page has no brief IGS (e.g. supporting articles)
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS original_insight text;

COMMENT ON COLUMN public.sites.original_insight IS 'User-provided unique angle for AI articles; editable in site settings; used when brief_data.igs_opportunity is absent';
