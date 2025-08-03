/**
 * Data transformation utilities for converting localStorage data to Supabase format
 * These functions handle the migration from localStorage structure to normalized database schema
 */

import type { 
  Player, 
  Season, 
  Tournament, 
  AppState, 
  GameEvent, 
  PlayerAssessment,
  TacticalDisc,
  Point,
  Opponent,
  IntervalLog
} from '@/types';

// Supabase database types (based on schema)
export interface SupabasePlayer {
  id?: string;
  user_id: string;
  name: string;
  nickname?: string | null;
  jersey_number?: string | null;
  notes?: string | null;
  is_goalie: boolean;
  received_fair_play_card: boolean;
}

export interface SupabaseSeason {
  id?: string;
  user_id: string;
  name: string;
  location?: string | null;
  period_count?: number | null;
  period_duration?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  game_dates?: string[] | null;
  archived: boolean;
  default_roster_ids?: string[] | null;
  notes?: string | null;
  color?: string | null;
  badge?: string | null;
  age_group?: string | null;
}

export interface SupabaseTournament {
  id?: string;
  user_id: string;
  name: string;
  location?: string | null;
  period_count?: number | null;
  period_duration?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  game_dates?: string[] | null;
  archived: boolean;
  default_roster_ids?: string[] | null;
  notes?: string | null;
  color?: string | null;
  badge?: string | null;
  level?: string | null;
  age_group?: string | null;
}

export interface SupabaseGame {
  id?: string;
  user_id: string;
  season_id?: string | null;
  tournament_id?: string | null;
  team_name: string;
  opponent_name: string;
  game_date: string;
  game_time?: string | null;
  game_location?: string | null;
  home_or_away: 'home' | 'away';
  number_of_periods: 1 | 2;
  period_duration_minutes: number;
  sub_interval_minutes?: number | null;
  home_score: number;
  away_score: number;
  current_period: number;
  game_status: 'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd';
  is_played?: boolean;
  show_player_names: boolean;
  game_notes?: string | null;
  tournament_level?: string | null;
  age_group?: string | null;
  demand_factor?: number | null;
  last_sub_confirmation_time_seconds?: number | null;
  tactical_ball_position?: Point | null;
}

export interface SupabaseGamePlayer {
  game_id: string;
  player_id: string;
  rel_x?: number | null;
  rel_y?: number | null;
  color?: string | null;
  is_selected: boolean;
  is_on_field: boolean;
}

export interface SupabaseGameOpponent {
  game_id: string;
  opponent_id: string;
  rel_x: number;
  rel_y: number;
}

export interface SupabaseGameEvent {
  id?: string;
  game_id: string;
  event_type: 'goal' | 'opponentGoal' | 'substitution' | 'periodEnd' | 'gameEnd' | 'fairPlayCard';
  time_seconds: number;
  scorer_id?: string | null;
  assister_id?: string | null;
  entity_id?: string | null;
}

export interface SupabasePlayerAssessment {
  game_id: string;
  player_id: string;
  overall_rating: number;
  intensity: number;
  courage: number;
  duels: number;
  technique: number;
  creativity: number;
  decisions: number;
  awareness: number;
  teamwork: number;
  fair_play: number;
  impact: number;
  notes?: string | null;
  minutes_played: number;
  created_by: string;
}

export interface SupabaseAppSettings {
  user_id: string;
  current_game_id?: string | null;
  last_home_team_name?: string | null;
  language: string;
  has_seen_app_guide: boolean;
  auto_backup_enabled: boolean;
  auto_backup_interval_hours: number;
  use_demand_correction: boolean;
  install_prompt_dismissed?: number | null;
}

// Transform functions

/**
 * Transform localStorage Player to Supabase format
 */
export function transformPlayerToSupabase(player: Player, userId: string): SupabasePlayer {
  return {
    id: player.id,
    user_id: userId,
    name: player.name,
    nickname: player.nickname || null,
    jersey_number: player.jerseyNumber || null,
    notes: player.notes || null,
    is_goalie: player.isGoalie || false,
    received_fair_play_card: player.receivedFairPlayCard || false
  };
}

/**
 * Transform localStorage Season to Supabase format
 */
export function transformSeasonToSupabase(season: Season, userId: string): SupabaseSeason {
  return {
    id: season.id,
    user_id: userId,
    name: season.name,
    location: season.location || null,
    period_count: season.periodCount || null,
    period_duration: season.periodDuration || null,
    start_date: season.startDate || null,
    end_date: season.endDate || null,
    game_dates: season.gameDates || null,
    archived: season.archived || false,
    default_roster_ids: season.defaultRoster || null,
    notes: season.notes || null,
    color: season.color || null,
    badge: season.badge || null,
    age_group: season.ageGroup || null
  };
}

