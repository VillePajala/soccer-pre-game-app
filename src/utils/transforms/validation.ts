/**
 * Data validation utilities for ensuring data integrity during migration
 * These functions validate data before and after transformation
 */

import type { 
  Player, 
  Season, 
  Tournament, 
  AppState, 
  GameEvent, 
  PlayerAssessment
} from '@/types';

import type {
  SupabasePlayer
} from './toSupabase';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate Player data
 */
export function validatePlayer(player: Player): void {
  if (!player.id || typeof player.id !== 'string') {
    throw new ValidationError('Player ID is required and must be a string', 'id', player.id);
  }
  
  if (!player.name || typeof player.name !== 'string' || player.name.trim().length === 0) {
    throw new ValidationError('Player name is required and must be a non-empty string', 'name', player.name);
  }
  
  if (player.relX !== undefined && (typeof player.relX !== 'number' || player.relX < 0 || player.relX > 1)) {
    throw new ValidationError('Player relX must be a number between 0 and 1', 'relX', player.relX);
  }
  
  if (player.relY !== undefined && (typeof player.relY !== 'number' || player.relY < 0 || player.relY > 1)) {
    throw new ValidationError('Player relY must be a number between 0 and 1', 'relY', player.relY);
  }
  
  if (player.isGoalie !== undefined && typeof player.isGoalie !== 'boolean') {
    throw new ValidationError('Player isGoalie must be a boolean', 'isGoalie', player.isGoalie);
  }
  
  if (player.receivedFairPlayCard !== undefined && typeof player.receivedFairPlayCard !== 'boolean') {
    throw new ValidationError('Player receivedFairPlayCard must be a boolean', 'receivedFairPlayCard', player.receivedFairPlayCard);
  }
}

/**
 * Validate Supabase Player data
 */
export function validateSupabasePlayer(player: SupabasePlayer): void {
  if (!player.user_id || typeof player.user_id !== 'string') {
    throw new ValidationError('Supabase Player user_id is required and must be a string', 'user_id', player.user_id);
  }
  
  if (!player.name || typeof player.name !== 'string' || player.name.trim().length === 0) {
    throw new ValidationError('Supabase Player name is required and must be a non-empty string', 'name', player.name);
  }
  
  if (typeof player.is_goalie !== 'boolean') {
    throw new ValidationError('Supabase Player is_goalie must be a boolean', 'is_goalie', player.is_goalie);
  }
  
  if (typeof player.received_fair_play_card !== 'boolean') {
    throw new ValidationError('Supabase Player received_fair_play_card must be a boolean', 'received_fair_play_card', player.received_fair_play_card);
  }
}

/**
 * Validate Season data
 */
export function validateSeason(season: Season): void {
  if (!season.id || typeof season.id !== 'string') {
    throw new ValidationError('Season ID is required and must be a string', 'id', season.id);
  }
  
  if (!season.name || typeof season.name !== 'string' || season.name.trim().length === 0) {
    throw new ValidationError('Season name is required and must be a non-empty string', 'name', season.name);
  }
  
  if (season.periodCount !== undefined && (typeof season.periodCount !== 'number' || season.periodCount < 1)) {
    throw new ValidationError('Season periodCount must be a positive number', 'periodCount', season.periodCount);
  }
  
  if (season.periodDuration !== undefined && (typeof season.periodDuration !== 'number' || season.periodDuration < 1)) {
    throw new ValidationError('Season periodDuration must be a positive number', 'periodDuration', season.periodDuration);
  }
  
  if (season.archived !== undefined && typeof season.archived !== 'boolean') {
    throw new ValidationError('Season archived must be a boolean', 'archived', season.archived);
  }
}

/**
 * Validate Tournament data
 */
export function validateTournament(tournament: Tournament): void {
  if (!tournament.id || typeof tournament.id !== 'string') {
    throw new ValidationError('Tournament ID is required and must be a string', 'id', tournament.id);
  }
  
  if (!tournament.name || typeof tournament.name !== 'string' || tournament.name.trim().length === 0) {
    throw new ValidationError('Tournament name is required and must be a non-empty string', 'name', tournament.name);
  }
  
  if (tournament.periodCount !== undefined && (typeof tournament.periodCount !== 'number' || tournament.periodCount < 1)) {
    throw new ValidationError('Tournament periodCount must be a positive number', 'periodCount', tournament.periodCount);
  }
  
  if (tournament.periodDuration !== undefined && (typeof tournament.periodDuration !== 'number' || tournament.periodDuration < 1)) {
    throw new ValidationError('Tournament periodDuration must be a positive number', 'periodDuration', tournament.periodDuration);
  }
  
  if (tournament.archived !== undefined && typeof tournament.archived !== 'boolean') {
    throw new ValidationError('Tournament archived must be a boolean', 'archived', tournament.archived);
  }
}

