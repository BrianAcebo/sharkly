-- Create organizations table
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  max_seats INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table (replaces investigators)
CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Create organization_invites table
CREATE TABLE organization_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  avatar TEXT,
  completed_onboarding BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  plan_type TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_organization_id ON team_members(organization_id);
CREATE INDEX idx_team_members_role ON team_members(role);
CREATE INDEX idx_organization_invites_organization_id ON organization_invites(organization_id);
CREATE INDEX idx_organization_invites_email ON organization_invites(email);
CREATE INDEX idx_organization_invites_status ON organization_invites(status);

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their own organizations" ON organizations
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can update their own organizations" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can insert their own organizations" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Team Members policies
CREATE POLICY "Users can view their own team memberships" ON team_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own team memberships" ON team_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

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

-- Organization invites policies
CREATE POLICY "Users can view invites for their organizations" ON organization_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = organization_invites.organization_id
      AND (
        organizations.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.organization_id = organizations.id
          AND tm.user_id = auth.uid()
          AND tm.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Public access to invitations by ID" ON organization_invites
  FOR SELECT USING (true);

CREATE POLICY "Admins can create invites" ON organization_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.organization_id = organization_invites.organization_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
    )
  );

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Subscriptions policies
CREATE POLICY "Organization owners can view their subscriptions" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = subscriptions.organization_id
      AND organizations.owner_id = auth.uid()
    )
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at 
    BEFORE UPDATE ON team_members 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create organization with admin
CREATE OR REPLACE FUNCTION create_organization_with_admin(
  org_name TEXT,
  max_seats INTEGER,
  owner_id UUID
) RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Create organization
  INSERT INTO organizations (name, max_seats, owner_id, status)
  VALUES (org_name, max_seats, owner_id, 'pending')
  RETURNING id INTO org_id;

  -- Add owner as admin team member
  INSERT INTO team_members (user_id, organization_id, role)
  VALUES (owner_id, org_id, 'admin');

  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 