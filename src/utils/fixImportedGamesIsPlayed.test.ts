/**
 * Tests for fixImportedGamesIsPlayed utility
 */

import { fixImportedGamesIsPlayed } from './fixImportedGamesIsPlayed';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';

jest.mock('@/lib/storage');
jest.mock('@/utils/logger');

describe('fixImportedGamesIsPlayed', () => {
  const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorageManager.saveSavedGame = jest.fn().mockResolvedValue({});
  });

  const createMockGames = () => ({
    'game1': {
      teamName: 'Team A',
      opponentName: 'Team B',
      isPlayed: undefined // needs fixing
    },
    'game2': {
      teamName: 'Team C',
      opponentName: 'Team D',
      isPlayed: null // needs fixing
    },
    'game3': {
      teamName: 'Team E',
      opponentName: 'Team F',
      isPlayed: true // already set
    },
    'game4': {
      teamName: 'Team G',
      opponentName: 'Team H',
      isPlayed: false // already set
    },
    'game5': {
      teamName: 'Team I',
      opponentName: 'Team J'
      // isPlayed is missing completely
    }
  });

  it('should successfully fix games with missing isPlayed field', async () => {
    const mockGames = createMockGames();
    mockStorageManager.getSavedGames.mockResolvedValue(mockGames);

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 3 out of 5 games',
      details: {
        gamesFixed: 3,
        totalGames: 5
      }
    });

    // Verify that saveSavedGame was called for the 3 games that needed fixing
    expect(mockStorageManager.saveSavedGame).toHaveBeenCalledTimes(3);
    
    // Check that the correct games were fixed
    const savedCalls = mockStorageManager.saveSavedGame.mock.calls;
    expect(savedCalls[0][0].isPlayed).toBe(true); // game1
    expect(savedCalls[1][0].isPlayed).toBe(true); // game2
    expect(savedCalls[2][0].isPlayed).toBe(true); // game5
  });

  it('should return error when no saved games found', async () => {
    mockStorageManager.getSavedGames.mockResolvedValue({});

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: false,
      message: 'No saved games found'
    });

    expect(mockStorageManager.saveSavedGame).not.toHaveBeenCalled();
  });

  it('should handle null saved games from storage', async () => {
    mockStorageManager.getSavedGames.mockResolvedValue(null);

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: false,
      message: 'No saved games found'
    });
  });

  it('should skip invalid game entries', async () => {
    const gamesWithInvalid = {
      'valid-game': {
        teamName: 'Team A',
        opponentName: 'Team B'
        // isPlayed is missing - should be fixed
      },
      'null-game': null,
      'string-game': 'invalid',
      'number-game': 123
    };

    mockStorageManager.getSavedGames.mockResolvedValue(gamesWithInvalid);

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 1 out of 4 games',
      details: {
        gamesFixed: 1,
        totalGames: 4
      }
    });

    expect(mockStorageManager.saveSavedGame).toHaveBeenCalledTimes(1);
  });

  it('should handle games that already have isPlayed set', async () => {
    const gamesAlreadyFixed = {
      'game1': {
        teamName: 'Team A',
        opponentName: 'Team B',
        isPlayed: true
      },
      'game2': {
        teamName: 'Team C',
        opponentName: 'Team D',
        isPlayed: false
      }
    };

    mockStorageManager.getSavedGames.mockResolvedValue(gamesAlreadyFixed);

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 0 out of 2 games',
      details: {
        gamesFixed: 0,
        totalGames: 2
      }
    });

    expect(mockStorageManager.saveSavedGame).not.toHaveBeenCalled();
  });

  it('should handle individual game save errors gracefully', async () => {
    const mockGames = {
      'game1': {
        teamName: 'Team A',
        opponentName: 'Team B'
        // isPlayed is missing
      },
      'game2': {
        teamName: 'Team C',
        opponentName: 'Team D'
        // isPlayed is missing
      }
    };

    mockStorageManager.getSavedGames.mockResolvedValue(mockGames);
    
    // Make first save fail, second succeed
    mockStorageManager.saveSavedGame
      .mockRejectedValueOnce(new Error('Save failed'))
      .mockResolvedValueOnce({});

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 1 out of 2 games',
      details: {
        gamesFixed: 1,
        totalGames: 2
      }
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[FixImportedGamesIsPlayed] Failed to fix game game1:',
      expect.any(Error)
    );
  });

  it('should handle storage errors', async () => {
    mockStorageManager.getSavedGames.mockRejectedValue(new Error('Storage error'));

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: false,
      message: 'Failed to fix games: Storage error'
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[FixImportedGamesIsPlayed] Error fixing games:',
      expect.any(Error)
    );
  });

  it('should handle non-Error exceptions', async () => {
    mockStorageManager.getSavedGames.mockImplementation(() => {
      throw 'String error';
    });

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: false,
      message: 'Failed to fix games: Unknown error'
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[FixImportedGamesIsPlayed] Error fixing games:',
      'String error'
    );
  });

  it('should log progress information', async () => {
    const mockGames = createMockGames();
    mockStorageManager.getSavedGames.mockResolvedValue(mockGames);

    await fixImportedGamesIsPlayed();

    expect(mockLogger.log).toHaveBeenCalledWith('[FixImportedGamesIsPlayed] Starting fix process...');
    expect(mockLogger.log).toHaveBeenCalledWith('[FixImportedGamesIsPlayed] Fixed game game1 - set isPlayed to true');
    expect(mockLogger.log).toHaveBeenCalledWith('[FixImportedGamesIsPlayed] Fixed game game2 - set isPlayed to true');
    expect(mockLogger.log).toHaveBeenCalledWith('[FixImportedGamesIsPlayed] Fixed game game5 - set isPlayed to true');
    expect(mockLogger.log).toHaveBeenCalledWith('[FixImportedGamesIsPlayed] Fixed 3 out of 5 games');
  });

  it('should handle empty games object', async () => {
    mockStorageManager.getSavedGames.mockResolvedValue({});

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: false,
      message: 'No saved games found'
    });
  });

  it('should preserve existing game data while setting isPlayed', async () => {
    const originalGame = {
      teamName: 'Team A',
      opponentName: 'Team B',
      gameDate: '2024-01-01',
      homeScore: 2,
      awayScore: 1,
      gameEvents: [
        { id: 'event1', type: 'goal', time: 300 }
      ],
      selectedPlayerIds: ['player1', 'player2']
      // isPlayed is missing
    };

    const mockGames = { 'game1': originalGame };
    mockStorageManager.getSavedGames.mockResolvedValue(mockGames);

    await fixImportedGamesIsPlayed();

    const savedGameData = mockStorageManager.saveSavedGame.mock.calls[0][0];
    
    // Check that all original data is preserved
    expect(savedGameData.teamName).toBe('Team A');
    expect(savedGameData.opponentName).toBe('Team B');
    expect(savedGameData.gameDate).toBe('2024-01-01');
    expect(savedGameData.homeScore).toBe(2);
    expect(savedGameData.awayScore).toBe(1);
    expect(savedGameData.gameEvents).toEqual([{ id: 'event1', type: 'goal', time: 300 }]);
    expect(savedGameData.selectedPlayerIds).toEqual(['player1', 'player2']);
    
    // Check that isPlayed was added
    expect(savedGameData.isPlayed).toBe(true);
  });

  it('should handle games with isPlayed set to 0 (falsy but not null/undefined)', async () => {
    const mockGames = {
      'game1': {
        teamName: 'Team A',
        opponentName: 'Team B',
        isPlayed: 0 // falsy but not null/undefined
      }
    };

    mockStorageManager.getSavedGames.mockResolvedValue(mockGames);

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 0 out of 1 games',
      details: {
        gamesFixed: 0,
        totalGames: 1
      }
    });

    expect(mockStorageManager.saveSavedGame).not.toHaveBeenCalled();
  });

  it('should handle games with isPlayed set to empty string (falsy but not null/undefined)', async () => {
    const mockGames = {
      'game1': {
        teamName: 'Team A',
        opponentName: 'Team B',
        isPlayed: '' // falsy but not null/undefined
      }
    };

    mockStorageManager.getSavedGames.mockResolvedValue(mockGames);

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 0 out of 1 games',
      details: {
        gamesFixed: 0,
        totalGames: 1
      }
    });

    expect(mockStorageManager.saveSavedGame).not.toHaveBeenCalled();
  });

  it('should handle large number of games efficiently', async () => {
    // Create 100 games that need fixing
    const manyGames: Record<string, any> = {};
    for (let i = 1; i <= 100; i++) {
      manyGames[`game${i}`] = {
        teamName: `Team ${i}`,
        opponentName: `Opponent ${i}`
        // isPlayed is missing
      };
    }

    mockStorageManager.getSavedGames.mockResolvedValue(manyGames);

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 100 out of 100 games',
      details: {
        gamesFixed: 100,
        totalGames: 100
      }
    });

    expect(mockStorageManager.saveSavedGame).toHaveBeenCalledTimes(100);
  });

  it('should handle mixed scenarios with some games needing fixes and some having errors', async () => {
    const mockGames = {
      'game1': {
        teamName: 'Team A',
        opponentName: 'Team B'
        // isPlayed missing - should be fixed
      },
      'game2': {
        teamName: 'Team C',
        opponentName: 'Team D'
        // isPlayed missing - save will fail
      },
      'game3': {
        teamName: 'Team E',
        opponentName: 'Team F',
        isPlayed: true // already set - no fix needed
      }
    };

    mockStorageManager.getSavedGames.mockResolvedValue(mockGames);
    
    // Make second save fail
    mockStorageManager.saveSavedGame
      .mockResolvedValueOnce({}) // game1 succeeds
      .mockRejectedValueOnce(new Error('Save failed')); // game2 fails

    const result = await fixImportedGamesIsPlayed();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 1 out of 3 games',
      details: {
        gamesFixed: 1,
        totalGames: 3
      }
    });

    expect(mockStorageManager.saveSavedGame).toHaveBeenCalledTimes(2);
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
  });
});