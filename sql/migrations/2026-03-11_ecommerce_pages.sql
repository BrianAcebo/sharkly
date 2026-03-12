-- Ecommerce SEO — product and collection pages (L6b).
-- Lightweight SEO layer: keyword assignment, on-page checks, description generation, publish to Shopify.
-- Target connection uses existing targets.destination_page_url; no schema change there.

CREATE TABLE IF NOT EXISTS public.ecommerce_pages (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id               uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organization_id       uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type                  text NOT NULL,        -- 'product' | 'collection'
  name                  text NOT NULL,
  keyword               text,                 -- assigned target keyword
  url                   text,                 -- live page URL for crawl checks
  existing_content      text,                 -- imported or pasted existing description
  content               jsonb,                -- Tiptap JSON (generated output)
  schema_json           text,                 -- generated JSON-LD
  word_count            integer DEFAULT 0,
  meta_title            text,
  meta_description      text,
  seo_checks            jsonb,                -- stored results of the 6 SEO checks
  status                text NOT NULL DEFAULT 'no_content', -- no_content | draft | published
  shopify_product_id    text,
  shopify_collection_id text,
  published_url         text,
  published_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ecommerce_pages_site_id ON public.ecommerce_pages(site_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_pages_organization_id ON public.ecommerce_pages(organization_id);
CREATE INDEX IF NOT EXISTS idx_ecommerce_pages_type ON public.ecommerce_pages(type);
CREATE INDEX IF NOT EXISTS idx_ecommerce_pages_shopify_product ON public.ecommerce_pages(shopify_product_id) WHERE shopify_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ecommerce_pages_shopify_collection ON public.ecommerce_pages(shopify_collection_id) WHERE shopify_collection_id IS NOT NULL;

COMMENT ON TABLE public.ecommerce_pages IS 'Ecommerce SEO: product and collection pages — keyword, description, schema, publish to Shopify';

ALTER TABLE public.ecommerce_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select" ON public.ecommerce_pages FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_insert" ON public.ecommerce_pages FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_update" ON public.ecommerce_pages FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ))
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ));

CREATE POLICY "org_delete" ON public.ecommerce_pages FOR DELETE
  USING (organization_id IN (
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ));
