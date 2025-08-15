-- Fix Notification Errors
-- Run this in your Supabase SQL editor to fix the current issues

-- 1. Drop the existing function that's causing errors
DROP FUNCTION IF EXISTS get_due_reminders();

-- 2. Check if reminder_type column exists and remove it if it does
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_reminders' 
        AND column_name = 'reminder_type'
    ) THEN
        ALTER TABLE task_reminders DROP COLUMN reminder_type;
    END IF;
END $$;

-- 3. Create the corrected function with proper data type handling
CREATE OR REPLACE FUNCTION get_due_reminders()
RETURNS TABLE (
    id UUID,
    task_id UUID,
    task_title TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    reminder_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id,
        tr.task_id,
        CAST(t.title AS TEXT) as task_title,
        t.due_date,
        tr.reminder_time
    FROM task_reminders tr
    JOIN tasks t ON tr.task_id = t.id
    WHERE tr.status = 'pending' 
    AND tr.reminder_time <= NOW()
    AND t.status != 'completed';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure the table structure is correct
ALTER TABLE task_reminders 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_status ON task_reminders(status);
CREATE INDEX IF NOT EXISTS idx_task_reminders_reminder_time ON task_reminders(reminder_time);

-- 6. Test the function
-- SELECT * FROM get_due_reminders();
