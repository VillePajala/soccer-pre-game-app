import { renderHook, act } from '@testing-library/react';
import { useFormStore, FormSchema, FormValidationRule } from '../formStore';
import { validationRules } from '@/utils/formValidation';

// Mock logger
jest.mock('@/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('FormStore', () => {
  beforeEach(() => {
    // Reset store state
    useFormStore.getState().forms = {};
    // Clear localStorage
    mockLocalStorage.clear();
    jest.clearAllMocks();
  });

  describe('Form Lifecycle', () => {
    const testSchema: FormSchema = {
      formId: 'testForm',
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
          validation: [validationRules.required('Password is required')],
        },
      },
      persistence: {
        enabled: false,
        key: 'testForm',
        restoreOnMount: false,
      },
      validation: {
        validateOnChange: true,
        validateOnBlur: true,
        validateOnMount: false,
        debounceMs: 300,
      },
    };

    it('should create a form with initial state', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.createForm(testSchema);
      });

      const form = result.current.forms['testForm'];
      expect(form).toBeDefined();
      expect(form.formId).toBe('testForm');
      expect(form.fields.email.value).toBe('');
      expect(form.fields.password.value).toBe('');
      expect(form.isSubmitting).toBe(false);
      expect(form.isValid).toBe(true);
      expect(form.isDirty).toBe(false);
    });

    it('should not create duplicate forms', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.createForm(testSchema);
        result.current.createForm(testSchema); // Duplicate creation
      });

      expect(Object.keys(result.current.forms)).toHaveLength(1);
    });

    it('should destroy a form', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.createForm(testSchema);
      });

      expect(result.current.forms['testForm']).toBeDefined();

      act(() => {
        result.current.destroyForm('testForm');
      });

      expect(result.current.forms['testForm']).toBeUndefined();
    });

    it('should reset form to initial values', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.createForm(testSchema);
        result.current.setFieldValue('testForm', 'email', 'test@example.com');
        result.current.setFieldTouched('testForm', 'email', true);
      });

      let form = result.current.forms['testForm'];
      expect(form.fields.email.value).toBe('test@example.com');
      expect(form.fields.email.touched).toBe(true);
      expect(form.isDirty).toBe(true);

      act(() => {
        result.current.resetForm('testForm');
      });

      form = result.current.forms['testForm'];
      expect(form.fields.email.value).toBe('');
      expect(form.fields.email.touched).toBe(false);
      expect(form.isDirty).toBe(false);
    });

    it('should clear form values', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.createForm(testSchema);
        result.current.setFieldValue('testForm', 'email', 'test@example.com');
      });

      let form = result.current.forms['testForm'];
      expect(form.fields.email.value).toBe('test@example.com');

      act(() => {
        result.current.clearForm('testForm');
      });

      form = result.current.forms['testForm'];
      expect(form.fields.email.value).toBe('');
    });
  });

  describe('Field Management', () => {
    const testSchema: FormSchema = {
      formId: 'fieldTest',
      fields: {
        name: { initialValue: 'John' },
        age: { initialValue: 25 },
      },
    };

    beforeEach(() => {
      const { result } = renderHook(() => useFormStore());
      act(() => {
        result.current.createForm(testSchema);
      });
    });

    it('should set field value and update dirty state', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldValue('fieldTest', 'name', 'Jane');
      });

      const form = result.current.forms['fieldTest'];
      expect(form.fields.name.value).toBe('Jane');
      expect(form.fields.name.dirty).toBe(true);
      expect(form.isDirty).toBe(true);
    });

    it('should set field error', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldError('fieldTest', 'name', 'Name is required');
      });

      const form = result.current.forms['fieldTest'];
      expect(form.fields.name.error).toBe('Name is required');
      expect(form.hasErrors).toBe(true);
      expect(form.isValid).toBe(false);
    });

    it('should set field touched state', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldTouched('fieldTest', 'name', true);
      });

      const form = result.current.forms['fieldTest'];
      expect(form.fields.name.touched).toBe(true);
    });

    it('should set field focused state', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldFocused('fieldTest', 'name', true);
      });

      const form = result.current.forms['fieldTest'];
      expect(form.fields.name.focused).toBe(true);
    });

    it('should handle bulk field value updates', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldValues('fieldTest', {
          name: 'Alice',
          age: 30,
        });
      });

      const form = result.current.forms['fieldTest'];
      expect(form.fields.name.value).toBe('Alice');
      expect(form.fields.age.value).toBe(30);
      expect(form.isDirty).toBe(true);
    });

    it('should handle bulk error updates', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFormErrors('fieldTest', {
          name: 'Invalid name',
          age: 'Age must be positive',
        });
      });

      const form = result.current.forms['fieldTest'];
      expect(form.fields.name.error).toBe('Invalid name');
      expect(form.fields.age.error).toBe('Age must be positive');
      expect(form.hasErrors).toBe(true);
    });
  });

  describe('Validation System', () => {
    const validationSchema: FormSchema = {
      formId: 'validationTest',
      fields: {
        email: {
          initialValue: '',
          validation: [
            validationRules.required('Email is required'),
            validationRules.email('Invalid email format'),
          ],
        },
        name: {
          initialValue: '',
          validation: [
            validationRules.required('Name is required'),
            validationRules.minLength(2, 'Name must be at least 2 characters'),
          ],
        },
        age: {
          initialValue: 0,
          validation: [
            {
              type: 'custom',
              message: 'Age must be between 18 and 100',
              validator: (value) => {
                const num = Number(value);
                return num >= 18 && num <= 100;
              },
            },
          ],
        },
      },
    };

    beforeEach(() => {
      const { result } = renderHook(() => useFormStore());
      act(() => {
        result.current.createForm(validationSchema);
      });
    });

    it('should validate required fields', async () => {
      const { result } = renderHook(() => useFormStore());

      const validationResult = await act(async () => {
        return result.current.validateField('validationTest', 'email');
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.email).toBe('Email is required');

      const form = result.current.forms['validationTest'];
      expect(form.fields.email.error).toBe('Email is required');
    });

    it('should validate email format', async () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldValue('validationTest', 'email', 'invalid-email');
      });

      const validationResult = await act(async () => {
        return result.current.validateField('validationTest', 'email');
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.email).toBe('Invalid email format');
    });

    it('should validate minimum length', async () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldValue('validationTest', 'name', 'A');
      });

      const validationResult = await act(async () => {
        return result.current.validateField('validationTest', 'name');
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.name).toBe('Name must be at least 2 characters');
    });

    it('should validate custom rules', async () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldValue('validationTest', 'age', 15);
      });

      const validationResult = await act(async () => {
        return result.current.validateField('validationTest', 'age');
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.age).toBe('Age must be between 18 and 100');
    });

    it('should pass validation with valid values', async () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldValue('validationTest', 'email', 'test@example.com');
        result.current.setFieldValue('validationTest', 'name', 'John Doe');
        result.current.setFieldValue('validationTest', 'age', 25);
      });

      const emailResult = await act(async () => {
        return result.current.validateField('validationTest', 'email');
      });

      const nameResult = await act(async () => {
        return result.current.validateField('validationTest', 'name');
      });

      const ageResult = await act(async () => {
        return result.current.validateField('validationTest', 'age');
      });

      expect(emailResult.isValid).toBe(true);
      expect(nameResult.isValid).toBe(true);
      expect(ageResult.isValid).toBe(true);
    });

    it('should validate entire form', async () => {
      const { result } = renderHook(() => useFormStore());

      // Set invalid values
      act(() => {
        result.current.setFieldValue('validationTest', 'email', 'invalid');
        result.current.setFieldValue('validationTest', 'name', '');
        result.current.setFieldValue('validationTest', 'age', 15);
      });

      const formValidationResult = await act(async () => {
        return result.current.validateForm('validationTest');
      });

      expect(formValidationResult.isValid).toBe(false);
      expect(formValidationResult.hasErrors).toBe(true);
      expect(formValidationResult.errors.email).toBe('Invalid email format');
      expect(formValidationResult.errors.name).toBe('Name is required');
      expect(formValidationResult.errors.age).toBe('Age must be between 18 and 100');
    });

    it('should clear validation errors', () => {
      const { result } = renderHook(() => useFormStore());

      // Set errors first
      act(() => {
        result.current.setFieldError('validationTest', 'email', 'Some error');
        result.current.setFieldError('validationTest', 'name', 'Another error');
      });

      let form = result.current.forms['validationTest'];
      expect(form.hasErrors).toBe(true);

      // Clear validation
      act(() => {
        result.current.clearValidation('validationTest');
      });

      form = result.current.forms['validationTest'];
      expect(form.hasErrors).toBe(false);
      expect(form.isValid).toBe(true);
      expect(form.fields.email.error).toBe(null);
      expect(form.fields.name.error).toBe(null);
    });
  });

  describe('Form State Management', () => {
    const testSchema: FormSchema = {
      formId: 'stateTest',
      fields: {
        field1: { initialValue: 'value1' },
      },
    };

    beforeEach(() => {
      const { result } = renderHook(() => useFormStore());
      act(() => {
        result.current.createForm(testSchema);
      });
    });

    it('should set submitting state', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setSubmitting('stateTest', true);
      });

      let form = result.current.forms['stateTest'];
      expect(form.isSubmitting).toBe(true);

      act(() => {
        result.current.setSubmitting('stateTest', false);
      });

      form = result.current.forms['stateTest'];
      expect(form.isSubmitting).toBe(false);
    });

    it('should increment submit count', () => {
      const { result } = renderHook(() => useFormStore());

      expect(result.current.forms['stateTest'].submitCount).toBe(0);

      act(() => {
        result.current.incrementSubmitCount('stateTest');
      });

      expect(result.current.forms['stateTest'].submitCount).toBe(1);

      act(() => {
        result.current.incrementSubmitCount('stateTest');
      });

      expect(result.current.forms['stateTest'].submitCount).toBe(2);
    });
  });

  describe('Persistence', () => {
    const persistentSchema: FormSchema = {
      formId: 'persistentForm',
      fields: {
        username: { initialValue: '', persist: true },
        password: { initialValue: '', persist: false },
      },
      persistence: {
        enabled: true,
        key: 'persistentForm',
        restoreOnMount: true,
        excludeFields: ['password'],
      },
    };

    it('should persist form data to localStorage', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.createForm(persistentSchema);
        result.current.setFieldValue('persistentForm', 'username', 'testuser');
        result.current.setFieldValue('persistentForm', 'password', 'secret');
      });

      act(() => {
        result.current.persistForm('persistentForm');
      });

      const stored = mockLocalStorage.getItem('form_persistentForm');
      expect(stored).toBeDefined();

      const parsedData = JSON.parse(stored!);
      expect(parsedData.values.username).toBe('testuser');
      expect(parsedData.values.password).toBeUndefined(); // Excluded field
      expect(parsedData.formId).toBe('persistentForm');
    });

    it('should restore form data from localStorage', () => {
      // Pre-populate localStorage
      const storedData = {
        values: { username: 'restoreduser' },
        timestamp: Date.now(),
        formId: 'persistentForm',
      };
      mockLocalStorage.setItem('form_persistentForm', JSON.stringify(storedData));

      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.createForm(persistentSchema);
      });

      act(() => {
        result.current.restoreForm('persistentForm');
      });

      const form = result.current.forms['persistentForm'];
      expect(form.fields.username.value).toBe('restoreduser');
    });

    it('should not restore expired data', () => {
      // Create expired data (older than 24 hours)
      const expiredData = {
        values: { username: 'expireduser' },
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        formId: 'persistentForm',
      };
      mockLocalStorage.setItem('form_persistentForm', JSON.stringify(expiredData));

      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.createForm(persistentSchema);
        result.current.restoreForm('persistentForm');
      });

      const form = result.current.forms['persistentForm'];
      expect(form.fields.username.value).toBe(''); // Should remain initial value
    });
  });

  describe('Utility Functions', () => {
    const testSchema: FormSchema = {
      formId: 'utilTest',
      fields: {
        name: { initialValue: 'John' },
        email: { initialValue: 'john@example.com' },
      },
    };

    beforeEach(() => {
      const { result } = renderHook(() => useFormStore());
      act(() => {
        result.current.createForm(testSchema);
      });
    });

    it('should get form values', () => {
      const { result } = renderHook(() => useFormStore());

      const values = result.current.getFormValues('utilTest');
      expect(values).toEqual({
        name: 'John',
        email: 'john@example.com',
      });
    });

    it('should get form errors', () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldError('utilTest', 'name', 'Name error');
        result.current.setFieldError('utilTest', 'email', 'Email error');
      });

      const errors = result.current.getFormErrors('utilTest');
      expect(errors).toEqual({
        name: 'Name error',
        email: 'Email error',
      });
    });

    it('should detect form changes', () => {
      const { result } = renderHook(() => useFormStore());

      expect(result.current.hasFormChanged('utilTest')).toBe(false);

      act(() => {
        result.current.setFieldValue('utilTest', 'name', 'Jane');
      });

      expect(result.current.hasFormChanged('utilTest')).toBe(true);
    });
  });

  describe('Form Cleanup', () => {
    it('should cleanup stale forms', () => {
      const { result } = renderHook(() => useFormStore());

      const schema: FormSchema = {
        formId: 'staleForm',
        fields: { field1: { initialValue: 'value' } },
      };

      act(() => {
        result.current.createForm(schema);
      });

      // Manually set an old timestamp to simulate stale form
      act(() => {
        const form = result.current.forms['staleForm'];
        if (form) {
          form.updatedAt = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
        }
      });

      expect(result.current.forms['staleForm']).toBeDefined();

      act(() => {
        result.current.cleanup();
      });

      expect(result.current.forms['staleForm']).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle operations on non-existent forms gracefully', () => {
      const { result } = renderHook(() => useFormStore());

      // These should not throw errors
      act(() => {
        result.current.setFieldValue('nonExistent', 'field', 'value');
        result.current.setFieldError('nonExistent', 'field', 'error');
        result.current.setFieldTouched('nonExistent', 'field', true);
        result.current.resetForm('nonExistent');
        result.current.destroyForm('nonExistent');
      });

      expect(result.current.getFormValues('nonExistent')).toEqual({});
      expect(result.current.getFormErrors('nonExistent')).toEqual({});
      expect(result.current.hasFormChanged('nonExistent')).toBe(false);
    });

    it('should handle localStorage errors gracefully', () => {
      const { result } = renderHook(() => useFormStore());

      // Mock localStorage to throw an error
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = jest.fn(() => {
        throw new Error('Storage full');
      });

      const schema: FormSchema = {
        formId: 'errorTest',
        fields: { field1: { initialValue: 'value' } },
        persistence: { enabled: true, key: 'errorTest', restoreOnMount: false },
      };

      act(() => {
        result.current.createForm(schema);
        result.current.setFieldValue('errorTest', 'field1', 'newValue');
      });

      // This should not throw an error
      act(() => {
        result.current.persistForm('errorTest');
      });

      // Restore original method
      mockLocalStorage.setItem = originalSetItem;
    });
  });

  describe('Async Validation', () => {
    const asyncSchema: FormSchema = {
      formId: 'asyncTest',
      fields: {
        username: {
          initialValue: '',
          validation: [
            {
              type: 'async',
              message: 'Username is already taken',
              validator: async (value) => {
                // Simulate async validation
                await new Promise(resolve => setTimeout(resolve, 100));
                return value !== 'taken';
              },
            },
          ],
        },
      },
    };

    beforeEach(() => {
      const { result } = renderHook(() => useFormStore());
      act(() => {
        result.current.createForm(asyncSchema);
      });
    });

    it('should handle async validation', async () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldValue('asyncTest', 'username', 'taken');
      });

      const validationResult = await act(async () => {
        return result.current.validateField('asyncTest', 'username');
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.username).toBe('Username is already taken');
    });

    it('should pass async validation with valid value', async () => {
      const { result } = renderHook(() => useFormStore());

      act(() => {
        result.current.setFieldValue('asyncTest', 'username', 'available');
      });

      const validationResult = await act(async () => {
        return result.current.validateField('asyncTest', 'username');
      });

      expect(validationResult.isValid).toBe(true);
    });
  });
});