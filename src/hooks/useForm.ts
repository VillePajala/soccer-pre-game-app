/**
 * Form Management Hooks - Core Form State Integration
 * 
 * These hooks provide a React interface to the FormStore with migration safety,
 * field-level management, and performance optimization. Designed to replace
 * scattered useState calls with centralized form state management.
 * 
 * Features:
 * - Migration-safe implementation with automatic rollback
 * - Field-level hooks for granular control
 * - Performance-optimized selectors
 * - Form lifecycle management
 * - Validation integration
 * - Persistence support
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFormStore, FormSchema, FieldValue, ValidationResult } from '@/stores/formStore';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import logger from '@/utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface UseFormOptions {
  onSubmit?: (values: Record<string, FieldValue>) => Promise<void> | void;
  onValidationError?: (errors: Record<string, string | null>) => void;
  onFieldChange?: (fieldName: string, value: FieldValue) => void;
  resetOnSubmit?: boolean;
  validateOnMount?: boolean;
  persistForm?: boolean;
}

export interface UseFormResult<T = Record<string, FieldValue>> {
  // Form state
  values: T;
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  isDirty: boolean;
  hasErrors: boolean;
  
  // Field helpers
  getField: (name: keyof T) => UseFormFieldResult;
  
  // Form actions
  setFieldValue: (name: keyof T, value: T[keyof T]) => void;
  setFieldError: (name: keyof T, error: string | null) => void;
  setFieldTouched: (name: keyof T, touched: boolean) => void;
  setFieldValues: (values: Partial<T>) => void;
  
  // Form operations
  validate: () => Promise<ValidationResult>;
  submit: () => Promise<void>;
  reset: () => void;
  clear: () => void;
  
  // Form state queries
  hasChanged: () => boolean;
  getSubmitCount: () => number;
  
  // Migration status
  migrationStatus: 'zustand' | 'legacy';
}

export interface UseFormFieldOptions {
  onChange?: (value: FieldValue) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  validate?: boolean;
  debounceMs?: number;
}

export interface UseFormFieldResult {
  value: FieldValue;
  error: string | null;
  touched: boolean;
  focused: boolean;
  dirty: boolean;
  validating: boolean;
  
  // Field actions
  onChange: (value: FieldValue) => void;
  onBlur: () => void;
  onFocus: () => void;
  setValue: (value: FieldValue) => void;
  setError: (error: string | null) => void;
  setTouched: (touched: boolean) => void;
  
  // Field state
  isValid: boolean;
  hasError: boolean;
}

// ============================================================================
// Main Form Hook
// ============================================================================

/**
 * Primary hook for form management with migration safety
 * 🔧 HOOKS RULES FIX: All hooks called consistently regardless of migration mode
 */
