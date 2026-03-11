-- S1-7: Toxic Link Detection + Disavow
-- See docs/product-gaps-master.md V2.3, docs/PRODUCT-ROADMAP.md S1-7
-- Stores last audit result for display. Run audit costs 15 credits.

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS toxic_links_audit jsonb DEFAULT NULL;

COMMENT ON COLUMN public.sites.toxic_links_audit IS 'Last toxic link audit: { evaluated_at, total_domains, toxic_count, toxic_domains: [{ domain, reason, rank?, spam_score? }], disavow_preview }';
