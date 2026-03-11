-- Fix audit_results rows that were stored with organization_id = NULL
-- due to a backwards ternary in technicalAuditService.ts (now fixed).
-- This backfills organization_id from the related sites table.

UPDATE public.audit_results ar
SET organization_id = s.organization_id
FROM public.sites s
WHERE ar.site_id = s.id
  AND ar.organization_id IS NULL;
