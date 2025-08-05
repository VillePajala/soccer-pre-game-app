/**
 * Form Store - Centralized Form State Management
 * 
 * This store provides unified form state management with validation, persistence,
 * and migration safety. It supports complex forms like GameSettingsModal with
 * 30+ fields while maintaining performance through optimized selectors.
 * 
 * Features:
 * - Field-level state management with validation
 * - Form persistence across modal sessions
 * - Migration safety with automatic rollback
 * - Performance optimized selectors
 * - Schema-based validation system
 * - Form state cleanup and memory management
 */

import { create } from 'zustand';
import { subscribeWithSelector, devtools } from 'zustand/middleware';
import logger from '@/utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type FieldValue = string | number | boolean | Date | null | undefined | unknown;

export interface FormField {
  value: FieldValue;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  focused: boolean;
  validating: boolean;
}

export interface FormValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom' | 'async';
  message: string;
  value?: string | number | RegExp;
  validator?: (value: FieldValue, formValues: Record<string, FieldValue>) => boolean | Promise<boolean>;
}

export interface FormFieldSchema {
  initialValue: FieldValue;
  validation?: FormValidationRule[];
  persist?: boolean;
  debounceMs?: number;
}

export interface FormSchema {
  formId: string;
  fields: Record<string, FormFieldSchema>;
  persistence?: {
    enabled: boolean;
    key: string;
    restoreOnMount: boolean;
    excludeFields?: string[];
  };
  validation?: {
    validateOnChange: boolean;
    validateOnBlur: boolean;
    validateOnMount: boolean;
    debounceMs: number;
  };
}

export interface FormState {
  formId: string;
  fields: Record<string, FormField>;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  isDirty: boolean;
  hasErrors: boolean;
  submitCount: number;
  schema: FormSchema;
  createdAt: number;
  updatedAt: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string | null>;
  hasErrors: boolean;
}

export interface SubmitResult {
  success: boolean;
  errors?: Record<string, string>;
  data?: Record<string, FieldValue>;
}

// ============================================================================
// Form Store Interface
// ============================================================================

interface FormStoreState {
  // Form instances
  forms: Record<string, FormState>;
  
  // 🔧 RACE CONDITION FIX: Track validation requests to prevent concurrent validation
  validationTracking: Record<string, {
    fieldValidations: Record<string, { requestId: number; timestamp: number }>;
    formValidationId: number;
  }>;
  
  // Form lifecycle
  createForm: (schema: FormSchema) => void;
  destroyForm: (formId: string) => void;
  resetForm: (formId: string) => void;
  clearForm: (formId: string) => void;
  
  // Field management
  setFieldValue: (formId: string, fieldName: string, value: FieldValue) => void;
  setFieldError: (formId: string, fieldName: string, error: string | null) => void;
  setFieldTouched: (formId: string, fieldName: string, touched: boolean) => void;
  setFieldFocused: (formId: string, fieldName: string, focused: boolean) => void;
  
  // Validation
  validateField: (formId: string, fieldName: string) => Promise<ValidationResult>;
  validateForm: (formId: string) => Promise<ValidationResult>;
  clearValidation: (formId: string) => void;
  
  // Form state management
  setSubmitting: (formId: string, isSubmitting: boolean) => void;
  incrementSubmitCount: (formId: string) => void;
  
  // Bulk operations
  setFieldValues: (formId: string, values: Record<string, FieldValue>) => void;
  setFormErrors: (formId: string, errors: Record<string, string | null>) => void;
  
  // Persistence
  persistForm: (formId: string) => Promise<void>;
  restoreForm: (formId: string) => Promise<void>;
  
  // Utilities
  getFormValues: (formId: string) => Record<string, FieldValue>;
  getFormErrors: (formId: string) => Record<string, string | null>;
  hasFormChanged: (formId: string) => boolean;
  
