/**
 * Form Validation System - Centralized Validation Utilities
 * 
 * This module provides a comprehensive validation system for forms with
 * reusable validation rules, schema builders, and type-safe validators.
 * Designed to work with the FormStore for consistent validation patterns.
 * 
 * Features:
 * - Predefined validation rules for common scenarios
 * - Schema builder for complex form validation
 * - Type-safe validators with TypeScript support
 * - Async validation support for server-side checks
 * - Localized error messages
 * - Custom validation rule creation
 */

import { FormValidationRule, FormFieldSchema, FormSchema, FieldValue } from '@/stores/formStore';
import logger from '@/utils/logger';

// ============================================================================
// Common Validation Rules
// ============================================================================

export const validationRules = {
  // Basic validation rules
  required: (message = 'This field is required'): FormValidationRule => ({
    type: 'required',
    message,
  }),

  minLength: (length: number, message?: string): FormValidationRule => ({
    type: 'minLength',
    value: length,
    message: message || `Must be at least ${length} characters`,
  }),

  maxLength: (length: number, message?: string): FormValidationRule => ({
    type: 'maxLength', 
    value: length,
    message: message || `Must be no more than ${length} characters`,
  }),

  // Pattern-based validation
  email: (message = 'Please enter a valid email address'): FormValidationRule => ({
    type: 'pattern',
    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message,
  }),

  phoneNumber: (message = 'Please enter a valid phone number'): FormValidationRule => ({
    type: 'pattern',
    value: /^\+?[\d\s\-\(\)]+$/,
    message,
  }),

  alphanumeric: (message = 'Only letters and numbers are allowed'): FormValidationRule => ({
    type: 'pattern',
    value: /^[a-zA-Z0-9]+$/,
    message,
  }),

  noSpecialChars: (message = 'Special characters are not allowed'): FormValidationRule => ({
    type: 'pattern',
    value: /^[a-zA-Z0-9\s]+$/,
    message,
  }),

  // Soccer-specific validation rules
  teamName: (message = 'Team name must be 2-50 characters'): FormValidationRule[] => [
    validationRules.required(message),
    validationRules.minLength(2, 'Team name must be at least 2 characters'),
    validationRules.maxLength(50, 'Team name must be no more than 50 characters'),
  ],

  playerName: (message = 'Player name must be 2-30 characters'): FormValidationRule[] => [
    validationRules.required(message),
    validationRules.minLength(2, 'Player name must be at least 2 characters'), 
    validationRules.maxLength(30, 'Player name must be no more than 30 characters'),
  ],

  jerseyNumber: (message = 'Jersey number must be between 1 and 99'): FormValidationRule => ({
    type: 'custom',
    message,
    validator: (value: FieldValue) => {
      const num = Number(value);
      return !isNaN(num) && num >= 1 && num <= 99;
    },
  }),

  gameLocation: (_message = 'Location must be 2-100 characters'): FormValidationRule[] => [
    validationRules.minLength(2, 'Location must be at least 2 characters'),
    validationRules.maxLength(100, 'Location must be no more than 100 characters'),
  ],

  gameDuration: (message = 'Duration must be between 10 and 180 minutes'): FormValidationRule => ({
    type: 'custom',
    message,
    validator: (value: FieldValue) => {
      const num = Number(value);
      return !isNaN(num) && num >= 10 && num <= 180;
    },
  }),

  // Date validation
  futureDate: (message = 'Date must be in the future'): FormValidationRule => ({
    type: 'custom',
    message,
    validator: (value: FieldValue) => {
      if (!value) return true; // Optional field
      const date = new Date(value as string);
      return date > new Date();
    },
  }),

  validDate: (message = 'Please enter a valid date'): FormValidationRule => ({
    type: 'custom',
    message,
    validator: (value: FieldValue) => {
      if (!value) return true; // Optional field
      const date = new Date(value as string);
      return !isNaN(date.getTime());
    },
  }),

  // Custom validation rule factory
  custom: (
    validator: (value: FieldValue, formValues: Record<string, FieldValue>) => boolean,
    message: string
  ): FormValidationRule => ({
    type: 'custom',
    message,
    validator,
  }),

  // Async validation rule factory
  async: (
    validator: (value: FieldValue, formValues: Record<string, FieldValue>) => Promise<boolean>,
    message: string
  ): FormValidationRule => ({
    type: 'async',
    message,
    validator,
  }),
};

