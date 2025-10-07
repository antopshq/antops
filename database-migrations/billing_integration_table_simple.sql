-- Billing integration configuration table
-- This table stores Stripe billing and subscription information for each organization

CREATE TABLE billing_integrations (
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
  price_id TEXT,
  
  -- Usage tracking
  seats_limit INTEGER DEFAULT 5,
  incidents_limit INTEGER DEFAULT 100,
  storage_limit INTEGER DEFAULT 1,
  
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