/**
 * Transform localStorage Tournament to Supabase format
 */
export function transformTournamentToSupabase(tournament: Tournament, userId: string): SupabaseTournament {
  return {
    id: tournament.id,
    user_id: userId,
    name: tournament.name,
    location: tournament.location || null,
    period_count: tournament.periodCount || null,
    period_duration: tournament.periodDuration || null,
    start_date: tournament.startDate || null,
    end_date: tournament.endDate || null,
    game_dates: tournament.gameDates || null,
    archived: tournament.archived || false,
    default_roster_ids: tournament.defaultRoster || null,
    notes: tournament.notes || null,
    color: tournament.color || null,
    badge: tournament.badge || null,
    level: tournament.level || null,
    age_group: tournament.ageGroup || null
  };
}

/**
 * Transform localStorage AppState to Supabase Game format
 */
export function transformGameToSupabase(gameId: string, appState: AppState, userId: string): SupabaseGame {
  return {
    id: gameId,
    user_id: userId,
    season_id: appState.seasonId || null,
    tournament_id: appState.tournamentId || null,
    team_name: appState.teamName,
    opponent_name: appState.opponentName,
    game_date: appState.gameDate,
    game_time: appState.gameTime || null,
    game_location: appState.gameLocation || null,
    home_or_away: appState.homeOrAway,
    number_of_periods: appState.numberOfPeriods,
    period_duration_minutes: appState.periodDurationMinutes,
    sub_interval_minutes: appState.subIntervalMinutes || null,
    home_score: appState.homeScore,
    away_score: appState.awayScore,
    current_period: appState.currentPeriod,
    game_status: appState.gameStatus,
    is_played: appState.isPlayed || false,
    show_player_names: appState.showPlayerNames,
    game_notes: appState.gameNotes || null,
    tournament_level: appState.tournamentLevel || null,
    age_group: appState.ageGroup || null,
    demand_factor: appState.demandFactor || null,
    last_sub_confirmation_time_seconds: appState.lastSubConfirmationTimeSeconds || null,
    tactical_ball_position: appState.tacticalBallPosition || null
  };
}

/**
 * Transform players from AppState to Supabase GamePlayer format
 */
export function transformGamePlayersToSupabase(gameId: string, appState: AppState): SupabaseGamePlayer[] {
  const gamePlayersList: SupabaseGamePlayer[] = [];
  
  // Transform players on field
  appState.playersOnField.forEach(player => {
    gamePlayersList.push({
      game_id: gameId,
      player_id: player.id,
      rel_x: player.relX || null,
      rel_y: player.relY || null,
      color: player.color || null,
      is_selected: appState.selectedPlayerIds.includes(player.id),
      is_on_field: true
    });
  });
  
  // Transform available players (not on field)
  appState.availablePlayers.forEach(player => {
    // Only add if not already in playersOnField
    if (!appState.playersOnField.find(p => p.id === player.id)) {
      gamePlayersList.push({
        game_id: gameId,
        player_id: player.id,
        rel_x: null,
        rel_y: null,
        color: player.color || null,
        is_selected: appState.selectedPlayerIds.includes(player.id),
        is_on_field: false
      });
    }
  });
  
  return gamePlayersList;
}

/**
 * Transform opponents from AppState to Supabase format
 */
export function transformGameOpponentsToSupabase(gameId: string, opponents: Opponent[]): SupabaseGameOpponent[] {
  return opponents.map(opponent => ({
    game_id: gameId,
    opponent_id: opponent.id,
    rel_x: opponent.relX,
    rel_y: opponent.relY
  }));
}

/**
 * Transform game events from AppState to Supabase format with type-specific handling
 */
