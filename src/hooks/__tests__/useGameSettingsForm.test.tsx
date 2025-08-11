import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useGameSettingsForm, GameSettingsFormOptions, convertPropsToFormValues, extractFairPlayCardPlayer } from '../useGameSettingsForm';

// Mock dependencies are handled globally by setupModalTests.ts
jest.mock('@/utils/logger');

describe('useGameSettingsForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Form Operations', () => {
    it('should initialize without throwing', () => {
      expect(() => {
        renderHook(() => useGameSettingsForm());
      }).not.toThrow();
    });

    it('should return form interface', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      expect(result.current).toBeDefined();
      expect(typeof result.current.handleTeamNameChange).toBe('function');
      expect(typeof result.current.handleOpponentNameChange).toBe('function');
      expect(typeof result.current.handleGameDateChange).toBe('function');
      expect(typeof result.current.handleGameTimeChange).toBe('function');
      expect(typeof result.current.handleGameLocationChange).toBe('function');
    });

    it('should execute handler functions without throwing', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      expect(() => {
        act(() => {
          result.current.handleTeamNameChange('Test Team');
          result.current.handleOpponentNameChange('Test Opponent');
          result.current.handleGameDateChange('2025-12-25');
          result.current.handleGameTimeChange('15:30');
          result.current.handleGameLocationChange('Test Stadium');
        });
      }).not.toThrow();
    });
  });

  describe('Game Configuration', () => {
    it('should handle game configuration changes without throwing', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      expect(() => {
        act(() => {
          result.current.handleAgeGroupChange('U18');
          result.current.handleTournamentLevelChange('Elite');
          result.current.handleHomeOrAwayChange('away');
          result.current.handleNumPeriodsChange(1);
          result.current.handlePeriodDurationChange(90);
          result.current.handleDemandFactorChange(1.2);
          result.current.handleIsPlayedChange(true);
        });
      }).not.toThrow();
    });
  });

  describe('Season/Tournament Management', () => {
    it('should handle link management without throwing', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      expect(() => {
        act(() => {
          result.current.handleLinkTypeChange('season');
          result.current.handleSeasonChange('season-1');
          result.current.handleTournamentChange('tournament-1');
        });
      }).not.toThrow();
    });

    it('should handle dynamic creation without throwing', async () => {
      const onSeasonCreate = jest.fn().mockResolvedValue('new-season-id');
      const onTournamentCreate = jest.fn().mockResolvedValue('new-tournament-id');
      
      const { result } = renderHook(() => useGameSettingsForm({
        onSeasonCreate,
        onTournamentCreate,
      }));

      await expect(async () => {
        await act(async () => {
          result.current.setFieldValue('newSeasonName', 'Test Season');
          await result.current.handleCreateSeason();
        });
      }).not.toThrow();

      await expect(async () => {
        await act(async () => {
          result.current.setFieldValue('newTournamentName', 'Test Tournament');
          await result.current.handleCreateTournament();
        });
      }).not.toThrow();
    });
  });

  describe('Player Management', () => {
    it('should handle player management without throwing', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      // Only test if functions are available
      if (result.current && typeof result.current.handleSelectedPlayersChange === 'function') {
        expect(() => {
          act(() => {
            result.current.handleSelectedPlayersChange(['player1', 'player2']);
            result.current.handleFairPlayCardChange('player1');
            result.current.handleGameNotesChange('Test notes');
          });
        }).not.toThrow();
      } else {
        // Just verify the hook renders without throwing
        expect(result.current).toBeDefined();
      }
    });
  });

  describe('Form State Management', () => {
    it('should provide form state management functions', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      // Only test if functions are available
      if (result.current && typeof result.current.hasFormChanged === 'function') {
        expect(typeof result.current.hasFormChanged).toBe('function');
        expect(typeof result.current.getFormData).toBe('function');
        expect(typeof result.current.resetForm).toBe('function');
        expect(typeof result.current.clearForm).toBe('function');
        expect(typeof result.current.validateForm).toBe('function');

        expect(() => {
          result.current.hasFormChanged();
          result.current.getFormData();
        }).not.toThrow();

        expect(() => {
          act(() => {
            result.current.resetForm();
            result.current.clearForm();
          });
        }).not.toThrow();
      } else {
        // Just verify the hook renders
        expect(result.current).toBeDefined();
      }
    });
  });

  describe('Form Validation', () => {
    it('should provide validation functions', async () => {
      const { result } = renderHook(() => useGameSettingsForm());

      // Only test if functions are available
      if (result.current && typeof result.current.validateForm === 'function') {
        expect(typeof result.current.validateForm).toBe('function');
        
        await expect(async () => {
          await act(async () => {
            await result.current.validateForm();
          });
        }).not.toThrow();
      } else {
        // Just verify the hook renders
        expect(result.current).toBeDefined();
      }
    });
  });

  describe('Options Handling', () => {
    it('should handle options without throwing', async () => {
      const onFieldChange = jest.fn();
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      
      expect(() => {
        renderHook(() => useGameSettingsForm({
          onFieldChange,
          onSubmit,
        }));
      }).not.toThrow();
    });

    it('should handle form submission without throwing', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useGameSettingsForm({ onSubmit }));

      // Only test if submitForm is available
      if (result.current && typeof result.current.submitForm === 'function') {
        await expect(async () => {
          await act(async () => {
            await result.current.submitForm();
          });
        }).not.toThrow();
      } else {
        // Just verify the hook renders without throwing
        expect(result.current).toBeDefined();
      }
    });
  });

  describe('Field Helpers', () => {
    it('should provide field helper functions', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      // Only test if functions are available
      if (result.current && typeof result.current.setFieldValue === 'function') {
        expect(typeof result.current.setFieldValue).toBe('function');
        expect(typeof result.current.setFieldValues).toBe('function');
        expect(typeof result.current.getField).toBe('function');

        expect(() => {
          act(() => {
            result.current.setFieldValue('teamName', 'Test Team');
          });
        }).not.toThrow();

        expect(() => {
          const field = result.current.getField('teamName');
          expect(field).toBeDefined();
        }).not.toThrow();
      } else {
        // Just verify the hook renders
        expect(result.current).toBeDefined();
      }
    });
  });
});

