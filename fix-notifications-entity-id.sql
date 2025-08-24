-- Fix notifications table - add missing entity_id column
-- Run this in your Supabase SQL Editor

-- Add entity_id column if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'entity_id') THEN
    ALTER TABLE notifications ADD COLUMN entity_id TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Add entity_type column if missing  
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'notifications' AND column_name = 'entity_type') THEN
    ALTER TABLE notifications ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'invitation' 
    CHECK (entity_type IN ('change', 'incident', 'problem', 'invitation'));
  END IF;
END $$;