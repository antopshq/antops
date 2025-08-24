-- Quick fix: Add missing columns to existing notifications table
-- Run this in your Supabase SQL Editor

-- Check current structure and add missing columns
DO $$ BEGIN
  -- Add attempts column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'attempts') THEN
    ALTER TABLE notifications ADD COLUMN attempts INTEGER DEFAULT 0 NOT NULL;
  END IF;
  
  -- Add last_attempt_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'last_attempt_at') THEN
    ALTER TABLE notifications ADD COLUMN last_attempt_at TIMESTAMPTZ;
  END IF;
  
  -- Add sent_at column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'sent_at') THEN
    ALTER TABLE notifications ADD COLUMN sent_at TIMESTAMPTZ;
  END IF;
  
  -- Add error column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'error') THEN
    ALTER TABLE notifications ADD COLUMN error TEXT;
  END IF;
END $$;