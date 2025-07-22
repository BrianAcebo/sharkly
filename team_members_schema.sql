-- Team Members Table
-- This replaces the investigators table with a more generic team members approach

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_organization_id ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- Enable Row Level Security
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members

-- Users can view their own team memberships
CREATE POLICY "Users can view their own team memberships" ON team_members
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own team memberships (for joining organizations)
CREATE POLICY "Users can insert their own team memberships" ON team_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own team memberships
CREATE POLICY "Users can update their own team memberships" ON team_members
    FOR UPDATE USING (auth.uid() = user_id);

-- Organization owners and admins can view all team members in their organization
CREATE POLICY "Organization owners and admins can view team members" ON team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.organization_id = team_members.organization_id
            AND tm.role IN ('owner', 'admin')
        )
    );

-- Organization owners and admins can manage team members in their organization
CREATE POLICY "Organization owners and admins can manage team members" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.organization_id = team_members.organization_id
            AND tm.role IN ('owner', 'admin')
        )
    );

-- Organization owners can delete team members from their organization
CREATE POLICY "Organization owners can delete team members" ON team_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM team_members tm
            WHERE tm.user_id = auth.uid()
            AND tm.organization_id = team_members.organization_id
            AND tm.role = 'owner'
        )
    );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_team_members_updated_at 
    BEFORE UPDATE ON team_members 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create team member record when user joins organization
CREATE OR REPLACE FUNCTION create_team_member_on_organization_join()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert team member record
    INSERT INTO team_members (user_id, organization_id, role)
    VALUES (NEW.user_id, NEW.organization_id, NEW.role);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create team member when user_organizations record is created
CREATE TRIGGER create_team_member_trigger
    AFTER INSERT ON user_organizations
    FOR EACH ROW
    EXECUTE FUNCTION create_team_member_on_organization_join();

-- Migration script to convert existing investigators to team_members
-- Run this if you have existing investigators table data

-- INSERT INTO team_members (user_id, organization_id, role, created_at, updated_at)
-- SELECT 
--     i.user_id,
--     i.organization_id,
--     i.role,
--     i.created_at,
--     i.updated_at
-- FROM investigators i
-- ON CONFLICT (user_id, organization_id) DO NOTHING;

-- After migration is complete, you can drop the investigators table:
-- DROP TABLE IF EXISTS investigators CASCADE; 