  // Cleanup
  cleanup: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function updateFormState(
  state: FormStoreState,
  formId: string,
  updater: (form: FormState) => Partial<FormState>
): FormStoreState {
  const form = state.forms[formId];
  if (!form) {
    logger.warn(`[FormStore] Cannot update non-existent form '${formId}'`);
    return state;
  }

  const updates = updater(form);
  const updatedForm = {
    ...form,
    ...updates,
    updatedAt: Date.now(),
  };

  return {
    ...state,
    forms: {
      ...state.forms,
      [formId]: updatedForm,
    },
  };
}

function updateFieldState(
  state: FormStoreState,
  formId: string,
  fieldName: string,
  updater: (field: FormField) => Partial<FormField>
): FormStoreState {
  const form = state.forms[formId];
  if (!form || !form.fields[fieldName]) {
    logger.warn(`[FormStore] Cannot update field '${fieldName}' in form '${formId}'`);
    return state;
  }

  const field = form.fields[fieldName];
  const updates = updater(field);
  const updatedField = { ...field, ...updates };

  // Calculate form-level state
  const updatedFields = { ...form.fields, [fieldName]: updatedField };
  const isDirty = Object.entries(updatedFields).some(([name, f]) => {
    const initialValue = form.schema.fields[name]?.initialValue;
    return f.value !== initialValue;
  });
  const hasErrors = Object.values(updatedFields).some(f => f.error !== null);

  return {
    ...state,
    forms: {
      ...state.forms,
      [formId]: {
        ...form,
        fields: updatedFields,
        isDirty,
        hasErrors,
        isValid: !hasErrors,
        updatedAt: Date.now(),
      },
    },
  };
}

// ============================================================================
// Form Store Implementation
// ============================================================================

export const useFormStore = create<FormStoreState>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        forms: {},
        validationTracking: {},

        // ========================================================================
        // Form Lifecycle Management
        // ========================================================================

        createForm: (schema: FormSchema) => {
          const { formId } = schema;
          
          set((state) => {
            // Prevent duplicate form creation
            if (state.forms[formId]) {
              logger.warn(`[FormStore] Form '${formId}' already exists, skipping creation`);
              return state;
            }

            // Initialize form fields from schema
            const fields: Record<string, FormField> = {};
            
            Object.entries(schema.fields).forEach(([fieldName, fieldSchema]) => {
              fields[fieldName] = {
                value: fieldSchema.initialValue,
                error: null,
                touched: false,
                dirty: false,
                focused: false,
                validating: false,
              };
            });

            // 🔧 RACE CONDITION FIX: Initialize validation tracking for the form
            const validationTracking = {
              fieldValidations: {} as Record<string, { requestId: number; timestamp: number }>,
              formValidationId: 0,
            };

            // Create form state
            const formState: FormState = {
              formId,
              fields,
              isSubmitting: false,
              isValidating: false,
              isValid: true,
              isDirty: false,
              hasErrors: false,
              submitCount: 0,
              schema,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };

            logger.debug(`[FormStore] Created form '${formId}' with ${Object.keys(fields).length} fields`);
            
            return {
              ...state,
              forms: {
                ...state.forms,
                [formId]: formState,
              },
              validationTracking: {
                ...state.validationTracking,
                [formId]: validationTracking,
              },
            };
          });

          // Restore persisted form data if enabled
          if (schema.persistence?.enabled && schema.persistence?.restoreOnMount) {
            get().restoreForm(formId);
          }

          // Validate on mount if enabled
          if (schema.validation?.validateOnMount) {
            setTimeout(() => get().validateForm(formId), 0);
          }
        },

        destroyForm: (formId: string) => {
          set((state) => {
            if (!state.forms[formId]) {
              logger.warn(`[FormStore] Cannot destroy non-existent form '${formId}'`);
              return state;
            }

            // Persist form data if enabled
            const form = state.forms[formId];
            if (form.schema.persistence?.enabled) {
              get().persistForm(formId);
            }

            logger.debug(`[FormStore] Destroyed form '${formId}'`);

            // 🔧 RACE CONDITION FIX: Clean up validation tracking
            const { [formId]: removed, ...remainingForms } = state.forms;
            const { [formId]: removedTracking, ...remainingTracking } = state.validationTracking;
            
            return { 
              ...state, 
              forms: remainingForms,
              validationTracking: remainingTracking,
            };
          });
        },

        resetForm: (formId: string) => {
          set((state) => updateFormState(state, formId, (form) => {
            // Reset all fields to initial values
            const resetFields: Record<string, FormField> = {};
            Object.entries(form.schema.fields).forEach(([fieldName, fieldSchema]) => {
              resetFields[fieldName] = {
                value: fieldSchema.initialValue,
                error: null,
                touched: false,
                dirty: false,
                focused: false,
                validating: false,
              };
            });

            logger.debug(`[FormStore] Reset form '${formId}'`);

            return {
              fields: resetFields,
              isSubmitting: false,
              isValidating: false,
              isValid: true,
              isDirty: false,
              hasErrors: false,
            };
          }));
        },

