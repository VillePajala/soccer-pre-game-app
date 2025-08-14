/**
 * Safe JSON parsing utilities to prevent app crashes from corrupted data
 * Addresses CR-001: Unprotected JSON.parse() Operations
 */

export interface SafeParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Safely parse JSON string with error handling
 * @param jsonString - The JSON string to parse
 * @param fallback - Optional fallback value if parsing fails
 * @returns SafeParseResult with success status, data, or error
 */
export function safeJsonParse<T = unknown>(
  jsonString: string,
  fallback?: T
): SafeParseResult<T> {
  if (typeof jsonString !== 'string') {
    return {
      success: false,
      error: 'Input must be a string',
      data: fallback
    };
  }

  if (jsonString.trim() === '') {
    return {
      success: false,
      error: 'Empty string provided',
      data: fallback
    };
  }

  try {
    const parsed = JSON.parse(jsonString);
    return {
      success: true,
      data: parsed
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
    return {
      success: false,
      error: `JSON parsing failed: ${errorMessage}`,
      data: fallback
    };
  }
}

/**
 * Parse JSON from localStorage with safe fallback
 * @param key - localStorage key
 * @param fallback - fallback value if parsing fails
 * @returns Parsed data or fallback
 */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      return fallback;
    }
    
    const result = safeJsonParse<T>(stored, fallback);
    return result.success ? result.data! : fallback;
  } catch (error) {
    console.warn(`Failed to get localStorage item "${key}":`, error);
    return fallback;
  }
}

/**
 * Validate and parse backup/import data with type checking
 * @param jsonString - JSON string from user upload
 * @param validator - Optional validation function
 * @returns SafeParseResult with validation
 */
export function safeImportDataParse<T = unknown>(
  jsonString: string,
  validator?: (data: unknown) => data is T
): SafeParseResult<T> {
  const parseResult = safeJsonParse<T>(jsonString);
  
  if (!parseResult.success) {
    return parseResult;
  }

  // Additional validation if validator provided
  if (validator && !validator(parseResult.data)) {
    return {
      success: false,
      error: 'Data validation failed - invalid format or structure'
    };
  }

  return parseResult;
}