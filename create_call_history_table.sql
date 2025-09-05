-- Create call_history table for tracking all calls
CREATE TABLE IF NOT EXISTS call_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Call identification
    twilio_call_sid VARCHAR(255) UNIQUE NOT NULL,
    call_direction VARCHAR(10) NOT NULL CHECK (call_direction IN ('inbound', 'outbound')),
    
    -- Phone numbers
    from_number VARCHAR(20) NOT NULL,
    to_number VARCHAR(20) NOT NULL,
    
    -- Agent and organization
    agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Lead association (optional - calls might not be to leads)
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Call details
    call_status VARCHAR(20) NOT NULL DEFAULT 'initiated' CHECK (
        call_status IN (
            'initiated', 'ringing', 'answered', 'completed', 
            'busy', 'no-answer', 'failed', 'canceled'
        )
    ),
    call_duration INTEGER DEFAULT 0, -- Duration in seconds
    call_start_time TIMESTAMP WITH TIME ZONE,
    call_end_time TIMESTAMP WITH TIME ZONE,
    
    -- Call quality and metadata
    call_quality_score DECIMAL(3,2), -- 0.00 to 5.00
    recording_url TEXT,
    recording_duration INTEGER, -- Recording duration in seconds
    
    -- Twilio specific data
    twilio_price DECIMAL(10,4), -- Cost in USD
    twilio_price_unit VARCHAR(3) DEFAULT 'USD',
    
    -- Call notes and tags
    call_notes TEXT,
    call_tags TEXT[], -- Array of tags for categorization
    
    -- Call outcome
    call_outcome VARCHAR(20) CHECK (
        call_outcome IN (
            'successful', 'no-answer', 'busy', 'failed', 
            'voicemail', 'callback-requested', 'not-interested'
        )
    ),
    
    -- Follow-up tracking
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_notes TEXT,
    
    -- System timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_history_agent_id ON call_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_history_organization_id ON call_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_call_history_lead_id ON call_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_history_twilio_sid ON call_history(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_call_history_from_number ON call_history(from_number);
CREATE INDEX IF NOT EXISTS idx_call_history_to_number ON call_history(to_number);
CREATE INDEX IF NOT EXISTS idx_call_history_call_start_time ON call_history(call_start_time);
CREATE INDEX IF NOT EXISTS idx_call_history_call_status ON call_history(call_status);
CREATE INDEX IF NOT EXISTS idx_call_history_call_direction ON call_history(call_direction);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_call_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_call_history_updated_at
    BEFORE UPDATE ON call_history
    FOR EACH ROW
    EXECUTE FUNCTION update_call_history_updated_at();

-- Create a function to calculate call duration automatically
CREATE OR REPLACE FUNCTION calculate_call_duration()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate duration if both start and end times are present
    IF NEW.call_start_time IS NOT NULL AND NEW.call_end_time IS NOT NULL THEN
        NEW.call_duration = EXTRACT(EPOCH FROM (NEW.call_end_time - NEW.call_start_time))::INTEGER;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate call duration
CREATE TRIGGER trigger_calculate_call_duration
    BEFORE INSERT OR UPDATE ON call_history
    FOR EACH ROW
    EXECUTE FUNCTION calculate_call_duration();

-- Add RLS (Row Level Security) policies
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see calls from their organization
CREATE POLICY "Users can view calls from their organization" ON call_history
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert calls for their organization
CREATE POLICY "Users can insert calls for their organization" ON call_history
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update calls from their organization
CREATE POLICY "Users can update calls from their organization" ON call_history
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete calls from their organization (optional - you might want to restrict this)
CREATE POLICY "Users can delete calls from their organization" ON call_history
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Create a view for call statistics (useful for dashboards)
CREATE OR REPLACE VIEW call_statistics AS
SELECT 
    organization_id,
    agent_id,
    DATE(call_start_time) as call_date,
    call_direction,
    call_status,
    call_outcome,
    COUNT(*) as total_calls,
    AVG(call_duration) as avg_duration,
    SUM(call_duration) as total_duration,
    COUNT(CASE WHEN call_status = 'completed' THEN 1 END) as completed_calls,
    COUNT(CASE WHEN call_outcome = 'successful' THEN 1 END) as successful_calls
FROM call_history
WHERE call_start_time IS NOT NULL
GROUP BY organization_id, agent_id, DATE(call_start_time), call_direction, call_status, call_outcome;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON call_history TO authenticated;
GRANT SELECT ON call_statistics TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE call_history IS 'Stores complete call history with Twilio integration';
COMMENT ON COLUMN call_history.twilio_call_sid IS 'Unique Twilio Call SID for webhook integration';
COMMENT ON COLUMN call_history.call_direction IS 'inbound or outbound call direction';
COMMENT ON COLUMN call_history.call_status IS 'Current status of the call from Twilio';
COMMENT ON COLUMN call_history.call_duration IS 'Call duration in seconds, calculated automatically';
COMMENT ON COLUMN call_history.call_quality_score IS 'Call quality rating from 0.00 to 5.00';
COMMENT ON COLUMN call_history.call_outcome IS 'Business outcome of the call';
COMMENT ON COLUMN call_history.follow_up_required IS 'Whether a follow-up call is needed';
