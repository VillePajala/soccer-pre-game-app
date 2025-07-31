-- Add missing fields to tournaments table to support roster and game configuration
-- This migration adds all the fields expected by the application but missing from the current schema

-- Add missing columns to tournaments table
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS period_count INTEGER;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS period_duration INTEGER;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS game_dates JSONB;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS default_roster_ids JSONB;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS age_group TEXT;

-- Also add missing fields to seasons table if they don't exist
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS period_count INTEGER;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS period_duration INTEGER;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS game_dates JSONB;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS default_roster_ids JSONB;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS badge TEXT;
ALTER TABLE seasons ADD COLUMN IF NOT EXISTS age_group TEXT;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_tournaments_archived ON tournaments(archived);
CREATE INDEX IF NOT EXISTS idx_seasons_archived ON seasons(archived);
CREATE INDEX IF NOT EXISTS idx_tournaments_level ON tournaments(level);
CREATE INDEX IF NOT EXISTS idx_tournaments_age_group ON tournaments(age_group);
CREATE INDEX IF NOT EXISTS idx_seasons_age_group ON seasons(age_group);