// ============================================================================
// Schema Builders for Common Form Types
// ============================================================================

export const formSchemas = {
  // Game Settings Form Schema
  gameSettings: (overrides?: Partial<FormSchema>): FormSchema => ({
    formId: 'gameSettings',
    fields: {
      // Team Information
      teamName: {
        initialValue: '',
        validation: validationRules.teamName(),
        persist: true,
      },
      opponentName: {
        initialValue: '',
        validation: validationRules.teamName('Opponent name is required'),
        persist: true,
      },
      
      // Game Details
      gameDate: {
        initialValue: new Date().toISOString().split('T')[0],
        validation: [
          validationRules.required('Game date is required'),
          validationRules.validDate(),
        ],
        persist: true,
      },
      gameTime: {
        initialValue: '18:00',
        validation: [validationRules.required('Game time is required')],
        persist: true,
      },
      location: {
        initialValue: '',
        validation: validationRules.gameLocation(),
        persist: true,
      },
      
      // Game Structure
      periods: {
        initialValue: 2,
        validation: [
          validationRules.required('Number of periods is required'),
          validationRules.custom(
            (value) => {
              const num = Number(value);
              return !isNaN(num) && num >= 1 && num <= 4;
            },
            'Must be between 1 and 4 periods'
          ),
        ],
        persist: true,
      },
      periodDuration: {
        initialValue: 45,
        validation: [
          validationRules.required('Period duration is required'),
          validationRules.gameDuration(),
        ],
        persist: true,
      },
      breakDuration: {
        initialValue: 15,
        validation: [
          validationRules.custom(
            (value) => {
              const num = Number(value);
              return !isNaN(num) && num >= 0 && num <= 30;
            },
            'Break duration must be between 0 and 30 minutes'
          ),
        ],
        persist: true,
      },
      
      // Optional Fields
      notes: {
        initialValue: '',
        validation: [validationRules.maxLength(500, 'Notes must be no more than 500 characters')],
        persist: true,
      },
      demandFactor: {
        initialValue: 1.0,
        validation: [
          validationRules.custom(
            (value) => {
              const num = Number(value);
              return !isNaN(num) && num >= 0.1 && num <= 3.0;
            },
            'Demand factor must be between 0.1 and 3.0'
          ),
        ],
        persist: true,
      },
    },
    persistence: {
      enabled: true,
      key: 'gameSettings',
      restoreOnMount: true,
      excludeFields: ['notes'], // Don't persist notes for privacy
    },
    validation: {
      validateOnChange: true,
      validateOnBlur: true,
      validateOnMount: false,
      debounceMs: 300,
    },
    ...overrides,
  }),

  // Player/Roster Form Schema
  roster: (overrides?: Partial<FormSchema>): FormSchema => ({
    formId: 'roster',
    fields: {
      teamName: {
        initialValue: '',
        validation: validationRules.teamName(),
        persist: true,
      },
      // Dynamic player fields would be added programmatically
    },
    persistence: {
      enabled: true,
      key: 'roster',
      restoreOnMount: true,
    },
    validation: {
      validateOnChange: true,
      validateOnBlur: true,
      validateOnMount: false,
      debounceMs: 200,
    },
    ...overrides,
  }),

  // New Game Setup Form Schema
  newGameSetup: (overrides?: Partial<FormSchema>): FormSchema => ({
    formId: 'newGameSetup',
    fields: {
      setupType: {
        initialValue: 'quick',
        validation: [
          validationRules.required('Setup type is required'),
          validationRules.custom(
            (value) => ['quick', 'full', 'template'].includes(value as string),
            'Invalid setup type'
          ),
        ],
      },
      templateId: {
        initialValue: null,
        validation: [], // Optional field
      },
    },
    persistence: {
      enabled: false, // Don't persist setup form
      key: 'newGameSetup',
      restoreOnMount: false,
    },
    validation: {
      validateOnChange: true,
      validateOnBlur: false,
      validateOnMount: true,
      debounceMs: 100,
    },
    ...overrides,
  }),

  // Authentication Form Schema
  auth: (overrides?: Partial<FormSchema>): FormSchema => ({
    formId: 'auth',
    fields: {
      email: {
        initialValue: '',
        validation: [
          validationRules.required('Email is required'),
          validationRules.email(),
        ],
      },
      password: {
        initialValue: '',
        validation: [
          validationRules.required('Password is required'),
          validationRules.minLength(8, 'Password must be at least 8 characters'),
        ],
      },
    },
    persistence: {
      enabled: false, // Never persist auth data
      key: 'auth',
      restoreOnMount: false,
    },
    validation: {
      validateOnChange: false,
      validateOnBlur: true,
      validateOnMount: false,
      debounceMs: 500,
    },
    ...overrides,
  }),

  // Settings Form Schema  
  settings: (overrides?: Partial<FormSchema>): FormSchema => ({
    formId: 'settings',
    fields: {
      language: {
        initialValue: 'en',
        validation: [validationRules.required('Language is required')],
        persist: true,
      },
      defaultTeamName: {
        initialValue: '',
        validation: validationRules.teamName('Default team name is required'),
        persist: true,
      },
      notifications: {
        initialValue: true,
        validation: [],
        persist: true,
      },
      darkMode: {
        initialValue: false,
        validation: [],
        persist: true,
      },
    },
    persistence: {
      enabled: true,
      key: 'settings',
      restoreOnMount: true,
    },
    validation: {
      validateOnChange: true,
      validateOnBlur: true,
      validateOnMount: false,
      debounceMs: 200,
    },
    ...overrides,
  }),
};

