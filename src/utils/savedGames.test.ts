import {
  getSavedGames,
  saveGames,
  saveGame,
  getGame,
  deleteGame,
  createGame,
  getAllGameIds,
  getFilteredGames,
  updateGameDetails,
  addGameEvent,
  updateGameEvent,
  removeGameEvent,
  exportGamesAsJson,
  importGamesFromJson,
  GameData
} from './savedGames';
import { SAVED_GAMES_KEY } from '@/config/constants';
import type { SavedGamesCollection } from '@/app/page';

describe('Saved Games Utilities', () => {
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn(),
    length: 0,
    key: jest.fn()
  };

  // Replace global localStorage with mock
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  // Mock game data
  const mockGameData: GameData = {
    id: 'game_123',
    homeTeam: 'Dragons',
    awayTeam: 'Tigers',
    date: '2023-04-15T14:00:00.000Z',
    teamOnLeft: 'home',
    players: [
      { id: 'player_1', name: 'John', jerseyNumber: '10', isGoalie: false, receivedFairPlayCard: false }
    ],
    events: [
      { id: 'event_1', type: 'goal', playerId: 'player_1', timestamp: 1234567890, period: 1 }
    ],
    seasonId: 'season_1',
    tournamentId: 'tournament_1'
  };

  const mockSavedGames: SavedGamesCollection = {
    'game_123': mockGameData,
    'game_456': {
      ...mockGameData,
      id: 'game_456',
      homeTeam: 'Eagles',
      seasonId: 'season_2',
      tournamentId: null
    }
  };

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSavedGames', () => {
    it('should return an empty object if no games are stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = getSavedGames();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(SAVED_GAMES_KEY);
      expect(result).toEqual({});
    });

    it('should return the games if they exist', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
      
      const result = getSavedGames();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(SAVED_GAMES_KEY);
      expect(result).toEqual(mockSavedGames);
    });

    it('should handle invalid JSON', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const result = getSavedGames();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toEqual({});
      
      consoleSpy.mockRestore();
    });
  });

  describe('saveGames', () => {
    it('should save games to localStorage', () => {
      saveGames(mockSavedGames);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        SAVED_GAMES_KEY,
        JSON.stringify(mockSavedGames)
      );
    });

    it('should handle localStorage errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Storage quota exceeded');
      localStorageMock.setItem.mockImplementation(() => { throw error; });
      
      saveGames(mockSavedGames);
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('saveGame', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });

    it('should add a new game to localStorage', () => {
      const newGame: GameData = {
        ...mockGameData,
        id: 'game_789',
        homeTeam: 'Wolves'
      };
      
      const result = saveGame('game_789', newGame);
      
      expect(result).toEqual(newGame);
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      // Extract the saved games from the mock call
      const savedGamesArg = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedGamesArg['game_789']).toEqual(newGame);
    });

    it('should update an existing game', () => {
      const updatedGame: GameData = {
        ...mockGameData,
        homeTeam: 'Updated Dragons'
      };
      
      const result = saveGame('game_123', updatedGame);
      
      expect(result).toEqual(updatedGame);
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      // Extract the saved games from the mock call
      const savedGamesArg = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedGamesArg['game_123']).toEqual(updatedGame);
    });

    it('should return null if gameId is empty', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = saveGame('', mockGameData);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('getGame', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });

    it('should return the requested game if it exists', () => {
      const result = getGame('game_123');
      
      expect(result).toEqual(mockGameData);
    });

    it('should return null if the game does not exist', () => {
      const result = getGame('nonexistent_game');
      
      expect(result).toBeNull();
    });

    it('should return null if gameId is empty', () => {
      const result = getGame('');
      
      expect(result).toBeNull();
    });
  });

  describe('deleteGame', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });

    it('should delete the game and return true if successful', () => {
      const result = deleteGame('game_123');
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      // Extract the saved games from the mock call
      const savedGamesArg = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedGamesArg['game_123']).toBeUndefined();
      expect(savedGamesArg['game_456']).toBeDefined(); // Other games should remain
    });

    it('should return false if the game does not exist', () => {
      const result = deleteGame('nonexistent_game');
      
      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should return false if gameId is empty', () => {
      const result = deleteGame('');
      
      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('createGame', () => {
    beforeEach(() => {
      // Mock Date.now for predictable IDs
      jest.spyOn(Date, 'now').mockImplementation(() => 1234567890);
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create a new game with default values and provided overrides', () => {
      const initialData = {
        homeTeam: 'New Team',
        seasonId: 'season_3'
      };
      
      const result = createGame(initialData);
      
      expect(result).not.toBeNull();
      expect(result?.gameId).toBe('game_1234567890');
      expect(result?.gameData.homeTeam).toBe('New Team');
      expect(result?.gameData.seasonId).toBe('season_3');
      expect(result?.gameData.awayTeam).toBe('Away Team'); // Default value
      
      // Verify localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });

  describe('getAllGameIds', () => {
    it('should return all game IDs', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
      
      const result = getAllGameIds();
      
      expect(result).toEqual(['game_123', 'game_456']);
    });

    it('should return an empty array if no games exist', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = getAllGameIds();
      
      expect(result).toEqual([]);
    });
  });

  describe('getFilteredGames', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });

    it('should filter games by seasonId', () => {
      const result = getFilteredGames({ seasonId: 'season_1' });
      
      expect(result.length).toBe(1);
      expect(result[0][0]).toBe('game_123');
    });

    it('should filter games by tournamentId', () => {
      const result = getFilteredGames({ tournamentId: 'tournament_1' });
      
      expect(result.length).toBe(1);
      expect(result[0][0]).toBe('game_123');
    });

    it('should filter games by both seasonId and tournamentId', () => {
      const result = getFilteredGames({ 
        seasonId: 'season_1', 
        tournamentId: 'tournament_1' 
      });
      
      expect(result.length).toBe(1);
      expect(result[0][0]).toBe('game_123');
    });

    it('should return no games if no matches', () => {
      const result = getFilteredGames({ 
        seasonId: 'nonexistent_season'
      });
      
      expect(result.length).toBe(0);
    });

    it('should return all games if no filters provided', () => {
      const result = getFilteredGames({});
      
      expect(result.length).toBe(2);
    });
  });

  describe('updateGameDetails', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });

    it('should update game details', () => {
      const updateData = {
        homeTeam: 'Updated Team',
        awayTeam: 'New Away Team',
        seasonId: 'season_3'
      };
      
      const result = updateGameDetails('game_123', updateData);
      
      expect(result).not.toBeNull();
      expect(result?.homeTeam).toBe('Updated Team');
      expect(result?.awayTeam).toBe('New Away Team');
      expect(result?.seasonId).toBe('season_3');
      
      // Existing data should be preserved
      expect(result?.events).toEqual(mockGameData.events);
      expect(result?.players).toEqual(mockGameData.players);
    });

    it('should return null if game not found', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = updateGameDetails('nonexistent_game', { homeTeam: 'New Name' });
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('addGameEvent', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });

    it('should add an event to a game', () => {
      const newEvent = {
        id: 'event_2',
        type: 'assist',
        playerId: 'player_2',
        timestamp: 1234567999,
        period: 2
      };
      
      const result = addGameEvent('game_123', newEvent);
      
      expect(result).not.toBeNull();
      expect(result?.events.length).toBe(2);
      expect(result?.events[1]).toEqual(newEvent);
    });

    it('should return null if game not found', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = addGameEvent('nonexistent_game', { id: 'event_x' });
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('updateGameEvent', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });

    it('should update an event in a game', () => {
      const eventUpdate = {
        type: 'updated_goal',
        period: 3
      };
      
      const result = updateGameEvent('game_123', 0, eventUpdate);
      
      expect(result).not.toBeNull();
      expect(result?.events[0].type).toBe('updated_goal');
      expect(result?.events[0].period).toBe(3);
      
      // Original data should be preserved
      expect(result?.events[0].id).toBe('event_1');
      expect(result?.events[0].playerId).toBe('player_1');
    });

    it('should return null if game not found', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = updateGameEvent('nonexistent_game', 0, { type: 'updated' });
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should return null if event index is out of bounds', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = updateGameEvent('game_123', 10, { type: 'updated' });
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('removeGameEvent', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });

    it('should remove an event from a game', () => {
      const result = removeGameEvent('game_123', 0);
      
      expect(result).not.toBeNull();
      expect(result?.events.length).toBe(0);
    });

    it('should return null if game not found', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = removeGameEvent('nonexistent_game', 0);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should return null if event index is out of bounds', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const result = removeGameEvent('game_123', 10);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('exportGamesAsJson', () => {
    it('should export games as formatted JSON string', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
      
      const result = exportGamesAsJson();
      
      expect(result).not.toBeNull();
      expect(typeof result).toBe('string');
      
      // Should be valid JSON that can be parsed back
      const parsed = JSON.parse(result as string);
      expect(parsed).toEqual(mockSavedGames);
    });

    it('should return null on error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Specifically throw an error during JSON.stringify rather than on localStorage.getItem
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn().mockImplementation(() => { throw new Error('Test error'); });
      
      const result = exportGamesAsJson();
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      // Restore original stringify
      JSON.stringify = originalStringify;
      consoleSpy.mockRestore();
    });
  });

  describe('importGamesFromJson', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        'existing_game': mockGameData
      }));
    });

    it('should import games from JSON string and merge with existing', () => {
      const importData = {
        'game_new': {
          ...mockGameData,
          id: 'game_new',
          homeTeam: 'Imported Team'
        }
      };
      
      const result = importGamesFromJson(JSON.stringify(importData));
      
      expect(result).toBe(1); // 1 game imported
      
      // Verify localStorage was updated with merged games
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedGamesArg = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(Object.keys(savedGamesArg).length).toBe(2);
      expect(savedGamesArg['existing_game']).toBeDefined();
      expect(savedGamesArg['game_new']).toBeDefined();
    });

    it('should overwrite existing games when overwrite is true', () => {
      const importData = {
        'existing_game': {
          ...mockGameData,
          homeTeam: 'Overwritten Team'
        }
      };
      
      const result = importGamesFromJson(JSON.stringify(importData), true);
      
      expect(result).toBe(1); // 1 game imported
      
      // Verify localStorage was updated with only the imported game
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const savedGamesArg = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(Object.keys(savedGamesArg).length).toBe(1);
      expect(savedGamesArg['existing_game'].homeTeam).toBe('Overwritten Team');
    });

    it('should handle invalid JSON', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = importGamesFromJson('invalid json');
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should reject non-object JSON', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = importGamesFromJson('"just a string"');
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });
}); 