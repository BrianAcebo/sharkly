-- Notification Triggers for Automatic Notification Creation
-- Run this SQL in your Supabase SQL editor

-- 1. Function to create notifications automatically
CREATE OR REPLACE FUNCTION create_automatic_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Create notification based on the table and action
    CASE TG_TABLE_NAME
        WHEN 'tasks' THEN
            -- No automatic notifications for tasks - only reminder notifications
            -- Task reminder notifications are handled by the reminder service
            RETURN NEW;
            
        WHEN 'leads' THEN
            -- Lead-related notifications
            IF TG_OP = 'INSERT' THEN
                INSERT INTO notifications (
                    user_id,
                    organization_id,
                    title,
                    message,
                    type,
                    metadata
                ) VALUES (
                    NEW.owner_id,
                    NEW.organization_id,
                    'New Lead Added',
                    'Lead "' || NEW.company || '" has been added to your pipeline',
                    'lead_update',
                    jsonb_build_object(
                        'lead_id', NEW.id,
                        'company', NEW.company,
                        'contact_name', NEW.contact_name,
                        'value', NEW.value,
                        'user_name', 'System',
                        'user_avatar', null
                    )
                );
            ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
                -- Lead status changed
                INSERT INTO notifications (
                    user_id,
                    organization_id,
                    title,
                    message,
                    type,
                    metadata
                ) VALUES (
                    NEW.owner_id,
                    NEW.organization_id,
                    'Lead Status Updated',
                    'Lead "' || NEW.company || '" moved to ' || NEW.status,
                    'lead_update',
                    jsonb_build_object(
                        'lead_id', NEW.id,
                        'company', NEW.company,
                        'old_status', OLD.status,
                        'new_status', NEW.status,
                        'value', NEW.value,
                        'user_name', 'System',
                        'user_avatar', null
                    )
                );
            END IF;
            RETURN NEW;
            
        WHEN 'communications' THEN
            -- Communication-related notifications
            IF TG_OP = 'INSERT' THEN
                INSERT INTO notifications (
                    user_id,
                    organization_id,
                    title,
                    message,
                    type,
                    metadata
                ) VALUES (
                    NEW.user_id,
                    NEW.organization_id,
                    'New Communication',
                    'New ' || NEW.type || ' with ' || NEW.contact_name,
                    'communication',
                    jsonb_build_object(
                        'communication_id', NEW.id,
                        'lead_id', NEW.lead_id,
                        'type', NEW.type,
                        'contact_name', NEW.contact_name,
                        'user_name', 'System',
                        'user_avatar', null
                    )
                );
            END IF;
            RETURN NEW;
            
        WHEN 'task_reminders' THEN
            -- Task reminder notifications
            IF TG_OP = 'INSERT' THEN
                -- This will be handled by the reminder service
                -- Just log for debugging
                RAISE NOTICE 'Task reminder created for task % at %', NEW.task_id, NEW.reminder_time;
            END IF;
            RETURN NEW;
            
        ELSE
            -- Unknown table, just return
            RETURN NEW;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create triggers for each table
CREATE OR REPLACE TRIGGER trigger_leads_notifications
    AFTER INSERT OR UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION create_automatic_notification();

CREATE OR REPLACE TRIGGER trigger_communications_notifications
    AFTER INSERT ON communications
    FOR EACH ROW
    EXECUTE FUNCTION create_automatic_notification();

CREATE OR REPLACE TRIGGER trigger_task_reminders
    AFTER INSERT ON task_reminders
    FOR EACH ROW
    EXECUTE FUNCTION create_automatic_notification();

-- 3. Function to clean up old notifications (optional)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    RAISE NOTICE 'Cleaned up notifications older than 90 days';
END;
$$ LANGUAGE plpgsql;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 5. Verify the setup
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%notifications%'
ORDER BY trigger_name;
