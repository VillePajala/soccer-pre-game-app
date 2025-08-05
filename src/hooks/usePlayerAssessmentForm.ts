/**
 * Player Assessment Form Hook - Zustand Integration
 * 
 * This hook provides centralized form state management for PlayerAssessmentModal,
 * replacing distributed useState calls with a unified FormStore approach.
 * Handles player assessment forms with overall ratings, detailed sliders,
 * notes, and validation for soccer player evaluation.
 * 
 * Migration Strategy:
 * - Replace distributed useState with centralized FormStore
 * - Maintain existing validation patterns
 * - Add form persistence across modal sessions
 * - Provide backward compatibility during transition
 */

import { useMemo, useCallback, useEffect } from 'react';
import { useForm } from '@/hooks/useForm';
import { FormSchema } from '@/stores/formStore';
import { validationRules } from '@/utils/formValidation';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import type { PlayerAssessment } from '@/types/playerAssessment';
import logger from '@/utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface AssessmentSliders {
  intensity: number;
  courage: number;
  duels: number;
  technique: number;
  creativity: number;
  decisions: number;
  awareness: number;
  teamwork: number;
  fair_play: number;
  impact: number;
}

export interface PlayerAssessmentFormValues {
  // Assessment data per player
  assessments: Record<string, {
    overall: number;
    sliders: AssessmentSliders;
    notes: string;
    expanded: boolean;
    isValid: boolean;
    hasChanged: boolean;
  }>;
  
  // Progress tracking
  savedIds: string[];
  completedCount: number;
  totalCount: number;
  
  // Form state
  isAutoSaving: boolean;
  lastSavedAt: number | null;
}

export interface PlayerAssessmentFormOptions {
  // External data
  selectedPlayerIds?: string[];
  availablePlayers?: Array<{ id: string; name: string; nickname?: string }>;
  existingAssessments?: Record<string, PlayerAssessment>;
  
  // Callbacks
  onSubmit?: (values: PlayerAssessmentFormValues) => Promise<void> | void;
  onFieldChange?: (fieldName: keyof PlayerAssessmentFormValues, value: any) => void;
  onSave?: (playerId: string, assessment: Partial<PlayerAssessment>) => Promise<void> | void;
  onDelete?: (playerId: string) => Promise<void> | void;
  onAssessmentChange?: (playerId: string, assessment: Partial<PlayerAssessment>) => void;
  
  // Form behavior
  persistForm?: boolean;
  validateOnChange?: boolean;
  autoSaveDelay?: number; // milliseconds
}

export interface UsePlayerAssessmentFormResult {
  // Form state
  values: PlayerAssessmentFormValues;
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  isDirty: boolean;
  hasErrors: boolean;
  
  // Form actions
  setFieldValue: (name: keyof PlayerAssessmentFormValues, value: any) => void;
  setFieldValues: (values: Partial<PlayerAssessmentFormValues>) => void;
  validateForm: () => Promise<void>;
  submitForm: () => Promise<void>;
  resetForm: () => void;
  clearForm: () => void;
  
  // Field helpers
  getField: (name: keyof PlayerAssessmentFormValues) => {
    value: any;
    error: string | null;
    touched: boolean;
    onChange: (value: any) => void;
    onBlur: () => void;
  };
  
  // Player Assessment Management
  handleOverallRatingChange: (playerId: string, rating: number) => void;
  handleSliderChange: (playerId: string, sliderKey: keyof AssessmentSliders, value: number) => void;
  handleNotesChange: (playerId: string, notes: string) => void;
  handleToggleExpanded: (playerId: string) => void;
  
  // Assessment Operations
  handleSaveAssessment: (playerId: string) => Promise<void>;
  handleDeleteAssessment: (playerId: string) => Promise<void>;
  handleResetAssessment: (playerId: string) => void;
  
  // Progress Management
  getProgress: () => { completed: number; total: number; percentage: number };
  isPlayerSaved: (playerId: string) => boolean;
  isPlayerExpanded: (playerId: string) => boolean;
  isPlayerValid: (playerId: string) => boolean;
  
