-- Supabase Schema for Soccer Coach App
-- Migration from localStorage to Supabase
-- Generated: 2025-01-23

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security on all tables
-- Auth is handled by Supabase Auth (auth.users table)

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT,
  jersey_number TEXT,
  notes TEXT,
  is_goalie BOOLEAN DEFAULT FALSE,
  received_fair_play_card BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- RLS Policy for players
CREATE POLICY "Users can only access their own players" ON players
  FOR ALL USING (auth.uid() = user_id);

-- Seasons table
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  period_count INTEGER,
  period_duration INTEGER,
  start_date DATE,
  end_date DATE,
  game_dates JSONB,
  archived BOOLEAN DEFAULT FALSE,
  default_roster_ids JSONB,
  notes TEXT,
  color TEXT,
  badge TEXT,
  age_group TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- RLS Policy for seasons
CREATE POLICY "Users can only access their own seasons" ON seasons
  FOR ALL USING (auth.uid() = user_id);

-- Tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  period_count INTEGER,
  period_duration INTEGER,
  start_date DATE,
  end_date DATE,
  game_dates JSONB,
  archived BOOLEAN DEFAULT FALSE,
  default_roster_ids JSONB,
  notes TEXT,
  color TEXT,
  badge TEXT,
  level TEXT,
  age_group TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- RLS Policy for tournaments
CREATE POLICY "Users can only access their own tournaments" ON tournaments
  FOR ALL USING (auth.uid() = user_id);

-- Games table (main game state)
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  team_name TEXT NOT NULL,
  opponent_name TEXT NOT NULL,
  game_date DATE NOT NULL,
  game_time TEXT,
  game_location TEXT,
  home_or_away TEXT CHECK (home_or_away IN ('home', 'away')) NOT NULL,
  number_of_periods INTEGER CHECK (number_of_periods IN (1, 2)) NOT NULL,
  period_duration_minutes INTEGER NOT NULL,
  sub_interval_minutes INTEGER,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  current_period INTEGER DEFAULT 1,
  game_status TEXT CHECK (game_status IN ('notStarted', 'inProgress', 'periodEnd', 'gameEnd')) DEFAULT 'notStarted',
  is_played BOOLEAN DEFAULT FALSE,
  show_player_names BOOLEAN DEFAULT TRUE,
  game_notes TEXT,
  tournament_level TEXT,
  age_group TEXT,
  demand_factor NUMERIC,
  last_sub_confirmation_time_seconds INTEGER,
  tactical_ball_position JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- RLS Policy for games
CREATE POLICY "Users can only access their own games" ON games
  FOR ALL USING (auth.uid() = user_id);

-- Game players (players on field and available for a specific game)
CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  rel_x NUMERIC CHECK (rel_x >= 0 AND rel_x <= 1),
  rel_y NUMERIC CHECK (rel_y >= 0 AND rel_y <= 1),
  color TEXT,
  is_selected BOOLEAN DEFAULT FALSE,
  is_on_field BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Enable RLS
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- RLS Policy for game_players
CREATE POLICY "Users can only access their own game players" ON game_players
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
  );

-- Game opponents (opponent player positions)
CREATE TABLE game_opponents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  opponent_id TEXT NOT NULL,
  rel_x NUMERIC NOT NULL CHECK (rel_x >= 0 AND rel_x <= 1),
  rel_y NUMERIC NOT NULL CHECK (rel_y >= 0 AND rel_y <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE game_opponents ENABLE ROW LEVEL SECURITY;

-- RLS Policy for game_opponents
CREATE POLICY "Users can only access their own game opponents" ON game_opponents
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
  );

-- Game events (goals, substitutions, etc.)
CREATE TABLE game_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN ('goal', 'opponentGoal', 'substitution', 'periodEnd', 'gameEnd', 'fairPlayCard')) NOT NULL,
  time_seconds INTEGER NOT NULL,
  scorer_id UUID REFERENCES players(id) ON DELETE SET NULL,
  assister_id UUID REFERENCES players(id) ON DELETE SET NULL,
  entity_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy for game_events
CREATE POLICY "Users can only access their own game events" ON game_events
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
  );

-- Game drawings (field drawings)
CREATE TABLE game_drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  drawing_data JSONB NOT NULL,
  drawing_type TEXT DEFAULT 'field',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE game_drawings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for game_drawings
CREATE POLICY "Users can only access their own game drawings" ON game_drawings
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
  );

-- Tactical discs
CREATE TABLE tactical_discs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  disc_id TEXT NOT NULL,
  rel_x NUMERIC NOT NULL CHECK (rel_x >= 0 AND rel_x <= 1),
  rel_y NUMERIC NOT NULL CHECK (rel_y >= 0 AND rel_y <= 1),
  disc_type TEXT CHECK (disc_type IN ('home', 'opponent', 'goalie')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tactical_discs ENABLE ROW LEVEL SECURITY;

-- RLS Policy for tactical_discs
CREATE POLICY "Users can only access their own tactical discs" ON tactical_discs
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
  );

-- Tactical drawings
CREATE TABLE tactical_drawings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  drawing_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tactical_drawings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for tactical_drawings
CREATE POLICY "Users can only access their own tactical drawings" ON tactical_drawings
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
  );

