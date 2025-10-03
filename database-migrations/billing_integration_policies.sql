-- Enable Row Level Security for billing_integrations
ALTER TABLE billing_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see billing information from their own organization
CREATE POLICY "Users can view billing from their organization" ON billing_integrations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid()
    )
  );

-- Policy: Only owners and admins can insert billing configurations
CREATE POLICY "Owners and admins can create billing configurations" ON billing_integrations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT up.organization_id 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('owner', 'admin')
    )
  );

-- Policy: Only owners and admins can update billing configurations
CREATE POLICY "Owners and admins can update billing configurations" ON billing_integrations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT up.organization_id 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT up.organization_id 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('owner', 'admin')
    )
  );

-- Policy: Only owners can delete billing configurations
CREATE POLICY "Only owners can delete billing configurations" ON billing_integrations
  FOR DELETE
  USING (
    organization_id IN (
      SELECT up.organization_id 
      FROM user_profiles up 
      WHERE up.user_id = auth.uid() 
      AND up.role = 'owner'
    )
  );