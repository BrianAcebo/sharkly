-- CRO Studio — backfill site_id on existing cro_audits.
-- Audits with cluster_id: derive site_id from clusters.
-- Standalone audits (no cluster_id): remain site_id = null until user re-adds with site context.

UPDATE public.cro_audits a
SET site_id = c.site_id
FROM public.clusters c
WHERE a.cluster_id = c.id
  AND a.site_id IS NULL;

COMMENT ON COLUMN public.cro_audits.site_id IS 'Site this audit belongs to — filters CRO Studio list by selected site';
