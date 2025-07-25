-- Add missing columns to seasons table
ALTER TABLE seasons 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS period_count INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS period_duration INTEGER DEFAULT 45,
ADD COLUMN IF NOT EXISTS game_dates JSONB,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_roster_ids JSONB,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS badge TEXT,
ADD COLUMN IF NOT EXISTS age_group TEXT;

-- Add missing columns to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS period_count INTEGER DEFAULT 2,
ADD COLUMN IF NOT EXISTS period_duration INTEGER DEFAULT 45,
ADD COLUMN IF NOT EXISTS game_dates JSONB,
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS default_roster_ids JSONB,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS badge TEXT,
ADD COLUMN IF NOT EXISTS level TEXT,
ADD COLUMN IF NOT EXISTS age_group TEXT;

-- Add missing columns to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS game_location TEXT,
ADD COLUMN IF NOT EXISTS game_time TIME;

-- Update the RLS policies to include new columns if needed
-- (The existing policies should work fine with the new columns)