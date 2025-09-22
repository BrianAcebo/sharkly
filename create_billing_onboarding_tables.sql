-- Billing Onboarding Tables
-- This file creates the necessary tables for the billing onboarding system

-- Create plan_catalog table
CREATE TABLE IF NOT EXISTS plan_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    base_price_cents INTEGER NOT NULL,
    included_seats INTEGER NOT NULL,
    included_minutes INTEGER NOT NULL,
    included_sms INTEGER NOT NULL,
    included_emails INTEGER NOT NULL,
    stripe_price_id VARCHAR(255) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add billing fields to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS website VARCHAR(255),
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS ein VARCHAR(50),
ADD COLUMN IF NOT EXISTS address_street VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS address_state VARCHAR(50),
ADD COLUMN IF NOT EXISTS address_zip VARCHAR(20),
ADD COLUMN IF NOT EXISTS address_country VARCHAR(50),
ADD COLUMN IF NOT EXISTS tz VARCHAR(50) DEFAULT 'America/New_York',
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS stripe_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS org_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS plan_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS plan_price_cents INTEGER,
ADD COLUMN IF NOT EXISTS included_seats INTEGER,
ADD COLUMN IF NOT EXISTS included_minutes INTEGER,
ADD COLUMN IF NOT EXISTS included_sms INTEGER,
ADD COLUMN IF NOT EXISTS included_emails INTEGER,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE;

-- Add foreign key constraint for plan_code
ALTER TABLE organizations 
ADD CONSTRAINT fk_organizations_plan_code 
FOREIGN KEY (plan_code) REFERENCES plan_catalog(plan_code);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription_id ON organizations(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_organizations_org_status ON organizations(org_status);
CREATE INDEX IF NOT EXISTS idx_plan_catalog_active ON plan_catalog(active);

-- Enable RLS on plan_catalog
ALTER TABLE plan_catalog ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Plan catalog is viewable by authenticated users" ON plan_catalog
    FOR SELECT USING (auth.role() = 'authenticated' AND active = true);

-- Insert default plans
INSERT INTO plan_catalog (plan_code, name, base_price_cents, included_seats, included_minutes, included_sms, included_emails, stripe_price_id) VALUES
('starter', 'Starter', 11900, 1, 500, 200, 1000, 'price_starter_monthly'),
('growth', 'Growth', 49900, 5, 3000, 1000, 5000, 'price_growth_monthly'),
('scale', 'Scale', 89900, 10, 6000, 2000, 10000, 'price_scale_monthly')
ON CONFLICT (plan_code) DO NOTHING;

-- Update organizations table constraints
ALTER TABLE organizations 
ADD CONSTRAINT chk_org_status CHECK (org_status IN ('pending', 'active', 'paused', 'disabled', 'deleted'));

ALTER TABLE organizations 
ADD CONSTRAINT chk_stripe_status CHECK (stripe_status IN ('trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused') OR stripe_status IS NULL);
