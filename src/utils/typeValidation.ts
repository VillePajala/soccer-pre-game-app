/**
 * Type Validation Utilities - Safe type casting with runtime validation
 * Addresses CR-005: Unsafe Type Casting in Migration Code
 */

import logger from './logger';
import type { SavedGamesCollection, AppState } from '@/types';

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate that an object is a SavedGamesCollection
 */
export function validateSavedGamesCollection(data: unknown): ValidationResult<SavedGamesCollection> {
  try {
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        error: 'Data is not an object'
      };
    }

    const obj = data as Record<string, unknown>;
    
    // Check that all values look like game objects
    for (const [gameId, gameData] of Object.entries(obj)) {
      if (!gameData || typeof gameData !== 'object') {
        return {
          isValid: false,
          error: `Game ${gameId} is not an object`
        };
      }

      // Basic AppState validation - check for required fields
      const game = gameData as Record<string, unknown>;
      const requiredFields = ['teamName', 'homeScore', 'awayScore'];
      
      for (const field of requiredFields) {
        if (!(field in game)) {
          return {
            isValid: false,
            error: `Game ${gameId} missing required field: ${field}`
          };
        }
      }
    }

    return {
      isValid: true,
      data: obj as SavedGamesCollection
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Validate that an object is an AppState
 */
export function validateAppState(data: unknown): ValidationResult<AppState> {
  try {
    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        error: 'Data is not an object'
      };
    }

    const obj = data as Record<string, unknown>;
    
    // Required fields for AppState
    const requiredFields = [
      'teamName',
      'homeScore', 
      'awayScore',
      'gameEvents',
      'selectedPlayerIds'
    ];

    for (const field of requiredFields) {
      if (!(field in obj)) {
        return {
          isValid: false,
          error: `Missing required field: ${field}`
        };
      }
    }

    // Type validation for specific fields
    if (typeof obj.teamName !== 'string') {
      return {
        isValid: false,
        error: 'teamName must be a string'
      };
    }

    if (typeof obj.homeScore !== 'number' || typeof obj.awayScore !== 'number') {
      return {
        isValid: false,
        error: 'homeScore and awayScore must be numbers'
      };
    }

    if (!Array.isArray(obj.gameEvents)) {
      return {
        isValid: false,
        error: 'gameEvents must be an array'
      };
    }

    if (!Array.isArray(obj.selectedPlayerIds)) {
      return {
        isValid: false,
        error: 'selectedPlayerIds must be an array'
      };
    }

    return {
      isValid: true,
      data: obj as AppState
    };

  } catch (error) {
    return {
      isValid: false,
      error: `Validation error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Safe cast with validation and logging
 */
export function safeCast<T>(
  data: unknown,
  validator: (data: unknown) => ValidationResult<T>,
  context: string
): T {
  const result = validator(data);
  
  if (!result.isValid) {
    const error = new Error(`Safe cast failed in ${context}: ${result.error}`);
    logger.error(`[SafeCast] ${context}:`, error);
    throw error;
  }

  logger.debug(`[SafeCast] ${context}: Validation passed`);
  return result.data!;
}

/**
 * Safe cast with fallback - returns fallback value instead of throwing
 */
export function safeCastWithFallback<T>(
  data: unknown,
  validator: (data: unknown) => ValidationResult<T>,
  fallback: T,
  context: string
): T {
  try {
    return safeCast(data, validator, context);
  } catch {
    logger.warn(`[SafeCast] ${context}: Using fallback due to validation failure`);
    return fallback;
  }
}