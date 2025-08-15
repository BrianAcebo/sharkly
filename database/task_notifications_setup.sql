-- Task Notifications System Setup
-- Run this SQL in your Supabase SQL editor

-- 1. Create task_reminders table for storing reminder settings
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_type TEXT DEFAULT 'browser' CHECK (reminder_type IN ('browser', 'email', 'push')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create notifications table for storing notification history
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'task_reminder' CHECK (type IN ('task_reminder', 'task_assigned', 'task_completed', 'general')),
    metadata JSONB DEFAULT '{}',
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create user_notification_settings table for user preferences
CREATE TABLE IF NOT EXISTS user_notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    browser_notifications BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    reminder_advance_minutes INTEGER DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_status ON task_reminders(status);
CREATE INDEX IF NOT EXISTS idx_task_reminders_reminder_time ON task_reminders(reminder_time);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_user_notification_settings_user_org ON user_notification_settings(user_id, organization_id);

-- 5. Create RLS policies for security
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Task reminders policy - users can only see reminders for tasks they own
CREATE POLICY "Users can view task reminders for their tasks" ON task_reminders
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert task reminders for their tasks" ON task_reminders
    FOR INSERT WITH CHECK (
        task_id IN (
            SELECT id FROM tasks 
            WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update task reminders for their tasks" ON task_reminders
    FOR UPDATE USING (
        task_id IN (
            SELECT id FROM tasks 
            WHERE owner_id = auth.uid()
        )
    );

-- Notifications policy - users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert notifications for themselves" ON notifications
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid());

-- User notification settings policy - users can only manage their own settings
CREATE POLICY "Users can view their own notification settings" ON user_notification_settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own notification settings" ON user_notification_settings
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own notification settings" ON user_notification_settings
    FOR UPDATE USING (user_id = auth.uid());

-- 6. Create functions for automatic operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Create triggers for updated_at (drop if exists first)
DROP TRIGGER IF EXISTS update_task_reminders_updated_at ON task_reminders;
CREATE TRIGGER update_task_reminders_updated_at BEFORE UPDATE ON task_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notification_settings_updated_at ON user_notification_settings;
CREATE TRIGGER update_user_notification_settings_updated_at BEFORE UPDATE ON user_notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Insert default notification settings for existing users
INSERT INTO user_notification_settings (user_id, organization_id, browser_notifications, email_notifications, push_notifications, reminder_advance_minutes)
SELECT 
    u.id as user_id,
    u.organization_id,
    true as browser_notifications,
    true as email_notifications,
    true as push_notifications,
    15 as reminder_advance_minutes
FROM auth.users u
WHERE u.organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- 9. Create a function to get due reminders
DROP FUNCTION IF EXISTS get_due_reminders();
CREATE OR REPLACE FUNCTION get_due_reminders()
RETURNS TABLE (
    reminder_id UUID,
    task_id UUID,
    user_id UUID,
    task_title TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    reminder_time TIMESTAMP WITH TIME ZONE,
    reminder_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id as reminder_id,
        tr.task_id,
        t.owner_id as user_id,
        t.title as task_title,
        t.due_date,
        tr.reminder_time,
        tr.reminder_type
    FROM task_reminders tr
    JOIN tasks t ON tr.task_id = t.id
    WHERE tr.status = 'pending' 
    AND tr.reminder_time <= NOW()
    AND t.status != 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
