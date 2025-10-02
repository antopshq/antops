-- Create table for storing Grafana integration configuration
CREATE TABLE IF NOT EXISTS grafana_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  webhook_url TEXT NOT NULL,
  api_key TEXT, -- Optional API key for enhanced validation
  auto_create_incidents BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one integration per organization
  UNIQUE(organization_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_grafana_integrations_organization_id ON grafana_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_grafana_integrations_enabled ON grafana_integrations(enabled);

-- Add Row Level Security (RLS) policies
ALTER TABLE grafana_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access integrations for their organization
CREATE POLICY grafana_integrations_organization_policy ON grafana_integrations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Only owners, admins, and managers can modify integrations
CREATE POLICY grafana_integrations_modify_policy ON grafana_integrations
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY grafana_integrations_update_policy ON grafana_integrations
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY grafana_integrations_delete_policy ON grafana_integrations
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin', 'manager')
    )
  );

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_grafana_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_grafana_integrations_updated_at
  BEFORE UPDATE ON grafana_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_grafana_integrations_updated_at();

-- Add comments for documentation
COMMENT ON TABLE grafana_integrations IS 'Stores Grafana integration configuration for organizations';
COMMENT ON COLUMN grafana_integrations.webhook_url IS 'URL for receiving Grafana webhook notifications';
COMMENT ON COLUMN grafana_integrations.api_key IS 'Optional API key for validating webhook requests';
COMMENT ON COLUMN grafana_integrations.auto_create_incidents IS 'Whether to automatically create incidents when users click notifications';