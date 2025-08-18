-- Function to deliver due task reminders
-- This function should be called by pg_cron every minute
CREATE OR REPLACE FUNCTION public.deliver_due_task_reminders()
RETURNS void AS $$
DECLARE
    reminder_record RECORD;
    task_record RECORD;
    user_record RECORD;
    utc_time_formatted TEXT;
    reminder_message TEXT;
BEGIN
    -- Find all pending reminders that are due now or in the past
    FOR reminder_record IN
        SELECT 
            tr.id as reminder_id,
            tr.task_id,
            tr.reminder_time,
            tr.notification_type,
            t.title as task_title,
            t.due_date,
            t.owner_id,
            t.organization_id
        FROM public.task_reminders tr
        INNER JOIN public.tasks t ON tr.task_id = t.id
        WHERE tr.status = 'pending'
        AND tr.reminder_time <= NOW()
        ORDER BY tr.reminder_time ASC
    LOOP
        -- Get user information for the notification
        SELECT * INTO user_record
        FROM public.profiles
        WHERE id = reminder_record.owner_id;
        
        -- Format UTC time as 12-hour format (e.g., "11:30am")
        utc_time_formatted := to_char(reminder_record.due_date AT TIME ZONE 'UTC', 'HH12:MIam');
        
        -- Create the reminder message with formatted UTC time
        reminder_message := 'Reminder: "' || reminder_record.task_title || '" is due soon (' || 
                          to_char(reminder_record.due_date AT TIME ZONE 'UTC', 'YYYY-MM-DD') || ' ' || 
                          utc_time_formatted || ' UTC)';
        
        -- Create notification
        INSERT INTO public.notifications (
            user_id,
            organization_id,
            title,
            message,
            type,
            priority,
            action_url,
            metadata,
            read,
            created_at
        ) VALUES (
            reminder_record.owner_id,
            reminder_record.organization_id,
            'Task Reminder',
            reminder_message,
            'task_reminder',
            'medium',
            '/tasks/' || reminder_record.task_id,
            jsonb_build_object(
                'task_id', reminder_record.task_id,
                'task_title', reminder_record.task_title,
                'due_date', reminder_record.due_date,
                'reminder_time', reminder_record.reminder_time,
                'utc_time_formatted', utc_time_formatted
            ),
            false,
            NOW()
        );
        
        -- Mark reminder as delivered
        UPDATE public.task_reminders
        SET status = 'delivered', updated_at = NOW()
        WHERE id = reminder_record.reminder_id;
        
        RAISE NOTICE 'Delivered reminder for task %: %', reminder_record.task_id, reminder_message;
    END LOOP;
    
    RAISE NOTICE 'Processed all due reminders';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.deliver_due_task_reminders() TO authenticated;

-- Example pg_cron job (run this in your Supabase SQL editor):
-- SELECT cron.schedule('deliver-task-reminders', '* * * * *', 'SELECT public.deliver_due_task_reminders();');
