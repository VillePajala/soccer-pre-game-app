-- Add migration_status table to existing Supabase database
-- Run this SQL in the Supabase SQL editor

-- Migration status table
CREATE TABLE IF NOT EXISTS migration_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  migration_completed BOOLEAN DEFAULT FALSE,
  migration_started BOOLEAN DEFAULT FALSE,
  last_migration_attempt TIMESTAMP WITH TIME ZONE,
  migration_progress INTEGER DEFAULT 0 CHECK (migration_progress >= 0 AND migration_progress <= 100),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE migration_status ENABLE ROW LEVEL SECURITY;

-- RLS Policy for migration_status
CREATE POLICY "Users can only access their own migration status" ON migration_status
  FOR ALL USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_migration_status_updated_at 
  BEFORE UPDATE ON migration_status 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();