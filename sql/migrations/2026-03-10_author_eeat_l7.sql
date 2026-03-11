-- L7. Author / EEAT — default at site level, override per page
-- Roadmap: "Default author bio at project level (sites), per-brief override at generation time"

-- sites: default author bio for all content
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS author_bio text;

COMMENT ON COLUMN public.sites.author_bio IS 'Default author/EEAT credentials for content. Can be overridden per page.';

-- pages: per-article author override (for multi-author sites)
ALTER TABLE public.pages
  ADD COLUMN IF NOT EXISTS author_bio_override text;

COMMENT ON COLUMN public.pages.author_bio_override IS 'Author bio override for this page only. Falls back to site.author_bio when null.';
