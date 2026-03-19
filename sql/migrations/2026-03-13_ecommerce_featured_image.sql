-- Add featured_image_url to ecommerce_pages for product/collection thumbnails
ALTER TABLE public.ecommerce_pages
ADD COLUMN IF NOT EXISTS featured_image_url text;

COMMENT ON COLUMN public.ecommerce_pages.featured_image_url IS 'Featured image URL from Shopify (product featuredImage or collection image)';