export function useForm<T extends Record<string, FieldValue> = Record<string, FieldValue>>(
  schema: FormSchema,
  options: UseFormOptions = {}
): UseFormResult<T> {
  const { shouldUseLegacy } = useMigrationSafety('FormState');
  const formId = schema.formId;
  
  // ALL HOOKS MUST BE CALLED IN CONSISTENT ORDER - NO CONDITIONAL HOOKS
  
  // Refs for stable callbacks
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  // Store actions (always called)
  const createForm = useFormStore((state) => state.createForm);
  const destroyForm = useFormStore((state) => state.destroyForm);
  const setFieldValue = useFormStore((state) => state.setFieldValue);
  const setFieldError = useFormStore((state) => state.setFieldError);
  const setFieldTouched = useFormStore((state) => state.setFieldTouched);
  const setFieldValues = useFormStore((state) => state.setFieldValues);
  const validateForm = useFormStore((state) => state.validateForm);
  const resetForm = useFormStore((state) => state.resetForm);
  const clearForm = useFormStore((state) => state.clearForm);
  const setSubmitting = useFormStore((state) => state.setSubmitting);
  const incrementSubmitCount = useFormStore((state) => state.incrementSubmitCount);
  
  // Form state subscription (always called)
  const form = useFormStore((state) => state.forms[formId]);
  
  // Legacy fallback (always called to maintain hook order)
  const legacyResult = useLegacyForm<T>(formId, schema, options);
  
  // Initialize form on mount (always called)
  useEffect(() => {
    if (!shouldUseLegacy && !form) {
      logger.debug(`[useForm] Creating form '${formId}'`);
      createForm(schema);
    }
    
    return () => {
      // Cleanup on unmount
      if (!shouldUseLegacy && form) {
        logger.debug(`[useForm] Destroying form '${formId}'`);
        destroyForm(formId);
      }
    };
  }, [shouldUseLegacy, formId, createForm, destroyForm, form, schema]);
  
  // Validate on mount if enabled (always called)
  useEffect(() => {
    if (!shouldUseLegacy && form && (options.validateOnMount || schema.validation?.validateOnMount)) {
      validateForm(formId);
    }
  }, [shouldUseLegacy, form, formId, validateForm, options.validateOnMount, schema.validation?.validateOnMount]);
  
  // Field change callback (always called)
  const handleFieldChange = useCallback((fieldName: string, value: FieldValue) => {
    if (optionsRef.current.onFieldChange) {
      optionsRef.current.onFieldChange(fieldName, value);
    }
  }, []);
  
  // Memoized field helpers (always called)
  const getField = useCallback((name: keyof T): UseFormFieldResult => {
    if (shouldUseLegacy) {
      return legacyResult.getField(name);
    }
    
    const field = form?.fields[name as string];
    
    if (!field) {
      // Return empty field state if field doesn't exist
      return {
        value: '',
        error: null,
        touched: false,
        focused: false,
        dirty: false,
        validating: false,
        onChange: () => {},
        onBlur: () => {},
        onFocus: () => {},
        setValue: () => {},
        setError: () => {},
        setTouched: () => {},
        isValid: true,
        hasError: false,
      };
    }
    
    return {
      value: field.value,
      error: field.error,
      touched: field.touched,
      focused: field.focused, 
      dirty: field.dirty,
      validating: field.validating,
      
      onChange: (value: FieldValue) => {
        setFieldValue(formId, name as string, value);
        handleFieldChange(name as string, value);
      },
      onBlur: () => setFieldTouched(formId, name as string, true),
      onFocus: () => useFormStore.getState().setFieldFocused(formId, name as string, true),
      setValue: (value: FieldValue) => setFieldValue(formId, name as string, value),
      setError: (error: string | null) => setFieldError(formId, name as string, error),
      setTouched: (touched: boolean) => setFieldTouched(formId, name as string, touched),
      
      isValid: field.error === null,
      hasError: field.error !== null,
    };
  }, [shouldUseLegacy, legacyResult, form, formId, setFieldValue, setFieldError, setFieldTouched, handleFieldChange]);
  
  // Form actions (always called)
  const handleSetFieldValue = useCallback((name: keyof T, value: T[keyof T]) => {
    if (shouldUseLegacy) {
      return legacyResult.setFieldValue(name, value);
    }
    setFieldValue(formId, name as string, value);
    handleFieldChange(name as string, value);
  }, [shouldUseLegacy, legacyResult, formId, setFieldValue, handleFieldChange]);
  
  const handleSetFieldError = useCallback((name: keyof T, error: string | null) => {
    if (shouldUseLegacy) {
      return legacyResult.setFieldError(name, error);
    }
    setFieldError(formId, name as string, error);
  }, [shouldUseLegacy, legacyResult, formId, setFieldError]);
  
  const handleSetFieldTouched = useCallback((name: keyof T, touched: boolean) => {
    if (shouldUseLegacy) {
      return legacyResult.setFieldTouched(name, touched);
    }
    setFieldTouched(formId, name as string, touched);
  }, [shouldUseLegacy, legacyResult, formId, setFieldTouched]);
  
  const handleSetFieldValues = useCallback((values: Partial<T>) => {
    if (shouldUseLegacy) {
      return legacyResult.setFieldValues(values);
    }
    setFieldValues(formId, values as Record<string, FieldValue>);
    
    // Trigger field change callbacks
    Object.entries(values).forEach(([fieldName, value]) => {
      handleFieldChange(fieldName, value);
    });
  }, [shouldUseLegacy, legacyResult, formId, setFieldValues, handleFieldChange]);
  
  const handleValidate = useCallback(async (): Promise<ValidationResult> => {
    if (shouldUseLegacy) {
      return legacyResult.validate();
    }
    
    const result = await validateForm(formId);
    
    if (result.hasErrors && optionsRef.current.onValidationError) {
      optionsRef.current.onValidationError(result.errors);
    }
    
    return result;
  }, [shouldUseLegacy, legacyResult, formId, validateForm]);
  
  const handleSubmit = useCallback(async (): Promise<void> => {
    if (shouldUseLegacy) {
      return legacyResult.submit();
    }
    
    if (!optionsRef.current.onSubmit) {
      logger.warn(`[useForm] No onSubmit handler provided for form '${formId}'`);
      return;
    }
    
    try {
      setSubmitting(formId, true);
      incrementSubmitCount(formId);
      
      // Validate before submit
      const validationResult = await validateForm(formId);
      if (!validationResult.isValid) {
        if (optionsRef.current.onValidationError) {
          optionsRef.current.onValidationError(validationResult.errors);
        }
        return;
      }
      
      // Submit form
      const currentFormValues = form ? Object.fromEntries(
        Object.entries(form.fields).map(([name, field]) => [name, field.value])
      ) : {};
      await optionsRef.current.onSubmit(currentFormValues);
      
      // Reset form if enabled
      if (optionsRef.current.resetOnSubmit) {
        resetForm(formId);
      }
      
      logger.debug(`[useForm] Successfully submitted form '${formId}'`);
    } catch (error) {
      logger.error(`[useForm] Form submission failed for '${formId}':`, error);
      throw error;
    } finally {
      setSubmitting(formId, false);
    }
  }, [shouldUseLegacy, legacyResult, formId, setSubmitting, incrementSubmitCount, validateForm, form, resetForm]);
  
  const handleReset = useCallback(() => {
    if (shouldUseLegacy) {
      return legacyResult.reset();
    }
    resetForm(formId);
  }, [shouldUseLegacy, legacyResult, formId, resetForm]);
  
  const handleClear = useCallback(() => {
    if (shouldUseLegacy) {
      return legacyResult.clear();
    }
    clearForm(formId);
  }, [shouldUseLegacy, legacyResult, formId, clearForm]);
  
  // Form state queries (always called)
  const hasChanged = useCallback(() => {
    if (shouldUseLegacy) {
      return legacyResult.hasChanged();
    }
    return form ? form.isDirty : false;
  }, [shouldUseLegacy, legacyResult, form]);
  
  const getSubmitCount = useCallback(() => {
    if (shouldUseLegacy) {
      return legacyResult.getSubmitCount();
    }
    return form ? form.submitCount : 0;
  }, [shouldUseLegacy, legacyResult, form]);
  
  // Return form interface (always called)
  const result = useMemo(() => {
    // Early return for legacy mode
    if (shouldUseLegacy) {
      return legacyResult;
    }
    
    const currentValues = form ? Object.fromEntries(
      Object.entries(form.fields).map(([name, field]) => [name, field.value])
    ) : {};
    
    const currentErrors = form ? Object.fromEntries(
      Object.entries(form.fields).map(([name, field]) => [name, field.error])
    ) : {};
    
    const currentTouched = form ? Object.fromEntries(
      Object.entries(form.fields).map(([name, field]) => [name, field.touched])
    ) : {};

    return {
      // Form state
      values: currentValues as T,
      errors: currentErrors,
      touched: currentTouched,
      isSubmitting: form ? form.isSubmitting : false,
      isValidating: form ? form.isValidating : false,
      isValid: form ? form.isValid : true,
      isDirty: form ? form.isDirty : false,
      hasErrors: form ? form.hasErrors : false,
      
      // Field helpers
      getField,
      
      // Form actions
      setFieldValue: handleSetFieldValue,
      setFieldError: handleSetFieldError,
      setFieldTouched: handleSetFieldTouched,
      setFieldValues: handleSetFieldValues,
      
      // Form operations
      validate: handleValidate,
      submit: handleSubmit,
      reset: handleReset,
      clear: handleClear,
      
      // Form state queries
      hasChanged,
      getSubmitCount,
      
      // Migration status
      migrationStatus: 'zustand' as const,
    };
  }, [
    shouldUseLegacy,
    legacyResult,
    form,
    getField,
    handleSetFieldValue,
    handleSetFieldError,
    handleSetFieldTouched,
    handleSetFieldValues,
    handleValidate,
    handleSubmit,
    handleReset,
    handleClear,
    hasChanged,
    getSubmitCount,
  ]);
  
  return result;
}

