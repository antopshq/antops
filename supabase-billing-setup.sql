-- Minimal billing table creation for Supabase
CREATE TABLE billing_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL,
  enabled boolean DEFAULT false,
  stripe_customer_id text,
  subscription_id text,
  subscription_status text,
  current_plan text DEFAULT 'free',
  billing_email text,
  billing_interval text,
  price_id text,
  seats_limit integer DEFAULT 5,
  incidents_limit integer DEFAULT 100,
  storage_limit integer DEFAULT 1,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE billing_integrations 
ADD CONSTRAINT fk_billing_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Add unique constraint
ALTER TABLE billing_integrations 
ADD CONSTRAINT unique_billing_organization 
UNIQUE (organization_id);

-- Create indexes
CREATE INDEX idx_billing_org ON billing_integrations(organization_id);
CREATE INDEX idx_billing_stripe_customer ON billing_integrations(stripe_customer_id);

-- Enable RLS
ALTER TABLE billing_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "billing_select_policy" ON billing_integrations
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "billing_insert_policy" ON billing_integrations
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "billing_update_policy" ON billing_integrations
FOR UPDATE USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "billing_delete_policy" ON billing_integrations
FOR DELETE USING (
  organization_id IN (
    SELECT organization_id FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'owner'
  )
);