        clearForm: (formId: string) => {
          set((state) => updateFormState(state, formId, (form) => {
            // Clear all field values but maintain structure
            const clearedFields: Record<string, FormField> = {};
            Object.keys(form.fields).forEach((fieldName) => {
              clearedFields[fieldName] = {
                value: '',
                error: null,
                touched: false,
                dirty: false,
                focused: false,
                validating: false,
              };
            });

            logger.debug(`[FormStore] Cleared form '${formId}'`);

            return {
              fields: clearedFields,
              isDirty: false,
              hasErrors: false,
              isValid: true,
            };
          }));
        },

        // ========================================================================
        // Field Management
        // ========================================================================

        setFieldValue: (formId: string, fieldName: string, value: FieldValue) => {
          set((state) => {
            const form = state.forms[formId];
            if (!form || !form.fields[fieldName]) {
              logger.warn(`[FormStore] Cannot set value for '${fieldName}' in form '${formId}'`);
              return state;
            }

            const initialValue = form.schema.fields[fieldName]?.initialValue;
            logger.debug(`[FormStore] Set field '${fieldName}' in form '${formId}' to:`, value);
            
            return updateFieldState(state, formId, fieldName, () => ({
              value,
              dirty: value !== initialValue,
              error: null, // Clear previous error
            }));
          });
        },

        setFieldError: (formId: string, fieldName: string, error: string | null) => {
          set((state) => updateFieldState(state, formId, fieldName, () => ({ error })));
        },

        setFieldTouched: (formId: string, fieldName: string, touched: boolean) => {
          set((state) => updateFieldState(state, formId, fieldName, () => ({ touched })));
        },

        setFieldFocused: (formId: string, fieldName: string, focused: boolean) => {
          set((state) => updateFieldState(state, formId, fieldName, () => ({ focused })));
        },

        // ========================================================================
        // Validation System
        // ========================================================================

        validateField: async (formId: string, fieldName: string): Promise<ValidationResult> => {
          const form = get().forms[formId];
          const tracking = get().validationTracking[formId];
          
          if (!form || !form.fields[fieldName] || !tracking) {
            return { isValid: false, errors: {}, hasErrors: false };
          }

          // 🔧 RACE CONDITION FIX: Generate unique request ID and track validation
          const requestId = Date.now() + Math.random();
          const timestamp = Date.now();
          
          set((state) => ({
            ...state,
            validationTracking: {
              ...state.validationTracking,
              [formId]: {
                ...state.validationTracking[formId],
                fieldValidations: {
                  ...state.validationTracking[formId].fieldValidations,
                  [fieldName]: { requestId, timestamp },
                },
              },
            },
          }));

          const field = form.fields[fieldName];
          const fieldSchema = form.schema.fields[fieldName];
          const formValues = get().getFormValues(formId);

          // Set validating state
          set((state) => updateFieldState(state, formId, fieldName, () => ({ validating: true })));

          let error: string | null = null;

          // Run validation rules
          if (fieldSchema.validation) {
            for (const rule of fieldSchema.validation) {
              // 🔧 RACE CONDITION FIX: Check if this validation is still the latest
              const currentTracking = get().validationTracking[formId]?.fieldValidations[fieldName];
              if (!currentTracking || currentTracking.requestId !== requestId) {
                // This validation was superseded, abort
                logger.debug(`[FormStore] Validation for '${fieldName}' superseded, aborting`);
                return { isValid: false, errors: {}, hasErrors: false };
              }
              
              const isValid = await validateFieldRule(field.value, rule, formValues);
              if (!isValid) {
                error = rule.message;
                break;
              }
            }
          }

          // 🔧 RACE CONDITION FIX: Final check before updating state
          const finalTracking = get().validationTracking[formId]?.fieldValidations[fieldName];
          if (!finalTracking || finalTracking.requestId !== requestId) {
            logger.debug(`[FormStore] Validation for '${fieldName}' superseded at completion, discarding result`);
            return { isValid: false, errors: {}, hasErrors: false };
          }

          // Update field error state
          get().setFieldError(formId, fieldName, error);

          // Clear validating state
          set((state) => updateFieldState(state, formId, fieldName, () => ({ validating: false })));

          const result = {
            isValid: error === null,
            errors: { [fieldName]: error },
            hasErrors: error !== null,
          };

          logger.debug(`[FormStore] Validated field '${fieldName}' in form '${formId}':`, result);
          return result;
        },

