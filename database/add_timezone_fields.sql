-- Add due_timezone field to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_timezone TEXT DEFAULT 'UTC';

-- Update existing tasks to have a default timezone
UPDATE tasks SET due_timezone = 'UTC' WHERE due_timezone IS NULL;

-- Make the field required
ALTER TABLE tasks ALTER COLUMN due_timezone SET NOT NULL;
