-- Add project settings fields to sites table
-- competitor_urls: array of competitor URLs for analysis
-- platform: e.g. Shopify, WordPress, Custom
-- niche: e.g. Fashion, Tech
-- customer_description: target customer description for content generation

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS competitor_urls jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS platform text DEFAULT '',
  ADD COLUMN IF NOT EXISTS niche text DEFAULT '',
  ADD COLUMN IF NOT EXISTS customer_description text DEFAULT '';

COMMENT ON COLUMN public.sites.competitor_urls IS 'Array of competitor URLs, e.g. ["https://competitor1.com"]';
COMMENT ON COLUMN public.sites.platform IS 'Platform type: Shopify, WordPress, Custom, etc.';
COMMENT ON COLUMN public.sites.niche IS 'Business niche/industry';
COMMENT ON COLUMN public.sites.customer_description IS 'Target customer description for content generation';
