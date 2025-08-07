import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePlayerAssessmentForm, PlayerAssessmentFormOptions, convertAssessmentsToFormValues, validatePlayerAssessment, calculateCompletionPercentage } from '../usePlayerAssessmentForm';
import type { PlayerAssessment } from '@/types/playerAssessment';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';

// Mock dependencies
jest.mock('@/utils/logger');

// Mock migration safety hook
jest.mock('@/hooks/useMigrationSafety', () => ({
  useMigrationSafety: jest.fn((componentName) => {
    return {
      shouldUseLegacy: false,
    };
  }),
}));

// Mock data for testing
const mockPlayers = [
  { id: 'player1', name: 'John Doe', nickname: 'Johnny', jerseyNumber: '10' },
  { id: 'player2', name: 'Jane Smith', nickname: 'Jane', jerseyNumber: '5' },
  { id: 'player3', name: 'Bob Wilson', nickname: 'Bobby', jerseyNumber: '7' },
];

const mockExistingAssessments: Record<string, PlayerAssessment> = {
  player1: {
    overall: 7,
    sliders: {
      intensity: 8,
      courage: 7,
      duels: 6,
      technique: 7,
      creativity: 8,
      decisions: 7,
      awareness: 8,
      teamwork: 9,
      fair_play: 8,
      impact: 7,
    },
    notes: 'Excellent performance',
    minutesPlayed: 90,
    createdAt: Date.now(),
    createdBy: 'test-user',
  },
};

// Get access to the mocked function
const mockUseMigrationSafety = useMigrationSafety as jest.MockedFunction<typeof useMigrationSafety>;

