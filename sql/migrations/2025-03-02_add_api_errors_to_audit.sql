-- Add API errors tracking to audit_results table
-- This stores error messages from failed API calls (Moz, Google PSI, GSC)
-- Allows frontend to display clear error messages instead of fallback estimates

ALTER TABLE public.audit_results
ADD COLUMN IF NOT EXISTS domain_authority_error TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cwv_error TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS indexation_error TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS api_errors JSONB DEFAULT '{}'::jsonb;

-- Index for easy lookup of audits with errors (for monitoring/debugging)
CREATE INDEX IF NOT EXISTS idx_audit_results_has_errors ON public.audit_results
  WHERE (api_errors != '{}'::jsonb);
