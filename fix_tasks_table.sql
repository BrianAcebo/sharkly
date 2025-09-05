-- Fix for tasks table missing owner_id field
-- This SQL will add the missing owner_id field to your tasks table

-- Add the owner_id field to the tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- Update existing tasks to set owner_id to created_by if it exists, otherwise to assigned_to
UPDATE tasks 
SET owner_id = COALESCE(created_by, assigned_to)
WHERE owner_id IS NULL;

-- Make owner_id NOT NULL after setting values
ALTER TABLE tasks 
ALTER COLUMN owner_id SET NOT NULL;

-- Add an index on owner_id for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);

-- Verify the table structure
-- You can run this to see the current structure:
-- \d tasks
