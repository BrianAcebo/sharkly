-- Billing and Usage Tracking Tables

-- Table to track Twilio usage costs and pricing
CREATE TABLE IF NOT EXISTS twilio_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type VARCHAR(50) NOT NULL, -- 'sms' or 'voice'
    country_code VARCHAR(10) NOT NULL, -- 'US', 'CA', etc.
    pricing_type VARCHAR(50) NOT NULL, -- 'inbound', 'outbound'
    cost_per_unit DECIMAL(10, 6) NOT NULL, -- Twilio's cost per SMS or per minute
    markup_percentage DECIMAL(5, 2) NOT NULL DEFAULT 20.00, -- Your profit margin (20% default)
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track SMS usage
CREATE TABLE IF NOT EXISTS sms_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sms_message_id UUID REFERENCES sms_messages(id) ON DELETE SET NULL,
    twilio_sid VARCHAR(255),
    phone_number VARCHAR(20) NOT NULL, -- Agent's phone number
    to_number VARCHAR(20) NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'inbound' or 'outbound'
    country_code VARCHAR(10) NOT NULL DEFAULT 'US',
    message_count INTEGER NOT NULL DEFAULT 1, -- For multi-part messages
    twilio_cost DECIMAL(10, 6) NOT NULL, -- Actual Twilio cost
    markup_amount DECIMAL(10, 6) NOT NULL, -- Your profit
    total_cost DECIMAL(10, 6) NOT NULL, -- Total cost to customer
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    usage_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track voice call usage
CREATE TABLE IF NOT EXISTS voice_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    call_history_id UUID REFERENCES call_history(id) ON DELETE SET NULL,
    twilio_call_sid VARCHAR(255),
    phone_number VARCHAR(20) NOT NULL, -- Agent's phone number
    to_number VARCHAR(20) NOT NULL,
    from_number VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'inbound' or 'outbound'
    country_code VARCHAR(10) NOT NULL DEFAULT 'US',
    call_duration_seconds INTEGER NOT NULL DEFAULT 0,
    call_duration_minutes DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    twilio_cost DECIMAL(10, 6) NOT NULL, -- Actual Twilio cost
    markup_amount DECIMAL(10, 6) NOT NULL, -- Your profit
    total_cost DECIMAL(10, 6) NOT NULL, -- Total cost to customer
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    usage_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track monthly billing summaries
CREATE TABLE IF NOT EXISTS monthly_billing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    billing_month DATE NOT NULL, -- First day of the month
    sms_count INTEGER NOT NULL DEFAULT 0,
    sms_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    voice_minutes DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    voice_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'billed', 'paid'
    invoice_number VARCHAR(100),
    due_date DATE,
    paid_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, billing_month)
);