  // Assessment Data Getters
  getPlayerAssessment: (playerId: string) => Partial<PlayerAssessment>;
  getPlayerOverallRating: (playerId: string) => number;
  getPlayerSliders: (playerId: string) => AssessmentSliders;
  getPlayerNotes: (playerId: string) => string;
  
  // Bulk Operations
  handleSaveAll: () => Promise<void>;
  handleExpandAll: () => void;
  handleCollapseAll: () => void;
  
  // Form state queries
  hasFormChanged: () => boolean;
  getFormData: () => PlayerAssessmentFormValues;
  getAllAssessments: () => Record<string, PlayerAssessment>;
  
  // Migration status
  migrationStatus: 'zustand' | 'legacy';
}

// ============================================================================
// Constants and Defaults
// ============================================================================

const DEFAULT_SLIDERS: AssessmentSliders = {
  intensity: 5,
  courage: 5,
  duels: 5,
  technique: 5,
  creativity: 5,
  decisions: 5,
  awareness: 5,
  teamwork: 5,
  fair_play: 5,
  impact: 5,
};

const DEFAULT_OVERALL_RATING = 5;
const DEFAULT_AUTO_SAVE_DELAY = 800;

// ============================================================================
// Custom Validation Rules
// ============================================================================

const playerAssessmentValidationRules = {
  overallRating: {
    type: 'custom' as const,
    message: 'Overall rating must be between 1 and 10',
    validator: (value: any) => {
      const num = Number(value);
      return !isNaN(num) && num >= 1 && num <= 10;
    },
  },
  
  sliderValue: {
    type: 'custom' as const,
    message: 'Slider value must be between 1 and 10',
    validator: (value: any) => {
      const num = Number(value);
      return !isNaN(num) && num >= 1 && num <= 10;
    },
  },
  
  assessmentNotes: {
    type: 'custom' as const,
    message: 'Notes must be 280 characters or less',
    validator: (value: any) => {
      if (!value || typeof value !== 'string') return true;
      return value.length <= 280;
    },
  },
  
  completeAssessment: {
    type: 'custom' as const,
    message: 'Assessment is incomplete',
    validator: (assessment: any) => {
      if (!assessment) return false;
      
      // Check overall rating
      if (typeof assessment.overall !== 'number' || assessment.overall < 1 || assessment.overall > 10) {
        return false;
      }
      
      // Check sliders
      if (!assessment.sliders) return false;
      const slidersValid = Object.values(assessment.sliders).every(
        (value: any) => typeof value === 'number' && value >= 1 && value <= 10
      );
      if (!slidersValid) return false;
      
      // Check notes length
      if (assessment.notes && typeof assessment.notes === 'string' && assessment.notes.length > 280) {
        return false;
      }
      
      return true;
    },
  },
};

// ============================================================================
// Form Schema Factory
// ============================================================================

