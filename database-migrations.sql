-- Database migrations for notifications and team invitations
-- Run these in your Supabase SQL editor

-- 1. Create team_invitations table
CREATE TABLE team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL, -- You may need to reference your organizations table if it exists
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by UUID REFERENCES profiles(id) NOT NULL,
  invite_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('change', 'incident', 'problem', 'invitation')),
  recipients JSONB NOT NULL,
  data JSONB NOT NULL,
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  attempts INTEGER DEFAULT 0 NOT NULL,
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Add missing columns to existing tables if they don't exist
-- Add organization_id to profiles (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'organization_id') THEN
    ALTER TABLE profiles ADD COLUMN organization_id UUID;
  END IF;
END $$;

-- Add organization_id to incidents (if not exists)  
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'organization_id') THEN
    ALTER TABLE incidents ADD COLUMN organization_id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Add organization_id to problems (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'problems' AND column_name = 'organization_id') THEN
    ALTER TABLE problems ADD COLUMN organization_id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Add organization_id to changes (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'changes' AND column_name = 'organization_id') THEN
    ALTER TABLE changes ADD COLUMN organization_id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Add organization_id to comments (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'organization_id') THEN
    ALTER TABLE comments ADD COLUMN organization_id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
END $$;

-- Add mentions and attachments to comments (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'mentions') THEN
    ALTER TABLE comments ADD COLUMN mentions TEXT[] DEFAULT '{}';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'attachments') THEN
    ALTER TABLE comments ADD COLUMN attachments JSONB DEFAULT '[]';
  END IF;
END $$;

-- Add missing priority/criticality/urgency columns to incidents (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'criticality') THEN
    ALTER TABLE incidents ADD COLUMN criticality priority_type NOT NULL DEFAULT 'medium';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incidents' AND column_name = 'urgency') THEN
    ALTER TABLE incidents ADD COLUMN urgency priority_type NOT NULL DEFAULT 'medium';
  END IF;
END $$;

-- Add missing columns to problems (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'problems' AND column_name = 'criticality') THEN
    ALTER TABLE problems ADD COLUMN criticality priority_type NOT NULL DEFAULT 'medium';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'problems' AND column_name = 'urgency') THEN
    ALTER TABLE problems ADD COLUMN urgency priority_type NOT NULL DEFAULT 'medium';
  END IF;
END $$;

-- 4. Enable RLS on new tables
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for team_invitations
CREATE POLICY "Users can view invitations for their organization" ON team_invitations
  FOR SELECT USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create invitations for their organization" ON team_invitations
  FOR INSERT WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete invitations for their organization" ON team_invitations
  FOR DELETE USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- 6. Create RLS policies for notifications
CREATE POLICY "Users can view notifications for their organization" ON notifications
  FOR SELECT USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage notifications" ON notifications
  FOR ALL USING (true);

-- 7. Create indexes for performance
CREATE INDEX idx_team_invitations_organization_id ON team_invitations(organization_id);
CREATE INDEX idx_team_invitations_email ON team_invitations(email);
CREATE INDEX idx_team_invitations_status ON team_invitations(status);
CREATE INDEX idx_team_invitations_invite_token ON team_invitations(invite_token);

CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_scheduled_for ON notifications(scheduled_for);

-- 8. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_team_invitations_updated_at 
  BEFORE UPDATE ON team_invitations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON notifications 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();