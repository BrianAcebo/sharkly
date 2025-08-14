-- Update existing tasks that have lead_id but missing lead_name
-- This script should be run after the tasks_migration.sql to populate lead_name for existing tasks

UPDATE tasks 
SET lead_name = (
    SELECT CONCAT(leads.name, ' - ', COALESCE(leads.company, 'No Company'))
    FROM leads 
    WHERE leads.id = tasks.lead_id
)
WHERE tasks.lead_id IS NOT NULL 
  AND (tasks.lead_name IS NULL OR tasks.lead_name = '');

-- Verify the update
SELECT 
    t.id,
    t.title,
    t.lead_id,
    t.lead_name,
    l.name as lead_name_from_leads,
    l.company as lead_company_from_leads
FROM tasks t
LEFT JOIN leads l ON t.lead_id = l.id
WHERE t.lead_id IS NOT NULL
ORDER BY t.created_at DESC
LIMIT 10;
