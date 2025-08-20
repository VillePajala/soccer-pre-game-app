import { saveGameEventOnly, batchSaveGameChanges } from '../optimizedGameSave';
import { storageManager } from '@/lib/storage';
import logger from '../logger';
import type { AppState, GameEvent } from '@/types';

// Mock dependencies
jest.mock('@/lib/storage', () => ({
  storageManager: {
    getProviderName: jest.fn(),
    getSavedGames: jest.fn(),
    saveSavedGame: jest.fn(),
  }
}));

jest.mock('../logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

describe('optimizedGameSave', () => {
  const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  const mockGameEvent: GameEvent = {
    id: 'event-1',
    type: 'GOAL',
    timestamp: Date.now(),
    playerId: 'player-1',
    data: { score: { home: 1, away: 0 } }
  };

  const mockAppState: AppState = {
    id: 'game-1',
    gameEvents: [
      {
        id: 'existing-event',
        type: 'SUBSTITUTION',
        timestamp: Date.now() - 1000,
        playerId: 'player-2',
        data: {}
      }
    ],
    homeScore: 0,
    awayScore: 0,
    gameState: {
      currentPeriod: 1,
      timeElapsed: 300,
      isActive: true
    }
  } as AppState;

  const mockAllGames = {
    'game-1': mockAppState,
    'game-2': { ...mockAppState, id: 'game-2' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset getProviderName mock
    mockStorageManager.getProviderName = jest.fn();
    mockStorageManager.getSavedGames.mockResolvedValue(mockAllGames);
    mockStorageManager.saveSavedGame.mockResolvedValue();
  });

  describe('saveGameEventOnly', () => {
    describe('with Supabase provider', () => {
      beforeEach(() => {
        mockStorageManager.getProviderName.mockReturnValue('supabase-provider');
      });

      it('should save partial update with new event only for Supabase', async () => {
        await saveGameEventOnly('game-1', mockGameEvent);

        expect(mockStorageManager.getSavedGames).toHaveBeenCalledTimes(1);
        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          id: 'game-1',
          gameEvents: [mockAppState.gameEvents[0], mockGameEvent]
        });
        expect(mockLogger.log).toHaveBeenCalledWith(
          '[OPTIMIZED] Saved only event and score for game game-1'
        );
      });

      it('should save partial update with new event and updated score for Supabase', async () => {
        const updatedScore = { homeScore: 2, awayScore: 1 };

        await saveGameEventOnly('game-1', mockGameEvent, updatedScore);

        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          id: 'game-1',
          gameEvents: [mockAppState.gameEvents[0], mockGameEvent],
          homeScore: 2,
          awayScore: 1
        });
      });

      it('should handle empty game events array for Supabase', async () => {
        const gameWithNoEvents = { ...mockAppState, gameEvents: [] };
        mockStorageManager.getSavedGames.mockResolvedValue({
          'game-1': gameWithNoEvents
        });

        await saveGameEventOnly('game-1', mockGameEvent);

        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          id: 'game-1',
          gameEvents: [mockGameEvent]
        });
      });

      it('should handle undefined game events for Supabase', async () => {
        const gameWithoutEvents = { ...mockAppState };
        delete (gameWithoutEvents as any).gameEvents;
        mockStorageManager.getSavedGames.mockResolvedValue({
          'game-1': gameWithoutEvents
        });

        await saveGameEventOnly('game-1', mockGameEvent);

        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          id: 'game-1',
          gameEvents: [mockGameEvent]
        });
      });
    });

    describe('with localStorage provider', () => {
      beforeEach(() => {
        mockStorageManager.getProviderName.mockReturnValue('localStorage-provider');
      });

      it('should save full game state with new event for localStorage', async () => {
        await saveGameEventOnly('game-1', mockGameEvent);

        expect(mockStorageManager.getSavedGames).toHaveBeenCalledTimes(1);
        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          ...mockAppState,
          gameEvents: [mockAppState.gameEvents[0], mockGameEvent]
        });
      });

      it('should save full game state with new event and updated score for localStorage', async () => {
        const updatedScore = { homeScore: 3, awayScore: 2 };

        await saveGameEventOnly('game-1', mockGameEvent, updatedScore);

        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          ...mockAppState,
          gameEvents: [mockAppState.gameEvents[0], mockGameEvent],
          homeScore: 3,
          awayScore: 2
        });
      });

      it('should handle empty game events for localStorage', async () => {
        const gameWithNoEvents = { ...mockAppState, gameEvents: [] };
        mockStorageManager.getSavedGames.mockResolvedValue({
          'game-1': gameWithNoEvents
        });

        await saveGameEventOnly('game-1', mockGameEvent);

        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          ...gameWithNoEvents,
          gameEvents: [mockGameEvent]
        });
      });
    });

    describe('with provider name method unavailable', () => {
      beforeEach(() => {
        mockStorageManager.getProviderName = undefined as any;
      });

      it('should default to localStorage behavior when getProviderName is unavailable', async () => {
        await saveGameEventOnly('game-1', mockGameEvent);

        expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
          ...mockAppState,
          gameEvents: [mockAppState.gameEvents[0], mockGameEvent]
        });
      });
    });

    describe('error handling', () => {
      beforeEach(() => {
        mockStorageManager.getProviderName.mockReturnValue('supabase-provider');
      });

      it('should throw error when game is not found', async () => {
        mockStorageManager.getSavedGames.mockResolvedValue({});

        await expect(saveGameEventOnly('nonexistent-game', mockGameEvent))
          .rejects.toThrow('Game not found');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to save game event:', 
          expect.any(Error)
        );
      });

      it('should throw error when getSavedGames fails', async () => {
        const error = new Error('Storage access failed');
        mockStorageManager.getSavedGames.mockRejectedValue(error);

        await expect(saveGameEventOnly('game-1', mockGameEvent))
          .rejects.toThrow('Storage access failed');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to save game event:', 
          error
        );
      });

      it('should throw error when saveSavedGame fails', async () => {
        const error = new Error('Save operation failed');
        mockStorageManager.saveSavedGame.mockRejectedValue(error);

        await expect(saveGameEventOnly('game-1', mockGameEvent))
          .rejects.toThrow('Save operation failed');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to save game event:', 
          error
        );
      });

      it('should handle null games object', async () => {
        mockStorageManager.getSavedGames.mockResolvedValue(null as any);

        await expect(saveGameEventOnly('game-1', mockGameEvent))
          .rejects.toThrow();

        expect(mockLogger.error).toHaveBeenCalled();
      });

      it('should handle undefined games object', async () => {
        mockStorageManager.getSavedGames.mockResolvedValue(undefined as any);

        await expect(saveGameEventOnly('game-1', mockGameEvent))
          .rejects.toThrow();

        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe('batchSaveGameChanges', () => {
    const mockChanges = {
      events: [mockGameEvent, { ...mockGameEvent, id: 'event-2' }],
      score: { homeScore: 2, awayScore: 1 },
      assessments: [{ playerId: 'player-1', rating: 8 }],
      timerState: { currentTime: 1200, isRunning: true }
    };

    it('should save all changes when provided', async () => {
      await batchSaveGameChanges('game-1', mockChanges);

      expect(mockStorageManager.getSavedGames).toHaveBeenCalledTimes(1);
      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockAppState,
        gameEvents: mockChanges.events,
        homeScore: 2,
        awayScore: 1,
        assessments: mockChanges.assessments,
        timerState: mockChanges.timerState
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        '[BATCH] Saved 4 changes for game game-1'
      );
    });

    it('should save only events when other changes are not provided', async () => {
      const partialChanges = { events: [mockGameEvent] };

      await batchSaveGameChanges('game-1', partialChanges);

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockAppState,
        gameEvents: [mockGameEvent]
      });
      expect(mockLogger.log).toHaveBeenCalledWith(
        '[BATCH] Saved 1 changes for game game-1'
      );
    });

    it('should save only score when other changes are not provided', async () => {
      const scoreChanges = { score: { homeScore: 3, awayScore: 1 } };

      await batchSaveGameChanges('game-1', scoreChanges);

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockAppState,
        homeScore: 3,
        awayScore: 1
      });
    });

    it('should save only assessments when other changes are not provided', async () => {
      const assessmentChanges = { assessments: [{ playerId: 'player-1', rating: 9 }] };

      await batchSaveGameChanges('game-1', assessmentChanges);

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockAppState,
        assessments: assessmentChanges.assessments
      });
    });

    it('should save only timer state when other changes are not provided', async () => {
      const timerChanges = { timerState: { currentTime: 900, isRunning: false } };

      await batchSaveGameChanges('game-1', timerChanges);

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockAppState,
        timerState: timerChanges.timerState
      });
    });

    it('should handle empty changes object', async () => {
      await batchSaveGameChanges('game-1', {});

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith(mockAppState);
      expect(mockLogger.log).toHaveBeenCalledWith(
        '[BATCH] Saved 0 changes for game game-1'
      );
    });

    it('should handle falsy timer state correctly', async () => {
      const falsyTimerChanges = { timerState: null };

      await batchSaveGameChanges('game-1', falsyTimerChanges);

      // timerState should not be included when falsy
      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith(mockAppState);
    });

    it('should handle zero values in timer state correctly', async () => {
      const zeroTimerChanges = { timerState: { currentTime: 0, isRunning: false } };

      await batchSaveGameChanges('game-1', zeroTimerChanges);

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockAppState,
        timerState: zeroTimerChanges.timerState
      });
    });

    describe('error handling', () => {
      it('should throw error when game is not found', async () => {
        mockStorageManager.getSavedGames.mockResolvedValue({});

        await expect(batchSaveGameChanges('nonexistent-game', mockChanges))
          .rejects.toThrow('Game not found');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to batch save game changes:', 
          expect.any(Error)
        );
      });

      it('should throw error when getSavedGames fails', async () => {
        const error = new Error('Storage read failed');
        mockStorageManager.getSavedGames.mockRejectedValue(error);

        await expect(batchSaveGameChanges('game-1', mockChanges))
          .rejects.toThrow('Storage read failed');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to batch save game changes:', 
          error
        );
      });

      it('should throw error when saveSavedGame fails', async () => {
        const error = new Error('Batch save failed');
        mockStorageManager.saveSavedGame.mockRejectedValue(error);

        await expect(batchSaveGameChanges('game-1', mockChanges))
          .rejects.toThrow('Batch save failed');

        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to batch save game changes:', 
          error
        );
      });

      it('should handle corrupted game data', async () => {
        mockStorageManager.getSavedGames.mockResolvedValue({
          'game-1': null
        });

        await expect(batchSaveGameChanges('game-1', mockChanges))
          .rejects.toThrow('Game not found');

        expect(mockLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      mockStorageManager.getProviderName.mockReturnValue('supabase-provider');
    });

    it('should handle large game events array', async () => {
      const largeEventsArray = Array.from({ length: 100 }, (_, i) => ({
        ...mockGameEvent,
        id: `event-${i}`
      }));
      
      const gameWithManyEvents = {
        ...mockAppState,
        gameEvents: largeEventsArray
      };
      
      mockStorageManager.getSavedGames.mockResolvedValue({
        'game-1': gameWithManyEvents
      });

      await saveGameEventOnly('game-1', mockGameEvent);

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        id: 'game-1',
        gameEvents: [...largeEventsArray, mockGameEvent]
      });
    });

    it('should handle complex nested timer state in batch save', async () => {
      const complexTimerState = {
        currentTime: 2700,
        isRunning: true,
        periods: [
          { number: 1, startTime: 0, endTime: 2700 }
        ],
        breaks: [],
        metadata: { lastSync: Date.now() }
      };

      await batchSaveGameChanges('game-1', { timerState: complexTimerState });

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        ...mockAppState,
        timerState: complexTimerState
      });
    });

    it('should handle Unicode characters in event data', async () => {
      const unicodeEvent = {
        ...mockGameEvent,
        data: { 
          playerName: 'José María Gutiérrez',
          comment: '⚽ Gooooool! 🎉'
        }
      };

      await saveGameEventOnly('game-1', unicodeEvent);

      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith({
        id: 'game-1',
        gameEvents: [mockAppState.gameEvents[0], unicodeEvent]
      });
    });
  });
});