// ============================================================================
// Legacy Form Implementation  
// ============================================================================

function useLegacyForm<T extends Record<string, FieldValue> = Record<string, FieldValue>>(
  _formId: string,
  _schema: FormSchema,
  _options: UseFormOptions
): UseFormResult<T> {
  logger.debug('[useForm] Using legacy implementation');
  
  // Create minimal interface for legacy mode
  return {
    // Form state (empty in legacy mode)
    values: {} as T,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValidating: false,
    isValid: true,
    isDirty: false,
    hasErrors: false,
    
    // Field helpers
    getField: () => ({
      value: '',
      error: null,
      touched: false,
      focused: false,
      dirty: false,
      validating: false,
      onChange: () => {},
      onBlur: () => {},
      onFocus: () => {},
      setValue: () => {},
      setError: () => {},
      setTouched: () => {},
      isValid: true,
      hasError: false,
    }),
    
    // Form actions (no-ops in legacy mode)
    setFieldValue: () => {},
    setFieldError: () => {},
    setFieldTouched: () => {},
    setFieldValues: () => {},
    
    // Form operations (no-ops in legacy mode)
    validate: async () => ({ isValid: true, errors: {}, hasErrors: false }),
    submit: async () => {},
    reset: () => {},
    clear: () => {},
    
    // Form state queries (defaults in legacy mode)
    hasChanged: () => false,
    getSubmitCount: () => 0,
    
    // Migration status
    migrationStatus: 'legacy',
  };
}

