/**
 * Tests for fixGameEventPlayerIds utility
 */

import { fixGameEventPlayerIds } from './fixGameEventPlayerIds';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';
import type { Player } from '@/types';

jest.mock('@/lib/storage');
jest.mock('@/utils/logger');

describe('fixGameEventPlayerIds', () => {
  const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockCurrentPlayers: Player[] = [
    { id: 'new-player-1', name: 'Player One' } as Player,
    { id: 'new-player-2', name: 'Player Two' } as Player,
    { id: 'new-player-3', name: 'Player Three' } as Player
  ];

  const mockSavedGames = {
    'game1': {
      teamName: 'Team A',
      opponentName: 'Team B',
      gameEvents: [
        { id: 'event1', type: 'goal', scorerId: 'old-player-1', assisterId: 'old-player-2' },
        { id: 'event2', type: 'goal', scorerId: 'old-player-2', assisterId: null },
        { id: 'event3', type: 'opponentGoal', time: 300 }
      ],
      selectedPlayerIds: ['old-player-1', 'old-player-2'],
      availablePlayers: [
        { id: 'old-player-1', name: 'Player One' },
        { id: 'old-player-2', name: 'Player Two' },
        { id: 'old-player-3', name: 'Player Three' }
      ],
      playersOnField: [
        { id: 'old-player-1', name: 'Player One', relX: 0.2, relY: 0.3 },
        { id: 'old-player-2', name: 'Player Two', relX: 0.8, relY: 0.7 }
      ]
    },
    'game2': {
      teamName: 'Team C',
      opponentName: 'Team D',
      gameEvents: [],
      selectedPlayerIds: [],
      availablePlayers: [],
      playersOnField: []
    }
  };

  it('should successfully fix player IDs in game events and player lists', async () => {
    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue(mockSavedGames);
    mockStorageManager.saveSavedGame.mockResolvedValue({});

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 2 events in 1 games',
      details: {
        gamesFixed: 1,
        eventsFixed: 2
      }
    });

    // Verify that saveSavedGame was called with updated data
    expect(mockStorageManager.saveSavedGame).toHaveBeenCalledTimes(1);
    const savedGameData = mockStorageManager.saveSavedGame.mock.calls[0][0];
    
    // Check that game events have updated player IDs
    expect(savedGameData.gameEvents[0].scorerId).toBe('new-player-1');
    expect(savedGameData.gameEvents[0].assisterId).toBe('new-player-2');
    expect(savedGameData.gameEvents[1].scorerId).toBe('new-player-2');
    
    // Check that selectedPlayerIds are updated
    expect(savedGameData.selectedPlayerIds).toEqual(['new-player-1', 'new-player-2']);
    
    // Check that availablePlayers are updated
    expect(savedGameData.availablePlayers[0].id).toBe('new-player-1');
    expect(savedGameData.availablePlayers[1].id).toBe('new-player-2');
    expect(savedGameData.availablePlayers[2].id).toBe('new-player-3');
    
    // Check that playersOnField are updated
    expect(savedGameData.playersOnField[0].id).toBe('new-player-1');
    expect(savedGameData.playersOnField[1].id).toBe('new-player-2');
  });

  it('should return error when no players found in roster', async () => {
    mockStorageManager.getPlayers.mockResolvedValue([]);

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: false,
      message: 'No players found in roster'
    });

    expect(mockStorageManager.getSavedGames).not.toHaveBeenCalled();
  });

  it('should return error when no saved games found', async () => {
    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue({});

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: false,
      message: 'No saved games found'
    });
  });

  it('should handle null players from storage', async () => {
    mockStorageManager.getPlayers.mockResolvedValue(null);

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: false,
      message: 'No players found in roster'
    });
  });

  it('should handle null saved games from storage', async () => {
    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue(null);

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: false,
      message: 'No saved games found'
    });
  });

  it('should skip invalid game entries', async () => {
    const gamesWithInvalid = {
      'valid-game': mockSavedGames.game1,
      'null-game': null,
      'string-game': 'invalid',
      'empty-game': {}
    };

    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue(gamesWithInvalid);
    mockStorageManager.saveSavedGame.mockResolvedValue({});

    const result = await fixGameEventPlayerIds();

    expect(result.success).toBe(true);
    expect(mockStorageManager.saveSavedGame).toHaveBeenCalledTimes(1);
  });

  it('should handle games without game events', async () => {
    const gameWithoutEvents = {
      'game1': {
        teamName: 'Team A',
        opponentName: 'Team B',
        selectedPlayerIds: ['old-player-1'],
        availablePlayers: [{ id: 'old-player-1', name: 'Player One' }],
        playersOnField: []
      }
    };

    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue(gameWithoutEvents);
    mockStorageManager.saveSavedGame.mockResolvedValue({});

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 0 events in 1 games',
      details: {
        gamesFixed: 1,
        eventsFixed: 0
      }
    });
  });

  it('should handle events with no matching player in availablePlayers', async () => {
    const gameWithUnmatchedPlayers = {
      'game1': {
        gameEvents: [
          { id: 'event1', type: 'goal', scorerId: 'unknown-player', assisterId: 'old-player-1' }
        ],
        availablePlayers: [
          { id: 'old-player-1', name: 'Player One' }
        ]
      }
    };

    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue(gameWithUnmatchedPlayers);
    mockStorageManager.saveSavedGame.mockResolvedValue({});

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 1 events in 1 games',
      details: {
        gamesFixed: 1,
        eventsFixed: 1
      }
    });

    const savedGameData = mockStorageManager.saveSavedGame.mock.calls[0][0];
    expect(savedGameData.gameEvents[0].scorerId).toBe('unknown-player'); // unchanged
    expect(savedGameData.gameEvents[0].assisterId).toBe('new-player-1'); // updated
  });

  it('should handle players with names not in current roster', async () => {
    const gameWithUnknownPlayer = {
      'game1': {
        gameEvents: [
          { id: 'event1', type: 'goal', scorerId: 'old-player-unknown', assisterId: 'old-player-1' }
        ],
        availablePlayers: [
          { id: 'old-player-unknown', name: 'Unknown Player' },
          { id: 'old-player-1', name: 'Player One' }
        ]
      }
    };

    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue(gameWithUnknownPlayer);
    mockStorageManager.saveSavedGame.mockResolvedValue({});

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 1 events in 1 games',
      details: {
        gamesFixed: 1,
        eventsFixed: 1
      }
    });

    const savedGameData = mockStorageManager.saveSavedGame.mock.calls[0][0];
    expect(savedGameData.gameEvents[0].scorerId).toBe('old-player-unknown'); // unchanged
    expect(savedGameData.gameEvents[0].assisterId).toBe('new-player-1'); // updated
  });

  it('should handle games with already correct player IDs', async () => {
    const gameWithCorrectIds = {
      'game1': {
        gameEvents: [
          { id: 'event1', type: 'goal', scorerId: 'new-player-1', assisterId: 'new-player-2' }
        ],
        selectedPlayerIds: ['new-player-1', 'new-player-2'],
        availablePlayers: [
          { id: 'new-player-1', name: 'Player One' },
          { id: 'new-player-2', name: 'Player Two' }
        ],
        playersOnField: [
          { id: 'new-player-1', name: 'Player One' }
        ]
      }
    };

    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue(gameWithCorrectIds);
    mockStorageManager.saveSavedGame.mockResolvedValue({});

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 0 events in 0 games',
      details: {
        gamesFixed: 0,
        eventsFixed: 0
      }
    });

    expect(mockStorageManager.saveSavedGame).not.toHaveBeenCalled();
  });

  it('should handle missing or invalid game data fields', async () => {
    const gameWithMissingFields = {
      'game1': {
        gameEvents: null,
        selectedPlayerIds: undefined,
        availablePlayers: 'invalid',
        playersOnField: []
      }
    };

    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue(gameWithMissingFields);
    mockStorageManager.saveSavedGame.mockResolvedValue({});

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 0 events in 0 games',
      details: {
        gamesFixed: 0,
        eventsFixed: 0
      }
    });
  });

  it('should handle events with null or invalid player IDs', async () => {
    const gameWithInvalidIds = {
      'game1': {
        gameEvents: [
          { id: 'event1', type: 'goal', scorerId: null, assisterId: 123 },
          { id: 'event2', type: 'goal', scorerId: 'old-player-1', assisterId: '' }
        ],
        availablePlayers: [
          { id: 'old-player-1', name: 'Player One' }
        ]
      }
    };

    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue(gameWithInvalidIds);
    mockStorageManager.saveSavedGame.mockResolvedValue({});

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 1 events in 1 games',
      details: {
        gamesFixed: 1,
        eventsFixed: 1
      }
    });
  });

  it('should handle storage errors gracefully', async () => {
    mockStorageManager.getPlayers.mockRejectedValue(new Error('Storage error'));

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: false,
      message: 'Failed to fix player IDs: Storage error'
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[FixGameEventPlayerIds] Error fixing player IDs:',
      expect.any(Error)
    );
  });

  it('should handle non-Error exceptions', async () => {
    mockStorageManager.getPlayers.mockImplementation(() => {
      throw 'String error';
    });

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: false,
      message: 'Failed to fix player IDs: Unknown error'
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[FixGameEventPlayerIds] Error fixing player IDs:',
      'String error'
    );
  });

  it('should handle save game errors', async () => {
    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue(mockSavedGames);
    mockStorageManager.saveSavedGame.mockRejectedValue(new Error('Save failed'));

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: false,
      message: 'Failed to fix player IDs: Save failed'
    });
  });

  it('should log progress information', async () => {
    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue(mockSavedGames);
    mockStorageManager.saveSavedGame.mockResolvedValue({});

    await fixGameEventPlayerIds();

    expect(mockLogger.log).toHaveBeenCalledWith('[FixGameEventPlayerIds] Starting player ID fix process...');
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Fixed scorerId for Player One'));
    expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Fixed assisterId for Player Two'));
    expect(mockLogger.log).toHaveBeenCalledWith('[FixGameEventPlayerIds] Fixed game game1');
    expect(mockLogger.log).toHaveBeenCalledWith('[FixGameEventPlayerIds] Fixed 2 events in 1 games');
  });

  it('should handle complex player mapping scenarios', async () => {
    const complexGame = {
      'game1': {
        gameEvents: [
          { id: 'event1', type: 'goal', scorerId: 'old-player-1', assisterId: 'old-player-2' },
          { id: 'event2', type: 'goal', scorerId: 'old-player-3', assisterId: 'old-player-1' }
        ],
        selectedPlayerIds: ['old-player-1', 'old-player-2', 'old-player-3'],
        availablePlayers: [
          { id: 'old-player-1', name: 'Player One' },
          { id: 'old-player-2', name: 'Player Two' },
          { id: 'old-player-3', name: 'Player Three' }
        ],
        playersOnField: [
          { id: 'old-player-1', name: 'Player One', relX: 0.1, relY: 0.2 },
          { id: 'old-player-3', name: 'Player Three', relX: 0.9, relY: 0.8 }
        ]
      }
    };

    mockStorageManager.getPlayers.mockResolvedValue(mockCurrentPlayers);
    mockStorageManager.getSavedGames.mockResolvedValue(complexGame);
    mockStorageManager.saveSavedGame.mockResolvedValue({});

    const result = await fixGameEventPlayerIds();

    expect(result).toEqual({
      success: true,
      message: 'Fixed 2 events in 1 games',
      details: {
        gamesFixed: 1,
        eventsFixed: 2
      }
    });

    const savedGameData = mockStorageManager.saveSavedGame.mock.calls[0][0];
    
    // All events should be fixed
    expect(savedGameData.gameEvents[0].scorerId).toBe('new-player-1');
    expect(savedGameData.gameEvents[0].assisterId).toBe('new-player-2');
    expect(savedGameData.gameEvents[1].scorerId).toBe('new-player-3');
    expect(savedGameData.gameEvents[1].assisterId).toBe('new-player-1');
    
    // All selected players should be updated
    expect(savedGameData.selectedPlayerIds).toEqual(['new-player-1', 'new-player-2', 'new-player-3']);
    
    // All available players should be updated
    expect(savedGameData.availablePlayers.map((p: any) => p.id)).toEqual(['new-player-1', 'new-player-2', 'new-player-3']);
    
    // Players on field should be updated while preserving position data
    expect(savedGameData.playersOnField[0]).toEqual({
      id: 'new-player-1',
      name: 'Player One',
      relX: 0.1,
      relY: 0.2
    });
    expect(savedGameData.playersOnField[1]).toEqual({
      id: 'new-player-3',
      name: 'Player Three',
      relX: 0.9,
      relY: 0.8
    });
  });
});