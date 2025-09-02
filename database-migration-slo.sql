-- Migration: Rename sla_configurations table to slo_configurations
-- Run this in your Supabase SQL editor

-- Step 1: Rename the table
ALTER TABLE sla_configurations RENAME TO slo_configurations;

-- Step 2: Update any indexes that reference the old table name (if they exist)
-- Note: Most indexes will be automatically renamed, but check if you have any custom ones

-- Step 3: Update RLS policies (they should automatically apply to the renamed table)
-- If you have custom RLS policies, verify they still work after the rename

-- Step 4: Verify the change worked
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'slo_configurations';

-- This should return one row showing the renamed table exists