-- Table to store billing settings per organization
CREATE TABLE IF NOT EXISTS billing_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    default_markup_percentage DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- 'monthly', 'weekly', 'daily'
    auto_billing BOOLEAN NOT NULL DEFAULT true,
    billing_email VARCHAR(255),
    payment_method VARCHAR(50), -- 'credit_card', 'bank_transfer', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sms_usage_org_date ON sms_usage(organization_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_sms_usage_agent_date ON sms_usage(agent_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_voice_usage_org_date ON voice_usage(organization_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_voice_usage_agent_date ON voice_usage(agent_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_monthly_billing_org_month ON monthly_billing(organization_id, billing_month);

-- RLS Policies
ALTER TABLE twilio_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_settings ENABLE ROW LEVEL SECURITY;

-- Pricing table - readable by all authenticated users
CREATE POLICY "Pricing is viewable by authenticated users" ON twilio_pricing
    FOR SELECT USING (auth.role() = 'authenticated');

-- Usage tables - users can only see their organization's data
CREATE POLICY "Users can view their organization's SMS usage" ON sms_usage
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their organization's voice usage" ON voice_usage
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their organization's billing" ON monthly_billing
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their organization's billing settings" ON billing_settings
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's billing settings" ON billing_settings
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Insert current Twilio pricing (US rates as of 2024)
INSERT INTO twilio_pricing (service_type, country_code, pricing_type, cost_per_unit, markup_percentage) VALUES
-- SMS Pricing (per message) - Long codes, Toll-free, Short codes
('sms', 'US', 'inbound', 0.0083, 20.00),  -- $0.0083 per inbound SMS
('sms', 'US', 'outbound', 0.0083, 20.00), -- $0.0083 per outbound SMS

-- MMS Pricing (per message)
('mms', 'US', 'inbound', 0.0165, 20.00),  -- $0.0165 per inbound MMS (Long codes/Short codes)
('mms', 'US', 'outbound', 0.0220, 20.00), -- $0.0220 per outbound MMS
('mms_tollfree', 'US', 'inbound', 0.0200, 20.00), -- $0.0200 per inbound MMS (Toll-free)

-- Voice Pricing (per minute) - Local calls
('voice_local', 'US', 'inbound', 0.0085, 20.00),  -- $0.0085 per minute for inbound local calls
('voice_local', 'US', 'outbound', 0.0140, 20.00), -- $0.0140 per minute for outbound local calls

-- Voice Pricing (per minute) - Toll-free calls
('voice_tollfree', 'US', 'inbound', 0.0220, 20.00),  -- $0.0220 per minute for inbound toll-free calls
('voice_tollfree', 'US', 'outbound', 0.0140, 20.00), -- $0.0140 per minute for outbound toll-free calls

-- Voice Pricing (per minute) - SIP Interface
('voice_sip', 'US', 'inbound', 0.0040, 20.00),  -- $0.0040 per minute for inbound SIP calls
('voice_sip', 'US', 'outbound', 0.0040, 20.00), -- $0.0040 per minute for outbound SIP calls

-- Application Connect
('voice_app_connect', 'US', 'inbound', 0.0025, 20.00), -- $0.0025 per minute for inbound app connect
('voice_app_connect', 'US', 'outbound', 0.0000, 20.00); -- Free for outbound app connect

-- Function to calculate billing costs
CREATE OR REPLACE FUNCTION calculate_usage_cost(
    p_service_type VARCHAR(50),
    p_country_code VARCHAR(10),
    p_pricing_type VARCHAR(50),
    p_units DECIMAL(10, 6),
    p_organization_id UUID DEFAULT NULL
) RETURNS TABLE(
    twilio_cost DECIMAL(10, 6),
    markup_amount DECIMAL(10, 6),
    total_cost DECIMAL(10, 6),
    markup_percentage DECIMAL(5, 2)
) AS $$
DECLARE
    v_pricing RECORD;
    v_markup_percentage DECIMAL(5, 2);
BEGIN
    -- Get pricing information
    SELECT cost_per_unit, markup_percentage
    INTO v_pricing
    FROM twilio_pricing
    WHERE service_type = p_service_type
      AND country_code = p_country_code
      AND pricing_type = p_pricing_type
    ORDER BY effective_date DESC
    LIMIT 1;
    
    -- If no pricing found, use default markup
    IF v_pricing IS NULL THEN
        v_pricing.cost_per_unit := 0.01; -- Default cost
        v_pricing.markup_percentage := 20.00; -- Default markup
    END IF;
    
    -- Get organization-specific markup if available
    IF p_organization_id IS NOT NULL THEN
        SELECT default_markup_percentage
        INTO v_markup_percentage
        FROM billing_settings
        WHERE organization_id = p_organization_id;
        
        IF v_markup_percentage IS NOT NULL THEN
            v_pricing.markup_percentage := v_markup_percentage;
        END IF;
    END IF;
    
    -- Calculate costs
    RETURN QUERY SELECT
        (p_units * v_pricing.cost_per_unit) as twilio_cost,
        (p_units * v_pricing.cost_per_unit * v_pricing.markup_percentage / 100) as markup_amount,
        (p_units * v_pricing.cost_per_unit * (1 + v_pricing.markup_percentage / 100)) as total_cost,
        v_pricing.markup_percentage as markup_percentage;
END;
$$ LANGUAGE plpgsql;

-- Function to update monthly billing
CREATE OR REPLACE FUNCTION update_monthly_billing(p_organization_id UUID, p_billing_month DATE)
RETURNS VOID AS $$
DECLARE
    v_sms_count INTEGER;
    v_sms_cost DECIMAL(10, 2);
    v_voice_minutes DECIMAL(8, 2);
    v_voice_cost DECIMAL(10, 2);
    v_total_cost DECIMAL(10, 2);
BEGIN
    -- Calculate SMS usage for the month
    SELECT 
        COALESCE(SUM(message_count), 0),
        COALESCE(SUM(total_cost), 0.00)
    INTO v_sms_count, v_sms_cost
    FROM sms_usage
    WHERE organization_id = p_organization_id
      AND DATE_TRUNC('month', usage_date) = DATE_TRUNC('month', p_billing_month);
    
    -- Calculate voice usage for the month
    SELECT 
        COALESCE(SUM(call_duration_minutes), 0.00),
        COALESCE(SUM(total_cost), 0.00)
    INTO v_voice_minutes, v_voice_cost
    FROM voice_usage
    WHERE organization_id = p_organization_id
      AND DATE_TRUNC('month', usage_date) = DATE_TRUNC('month', p_billing_month);
    
    v_total_cost := v_sms_cost + v_voice_cost;
    
    -- Insert or update monthly billing record
    INSERT INTO monthly_billing (
        organization_id,
        billing_month,
        sms_count,
        sms_cost,
        voice_minutes,
        voice_cost,
        total_cost
    ) VALUES (
        p_organization_id,
        p_billing_month,
        v_sms_count,
        v_sms_cost,
        v_voice_minutes,
        v_voice_cost,
        v_total_cost
    )
    ON CONFLICT (organization_id, billing_month)
    DO UPDATE SET
        sms_count = EXCLUDED.sms_count,
        sms_cost = EXCLUDED.sms_cost,
        voice_minutes = EXCLUDED.voice_minutes,
        voice_cost = EXCLUDED.voice_cost,
        total_cost = EXCLUDED.total_cost,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