/**
 * Validate AppState data
 */
export function validateAppState(appState: AppState): void {
  if (!appState.teamName || typeof appState.teamName !== 'string' || appState.teamName.trim().length === 0) {
    throw new ValidationError('AppState teamName is required and must be a non-empty string', 'teamName', appState.teamName);
  }
  
  if (!appState.opponentName || typeof appState.opponentName !== 'string' || appState.opponentName.trim().length === 0) {
    throw new ValidationError('AppState opponentName is required and must be a non-empty string', 'opponentName', appState.opponentName);
  }
  
  if (!appState.gameDate || typeof appState.gameDate !== 'string') {
    throw new ValidationError('AppState gameDate is required and must be a string', 'gameDate', appState.gameDate);
  }
  
  if (!['home', 'away'].includes(appState.homeOrAway)) {
    throw new ValidationError('AppState homeOrAway must be "home" or "away"', 'homeOrAway', appState.homeOrAway);
  }
  
  if (![1, 2].includes(appState.numberOfPeriods)) {
    throw new ValidationError('AppState numberOfPeriods must be 1 or 2', 'numberOfPeriods', appState.numberOfPeriods);
  }
  
  if (typeof appState.periodDurationMinutes !== 'number' || appState.periodDurationMinutes < 1) {
    throw new ValidationError('AppState periodDurationMinutes must be a positive number', 'periodDurationMinutes', appState.periodDurationMinutes);
  }
  
  if (!['notStarted', 'inProgress', 'periodEnd', 'gameEnd'].includes(appState.gameStatus)) {
    throw new ValidationError('AppState gameStatus must be one of: notStarted, inProgress, periodEnd, gameEnd', 'gameStatus', appState.gameStatus);
  }
  
  if (typeof appState.homeScore !== 'number' || appState.homeScore < 0) {
    throw new ValidationError('AppState homeScore must be a non-negative number', 'homeScore', appState.homeScore);
  }
  
  if (typeof appState.awayScore !== 'number' || appState.awayScore < 0) {
    throw new ValidationError('AppState awayScore must be a non-negative number', 'awayScore', appState.awayScore);
  }
  
  if (typeof appState.currentPeriod !== 'number' || appState.currentPeriod < 1) {
    throw new ValidationError('AppState currentPeriod must be a positive number', 'currentPeriod', appState.currentPeriod);
  }
  
  if (!Array.isArray(appState.playersOnField)) {
    throw new ValidationError('AppState playersOnField must be an array', 'playersOnField', appState.playersOnField);
  }
  
  if (!Array.isArray(appState.availablePlayers)) {
    throw new ValidationError('AppState availablePlayers must be an array', 'availablePlayers', appState.availablePlayers);
  }
  
  if (!Array.isArray(appState.selectedPlayerIds)) {
    throw new ValidationError('AppState selectedPlayerIds must be an array', 'selectedPlayerIds', appState.selectedPlayerIds);
  }
  
  if (!Array.isArray(appState.gameEvents)) {
    throw new ValidationError('AppState gameEvents must be an array', 'gameEvents', appState.gameEvents);
  }
  
  // Validate each player
  [...appState.playersOnField, ...appState.availablePlayers].forEach((player, index) => {
    try {
      validatePlayer(player);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ValidationError(`Player validation failed at index ${index}: ${message}`, `player_${index}`, player);
    }
  });
  
  // Validate each game event
  appState.gameEvents.forEach((event, index) => {
    try {
      validateGameEvent(event);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ValidationError(`Game event validation failed at index ${index}: ${message}`, `gameEvent_${index}`, event);
    }
  });
}

/**
 * Validate GameEvent data
 */
