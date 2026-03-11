-- Shopify companion app — store connection per site.
-- OAuth stores shop domain + access token. Used for Admin API (blogs, articles, publish).

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS shopify_domain text,
  ADD COLUMN IF NOT EXISTS shopify_access_token text;

COMMENT ON COLUMN public.sites.shopify_domain IS 'Shopify store domain (e.g. store.myshopify.com) when connected via OAuth';
COMMENT ON COLUMN public.sites.shopify_access_token IS 'Shopify Admin API access token. Store encrypted in production.';

CREATE INDEX IF NOT EXISTS idx_sites_shopify_domain ON public.sites(shopify_domain) WHERE shopify_domain IS NOT NULL;
