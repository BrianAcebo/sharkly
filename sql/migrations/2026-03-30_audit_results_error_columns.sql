-- Ensure audit_results has API error columns (domain_authority_error, cwv_error, indexation_error, api_errors).
-- Idempotent: safe if 2025-03-02_add_api_errors_to_audit.sql already ran.
-- Fixes: "Could not find the 'cwv_error' column of 'audit_results' in the schema cache"

ALTER TABLE public.audit_results
  ADD COLUMN IF NOT EXISTS domain_authority_error TEXT DEFAULT NULL;

ALTER TABLE public.audit_results
  ADD COLUMN IF NOT EXISTS cwv_error TEXT DEFAULT NULL;

ALTER TABLE public.audit_results
  ADD COLUMN IF NOT EXISTS indexation_error TEXT DEFAULT NULL;

ALTER TABLE public.audit_results
  ADD COLUMN IF NOT EXISTS api_errors JSONB DEFAULT '{}'::jsonb;

-- Partial index: must list at least one indexed column before WHERE (PostgreSQL syntax)
CREATE INDEX IF NOT EXISTS idx_audit_results_has_errors ON public.audit_results (id)
  WHERE (api_errors != '{}'::jsonb);
