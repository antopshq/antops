-- Create the PagerDuty integrations table
CREATE TABLE IF NOT EXISTS pagerduty_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    webhook_url TEXT NOT NULL,
    api_key TEXT,
    routing_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one integration per organization
    UNIQUE(organization_id),
    
    -- Add foreign key constraint if organizations table exists
    CONSTRAINT fk_pagerduty_organization 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create an index for faster queries by organization
CREATE INDEX IF NOT EXISTS idx_pagerduty_integrations_organization_id 
    ON pagerduty_integrations(organization_id);

-- Add RLS (Row Level Security) policy if using Supabase
ALTER TABLE pagerduty_integrations ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see their organization's integration
CREATE POLICY "Users can view their organization's PagerDuty integration" ON pagerduty_integrations
    FOR SELECT USING (
        organization_id = (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Policy to allow users to manage their organization's integration (admin only if you have roles)
CREATE POLICY "Users can manage their organization's PagerDuty integration" ON pagerduty_integrations
    FOR ALL USING (
        organization_id = (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );

-- Insert a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pagerduty_integrations_updated_at 
    BEFORE UPDATE ON pagerduty_integrations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();