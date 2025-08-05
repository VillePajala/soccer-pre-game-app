import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useForm, useFormField, useSimpleForm } from '../useForm';
import { FormSchema } from '@/stores/formStore';
import { validationRules } from '@/utils/formValidation';
import { useMigrationSafety } from '../useMigrationSafety';

// Mock dependencies
jest.mock('../useMigrationSafety', () => ({
  useMigrationSafety: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

const mockUseMigrationSafety = useMigrationSafety as jest.MockedFunction<typeof useMigrationSafety>;

describe('useForm Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMigrationSafety.mockReturnValue({
      shouldUseLegacy: false,
    });
  });

  describe('Basic Form Operations', () => {
    const testSchema: FormSchema = {
      formId: 'testForm',
      fields: {
        name: {
          initialValue: '',
          validation: [validationRules.required('Name is required')],
        },
        email: {
          initialValue: '',
          validation: [
            validationRules.required('Email is required'),
            validationRules.email(),
          ],
        },
        age: {
          initialValue: 0,
          validation: [
            {
              type: 'custom',
              message: 'Must be 18 or older',
              validator: (value) => Number(value) >= 18,
            },
          ],
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

    it('should initialize form with correct state', () => {
      const { result } = renderHook(() => useForm(testSchema));

      expect(result.current.values).toEqual({
        name: '',
        email: '',
        age: 0,
      });
      expect(result.current.errors).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.isValid).toBe(true);
      expect(result.current.isDirty).toBe(false);
      expect(result.current.migrationStatus).toBe('zustand');
    });

    it('should set field value and update form state', () => {
      const { result } = renderHook(() => useForm(testSchema));

      act(() => {
        result.current.setFieldValue('name', 'John Doe');
      });

      expect(result.current.values.name).toBe('John Doe');
      expect(result.current.isDirty).toBe(true);
    });

    it('should set multiple field values', () => {
      const { result } = renderHook(() => useForm(testSchema));

      act(() => {
        result.current.setFieldValues({
          name: 'Jane Smith',
          email: 'jane@example.com',
          age: 25,
        });
      });

      expect(result.current.values).toEqual({
        name: 'Jane Smith',
        email: 'jane@example.com',
        age: 25,
      });
      expect(result.current.isDirty).toBe(true);
    });

    it('should set field errors', () => {
      const { result } = renderHook(() => useForm(testSchema));

      act(() => {
        result.current.setFieldError('name', 'This field is invalid');
      });

      expect(result.current.errors.name).toBe('This field is invalid');
      expect(result.current.hasErrors).toBe(true);
      expect(result.current.isValid).toBe(false);
    });

    it('should set field touched state', () => {
      const { result } = renderHook(() => useForm(testSchema));

      act(() => {
        result.current.setFieldTouched('name', true);
      });

      expect(result.current.touched.name).toBe(true);
    });

    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useForm(testSchema));

      // Modify form state
      act(() => {
        result.current.setFieldValue('name', 'John');
        result.current.setFieldError('email', 'Invalid email');
        result.current.setFieldTouched('name', true);
      });

      expect(result.current.values.name).toBe('John');
      expect(result.current.errors.email).toBe('Invalid email');
      expect(result.current.touched.name).toBe(true);

      // Reset form
      act(() => {
        result.current.reset();
      });

      expect(result.current.values.name).toBe('');
      expect(result.current.errors.email).toBe(null);
      expect(result.current.touched.name).toBe(false);
      expect(result.current.isDirty).toBe(false);
    });

    it('should clear form values', () => {
      const { result } = renderHook(() => useForm(testSchema));

      act(() => {
        result.current.setFieldValue('name', 'John');
        result.current.setFieldValue('email', 'john@example.com');
      });

      expect(result.current.values.name).toBe('John');
      expect(result.current.values.email).toBe('john@example.com');

      act(() => {
        result.current.clear();
      });

      expect(result.current.values.name).toBe('');
      expect(result.current.values.email).toBe('');
    });
  });

  describe('Form Validation', () => {
    const validationSchema: FormSchema = {
      formId: 'validationForm',
      fields: {
        email: {
          initialValue: '',
          validation: [
            validationRules.required('Email is required'),
            validationRules.email('Invalid email format'),
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
    };

    it('should validate form and return validation result', async () => {
      const { result } = renderHook(() => useForm(validationSchema));

      const validationResult = await act(async () => {
        return result.current.validate();
      });

      expect(validationResult.isValid).toBe(false);
      expect(validationResult.hasErrors).toBe(true);
      expect(validationResult.errors.email).toBe('Email is required');
      expect(validationResult.errors.password).toBe('Password is required');
    });

    it('should pass validation with valid values', async () => {
      const { result } = renderHook(() => useForm(validationSchema));

      act(() => {
        result.current.setFieldValues({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      const validationResult = await act(async () => {
        return result.current.validate();
      });

      expect(validationResult.isValid).toBe(true);
      expect(validationResult.hasErrors).toBe(false);
    });
  });

  describe('Form Submission', () => {
    const submissionSchema: FormSchema = {
      formId: 'submissionForm',
      fields: {
        username: {
          initialValue: '',
          validation: [validationRules.required('Username is required')],
        },
        email: {
          initialValue: '',
          validation: [validationRules.required('Email is required')],
        },
      },
    };

    it('should handle successful form submission', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => 
        useForm(submissionSchema, { onSubmit })
      );

      act(() => {
        result.current.setFieldValues({
          username: 'testuser',
          email: 'test@example.com',
        });
      });

      await act(async () => {
        await result.current.submit();
      });

      expect(onSubmit).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'test@example.com',
      });
    });

    it('should prevent submission with validation errors', async () => {
      const onSubmit = jest.fn();
      const onValidationError = jest.fn();
      const { result } = renderHook(() => 
        useForm(submissionSchema, { onSubmit, onValidationError })
      );

      // Leave fields empty (will fail validation)
      await act(async () => {
        await result.current.submit();
      });

      expect(onSubmit).not.toHaveBeenCalled();
      expect(onValidationError).toHaveBeenCalledWith({
        username: 'Username is required',
        email: 'Email is required',
      });
    });

    it('should handle submission errors', async () => {
      const submitError = new Error('Submission failed');
      const onSubmit = jest.fn().mockRejectedValue(submitError);
      const { result } = renderHook(() => 
        useForm(submissionSchema, { onSubmit })
      );

      act(() => {
        result.current.setFieldValues({
          username: 'testuser',
          email: 'test@example.com',
        });
      });

      await expect(act(async () => {
        await result.current.submit();
      })).rejects.toThrow('Submission failed');
    });

    it('should reset form after successful submission if enabled', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => 
        useForm(submissionSchema, { onSubmit, resetOnSubmit: true })
      );

      act(() => {
        result.current.setFieldValues({
          username: 'testuser',
          email: 'test@example.com',
        });
      });

      expect(result.current.values.username).toBe('testuser');

      await act(async () => {
        await result.current.submit();
      });

      expect(result.current.values.username).toBe('');
      expect(result.current.isDirty).toBe(false);
    });

    it('should track submission state', async () => {
      const onSubmit = jest.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
      const { result } = renderHook(() => 
        useForm(submissionSchema, { onSubmit })
      );

      act(() => {
        result.current.setFieldValues({
          username: 'testuser',
          email: 'test@example.com',
        });
      });

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.getSubmitCount()).toBe(0);

      const submitPromise = act(async () => {
        return result.current.submit();
      });

      expect(result.current.isSubmitting).toBe(true);

      await submitPromise;

      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.getSubmitCount()).toBe(1);
    });
  });

  describe('Form Field Helpers', () => {
    const fieldSchema: FormSchema = {
      formId: 'fieldForm',
      fields: {
        name: { initialValue: '' },
        email: { initialValue: '' },
      },
    };

    it('should provide field helpers with correct state', () => {
      const { result } = renderHook(() => useForm(fieldSchema));

      act(() => {
        result.current.setFieldValue('name', 'John');
        result.current.setFieldError('name', 'Some error');
        result.current.setFieldTouched('name', true);
      });

      const nameField = result.current.getField('name');

      expect(nameField.value).toBe('John');
      expect(nameField.error).toBe('Some error');
      expect(nameField.touched).toBe(true);
      expect(nameField.hasError).toBe(true);
      expect(nameField.isValid).toBe(false);
    });

    it('should handle field actions through helpers', () => {
      const { result } = renderHook(() => useForm(fieldSchema));

      const nameField = result.current.getField('name');

      act(() => {
        nameField.setValue('Jane');
        nameField.setError('Field error');
        nameField.setTouched(true);
      });

      expect(result.current.values.name).toBe('Jane');
      expect(result.current.errors.name).toBe('Field error');
      expect(result.current.touched.name).toBe(true);
    });

    it('should handle onChange and onBlur events', () => {
      const { result } = renderHook(() => useForm(fieldSchema));

      const nameField = result.current.getField('name');

      act(() => {
        nameField.onChange('Test Value');
      });

      expect(result.current.values.name).toBe('Test Value');

      act(() => {
        nameField.onBlur();
      });

      expect(result.current.touched.name).toBe(true);
    });
  });

  describe('Form Change Detection', () => {
    const changeSchema: FormSchema = {
      formId: 'changeForm',
      fields: {
        field1: { initialValue: 'initial1' },
        field2: { initialValue: 'initial2' },
      },
    };

    it('should detect form changes', () => {
      const { result } = renderHook(() => useForm(changeSchema));

      expect(result.current.hasChanged()).toBe(false);

      act(() => {
        result.current.setFieldValue('field1', 'modified');
      });

      expect(result.current.hasChanged()).toBe(true);
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('Legacy Mode', () => {
    const legacySchema: FormSchema = {
      formId: 'legacyForm',
      fields: {
        name: { initialValue: '' },
      },
    };

    it('should use legacy implementation when migration safety is enabled', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      const { result } = renderHook(() => useForm(legacySchema));

      expect(result.current.migrationStatus).toBe('legacy');
      expect(result.current.values).toEqual({});
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Field Change Callbacks', () => {
    const callbackSchema: FormSchema = {
      formId: 'callbackForm',
      fields: {
        name: { initialValue: '' },
        email: { initialValue: '' },
      },
    };

    it('should trigger field change callbacks', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() => 
        useForm(callbackSchema, { onFieldChange })
      );

      act(() => {
        result.current.setFieldValue('name', 'John');
      });

      expect(onFieldChange).toHaveBeenCalledWith('name', 'John');

      act(() => {
        result.current.setFieldValues({
          email: 'john@example.com',
          name: 'John Doe',
        });
      });

      expect(onFieldChange).toHaveBeenCalledWith('email', 'john@example.com');
      expect(onFieldChange).toHaveBeenCalledWith('name', 'John Doe');
    });
  });
});

describe('useFormField Hook', () => {
  beforeEach(() => {
    mockUseMigrationSafety.mockReturnValue({
      shouldUseLegacy: false,
    });
  });

  it('should return field state and actions', () => {
    const { result } = renderHook(() => 
      useFormField('testForm', 'testField')
    );

    expect(result.current).toHaveProperty('value');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('touched');
    expect(result.current).toHaveProperty('onChange');
    expect(result.current).toHaveProperty('onBlur');
    expect(result.current).toHaveProperty('onFocus');
  });

  it('should handle field change callbacks', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => 
      useFormField('testForm', 'testField', { onChange })
    );

    act(() => {
      result.current.onChange('test value');
    });

    expect(onChange).toHaveBeenCalledWith('test value');
  });

  it('should use legacy implementation when migration safety is enabled', () => {
    mockUseMigrationSafety.mockReturnValue({
      shouldUseLegacy: true,
    });

    const { result } = renderHook(() => 
      useFormField('testForm', 'testField')
    );

    expect(result.current.value).toBe('');
    expect(result.current.isValid).toBe(true);
  });
});

describe('useSimpleForm Hook', () => {
  it('should create a simple form with initial values', () => {
    const initialValues = {
      name: 'John',
      age: 25,
    };

    const { result } = renderHook(() => 
      useSimpleForm('simpleForm', initialValues)
    );

    expect(result.current.values).toEqual(initialValues);
    expect(result.current.migrationStatus).toBe('zustand');
  });

  it('should handle form submission', async () => {
    const initialValues = { name: 'John' };
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() => 
      useSimpleForm('simpleForm', initialValues, onSubmit)
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(onSubmit).toHaveBeenCalledWith({ name: 'John' });
  });
});