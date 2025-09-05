-- Complete fix for tasks table to match TypeScript types
-- This will ensure all required fields exist and have the correct structure

-- Add missing fields to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_time TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();

-- Update existing tasks to set owner_id to created_by if it exists, otherwise to assigned_to
UPDATE tasks 
SET owner_id = COALESCE(created_by, assigned_to)
WHERE owner_id IS NULL;

-- Make owner_id NOT NULL after setting values
ALTER TABLE tasks 
ALTER COLUMN owner_id SET NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_owner_id ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);

-- Add a trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the table structure
-- You can run this to see the current structure:
-- \d tasks