// ============================================================================
// Advanced Validation Utilities
// ============================================================================

/**
 * Validate uniqueness of a value within a collection
 */
export function createUniquenessValidator<T>(
  collection: T[],
  accessor: (item: T) => string,
  message = 'This value must be unique'
): FormValidationRule {
  return {
    type: 'custom',
    message,
    validator: (value: FieldValue) => {
      if (!value) return true; // Empty values are not unique violations
      const stringValue = String(value).toLowerCase();
      const existing = collection.find(item => 
        accessor(item).toLowerCase() === stringValue
      );
      return !existing;
    },
  };
}

/**
 * Validate that a field matches another field
 */
export function createMatchValidator(
  targetFieldName: string,
  message = 'Fields must match'
): FormValidationRule {
  return {
    type: 'custom',
    message,
    validator: (value: FieldValue, formValues: Record<string, FieldValue>) => {
      return value === formValues[targetFieldName];
    },
  };
}

/**
 * Validate against a remote API endpoint
 */
export function createAsyncValidator(
  endpoint: string,
  message = 'Validation failed'
): FormValidationRule {
  return {
    type: 'async',
    message,
    validator: async (value: FieldValue) => {
      if (!value) return true;
      
      try {
        const response = await fetch(`${endpoint}?value=${encodeURIComponent(String(value))}`);
        const result = await response.json();
        return result.isValid === true;
      } catch (error) {
        logger.error('Async validation failed:', error);
        return false;
      }
    },
  };
}

/**
 * Create conditional validation based on other field values
 */
export function createConditionalValidator(
  condition: (formValues: Record<string, FieldValue>) => boolean,
  rules: FormValidationRule[],
  message = 'Conditional validation failed'
): FormValidationRule {
  return {
    type: 'custom',
    message,
    validator: async (value: FieldValue, formValues: Record<string, FieldValue>) => {
      if (!condition(formValues)) {
        return true; // Skip validation if condition not met
      }
      
      // Run all conditional rules
      for (const rule of rules) {
        let isValid: boolean;
        
        if (rule.type === 'async' && rule.validator) {
          isValid = await rule.validator(value, formValues);
        } else if (rule.validator) {
          const result = rule.validator(value, formValues);
          isValid = result instanceof Promise ? await result : result;
        } else {
          // Handle built-in rule types
          isValid = await validateBuiltInRule(value, rule);
        }
        
        if (!isValid) {
          return false;
        }
      }
      
      return true;
    },
  };
}