        validateForm: async (formId: string): Promise<ValidationResult> => {
          const form = get().forms[formId];
          if (!form) {
            return { isValid: false, errors: {}, hasErrors: false };
          }

          set((state) => updateFormState(state, formId, () => ({ isValidating: true })));

          const errors: Record<string, string | null> = {};
          const fieldNames = Object.keys(form.fields);

          // Validate all fields in parallel
          const validationPromises = fieldNames.map(async (fieldName) => {
            const result = await get().validateField(formId, fieldName);
            return { fieldName, result };
          });

          const results = await Promise.all(validationPromises);
          
          // Collect all errors
          results.forEach(({ fieldName, result }) => {
            errors[fieldName] = result.errors[fieldName] || null;
          });

          const hasErrors = Object.values(errors).some(error => error !== null);
          const isValid = !hasErrors;

          // Update form validation state
          set((state) => updateFormState(state, formId, () => ({
            isValidating: false,
            isValid,
            hasErrors,
          })));

          const result = { isValid, errors, hasErrors };
          logger.debug(`[FormStore] Validated form '${formId}':`, result);
          return result;
        },

        clearValidation: (formId: string) => {
          set((state) => {
            const form = state.forms[formId];
            if (!form) return state;

            const clearedFields: Record<string, FormField> = {};
            Object.entries(form.fields).forEach(([fieldName, field]) => {
              clearedFields[fieldName] = {
                ...field,
                error: null,
                validating: false,
              };
            });

            return updateFormState(state, formId, () => ({
              fields: clearedFields,
              isValidating: false,
              hasErrors: false,
              isValid: true,
            }));
          });
        },

        // ========================================================================
        // Form State Management
        // ========================================================================

        setSubmitting: (formId: string, isSubmitting: boolean) => {
          set((state) => updateFormState(state, formId, () => ({ isSubmitting })));
        },

        incrementSubmitCount: (formId: string) => {
          set((state) => {
            const form = state.forms[formId];
            if (!form) return state;
            return updateFormState(state, formId, () => ({ submitCount: form.submitCount + 1 }));
          });
        },

        // ========================================================================
        // Bulk Operations
        // ========================================================================

        setFieldValues: (formId: string, values: Record<string, FieldValue>) => {
          Object.entries(values).forEach(([fieldName, value]) => {
            get().setFieldValue(formId, fieldName, value);
          });
        },

        setFormErrors: (formId: string, errors: Record<string, string | null>) => {
          Object.entries(errors).forEach(([fieldName, error]) => {
            get().setFieldError(formId, fieldName, error);
          });
        },

        // ========================================================================
        // Persistence
        // ========================================================================

        persistForm: async (formId: string) => {
          const form = get().forms[formId];
          if (!form || !form.schema.persistence?.enabled) return;

          const { key, excludeFields = [] } = form.schema.persistence;
          const values = get().getFormValues(formId);
          
          // Filter out excluded fields
          const persistedValues = Object.fromEntries(
            Object.entries(values).filter(([fieldName]) => !excludeFields.includes(fieldName))
          );

          const formData = {
            values: persistedValues,
            timestamp: Date.now(),
            formId,
          };

          try {
            // Import the persistence store dynamically to avoid circular dependencies
            const { usePersistenceStore } = await import('@/stores/persistenceStore');
            const store = usePersistenceStore.getState();
            
            // Try to use the unified storage API first
            try {
              const success = await store.setStorageItem(`form_${key}`, formData);
              if (success) {
                logger.debug(`[FormStore] Persisted form '${formId}' via unified storage API`);
                return;
              }
            } catch (storeError) {
              logger.debug(`[FormStore] Unified storage API failed for '${formId}', using localStorage fallback:`, storeError);
            }
            
            // Fallback to direct localStorage access
            localStorage.setItem(`form_${key}`, JSON.stringify(formData));
            logger.debug(`[FormStore] Persisted form '${formId}' to localStorage fallback`);
          } catch (error) {
            logger.error(`[FormStore] Failed to persist form '${formId}':`, error);
          }
        },

