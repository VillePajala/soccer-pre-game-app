/**
 * GameStore Coverage Tests
 * 
 * Additional tests to cover uncovered lines and methods in gameStore.ts
 * Focus on achieving 90%+ coverage for critical store functionality.
 */

import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '../gameStore';
import type { Player, GameEvent } from '@/types';

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('GameStore Coverage Tests', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useGameStore.getState().resetGameSession();
      useGameStore.getState().resetField();
    });
  });

  describe('Basic Store Methods', () => {
    it('should maintain consistent state throughout operations', () => {
      const { result } = renderHook(() => useGameStore());

      // Test basic operations that we know exist from the working test
      act(() => {
        result.current.setTeamName('Arsenal FC');
        result.current.setOpponentName('Chelsea FC');
      });

      expect(result.current.gameSession.teamName).toBe('Arsenal FC');
      expect(result.current.gameSession.opponentName).toBe('Chelsea FC');
    });

    it('should handle game state progression', () => {
      const { result } = renderHook(() => useGameStore());

      // Test timer controls
      act(() => {
        result.current.startTimer();
      });

      expect(result.current.gameSession.isTimerRunning).toBe(true);

      act(() => {
        result.current.pauseTimer();
      });

      expect(result.current.gameSession.isTimerRunning).toBe(false);

      act(() => {
        result.current.stopTimer();
      });

      expect(result.current.gameSession.isTimerRunning).toBe(false);
      expect(result.current.gameSession.gameStatus).toBe('finished');
    });

    it('should handle score management', () => {
      const { result } = renderHook(() => useGameStore());

      act(() => {
        result.current.incrementHomeScore();
        result.current.incrementAwayScore();
      });

      expect(result.current.gameSession.homeScore).toBe(1);
      expect(result.current.gameSession.awayScore).toBe(1);

      act(() => {
        result.current.incrementHomeScore();
      });

      expect(result.current.gameSession.homeScore).toBe(2);
    });
  });

  describe('Additional Coverage Tests', () => {
    it('should handle various game states and maintain consistency', () => {
      const { result } = renderHook(() => useGameStore());

      // Test multiple state changes
      act(() => {
        result.current.setTeamName('Test Team A');
        result.current.setOpponentName('Test Team B');
        result.current.startTimer();
      });

      expect(result.current.gameSession.teamName).toBe('Test Team A');
      expect(result.current.gameSession.opponentName).toBe('Test Team B');
      expect(result.current.gameSession.isTimerRunning).toBe(true);

      // Change team names during game
      act(() => {
        result.current.setTeamName('Modified Team A');
        result.current.setOpponentName('Modified Team B');
      });

      expect(result.current.gameSession.teamName).toBe('Modified Team A');
      expect(result.current.gameSession.opponentName).toBe('Modified Team B');
      expect(result.current.gameSession.isTimerRunning).toBe(true); // Should still be running
    });

    it('should handle multiple score changes', () => {
      const { result } = renderHook(() => useGameStore());

      // Multiple score increments
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.incrementHomeScore();
        }
        for (let i = 0; i < 3; i++) {
          result.current.incrementAwayScore();
        }
      });

      expect(result.current.gameSession.homeScore).toBe(5);
      expect(result.current.gameSession.awayScore).toBe(3);
    });

    it('should handle timer state transitions', () => {
      const { result } = renderHook(() => useGameStore());

      // Initial state
      expect(result.current.gameSession.isTimerRunning).toBe(false);
      expect(result.current.gameSession.gameStatus).toBe('notStarted');

      // Start timer
      act(() => {
        result.current.startTimer();
      });

      expect(result.current.gameSession.isTimerRunning).toBe(true);
      expect(result.current.gameSession.gameStatus).toBe('inProgress');

      // Pause timer
      act(() => {
        result.current.pauseTimer();
      });

      expect(result.current.gameSession.isTimerRunning).toBe(false);
      expect(result.current.gameSession.gameStatus).toBe('paused');

      // Resume timer
      act(() => {
        result.current.resumeTimer();
      });

      expect(result.current.gameSession.isTimerRunning).toBe(true);
      expect(result.current.gameSession.gameStatus).toBe('inProgress');

      // Stop timer
      act(() => {
        result.current.stopTimer();
      });

      expect(result.current.gameSession.isTimerRunning).toBe(false);
      expect(result.current.gameSession.gameStatus).toBe('finished');
    });

    it('should handle reset operations', () => {
      const { result } = renderHook(() => useGameStore());

      // Set up some state
      act(() => {
        result.current.setTeamName('Team to Reset');
        result.current.incrementHomeScore();
        result.current.startTimer();
      });

      expect(result.current.gameSession.teamName).toBe('Team to Reset');
      expect(result.current.gameSession.homeScore).toBe(1);
      expect(result.current.gameSession.isTimerRunning).toBe(true);

      // Reset
      act(() => {
        result.current.resetGameSession();
      });

      expect(result.current.gameSession.teamName).toBe('');
      expect(result.current.gameSession.homeScore).toBe(0);
      expect(result.current.gameSession.isTimerRunning).toBe(false);
    });

    it('should handle field reset operations', () => {
      const { result } = renderHook(() => useGameStore());

      // This test ensures we can access field properties
      expect(result.current.field).toBeDefined();
      expect(result.current.field.playersOnField).toBeDefined();
      expect(result.current.field.opponents).toBeDefined();
      expect(result.current.field.drawings).toBeDefined();
      expect(result.current.field.ballPosition).toBeDefined();

      // Reset field
      act(() => {
        result.current.resetField();
      });

      expect(result.current.field.playersOnField).toHaveLength(0);
      expect(result.current.field.opponents).toHaveLength(0);
      expect(result.current.field.drawings).toHaveLength(0);
    });
  });
});