-- Player assessments (post-game evaluations)
CREATE TABLE player_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 10) NOT NULL,
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 10) NOT NULL,
  courage INTEGER CHECK (courage >= 1 AND courage <= 10) NOT NULL,
  duels INTEGER CHECK (duels >= 1 AND duels <= 10) NOT NULL,
  technique INTEGER CHECK (technique >= 1 AND technique <= 10) NOT NULL,
  creativity INTEGER CHECK (creativity >= 1 AND creativity <= 10) NOT NULL,
  decisions INTEGER CHECK (decisions >= 1 AND decisions <= 10) NOT NULL,
  awareness INTEGER CHECK (awareness >= 1 AND awareness <= 10) NOT NULL,
  teamwork INTEGER CHECK (teamwork >= 1 AND teamwork <= 10) NOT NULL,
  fair_play INTEGER CHECK (fair_play >= 1 AND fair_play <= 10) NOT NULL,
  impact INTEGER CHECK (impact >= 1 AND impact <= 10) NOT NULL,
  notes TEXT,
  minutes_played INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Enable RLS
ALTER TABLE player_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policy for player_assessments
CREATE POLICY "Users can only access their own player assessments" ON player_assessments
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
  );

-- Completed intervals (game timing)
CREATE TABLE completed_intervals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  period INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE completed_intervals ENABLE ROW LEVEL SECURITY;

-- RLS Policy for completed_intervals
CREATE POLICY "Users can only access their own completed intervals" ON completed_intervals
  FOR ALL USING (
    game_id IN (SELECT id FROM games WHERE user_id = auth.uid())
  );

-- App settings (user preferences)
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  last_home_team_name TEXT,
  language TEXT DEFAULT 'en',
  has_seen_app_guide BOOLEAN DEFAULT FALSE,
  auto_backup_enabled BOOLEAN DEFAULT FALSE,
  auto_backup_interval_hours INTEGER DEFAULT 24,
  use_demand_correction BOOLEAN DEFAULT FALSE,
  install_prompt_dismissed BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for app_settings
CREATE POLICY "Users can only access their own app settings" ON app_settings
  FOR ALL USING (auth.uid() = user_id);

-- Timer states (active game timers)
CREATE TABLE timer_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  time_elapsed_seconds INTEGER NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

-- Enable RLS
ALTER TABLE timer_states ENABLE ROW LEVEL SECURITY;

-- RLS Policy for timer_states
CREATE POLICY "Users can only access their own timer states" ON timer_states
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Players indexes
CREATE INDEX idx_players_user_id ON players(user_id);
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_players_is_goalie ON players(is_goalie);

-- Seasons indexes
CREATE INDEX idx_seasons_user_id ON seasons(user_id);
CREATE INDEX idx_seasons_archived ON seasons(archived);

-- Tournaments indexes
CREATE INDEX idx_tournaments_user_id ON tournaments(user_id);
CREATE INDEX idx_tournaments_archived ON tournaments(archived);

-- Games indexes
CREATE INDEX idx_games_user_id ON games(user_id);
CREATE INDEX idx_games_season_id ON games(season_id);
CREATE INDEX idx_games_tournament_id ON games(tournament_id);
CREATE INDEX idx_games_game_date ON games(game_date);
CREATE INDEX idx_games_status ON games(game_status);

-- Game players indexes
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_player_id ON game_players(player_id);
CREATE INDEX idx_game_players_on_field ON game_players(is_on_field);

-- Game events indexes
CREATE INDEX idx_game_events_game_id ON game_events(game_id);
CREATE INDEX idx_game_events_type ON game_events(event_type);
CREATE INDEX idx_game_events_time ON game_events(time_seconds);

-- Player assessments indexes
CREATE INDEX idx_player_assessments_game_id ON player_assessments(game_id);
CREATE INDEX idx_player_assessments_player_id ON player_assessments(player_id);

-- App settings indexes (unique constraint already covers this)
-- Timer states indexes
CREATE INDEX idx_timer_states_user_id ON timer_states(user_id);
CREATE INDEX idx_timer_states_game_id ON timer_states(game_id);

-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to tables with updated_at columns
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

CREATE TRIGGER update_timer_states_updated_at BEFORE UPDATE ON timer_states 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE players IS 'Master roster of players for each user';
COMMENT ON TABLE seasons IS 'Seasonal competitions and events';
COMMENT ON TABLE tournaments IS 'Tournament competitions and events';
COMMENT ON TABLE games IS 'Individual games/matches with full state';
COMMENT ON TABLE game_players IS 'Players participating in a specific game';
COMMENT ON TABLE game_opponents IS 'Opponent player positions for a game';
COMMENT ON TABLE game_events IS 'All events that occur during a game';
COMMENT ON TABLE game_drawings IS 'Field drawings made during a game';
COMMENT ON TABLE tactical_discs IS 'Tactical board disc positions';
COMMENT ON TABLE tactical_drawings IS 'Tactical board drawings';
COMMENT ON TABLE player_assessments IS 'Post-game player performance evaluations';
COMMENT ON TABLE completed_intervals IS 'Game timing interval logs';
COMMENT ON TABLE app_settings IS 'User application preferences and settings';
COMMENT ON TABLE timer_states IS 'Active game timer states';