// ============================================================================
// Individual Field Hook
// ============================================================================

/**
 * Hook for managing individual form fields
 * 🔧 HOOKS RULES FIX: All hooks called consistently regardless of migration mode
 */
export function useFormField(
  formId: string,
  fieldName: string,
  options: UseFormFieldOptions = {}
): UseFormFieldResult {
  const { shouldUseLegacy } = useMigrationSafety('FormField');
  
  // Store actions (always called)
  const setFieldValue = useFormStore((state) => state.setFieldValue);
  const setFieldError = useFormStore((state) => state.setFieldError);
  const setFieldTouched = useFormStore((state) => state.setFieldTouched);
  const setFieldFocused = useFormStore((state) => state.setFieldFocused);
  // const validateField = useFormStore((state) => state.validateField);
  
  // Field selector (always called)
  const field = useFormStore((state) => state.forms[formId]?.fields[fieldName]);
  
  // Legacy fallback (always called)
  const legacyResult = useLegacyFormField(formId, fieldName, options);
  
  // Return appropriate result based on migration mode
  if (shouldUseLegacy) {
    return legacyResult;
  }
  
  if (!field) {
    return {
      value: '',
      error: null,
      touched: false,
      focused: false,
      dirty: false,
      validating: false,
      onChange: () => {},
      onBlur: () => {},
      onFocus: () => {},
      setValue: () => {},
      setError: () => {},
      setTouched: () => {},
      isValid: true,
      hasError: false,
    };
  }
  
  return {
    value: field.value,
    error: field.error,
    touched: field.touched,
    focused: field.focused,
    dirty: field.dirty,
    validating: field.validating,
    
    onChange: (value: FieldValue) => {
      setFieldValue(formId, fieldName, value);
      if (options.onChange) {
        options.onChange(value);
      }
    },
    onBlur: () => {
      setFieldTouched(formId, fieldName, true);
      if (options.onBlur) {
        options.onBlur();
      }
    },
    onFocus: () => {
      setFieldFocused(formId, fieldName, true);
      if (options.onFocus) {
        options.onFocus();
      }
    },
    setValue: (value: FieldValue) => setFieldValue(formId, fieldName, value),
    setError: (error: string | null) => setFieldError(formId, fieldName, error),
    setTouched: (touched: boolean) => setFieldTouched(formId, fieldName, touched),
    
    isValid: field.error === null,
    hasError: field.error !== null,
  };
}

function useLegacyFormField(
  _formId: string,
  _fieldName: string,
  _options: UseFormFieldOptions
): UseFormFieldResult {
  return {
    value: '',
    error: null,
    touched: false,
    focused: false,
    dirty: false,
    validating: false,
    onChange: () => {},
    onBlur: () => {},
    onFocus: () => {},
    setValue: () => {},
    setError: () => {},
    setTouched: () => {},
    isValid: true,
    hasError: false,
  };
}