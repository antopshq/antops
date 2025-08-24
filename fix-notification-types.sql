-- Add 'team_invitation' to allowed notification types
-- Run this in your Supabase SQL Editor

-- Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with team_invitation included
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY(ARRAY[
    'change_approval_request'::text,
    'change_approved'::text, 
    'change_rejected'::text,
    'change_completion_prompt'::text,
    'change_auto_started'::text,
    'team_invitation'::text
  ])
);