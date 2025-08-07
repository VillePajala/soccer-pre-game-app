/**
 * FormStore Mock Setup for Tests
 * 
 * This provides comprehensive mocking for the FormStore to fix useForm tests
 */

import { FormSchema, FieldValue } from '@/stores/formStore';

// Create a mock form state
const createMockForm = (schema: FormSchema) => {
  const fields: Record<string, any> = {};
  
  // Initialize fields from schema
  Object.entries(schema.fields).forEach(([name, config]) => {
    fields[name] = {
      value: config.initialValue,
      error: null,
      touched: false,
      focused: false,
      dirty: false,
      validating: false,
    };
  });

  return {
    id: schema.formId,
    schema,
    fields,
    isSubmitting: false,
    isValidating: false,
    isValid: true,
    isDirty: false,
    hasErrors: false,
    submitCount: 0,
  };
};

// Mock FormStore state
let mockFormStoreState = {
  forms: {} as Record<string, any>,
};

// Mock FormStore actions
const mockFormStoreActions = {
  createForm: jest.fn((schema: FormSchema) => {
    mockFormStoreState.forms[schema.formId] = createMockForm(schema);
  }),
  
  destroyForm: jest.fn((formId: string) => {
    delete mockFormStoreState.forms[formId];
  }),
  
  setFieldValue: jest.fn((formId: string, fieldName: string, value: FieldValue) => {
    const form = mockFormStoreState.forms[formId];
    if (form && form.fields[fieldName]) {
      form.fields[fieldName].value = value;
      form.fields[fieldName].dirty = true;
      form.isDirty = true;
    }
  }),
  
  setFieldError: jest.fn((formId: string, fieldName: string, error: string | null) => {
    const form = mockFormStoreState.forms[formId];
    if (form && form.fields[fieldName]) {
      form.fields[fieldName].error = error;
      form.hasErrors = Object.values(form.fields).some((field: any) => field.error !== null);
      form.isValid = !form.hasErrors;
    }
  }),
  
  setFieldTouched: jest.fn((formId: string, fieldName: string, touched: boolean) => {
    const form = mockFormStoreState.forms[formId];
    if (form && form.fields[fieldName]) {
      form.fields[fieldName].touched = touched;
    }
  }),
  
  setFieldValues: jest.fn((formId: string, values: Record<string, FieldValue>) => {
    const form = mockFormStoreState.forms[formId];
    if (form) {
      Object.entries(values).forEach(([fieldName, value]) => {
        if (form.fields[fieldName]) {
          form.fields[fieldName].value = value;
          form.fields[fieldName].dirty = true;
        }
      });
      form.isDirty = true;
    }
  }),
  
  validateForm: jest.fn(async (formId: string) => {
    return { isValid: true, errors: {}, hasErrors: false };
  }),
  
  resetForm: jest.fn((formId: string) => {
    const form = mockFormStoreState.forms[formId];
    if (form) {
      Object.entries(form.fields).forEach(([fieldName, field]: [string, any]) => {
        const initialValue = form.schema.fields[fieldName]?.initialValue;
        field.value = initialValue;
        field.error = null;
        field.touched = false;
        field.dirty = false;
      });
      form.isDirty = false;
      form.hasErrors = false;
      form.isValid = true;
    }
  }),
  
  clearForm: jest.fn((formId: string) => {
    const form = mockFormStoreState.forms[formId];
    if (form) {
      Object.values(form.fields).forEach((field: any) => {
        field.value = '';
        field.error = null;
        field.touched = false;
        field.dirty = false;
      });
      form.isDirty = false;
      form.hasErrors = false;
      form.isValid = true;
    }
  }),
  
  setSubmitting: jest.fn((formId: string, isSubmitting: boolean) => {
    const form = mockFormStoreState.forms[formId];
    if (form) {
      form.isSubmitting = isSubmitting;
    }
  }),
  
  incrementSubmitCount: jest.fn((formId: string) => {
    const form = mockFormStoreState.forms[formId];
    if (form) {
      form.submitCount += 1;
    }
  }),
  
  setFieldFocused: jest.fn((formId: string, fieldName: string, focused: boolean) => {
    const form = mockFormStoreState.forms[formId];
    if (form && form.fields[fieldName]) {
      form.fields[fieldName].focused = focused;
    }
  }),
};

// Create a reactive store implementation
let listeners: (() => void)[] = [];
const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

