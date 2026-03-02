-- Add technical audit fields to sites table
ALTER TABLE public.sites
ADD COLUMN IF NOT EXISTS last_audit_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS audit_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS audit_health_status TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS domain_authority_estimated INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pages_crawled_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS critical_issues_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS crawlability_status TEXT DEFAULT 'unknown';

-- Create audit_results table for detailed audit history
CREATE TABLE IF NOT EXISTS public.audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Crawlability results
  crawlability_is_crawlable BOOLEAN DEFAULT FALSE,
  crawlability_site_reachable BOOLEAN DEFAULT FALSE,
  crawlability_dns_resolvable BOOLEAN DEFAULT FALSE,
  crawlability_ssl_valid BOOLEAN DEFAULT FALSE,
  crawlability_status_code INTEGER DEFAULT 0,
  crawlability_robots_exists BOOLEAN DEFAULT FALSE,
  crawlability_bot_allowed BOOLEAN DEFAULT TRUE,
  crawlability_response_time INTEGER DEFAULT 0,
  crawlability_issues JSONB DEFAULT '[]'::jsonb,
  
  -- Crawl results
  crawl_total_pages INTEGER DEFAULT 0,
  crawl_total_issues INTEGER DEFAULT 0,
  crawl_critical_issues INTEGER DEFAULT 0,
  crawl_warning_issues INTEGER DEFAULT 0,
  crawl_info_issues INTEGER DEFAULT 0,
  crawl_avg_response_time NUMERIC DEFAULT 0,
  crawl_pages_with_ssl INTEGER DEFAULT 0,
  crawl_indexable_pages INTEGER DEFAULT 0,
  crawl_issues_by_type JSONB DEFAULT '{}'::jsonb,
  
  -- Domain Authority
  domain_authority_estimated INTEGER DEFAULT 0,
  domain_authority_method TEXT DEFAULT 'unknown',
  domain_authority_confidence TEXT DEFAULT 'low',
  
  -- Core Web Vitals
  cwv_lcp_estimate INTEGER DEFAULT 0,
  cwv_cls_estimate NUMERIC DEFAULT 0,
  cwv_inp_estimate INTEGER DEFAULT 0,
  cwv_status TEXT DEFAULT 'unknown',
  
  -- Indexation
  indexation_pages_indexed INTEGER DEFAULT NULL,
  indexation_total_pages INTEGER DEFAULT 0,
  indexation_crawl_budget TEXT DEFAULT 'unknown',
  indexation_gsc_connected BOOLEAN DEFAULT FALSE,
  
  -- Overall results
  overall_score INTEGER DEFAULT 0,
  health_status TEXT DEFAULT 'unknown',
  recommendations TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_audit_results_site_id ON public.audit_results(site_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_organization_id ON public.audit_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_created_at ON public.audit_results(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_results ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can see audits for their organization's sites
CREATE POLICY audit_results_org_access ON public.audit_results
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

GRANT ALL ON public.audit_results TO authenticated;
