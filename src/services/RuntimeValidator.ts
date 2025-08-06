/**
 * Runtime Validator - TypeScript Runtime Type Validation
 * 
 * This service provides runtime validation for data that crosses type boundaries,
 * such as localStorage data, API responses, and user inputs. It helps catch
 * type safety issues that TypeScript can't detect at compile time.
 * 
 * 🔧 RUNTIME VALIDATION FIXES:
 * - Validates external data sources (localStorage, APIs)
 * - Provides type guards for complex objects
 * - Sanitizes user inputs and form data
 * - Validates migration data integrity
 * - Catches runtime type mismatches
 */

import logger from '@/utils/logger';
import type { Player, Season, Tournament, SavedGamesCollection } from '@/types';

// Validation result types
export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors: string[];
  sanitized?: T;
}

// Validation options
export interface ValidationOptions {
  strict?: boolean; // Strict mode fails on any validation error
  sanitize?: boolean; // Attempt to sanitize/fix invalid data
  logErrors?: boolean; // Log validation errors
  throwOnError?: boolean; // Throw exception on validation failure
}

// Type guard helper types
type TypeGuard<T> = (value: unknown) => value is T;
// type ValidationSchema<T> = {
//   [K in keyof T]: TypeGuard<T[K]> | ValidationSchema<T[K]>;
// };

