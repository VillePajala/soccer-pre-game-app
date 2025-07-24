-- Drop tables if they exist and recreate them cleanly
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS tournaments CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS migration_status CASCADE;

-- Create tables
CREATE TABLE migration_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  migration_completed BOOLEAN DEFAULT false,
  migration_started BOOLEAN DEFAULT false,
  last_migration_attempt TIMESTAMPTZ,
  migration_progress INTEGER DEFAULT 0 CHECK (migration_progress >= 0 AND migration_progress <= 100),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  jersey_number TEXT,
  notes TEXT,
  is_goalie BOOLEAN DEFAULT false,
  received_fair_play_card BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  game_date DATE NOT NULL,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  home_or_away TEXT CHECK (home_or_away IN ('home', 'away')),
  game_notes TEXT,
  number_of_periods INTEGER DEFAULT 2,
  period_duration_minutes INTEGER DEFAULT 45,
  current_period INTEGER DEFAULT 1,
  game_status TEXT CHECK (game_status IN ('notStarted', 'inProgress', 'finished')),
  is_played BOOLEAN DEFAULT false,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  game_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE app_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en',
  default_team_name TEXT,
  auto_backup_enabled BOOLEAN DEFAULT false,
  auto_backup_interval_hours INTEGER DEFAULT 24,
  last_backup_time TIMESTAMPTZ,
  backup_email TEXT,
  current_game_id UUID,
  settings JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_seasons_user_id ON seasons(user_id);
CREATE INDEX idx_tournaments_user_id ON tournaments(user_id);
CREATE INDEX idx_tournaments_season_id ON tournaments(season_id);
CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_season_id ON games(season_id);
CREATE INDEX idx_games_tournament_id ON games(tournament_id);
CREATE INDEX idx_games_game_date ON games(game_date);

-- Enable RLS
ALTER TABLE migration_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Migration status
CREATE POLICY "Users can view own migration status" ON migration_status
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own migration status" ON migration_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own migration status" ON migration_status
  FOR UPDATE USING (auth.uid() = user_id);

-- Players
CREATE POLICY "Users can view own players" ON players
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own players" ON players
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own players" ON players
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own players" ON players
  FOR DELETE USING (auth.uid() = user_id);

-- Seasons
CREATE POLICY "Users can view own seasons" ON seasons
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own seasons" ON seasons
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own seasons" ON seasons
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own seasons" ON seasons
  FOR DELETE USING (auth.uid() = user_id);

-- Tournaments
CREATE POLICY "Users can view own tournaments" ON tournaments
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tournaments" ON tournaments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tournaments" ON tournaments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tournaments" ON tournaments
  FOR DELETE USING (auth.uid() = user_id);

-- Games
CREATE POLICY "Users can view own games" ON games
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own games" ON games
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own games" ON games
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own games" ON games
  FOR DELETE USING (auth.uid() = user_id);

-- App settings
CREATE POLICY "Users can view own settings" ON app_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON app_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON app_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_migration_status_updated_at BEFORE UPDATE ON migration_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();