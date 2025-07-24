// Data transformation utilities for Supabase migration
import type { Player, Season, Tournament } from '../../types';
import type { AppSettings } from '../appSettings';

// Placeholder transforms for now - these would be implemented in the next phase
export const toSupabase = {
  player: (player: Player, userId: string) => {
    const result = {
      id: player.id,
      user_id: userId,
      name: player.name,
      nickname: player.nickname,
      jerseyNumber: player.jerseyNumber,
      notes: player.notes,
      is_goalie: player.isGoalie,
      received_fair_play_card: player.receivedFairPlayCard
    };
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
    if (updates.jerseyNumber !== undefined) result.jerseyNumber = updates.jerseyNumber;
    if (updates.notes !== undefined) result.notes = updates.notes;
    if (updates.isGoalie !== undefined) result.is_goalie = updates.isGoalie;
    if (updates.receivedFairPlayCard !== undefined) result.received_fair_play_card = updates.receivedFairPlayCard;
    
    return result;
  },

  season: (season: Season, userId: string) => ({
    id: season.id,
    user_id: userId,
    name: season.name,
    location: season.location,
    start_date: season.startDate,
    end_date: season.endDate,
    period_count: season.periodCount,
    period_duration: season.periodDuration,
    game_dates: season.gameDates,
    archived: season.archived,
    default_roster_ids: season.defaultRosterId,
    notes: season.notes,
    color: season.color,
    badge: season.badge,
    age_group: season.ageGroup
  }),

  seasonUpdate: (updates: Partial<Season>, userId: string) => ({
    ...updates,
    user_id: userId,
    ...(updates.startDate !== undefined && { start_date: updates.startDate }),
    ...(updates.endDate !== undefined && { end_date: updates.endDate }),
    ...(updates.periodCount !== undefined && { period_count: updates.periodCount }),
    ...(updates.periodDuration !== undefined && { period_duration: updates.periodDuration }),
    ...(updates.gameDates !== undefined && { game_dates: updates.gameDates }),
    ...(updates.defaultRosterId !== undefined && { default_roster_ids: updates.defaultRosterId }),
    ...(updates.ageGroup !== undefined && { age_group: updates.ageGroup })
  }),

  tournament: (tournament: Tournament, userId: string) => ({
    id: tournament.id,
    user_id: userId,
    name: tournament.name,
    location: tournament.location,
    start_date: tournament.startDate,
    end_date: tournament.endDate,
    period_count: tournament.periodCount,
    period_duration: tournament.periodDuration,
    game_dates: tournament.gameDates,
    archived: tournament.archived,
    default_roster_ids: tournament.defaultRosterId,
    notes: tournament.notes,
    color: tournament.color,
    badge: tournament.badge,
    level: tournament.level,
    age_group: tournament.ageGroup
  }),

  tournamentUpdate: (updates: Partial<Tournament>, userId: string) => ({
    ...updates,
    user_id: userId,
    ...(updates.startDate !== undefined && { start_date: updates.startDate }),
    ...(updates.endDate !== undefined && { end_date: updates.endDate }),
    ...(updates.periodCount !== undefined && { period_count: updates.periodCount }),
    ...(updates.periodDuration !== undefined && { period_duration: updates.periodDuration }),
    ...(updates.gameDates !== undefined && { game_dates: updates.gameDates }),
    ...(updates.defaultRosterId !== undefined && { default_roster_ids: updates.defaultRosterId }),
    ...(updates.ageGroup !== undefined && { age_group: updates.ageGroup })
  }),

  appSettings: (settings: AppSettings, userId: string) => ({
    user_id: userId,
    current_game_id: settings.currentGameId,
    last_backup_date: settings.lastBackupTime,
    preferred_language: settings.language,
    theme: undefined // theme property doesn't exist in AppSettings
  }),

  game: (gameData: unknown, userId: string) => ({
    // This is a placeholder - would need proper implementation
    user_id: userId,
    ...(gameData as Record<string, unknown>)
  })
};

export const fromSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  player: (dbPlayer: any) => ({
    id: dbPlayer.id,
    name: dbPlayer.name,
    nickname: dbPlayer.nickname,
    jerseyNumber: dbPlayer.jersey_number,
    notes: dbPlayer.notes,
    isGoalie: dbPlayer.is_goalie,
    receivedFairPlayCard: dbPlayer.received_fair_play_card
  }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  season: (dbSeason: any) => ({
    id: dbSeason.id,
    name: dbSeason.name,
    location: dbSeason.location,
    periodCount: dbSeason.period_count,
    periodDuration: dbSeason.period_duration,
    startDate: dbSeason.start_date,
    endDate: dbSeason.end_date,
    gameDates: dbSeason.game_dates,
    archived: dbSeason.archived,
    defaultRosterId: dbSeason.default_roster_ids,
    notes: dbSeason.notes,
    color: dbSeason.color,
    badge: dbSeason.badge,
    ageGroup: dbSeason.age_group
  }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tournament: (dbTournament: any) => ({
    id: dbTournament.id,
    name: dbTournament.name,
    location: dbTournament.location,
    periodCount: dbTournament.period_count,
    periodDuration: dbTournament.period_duration,
    startDate: dbTournament.start_date,
    endDate: dbTournament.end_date,
    gameDates: dbTournament.game_dates,
    archived: dbTournament.archived,
    defaultRosterId: dbTournament.default_roster_ids,
    notes: dbTournament.notes,
    color: dbTournament.color,
    badge: dbTournament.badge,
    level: dbTournament.level,
    ageGroup: dbTournament.age_group
  }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appSettings: (dbSettings: any) => ({
    currentGameId: dbSettings.current_game_id,
    lastBackupDate: dbSettings.last_backup_date,
    preferredLanguage: dbSettings.preferred_language,
    theme: dbSettings.theme
  }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  game: (dbGame: any) => ({
    // This is a placeholder - would need proper implementation
    id: dbGame.id,
    ...dbGame
  })
};