class RuntimeValidator {
  /**
   * Validate and parse JSON data with type checking
   */
  validateJSON<T>(
    jsonString: string,
    typeGuard: TypeGuard<T>,
    options: ValidationOptions = {}
  ): ValidationResult<T> {
    // const { // strict = false, sanitize = false, logErrors = true, throwOnError = false } = options;
    const { sanitize = false, logErrors = true, throwOnError = false } = options;
    const errors: string[] = [];

    try {
      // Parse JSON
      const parsed = JSON.parse(jsonString);
      
      // Validate type
      if (typeGuard(parsed)) {
        return {
          isValid: true,
          data: parsed,
          errors,
          sanitized: sanitize ? this.sanitizeData(parsed) : parsed,
        };
      } else {
        const error = 'Parsed JSON does not match expected type';
        errors.push(error);
        
        if (logErrors) {
          logger.warn(`[RuntimeValidator] ${error}:`, { parsed, expected: typeGuard.name });
        }
        
        if (throwOnError) {
          throw new Error(error);
        }
        
        return {
          isValid: false,
          errors,
          sanitized: sanitize ? this.attemptSanitization(parsed, typeGuard) : undefined,
        };
      }
    } catch (parseError) {
      const error = `JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
      errors.push(error);
      
      if (logErrors) {
        logger.error(`[RuntimeValidator] ${error}:`, { jsonString: jsonString.substring(0, 100) + '...' });
      }
      
      if (throwOnError) {
        throw parseError;
      }
      
      return {
        isValid: false,
        errors,
      };
    }
  }

  /**
   * Validate localStorage data with fallback
   */
  validateStorageData<T>(
    key: string,
    typeGuard: TypeGuard<T>,
    defaultValue?: T,
    options: ValidationOptions = {}
  ): ValidationResult<T> {
    try {
      const stored = localStorage.getItem(key);
      
      if (stored === null) {
        return {
          isValid: true,
          data: defaultValue,
          errors: [],
          sanitized: defaultValue,
        };
      }
      
      const result = this.validateJSON(stored, typeGuard, options);
      
      // If validation failed but we have a default, use it
      if (!result.isValid && defaultValue !== undefined) {
        logger.debug(`[RuntimeValidator] Using default value for invalid storage data '${key}'`);
        return {
          isValid: true,
          data: defaultValue,
          errors: result.errors,
          sanitized: defaultValue,
        };
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown storage error';
      logger.error(`[RuntimeValidator] Storage validation failed for '${key}':`, error);
      
      return {
        isValid: false,
        data: defaultValue,
        errors: [errorMessage],
        sanitized: defaultValue,
      };
    }
  }

  /**
   * Create type guards for common application types
   */
  createTypeGuards() {
    return {
      // Basic type guards
      isString: (value: unknown): value is string => typeof value === 'string',
      isNumber: (value: unknown): value is number => typeof value === 'number' && !isNaN(value),
      isBoolean: (value: unknown): value is boolean => typeof value === 'boolean',
      isArray: (value: unknown): value is unknown[] => Array.isArray(value),
      isObject: (value: unknown): value is Record<string, unknown> => 
        typeof value === 'object' && value !== null && !Array.isArray(value),
      
      // Date type guard
      isValidDate: (value: unknown): value is string => {
        if (typeof value !== 'string') return false;
        const date = new Date(value);
        return !isNaN(date.getTime());
      },

      // Player type guard
      isPlayer: (value: unknown): value is Player => {
        if (typeof value !== 'object' || value === null) return false;
        const obj = value as Record<string, unknown>;
        
        return (
          typeof obj.id === 'string' &&
          typeof obj.name === 'string' &&
          (obj.jerseyNumber === undefined || typeof obj.jerseyNumber === 'number') &&
          (obj.position === undefined || typeof obj.position === 'string') &&
          (obj.notes === undefined || typeof obj.notes === 'string')
        );
      },

      // Season type guard
      isSeason: (value: unknown): value is Season => {
        if (typeof value !== 'object' || value === null) return false;
        const obj = value as Record<string, unknown>;
        
        return (
          typeof obj.id === 'string' &&
          typeof obj.name === 'string' &&
          (obj.startDate === undefined || typeof obj.startDate === 'string') &&
          (obj.endDate === undefined || typeof obj.endDate === 'string')
        );
      },

      // Tournament type guard
      isTournament: (value: unknown): value is Tournament => {
        if (typeof value !== 'object' || value === null) return false;
        const obj = value as Record<string, unknown>;
        
        return (
          typeof obj.id === 'string' &&
          typeof obj.name === 'string' &&
          (obj.location === undefined || typeof obj.location === 'string') &&
          (obj.startDate === undefined || typeof obj.startDate === 'string') &&
          (obj.endDate === undefined || typeof obj.endDate === 'string')
        );
      },

      // SavedGamesCollection type guard
      isSavedGamesCollection: (value: unknown): value is SavedGamesCollection => {
        if (typeof value !== 'object' || value === null) return false;
        const obj = value as Record<string, unknown>;
        
        // Check that all values are valid AppState objects
        return Object.values(obj).every(gameState => {
          if (typeof gameState !== 'object' || gameState === null) return false;
          const game = gameState as Record<string, unknown>;
          
          return (
            typeof game.gameId === 'string' &&
            typeof game.teamName === 'string' &&
            typeof game.opponentName === 'string' &&
            (game.gameDate === undefined || typeof game.gameDate === 'string') &&
            (game.isPlayed === undefined || typeof game.isPlayed === 'boolean')
          );
        });
      },

      // Form data type guard
      isFormData: (value: unknown): value is Record<string, unknown> => {
        if (typeof value !== 'object' || value === null) return false;
        const obj = value as Record<string, unknown>;
        
        // Check for common form data structure
        return (
          typeof obj.values === 'object' &&
          typeof obj.timestamp === 'number' &&
          typeof obj.formId === 'string'
        );
      },

      // Migration flags type guard
      isMigrationFlags: (value: unknown): value is Record<string, boolean> => {
        if (typeof value !== 'object' || value === null) return false;
        const obj = value as Record<string, unknown>;
        
        return Object.values(obj).every(flag => typeof flag === 'boolean');
      },
    };
  }

  /**
   * Sanitize data by removing invalid fields and fixing types
   */
  private sanitizeData<T>(data: T): T {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data } as any;
    
    // Remove null/undefined fields
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === null || sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });
    
    return sanitized;
  }

  /**
   * Attempt to sanitize invalid data to match expected type
   */
  private attemptSanitization<T>(data: unknown, typeGuard: TypeGuard<T>): T | undefined {
    try {
      // Basic sanitization attempts
      if (typeof data === 'object' && data !== null) {
        const sanitized = this.sanitizeData(data);
        if (typeGuard(sanitized)) {
          return sanitized;
        }
      }
      
      // Could add more sophisticated sanitization logic here
      return undefined;
    } catch (error) {
      logger.debug('[RuntimeValidator] Sanitization failed:', error);
      return undefined;
    }
  }

  /**
   * Validate multiple values with different type guards
   */
  validateBatch<T extends Record<string, unknown>>(
    values: Record<keyof T, unknown>,
    typeGuards: Record<keyof T, TypeGuard<T[keyof T]>>,
    options: ValidationOptions = {}
  ): ValidationResult<T> {
    const errors: string[] = [];
    const validated: Partial<T> = {};
    
    for (const [key, value] of Object.entries(values)) {
      const guard = typeGuards[key as keyof T];
      if (guard && guard(value)) {
        (validated as any)[key] = value;
      } else {
        errors.push(`Invalid type for field '${key}'`);
        if (options.logErrors) {
          logger.warn(`[RuntimeValidator] Invalid type for field '${key}':`, { value, expected: guard?.name });
        }
      }
    }
    
    const isValid = errors.length === 0;
    
    return {
      isValid,
      data: isValid ? (validated as T) : undefined,
      errors,
      sanitized: options.sanitize ? this.sanitizeData(validated) as T : undefined,
    };
  }

  /**
   * Create a validated wrapper for external API calls
   */
  createValidatedWrapper<T>(
    asyncFn: () => Promise<unknown>,
    typeGuard: TypeGuard<T>,
    options: ValidationOptions = {}
  ): () => Promise<ValidationResult<T>> {
    return async () => {
      try {
        const result = await asyncFn();
        
        if (typeGuard(result)) {
          return {
            isValid: true,
            data: result,
            errors: [],
            sanitized: options.sanitize ? this.sanitizeData(result) : result,
          };
        } else {
          const error = 'API response does not match expected type';
          if (options.logErrors) {
            logger.warn(`[RuntimeValidator] ${error}:`, { result, expected: typeGuard.name });
          }
          
          return {
            isValid: false,
            errors: [error],
            sanitized: options.sanitize ? this.attemptSanitization(result, typeGuard) : undefined,
          };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown API error';
        if (options.logErrors) {
          logger.error('[RuntimeValidator] API call failed:', error);
        }
        
        return {
          isValid: false,
          errors: [errorMessage],
        };
      }
    };
  }
}

// Export singleton instance
export const runtimeValidator = new RuntimeValidator();

// Export type guards for easy access
export const typeGuards = runtimeValidator.createTypeGuards();

// Utility functions for common validation patterns
export const validateStorageJSON = <T>(
  key: string,
  typeGuard: TypeGuard<T>,
  defaultValue?: T
): ValidationResult<T> => {
  return runtimeValidator.validateStorageData(key, typeGuard, defaultValue, {
    sanitize: true,
    logErrors: true,
  });
};

export const validateExternalData = <T>(
  data: unknown,
  typeGuard: TypeGuard<T>,
  context: string = 'external data'
): ValidationResult<T> => {
  const result = {
    isValid: typeGuard(data),
    data: typeGuards.isObject(data) ? data as T : undefined,
    errors: [] as string[],
  };
  
  if (!result.isValid) {
    const error = `Invalid ${context} type`;
    result.errors.push(error);
    logger.warn(`[RuntimeValidator] ${error}:`, { data, expected: typeGuard.name });
  }
  
  return result;
};