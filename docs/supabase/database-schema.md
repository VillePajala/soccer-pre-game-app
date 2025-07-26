# Supabase Database Schema Design

## Overview
This document describes the normalized database schema for migrating from localStorage to Supabase.

## Current Data Structures Analysis

### localStorage Keys:
- `soccerSeasons` - Array of Season objects
- `soccerTournaments` - Array of Tournament objects  
- `savedSoccerGames` - Object with gameId keys containing AppState objects
- `soccerAppSettings` - User preferences and settings
- `soccerMasterRoster` - Array of Player objects
- `soccerTimerState` - Current timer state for active games
- `installPromptDismissed` - UI state

### TypeScript Interfaces:
- **Player**: Core player data with optional fields
- **Season/Tournament**: Event containers with metadata
- **AppState**: Complete game state (complex nested structure)
- **GameEvent**: Individual game events (goals, substitutions, etc.)
- **PlayerAssessment**: Post-game player evaluations
- **TacticalDisc**: Tactical board elements

## Normalized Schema Design

### Core Tables

#### 1. `users` (Auth handled by Supabase Auth)
- Supabase Auth provides: id, email, created_at, etc.

#### 2. `players` 
```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- name: text
- nickname: text (nullable)
- jersey_number: text (nullable)
- notes: text (nullable)
- is_goalie: boolean (default false)
- received_fair_play_card: boolean (default false)
- created_at: timestamp
- updated_at: timestamp
```

#### 3. `seasons`
```sql
- id: uuid (PK) 
- user_id: uuid (FK to auth.users)
- name: text
- location: text (nullable)
- period_count: integer (nullable)
- period_duration: integer (nullable)
- start_date: date (nullable)
- end_date: date (nullable)
- game_dates: jsonb (nullable, array of dates)
- archived: boolean (default false)
- default_roster_ids: jsonb (nullable, array of player IDs)
- notes: text (nullable)
- color: text (nullable)
- badge: text (nullable)
- age_group: text (nullable)
- created_at: timestamp
- updated_at: timestamp
```

#### 4. `tournaments` 
```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- name: text
- location: text (nullable)
- period_count: integer (nullable)
- period_duration: integer (nullable)
- start_date: date (nullable)
- end_date: date (nullable)
- game_dates: jsonb (nullable, array of dates)
- archived: boolean (default false)
- default_roster_ids: jsonb (nullable, array of player IDs)
- notes: text (nullable)
- color: text (nullable)
- badge: text (nullable)
- level: text (nullable)
- age_group: text (nullable)
- created_at: timestamp
- updated_at: timestamp
```

#### 5. `games`
```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- season_id: uuid (FK to seasons, nullable)
- tournament_id: uuid (FK to tournaments, nullable)
- team_name: text
- opponent_name: text
- game_date: date
- game_time: text (nullable)
- game_location: text (nullable)
- home_or_away: text CHECK (home_or_away IN ('home', 'away'))
- number_of_periods: integer CHECK (number_of_periods IN (1, 2))
- period_duration_minutes: integer
- sub_interval_minutes: integer (nullable)
- home_score: integer (default 0)
- away_score: integer (default 0)
- current_period: integer (default 1)
- game_status: text CHECK (game_status IN ('notStarted', 'inProgress', 'periodEnd', 'gameEnd'))
- is_played: boolean (default false)
- show_player_names: boolean (default true)
- game_notes: text (nullable)
- tournament_level: text (nullable)
- age_group: text (nullable)
- demand_factor: numeric (nullable)
- last_sub_confirmation_time_seconds: integer (nullable)
- tactical_ball_position: jsonb (nullable, Point object)
- created_at: timestamp
- updated_at: timestamp
```

#### 6. `game_players` (Players on field for a game)
```sql
- id: uuid (PK)
- game_id: uuid (FK to games)
- player_id: uuid (FK to players)
- rel_x: numeric (nullable, 0.0 to 1.0)
- rel_y: numeric (nullable, 0.0 to 1.0)
- color: text (nullable)
- is_selected: boolean (default false)
- is_on_field: boolean (default false)
- created_at: timestamp
```