export function transformGameEventsToSupabase(gameId: string, events: GameEvent[]): SupabaseGameEvent[] {
  return events.map(event => {
    let scorerId: string | null = null;
    let assisterId: string | null = null;
    let entityId: string | null = null;
    
    // Type-specific handling
    if (event.type === 'goal') {
      // Goal events must have a valid scorer
      if (!event.scorerId || event.scorerId.trim().length === 0) {
        throw new Error(`Goal event ${event.id} missing required scorerId`);
      }
      scorerId = event.scorerId;
      
      // Validate and transform assisterId if provided
      if (event.assisterId && event.assisterId.trim().length > 0) {
        assisterId = event.assisterId;
      }
    } else if (event.type === 'opponentGoal') {
      // Opponent goals don't need player IDs
      scorerId = null;
    } else if (event.type === 'substitution' || event.type === 'fairPlayCard') {
      // These events may have an entityId
      if (event.entityId && event.entityId.trim().length > 0) {
        entityId = event.entityId;
      }
    }
    
    return {
      id: event.id,
      game_id: gameId,
      event_type: event.type,
      time_seconds: event.time,
      scorer_id: scorerId,
      assister_id: assisterId,
      entity_id: entityId
    };
  });
}

/**
 * Transform player assessments from AppState to Supabase format
 */
export function transformPlayerAssessmentsToSupabase(
  gameId: string, 
  assessments: { [playerId: string]: PlayerAssessment }
): SupabasePlayerAssessment[] {
  return Object.entries(assessments).map(([playerId, assessment]) => ({
    game_id: gameId,
    player_id: playerId,
    overall_rating: assessment.overall,
    intensity: assessment.sliders.intensity,
    courage: assessment.sliders.courage,
    duels: assessment.sliders.duels,
    technique: assessment.sliders.technique,
    creativity: assessment.sliders.creativity,
    decisions: assessment.sliders.decisions,
    awareness: assessment.sliders.awareness,
    teamwork: assessment.sliders.teamwork,
    fair_play: assessment.sliders.fair_play,
    impact: assessment.sliders.impact,
    notes: assessment.notes || null,
    minutes_played: assessment.minutesPlayed,
    created_by: assessment.createdBy
  }));
}

export interface SupabaseTacticalDisc {
  game_id: string;
  disc_id: string;
  rel_x: number;
  rel_y: number;
  disc_type: 'home' | 'opponent' | 'goalie';
}

/**
 * Transform tactical discs from AppState to Supabase format
 */
export function transformTacticalDiscsToSupabase(gameId: string, discs: TacticalDisc[]): SupabaseTacticalDisc[] {
  return discs.map(disc => ({
    game_id: gameId,
    disc_id: disc.id,
    rel_x: disc.relX,
    rel_y: disc.relY,
    disc_type: disc.type
  }));
}

export interface SupabaseDrawing {
  game_id: string;
  drawing_data: Point[][];
  drawing_type: 'field' | 'tactical';
}

/**
 * Transform drawings to Supabase format (stored as JSONB)
 */
export function transformDrawingsToSupabase(gameId: string, drawings: Point[][], type: 'field' | 'tactical'): SupabaseDrawing[] {
  if (!drawings || drawings.length === 0) return [];
  
  return [{
    game_id: gameId,
    drawing_data: drawings,
    drawing_type: type
  }];
}

export interface SupabaseCompletedInterval {
  game_id: string;
  period: number;
  duration: number;
  timestamp: number;
}

/**
 * Transform completed intervals to Supabase format
 */
export function transformCompletedIntervalsToSupabase(gameId: string, intervals: IntervalLog[]): SupabaseCompletedInterval[] {
  return intervals.map(interval => ({
    game_id: gameId,
    period: interval.period,
    duration: interval.duration,
    timestamp: interval.timestamp
  }));
}

/**
 * Transform app settings to Supabase format
 */
export function transformAppSettingsToSupabase(settings: Record<string, unknown>, userId: string): SupabaseAppSettings {
  return {
    user_id: userId,
    current_game_id: (settings.currentGameId as string) || null,
    last_home_team_name: (settings.lastHomeTeamName as string) || null,
    language: (settings.language as string) || 'en',
    has_seen_app_guide: (settings.hasSeenAppGuide as boolean) || false,
    auto_backup_enabled: (settings.autoBackupEnabled as boolean) || false,
    auto_backup_interval_hours: (settings.autoBackupIntervalHours as number) || 24,
    use_demand_correction: (settings.useDemandCorrection as boolean) || false,
    install_prompt_dismissed: (settings.installPromptDismissed as number) || null
  };
}

export interface SupabaseTimerState {
  user_id: string;
  game_id: string;
  time_elapsed_seconds: number;
  timestamp: number;
}

/**
 * Transform timer state to Supabase format
 */
export function transformTimerStateToSupabase(timerState: Record<string, unknown>, userId: string): SupabaseTimerState {
  return {
    user_id: userId,
    game_id: timerState.gameId as string,
    time_elapsed_seconds: timerState.timeElapsedInSeconds as number,
    timestamp: timerState.timestamp as number
  };
}