// Wrap actions to notify listeners after state changes
const wrappedActions = {
  createForm: jest.fn((schema: FormSchema) => {
    mockFormStoreState.forms[schema.formId] = createMockForm(schema);
    notifyListeners();
  }),
  
  destroyForm: jest.fn((formId: string) => {
    delete mockFormStoreState.forms[formId];
    notifyListeners();
  }),
  
  setFieldValue: jest.fn((formId: string, fieldName: string, value: FieldValue) => {
    const form = mockFormStoreState.forms[formId];
    if (form && form.fields[fieldName]) {
      form.fields[fieldName].value = value;
      form.fields[fieldName].dirty = true;
      form.isDirty = true;
    }
    notifyListeners();
  }),
  
  setFieldError: jest.fn((formId: string, fieldName: string, error: string | null) => {
    const form = mockFormStoreState.forms[formId];
    if (form && form.fields[fieldName]) {
      form.fields[fieldName].error = error;
      form.hasErrors = Object.values(form.fields).some((field: any) => field.error !== null);
      form.isValid = !form.hasErrors;
    }
    notifyListeners();
  }),
  
  setFieldTouched: jest.fn((formId: string, fieldName: string, touched: boolean) => {
    const form = mockFormStoreState.forms[formId];
    if (form && form.fields[fieldName]) {
      form.fields[fieldName].touched = touched;
    }
    notifyListeners();
  }),
  
  setFieldValues: jest.fn((formId: string, values: Record<string, FieldValue>) => {
    const form = mockFormStoreState.forms[formId];
    if (form) {
      Object.entries(values).forEach(([fieldName, value]) => {
        if (form.fields[fieldName]) {
          form.fields[fieldName].value = value;
          form.fields[fieldName].dirty = true;
        }
      });
      form.isDirty = true;
    }
    notifyListeners();
  }),
  
  validateForm: jest.fn(async (formId: string) => {
    return { isValid: true, errors: {}, hasErrors: false };
  }),
  
  resetForm: jest.fn((formId: string) => {
    const form = mockFormStoreState.forms[formId];
    if (form) {
      Object.entries(form.fields).forEach(([fieldName, field]: [string, any]) => {
        const initialValue = form.schema.fields[fieldName]?.initialValue;
        field.value = initialValue;
        field.error = null;
        field.touched = false;
        field.dirty = false;
      });
      form.isDirty = false;
      form.hasErrors = false;
      form.isValid = true;
    }
    notifyListeners();
  }),
  
  clearForm: jest.fn((formId: string) => {
    const form = mockFormStoreState.forms[formId];
    if (form) {
      Object.values(form.fields).forEach((field: any) => {
        field.value = '';
        field.error = null;
        field.touched = false;
        field.dirty = false;
      });
      form.isDirty = false;
      form.hasErrors = false;
      form.isValid = true;
    }
    notifyListeners();
  }),
  
  setSubmitting: jest.fn((formId: string, isSubmitting: boolean) => {
    const form = mockFormStoreState.forms[formId];
    if (form) {
      form.isSubmitting = isSubmitting;
    }
    notifyListeners();
  }),
  
  incrementSubmitCount: jest.fn((formId: string) => {
    const form = mockFormStoreState.forms[formId];
    if (form) {
      form.submitCount += 1;
    }
    notifyListeners();
  }),
  
  setFieldFocused: jest.fn((formId: string, fieldName: string, focused: boolean) => {
    const form = mockFormStoreState.forms[formId];
    if (form && form.fields[fieldName]) {
      form.fields[fieldName].focused = focused;
    }
    notifyListeners();
  }),
};

// Mock the useFormStore hook with proper reactivity
const mockUseFormStore = jest.fn((selector: any) => {
  const currentState = { ...mockFormStoreState, ...wrappedActions };
  
  if (typeof selector === 'function') {
    return selector(currentState);
  }
  return currentState;
});

// Add getState method for compatibility
mockUseFormStore.getState = jest.fn(() => ({ ...mockFormStoreState, ...wrappedActions }));

// Set up the mock
jest.mock('@/stores/formStore', () => ({
  useFormStore: mockUseFormStore,
  FormSchema: {},
  FieldValue: {},
  ValidationResult: {},
}));

// Global beforeEach to reset form store state
beforeEach(() => {
  mockFormStoreState.forms = {};
  listeners = [];
  
  // Clear all mock calls
  Object.values(wrappedActions).forEach(mockFn => {
    if (jest.isMockFunction(mockFn)) {
      mockFn.mockClear();
    }
  });
});

// Export for use in tests
export { mockFormStoreState, wrappedActions as mockFormStoreActions, mockUseFormStore };