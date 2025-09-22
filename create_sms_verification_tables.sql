-- SMS Verification Tables for Organization Onboarding
-- Run this after the main organization tables are created

-- Add SMS verification columns to organizations table (if not already present)
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS twilio_subaccount_sid text,
ADD COLUMN IF NOT EXISTS messaging_service_sid text,
ADD COLUMN IF NOT EXISTS trusthub_profile_sid text,
ADD COLUMN IF NOT EXISTS a2p_campaign_id text,
ADD COLUMN IF NOT EXISTS a2p_campaign_status text CHECK (a2p_campaign_status IN ('pending', 'approved', 'rejected', null)),
ADD COLUMN IF NOT EXISTS a2p_campaign_reject_reason text,
ADD COLUMN IF NOT EXISTS tollfree_verification_status text CHECK (tollfree_verification_status IN ('pending', 'approved', 'rejected', null)),
ADD COLUMN IF NOT EXISTS tollfree_reject_reason text;

-- SMS Brand Profile (one per organization)
CREATE TABLE IF NOT EXISTS sms_brand_profile (
    org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    legal_name text NOT NULL,
    business_type text NOT NULL CHECK (business_type IN ('llc', 'corporation', 'sole_prop', 'partnership', 'non_profit')),
    ein text NOT NULL,
    website text NOT NULL,
    industry text NOT NULL CHECK (industry IN ('real_estate', 'insurance', 'saas', 'services', 'other')),
    addr_street text NOT NULL,
    addr_city text NOT NULL,
    addr_state text NOT NULL,
    addr_zip text NOT NULL,
    addr_country text NOT NULL,
    contact_name text NOT NULL,
    contact_email text NOT NULL,
    contact_phone text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- SMS Campaign Profile (one per organization for default campaign)
CREATE TABLE IF NOT EXISTS sms_campaign_profile (
    org_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    use_case_description text NOT NULL,
    opt_in_method text NOT NULL CHECK (opt_in_method IN ('web_form', 'paper_form', 'verbal', 'existing_customer', 'keyword', 'other')),
    sample_msg_1 text NOT NULL,
    sample_msg_2 text NOT NULL,
    opt_out_text text NOT NULL,
    help_text text NOT NULL,
    terms_url text NOT NULL,
    privacy_url text NOT NULL,
    est_monthly_messages int NOT NULL,
    countries text[] NOT NULL DEFAULT '{US}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sms_brand_profile_org_id ON sms_brand_profile(org_id);
CREATE INDEX IF NOT EXISTS idx_sms_campaign_profile_org_id ON sms_campaign_profile(org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_twilio_subaccount ON organizations(twilio_subaccount_sid);

-- Add RLS policies
ALTER TABLE sms_brand_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_campaign_profile ENABLE ROW LEVEL SECURITY;

-- RLS policy for sms_brand_profile - only org owners can access
CREATE POLICY "sms_brand_profile_org_owner_access" ON sms_brand_profile
    FOR ALL USING (
        org_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- RLS policy for sms_campaign_profile - only org owners can access
CREATE POLICY "sms_campaign_profile_org_owner_access" ON sms_campaign_profile
    FOR ALL USING (
        org_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );
