// Data transformation utilities for Supabase migration
import type { Player, Season, Tournament } from '../../types';
import type { AppSettings } from '../appSettings';

// Database record interfaces
export interface DbPlayer {
  id: string;
  name: string;
  nickname?: string;
  jersey_number?: number;
  notes?: string;
  is_goalie: boolean;
  received_fair_play_card: boolean;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbSeason {
  id: string;
  name: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  period_count: number;
  period_duration: number;
  game_dates?: string[];
  archived?: boolean;
  default_roster_ids?: string[];
  notes?: string;
  color?: string;
  badge?: string;
  age_group?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbTournament {
  id: string;
  name: string;
  season_id?: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  format?: string;
  matches?: unknown[];
  period_count: number;
  period_duration: number;
  game_dates?: string[];
  archived?: boolean;
  default_roster_ids?: string[];
  notes?: string;
  color?: string;
  badge?: string;
  level?: string;
  age_group?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbAppSettings {
  id: string;
  language?: string;
  default_team_name?: string;
  auto_backup_enabled?: boolean;
  auto_backup_interval_hours?: number;
  last_backup_time?: string;
  backup_email?: string;
  current_game_id?: string;
  settings?: Record<string, unknown>;
  timer_settings?: Record<string, unknown>;
  ui_preferences?: Record<string, unknown>;
  game_defaults?: Record<string, unknown>;
  notification_settings?: Record<string, unknown>;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface DbGame {
  id: string;
  game_data: Record<string, unknown>;
  team_name?: string;
  opponent_name?: string;
  game_date?: string;
  home_score?: number;
  away_score?: number;
  home_or_away?: string;
  game_notes?: string;
  number_of_periods?: number;
  period_duration_minutes?: number;
  current_period?: number;
  game_status?: string;
  game_location?: string;
  game_time?: string;
  start_time?: string;
  end_time?: string;
  is_played: boolean;
  season_id?: string;
  tournament_id?: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

// Placeholder transforms for now - these would be implemented in the next phase
export const toSupabase = {
  player: (player: Player, userId: string) => {
    const result: Record<string, unknown> = {
      user_id: userId,
      name: player.name,
      nickname: player.nickname,
      jersey_number: player.jerseyNumber,  // Changed to snake_case
      notes: player.notes,
      is_goalie: player.isGoalie,
      received_fair_play_card: player.receivedFairPlayCard
    };
    // Only include id if it's not empty
    if (player.id && player.id !== '') {
      result.id = player.id;
    }
    // Remove undefined values
    return Object.fromEntries(Object.entries(result).filter(([, v]) => v !== undefined));
  },
  
  playerUpdate: (updates: Partial<Player>, userId: string) => {
    const result: Record<string, unknown> = {
      user_id: userId
    };
    
    // Only include fields that are actually being updated
    if (updates.name !== undefined) result.name = updates.name;
    if (updates.nickname !== undefined) result.nickname = updates.nickname;
    if (updates.jerseyNumber !== undefined) result.jersey_number = updates.jerseyNumber;  // Changed to snake_case
    if (updates.notes !== undefined) result.notes = updates.notes;
    if (updates.isGoalie !== undefined) result.is_goalie = updates.isGoalie;
    if (updates.receivedFairPlayCard !== undefined) result.received_fair_play_card = updates.receivedFairPlayCard;
    
    return result;
  },

  season: (season: Season, userId: string) => {
    const result: Record<string, unknown> = {
      user_id: userId,
      name: season.name,
      location: season.location,
      start_date: season.startDate,
      end_date: season.endDate,
      period_count: season.periodCount || 2,
      period_duration: season.periodDuration || 45,
      game_dates: season.gameDates,
      archived: season.archived || false,
      notes: season.notes,
      color: season.color,
      badge: season.badge,
      age_group: season.ageGroup
    };
    
    // Handle roster data - support both defaultRoster (array) and defaultRosterId (legacy string)
    if (season.defaultRoster && Array.isArray(season.defaultRoster)) {
      result.default_roster_ids = season.defaultRoster;
    } else if (season.defaultRosterId) {
      if (Array.isArray(season.defaultRosterId)) {
        result.default_roster_ids = season.defaultRosterId;
      } else {
        result.default_roster_ids = [season.defaultRosterId];
      }
    }
    
    // Only include id if it exists and is not empty
    if (season.id && season.id !== '') {
      result.id = season.id;
    }
    
    // Remove undefined values to avoid sending null/undefined to database
    return Object.fromEntries(
      Object.entries(result).filter(([, v]) => v !== undefined)
    );
  },

  seasonUpdate: (updates: Partial<Season>, userId: string) => {
    const result: Record<string, unknown> = {
      user_id: userId
    };
    
    // Map all possible update fields
    if (updates.name !== undefined) result.name = updates.name;
    if (updates.location !== undefined) result.location = updates.location;
    if (updates.startDate !== undefined) result.start_date = updates.startDate;
    if (updates.endDate !== undefined) result.end_date = updates.endDate;
    if (updates.periodCount !== undefined) result.period_count = updates.periodCount;
    if (updates.periodDuration !== undefined) result.period_duration = updates.periodDuration;
    if (updates.gameDates !== undefined) result.game_dates = updates.gameDates;
    if (updates.archived !== undefined) result.archived = updates.archived;
    if (updates.notes !== undefined) result.notes = updates.notes;
    if (updates.color !== undefined) result.color = updates.color;
    if (updates.badge !== undefined) result.badge = updates.badge;
    if (updates.ageGroup !== undefined) result.age_group = updates.ageGroup;
    
    // Handle roster updates - support both formats
    if (updates.defaultRoster !== undefined) {
      result.default_roster_ids = updates.defaultRoster;
    } else if (updates.defaultRosterId !== undefined) {
      if (Array.isArray(updates.defaultRosterId)) {
        result.default_roster_ids = updates.defaultRosterId;
      } else {
        result.default_roster_ids = [updates.defaultRosterId];
      }
    }
    
    return result;
  },

  tournament: (tournament: Tournament, userId: string) => {
    const result: Record<string, unknown> = {
      user_id: userId,
      name: tournament.name,
      season_id: tournament.seasonId || null,
      location: tournament.location,
      period_count: tournament.periodCount || 2,
      period_duration: tournament.periodDuration || 45,
      start_date: tournament.startDate,
      end_date: tournament.endDate,
      game_dates: tournament.gameDates,
      archived: tournament.archived || false,
      notes: tournament.notes,
      color: tournament.color,
      badge: tournament.badge,
      level: tournament.level,
      age_group: tournament.ageGroup
    };
    
    // Handle roster data - support both defaultRoster (array) and defaultRosterId (legacy string)
    if (tournament.defaultRoster && Array.isArray(tournament.defaultRoster)) {
      result.default_roster_ids = tournament.defaultRoster;
    } else if (tournament.defaultRosterId) {
      if (Array.isArray(tournament.defaultRosterId)) {
        result.default_roster_ids = tournament.defaultRosterId;
      } else {
        result.default_roster_ids = [tournament.defaultRosterId];
      }
    }
    
    // Only include id if it exists and is not empty
    if (tournament.id && tournament.id !== '') {
      result.id = tournament.id;
    }
    
    // Remove undefined values to avoid sending null/undefined to database
    return Object.fromEntries(
      Object.entries(result).filter(([, v]) => v !== undefined)
    );
  },

  tournamentUpdate: (updates: Partial<Tournament>, userId: string) => {
    const result: Record<string, unknown> = {
      user_id: userId
    };
    
    // Map all possible update fields
    if (updates.name !== undefined) result.name = updates.name;
    if (updates.seasonId !== undefined) result.season_id = updates.seasonId;
    if (updates.location !== undefined) result.location = updates.location;
    if (updates.periodCount !== undefined) result.period_count = updates.periodCount;
    if (updates.periodDuration !== undefined) result.period_duration = updates.periodDuration;
    if (updates.startDate !== undefined) result.start_date = updates.startDate;
    if (updates.endDate !== undefined) result.end_date = updates.endDate;
    if (updates.gameDates !== undefined) result.game_dates = updates.gameDates;
    if (updates.archived !== undefined) result.archived = updates.archived;
    if (updates.notes !== undefined) result.notes = updates.notes;
    if (updates.color !== undefined) result.color = updates.color;
    if (updates.badge !== undefined) result.badge = updates.badge;
    if (updates.level !== undefined) result.level = updates.level;
    if (updates.ageGroup !== undefined) result.age_group = updates.ageGroup;
    
    // Handle roster updates - support both formats
    if (updates.defaultRoster !== undefined) {
      result.default_roster_ids = updates.defaultRoster;
    } else if (updates.defaultRosterId !== undefined) {
      if (Array.isArray(updates.defaultRosterId)) {
        result.default_roster_ids = updates.defaultRosterId;
      } else {
        result.default_roster_ids = [updates.defaultRosterId];
      }
    }
    
    return result;
  },

  appSettings: (settings: AppSettings, userId: string) => {
    const result: Record<string, unknown> = {
      user_id: userId,
      language: settings.language || 'en',
      default_team_name: settings.lastHomeTeamName,
      auto_backup_enabled: settings.autoBackupEnabled || false,
      auto_backup_interval_hours: settings.autoBackupIntervalHours || 24,
      last_backup_time: settings.lastBackupTime,
      backup_email: settings.backupEmail,
      settings: {
        // Store non-UUID game IDs and other settings in JSONB
        currentGameId: settings.currentGameId,
        hasSeenAppGuide: settings.hasSeenAppGuide,
        useDemandCorrection: settings.useDemandCorrection
      }
    };
    
    // Only set current_game_id if it's a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (settings.currentGameId && uuidRegex.test(settings.currentGameId)) {
      result.current_game_id = settings.currentGameId;
    } else {
      result.current_game_id = null; // Set to null if not a valid UUID
    }
    
    return result;
  },

  game: (gameData: unknown, userId: string): Record<string, unknown> => {
    const game = gameData as Record<string, unknown>;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // Ensure required fields have defaults
    const result: Record<string, unknown> = {
      user_id: userId,
      team_name: game.teamName || game.homeTeam || '',
      opponent_name: game.opponentName || game.awayTeam || '',
      game_date: game.gameDate || new Date().toISOString().split('T')[0],
      home_score: game.homeScore || 0,
      away_score: game.awayScore || 0,
      home_or_away: game.homeOrAway || 'home',
      game_notes: game.gameNotes || game.notes || '',
      number_of_periods: game.numberOfPeriods || 2,
      period_duration_minutes: game.periodDurationMinutes || 45,
      current_period: game.currentPeriod || 1,
      game_status: game.gameStatus ? 
        (game.gameStatus === 'notStarted' ? 'notStarted' :
         game.gameStatus === 'inProgress' ? 'inProgress' :
         game.gameStatus === 'periodEnd' ? 'finished' :
         game.gameStatus === 'gameEnd' ? 'finished' :
         'notStarted') : 'notStarted',
      is_played: game.isPlayed !== undefined ? game.isPlayed : 
        (game.gameStatus === 'gameEnd' || game.gameStatus === 'finished'),
      season_id: game.seasonId && game.seasonId !== '' ? 
        (uuidRegex.test(game.seasonId as string) ? game.seasonId : null) : null,
      tournament_id: game.tournamentId && game.tournamentId !== '' ? 
        (uuidRegex.test(game.tournamentId as string) ? game.tournamentId : null) : null,
      game_location: game.gameLocation || null,
      game_time: game.gameTime ? 
        (typeof game.gameTime === 'string' && game.gameTime.includes(':') ? 
          game.gameTime : `${game.gameTime}:00`) : null,
      game_data: game // Store the full game data as JSONB
    };
    
    // Only include id if it's a valid UUID (not the app's custom format)
    // Otherwise, let Supabase generate a new UUID
    if (game.id && typeof game.id === 'string' && uuidRegex.test(game.id)) {
      result.id = game.id;
    }
    
    return result;
  }
};

export const fromSupabase = {
  player: (dbPlayer: DbPlayer) => ({
    id: dbPlayer.id,
    name: dbPlayer.name,
    nickname: dbPlayer.nickname,
    jerseyNumber: dbPlayer.jersey_number ? String(dbPlayer.jersey_number) : undefined,
    notes: dbPlayer.notes,
    isGoalie: dbPlayer.is_goalie,
    receivedFairPlayCard: dbPlayer.received_fair_play_card
  }),

  season: (dbSeason: DbSeason): Season => {
    const result: Partial<Season> = {
      id: dbSeason.id,
      name: dbSeason.name,
      location: dbSeason.location,
      startDate: dbSeason.start_date,
      endDate: dbSeason.end_date,
      periodCount: dbSeason.period_count || 2,
      periodDuration: dbSeason.period_duration || 45,
      gameDates: dbSeason.game_dates,
      archived: dbSeason.archived || false,
      notes: dbSeason.notes,
      color: dbSeason.color,
      badge: dbSeason.badge,
      ageGroup: dbSeason.age_group
    };
    
    // Defensive roster handling - support multiple formats and avoid crashes
    if (dbSeason.default_roster_ids) {
      try {
        if (Array.isArray(dbSeason.default_roster_ids)) {
          // Modern format: array of player IDs
          result.defaultRoster = dbSeason.default_roster_ids;
          // Legacy support: set first ID as defaultRosterId
          if (dbSeason.default_roster_ids.length > 0) {
            result.defaultRosterId = dbSeason.default_roster_ids[0];
          }
        } else if (typeof dbSeason.default_roster_ids === 'string') {
          // Legacy format: single ID
          result.defaultRoster = [dbSeason.default_roster_ids];
          result.defaultRosterId = dbSeason.default_roster_ids;
        }
      } catch (error) {
        // If roster parsing fails, log and continue without roster
        console.warn('[Transform] Failed to parse season roster:', error);
        result.defaultRoster = [];
        result.defaultRosterId = undefined;
      }
    }

    return result as Season;
  },

  tournament: (dbTournament: DbTournament): Tournament => {
    const result: Partial<Tournament> = {
      id: dbTournament.id,
      name: dbTournament.name,
      seasonId: dbTournament.season_id,
      location: dbTournament.location,
      periodCount: dbTournament.period_count || 2,
      periodDuration: dbTournament.period_duration || 45,
      startDate: dbTournament.start_date,
      endDate: dbTournament.end_date,
      gameDates: dbTournament.game_dates,
      archived: dbTournament.archived || false,
      notes: dbTournament.notes,
      color: dbTournament.color,
      badge: dbTournament.badge,
      level: dbTournament.level,
      ageGroup: dbTournament.age_group
    };

    // Defensive roster handling - support multiple formats and avoid crashes
    if (dbTournament.default_roster_ids) {
      try {
        if (Array.isArray(dbTournament.default_roster_ids)) {
          // Modern format: array of player IDs
          result.defaultRoster = dbTournament.default_roster_ids;
          // Legacy support: set first ID as defaultRosterId
          if (dbTournament.default_roster_ids.length > 0) {
            result.defaultRosterId = dbTournament.default_roster_ids[0];
          }
        } else if (typeof dbTournament.default_roster_ids === 'string') {
          // Legacy format: single ID
          result.defaultRoster = [dbTournament.default_roster_ids];
          result.defaultRosterId = dbTournament.default_roster_ids;
        }
      } catch (error) {
        // If roster parsing fails, log and continue without roster
        console.warn('[Transform] Failed to parse tournament roster:', error);
        result.defaultRoster = [];
        result.defaultRosterId = undefined;
      }
    }

    return result as Tournament;
  },

  appSettings: (dbSettings: DbAppSettings) => ({
    language: dbSettings.language,
    defaultTeamName: dbSettings.default_team_name,
    lastHomeTeamName: dbSettings.default_team_name, // Map both fields
    autoBackupEnabled: dbSettings.auto_backup_enabled,
    autoBackupIntervalHours: dbSettings.auto_backup_interval_hours,
    lastBackupTime: dbSettings.last_backup_time,
    backupEmail: dbSettings.backup_email,
    // Get currentGameId from JSONB settings if not in current_game_id
    currentGameId: dbSettings.current_game_id || (typeof dbSettings.settings?.currentGameId === 'string' ? dbSettings.settings.currentGameId : null),
    hasSeenAppGuide: typeof dbSettings.settings?.hasSeenAppGuide === 'boolean' ? dbSettings.settings.hasSeenAppGuide : undefined,
    useDemandCorrection: typeof dbSettings.settings?.useDemandCorrection === 'boolean' ? dbSettings.settings.useDemandCorrection : undefined
  }),

  game: (dbGame: DbGame) => {
    // If we have the full game data stored, use it
    if (dbGame.game_data) {
      return {
        ...dbGame.game_data,
        id: dbGame.id // Ensure the ID is from the database
      };
    }
    
    // Otherwise, reconstruct from individual fields
    return {
      id: dbGame.id,
      teamName: dbGame.team_name,
      opponentName: dbGame.opponent_name,
      gameDate: dbGame.game_date,
      homeScore: dbGame.home_score,
      awayScore: dbGame.away_score,
      homeOrAway: dbGame.home_or_away,
      gameNotes: dbGame.game_notes,
      numberOfPeriods: dbGame.number_of_periods,
      periodDurationMinutes: dbGame.period_duration_minutes,
      currentPeriod: dbGame.current_period,
      gameStatus: dbGame.game_status ? 
        (dbGame.game_status === 'notStarted' ? 'notStarted' :
         dbGame.game_status === 'inProgress' ? 'inProgress' :
         dbGame.game_status === 'finished' ? 'gameEnd' :
         'notStarted') : 'notStarted',
      isPlayed: dbGame.is_played,
      seasonId: dbGame.season_id,
      tournamentId: dbGame.tournament_id,
      gameLocation: dbGame.game_location,
      gameTime: dbGame.game_time
    };
  }
};