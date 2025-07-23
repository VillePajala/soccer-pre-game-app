// Data transformation utilities for Supabase migration
import type { Player, Season, Tournament } from '../../types';
import type { AppSettings } from '../appSettings';

// Placeholder transforms for now - these would be implemented in the next phase
export const toSupabase = {
  player: (player: Player, userId: string) => ({
    ...player,
    user_id: userId,
    is_goalie: player.isGoalie,
    received_fair_play_card: player.receivedFairPlayCard
  }),
  
  playerUpdate: (updates: Partial<Player>, userId: string) => ({
    ...updates,
    user_id: userId,
    ...(updates.isGoalie !== undefined && { is_goalie: updates.isGoalie }),
    ...(updates.receivedFairPlayCard !== undefined && { received_fair_play_card: updates.receivedFairPlayCard })
  }),

  season: (season: Season, userId: string) => ({
    ...season,
    user_id: userId,
    start_date: season.startDate,
    end_date: season.endDate,
    period_count: season.periodCount,
    period_duration: season.periodDuration,
    game_dates: season.gameDates,
    default_roster_ids: season.defaultRosterIds,
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
    ...(updates.defaultRosterIds !== undefined && { default_roster_ids: updates.defaultRosterIds }),
    ...(updates.ageGroup !== undefined && { age_group: updates.ageGroup })
  }),

  tournament: (tournament: Tournament, userId: string) => ({
    ...tournament,
    user_id: userId,
    start_date: tournament.startDate,
    end_date: tournament.endDate,
    period_count: tournament.periodCount,
    period_duration: tournament.periodDuration,
    game_dates: tournament.gameDates,
    default_roster_ids: tournament.defaultRosterIds,
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
    ...(updates.defaultRosterIds !== undefined && { default_roster_ids: updates.defaultRosterIds }),
    ...(updates.ageGroup !== undefined && { age_group: updates.ageGroup })
  }),

  appSettings: (settings: AppSettings, userId: string) => ({
    user_id: userId,
    current_game_id: settings.currentGameId,
    last_home_team_name: settings.lastHomeTeamName,
    language: settings.language,
    has_seen_app_guide: settings.hasSeenAppGuide,
    auto_backup_enabled: settings.autoBackupEnabled,
    auto_backup_interval_hours: settings.autoBackupIntervalHours,
    use_demand_correction: settings.useDemandCorrection
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
    defaultRosterIds: dbSeason.default_roster_ids,
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
    defaultRosterIds: dbTournament.default_roster_ids,
    notes: dbTournament.notes,
    color: dbTournament.color,
    badge: dbTournament.badge,
    level: dbTournament.level,
    ageGroup: dbTournament.age_group
  }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appSettings: (dbSettings: any) => ({
    currentGameId: dbSettings.current_game_id,
    lastHomeTeamName: dbSettings.last_home_team_name,
    language: dbSettings.language,
    hasSeenAppGuide: dbSettings.has_seen_app_guide,
    autoBackupEnabled: dbSettings.auto_backup_enabled,
    autoBackupIntervalHours: dbSettings.auto_backup_interval_hours,
    useDemandCorrection: dbSettings.use_demand_correction
  }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  game: (dbGame: any) => ({
    // This is a placeholder - would need proper implementation
    id: dbGame.id,
    ...dbGame
  })
};