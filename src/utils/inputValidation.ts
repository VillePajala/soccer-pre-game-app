/**
 * Comprehensive Input Validation Utility
 * 
 * Provides robust validation for all user inputs to prevent data corruption,
 * injection attacks, and ensure data integrity across CRUD operations.
 */

// import { sanitizeError } from './errorSanitization'; // Available for future use

export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Maximum lengths for different field types
export const FIELD_LIMITS = {
  PLAYER_NAME: 100,
  TEAM_NAME: 100,
  LOCATION: 200,
  NOTES: 2000,
  EMAIL: 254,
  PASSWORD: 128,
  SEASON_NAME: 100,
  TOURNAMENT_NAME: 100,
  GAME_ID: 50,
  UUID: 36
} as const;

// Common regex patterns
const PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  SAFE_STRING: /^[a-zA-Z0-9\s\-_.,!?()]+$/,
  PLAYER_NUMBER: /^[0-9]{1,3}$/,
  TIME_FORMAT: /^([0-9]{1,2}):([0-5][0-9])$/
} as const;

/**
 * Validate and sanitize a string input
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
    allowEmpty?: boolean;
  } = {}
): string {
  const {
    required = false,
    maxLength = 1000,
    minLength = 0,
    pattern,
    allowEmpty = false
  } = options;

  // Type check
  if (typeof value !== 'string') {
    if (!required && (value === null || value === undefined)) {
      return '';
    }
    throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
  }

  // Trim whitespace
  const trimmed = value.trim();

  // Check if empty when not allowed
  if (!allowEmpty && !required && trimmed === '') {
    return '';
  }

  // Required check
  if (required && trimmed === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName, value);
  }

  // Length checks
  if (trimmed.length < minLength) {
    throw new ValidationError(
      `${fieldName} must be at least ${minLength} characters`,
      fieldName,
      value
    );
  }

  if (trimmed.length > maxLength) {
    throw new ValidationError(
      `${fieldName} cannot exceed ${maxLength} characters`,
      fieldName,
      value
    );
  }

  // Pattern check
  if (pattern && trimmed !== '' && !pattern.test(trimmed)) {
    throw new ValidationError(
      `${fieldName} contains invalid characters`,
      fieldName,
      value
    );
  }

  // Basic XSS prevention - reject if contains script tags
  if (/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(trimmed)) {
    throw new ValidationError(
      `${fieldName} contains forbidden content`,
      fieldName,
      value
    );
  }

  return trimmed;
}

/**
 * Validate a UUID
 */
export function validateUUID(value: unknown, fieldName: string, required: boolean = true): string | null {
  if (!required && (value === null || value === undefined || value === '')) {
    return null;
  }

  const str = validateString(value, fieldName, { required, maxLength: FIELD_LIMITS.UUID });
  
  if (str === '' && !required) {
    return null;
  }

  if (!PATTERNS.UUID.test(str)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`, fieldName, value);
  }

  return str;
}

/**
 * Validate an email address
 */
export function validateEmail(value: unknown, fieldName: string = 'email', required: boolean = true): string | null {
  if (!required && (value === null || value === undefined || value === '')) {
    return null;
  }

  const email = validateString(value, fieldName, {
    required,
    maxLength: FIELD_LIMITS.EMAIL,
    pattern: PATTERNS.EMAIL
  });

  return email || null;
}

/**
 * Validate a number
 */
export function validateNumber(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): number | null {
  const { required = false, min = -Infinity, max = Infinity, integer = false } = options;

  if (!required && (value === null || value === undefined || value === '')) {
    return null;
  }

  let num: number;

  if (typeof value === 'string') {
    num = parseFloat(value);
  } else if (typeof value === 'number') {
    num = value;
  } else {
    throw new ValidationError(`${fieldName} must be a number`, fieldName, value);
  }

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a valid number`, fieldName, value);
  }

  if (integer && !Number.isInteger(num)) {
    throw new ValidationError(`${fieldName} must be an integer`, fieldName, value);
  }

  if (num < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName, value);
  }

  if (num > max) {
    throw new ValidationError(`${fieldName} cannot exceed ${max}`, fieldName, value);
  }

  return num;
}

/**
 * Validate a boolean
 */
