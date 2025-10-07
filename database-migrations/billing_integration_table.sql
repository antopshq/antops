-- Billing integration configuration table
-- This table stores Stripe billing and subscription information for each organization

CREATE TABLE IF NOT EXISTS billing_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT false,
  
  -- Stripe configuration
  stripe_customer_id TEXT,
  subscription_id TEXT,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
  current_plan TEXT DEFAULT 'free' CHECK (current_plan IN ('free', 'starter', 'professional', 'enterprise')),
  
  -- Billing details
  billing_email TEXT,
  billing_interval TEXT CHECK (billing_interval IN ('month', 'year')),
  price_id TEXT, -- Stripe price ID for the current subscription
  
  -- Usage tracking
  seats_limit INTEGER DEFAULT 5,
  incidents_limit INTEGER DEFAULT 100,
  storage_limit INTEGER DEFAULT 1, -- in GB
  
  -- Billing dates
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(organization_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_billing_integrations_organization_id ON billing_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_integrations_stripe_customer_id ON billing_integrations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_integrations_subscription_id ON billing_integrations(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_integrations_enabled ON billing_integrations(enabled);

-- Row Level Security (RLS) policies
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

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_billing_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at field
CREATE TRIGGER trigger_update_billing_integrations_updated_at
  BEFORE UPDATE ON billing_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_integrations_updated_at();

-- Insert a default billing configuration for each existing organization (if any)
-- This will set all organizations to the free plan by default
INSERT INTO billing_integrations (organization_id, enabled, current_plan)
SELECT id, false, 'free'
FROM organizations
WHERE id NOT IN (SELECT organization_id FROM billing_integrations)
ON CONFLICT (organization_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE billing_integrations IS 'Stores Stripe billing and subscription information for organizations';
COMMENT ON COLUMN billing_integrations.stripe_customer_id IS 'Stripe customer ID for the organization';
COMMENT ON COLUMN billing_integrations.subscription_id IS 'Stripe subscription ID for active subscriptions';
COMMENT ON COLUMN billing_integrations.subscription_status IS 'Current status of the Stripe subscription';
COMMENT ON COLUMN billing_integrations.current_plan IS 'Current billing plan (free, starter, professional, enterprise)';
COMMENT ON COLUMN billing_integrations.billing_email IS 'Email address for billing notifications and invoices';
COMMENT ON COLUMN billing_integrations.price_id IS 'Stripe price ID for the current subscription plan';
COMMENT ON COLUMN billing_integrations.seats_limit IS 'Maximum number of team members allowed';
COMMENT ON COLUMN billing_integrations.incidents_limit IS 'Maximum number of incidents per month';
COMMENT ON COLUMN billing_integrations.storage_limit IS 'Storage limit in GB for file attachments';