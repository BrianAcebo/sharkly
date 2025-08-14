-- Task Management System Database Migration
-- Run this script in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
    type VARCHAR(100) NOT NULL DEFAULT 'general' CHECK (type IN ('follow_up', 'call', 'email', 'meeting', 'proposal', 'general')),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_enabled BOOLEAN DEFAULT false,
    reminder_time TIMESTAMP WITH TIME ZONE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    lead_name VARCHAR(255),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_reminders table
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
    notification_type VARCHAR(50) DEFAULT 'browser' CHECK (notification_type IN ('browser', 'email', 'both')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_status ON task_reminders(status);
CREATE INDEX IF NOT EXISTS idx_task_reminders_reminder_time ON task_reminders(reminder_time);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_reminders_updated_at BEFORE UPDATE ON task_reminders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tasks table
-- Users can only see tasks from their organization
CREATE POLICY "Users can view tasks from their organization" ON tasks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Users can create tasks in their organization
CREATE POLICY "Users can create tasks in their organization" ON tasks
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Users can update tasks they own or are assigned to them
CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE USING (
        owner_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Users can delete tasks they own
CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (
        owner_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Create RLS policies for task_reminders table
-- Users can only see reminders for tasks they have access to
CREATE POLICY "Users can view reminders for accessible tasks" ON task_reminders
    FOR SELECT USING (
        task_id IN (
            SELECT id FROM tasks WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Users can create reminders for tasks they have access to
CREATE POLICY "Users can create reminders for accessible tasks" ON task_reminders
    FOR INSERT WITH CHECK (
        task_id IN (
            SELECT id FROM tasks WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Users can update reminders for tasks they have access to
CREATE POLICY "Users can update reminders for accessible tasks" ON task_reminders
    FOR UPDATE USING (
        task_id IN (
            SELECT id FROM tasks WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Users can delete reminders for tasks they have access to
CREATE POLICY "Users can delete reminders for accessible tasks" ON task_reminders
    FOR DELETE USING (
        task_id IN (
            SELECT id FROM tasks WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Create a view for task statistics
CREATE OR REPLACE VIEW task_stats AS
SELECT 
    t.organization_id,
    t.owner_id,
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.due_date < NOW() AND t.status != 'completed' THEN 1 END) as overdue_tasks,
    COUNT(CASE WHEN DATE(t.due_date) = DATE(NOW()) AND t.status != 'completed' THEN 1 END) as due_today_tasks,
    COUNT(CASE WHEN t.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND t.status != 'completed' THEN 1 END) as due_this_week_tasks,
    COUNT(CASE WHEN t.priority = 'urgent' THEN 1 END) as urgent_tasks,
    COUNT(CASE WHEN t.priority = 'high' THEN 1 END) as high_priority_tasks,
    COUNT(CASE WHEN t.reminder_enabled = true THEN 1 END) as tasks_with_reminders
FROM tasks t
GROUP BY t.organization_id, t.owner_id;

-- Grant permissions to authenticated users
GRANT ALL ON tasks TO authenticated;
GRANT ALL ON task_reminders TO authenticated;
GRANT SELECT ON task_stats TO authenticated;

-- Insert sample data (optional - remove if you don't want sample data)
-- Uncomment the following lines if you want to add sample tasks

/*
INSERT INTO tasks (title, description, status, priority, type, due_date, reminder_enabled, organization_id, owner_id) VALUES
('Follow up with TechCorp', 'Call John Smith to discuss the proposal we sent last week', 'pending', 'high', 'follow_up', NOW() + INTERVAL '2 days', true, 
 (SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1), auth.uid()),
('Prepare presentation for StartupXYZ', 'Create slides for the quarterly review meeting', 'in_progress', 'medium', 'meeting', NOW() + INTERVAL '5 days', false,
 (SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1), auth.uid()),
('Send contract to InnovateTech', 'Email the signed contract and payment terms', 'pending', 'urgent', 'email', NOW() + INTERVAL '1 day', true,
 (SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1), auth.uid()),
('Review lead pipeline', 'Analyze current leads and update statuses', 'completed', 'low', 'general', NOW() - INTERVAL '1 day', false,
 (SELECT organization_id FROM profiles WHERE id = auth.uid() LIMIT 1), auth.uid());
*/

-- Create function to automatically create reminders when tasks are created/updated
CREATE OR REPLACE FUNCTION create_task_reminder()
RETURNS TRIGGER AS $$
BEGIN
    -- If reminder is enabled and reminder_time is provided, create a reminder
    IF NEW.reminder_enabled = true AND NEW.reminder_time IS NOT NULL THEN
        -- Delete any existing reminders for this task
        DELETE FROM task_reminders WHERE task_id = NEW.id;
        
        -- Create a new reminder at the specified time
        INSERT INTO task_reminders (task_id, reminder_time, notification_type)
        VALUES (NEW.id, NEW.reminder_time, 'browser');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create reminders
CREATE TRIGGER trigger_create_task_reminder
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION create_task_reminder();

-- Add comments for documentation
COMMENT ON TABLE tasks IS 'Main tasks table for task management system';
COMMENT ON TABLE task_reminders IS 'Reminders for tasks with notification scheduling';
COMMENT ON VIEW task_stats IS 'Aggregated task statistics for organizations and users';
COMMENT ON COLUMN tasks.status IS 'Task status: pending, in_progress, completed';
COMMENT ON COLUMN tasks.priority IS 'Task priority: urgent, high, medium, low';
COMMENT ON COLUMN tasks.type IS 'Task type: follow_up, call, email, meeting, proposal, general';
COMMENT ON COLUMN task_reminders.status IS 'Reminder status: pending, sent, cancelled';
COMMENT ON COLUMN task_reminders.notification_type IS 'Notification type: browser, email, both';

-- Success message
SELECT 'Task management system tables created successfully!' as message;