export function validateGameEvent(event: GameEvent): void {
  if (!event.id || typeof event.id !== 'string') {
    throw new ValidationError('GameEvent ID is required and must be a string', 'id', event.id);
  }
  
  if (!['goal', 'opponentGoal', 'substitution', 'periodEnd', 'gameEnd', 'fairPlayCard'].includes(event.type)) {
    throw new ValidationError('GameEvent type must be one of: goal, opponentGoal, substitution, periodEnd, gameEnd, fairPlayCard', 'type', event.type);
  }
  
  if (typeof event.time !== 'number' || event.time < 0) {
    throw new ValidationError('GameEvent time must be a non-negative number', 'time', event.time);
  }
}

/**
 * Validate PlayerAssessment data
 */
export function validatePlayerAssessment(assessment: PlayerAssessment): void {
  if (typeof assessment.overall !== 'number' || assessment.overall < 1 || assessment.overall > 10) {
    throw new ValidationError('PlayerAssessment overall must be a number between 1 and 10', 'overall', assessment.overall);
  }
  
  if (typeof assessment.minutesPlayed !== 'number' || assessment.minutesPlayed < 0) {
    throw new ValidationError('PlayerAssessment minutesPlayed must be a non-negative number', 'minutesPlayed', assessment.minutesPlayed);
  }
  
  if (!assessment.createdBy || typeof assessment.createdBy !== 'string') {
    throw new ValidationError('PlayerAssessment createdBy is required and must be a string', 'createdBy', assessment.createdBy);
  }
  
  // Validate slider values
  const sliderFields: (keyof typeof assessment.sliders)[] = ['intensity', 'courage', 'duels', 'technique', 'creativity', 'decisions', 'awareness', 'teamwork', 'fair_play', 'impact'];
  sliderFields.forEach(field => {
    const value = assessment.sliders[field];
    if (typeof value !== 'number' || value < 1 || value > 10) {
      throw new ValidationError(`PlayerAssessment slider ${field} must be a number between 1 and 10`, `sliders.${field}`, value);
    }
  });
}

/**
 * Validate a batch of data items
 */
export function validateBatch<T>(items: T[], validator: (item: T) => void, itemName: string): void {
  const errors: ValidationError[] = [];
  
  items.forEach((item, index) => {
    try {
      validator(item);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(new ValidationError(`${itemName} ${index}: ${error.message}`, `${itemName}_${index}`, item));
      } else {
        const message = error instanceof Error ? error.message : 'Unknown validation error';
        errors.push(new ValidationError(`${itemName} ${index}: ${message}`, `${itemName}_${index}`, item));
      }
    }
  });
  
  if (errors.length > 0) {
    const errorMessages = errors.map(e => e.message).join('; ');
    throw new ValidationError(`Batch validation failed for ${itemName}: ${errorMessages}`);
  }
}

/**
 * Validate localStorage data structure before migration
 */
export function validateLocalStorageData(data: Record<string, unknown>): void {
  // Validate required keys exist
  const requiredKeys = ['soccerMasterRoster', 'soccerSeasons', 'soccerTournaments', 'savedSoccerGames', 'soccerAppSettings'];
  const missingKeys = requiredKeys.filter(key => !(key in data));
  
  if (missingKeys.length > 0) {
    throw new ValidationError(`Missing required localStorage keys: ${missingKeys.join(', ')}`);
  }
  
  // Validate each data structure
  if (!Array.isArray(data.soccerMasterRoster)) {
    throw new ValidationError('soccerMasterRoster must be an array');
  }
  
  if (!Array.isArray(data.soccerSeasons)) {
    throw new ValidationError('soccerSeasons must be an array');
  }
  
  if (!Array.isArray(data.soccerTournaments)) {
    throw new ValidationError('soccerTournaments must be an array');
  }
  
  if (typeof data.savedSoccerGames !== 'object' || data.savedSoccerGames === null) {
    throw new ValidationError('savedSoccerGames must be an object');
  }
  
  if (typeof data.soccerAppSettings !== 'object' || data.soccerAppSettings === null) {
    throw new ValidationError('soccerAppSettings must be an object');
  }
  
  // Validate individual items
  validateBatch(data.soccerMasterRoster, validatePlayer, 'Player');
  validateBatch(data.soccerSeasons, validateSeason, 'Season');
  validateBatch(data.soccerTournaments, validateTournament, 'Tournament');
  
  // Validate saved games
  Object.entries(data.savedSoccerGames).forEach(([gameId, appState]) => {
    try {
      validateAppState(appState as AppState);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ValidationError(`Saved game ${gameId} validation failed: ${message}`, gameId, appState);
    }
  });
}