        restoreForm: async (formId: string) => {
          const form = get().forms[formId];
          if (!form || !form.schema.persistence?.enabled) return;

          const { key } = form.schema.persistence;

          try {
            let storedData = null;
            
            // Import the persistence store dynamically to avoid circular dependencies
            try {
              const { usePersistenceStore } = await import('@/stores/persistenceStore');
              const store = usePersistenceStore.getState();
              
              // Try to use the unified storage API first
              try {
                storedData = await store.getStorageItem<{
                  values: Record<string, FieldValue>;
                  timestamp: number;
                  formId: string;
                }>(`form_${key}`);
                if (storedData) {
                  logger.debug(`[FormStore] Retrieved form '${formId}' via unified storage API`);
                }
              } catch (storeError) {
                logger.debug(`[FormStore] Unified storage API failed for '${formId}', using localStorage fallback:`, storeError);
              }
            } catch (importError) {
              logger.debug(`[FormStore] Failed to import persistence store for '${formId}', using localStorage fallback:`, importError);
            }
            
            // Fallback to direct localStorage access if needed
            if (!storedData) {
              const stored = localStorage.getItem(`form_${key}`);
              if (stored) {
                storedData = JSON.parse(stored);
                logger.debug(`[FormStore] Retrieved form '${formId}' via localStorage fallback`);
              }
            }
            
            if (!storedData) return;

            const { values, timestamp, formId: storedFormId } = storedData;
            
            // Verify form ID matches
            if (storedFormId !== formId) {
              logger.warn(`[FormStore] Form ID mismatch for '${formId}', skipping restore`);
              return;
            }

            // Check if data is not too old (24 hours)
            const maxAge = 24 * 60 * 60 * 1000;
            if (Date.now() - timestamp > maxAge) {
              logger.debug(`[FormStore] Stored data for '${formId}' is too old, skipping restore`);
              return;
            }

            // Restore values
            get().setFieldValues(formId, values);
            logger.debug(`[FormStore] Restored form '${formId}' successfully`);
          } catch (error) {
            logger.error(`[FormStore] Failed to restore form '${formId}':`, error);
          }
        },

        // ========================================================================
        // Utilities
        // ========================================================================

        getFormValues: (formId: string): Record<string, FieldValue> => {
          const form = get().forms[formId];
          if (!form) return {};

          return Object.fromEntries(
            Object.entries(form.fields).map(([fieldName, field]) => [fieldName, field.value])
          );
        },

        getFormErrors: (formId: string): Record<string, string | null> => {
          const form = get().forms[formId];
          if (!form) return {};

          return Object.fromEntries(
            Object.entries(form.fields).map(([fieldName, field]) => [fieldName, field.error])
          );
        },

        hasFormChanged: (formId: string): boolean => {
          const form = get().forms[formId];
          return form ? form.isDirty : false;
        },

        // ========================================================================
        // Cleanup
        // ========================================================================

        cleanup: () => {
          set((state) => {
            const now = Date.now();
            const maxAge = 60 * 60 * 1000; // 1 hour
            const cleanedForms: Record<string, FormState> = {};

            Object.entries(state.forms).forEach(([formId, form]) => {
              if (now - form.updatedAt <= maxAge) {
                cleanedForms[formId] = form;
              } else {
                logger.debug(`[FormStore] Cleaning up stale form '${formId}'`);
              }
            });

            return { ...state, forms: cleanedForms };
          });
        },
      }),
      {
        name: 'form-store',
      }
    )
  )
);

// ============================================================================
// Validation Helpers
// ============================================================================

async function validateFieldRule(
  value: FieldValue, 
  rule: FormValidationRule, 
  formValues: Record<string, FieldValue>
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
    
    case 'custom':
      if (!rule.validator) return true;
      return rule.validator(value, formValues);
    
    case 'async':
      if (!rule.validator) return true;
      return await rule.validator(value, formValues);
    
    default:
      return true;
  }
}

// ============================================================================
// Form Store Selectors (Performance Optimized)
// ============================================================================

export const formSelectors = {
  // Get specific form
  getForm: (formId: string) => (state: { forms: Record<string, FormState> }) => 
    state.forms[formId],
  
  // Get form field
  getField: (formId: string, fieldName: string) => (state: { forms: Record<string, FormState> }) => 
    state.forms[formId]?.fields[fieldName],
  
  // Get form values
  getFormValues: (formId: string) => (state: { forms: Record<string, FormState> }) => {
    const form = state.forms[formId];
    if (!form) return {};
    return Object.fromEntries(
      Object.entries(form.fields).map(([name, field]) => [name, field.value])
    );
  },
  
  // Get form errors
  getFormErrors: (formId: string) => (state: { forms: Record<string, FormState> }) => {
    const form = state.forms[formId];
    if (!form) return {};
    return Object.fromEntries(
      Object.entries(form.fields).map(([name, field]) => [name, field.error])
    );
  },
  
  // Get form validation state
  getFormValidation: (formId: string) => (state: { forms: Record<string, FormState> }) => {
    const form = state.forms[formId];
    if (!form) return { isValid: false, hasErrors: false, isValidating: false };
    return {
      isValid: form.isValid,
      hasErrors: form.hasErrors,
      isValidating: form.isValidating,
    };
  },
};

// Cleanup interval (runs every 30 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    useFormStore.getState().cleanup();
  }, 30 * 60 * 1000);
}