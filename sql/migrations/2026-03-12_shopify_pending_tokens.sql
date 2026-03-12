-- Pending Shopify OAuth tokens for companion app install flow.
-- Token is stored after OAuth exchange, keyed by shop domain. React page at /auth/shopify consumes it.
-- 15 min TTL; rows are deleted after consumption or expiry.

CREATE TABLE IF NOT EXISTS public.shopify_pending_tokens (
  shop_domain text PRIMARY KEY,
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL
);

COMMENT ON TABLE public.shopify_pending_tokens IS 'Temporary tokens from Shopify OAuth (companion app install). 15 min TTL. Consumed by /auth/shopify page.';
COMMENT ON COLUMN public.shopify_pending_tokens.shop_domain IS 'Normalized Shopify store domain (e.g. store.myshopify.com)';
COMMENT ON COLUMN public.shopify_pending_tokens.access_token IS 'Access token from OAuth exchange';
COMMENT ON COLUMN public.shopify_pending_tokens.expires_at IS 'Token expires after 15 minutes';
