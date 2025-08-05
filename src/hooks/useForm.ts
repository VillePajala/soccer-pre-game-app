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
import { useFormStore, formSelectors, FormSchema, FormState, FieldValue, ValidationResult } from '@/stores/formStore';
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
 */
export function useForm<T extends Record<string, FieldValue> = Record<string, FieldValue>>(
  schema: FormSchema,
  options: UseFormOptions = {}
): UseFormResult<T> {
  const { shouldUseLegacy } = useMigrationSafety('FormState');
  const formId = schema.formId;
  
  // Store actions
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
  
  // Form state subscription (direct access to avoid selector loops)
  const form = useFormStore((state) => state.forms[formId]);
  
  // Refs for stable callbacks
  const optionsRef = useRef(options);
  optionsRef.current = options;
  
  // Legacy fallback (if migration safety is enabled)
  if (shouldUseLegacy) {
    return useLegacyForm<T>(formId, schema, options);
  }
  
  // Initialize form on mount
  useEffect(() => {
    if (!form) {
      logger.debug(`[useForm] Creating form '${formId}'`);
      createForm(schema);
    }
    
    return () => {
      // Cleanup on unmount
      if (form) {
        logger.debug(`[useForm] Destroying form '${formId}'`);
        destroyForm(formId);
      }
    };
  }, [formId, createForm, destroyForm, form, schema]);
  
  // Validate on mount if enabled
  useEffect(() => {
    if (form && (options.validateOnMount || schema.validation?.validateOnMount)) {
      validateForm(formId);
    }
  }, [form, formId, validateForm, options.validateOnMount, schema.validation?.validateOnMount]);
  
  // Field change callback
  const handleFieldChange = useCallback((fieldName: string, value: FieldValue) => {
    if (optionsRef.current.onFieldChange) {
      optionsRef.current.onFieldChange(fieldName, value);
    }
  }, []);
  
  // Memoized field helpers
  const getField = useCallback((name: keyof T): UseFormFieldResult => {
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
  }, [form, formId, setFieldValue, setFieldError, setFieldTouched, handleFieldChange]);
  
  // Form actions
  const handleSetFieldValue = useCallback((name: keyof T, value: T[keyof T]) => {
    setFieldValue(formId, name as string, value);
    handleFieldChange(name as string, value);
  }, [formId, setFieldValue, handleFieldChange]);
  
  const handleSetFieldError = useCallback((name: keyof T, error: string | null) => {
    setFieldError(formId, name as string, error);
  }, [formId, setFieldError]);
  
  const handleSetFieldTouched = useCallback((name: keyof T, touched: boolean) => {
    setFieldTouched(formId, name as string, touched);
  }, [formId, setFieldTouched]);
  
  const handleSetFieldValues = useCallback((values: Partial<T>) => {
    setFieldValues(formId, values as Record<string, FieldValue>);
    
    // Trigger field change callbacks
    Object.entries(values).forEach(([fieldName, value]) => {
      handleFieldChange(fieldName, value);
    });
  }, [formId, setFieldValues, handleFieldChange]);
  
  const handleValidate = useCallback(async (): Promise<ValidationResult> => {
    const result = await validateForm(formId);
    
    if (result.hasErrors && optionsRef.current.onValidationError) {
      optionsRef.current.onValidationError(result.errors);
    }
    
    return result;
  }, [formId, validateForm]);
  
  const handleSubmit = useCallback(async (): Promise<void> => {
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
  }, [formId, setSubmitting, incrementSubmitCount, validateForm, form, resetForm]);
  
  const handleReset = useCallback(() => {
    resetForm(formId);
  }, [formId, resetForm]);
  
  const handleClear = useCallback(() => {
    clearForm(formId);
  }, [formId, clearForm]);
  
  // Form state queries
  const hasChanged = useCallback(() => {
    return form ? form.isDirty : false;
  }, [form]);
  
  const getSubmitCount = useCallback(() => {
    return form ? form.submitCount : 0;
  }, [form]);
  
  // Return form interface
  return useMemo(() => {
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
}

// ============================================================================
// Individual Field Hook
// ============================================================================

/**
 * Hook for managing individual form fields
 */
export function useFormField(
  formId: string,
  fieldName: string,
  options: UseFormFieldOptions = {}
): UseFormFieldResult {
  const { shouldUseLegacy } = useMigrationSafety('FormField');
  
  // Store actions
  const setFieldValue = useFormStore((state) => state.setFieldValue);
  const setFieldError = useFormStore((state) => state.setFieldError);
  const setFieldTouched = useFormStore((state) => state.setFieldTouched);
  const setFieldFocused = useFormStore((state) => state.setFieldFocused);
  const validateField = useFormStore((state) => state.validateField);
  
  // Field selector (direct access to avoid loops)
  const field = useFormStore((state) => state.forms[formId]?.fields[fieldName]);
  
  // Legacy fallback
  if (shouldUseLegacy) {
    return useLegacyFormField(formId, fieldName, options);
  }
  
  // 🔧 RACE CONDITION FIX: Create debounced handler with proper cleanup
  const debouncedChangeRef = useRef<((value: FieldValue) => void) & { cancel: () => void } | null>(null);
  
  const handleChange = useCallback((value: FieldValue) => {
    // Create new debounced function if needed
    if (!debouncedChangeRef.current) {
      debouncedChangeRef.current = debounce((val: FieldValue) => {
        setFieldValue(formId, fieldName, val);
        
        if (options.onChange) {
          options.onChange(val);
        }
        
        if (options.validate) {
          validateField(formId, fieldName);
        }
      }, options.debounceMs || 200);
    }
    
    debouncedChangeRef.current(value);
  }, [formId, fieldName, setFieldValue, options, validateField]);
  
  // 🔧 RACE CONDITION FIX: Cleanup debounced function on unmount or dependency change
  useEffect(() => {
    return () => {
      if (debouncedChangeRef.current) {
        debouncedChangeRef.current.cancel();
        debouncedChangeRef.current = null;
      }
    };
  }, [formId, fieldName]);
  
  const handleBlur = useCallback(() => {
    setFieldTouched(formId, fieldName, true);
    setFieldFocused(formId, fieldName, false);
    
    if (options.onBlur) {
      options.onBlur();
    }
    
    if (options.validate) {
      validateField(formId, fieldName);
    }
  }, [formId, fieldName, setFieldTouched, setFieldFocused, options, validateField]);
  
  const handleFocus = useCallback(() => {
    setFieldFocused(formId, fieldName, true);
    
    if (options.onFocus) {
      options.onFocus();
    }
  }, [formId, fieldName, setFieldFocused, options]);
  
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
  
  return useMemo(() => ({
    value: field.value,
    error: field.error,
    touched: field.touched,
    focused: field.focused,
    dirty: field.dirty,
    validating: field.validating,
    
    onChange: handleChange,
    onBlur: handleBlur,
    onFocus: handleFocus,
    setValue: (value: FieldValue) => setFieldValue(formId, fieldName, value),
    setError: (error: string | null) => setFieldError(formId, fieldName, error),
    setTouched: (touched: boolean) => setFieldTouched(formId, fieldName, touched),
    
    isValid: field.error === null,
    hasError: field.error !== null,
  }), [
    field,
    handleChange,
    handleBlur,
    handleFocus,
    formId,
    fieldName,
    setFieldValue,
    setFieldError,
    setFieldTouched,
  ]);
}

// ============================================================================
// Legacy Fallback Implementations
// ============================================================================

function useLegacyForm<T extends Record<string, FieldValue>>(
  formId: string,
  schema: FormSchema,
  options: UseFormOptions
): UseFormResult<T> {
  // Legacy implementation using useState patterns
  // This would maintain existing behavior for safety
  logger.debug(`[useForm] Using legacy implementation for form '${formId}'`);
  
  // Return minimal interface for legacy mode
  return {
    values: {} as T,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValidating: false,
    isValid: true,
    isDirty: false,
    hasErrors: false,
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
    setFieldValue: () => {},
    setFieldError: () => {},
    setFieldTouched: () => {},
    setFieldValues: () => {},
    validate: async () => ({ isValid: true, errors: {}, hasErrors: false }),
    submit: async () => {},
    reset: () => {},
    clear: () => {},
    hasChanged: () => false,
    getSubmitCount: () => 0,
    migrationStatus: 'legacy',
  };
}

function useLegacyFormField(
  formId: string,
  fieldName: string,
  options: UseFormFieldOptions
): UseFormFieldResult {
  // Legacy field implementation
  logger.debug(`[useFormField] Using legacy implementation for field '${fieldName}' in form '${formId}'`);
  
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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Advanced debounce implementation with race condition protection
 */
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  let callId = 0;
  
  const debouncedFunc = ((...args: any[]) => {
    const currentCallId = ++callId;
    lastCallTime = Date.now();
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      // 🔧 RACE CONDITION FIX: Only execute if this is still the latest call
      if (currentCallId === callId) {
        func.apply(null, args);
        timeout = null;
      }
    }, wait);
  }) as T & { cancel: () => void };
  
  // 🔧 RACE CONDITION FIX: Add cancel method to prevent execution
  debouncedFunc.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    callId++; // Invalidate any pending calls
  };
  
  return debouncedFunc;
}

