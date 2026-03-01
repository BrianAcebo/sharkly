-- V1 Features: Technical SEO, Integrations, Advanced Features

-- technical_issues table for site audits
CREATE TABLE IF NOT EXISTS public.technical_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  issue_type text NOT NULL,
  -- Types: missing_meta | duplicate_title | thin_content | broken_link |
  --        redirect_chain | missing_alt | canonical_issue | schema_error |
  --        weak_h2_passage | missing_igs_elements | anchor_text_imbalance |
  --        stale_content | missing_reverse_silo_link
  severity text NOT NULL DEFAULT 'info',
  -- Levels: critical | warning | info
  affected_url text NOT NULL,
  description text,
  recommendation text,
  resolved boolean DEFAULT false,
  crawl_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technical_issues_site_id ON public.technical_issues(site_id);
CREATE INDEX IF NOT EXISTS idx_technical_issues_severity ON public.technical_issues(severity);
CREATE INDEX IF NOT EXISTS idx_technical_issues_issue_type ON public.technical_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_technical_issues_resolved ON public.technical_issues(resolved);

-- RLS for technical_issues
ALTER TABLE public.technical_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view technical issues for sites in their organization"
  ON public.technical_issues FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can insert technical issues"
  ON public.technical_issues FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update technical issues for sites in their organization"
  ON public.technical_issues FOR UPDATE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

-- integrations table to track external service connections
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  integration_type text NOT NULL,
  -- Types: shopify | wordpress | google_analytics | mailchimp
  status text NOT NULL DEFAULT 'connected',
  -- Statuses: connected | disconnected | error | token_expired
  encrypted_credentials text,
  -- Encrypted OAuth tokens or API keys
  metadata jsonb,
  -- Store integration-specific data (store domain, blog URL, etc.)
  connected_at timestamptz,
  last_synced_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, integration_type)
);

CREATE INDEX IF NOT EXISTS idx_integrations_site_id ON public.integrations(site_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON public.integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON public.integrations(status);

-- RLS for integrations
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view integrations for sites in their organization"
  ON public.integrations FOR SELECT
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert integrations for sites in their organization"
  ON public.integrations FOR INSERT
  WITH CHECK (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update integrations for sites in their organization"
  ON public.integrations FOR UPDATE
  USING (
    site_id IN (
      SELECT s.id FROM public.sites s
      WHERE s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.uid()
      )
    )
  );

-- credit_transactions table (if not already exists)
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  credits_used integer NOT NULL,
  credits_remaining_after integer NOT NULL,
  associated_item_id uuid,
  associated_item_type text,
  -- Types: page | cluster | site | project
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_org_id ON public.credit_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at);

-- RLS for credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view credit transactions for their organization"
  ON public.credit_transactions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert credit transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (true);
