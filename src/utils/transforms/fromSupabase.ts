/**
 * Data transformation utilities for converting Supabase data back to application format
 * These functions handle the conversion from normalized database schema to localStorage-compatible structures
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

import type {
  SupabasePlayer,
  SupabaseSeason,
  SupabaseTournament,
  SupabaseGame,
  SupabaseGamePlayer,
  SupabaseGameOpponent,
  SupabaseGameEvent,
  SupabasePlayerAssessment,
  SupabaseAppSettings
} from './toSupabase';

/**
 * Transform Supabase Player back to application format
 */
export function transformPlayerFromSupabase(supabasePlayer: SupabasePlayer): Player {
  return {
    id: supabasePlayer.id!,
    name: supabasePlayer.name,
    nickname: supabasePlayer.nickname || undefined,
    jerseyNumber: supabasePlayer.jersey_number ? String(supabasePlayer.jersey_number) : undefined,
    notes: supabasePlayer.notes || undefined,
    isGoalie: supabasePlayer.is_goalie,
    receivedFairPlayCard: supabasePlayer.received_fair_play_card
  };
}

/**
 * Transform Supabase Season back to application format
 */
export function transformSeasonFromSupabase(supabaseSeason: SupabaseSeason): Season {
  return {
    id: supabaseSeason.id!,
    name: supabaseSeason.name,
    location: supabaseSeason.location || undefined,
    periodCount: supabaseSeason.period_count || undefined,
    periodDuration: supabaseSeason.period_duration || undefined,
    startDate: supabaseSeason.start_date || undefined,
    endDate: supabaseSeason.end_date || undefined,
    gameDates: supabaseSeason.game_dates || undefined,
    archived: supabaseSeason.archived,
    defaultRoster: supabaseSeason.default_roster_ids || undefined,
    notes: supabaseSeason.notes || undefined,
    color: supabaseSeason.color || undefined,
    badge: supabaseSeason.badge || undefined,
    ageGroup: supabaseSeason.age_group || undefined
  };
}

/**
 * Transform Supabase Tournament back to application format
 */
export function transformTournamentFromSupabase(supabaseTournament: SupabaseTournament): Tournament {
  return {
    id: supabaseTournament.id!,
    name: supabaseTournament.name,
    location: supabaseTournament.location || undefined,
    periodCount: supabaseTournament.period_count || undefined,
    periodDuration: supabaseTournament.period_duration || undefined,
    startDate: supabaseTournament.start_date || undefined,
    endDate: supabaseTournament.end_date || undefined,
    gameDates: supabaseTournament.game_dates || undefined,
    archived: supabaseTournament.archived,
    defaultRoster: supabaseTournament.default_roster_ids || undefined,
    notes: supabaseTournament.notes || undefined,
    color: supabaseTournament.color || undefined,
    badge: supabaseTournament.badge || undefined,
    level: supabaseTournament.level || undefined,
    ageGroup: supabaseTournament.age_group || undefined
  };
}

/**
 * Transform Supabase Game Event back to application format
 */
export function transformGameEventFromSupabase(supabaseEvent: SupabaseGameEvent): GameEvent {
  // Handle type-specific transformations
  switch (supabaseEvent.event_type) {
    case 'goal':
      // Goal events must have a scorer
      if (!supabaseEvent.scorer_id) {
        throw new Error(`Goal event ${supabaseEvent.id} missing required scorer_id`);
      }
      return {
        id: supabaseEvent.id!,
        type: 'goal',
        time: supabaseEvent.time_seconds,
        scorerId: supabaseEvent.scorer_id,
        assisterId: supabaseEvent.assister_id || undefined,
      };
    
    case 'opponentGoal':
      return {
        id: supabaseEvent.id!,
        type: 'opponentGoal',
        time: supabaseEvent.time_seconds,
        scorerId: supabaseEvent.scorer_id || undefined,
      };
    
    case 'substitution':
      return {
        id: supabaseEvent.id!,
        type: 'substitution',
        time: supabaseEvent.time_seconds,
        entityId: supabaseEvent.entity_id || undefined,
      };
    
    case 'periodEnd':
      return {
        id: supabaseEvent.id!,
        type: 'periodEnd',
        time: supabaseEvent.time_seconds,
      };
    
    case 'gameEnd':
      return {
        id: supabaseEvent.id!,
        type: 'gameEnd',
        time: supabaseEvent.time_seconds,
      };
    
    case 'fairPlayCard':
      return {
        id: supabaseEvent.id!,
        type: 'fairPlayCard',
        time: supabaseEvent.time_seconds,
        entityId: supabaseEvent.entity_id || undefined,
      };
    
    default:
      throw new Error(`Unknown event type: ${supabaseEvent.event_type}`);
  }
}

