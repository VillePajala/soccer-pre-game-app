import type { Player } from '@/types';
import type { GameEvent as AppGameEvent } from '@/app/page';
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
  GameData // This is the type from ./savedGames
} from './savedGames';
import { SAVED_GAMES_KEY } from '@/config/constants';

// Define a GameEvent structure compatible with GameData.events and GameEventData from savedGames.ts
interface TestGameEvent {
  id: string;
  type: 'goal' | 'opponentGoal' | 'substitution' | 'periodEnd' | 'gameEnd';
  time: number;
  scorerId?: string;
  assisterId?: string;
  // Add other fields if necessary, e.g., for substitution events if they are tested
  outPlayerId?: string;
  inPlayerId?: string;
}

describe('Saved Games Utilities', () => {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn(),
    length: 0,
    key: jest.fn()
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });

  const mockPlayer1: Player = { id: 'player_1', name: 'John', jerseyNumber: '10', isGoalie: false, receivedFairPlayCard: false, notes: '' };

  const mockEvent1: TestGameEvent = { id: 'event_1', type: 'goal', scorerId: 'player_1', time: 1234567890 };

  // Base GameData structure for re-use
  const mockBaseGameData: Omit<GameData, 'id'> = {
    homeTeam: 'Dragons',
    awayTeam: 'Tigers',
    date: '2023-04-15T14:00:00.000Z',
    teamOnLeft: 'home',
    players: [mockPlayer1],
    events: [mockEvent1],
    seasonId: 'season_1',
    tournamentId: 'tournament_1',
    notes: 'Game notes',
    homeScore: 1,
    awayScore: 0,
    gameStatus: 'inProgress',
    currentPeriod: 1,
    numberOfPeriods: 2,
    periodDuration: 10,
    selectedPlayerIds: ['player_1'],
    location: 'Stadium A',
    time: '14:00',
    subIntervalMinutes: 5,
    completedIntervalDurations: [],
    lastSubConfirmationTimeSeconds: 0,
    // Optional GameData fields (ensure they are truly optional or provide defaults)
    playersOnField: [],
    opponents: [],
    drawings: [],
    showPlayerNames: true,
  };

  const mockGame1_gameData: GameData = {
    id: 'game_123',
    ...mockBaseGameData,
  };

  const mockGame2_gameData: GameData = {
    id: 'game_456',
    ...mockBaseGameData,
    homeTeam: 'Eagles',
    awayTeam: 'Condors',
    seasonId: 'season_2',
    tournamentId: null, // GameData.tournamentId is string | null
  };

  // This collection will store GameData objects for test consistency here
  const mockSavedGames: Record<string, GameData> = {
    'game_123': mockGame1_gameData,
    'game_456': mockGame2_gameData,
  };

  beforeEach(() => {
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.clear.mockReset();
    localStorageMock.removeItem.mockReset();
    localStorageMock.key.mockReset();
  });

  describe('getSavedGames', () => {
    it('should return an empty object if no games are stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      expect(getSavedGames()).toEqual({});
    });

    it('should return the games (as GameData collection) if they exist', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
      // getSavedGames is typed to return SavedGamesCollection (from app/page, likely Record<string, AppState>)
      // However, the functions in savedGames.ts like getGame return GameData.
      // For this test, we are checking the raw parsing. If getSavedGames is strictly AppState, this test would need adjustment.
      // Given the internal usage, we'll assume it effectively returns a collection of GameData-like objects.
      expect(getSavedGames()).toEqual(mockSavedGames);
    });

    it('should handle invalid JSON and console error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue('invalid json');
      expect(getSavedGames()).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error getting saved games'), expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('getGame', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });
    it('should return the requested game as GameData if it exists', () => {
      expect(getGame('game_123')).toEqual(mockGame1_gameData);
    });
    it('should return null if game does not exist', () => {
      expect(getGame('nonexistent_game')).toBeNull();
    });
  });

  describe('saveGames', () => {
    it('should save a GameData collection to localStorage', () => {
      // saveGames expects SavedGamesCollection (Record<string, AppState>)
      // For this test, we'll pass our GameData collection and assume the function handles it
      // (or the types need to be aligned upstream).
      saveGames(mockSavedGames as any); // Cast to any to bypass strict AppState typing if needed for test
      expect(localStorageMock.setItem).toHaveBeenCalledWith(SAVED_GAMES_KEY, JSON.stringify(mockSavedGames));
    });

    it('should handle localStorage errors during saveGames', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Storage quota exceeded');
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = jest.fn(() => { throw error; });
      saveGames(mockSavedGames as any);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error saving games'), error);
      localStorageMock.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });

  describe('saveGame', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });
    it('should add a new game (as GameData) to localStorage', () => {
      const newGame: GameData = { id: 'game_789', ...mockBaseGameData, homeTeam: 'Wolves' };
      const result = saveGame('game_789', newGame);
      expect(result).toEqual(newGame);
      const savedCollection = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedCollection['game_789']).toEqual(newGame);
    });
    it('should update an existing game (as GameData)', () => {
      const updatedGame: GameData = { ...mockGame1_gameData, homeTeam: 'Updated Dragons' };
      const result = saveGame('game_123', updatedGame);
      expect(result).toEqual(updatedGame);
      const savedCollection = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedCollection['game_123']).toEqual(updatedGame);
    });
     it('should return null if gameId is empty', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = saveGame('', mockGame1_gameData);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error saving game:'), expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('deleteGame', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });
    it('should delete the game and return true', () => {
      expect(deleteGame('game_123')).toBe(true);
      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(saved['game_123']).toBeUndefined();
      expect(saved['game_456']).toEqual(mockGame2_gameData);
    });
     it('should return false if game to delete is not found', () => {
      expect(deleteGame('nonexistent_id')).toBe(false);
    });
  });

  describe('createGame', () => {
    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(1234567890123);
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });
    afterEach(() => { jest.restoreAllMocks(); });

    it('should create a new game with provided GameData partial', () => {
      const initialGameData: Partial<GameData> = { homeTeam: 'New Team FC', seasonId: 'season_2077' };
      const result = createGame(initialGameData);
      expect(result).not.toBeNull();
      expect(result?.gameId).toBe('game_1234567890123');
      expect(result?.gameData.homeTeam).toBe('New Team FC');
      expect(result?.gameData.seasonId).toBe('season_2077');
      expect(result?.gameData.awayTeam).toBe('Away Team'); // Default from createGame
    });
  });

  describe('addGameEvent', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });
    it('should add an event to a game', () => {
      const newEvent: TestGameEvent = { id: 'event_add', type: 'goal', scorerId: 'player_new', time: 100 };
      const result = addGameEvent('game_123', newEvent as any); // Cast as any if TestGameEvent isn't exactly GameEventData
      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.events.length).toBe(mockGame1_gameData.events.length + 1);
      expect(result.events.find(e => e.id === 'event_add')).toEqual(expect.objectContaining(newEvent));
    });
  });

  describe('updateGameEvent', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });
    it('should update an event in a game', () => {
      const eventToUpdate = mockGame1_gameData.events[0];
      const changes: Partial<TestGameEvent> = { time: 9999, type: 'opponentGoal' };
      const updatedEventData = { ...eventToUpdate, ...changes } as TestGameEvent;
      const result = updateGameEvent('game_123', 0, updatedEventData as any);
      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.events[0]).toEqual(expect.objectContaining(updatedEventData));
    });
  });

  describe('removeGameEvent', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
    });
    it('should remove an event from a game', () => {
      const initialEventCount = mockGame1_gameData.events.length;
      const eventIdToRemove = mockGame1_gameData.events[0].id;
      const result = removeGameEvent('game_123', 0);
      expect(result).not.toBeNull();
      if (!result) return;
      expect(result.events.length).toBe(initialEventCount - 1);
      expect(result.events.find(e => e.id === eventIdToRemove)).toBeUndefined();
    });
  });

  describe('exportGamesAsJson', () => {
    it('should export GameData collection as formatted JSON string', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGames));
      const result = exportGamesAsJson();
      expect(result).toEqual(JSON.stringify(mockSavedGames, null, 2));
    });
  });

  describe('importGamesFromJson', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ 'existing_game_id': mockGame1_gameData }));
    });
    it('should import games (as GameData) and merge with existing if overwrite is false', () => {
      const gamesToImport: Record<string, GameData> = {
        'imported_1': { ...mockGame2_gameData, id: 'imported_1' },
      };
      const jsonData = JSON.stringify(gamesToImport);
      const result = importGamesFromJson(jsonData, false);
      expect(result).toBe(1);
      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(saved['existing_game_id']).toEqual(mockGame1_gameData);
      expect(saved['imported_1']).toEqual(gamesToImport['imported_1']);
    });
    it('should import games (as GameData) and overwrite existing if overwrite is true', () => {
      const gamesToImport: Record<string, GameData> = {
        'imported_1': { ...mockGame2_gameData, id: 'imported_1' },
        'existing_game_id': { ...mockGame1_gameData, homeTeam: 'Overwritten Team' },
      };
      const jsonData = JSON.stringify(gamesToImport);
      const result = importGamesFromJson(jsonData, true);
      expect(result).toBe(2);
      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(saved).toEqual(gamesToImport);
    });
  });
}); 