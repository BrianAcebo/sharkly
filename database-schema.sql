-- Database Schema for Paperboat CRM Organization System
-- Run this in your Supabase SQL Editor

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    max_seats INTEGER NOT NULL DEFAULT 10,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. User Organizations Table (Team Members)
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'manager', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- 3. Organization Invitations Table
CREATE TABLE IF NOT EXISTS organization_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('manager', 'member')),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(email, organization_id, status)
);

-- 4. Profiles Table (if you don't have it already)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    avatar VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_role ON user_organizations(role);

CREATE INDEX IF NOT EXISTS idx_org_invites_email ON organization_invites(email);
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invites_status ON organization_invites(status);
CREATE INDEX IF NOT EXISTS idx_org_invites_expires ON organization_invites(expires_at);

CREATE INDEX IF NOT EXISTS idx_profiles_avatar ON profiles(avatar);

-- 6. Triggers for Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_organizations_updated_at ON user_organizations;
CREATE TRIGGER update_user_organizations_updated_at 
    BEFORE UPDATE ON user_organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Row Level Security (RLS) - Temporarily Disabled for Development
-- Uncomment these when you're ready for production security

-- ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 8. Sample Data Insert (Optional - replace with your actual user ID)
-- INSERT INTO organizations (name, max_seats, owner_id) 
-- VALUES ('Paperboat CRM', 25, 'your-actual-user-id-here');

-- INSERT INTO user_organizations (user_id, organization_id, role)
-- VALUES ('your-actual-user-id-here', (SELECT id FROM organizations WHERE name = 'Paperboat CRM'), 'owner');

-- 9. Verify Tables Created
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organizations', 'user_organizations', 'organization_invites', 'profiles')
ORDER BY table_name;