#### 7. `game_opponents` (Opponent positions)
```sql
- id: uuid (PK)
- game_id: uuid (FK to games)
- opponent_id: text
- rel_x: numeric
- rel_y: numeric
- created_at: timestamp
```

#### 8. `game_events`
```sql
- id: uuid (PK)
- game_id: uuid (FK to games)
- event_type: text CHECK (event_type IN ('goal', 'opponentGoal', 'substitution', 'periodEnd', 'gameEnd', 'fairPlayCard'))
- time_seconds: integer
- scorer_id: uuid (FK to players, nullable)
- assister_id: uuid (FK to players, nullable)
- entity_id: text (nullable)
- created_at: timestamp
```

#### 9. `game_drawings` (Field drawings)
```sql
- id: uuid (PK)
- game_id: uuid (FK to games)
- drawing_data: jsonb (array of Point arrays)
- drawing_type: text (default 'field')
- created_at: timestamp
```

#### 10. `tactical_discs`
```sql
- id: uuid (PK)
- game_id: uuid (FK to games)
- disc_id: text
- rel_x: numeric
- rel_y: numeric
- disc_type: text CHECK (disc_type IN ('home', 'opponent', 'goalie'))
- created_at: timestamp
```

#### 11. `tactical_drawings`
```sql
- id: uuid (PK)
- game_id: uuid (FK to games)
- drawing_data: jsonb (array of Point arrays)
- created_at: timestamp
```

#### 12. `player_assessments`
```sql
- id: uuid (PK)
- game_id: uuid (FK to games)
- player_id: uuid (FK to players)
- overall_rating: integer CHECK (overall_rating >= 1 AND overall_rating <= 10)
- intensity: integer CHECK (intensity >= 1 AND intensity <= 10)
- courage: integer CHECK (courage >= 1 AND courage <= 10)
- duels: integer CHECK (duels >= 1 AND duels <= 10)
- technique: integer CHECK (technique >= 1 AND technique <= 10)
- creativity: integer CHECK (creativity >= 1 AND creativity <= 10)
- decisions: integer CHECK (decisions >= 1 AND decisions <= 10)
- awareness: integer CHECK (awareness >= 1 AND awareness <= 10)
- teamwork: integer CHECK (teamwork >= 1 AND teamwork <= 10)
- fair_play: integer CHECK (fair_play >= 1 AND fair_play <= 10)
- impact: integer CHECK (impact >= 1 AND impact <= 10)
- notes: text (nullable)
- minutes_played: integer
- created_by: text
- created_at: timestamp
```

#### 13. `completed_intervals`
```sql
- id: uuid (PK)
- game_id: uuid (FK to games)
- period: integer
- duration: integer
- timestamp: bigint
- created_at: timestamp
```

#### 14. `app_settings`
```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- current_game_id: uuid (FK to games, nullable)
- last_home_team_name: text (nullable)
- language: text (default 'en')
- has_seen_app_guide: boolean (default false)
- auto_backup_enabled: boolean (default false)
- auto_backup_interval_hours: integer (default 24)
- use_demand_correction: boolean (default false)
- install_prompt_dismissed: bigint (nullable)
- created_at: timestamp
- updated_at: timestamp
```

#### 15. `timer_states`
```sql
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- game_id: uuid (FK to games)
- time_elapsed_seconds: integer
- timestamp: bigint
- created_at: timestamp
- updated_at: timestamp
```

## Row Level Security (RLS) Policies

All tables (except auth.users) will have RLS enabled with policies that ensure:
- Users can only access their own data
- Policy: `(auth.uid() = user_id)`

## Indexes

Strategic indexes for common queries:
- `players.user_id`
- `games.user_id`, `games.season_id`, `games.tournament_id`
- `game_events.game_id`, `game_events.event_type`
- `player_assessments.game_id`, `player_assessments.player_id`
- `app_settings.user_id` (unique)
- `timer_states.user_id`, `timer_states.game_id`

## Data Migration Considerations

1. **ID Migration**: Keep existing string IDs from localStorage or generate new UUIDs
2. **JSONB Usage**: Some complex nested data (drawings, positions) stored as JSONB for flexibility
3. **Normalization**: AppState broken into multiple related tables for better queries
4. **Constraints**: Added CHECK constraints for data integrity
5. **Timestamps**: Added created_at/updated_at for audit trails