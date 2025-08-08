/**
 * GameStore Integration Tests
 * 
 * Comprehensive tests for the centralized game state management store
 * to ensure reliability before migrating components.
 */

import { renderHook, act } from '@testing-library/react';
import { useGameStore, useGameSession, useGameTimer, useGameScore, usePlayersOnField } from '../gameStore';
import type { Player, GameEvent, Point } from '@/types';

// Mock logger to avoid console output during tests
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('GameStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useGameStore.getState().resetGameSession();
      useGameStore.getState().resetField();
    });
  });

  describe('Game Session Management', () => {
    it('should initialize with default game session state', () => {
      const { result } = renderHook(() => useGameSession());
      
      expect(result.current.gameId).toBeNull();
      expect(result.current.teamName).toBe('');
      expect(result.current.opponentName).toBe('');
      expect(result.current.timeElapsedInSeconds).toBe(0);
      expect(result.current.isTimerRunning).toBe(false);
      expect(result.current.currentPeriod).toBe(1);
      expect(result.current.homeScore).toBe(0);
      expect(result.current.awayScore).toBe(0);
      expect(result.current.gameStatus).toBe('notStarted');
    });

    it('should update team information correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setTeamName('Arsenal FC');
        result.current.setOpponentName('Chelsea FC');
        result.current.setGameLocation('Emirates Stadium');
      });
      
      const gameSession = result.current.gameSession;
      expect(gameSession.teamName).toBe('Arsenal FC');
      expect(gameSession.opponentName).toBe('Chelsea FC');
      expect(gameSession.gameLocation).toBe('Emirates Stadium');
    });

    it('should handle game timing correctly', () => {
      const { result } = renderHook(() => useGameTimer());
      
      act(() => {
        result.current.setTimeElapsed(1800); // 30 minutes
        result.current.setTimerRunning(true);
        result.current.setCurrentPeriod(2);
      });
      
      expect(result.current.timeElapsed).toBe(1800);
      expect(result.current.isRunning).toBe(true);
      expect(result.current.currentPeriod).toBe(2);
    });

    it('should reset timer correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      // Set some timer state
      act(() => {
        result.current.setTimeElapsed(2700);
        result.current.setTimerRunning(true);
        result.current.setCurrentPeriod(2);
      });
      
      // Reset timer
      act(() => {
        result.current.resetTimer();
      });
      
      const gameSession = result.current.gameSession;
      expect(gameSession.timeElapsedInSeconds).toBe(0);
      expect(gameSession.isTimerRunning).toBe(false);
      expect(gameSession.currentPeriod).toBe(1);
      expect(gameSession.completedIntervalDurations).toEqual([]);
    });
  });

  describe('Scoring Management', () => {
    it('should handle score updates correctly', () => {
      const { result } = renderHook(() => useGameScore());
      
      act(() => {
        result.current.setHomeScore(2);
        result.current.setAwayScore(1);
      });
      
      expect(result.current.homeScore).toBe(2);
      expect(result.current.awayScore).toBe(1);
    });

    it('should increment scores correctly', () => {
      const { result } = renderHook(() => useGameScore());
      
      act(() => {
        result.current.incrementHomeScore();
        result.current.incrementHomeScore();
        result.current.incrementAwayScore();
      });
      
      expect(result.current.homeScore).toBe(2);
      expect(result.current.awayScore).toBe(1);
    });

    it('should handle home/away designation', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.setHomeOrAway('away');
      });
      
      expect(result.current.gameSession.homeOrAway).toBe('away');
    });
  });

  describe('Game Events Management', () => {
    const mockGameEvent: GameEvent = {
      id: 'event-1',
      type: 'goal',
      playerId: 'player-1',
      playerName: 'John Doe',
      timestamp: 1800,
      period: 1,
      description: 'Goal scored',
      metadata: {},
    };

    it('should add game events correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        result.current.addGameEvent(mockGameEvent);
      });
      
      expect(result.current.gameSession.gameEvents).toHaveLength(1);
      expect(result.current.gameSession.gameEvents[0]).toEqual(mockGameEvent);
    });

    it('should update game events correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      // Add initial event
      act(() => {
        result.current.addGameEvent(mockGameEvent);
      });
      
      // Update the event
      act(() => {
        result.current.updateGameEvent('event-1', { 
          description: 'Updated goal description',
          timestamp: 1850 
        });
      });
      
      const updatedEvent = result.current.gameSession.gameEvents[0];
      expect(updatedEvent.description).toBe('Updated goal description');
      expect(updatedEvent.timestamp).toBe(1850);
      expect(updatedEvent.id).toBe('event-1'); // Should preserve other fields
    });

    it('should remove game events correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      // Add multiple events
      act(() => {
        result.current.addGameEvent(mockGameEvent);
        result.current.addGameEvent({ ...mockGameEvent, id: 'event-2' });
      });
      
      expect(result.current.gameSession.gameEvents).toHaveLength(2);
      
      // Remove one event
      act(() => {
        result.current.removeGameEvent('event-1');
      });
      
      expect(result.current.gameSession.gameEvents).toHaveLength(1);
      expect(result.current.gameSession.gameEvents[0].id).toBe('event-2');
    });
  });

  describe('Player Management', () => {
    const mockPlayer: Player = {
      id: 'player-1',
      name: 'John Doe',
      number: 10,
      position: { x: 100, y: 200 },
      isActive: true,
      stats: {},
    };

    it('should manage players on field correctly', () => {
      const { result } = renderHook(() => usePlayersOnField());
      
      act(() => {
        result.current.addPlayer(mockPlayer, { x: 150, y: 250 });
      });
      
      expect(result.current.players).toHaveLength(1);
      expect(result.current.players[0].position).toEqual({ x: 150, y: 250 });
    });

    it('should move players correctly', () => {
      const { result } = renderHook(() => usePlayersOnField());
      
      // Add player
      act(() => {
        result.current.addPlayer(mockPlayer, { x: 100, y: 200 });
      });
      
      // Move player
      act(() => {
        result.current.movePlayer('player-1', { x: 300, y: 400 });
      });
      
      expect(result.current.players[0].position).toEqual({ x: 300, y: 400 });
    });

    it('should remove players correctly', () => {
      const { result } = renderHook(() => usePlayersOnField());
      
      // Add player
      act(() => {
        result.current.addPlayer(mockPlayer, { x: 100, y: 200 });
      });
      
      expect(result.current.players).toHaveLength(1);
      
      // Remove player
      act(() => {
        result.current.removePlayer('player-1');
      });
      
      expect(result.current.players).toHaveLength(0);
    });
  });

  describe('Field State Management', () => {
    it('should handle drawings correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      const drawing: Point[] = [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 300 },
      ];
      
      act(() => {
        result.current.addDrawing(drawing);
      });
      
      expect(result.current.field.drawings).toHaveLength(1);
      expect(result.current.field.drawings[0]).toEqual(drawing);
    });

    it('should clear drawings correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      const drawing: Point[] = [{ x: 100, y: 100 }];
      
      act(() => {
        result.current.addDrawing(drawing);
        result.current.addDrawing(drawing);
      });
      
      expect(result.current.field.drawings).toHaveLength(2);
      
      act(() => {
        result.current.clearDrawings();
      });
      
      expect(result.current.field.drawings).toHaveLength(0);
    });

    it('should handle tactical elements correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      const tacticalDisc = {
        id: 'disc-1',
        position: { x: 200, y: 200 },
        color: '#FF0000',
        size: 20,
      };
      
      act(() => {
        result.current.addTacticalDisc(tacticalDisc);
      });
      
      expect(result.current.field.tacticalDiscs).toHaveLength(1);
      expect(result.current.field.tacticalDiscs[0]).toEqual(tacticalDisc);
    });
  });

  describe('Store Persistence', () => {
    it('should maintain state consistency across hook calls', () => {
      const { result: gameStoreResult } = renderHook(() => useGameStore());
      const { result: gameSessionResult } = renderHook(() => useGameSession());
      
      act(() => {
        gameStoreResult.current.setTeamName('Test Team');
      });
      
      expect(gameSessionResult.current.teamName).toBe('Test Team');
    });

    it('should handle complex state updates correctly', () => {
      const { result } = renderHook(() => useGameStore());
      
      act(() => {
        // Set up a complex game state
        result.current.setTeamName('Arsenal');
        result.current.setOpponentName('Chelsea');
        result.current.setTimeElapsed(2700);
        result.current.setCurrentPeriod(2);
        result.current.setHomeScore(2);
        result.current.setAwayScore(1);
        result.current.setGameStatus('inProgress');
      });
      
      const gameSession = result.current.gameSession;
      expect(gameSession.teamName).toBe('Arsenal');
      expect(gameSession.opponentName).toBe('Chelsea');
      expect(gameSession.timeElapsedInSeconds).toBe(2700);
      expect(gameSession.currentPeriod).toBe(2);
      expect(gameSession.homeScore).toBe(2);
      expect(gameSession.awayScore).toBe(1);
      expect(gameSession.gameStatus).toBe('inProgress');
    });
  });

  describe('Store Reset Functionality', () => {
    it('should reset game session to defaults', () => {
      const { result } = renderHook(() => useGameStore());
      
      // Set some non-default values
      act(() => {
        result.current.setTeamName('Test Team');
        result.current.setTimeElapsed(1800);
        result.current.setHomeScore(3);
      });
      
      // Reset
      act(() => {
        result.current.resetGameSession();
      });
      
      const gameSession = result.current.gameSession;
      expect(gameSession.teamName).toBe('');
      expect(gameSession.timeElapsedInSeconds).toBe(0);
      expect(gameSession.homeScore).toBe(0);
    });

    it('should reset field state to defaults', () => {
      const { result } = renderHook(() => useGameStore());
      
      // Add some field data
      act(() => {
        result.current.setPlayersOnField([mockPlayer]);
        result.current.addDrawing([{ x: 100, y: 100 }]);
      });
      
      expect(result.current.field.playersOnField).toHaveLength(1);
      expect(result.current.field.drawings).toHaveLength(1);
      
      // Reset field
      act(() => {
        result.current.resetField();
      });
      
      expect(result.current.field.playersOnField).toHaveLength(0);
      expect(result.current.field.drawings).toHaveLength(0);
    });
  });

  const mockPlayer: Player = {
    id: 'player-1',
    name: 'Test Player',
    number: 1,
    position: { x: 0, y: 0 },
    isActive: true,
    stats: {},
  };
});