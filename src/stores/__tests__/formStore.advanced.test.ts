/**
 * Advanced FormStore Tests - Week 4 Coverage Enhancement
 * 
 * Comprehensive form validation, error handling, and complex scenarios
 * to achieve 85%+ coverage targets for Week 4.
 */

import { renderHook, act } from '@testing-library/react';
import { useFormStore } from '../formStore';
import type { FormSchema, FormValidationRule, FieldValue } from '../formStore';

// Mock dependencies for isolated testing
jest.mock('@/utils/logger', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/services/StorageServiceProvider', () => ({
  getStorageServiceAsync: jest.fn(async () => ({
    getStorageItem: jest.fn(),
    setStorageItem: jest.fn(),
    removeStorageItem: jest.fn(),
    hasStorageItem: jest.fn(),
  })),
}));

jest.mock('@/services/TransactionManager', () => ({
  createAsyncOperation: jest.fn((id, desc, fn) => fn),
  transactionManager: {
    executeTransaction: jest.fn(async (operations) => ({
      success: true,
      results: await Promise.all(operations.map((op: any) => 
        typeof op === 'function' ? op() : op
      )),
    })),
  },
}));

jest.mock('@/services/RuntimeValidator', () => ({
  typeGuards: {
    isFormData: jest.fn(() => true),
    isObject: jest.fn(() => true),
  },
  validateStorageJSON: jest.fn(() => ({ isValid: true, data: null })),
  validateExternalData: jest.fn((data) => ({
    isValid: true,
    data,
    errors: [],
    sanitized: data,
  })),
}));

jest.mock('@/services/MemoryManager', () => ({
  createManagedInterval: jest.fn((fn, ms) => {
    const id = setInterval(fn, ms);
    return {
      start: () => {},
      stop: () => clearInterval(id),
      restart: () => {},
    };
  }),
}));

