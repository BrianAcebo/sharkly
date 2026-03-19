-- Ecommerce: display_meta, platform, platform_id, variant_count, product_count, platform_status
-- display_meta: read-only JSON from Shopify (image, price, vendor, tags, etc.)
-- platform/platform_id: for write-back to Shopify/WooCommerce
-- platform_status: Shopify status (active/draft/archived) - distinct from content workflow status

ALTER TABLE public.ecommerce_pages
ADD COLUMN IF NOT EXISTS display_meta jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS platform_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS variant_count integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS product_count integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS platform_status text DEFAULT NULL;

COMMENT ON COLUMN public.ecommerce_pages.display_meta IS 'Read-only display metadata from platform: image_url, image_alt, price, currency, vendor, product_type, tags';
COMMENT ON COLUMN public.ecommerce_pages.platform IS 'shopify | woocommerce | manual';
COMMENT ON COLUMN public.ecommerce_pages.platform_id IS 'External GID for write-back (e.g. gid://shopify/Product/123)';
COMMENT ON COLUMN public.ecommerce_pages.variant_count IS 'Product variant count (products only)';
COMMENT ON COLUMN public.ecommerce_pages.product_count IS 'Product count (collections only)';
COMMENT ON COLUMN public.ecommerce_pages.platform_status IS 'Platform publication status: active | draft | archived';
