-- S1-3: EEAT Scored Checklist
-- See docs/product-gaps-master.md V1.1, docs/PRODUCT-ROADMAP.md S1-3
-- eeat_checklist: { evaluated_at, score, max_score, items: { [key]: { status, evidence?, fix } } }

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS eeat_score integer DEFAULT 0;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS eeat_checklist jsonb DEFAULT NULL;

COMMENT ON COLUMN public.sites.eeat_score IS 'EEAT checklist score 0-100, derived from eeat_checklist.';
COMMENT ON COLUMN public.sites.eeat_checklist IS 'EEAT checklist evaluation: evaluated_at, score, max_score, items per EEAT dimension.';

-- Store crawled URLs for EEAT detection (about/contact/privacy page checks)
ALTER TABLE public.crawl_history
  ADD COLUMN IF NOT EXISTS crawled_urls jsonb DEFAULT NULL;

COMMENT ON COLUMN public.crawl_history.crawled_urls IS 'Array of URLs successfully crawled. Used by EEAT detection for about/contact/privacy checks.';