export function validateBoolean(
  value: unknown,
  fieldName: string,
  required: boolean = false
): boolean | null {
  if (!required && (value === null || value === undefined)) {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }

  throw new ValidationError(`${fieldName} must be a boolean`, fieldName, value);
}

/**
 * Validate a date string
 */
export function validateDate(
  value: unknown,
  fieldName: string,
  required: boolean = false
): Date | null {
  if (!required && (value === null || value === undefined || value === '')) {
    return null;
  }

  const dateStr = validateString(value, fieldName, { required });
  if (!dateStr && !required) return null;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date`, fieldName, value);
  }

  return date;
}

/**
 * Validate JSON data before parsing
 */
export function validateAndParseJSON<T>(
  value: unknown,
  fieldName: string,
  validator?: (parsed: unknown) => T
): T {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a JSON string`, fieldName, value);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new ValidationError(`${fieldName} must be valid JSON`, fieldName, value);
  }

  if (validator) {
    return validator(parsed);
  }

  return parsed as T;
}

/**
 * Validate player data
 */
export function validatePlayerData(data: unknown): {
  id?: string;
  name: string;
  nickname?: string;
  jerseyNumber?: string;
  notes?: string;
  isGoalie?: boolean;
  receivedFairPlayCard?: boolean;
} {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Player data must be an object');
  }

  const player = data as Record<string, unknown>;

  return {
    id: validateUUID(player.id, 'player ID', false) || undefined,
    name: validateString(player.name, 'player name', {
      required: true,
      maxLength: FIELD_LIMITS.PLAYER_NAME,
      minLength: 1
    }),
    nickname: validateString(player.nickname, 'nickname', {
      maxLength: FIELD_LIMITS.PLAYER_NAME
    }) || undefined,
    jerseyNumber: validateString(player.jerseyNumber, 'jersey number', {
      maxLength: 3,
      pattern: PATTERNS.PLAYER_NUMBER
    }) || undefined,
    notes: validateString(player.notes, 'notes', {
      maxLength: FIELD_LIMITS.NOTES
    }) || undefined,
    isGoalie: validateBoolean(player.isGoalie, 'isGoalie') || false,
    receivedFairPlayCard: validateBoolean(player.receivedFairPlayCard, 'receivedFairPlayCard') || false
  };
}

/**
 * Validate game event data
 */
export function validateGameEventData(data: unknown): {
  id: string;
  type: string;
  time: number;
  scorerId?: string;
  assisterId?: string;
  entityId?: string;
} {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Game event data must be an object');
  }

  const event = data as Record<string, unknown>;

  const validTypes = ['goal', 'opponentGoal', 'substitution', 'periodEnd', 'gameEnd', 'fairPlayCard'];
  const type = validateString(event.type, 'event type', { required: true });
  
  if (!validTypes.includes(type)) {
    throw new ValidationError(`Event type must be one of: ${validTypes.join(', ')}`, 'type', type);
  }

  const time = validateNumber(event.time, 'event time', {
    required: true,
    min: 0,
    max: 86400, // 24 hours in seconds
    integer: false
  });

  const result = {
    id: validateString(event.id, 'event ID', { required: true, maxLength: 50 }),
    type,
    time: time!,
    scorerId: validateUUID(event.scorerId, 'scorer ID', false) || undefined,
    assisterId: validateUUID(event.assisterId, 'assister ID', false) || undefined,
    entityId: validateUUID(event.entityId, 'entity ID', false) || undefined
  };

  // Type-specific validation
  if (type === 'goal' && !result.scorerId) {
    throw new ValidationError('Goal events must have a scorer ID', 'scorerId');
  }

  return result;
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Batch validate multiple fields
 */
export function validateFields(
  data: Record<string, unknown>,
  validators: Record<string, (value: unknown) => unknown>
): Record<string, unknown> {
  const errors: string[] = [];
  const validated: Record<string, unknown> = {};

  for (const [field, validator] of Object.entries(validators)) {
    try {
      validated[field] = validator(data[field]);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(`${field}: ${error.message}`);
      } else {
        errors.push(`${field}: Validation failed`);
      }
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(`Validation failed: ${errors.join(', ')}`);
  }

  return validated;
}