/**
 * Transform Supabase Player Assessment back to application format
 */
export function transformPlayerAssessmentFromSupabase(supabaseAssessment: SupabasePlayerAssessment): PlayerAssessment {
  return {
    overall: supabaseAssessment.overall_rating,
    sliders: {
      intensity: supabaseAssessment.intensity,
      courage: supabaseAssessment.courage,
      duels: supabaseAssessment.duels,
      technique: supabaseAssessment.technique,
      creativity: supabaseAssessment.creativity,
      decisions: supabaseAssessment.decisions,
      awareness: supabaseAssessment.awareness,
      teamwork: supabaseAssessment.teamwork,
      fair_play: supabaseAssessment.fair_play,
      impact: supabaseAssessment.impact
    },
    notes: supabaseAssessment.notes || '',
    minutesPlayed: supabaseAssessment.minutes_played,
    createdAt: Date.now(), // Will need to convert from DB timestamp
    createdBy: supabaseAssessment.created_by
  };
}

/**
 * Transform Supabase Game Opponent back to application format
 */
export function transformGameOpponentFromSupabase(supabaseOpponent: SupabaseGameOpponent): Opponent {
  return {
    id: supabaseOpponent.opponent_id,
    relX: supabaseOpponent.rel_x,
    relY: supabaseOpponent.rel_y
  };
}

import type { 
  SupabaseTacticalDisc, 
  SupabaseCompletedInterval, 
  SupabaseDrawing,
  SupabaseTimerState 
} from './toSupabase';

/**
 * Transform Supabase Tactical Disc back to application format
 */
export function transformTacticalDiscFromSupabase(supabaseDisc: SupabaseTacticalDisc): TacticalDisc {
  return {
    id: supabaseDisc.disc_id,
    relX: supabaseDisc.rel_x,
    relY: supabaseDisc.rel_y,
    type: supabaseDisc.disc_type
  };
}

/**
 * Transform Supabase Completed Interval back to application format
 */
export function transformCompletedIntervalFromSupabase(supabaseInterval: SupabaseCompletedInterval): IntervalLog {
  return {
    period: supabaseInterval.period,
    duration: supabaseInterval.duration,
    timestamp: supabaseInterval.timestamp
  };
}

/**
 * Reconstruct full AppState from normalized Supabase data
 * This is the complex function that reassembles the game state from multiple tables
 */

export interface SupabaseGameData {
  game: SupabaseGame;
  gamePlayers: SupabaseGamePlayer[];
  gameOpponents: SupabaseGameOpponent[];
  gameEvents: SupabaseGameEvent[];
  playerAssessments: SupabasePlayerAssessment[];
  tacticalDiscs: SupabaseTacticalDisc[];
  gameDrawings: SupabaseDrawing[];
  tacticalDrawings: SupabaseDrawing[];
  completedIntervals: SupabaseCompletedInterval[];
  players: SupabasePlayer[]; // Full player data for reference
}