// ============================================================================
// Form Hook Variants
// ============================================================================

/**
 * Hook for simple forms with minimal configuration
 */
export function useSimpleForm<T extends Record<string, FieldValue>>(
  formId: string,
  initialValues: T,
  onSubmit?: (values: T) => Promise<void> | void
): UseFormResult<T> {
  const schema: FormSchema = {
    formId,
    fields: Object.fromEntries(
      Object.entries(initialValues).map(([key, value]) => [
        key,
        { initialValue: value, validation: [] },
      ])
    ),
    persistence: { enabled: false, key: formId, restoreOnMount: false },
    validation: {
      validateOnChange: false,
      validateOnBlur: false,
      validateOnMount: false,
      debounceMs: 300,
    },
  };
  
  return useForm(schema, { onSubmit });
}

/**
 * Hook for persistent forms that save state across sessions
 */
export function usePersistentForm<T extends Record<string, FieldValue>>(
  formId: string,
  schema: FormSchema,
  options: UseFormOptions = {}
): UseFormResult<T> {
  const persistentSchema: FormSchema = {
    ...schema,
    persistence: {
      enabled: true,
      key: formId,
      restoreOnMount: true,
      ...schema.persistence,
    },
  };
  
  return useForm(persistentSchema, { persistForm: true, ...options });
}