describe('usePlayerAssessmentForm', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Reset the mock to ensure it returns shouldUseLegacy: false for each test
    mockUseMigrationSafety.mockImplementation((componentName) => {
      console.log(`[TEST] useMigrationSafety called with: ${componentName}`);
      return {
        shouldUseLegacy: false,
      };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic Form Operations', () => {
    it('should initialize with default values', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false, // Disable persistence for testing
        selectedPlayerIds: ['player1', 'player2'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      expect(result.current.values.assessments.player1.overall).toBe(5);
      expect(result.current.values.assessments.player1.sliders.intensity).toBe(5);
      expect(result.current.values.assessments.player1.notes).toBe('');
      expect(result.current.values.assessments.player1.expanded).toBe(false);
      expect(result.current.values.assessments.player1.isValid).toBe(true);
      expect(result.current.values.assessments.player1.hasChanged).toBe(false);
      
      expect(result.current.values.savedIds).toEqual([]);
      expect(result.current.values.completedCount).toBe(0);
      expect(result.current.values.totalCount).toBe(2);
      expect(result.current.migrationStatus).toBe('zustand');
    });

    it('should initialize with existing assessments', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1', 'player2'],
        availablePlayers: mockPlayers,
        existingAssessments: mockExistingAssessments,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      expect(result.current.values.assessments.player1.overall).toBe(7);
      expect(result.current.values.assessments.player1.sliders.intensity).toBe(8);
      expect(result.current.values.assessments.player1.notes).toBe('Excellent performance');
      
      expect(result.current.values.savedIds).toEqual(['player1']);
      expect(result.current.values.completedCount).toBe(1);
    });
  });

  describe('Overall Rating Management', () => {
    it('should handle overall rating changes', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      act(() => {
        result.current.handleOverallRatingChange('player1', 8);
      });

      expect(result.current.values.assessments.player1.overall).toBe(8);
      expect(result.current.values.assessments.player1.hasChanged).toBe(true);
    });

    it('should get player overall rating', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
        existingAssessments: mockExistingAssessments,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      expect(result.current.getPlayerOverallRating('player1')).toBe(7);
      expect(result.current.getPlayerOverallRating('nonexistent')).toBe(5);
    });
  });

  describe('Slider Management', () => {
    it('should handle slider changes', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      act(() => {
        result.current.handleSliderChange('player1', 'intensity', 9);
      });

      expect(result.current.values.assessments.player1.sliders.intensity).toBe(9);
      expect(result.current.values.assessments.player1.hasChanged).toBe(true);
    });

    it('should get player sliders', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
        existingAssessments: mockExistingAssessments,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      const sliders = result.current.getPlayerSliders('player1');
      expect(sliders.intensity).toBe(8);
      expect(sliders.teamwork).toBe(9);
    });
  });

  describe('Notes Management', () => {
    it('should handle notes changes', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      act(() => {
        result.current.handleNotesChange('player1', 'Great player today');
      });

      expect(result.current.values.assessments.player1.notes).toBe('Great player today');
      expect(result.current.values.assessments.player1.hasChanged).toBe(true);
    });

    it('should get player notes', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
        existingAssessments: mockExistingAssessments,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      expect(result.current.getPlayerNotes('player1')).toBe('Excellent performance');
      expect(result.current.getPlayerNotes('player2')).toBe('');
    });
  });

  describe('Expand/Collapse Management', () => {
    it('should handle toggle expanded', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      expect(result.current.isPlayerExpanded('player1')).toBe(false);

      act(() => {
        result.current.handleToggleExpanded('player1');
      });

      expect(result.current.isPlayerExpanded('player1')).toBe(true);

      act(() => {
        result.current.handleToggleExpanded('player1');
      });

      expect(result.current.isPlayerExpanded('player1')).toBe(false);
    });

    it('should handle expand all', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1', 'player2'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      act(() => {
        result.current.handleExpandAll();
      });

      expect(result.current.isPlayerExpanded('player1')).toBe(true);
      expect(result.current.isPlayerExpanded('player2')).toBe(true);
    });

    it('should handle collapse all', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1', 'player2'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      // First expand all
      act(() => {
        result.current.handleExpandAll();
      });

      expect(result.current.isPlayerExpanded('player1')).toBe(true);

      // Then collapse all
      act(() => {
        result.current.handleCollapseAll();
      });

      expect(result.current.isPlayerExpanded('player1')).toBe(false);
      expect(result.current.isPlayerExpanded('player2')).toBe(false);
    });
  });

  describe('Auto-save Functionality', () => {
    it('should trigger auto-save after delay', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
        onSave,
        autoSaveDelay: 500,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      act(() => {
        result.current.handleOverallRatingChange('player1', 8);
      });

      expect(onSave).not.toHaveBeenCalled();

      // Fast-forward timers
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith('player1', {
          overall: 8,
          sliders: expect.any(Object),
          notes: '',
        });
      });

      expect(result.current.isPlayerSaved('player1')).toBe(true);
    });

    it('should cancel previous auto-save when new changes occur', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
        onSave,
        autoSaveDelay: 500,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      act(() => {
        result.current.handleOverallRatingChange('player1', 8);
      });

      // Make another change before auto-save triggers
      act(() => {
        jest.advanceTimersByTime(300);
        result.current.handleOverallRatingChange('player1', 9);
      });

      // Fast-forward to when the second auto-save should trigger
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave).toHaveBeenCalledWith('player1', expect.objectContaining({
          overall: 9,
        }));
      });
    });
  });

  describe('Assessment Operations', () => {
    it('should handle manual save assessment', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
        onSave,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      act(() => {
        result.current.handleOverallRatingChange('player1', 8);
      });

      await act(async () => {
        await result.current.handleSaveAssessment('player1');
      });

      expect(onSave).toHaveBeenCalledWith('player1', {
        overall: 8,
        sliders: expect.any(Object),
        notes: '',
      });

      expect(result.current.isPlayerSaved('player1')).toBe(true);
      expect(result.current.isPlayerExpanded('player1')).toBe(false);
    });

    it('should handle delete assessment', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
        existingAssessments: mockExistingAssessments,
        onDelete,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      expect(result.current.isPlayerSaved('player1')).toBe(true);

      await act(async () => {
        await result.current.handleDeleteAssessment('player1');
      });

      expect(onDelete).toHaveBeenCalledWith('player1');
      expect(result.current.isPlayerSaved('player1')).toBe(false);
      expect(result.current.getPlayerOverallRating('player1')).toBe(5);
    });

    it('should handle reset assessment', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
        existingAssessments: mockExistingAssessments,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      expect(result.current.getPlayerOverallRating('player1')).toBe(7);

      act(() => {
        result.current.handleResetAssessment('player1');
      });

      expect(result.current.getPlayerOverallRating('player1')).toBe(5);
      expect(result.current.getPlayerNotes('player1')).toBe('');
      expect(result.current.values.assessments.player1.hasChanged).toBe(true);
    });
  });

  describe('Progress Management', () => {
    it('should calculate progress correctly', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1', 'player2', 'player3'],
        availablePlayers: mockPlayers,
        existingAssessments: mockExistingAssessments,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      const progress = result.current.getProgress();
      expect(progress.completed).toBe(1);
      expect(progress.total).toBe(3);
      expect(progress.percentage).toBe(33);
    });

    it('should check if player is saved', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1', 'player2'],
        availablePlayers: mockPlayers,
        existingAssessments: mockExistingAssessments,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      expect(result.current.isPlayerSaved('player1')).toBe(true);
      expect(result.current.isPlayerSaved('player2')).toBe(false);
    });

    it('should check if player assessment is valid', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      expect(result.current.isPlayerValid('player1')).toBe(true);

      // Make an invalid change (notes too long)
      act(() => {
        result.current.handleNotesChange('player1', 'a'.repeat(300));
      });

      expect(result.current.isPlayerValid('player1')).toBe(false);
    });
  });

  describe('Bulk Operations', () => {
    it('should save all valid assessments', async () => {
      const onSave = jest.fn().mockResolvedValue(undefined);
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1', 'player2'],
        availablePlayers: mockPlayers,
        onSave,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      // Make changes to both players
      act(() => {
        result.current.handleOverallRatingChange('player1', 8);
        result.current.handleOverallRatingChange('player2', 7);
      });

      await act(async () => {
        await result.current.handleSaveAll();
      });

      expect(onSave).toHaveBeenCalledTimes(2);
      expect(onSave).toHaveBeenCalledWith('player1', expect.objectContaining({ overall: 8 }));
      expect(onSave).toHaveBeenCalledWith('player2', expect.objectContaining({ overall: 7 }));

      expect(result.current.isPlayerSaved('player1')).toBe(true);
      expect(result.current.isPlayerSaved('player2')).toBe(true);
    });
  });

  describe('Assessment Data Access', () => {
    it('should get player assessment data', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
        existingAssessments: mockExistingAssessments,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      const assessment = result.current.getPlayerAssessment('player1');
      expect(assessment.overall).toBe(7);
      expect(assessment.sliders?.intensity).toBe(8);
      expect(assessment.notes).toBe('Excellent performance');
    });

    it('should get all assessments', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1', 'player2'],
        availablePlayers: mockPlayers,
        existingAssessments: mockExistingAssessments,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      const allAssessments = result.current.getAllAssessments();
      expect(Object.keys(allAssessments)).toHaveLength(2);
      expect(allAssessments.player1.overall).toBe(7);
      expect(allAssessments.player2.overall).toBe(5);
    });
  });

  describe('Form State Management', () => {
    it('should detect form changes', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      expect(result.current.hasFormChanged()).toBe(false);

      act(() => {
        result.current.handleOverallRatingChange('player1', 8);
      });

      expect(result.current.hasFormChanged()).toBe(true);
    });

    it('should get form data', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      act(() => {
        result.current.handleOverallRatingChange('player1', 8);
      });

      const formData = result.current.getFormData();
      expect(formData.assessments.player1.overall).toBe(8);
      expect(formData.totalCount).toBe(1);
    });

    it('should reset form to initial values', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      act(() => {
        result.current.handleOverallRatingChange('player1', 8);
        result.current.handleNotesChange('player1', 'test notes');
      });

      expect(result.current.getPlayerOverallRating('player1')).toBe(8);

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.getPlayerOverallRating('player1')).toBe(5);
      expect(result.current.getPlayerNotes('player1')).toBe('');
    });
  });

  describe('Legacy Mode', () => {
    it('should use legacy implementation when migration safety is enabled', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      const { result } = renderHook(() => usePlayerAssessmentForm());

      expect(result.current.migrationStatus).toBe('legacy');
      expect(result.current.values).toEqual({});
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Field Helpers', () => {
    it('should provide field helpers with correct state', () => {
      const options: PlayerAssessmentFormOptions = {
        persistForm: false,
        selectedPlayerIds: ['player1'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => usePlayerAssessmentForm(options));

      act(() => {
        result.current.setFieldValue('totalCount', 5);
        result.current.setFieldError('totalCount', 'Some error');
      });

      const totalCountField = result.current.getField('totalCount');

      expect(totalCountField.value).toBe(5);
      expect(totalCountField.error).toBe('Some error');
      expect(typeof totalCountField.onChange).toBe('function');
      expect(typeof totalCountField.onBlur).toBe('function');
    });
  });
});