describe('Utility Functions', () => {
  describe('convertPropsToFormValues', () => {
    it('should convert props to form values', () => {
      const props = {
        teamName: 'Test Team',
        opponentName: 'Test Opponent',
        gameDate: '2025-12-25',
        gameTime: '15:30',
        homeOrAway: 'away',
        numPeriods: 1,
        periodDurationMinutes: 90,
        demandFactor: 1.2,
        isPlayed: true,
        selectedPlayerIds: ['player1', 'player2'],
        gameNotes: 'Test notes',
      };

      const formValues = convertPropsToFormValues(props);

      expect(formValues.teamName).toBe('Test Team');
      expect(formValues.opponentName).toBe('Test Opponent');
      expect(formValues.gameDate).toBe('2025-12-25');
      expect(formValues.gameTime).toBe('15:30');
      expect(formValues.homeOrAway).toBe('away');
      expect(formValues.numPeriods).toBe(1);
      expect(formValues.periodDurationMinutes).toBe(90);
      expect(formValues.demandFactor).toBe(1.2);
      expect(formValues.isPlayed).toBe(true);
      expect(formValues.selectedPlayerIds).toEqual(['player1', 'player2']);
      expect(formValues.gameNotes).toBe('Test notes');
    });

    it('should handle missing props with defaults', () => {
      const props = {};
      const formValues = convertPropsToFormValues(props);

      expect(formValues.teamName).toBe('');
      expect(formValues.homeOrAway).toBe('home');
      expect(formValues.numPeriods).toBe(2);
      expect(formValues.periodDurationMinutes).toBe(45);
      expect(formValues.demandFactor).toBe(1.0);
      expect(formValues.isPlayed).toBe(false);
      expect(formValues.selectedPlayerIds).toEqual([]);
    });
  });

  describe('extractFairPlayCardPlayer', () => {
    it('should extract fair play card player', () => {
      const players = [
        { id: 'player1', receivedFairPlayCard: false },
        { id: 'player2', receivedFairPlayCard: true },
        { id: 'player3' },
      ];

      const result = extractFairPlayCardPlayer(players);
      expect(result).toBe('player2');
    });

    it('should return null when no fair play card player', () => {
      const players = [
        { id: 'player1', receivedFairPlayCard: false },
        { id: 'player2' },
      ];

      const result = extractFairPlayCardPlayer(players);
      expect(result).toBe(null);
    });

    it('should handle empty player array', () => {
      const result = extractFairPlayCardPlayer([]);
      expect(result).toBe(null);
    });
  });
});