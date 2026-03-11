-- S1-5: AggregateRating + sameAs Schema
-- See docs/product-gaps-master.md V1.4b, V1.4c, docs/PRODUCT-ROADMAP.md S1-5
-- AggregateRating: Google reviews on LocalBusiness schema
-- sameAs: Business profile URLs for entity disambiguation

-- AggregateRating data
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS google_review_count integer DEFAULT NULL;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS google_average_rating numeric(3,1) DEFAULT NULL;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS google_place_id text DEFAULT NULL;

-- sameAs profile URLs (business profiles across the web)
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS gbp_url text DEFAULT NULL;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS facebook_url text DEFAULT NULL;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS linkedin_url text DEFAULT NULL;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS twitter_url text DEFAULT NULL;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS yelp_url text DEFAULT NULL;

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS wikidata_url text DEFAULT NULL;

COMMENT ON COLUMN public.sites.google_review_count IS 'Google review count for AggregateRating schema.';
COMMENT ON COLUMN public.sites.google_average_rating IS 'Google average rating (e.g. 4.8) for AggregateRating schema.';
COMMENT ON COLUMN public.sites.gbp_url IS 'Google Business Profile URL — sameAs for LocalBusiness schema.';
COMMENT ON COLUMN public.sites.facebook_url IS 'Facebook page URL — sameAs.';
COMMENT ON COLUMN public.sites.linkedin_url IS 'LinkedIn company/page URL — sameAs.';
COMMENT ON COLUMN public.sites.twitter_url IS 'Twitter/X profile URL — sameAs.';
COMMENT ON COLUMN public.sites.yelp_url IS 'Yelp business URL — sameAs.';
COMMENT ON COLUMN public.sites.wikidata_url IS 'Wikidata entity URL — sameAs.';
