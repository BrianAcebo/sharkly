-- L3: Destination Page Field on Clusters
-- architecture-b-downstream-product-page.md
--
-- Adds support for clusters where content drives visitors to a product/signup page
-- downstream. architecture='A' = focus page is the money page (default).
-- architecture='B' = informational focus page, product/signup page is destination.

ALTER TABLE public.clusters ADD COLUMN IF NOT EXISTS architecture text DEFAULT 'A';
ALTER TABLE public.clusters ADD COLUMN IF NOT EXISTS destination_page_url text;
ALTER TABLE public.clusters ADD COLUMN IF NOT EXISTS destination_page_label text;

COMMENT ON COLUMN public.clusters.architecture IS 'A = focus page is conversion page; B = destination page is downstream (product/signup)';
COMMENT ON COLUMN public.clusters.destination_page_url IS 'URL of product/signup page when architecture=B';
COMMENT ON COLUMN public.clusters.destination_page_label IS 'Human-readable label for destination page in UI';