/**
 * Helper function to validate built-in rule types
 */
async function validateBuiltInRule(
  value: FieldValue,
  rule: FormValidationRule,
  // _formValues: Record<string, FieldValue>
): Promise<boolean> {
  switch (rule.type) {
    case 'required':
      return value !== null && value !== undefined && value !== '';
    
    case 'minLength':
      if (typeof value !== 'string') return true;
      return value.length >= (rule.value as number);
    
    case 'maxLength':
      if (typeof value !== 'string') return true;
      return value.length <= (rule.value as number);
    
    case 'pattern':
      if (typeof value !== 'string') return true;
      return (rule.value as RegExp).test(value);
    
    default:
      return true;
  }
}

// ============================================================================
// Form Schema Builder Utilities
// ============================================================================

/**
 * Create a form schema with dynamic fields
 */
export function createDynamicSchema(
  baseSchema: FormSchema,
  dynamicFields: Record<string, FormFieldSchema>
): FormSchema {
  return {
    ...baseSchema,
    fields: {
      ...baseSchema.fields,
      ...dynamicFields,
    },
  };
}

/**
 * Create player fields for roster forms
 */
export function createPlayerFields(playerCount: number): Record<string, FormFieldSchema> {
  const fields: Record<string, FormFieldSchema> = {};
  
  for (let i = 0; i < playerCount; i++) {
    fields[`player_${i}_name`] = {
      initialValue: '',
      validation: validationRules.playerName(),
      persist: true,
    };
    
    fields[`player_${i}_number`] = {
      initialValue: null,
      validation: [validationRules.jerseyNumber()],
      persist: true,
    };
    
    fields[`player_${i}_position`] = {
      initialValue: '',
      validation: [validationRules.maxLength(20, 'Position must be no more than 20 characters')],
      persist: true,
    };
  }
  
  return fields;
}

/**
 * Merge multiple validation rule arrays
 */
export function mergeValidationRules(...ruleArrays: (FormValidationRule | FormValidationRule[])[]): FormValidationRule[] {
  const merged: FormValidationRule[] = [];
  
  ruleArrays.forEach(rules => {
    if (Array.isArray(rules)) {
      merged.push(...rules);
    } else {
      merged.push(rules);
    }
  });
  
  return merged;
}

// ============================================================================
// Error Message Utilities
// ============================================================================

/**
 * Extract all error messages from a form
 */
export function extractFormErrors(
  errors: Record<string, string | null>
): string[] {
  return Object.values(errors).filter((error): error is string => error !== null);
}

/**
 * Format error messages for display
 */
export function formatErrorMessage(
  fieldName: string,
  error: string | null
): string | null {
  if (!error) return null;
  
  // Capitalize first letter and ensure proper punctuation
  const formatted = error.charAt(0).toUpperCase() + error.slice(1);
  return formatted.endsWith('.') ? formatted : `${formatted}.`;
}

/**
 * Create field-specific error messages
 */
export function createFieldErrorMap(
  fieldLabels: Record<string, string>
): Record<string, (message: string) => string> {
  const errorMap: Record<string, (message: string) => string> = {};
  
  Object.entries(fieldLabels).forEach(([fieldName, label]) => {
    errorMap[fieldName] = (message: string) => `${label}: ${message}`;
  });
  
  return errorMap;
}

// ============================================================================
// Export commonly used validation sets
// ============================================================================

export const commonValidation = {
  teamName: validationRules.teamName(),
  playerName: validationRules.playerName(),
  email: [validationRules.required(), validationRules.email()],
  password: [validationRules.required(), validationRules.minLength(6)],
  phoneNumber: [validationRules.phoneNumber()],
  required: validationRules.required(),
  optional: [] as FormValidationRule[],
};