-- Google Calendar Integration Schema
-- This file sets up the database structure for Google Calendar integration

-- Drop existing tables if they exist (for idempotency)
DROP TABLE IF EXISTS user_google_tokens CASCADE;
DROP TABLE IF EXISTS enhanced_task_reminders CASCADE;

-- Create table for storing Google OAuth tokens
CREATE TABLE user_google_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at BIGINT NOT NULL, -- Unix timestamp in milliseconds
    scope TEXT, -- OAuth scopes granted
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create table for enhanced task reminders with Google Calendar-style options
CREATE TABLE enhanced_task_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Reminder timing
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_type VARCHAR(20) NOT NULL DEFAULT 'single', -- 'single', 'recurring', 'escalating'
    
    -- Escalating reminders (like Google Calendar)
    escalation_pattern JSONB, -- e.g., [5, 15, 60, 1440] for 5min, 15min, 1hr, 1day
    escalation_enabled BOOLEAN DEFAULT false,
    
    -- Recurring reminders
    recurring_pattern JSONB, -- e.g., {"interval": 1, "unit": "days", "end_after": 10}
    recurring_enabled BOOLEAN DEFAULT false,
    
    -- Google Calendar sync
    google_calendar_event_id TEXT, -- ID of the corresponding Google Calendar event
    sync_enabled BOOLEAN DEFAULT true,
    
    -- Status tracking
    last_sent_at TIMESTAMP WITH TIME ZONE,
    next_send_at TIMESTAMP WITH TIME ZONE NOT NULL,
    times_sent INTEGER DEFAULT 0,
    max_sends INTEGER DEFAULT 1,
    
    -- Metadata
    notification_methods TEXT[] DEFAULT ARRAY['browser', 'email'], -- 'browser', 'email', 'sms', 'push'
    custom_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_google_tokens_user_id ON user_google_tokens(user_id);
CREATE INDEX idx_enhanced_task_reminders_task_id ON enhanced_task_reminders(task_id);
CREATE INDEX idx_enhanced_task_reminders_user_id ON enhanced_task_reminders(user_id);
CREATE INDEX idx_enhanced_task_reminders_next_send ON enhanced_task_reminders(next_send_at);
CREATE INDEX idx_enhanced_task_reminders_google_event ON enhanced_task_reminders(google_calendar_event_id);

-- Enable Row Level Security
ALTER TABLE user_google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhanced_task_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_google_tokens
CREATE POLICY "Users can view their own Google tokens" ON user_google_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Google tokens" ON user_google_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Google tokens" ON user_google_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Google tokens" ON user_google_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for enhanced_task_reminders
CREATE POLICY "Users can view their own task reminders" ON enhanced_task_reminders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task reminders" ON enhanced_task_reminders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task reminders" ON enhanced_task_reminders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task reminders" ON enhanced_task_reminders
    FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_google_tokens_updated_at 
    BEFORE UPDATE ON user_google_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enhanced_task_reminders_updated_at 
    BEFORE UPDATE ON enhanced_task_reminders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get due reminders with enhanced logic
