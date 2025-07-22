-- Fix user organization setup for existing users
-- This script will create an organization for users who don't have one

-- First, let's see what users exist and their current organization status
SELECT 
    u.id as user_id,
    u.email,
    u.raw_user_meta_data,
    COUNT(org.id) as organization_count,
    COUNT(uo.id) as user_org_count
FROM auth.users u
LEFT JOIN organizations org ON org.owner_id = u.id
LEFT JOIN user_organizations uo ON uo.user_id = u.id
GROUP BY u.id, u.email, u.raw_user_meta_data;

-- Create organizations for users who don't have one
INSERT INTO organizations (name, owner_id, max_seats)
SELECT 
    COALESCE(u.raw_user_meta_data->>'organization_name', 'My Organization'),
    u.id,
    10
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM organizations WHERE owner_id = u.id
);

-- Create user_organizations links for users who don't have one
INSERT INTO user_organizations (user_id, organization_id, role)
SELECT 
    u.id,
    org.id,
    'owner'
FROM auth.users u
JOIN organizations org ON org.owner_id = u.id
WHERE NOT EXISTS (
    SELECT 1 FROM user_organizations WHERE user_id = u.id
);

-- Verify the fix worked
SELECT 
    u.email,
    org.name as organization_name,
    uo.role
FROM auth.users u
JOIN user_organizations uo ON uo.user_id = u.id
JOIN organizations org ON org.id = uo.organization_id; 