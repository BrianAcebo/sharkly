-- Create organizations table first (needed for foreign key references)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES auth.users(id) NOT NULL,
    max_seats INTEGER DEFAULT 10,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_organizations junction table
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Create leads table
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    stage VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'qualified', 'proposal', 'closed-won', 'closed-lost')),
    value DECIMAL(15,2) DEFAULT 0,
    title VARCHAR(500),
    description TEXT,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'closed')),
    priority VARCHAR(50) DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    tags TEXT[] DEFAULT '{}',
    last_contact DATE,
    notes TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create communications table
CREATE TABLE IF NOT EXISTS communications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'text', 'call')),
    direction VARCHAR(50) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    subject VARCHAR(500),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    duration INTEGER, -- for calls in seconds
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_organizations junction table
CREATE TABLE IF NOT EXISTS user_organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_communications_lead_id ON communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON communications(created_at);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user_id ON user_organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_org_id ON user_organizations(organization_id);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_organizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads table
CREATE POLICY "Users can view leads in their organization" ON leads
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert leads in their organization" ON leads
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update leads in their organization" ON leads
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete leads in their organization" ON leads
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for communications table
CREATE POLICY "Users can view communications for leads in their organization" ON communications
    FOR SELECT USING (
        lead_id IN (
            SELECT id 
            FROM leads 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can insert communications for leads in their organization" ON communications
    FOR INSERT WITH CHECK (
        lead_id IN (
            SELECT id 
            FROM leads 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update communications for leads in their organization" ON communications
    FOR UPDATE USING (
        lead_id IN (
            SELECT id 
            FROM leads 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can delete communications for leads in their organization" ON communications
    FOR DELETE USING (
        lead_id IN (
            SELECT id 
            FROM leads 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM user_organizations 
                WHERE user_id = auth.uid()
            )
        )
    );

-- RLS Policies for organizations table
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id 
            FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Organization owners can update their organization" ON organizations
    FOR UPDATE USING (
        owner_id = auth.uid()
    );

-- Drop all existing policies for user_organizations table
DROP POLICY IF EXISTS "Users can view their organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Organization owners and admins can manage members" ON user_organizations;
DROP POLICY IF EXISTS "Users can view their own organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Users can insert their own organization memberships" ON user_organizations;
DROP POLICY IF EXISTS "Organization owners and admins can view all members" ON user_organizations;
DROP POLICY IF EXISTS "Organization owners can manage members" ON user_organizations;

-- Create simplified policies that avoid circular references
CREATE POLICY "Users can view their own organization memberships" ON user_organizations
    FOR SELECT USING (
        user_id = auth.uid()
    );

CREATE POLICY "Users can insert their own organization memberships" ON user_organizations
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- Simple policy for organization owners to manage their organization
CREATE POLICY "Organization owners can manage their organization" ON user_organizations
    FOR ALL USING (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
        )
    );

-- Create function to automatically set updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a default organization for the new user
    INSERT INTO organizations (name, owner_id, max_seats)
    VALUES (COALESCE(NEW.raw_user_meta_data->>'organization_name', 'My Organization'), NEW.id, 10);
    
    -- Add user to their organization
    INSERT INTO user_organizations (user_id, organization_id, role)
    VALUES (NEW.id, (SELECT id FROM organizations WHERE owner_id = NEW.id LIMIT 1), 'owner');
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user(); 