export function reconstructAppStateFromSupabase(data: SupabaseGameData): AppState {
  const { game, gamePlayers, gameOpponents, gameEvents, playerAssessments, tacticalDiscs, gameDrawings, tacticalDrawings, completedIntervals, players } = data;
  
  // Create player lookup map
  const playerMap = new Map(players.map(p => [p.id!, transformPlayerFromSupabase(p)]));
  
  // Separate on-field and available players
  const playersOnField: Player[] = [];
  const availablePlayers: Player[] = [];
  const selectedPlayerIds: string[] = [];
  
  gamePlayers.forEach(gamePlayer => {
    const player = playerMap.get(gamePlayer.player_id);
    if (player) {
      // Add position data if player is on field
      if (gamePlayer.is_on_field) {
        const fieldPlayer = {
          ...player,
          relX: gamePlayer.rel_x || undefined,
          relY: gamePlayer.rel_y || undefined,
          color: gamePlayer.color || undefined
        };
        playersOnField.push(fieldPlayer);
      } else {
        availablePlayers.push({
          ...player,
          color: gamePlayer.color || undefined
        });
      }
      
      // Track selected players
      if (gamePlayer.is_selected) {
        selectedPlayerIds.push(gamePlayer.player_id);
      }
    }
  });
  
  // Transform opponents
  const opponents: Opponent[] = gameOpponents.map(transformGameOpponentFromSupabase);
  
  // Transform game events
  const transformedGameEvents: GameEvent[] = gameEvents.map(transformGameEventFromSupabase);
  
  // Transform player assessments
  const assessments: { [playerId: string]: PlayerAssessment } = {};
  playerAssessments.forEach(assessment => {
    assessments[assessment.player_id] = transformPlayerAssessmentFromSupabase(assessment);
  });
  
  // Transform tactical discs
  const transformedTacticalDiscs: TacticalDisc[] = tacticalDiscs.map(transformTacticalDiscFromSupabase);
  
  // Extract drawings from JSONB
  const drawings: Point[][] = gameDrawings.length > 0 ? gameDrawings[0].drawing_data || [] : [];
  const tacticalDrawingsData: Point[][] = tacticalDrawings.length > 0 ? tacticalDrawings[0].drawing_data || [] : [];
  
  // Transform completed intervals
  const transformedCompletedIntervals: IntervalLog[] = completedIntervals.map(transformCompletedIntervalFromSupabase);
  
  // Reconstruct full AppState
  const appState: AppState = {
    playersOnField,
    opponents,
    drawings,
    availablePlayers,
    showPlayerNames: game.show_player_names,
    teamName: game.team_name,
    gameEvents: transformedGameEvents,
    opponentName: game.opponent_name,
    gameDate: game.game_date,
    homeScore: game.home_score,
    awayScore: game.away_score,
    gameNotes: game.game_notes || '',
    homeOrAway: game.home_or_away,
    numberOfPeriods: game.number_of_periods,
    periodDurationMinutes: game.period_duration_minutes,
    currentPeriod: game.current_period,
    gameStatus: game.game_status,
    isPlayed: game.is_played || false,
    selectedPlayerIds,
    assessments,
    seasonId: game.season_id || '',
    tournamentId: game.tournament_id || '',
    tournamentLevel: game.tournament_level || undefined,
    ageGroup: game.age_group || undefined,
    demandFactor: game.demand_factor || undefined,
    gameLocation: game.game_location || undefined,
    gameTime: game.game_time || undefined,
    subIntervalMinutes: game.sub_interval_minutes || undefined,
    completedIntervalDurations: transformedCompletedIntervals,
    lastSubConfirmationTimeSeconds: game.last_sub_confirmation_time_seconds || undefined,
    tacticalDiscs: transformedTacticalDiscs,
    tacticalDrawings: tacticalDrawingsData,
    tacticalBallPosition: game.tactical_ball_position || null
  };
  
  return appState;
}

/**
 * Transform Supabase App Settings back to application format
 */
export function transformAppSettingsFromSupabase(supabaseSettings: SupabaseAppSettings): Record<string, unknown> {
  return {
    currentGameId: supabaseSettings.current_game_id || null,
    lastHomeTeamName: supabaseSettings.last_home_team_name || '',
    language: supabaseSettings.language,
    hasSeenAppGuide: supabaseSettings.has_seen_app_guide,
    autoBackupEnabled: supabaseSettings.auto_backup_enabled,
    autoBackupIntervalHours: supabaseSettings.auto_backup_interval_hours,
    useDemandCorrection: supabaseSettings.use_demand_correction,
    installPromptDismissed: supabaseSettings.install_prompt_dismissed?.toString() || undefined
  };
}

/**
 * Transform Supabase Timer State back to application format
 */
export function transformTimerStateFromSupabase(supabaseTimerState: SupabaseTimerState): Record<string, unknown> {
  return {
    gameId: supabaseTimerState.game_id,
    timeElapsedInSeconds: supabaseTimerState.time_elapsed_seconds,
    timestamp: supabaseTimerState.timestamp
  };
}