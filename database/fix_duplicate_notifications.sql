-- Fix Duplicate Notifications
-- Run this in your Supabase SQL editor

-- 1. Clean up existing duplicate notifications
-- Remove duplicates based on user_id, task_id, reminder_time, and type
DELETE FROM notifications 
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY user_id, 
                   (metadata->>'task_id'), 
                   (metadata->>'reminder_time'), 
                   type 
                   ORDER BY created_at DESC
               ) as rn
        FROM notifications 
        WHERE type = 'reminder' 
        AND metadata->>'task_id' IS NOT NULL
        AND metadata->>'reminder_time' IS NOT NULL
    ) t 
    WHERE t.rn > 1
);

-- 2. Add unique constraint to prevent future duplicates
-- This constraint ensures no duplicate notifications for the same task reminder
ALTER TABLE notifications 
ADD CONSTRAINT unique_task_reminder_notification 
UNIQUE (user_id, (metadata->>'task_id'), (metadata->>'reminder_time'), type) 
WHERE type = 'reminder' 
AND metadata->>'task_id' IS NOT NULL 
AND metadata->>'reminder_time' IS NOT NULL;

-- 3. Add index for better performance on notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_task_reminder 
ON notifications (user_id, (metadata->>'task_id'), (metadata->>'reminder_time'), type) 
WHERE type = 'reminder' 
AND metadata->>'task_id' IS NOT NULL 
AND metadata->>'reminder_time' IS NOT NULL;

-- 4. Add index for real-time notification delivery
CREATE INDEX IF NOT EXISTS idx_notifications_realtime 
ON notifications (user_id, created_at, read_at) 
WHERE read_at IS NULL;

-- 5. Verify the fix
SELECT 
    user_id,
    (metadata->>'task_id') as task_id,
    (metadata->>'reminder_time') as reminder_time,
    type,
    COUNT(*) as notification_count
FROM notifications 
WHERE type = 'reminder' 
AND metadata->>'task_id' IS NOT NULL
AND metadata->>'reminder_time' IS NOT NULL
GROUP BY user_id, (metadata->>'task_id'), (metadata->>'reminder_time'), type
HAVING COUNT(*) > 1;

-- This should return no rows if duplicates were successfully removed