function createPlayerAssessmentSchema(options: PlayerAssessmentFormOptions = {}): FormSchema {
  const selectedPlayerIds = options.selectedPlayerIds || [];
  
  // Create initial assessments for all selected players
  const initialAssessments: Record<string, any> = {};
  selectedPlayerIds.forEach(playerId => {
    const existingAssessment = options.existingAssessments?.[playerId];
    initialAssessments[playerId] = {
      overall: existingAssessment?.overall ?? DEFAULT_OVERALL_RATING,
      sliders: existingAssessment?.sliders ?? { ...DEFAULT_SLIDERS },
      notes: existingAssessment?.notes ?? '',
      expanded: false,
      isValid: true,
      hasChanged: false,
    };
  });
  
  return {
    formId: 'playerAssessment',
    fields: {
      // Assessment data per player
      assessments: {
        initialValue: initialAssessments,
        validation: [],
        persist: true,
      },
      
      // Progress tracking
      savedIds: {
        initialValue: Object.keys(options.existingAssessments || {}),
        validation: [],
        persist: false, // Don't persist UI state
      },
      completedCount: {
        initialValue: Object.keys(options.existingAssessments || {}).length,
        validation: [],
        persist: false,
      },
      totalCount: {
        initialValue: selectedPlayerIds.length,
        validation: [],
        persist: false,
      },
      
      // Form state
      isAutoSaving: {
        initialValue: false,
        validation: [],
        persist: false,
      },
      lastSavedAt: {
        initialValue: null,
        validation: [],
        persist: false,
      },
    },
    persistence: {
      enabled: options.persistForm !== false,
      key: 'playerAssessment',
      restoreOnMount: true,
      excludeFields: ['savedIds', 'completedCount', 'totalCount', 'isAutoSaving', 'lastSavedAt'],
    },
    validation: {
      validateOnChange: options.validateOnChange !== false,
      validateOnBlur: true,
      validateOnMount: false,
      debounceMs: 300,
    },
  };
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

export function usePlayerAssessmentForm(
  options: PlayerAssessmentFormOptions = {}
): UsePlayerAssessmentFormResult {
  const { shouldUseLegacy } = useMigrationSafety('PlayerAssessmentForm');
  
  // Create form schema
  const schema = useMemo(() => createPlayerAssessmentSchema(options), [options]);
  
  // Legacy fallback
  if (shouldUseLegacy) {
    return useLegacyPlayerAssessmentForm(options);
  }
  
  // Use FormStore with schema
  const form = useForm<PlayerAssessmentFormValues>(schema, {
    onSubmit: options.onSubmit,
    onFieldChange: options.onFieldChange,
    persistForm: options.persistForm,
    validateOnMount: false,
  });
  
  // Auto-save timeout refs
  const autoSaveTimeouts = useMemo(() => new Map<string, NodeJS.Timeout>(), []);
  
  // ============================================================================
  // Player Assessment Management
  // ============================================================================
  
  const handleOverallRatingChange = useCallback((playerId: string, rating: number) => {
    const currentAssessments = form.values.assessments;
    const playerAssessment = currentAssessments[playerId];
    
    if (!playerAssessment) return;
    
    const updatedAssessment = {
      ...playerAssessment,
      overall: rating,
      hasChanged: true,
      isValid: playerAssessmentValidationRules.completeAssessment.validator({
        overall: rating,
        sliders: playerAssessment.sliders,
        notes: playerAssessment.notes,
      }),
    };
    
    form.setFieldValue('assessments', {
      ...currentAssessments,
      [playerId]: updatedAssessment,
    });
    
    // Trigger auto-save
    scheduleAutoSave(playerId, updatedAssessment);
    
    logger.debug('[PlayerAssessmentForm] Overall rating changed:', playerId, rating);
  }, [form]);
  
  const handleSliderChange = useCallback((playerId: string, sliderKey: keyof AssessmentSliders, value: number) => {
    const currentAssessments = form.values.assessments;
    const playerAssessment = currentAssessments[playerId];
    
    if (!playerAssessment) return;
    
    const updatedSliders = {
      ...playerAssessment.sliders,
      [sliderKey]: value,
    };
    
    const updatedAssessment = {
      ...playerAssessment,
      sliders: updatedSliders,
      hasChanged: true,
      isValid: playerAssessmentValidationRules.completeAssessment.validator({
        overall: playerAssessment.overall,
        sliders: updatedSliders,
        notes: playerAssessment.notes,
      }),
    };
    
    form.setFieldValue('assessments', {
      ...currentAssessments,
      [playerId]: updatedAssessment,
    });
    
    // Trigger auto-save
    scheduleAutoSave(playerId, updatedAssessment);
    
    logger.debug('[PlayerAssessmentForm] Slider changed:', playerId, sliderKey, value);
  }, [form]);
  
  const handleNotesChange = useCallback((playerId: string, notes: string) => {
    const currentAssessments = form.values.assessments;
    const playerAssessment = currentAssessments[playerId];
    
    if (!playerAssessment) return;
    
    const updatedAssessment = {
      ...playerAssessment,
      notes,
      hasChanged: true,
      isValid: playerAssessmentValidationRules.completeAssessment.validator({
        overall: playerAssessment.overall,
        sliders: playerAssessment.sliders,
        notes,
      }),
    };
    
    form.setFieldValue('assessments', {
      ...currentAssessments,
      [playerId]: updatedAssessment,
    });
    
    // Trigger auto-save
    scheduleAutoSave(playerId, updatedAssessment);
    
    logger.debug('[PlayerAssessmentForm] Notes changed:', playerId, notes.length, 'characters');
  }, [form]);
  
  const handleToggleExpanded = useCallback((playerId: string) => {
    const currentAssessments = form.values.assessments;
    const playerAssessment = currentAssessments[playerId];
    
    if (!playerAssessment) return;
    
    form.setFieldValue('assessments', {
      ...currentAssessments,
      [playerId]: {
        ...playerAssessment,
        expanded: !playerAssessment.expanded,
      },
    });
    
    logger.debug('[PlayerAssessmentForm] Toggled expanded:', playerId, !playerAssessment.expanded);
  }, [form]);
  
  // ============================================================================
  // Auto-save Implementation
  // ============================================================================
  
  const scheduleAutoSave = useCallback((playerId: string, assessment: any) => {
    // Clear existing timeout
    const existingTimeout = autoSaveTimeouts.get(playerId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Schedule new auto-save
    const delay = options.autoSaveDelay ?? DEFAULT_AUTO_SAVE_DELAY;
    const timeout = setTimeout(async () => {
      if (assessment.isValid && assessment.hasChanged && options.onSave) {
        form.setFieldValue('isAutoSaving', true);
        try {
          await options.onSave(playerId, {
            overall: assessment.overall,
            sliders: assessment.sliders,
            notes: assessment.notes,
          });
          
          // Mark as saved
          const currentSavedIds = form.values.savedIds;
          if (!currentSavedIds.includes(playerId)) {
            form.setFieldValues({
              savedIds: [...currentSavedIds, playerId],
              completedCount: currentSavedIds.length + 1,
              lastSavedAt: Date.now(),
            });
          }
          
          // Reset hasChanged flag
          const currentAssessments = form.values.assessments;
          form.setFieldValue('assessments', {
            ...currentAssessments,
            [playerId]: {
              ...currentAssessments[playerId],
              hasChanged: false,
            },
          });
          
          logger.debug('[PlayerAssessmentForm] Auto-saved assessment:', playerId);
        } catch (error) {
          logger.error('[PlayerAssessmentForm] Auto-save failed:', playerId, error);
        } finally {
          form.setFieldValue('isAutoSaving', false);
        }
      }
      autoSaveTimeouts.delete(playerId);
    }, delay);
    
    autoSaveTimeouts.set(playerId, timeout);
  }, [form, options, autoSaveTimeouts]);
  
  // ============================================================================
  // Assessment Operations
  // ============================================================================
  
  const handleSaveAssessment = useCallback(async (playerId: string) => {
    const assessment = form.values.assessments[playerId];
    if (!assessment || !assessment.isValid || !options.onSave) return;
    
    form.setFieldValue('isAutoSaving', true);
    try {
      await options.onSave(playerId, {
        overall: assessment.overall,
        sliders: assessment.sliders,
        notes: assessment.notes,
      });
      
      // Mark as saved
      const currentSavedIds = form.values.savedIds;
      if (!currentSavedIds.includes(playerId)) {
        form.setFieldValues({
          savedIds: [...currentSavedIds, playerId],
          completedCount: currentSavedIds.length + 1,
          lastSavedAt: Date.now(),
        });
      }
      
      // Reset hasChanged flag and collapse
      const currentAssessments = form.values.assessments;
      form.setFieldValue('assessments', {
        ...currentAssessments,
        [playerId]: {
          ...assessment,
          hasChanged: false,
          expanded: false,
        },
      });
      
      logger.debug('[PlayerAssessmentForm] Manually saved assessment:', playerId);
    } catch (error) {
      logger.error('[PlayerAssessmentForm] Manual save failed:', playerId, error);
      throw error;
    } finally {
      form.setFieldValue('isAutoSaving', false);
    }
  }, [form, options.onSave]);
  
  const handleDeleteAssessment = useCallback(async (playerId: string) => {
    if (!options.onDelete) return;
    
    try {
      await options.onDelete(playerId);
      
      // Remove from saved IDs
      const currentSavedIds = form.values.savedIds;
      const newSavedIds = currentSavedIds.filter(id => id !== playerId);
      
      form.setFieldValues({
        savedIds: newSavedIds,
        completedCount: newSavedIds.length,
      });
      
      // Reset assessment to defaults
      const currentAssessments = form.values.assessments;
      form.setFieldValue('assessments', {
        ...currentAssessments,
        [playerId]: {
          overall: DEFAULT_OVERALL_RATING,
          sliders: { ...DEFAULT_SLIDERS },
          notes: '',
          expanded: false,
          isValid: true,
          hasChanged: false,
        },
      });
      
      logger.debug('[PlayerAssessmentForm] Deleted assessment:', playerId);
    } catch (error) {
      logger.error('[PlayerAssessmentForm] Delete failed:', playerId, error);
      throw error;
    }
  }, [form, options.onDelete]);
  
  const handleResetAssessment = useCallback((playerId: string) => {
    const currentAssessments = form.values.assessments;
    
    form.setFieldValue('assessments', {
      ...currentAssessments,
      [playerId]: {
        overall: DEFAULT_OVERALL_RATING,
        sliders: { ...DEFAULT_SLIDERS },
        notes: '',
        expanded: false,
        isValid: true,
        hasChanged: true, // Mark as changed so user can save the reset
      },
    });
    
    logger.debug('[PlayerAssessmentForm] Reset assessment:', playerId);
  }, [form]);
  
  // ============================================================================
  // Progress Management
  // ============================================================================
  
  const getProgress = useCallback(() => {
    const completed = form.values.completedCount;
    const total = form.values.totalCount;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  }, [form]);
  
  const isPlayerSaved = useCallback((playerId: string) => {
    return form.values.savedIds.includes(playerId);
  }, [form]);
  
  const isPlayerExpanded = useCallback((playerId: string) => {
    return form.values.assessments[playerId]?.expanded ?? false;
  }, [form]);
  
  const isPlayerValid = useCallback((playerId: string) => {
    return form.values.assessments[playerId]?.isValid ?? false;
  }, [form]);
  
  // ============================================================================
  // Assessment Data Getters
  // ============================================================================
  
  const getPlayerAssessment = useCallback((playerId: string): Partial<PlayerAssessment> => {
    const assessment = form.values.assessments[playerId];
    if (!assessment) return {};
    
    return {
      overall: assessment.overall,
      sliders: assessment.sliders,
      notes: assessment.notes,
    };
  }, [form]);
  
  const getPlayerOverallRating = useCallback((playerId: string) => {
    return form.values.assessments[playerId]?.overall ?? DEFAULT_OVERALL_RATING;
  }, [form]);
  
  const getPlayerSliders = useCallback((playerId: string) => {
    return form.values.assessments[playerId]?.sliders ?? { ...DEFAULT_SLIDERS };
  }, [form]);
  
  const getPlayerNotes = useCallback((playerId: string) => {
    return form.values.assessments[playerId]?.notes ?? '';
  }, [form]);
  
  // ============================================================================
  // Bulk Operations
  // ============================================================================
  
  const handleSaveAll = useCallback(async () => {
    if (!options.onSave) return;
    
    const assessments = form.values.assessments;
    const unsavedPlayerIds = Object.keys(assessments).filter(playerId => 
      assessments[playerId]?.isValid && 
      assessments[playerId]?.hasChanged &&
      !form.values.savedIds.includes(playerId)
    );
    
    form.setFieldValue('isAutoSaving', true);
    try {
      await Promise.all(
        unsavedPlayerIds.map(playerId => 
          options.onSave!(playerId, {
            overall: assessments[playerId].overall,
            sliders: assessments[playerId].sliders,
            notes: assessments[playerId].notes,
          })
        )
      );
      
      // Update saved IDs
      const newSavedIds = [...form.values.savedIds, ...unsavedPlayerIds];
      form.setFieldValues({
        savedIds: newSavedIds,
        completedCount: newSavedIds.length,
        lastSavedAt: Date.now(),
      });
      
      // Reset hasChanged flags
      const updatedAssessments = { ...assessments };
      unsavedPlayerIds.forEach(playerId => {
        updatedAssessments[playerId] = {
          ...updatedAssessments[playerId],
          hasChanged: false,
        };
      });
      form.setFieldValue('assessments', updatedAssessments);
      
      logger.debug('[PlayerAssessmentForm] Saved all assessments:', unsavedPlayerIds.length);
    } catch (error) {
      logger.error('[PlayerAssessmentForm] Save all failed:', error);
      throw error;
    } finally {
      form.setFieldValue('isAutoSaving', false);
    }
  }, [form, options.onSave]);
  
  const handleExpandAll = useCallback(() => {
    const currentAssessments = form.values.assessments;
    const updatedAssessments = { ...currentAssessments };
    
    Object.keys(updatedAssessments).forEach(playerId => {
      updatedAssessments[playerId] = {
        ...updatedAssessments[playerId],
        expanded: true,
      };
    });
    
    form.setFieldValue('assessments', updatedAssessments);
    logger.debug('[PlayerAssessmentForm] Expanded all assessments');
  }, [form]);
  
  const handleCollapseAll = useCallback(() => {
    const currentAssessments = form.values.assessments;
    const updatedAssessments = { ...currentAssessments };
    
    Object.keys(updatedAssessments).forEach(playerId => {
      updatedAssessments[playerId] = {
        ...updatedAssessments[playerId],
        expanded: false,
      };
    });
    
    form.setFieldValue('assessments', updatedAssessments);
    logger.debug('[PlayerAssessmentForm] Collapsed all assessments');
  }, [form]);
  
  // ============================================================================
  // Form State Queries
  // ============================================================================
  
  const hasFormChanged = useCallback(() => {
    return form.hasChanged();
  }, [form]);
  
  const getFormData = useCallback((): PlayerAssessmentFormValues => {
    return form.values;
  }, [form]);
  
  const getAllAssessments = useCallback((): Record<string, PlayerAssessment> => {
    const assessments = form.values.assessments;
    const result: Record<string, PlayerAssessment> = {};
    
    Object.entries(assessments).forEach(([playerId, assessment]) => {
      if (assessment.isValid) {
        result[playerId] = {
          overall: assessment.overall,
          sliders: assessment.sliders,
          notes: assessment.notes,
          minutesPlayed: 0, // This would be calculated elsewhere
          createdAt: Date.now(),
          createdBy: 'current-user', // This would come from auth context
        };
      }
    });
    
    return result;
  }, [form]);
  
  // ============================================================================
  // Cleanup Effect
  // ============================================================================
  
  useEffect(() => {
    return () => {
      // Clear all auto-save timeouts on unmount
      autoSaveTimeouts.forEach(timeout => clearTimeout(timeout));
      autoSaveTimeouts.clear();
    };
  }, [autoSaveTimeouts]);
  
  // ============================================================================
  // Return Interface
  // ============================================================================
  
  return {
    // Form state
    values: form.values,
    errors: form.errors,
    touched: form.touched,
    isSubmitting: form.isSubmitting,
    isValidating: form.isValidating,
    isValid: form.isValid,
    isDirty: form.isDirty,
    hasErrors: form.hasErrors,
    
    // Form actions
    setFieldValue: form.setFieldValue,
    setFieldValues: form.setFieldValues,
    validateForm: form.validate,
    submitForm: form.submit,
    resetForm: form.reset,
    clearForm: form.clear,
    
    // Field helpers
    getField: form.getField,
    
    // Player Assessment Management
    handleOverallRatingChange,
    handleSliderChange,
    handleNotesChange,
    handleToggleExpanded,
    
    // Assessment Operations
    handleSaveAssessment,
    handleDeleteAssessment,
    handleResetAssessment,
    
    // Progress Management
    getProgress,
    isPlayerSaved,
    isPlayerExpanded,
    isPlayerValid,
    
    // Assessment Data Getters
    getPlayerAssessment,
    getPlayerOverallRating,
    getPlayerSliders,
    getPlayerNotes,
    
    // Bulk Operations
    handleSaveAll,
    handleExpandAll,
    handleCollapseAll,
    
    // Form state queries
    hasFormChanged,
    getFormData,
    getAllAssessments,
    
    // Migration status
    migrationStatus: 'zustand',
  };
}

// ============================================================================
// Legacy Fallback Implementation
// ============================================================================

function useLegacyPlayerAssessmentForm(
  options: PlayerAssessmentFormOptions
): UsePlayerAssessmentFormResult {
  logger.debug('[PlayerAssessmentForm] Using legacy implementation');
  
  // Create a minimal interface for legacy mode
  // This would integrate with existing useState patterns
  return {
    // Form state (empty in legacy mode)
    values: {} as PlayerAssessmentFormValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValidating: false,
    isValid: true,
    isDirty: false,
    hasErrors: false,
    
    // Form actions (no-ops in legacy mode)
    setFieldValue: () => {},
    setFieldValues: () => {},
    validateForm: async () => {},
    submitForm: async () => {},
    resetForm: () => {},
    clearForm: () => {},
    
    // Field helpers (empty in legacy mode)
    getField: () => ({
      value: '',
      error: null,
      touched: false,
      onChange: () => {},
      onBlur: () => {},
    }),
    
    // Player Assessment Management (no-ops in legacy mode)
    handleOverallRatingChange: () => {},
    handleSliderChange: () => {},
    handleNotesChange: () => {},
    handleToggleExpanded: () => {},
    
    // Assessment Operations (no-ops in legacy mode)
    handleSaveAssessment: async () => {},
    handleDeleteAssessment: async () => {},
    handleResetAssessment: () => {},
    
    // Progress Management (defaults in legacy mode)
    getProgress: () => ({ completed: 0, total: 0, percentage: 0 }),
    isPlayerSaved: () => false,
    isPlayerExpanded: () => false,
    isPlayerValid: () => true,
    
    // Assessment Data Getters (defaults in legacy mode)
    getPlayerAssessment: () => ({}),
    getPlayerOverallRating: () => DEFAULT_OVERALL_RATING,
    getPlayerSliders: () => ({ ...DEFAULT_SLIDERS }),
    getPlayerNotes: () => '',
    
    // Bulk Operations (no-ops in legacy mode)
    handleSaveAll: async () => {},
    handleExpandAll: () => {},
    handleCollapseAll: () => {},
    
    // Form state queries (defaults in legacy mode)
    hasFormChanged: () => false,
    getFormData: () => ({} as PlayerAssessmentFormValues),
    getAllAssessments: () => ({}),
    
    // Migration status
    migrationStatus: 'legacy',
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert existing assessments to form values
 */
export function convertAssessmentsToFormValues(
  selectedPlayerIds: string[],
  assessments: Record<string, PlayerAssessment>
): Partial<PlayerAssessmentFormValues> {
  const formAssessments: Record<string, any> = {};
  
  selectedPlayerIds.forEach(playerId => {
    const existing = assessments[playerId];
    formAssessments[playerId] = {
      overall: existing?.overall ?? DEFAULT_OVERALL_RATING,
      sliders: existing?.sliders ?? { ...DEFAULT_SLIDERS },
      notes: existing?.notes ?? '',
      expanded: false,
      isValid: true,
      hasChanged: false,
    };
  });
  
  return {
    assessments: formAssessments,
    savedIds: Object.keys(assessments),
    completedCount: Object.keys(assessments).length,
    totalCount: selectedPlayerIds.length,
    isAutoSaving: false,
    lastSavedAt: null,
  };
}

/**
 * Validate a complete player assessment
 */
export function validatePlayerAssessment(assessment: Partial<PlayerAssessment>): boolean {
  return playerAssessmentValidationRules.completeAssessment.validator(assessment);
}

/**
 * Calculate assessment completion percentage
 */
export function calculateCompletionPercentage(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}