describe('Utility Functions', () => {
  describe('convertAssessmentsToFormValues', () => {
    it('should convert assessments to form values', () => {
      const selectedPlayerIds = ['player1', 'player2'];
      const assessments = mockExistingAssessments;

      const formValues = convertAssessmentsToFormValues(selectedPlayerIds, assessments);

      expect(formValues.assessments?.player1.overall).toBe(7);
      expect(formValues.assessments?.player1.sliders.intensity).toBe(8);
      expect(formValues.assessments?.player1.notes).toBe('Excellent performance');
      expect(formValues.assessments?.player2.overall).toBe(5);
      expect(formValues.savedIds).toEqual(['player1']);
      expect(formValues.completedCount).toBe(1);
      expect(formValues.totalCount).toBe(2);
    });

    it('should handle empty assessments', () => {
      const selectedPlayerIds = ['player1', 'player2'];
      const assessments = {};

      const formValues = convertAssessmentsToFormValues(selectedPlayerIds, assessments);

      expect(formValues.assessments?.player1.overall).toBe(5);
      expect(formValues.assessments?.player2.overall).toBe(5);
      expect(formValues.savedIds).toEqual([]);
      expect(formValues.completedCount).toBe(0);
    });
  });

  describe('validatePlayerAssessment', () => {
    it('should validate complete assessment', () => {
      const validAssessment = {
        overall: 7,
        sliders: {
          intensity: 8,
          courage: 7,
          duels: 6,
          technique: 7,
          creativity: 8,
          decisions: 7,
          awareness: 8,
          teamwork: 9,
          fair_play: 8,
          impact: 7,
        },
        notes: 'Great performance',
      };

      expect(validatePlayerAssessment(validAssessment)).toBe(true);
    });

    it('should reject assessment with invalid overall rating', () => {
      const invalidAssessment = {
        overall: 11, // Invalid - over 10
        sliders: {
          intensity: 8,
          courage: 7,
          duels: 6,
          technique: 7,
          creativity: 8,
          decisions: 7,
          awareness: 8,
          teamwork: 9,
          fair_play: 8,
          impact: 7,
        },
        notes: 'Great performance',
      };

      expect(validatePlayerAssessment(invalidAssessment)).toBe(false);
    });

    it('should reject assessment with invalid slider values', () => {
      const invalidAssessment = {
        overall: 7,
        sliders: {
          intensity: 0, // Invalid - under 1
          courage: 7,
          duels: 6,
          technique: 7,
          creativity: 8,
          decisions: 7,
          awareness: 8,
          teamwork: 9,
          fair_play: 8,
          impact: 7,
        },
        notes: 'Great performance',
      };

      expect(validatePlayerAssessment(invalidAssessment)).toBe(false);
    });

    it('should reject assessment with notes too long', () => {
      const invalidAssessment = {
        overall: 7,
        sliders: {
          intensity: 8,
          courage: 7,
          duels: 6,
          technique: 7,
          creativity: 8,
          decisions: 7,
          awareness: 8,
          teamwork: 9,
          fair_play: 8,
          impact: 7,
        },
        notes: 'a'.repeat(300), // Invalid - over 280 characters
      };

      expect(validatePlayerAssessment(invalidAssessment)).toBe(false);
    });

    it('should accept assessment with empty notes', () => {
      const validAssessment = {
        overall: 7,
        sliders: {
          intensity: 8,
          courage: 7,
          duels: 6,
          technique: 7,
          creativity: 8,
          decisions: 7,
          awareness: 8,
          teamwork: 9,
          fair_play: 8,
          impact: 7,
        },
        notes: '',
      };

      expect(validatePlayerAssessment(validAssessment)).toBe(true);
    });
  });

  describe('calculateCompletionPercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(calculateCompletionPercentage(0, 10)).toBe(0);
      expect(calculateCompletionPercentage(5, 10)).toBe(50);
      expect(calculateCompletionPercentage(10, 10)).toBe(100);
      expect(calculateCompletionPercentage(3, 7)).toBe(43);
    });

    it('should handle zero total', () => {
      expect(calculateCompletionPercentage(0, 0)).toBe(0);
      expect(calculateCompletionPercentage(5, 0)).toBe(0);
    });

    it('should round to nearest integer', () => {
      expect(calculateCompletionPercentage(1, 3)).toBe(33);
      expect(calculateCompletionPercentage(2, 3)).toBe(67);
    });
  });
});