CREATE OR REPLACE FUNCTION get_enhanced_due_reminders()
RETURNS TABLE (
    reminder_id UUID,
    task_id UUID,
    user_id UUID,
    task_title TEXT,
    reminder_time TIMESTAMP WITH TIME ZONE,
    escalation_pattern JSONB,
    recurring_pattern JSONB,
    next_send_at TIMESTAMP WITH TIME ZONE,
    times_sent INTEGER,
    max_sends INTEGER,
    notification_methods TEXT[],
    custom_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        etr.id,
        etr.task_id,
        etr.user_id,
        CAST(t.title AS TEXT) as task_title,
        etr.reminder_time,
        etr.escalation_pattern,
        etr.recurring_pattern,
        etr.next_send_at,
        etr.times_sent,
        etr.max_sends,
        etr.notification_methods,
        etr.custom_message
    FROM enhanced_task_reminders etr
    JOIN tasks t ON etr.task_id = t.id
    WHERE 
        etr.next_send_at <= NOW()
        AND etr.times_sent < etr.max_sends
        AND etr.sync_enabled = true;
END;
$$ LANGUAGE plpgsql;

-- Function to create escalating reminders
CREATE OR REPLACE FUNCTION create_escalating_reminders(
    p_task_id UUID,
    p_user_id UUID,
    p_reminder_time TIMESTAMP WITH TIME ZONE,
    p_escalation_pattern INTEGER[] DEFAULT ARRAY[5, 15, 60, 1440]
)
RETURNS UUID AS $$
DECLARE
    reminder_id UUID;
    pattern_value INTEGER;
BEGIN
    -- Create the main reminder
    INSERT INTO enhanced_task_reminders (
        task_id,
        user_id,
        reminder_time,
        reminder_type,
        escalation_pattern,
        escalation_enabled,
        next_send_at,
        max_sends
    ) VALUES (
        p_task_id,
        p_user_id,
        p_reminder_time,
        'escalating',
        p_escalation_pattern,
        true,
        p_reminder_time - INTERVAL '1 minute' * p_escalation_pattern[1],
        array_length(p_escalation_pattern, 1)
    ) RETURNING id INTO reminder_id;
    
    RETURN reminder_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create recurring reminders
CREATE OR REPLACE FUNCTION create_recurring_reminders(
    p_task_id UUID,
    p_user_id UUID,
    p_reminder_time TIMESTAMP WITH TIME ZONE,
    p_interval INTEGER DEFAULT 1,
    p_unit TEXT DEFAULT 'days',
    p_end_after INTEGER DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
    reminder_id UUID;
    interval_expression TEXT;
BEGIN
    -- Determine the interval expression
    CASE p_unit
        WHEN 'days' THEN interval_expression := p_interval || ' days';
        WHEN 'weeks' THEN interval_expression := p_interval || ' weeks';
        WHEN 'months' THEN interval_expression := p_interval || ' months';
        ELSE interval_expression := p_interval || ' days';
    END CASE;
    
    -- Create the recurring reminder
    INSERT INTO enhanced_task_reminders (
        task_id,
        user_id,
        reminder_time,
        reminder_type,
        recurring_pattern,
        recurring_enabled,
        next_send_at,
        max_sends
    ) VALUES (
        p_task_id,
        p_user_id,
        p_reminder_time,
        'recurring',
        jsonb_build_object(
            'interval', p_interval,
            'unit', p_unit,
            'end_after', p_end_after
        ),
        true,
        p_reminder_time,
        p_end_after
    ) RETURNING id INTO reminder_id;
    
    RETURN reminder_id;
END;
$$ LANGUAGE plpgsql;

-- Function to advance recurring reminders
CREATE OR REPLACE FUNCTION advance_recurring_reminder(p_reminder_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    reminder_record RECORD;
    next_time TIMESTAMP WITH TIME ZONE;
    interval_expression TEXT;
BEGIN
    -- Get the reminder record
    SELECT * INTO reminder_record 
    FROM enhanced_task_reminders 
    WHERE id = p_reminder_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Calculate next time based on recurring pattern
    IF reminder_record.recurring_enabled AND reminder_record.recurring_pattern IS NOT NULL THEN
        interval_expression := (reminder_record.recurring_pattern->>'interval') || ' ' || 
                              (reminder_record.recurring_pattern->>'unit');
        
        next_time := reminder_record.next_send_at + interval_expression::INTERVAL;
        
        -- Update the reminder
        UPDATE enhanced_task_reminders 
        SET 
            next_send_at = next_time,
            times_sent = times_sent + 1,
            updated_at = NOW()
        WHERE id = p_reminder_id;
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing (optional)
-- INSERT INTO user_google_tokens (user_id, access_token, refresh_token, expires_at, scope)
-- VALUES (
--     '00000000-0000-0000-0000-000000000000', -- Replace with actual user ID
--     'sample_access_token',
--     'sample_refresh_token',
--     EXTRACT(EPOCH FROM (NOW() + INTERVAL '1 hour')) * 1000,
--     'https://www.googleapis.com/auth/calendar'
-- );

-- Grant permissions
GRANT ALL ON user_google_tokens TO authenticated;
GRANT ALL ON enhanced_task_reminders TO authenticated;
GRANT EXECUTE ON FUNCTION get_enhanced_due_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION create_escalating_reminders(UUID, UUID, TIMESTAMP WITH TIME ZONE, INTEGER[]) TO authenticated;
GRANT EXECUTE ON FUNCTION create_recurring_reminders(UUID, UUID, TIMESTAMP WITH TIME ZONE, INTEGER, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION advance_recurring_reminder(UUID) TO authenticated;