describe('FormStore - Advanced Scenarios', () => {
  // Complex form schema for testing
  const complexFormSchema: FormSchema = {
    formId: 'game-settings-form',
    fields: {
      teamName: {
        initialValue: '',
        validation: [
          { type: 'required', message: 'Team name is required' },
          { type: 'minLength', value: 2, message: 'Team name must be at least 2 characters' },
          { type: 'maxLength', value: 50, message: 'Team name cannot exceed 50 characters' },
        ],
        persist: true,
      },
      opponentName: {
        initialValue: '',
        validation: [
          { type: 'required', message: 'Opponent name is required' },
        ],
        persist: true,
      },
      gameDate: {
        initialValue: '',
        validation: [
          { type: 'required', message: 'Game date is required' },
          {
            type: 'custom',
            message: 'Game date cannot be in the past',
            validator: (value) => {
              if (typeof value !== 'string') return false;
              const gameDate = new Date(value);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return gameDate >= today;
            },
          },
        ],
        persist: true,
      },
      numberOfPeriods: {
        initialValue: 2,
        validation: [
          { type: 'required', message: 'Number of periods is required' },
          {
            type: 'custom',
            message: 'Must be between 1 and 4 periods',
            validator: (value) => {
              const num = Number(value);
              return num >= 1 && num <= 4;
            },
          },
        ],
        persist: true,
      },
      periodDuration: {
        initialValue: 45,
        validation: [
          { type: 'required', message: 'Period duration is required' },
          {
            type: 'custom',
            message: 'Duration must be between 5 and 90 minutes',
            validator: (value) => {
              const num = Number(value);
              return num >= 5 && num <= 90;
            },
          },
        ],
        persist: true,
      },
      gameLocation: {
        initialValue: '',
        validation: [
          { type: 'maxLength', value: 100, message: 'Location cannot exceed 100 characters' },
        ],
        persist: false,
      },
      ageGroup: {
        initialValue: 'U16',
        validation: [
          {
            type: 'pattern',
            value: /^U\d{2}$/,
            message: 'Age group must be in format U## (e.g., U16)',
          },
        ],
        persist: true,
      },
      isHomeGame: {
        initialValue: true,
        persist: true,
      },
      weatherConditions: {
        initialValue: '',
        validation: [
          { type: 'maxLength', value: 200, message: 'Weather description too long' },
        ],
        persist: false,
      },
      refereeEmail: {
        initialValue: '',
        validation: [
          {
            type: 'pattern',
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: 'Must be a valid email address',
          },
        ],
        persist: false,
      },
      specialInstructions: {
        initialValue: '',
        validation: [
          { type: 'maxLength', value: 1000, message: 'Instructions cannot exceed 1000 characters' },
        ],
        persist: true,
        debounceMs: 500,
      },
    },
    persistence: {
      enabled: true,
      key: 'game-settings-form',
      restoreOnMount: true,
      excludeFields: ['weatherConditions', 'refereeEmail'],
    },
    validation: {
      validateOnChange: true,
      validateOnBlur: true,
      validateOnMount: false,
      debounceMs: 300,
    },
  };

  const asyncValidationSchema: FormSchema = {
    formId: 'async-validation-form',
    fields: {
      username: {
        initialValue: '',
        validation: [
          { type: 'required', message: 'Username is required' },
          {
            type: 'async',
            message: 'Username is already taken',
            validator: async (value) => {
              // Simulate API call
              await new Promise(resolve => setTimeout(resolve, 100));
              return value !== 'taken-username';
            },
          },
        ],
      },
      email: {
        initialValue: '',
        validation: [
          { type: 'required', message: 'Email is required' },
          {
            type: 'async',
            message: 'Email is already registered',
            validator: async (value) => {
              await new Promise(resolve => setTimeout(resolve, 150));
              return value !== 'taken@example.com';
            },
          },
        ],
      },
    },
    validation: {
      validateOnChange: true,
      validateOnBlur: true,
      validateOnMount: false,
      debounceMs: 200,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complex Form Schema Management', () => {
    it('should initialize complex form with all field types', () => {
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      const form = result.current.getForm('game-settings-form');
      
      expect(form).toBeDefined();
      expect(form!.fields.teamName.value).toBe('');
      expect(form!.fields.numberOfPeriods.value).toBe(2);
      expect(form!.fields.isHomeGame.value).toBe(true);
      expect(form!.isValid).toBe(false); // Should be invalid due to required fields
      expect(form!.isDirty).toBe(false);
    });

    it('should handle form schema updates and migrations', () => {
      const { result } = renderHook(() => useFormStore());
      
      // Initialize with original schema
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      // Update some values
      act(() => {
        result.current.setFieldValue('game-settings-form', 'teamName', 'Original Team');
        result.current.setFieldValue('game-settings-form', 'opponentName', 'Original Opponent');
      });
      
      // Create updated schema with new field
      const updatedSchema: FormSchema = {
        ...complexFormSchema,
        fields: {
          ...complexFormSchema.fields,
          newField: {
            initialValue: 'default-value',
            validation: [{ type: 'required', message: 'New field is required' }],
          },
        },
      };
      
      // Update schema
      act(() => {
        result.current.updateFormSchema('game-settings-form', updatedSchema);
      });
      
      const form = result.current.getForm('game-settings-form');
      
      expect(form!.fields.teamName.value).toBe('Original Team'); // Preserved
      expect(form!.fields.newField.value).toBe('default-value'); // Added
      expect(form!.schema.fields.newField).toBeDefined();
    });

    it('should cleanup forms and prevent memory leaks', () => {
      const { result } = renderHook(() => useFormStore());
      
      // Create multiple forms
      const schemas = Array.from({ length: 10 }, (_, i) => ({
        ...complexFormSchema,
        formId: `form-${i}`,
      }));
      
      act(() => {
        schemas.forEach(schema => {
          result.current.initializeForm(schema);
        });
      });
      
      expect(result.current.getAllForms()).toHaveLength(10);
      
      // Cleanup old forms
      act(() => {
        result.current.cleanupForms({ maxAge: 0 }); // Cleanup immediately
      });
      
      expect(result.current.getAllForms()).toHaveLength(0);
    });
  });

  describe('Advanced Validation Scenarios', () => {
    it('should handle async validation with debouncing', async () => {
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(asyncValidationSchema);
      });
      
      // Set value that should trigger async validation
      await act(async () => {
        result.current.setFieldValue('async-validation-form', 'username', 'taken-username');
        
        // Wait for debounce and async validation
        await new Promise(resolve => setTimeout(resolve, 300));
      });
      
      const form = result.current.getForm('async-validation-form');
      
      expect(form!.fields.username.error).toBe('Username is already taken');
      expect(form!.fields.username.validating).toBe(false);
      expect(form!.isValid).toBe(false);
    });

    it('should handle validation errors and recovery', async () => {
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      // Set invalid values
      act(() => {
        result.current.setFieldValue('game-settings-form', 'teamName', 'A'); // Too short
        result.current.setFieldValue('game-settings-form', 'numberOfPeriods', 5); // Too high
        result.current.setFieldValue('game-settings-form', 'ageGroup', 'Invalid'); // Wrong pattern
      });
      
      // Validate form
      await act(async () => {
        await result.current.validateForm('game-settings-form');
      });
      
      const form = result.current.getForm('game-settings-form');
      
      expect(form!.fields.teamName.error).toBe('Team name must be at least 2 characters');
      expect(form!.fields.numberOfPeriods.error).toBe('Must be between 1 and 4 periods');
      expect(form!.fields.ageGroup.error).toBe('Age group must be in format U## (e.g., U16)');
      expect(form!.hasErrors).toBe(true);
      
      // Fix the errors
      act(() => {
        result.current.setFieldValue('game-settings-form', 'teamName', 'Valid Team Name');
        result.current.setFieldValue('game-settings-form', 'numberOfPeriods', 2);
        result.current.setFieldValue('game-settings-form', 'ageGroup', 'U16');
      });
      
      await act(async () => {
        await result.current.validateForm('game-settings-form');
      });
      
      const fixedForm = result.current.getForm('game-settings-form');
      
      expect(fixedForm!.fields.teamName.error).toBeNull();
      expect(fixedForm!.fields.numberOfPeriods.error).toBeNull();
      expect(fixedForm!.fields.ageGroup.error).toBeNull();
    });

    it('should handle cross-field validation', () => {
      const crossValidationSchema: FormSchema = {
        formId: 'cross-validation-form',
        fields: {
          password: {
            initialValue: '',
            validation: [
              { type: 'required', message: 'Password is required' },
              { type: 'minLength', value: 8, message: 'Password must be at least 8 characters' },
            ],
          },
          confirmPassword: {
            initialValue: '',
            validation: [
              { type: 'required', message: 'Password confirmation is required' },
              {
                type: 'custom',
                message: 'Passwords do not match',
                validator: (value, formValues) => {
                  return value === formValues.password;
                },
              },
            ],
          },
        },
      };
      
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(crossValidationSchema);
      });
      
      // Set mismatched passwords
      act(() => {
        result.current.setFieldValue('cross-validation-form', 'password', 'mypassword123');
        result.current.setFieldValue('cross-validation-form', 'confirmPassword', 'differentpassword');
      });
      
      const form = result.current.getForm('cross-validation-form');
      
      expect(form!.fields.confirmPassword.error).toBe('Passwords do not match');
      
      // Fix the password match
      act(() => {
        result.current.setFieldValue('cross-validation-form', 'confirmPassword', 'mypassword123');
      });
      
      const fixedForm = result.current.getForm('cross-validation-form');
      
      expect(fixedForm!.fields.confirmPassword.error).toBeNull();
    });
  });

  describe('Form Persistence and Recovery', () => {
    it('should persist and restore form data correctly', async () => {
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      // Set values that should be persisted
      act(() => {
        result.current.setFieldValue('game-settings-form', 'teamName', 'Persisted Team');
        result.current.setFieldValue('game-settings-form', 'opponentName', 'Persisted Opponent');
        result.current.setFieldValue('game-settings-form', 'numberOfPeriods', 3);
        result.current.setFieldValue('game-settings-form', 'weatherConditions', 'Should not persist');
      });
      
      // Persist the form
      await act(async () => {
        await result.current.persistForm('game-settings-form');
      });
      
      // Clear the form
      act(() => {
        result.current.destroyForm('game-settings-form');
      });
      
      // Re-initialize and restore
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      await act(async () => {
        await result.current.restoreForm('game-settings-form');
      });
      
      const restoredForm = result.current.getForm('game-settings-form');
      
      expect(restoredForm!.fields.teamName.value).toBe('Persisted Team');
      expect(restoredForm!.fields.opponentName.value).toBe('Persisted Opponent');
      expect(restoredForm!.fields.numberOfPeriods.value).toBe(3);
      // Weather conditions should not be restored (excluded from persistence)
      expect(restoredForm!.fields.weatherConditions.value).toBe('');
    });

    it('should handle persistence failures gracefully', async () => {
      const { result } = renderHook(() => useFormStore());
      
      // Mock storage service to fail
      const mockStorageService = {
        setStorageItem: jest.fn().mockRejectedValue(new Error('Storage failed')),
        getStorageItem: jest.fn().mockRejectedValue(new Error('Retrieval failed')),
        removeStorageItem: jest.fn().mockRejectedValue(new Error('Removal failed')),
        hasStorageItem: jest.fn().mockRejectedValue(new Error('Check failed')),
      };
      
      (require('@/services/StorageServiceProvider').getStorageServiceAsync as jest.Mock)
        .mockResolvedValue(mockStorageService);
      
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      act(() => {
        result.current.setFieldValue('game-settings-form', 'teamName', 'Test Team');
      });
      
      // Attempt to persist (should fail gracefully)
      await act(async () => {
        await result.current.persistForm('game-settings-form');
      });
      
      // Form should still be usable despite persistence failure
      const form = result.current.getForm('game-settings-form');
      expect(form!.fields.teamName.value).toBe('Test Team');
    });
  });

  describe('Complex Form Operations', () => {
    it('should handle bulk field updates', () => {
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      const bulkValues = {
        teamName: 'Bulk Team',
        opponentName: 'Bulk Opponent',
        numberOfPeriods: 4,
        periodDuration: 90,
        ageGroup: 'U18',
        isHomeGame: false,
      };
      
      act(() => {
        result.current.setFormValues('game-settings-form', bulkValues);
      });
      
      const form = result.current.getForm('game-settings-form');
      
      expect(form!.fields.teamName.value).toBe('Bulk Team');
      expect(form!.fields.opponentName.value).toBe('Bulk Opponent');
      expect(form!.fields.numberOfPeriods.value).toBe(4);
      expect(form!.fields.periodDuration.value).toBe(90);
      expect(form!.fields.ageGroup.value).toBe('U18');
      expect(form!.fields.isHomeGame.value).toBe(false);
      expect(form!.isDirty).toBe(true);
    });

    it('should handle form submission with validation', async () => {
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      // Set valid values
      act(() => {
        result.current.setFieldValue('game-settings-form', 'teamName', 'Valid Team');
        result.current.setFieldValue('game-settings-form', 'opponentName', 'Valid Opponent');
        result.current.setFieldValue('game-settings-form', 'gameDate', '2025-12-31');
        result.current.setFieldValue('game-settings-form', 'ageGroup', 'U16');
      });
      
      const mockSubmitHandler = jest.fn().mockResolvedValue({ success: true });
      
      let submitResult: any = null;
      
      await act(async () => {
        submitResult = await result.current.submitForm('game-settings-form', mockSubmitHandler);
      });
      
      expect(submitResult.success).toBe(true);
      expect(mockSubmitHandler).toHaveBeenCalledWith(expect.objectContaining({
        teamName: 'Valid Team',
        opponentName: 'Valid Opponent',
        gameDate: '2025-12-31',
        ageGroup: 'U16',
      }));
      
      const form = result.current.getForm('game-settings-form');
      expect(form!.submitCount).toBe(1);
    });

    it('should prevent submission with validation errors', async () => {
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      // Set invalid values
      act(() => {
        result.current.setFieldValue('game-settings-form', 'teamName', ''); // Required field empty
        result.current.setFieldValue('game-settings-form', 'ageGroup', 'InvalidFormat');
      });
      
      const mockSubmitHandler = jest.fn();
      
      let submitResult: any = null;
      
      await act(async () => {
        submitResult = await result.current.submitForm('game-settings-form', mockSubmitHandler);
      });
      
      expect(submitResult.success).toBe(false);
      expect(submitResult.errors).toBeDefined();
      expect(mockSubmitHandler).not.toHaveBeenCalled();
      
      const form = result.current.getForm('game-settings-form');
      expect(form!.hasErrors).toBe(true);
    });
  });

  describe('Field State Management', () => {
    it('should track field focus and blur states', () => {
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      // Focus field
      act(() => {
        result.current.setFieldFocus('game-settings-form', 'teamName', true);
      });
      
      expect(result.current.getField('game-settings-form', 'teamName')?.focused).toBe(true);
      
      // Blur field
      act(() => {
        result.current.setFieldFocus('game-settings-form', 'teamName', false);
      });
      
      expect(result.current.getField('game-settings-form', 'teamName')?.focused).toBe(false);
      expect(result.current.getField('game-settings-form', 'teamName')?.touched).toBe(true);
    });

    it('should reset individual fields', () => {
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      // Modify field
      act(() => {
        result.current.setFieldValue('game-settings-form', 'teamName', 'Modified Value');
        result.current.setFieldError('game-settings-form', 'teamName', 'Custom error');
      });
      
      expect(result.current.getField('game-settings-form', 'teamName')?.value).toBe('Modified Value');
      expect(result.current.getField('game-settings-form', 'teamName')?.error).toBe('Custom error');
      expect(result.current.getField('game-settings-form', 'teamName')?.dirty).toBe(true);
      
      // Reset field
      act(() => {
        result.current.resetField('game-settings-form', 'teamName');
      });
      
      expect(result.current.getField('game-settings-form', 'teamName')?.value).toBe('');
      expect(result.current.getField('game-settings-form', 'teamName')?.error).toBeNull();
      expect(result.current.getField('game-settings-form', 'teamName')?.dirty).toBe(false);
    });

    it('should reset entire forms', () => {
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      // Modify multiple fields
      act(() => {
        result.current.setFieldValue('game-settings-form', 'teamName', 'Modified Team');
        result.current.setFieldValue('game-settings-form', 'opponentName', 'Modified Opponent');
        result.current.setFieldValue('game-settings-form', 'numberOfPeriods', 3);
      });
      
      const form = result.current.getForm('game-settings-form');
      expect(form!.isDirty).toBe(true);
      
      // Reset form
      act(() => {
        result.current.resetForm('game-settings-form');
      });
      
      const resetForm = result.current.getForm('game-settings-form');
      expect(resetForm!.fields.teamName.value).toBe('');
      expect(resetForm!.fields.opponentName.value).toBe('');
      expect(resetForm!.fields.numberOfPeriods.value).toBe(2);
      expect(resetForm!.isDirty).toBe(false);
    });
  });

  describe('Performance and Memory Management', () => {
    it('should handle large forms efficiently', () => {
      const largeFormSchema: FormSchema = {
        formId: 'large-form',
        fields: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [
            `field${i}`,
            {
              initialValue: `value${i}`,
              validation: [
                { type: 'required', message: `Field ${i} is required` },
              ],
            },
          ])
        ),
      };
      
      const { result } = renderHook(() => useFormStore());
      
      const startTime = performance.now();
      
      act(() => {
        result.current.initializeForm(largeFormSchema);
      });
      
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should initialize quickly
      
      const form = result.current.getForm('large-form');
      expect(Object.keys(form!.fields)).toHaveLength(100);
    });

    it('should cleanup resources on form destruction', () => {
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      expect(result.current.getForm('game-settings-form')).toBeDefined();
      
      act(() => {
        result.current.destroyForm('game-settings-form');
      });
      
      expect(result.current.getForm('game-settings-form')).toBeUndefined();
    });
  });

  describe('Error Boundary and Edge Cases', () => {
    it('should handle invalid form IDs gracefully', () => {
      const { result } = renderHook(() => useFormStore());
      
      // Try to operate on non-existent form
      expect(() => {
        result.current.setFieldValue('non-existent-form', 'field', 'value');
      }).not.toThrow();
      
      expect(result.current.getForm('non-existent-form')).toBeUndefined();
      expect(result.current.getField('non-existent-form', 'field')).toBeUndefined();
    });

    it('should handle invalid field names gracefully', () => {
      const { result } = renderHook(() => useFormStore());
      
      act(() => {
        result.current.initializeForm(complexFormSchema);
      });
      
      expect(() => {
        result.current.setFieldValue('game-settings-form', 'non-existent-field', 'value');
      }).not.toThrow();
      
      expect(result.current.getField('game-settings-form', 'non-existent-field')).toBeUndefined();
    });

    it('should handle malformed validation rules', () => {
      const malformedSchema: FormSchema = {
        formId: 'malformed-form',
        fields: {
          testField: {
            initialValue: '',
            validation: [
              // @ts-expect-error - Testing malformed rule
              { type: 'invalid-type', message: 'This should not crash' },
              { type: 'custom', message: 'Valid rule', validator: () => true },
            ],
          },
        },
      };
      
      const { result } = renderHook(() => useFormStore());
      
      expect(() => {
        act(() => {
          result.current.initializeForm(malformedSchema);
        });
      }).not.toThrow();
      
      const form = result.current.getForm('malformed-form');
      expect(form).toBeDefined();
    });
  });
});