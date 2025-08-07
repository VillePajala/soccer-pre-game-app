import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useNewGameSetupForm } from '../useNewGameSetupForm';

// Mock dependencies
jest.mock('@/utils/logger');

describe('useNewGameSetupForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Form Operations', () => {
    it('should initialize without throwing', () => {
      expect(() => {
        renderHook(() => useNewGameSetupForm());
      }).not.toThrow();
    });

    it('should return form interface', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      expect(result.current).toBeDefined();
      expect(typeof result.current.handleTeamNameChange).toBe('function');
      expect(typeof result.current.handleOpponentNameChange).toBe('function');
      expect(typeof result.current.handleGameDateChange).toBe('function');
      expect(typeof result.current.handleGameLocationChange).toBe('function');
    });

    it('should execute handler functions without throwing', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      expect(() => {
        act(() => {
          result.current.handleTeamNameChange('Test Team');
          result.current.handleOpponentNameChange('Opponent Team');
          result.current.handleGameDateChange('2025-12-25');
          result.current.handleGameLocationChange('Test Stadium');
        });
      }).not.toThrow();
    });
  });

  describe('Game Configuration', () => {
    it('should handle game configuration changes without throwing', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      expect(() => {
        act(() => {
          result.current.handleAgeGroupChange('U12');
          result.current.handleTournamentLevelChange('Elite');
          result.current.handleHomeOrAwayChange('home');
          result.current.handleNumPeriodsChange(2);
          result.current.handlePeriodDurationChange(20);
          result.current.handleDemandFactorChange(1.5);
          result.current.handleIsPlayedChange(true);
        });
      }).not.toThrow();
    });
  });

  describe('Time Handling', () => {
    it('should handle time component changes without throwing', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      expect(() => {
        act(() => {
          result.current.handleGameTimeChange('15:30');
          result.current.handleGameHourChange('14');
          result.current.handleGameMinuteChange('45');
        });
      }).not.toThrow();
    });

    it('should provide time utility functions', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      expect(typeof result.current.getGameTime).toBe('function');
      expect(() => {
        result.current.getGameTime();
      }).not.toThrow();
    });
  });

  describe('Player Management', () => {
    it('should handle player selection changes without throwing', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      expect(() => {
        act(() => {
          result.current.handleSelectedPlayersChange(['player1', 'player2']);
        });
      }).not.toThrow();
    });
  });

  describe('Season/Tournament Management', () => {
    it('should handle season and tournament changes without throwing', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      expect(() => {
        act(() => {
          result.current.handleSeasonChange('season1');
          result.current.handleTournamentChange('tournament1');
        });
      }).not.toThrow();
    });
  });

  describe('Dynamic Creation', () => {
    it('should handle options without throwing', () => {
      const onSeasonCreate = jest.fn().mockResolvedValue('new-season-id');
      const onTournamentCreate = jest.fn().mockResolvedValue('new-tournament-id');
      
      expect(() => {
        renderHook(() => useNewGameSetupForm({
          onSeasonCreate,
          onTournamentCreate,
        }));
      }).not.toThrow();
    });
  });

  describe('Form State Management', () => {
    it('should provide form state management functions', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      expect(typeof result.current.hasFormChanged).toBe('function');
      expect(typeof result.current.getFormData).toBe('function');
      expect(typeof result.current.resetForm).toBe('function');
      expect(typeof result.current.clearForm).toBe('function');

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
    });
  });

  describe('Form Validation', () => {
    it('should provide validation functions', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      expect(typeof result.current.validateForm).toBe('function');
      
      expect(() => {
        act(() => {
          result.current.validateForm();
        });
      }).not.toThrow();
    });
  });
});