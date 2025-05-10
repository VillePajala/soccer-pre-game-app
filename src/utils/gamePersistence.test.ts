import {
  SAVED_GAMES_KEY,
  APP_SETTINGS_KEY,
  DEFAULT_GAME_ID,
  // We need to import AppState and SavedGamesCollection for type safety in tests,
  // even if they are defined in page.tsx. Consider moving to a shared types file.
  type AppState,
  type SavedGamesCollection,
} from '../app/page'; 

import {
  getAllSavedGames,
  getGameById,
  saveGame,
  deleteGame,
  saveAllGames,
  getCurrentGameIdSetting,
  saveCurrentGameIdSetting,
  performHardReset,
} from './gamePersistence';

// Mock localStorage
let store: Record<string, string> = {};
const localStorageMock = (() => {
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock console.error and console.warn to prevent output during tests and allow assertions
let consoleErrorSpy: jest.SpyInstance;
let consoleWarnSpy: jest.SpyInstance;
let consoleLogSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  localStorageMock.clear(); // Clear localStorage mock before each test
  store = {}; // Also reset our internal store mock
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  consoleLogSpy.mockRestore();
});

// Sample AppState for testing (minimalistic)
const sampleGame1: AppState = {
  teamName: 'Team A',
  opponentName: 'Opponent A',
  gameDate: '2024-01-01',
  // Add other required AppState fields with minimal valid values
  playersOnField: [],
  opponents: [],
  drawings: [],
  availablePlayers: [],
  showPlayerNames: true,
  gameEvents: [],
  homeScore: 0,
  awayScore: 0,
  gameNotes: '',
  homeOrAway: 'home',
  numberOfPeriods: 2,
  periodDurationMinutes: 10,
  currentPeriod: 1,
  gameStatus: 'notStarted',
  selectedPlayerIds: [],
  seasonId: '',
  tournamentId: '',
};

const sampleGame2: AppState = {
  teamName: 'Team B',
  opponentName: 'Opponent B',
  gameDate: '2024-01-02',
  // Add other required AppState fields
  playersOnField: [],
  opponents: [],
  drawings: [],
  availablePlayers: [],
  showPlayerNames: true,
  gameEvents: [],
  homeScore: 0,
  awayScore: 0,
  gameNotes: '',
  homeOrAway: 'home',
  numberOfPeriods: 2,
  periodDurationMinutes: 10,
  currentPeriod: 1,
  gameStatus: 'notStarted',
  selectedPlayerIds: [],
  seasonId: '',
  tournamentId: '',
};

describe('Game Persistence Utilities', () => {
  describe('getAllSavedGames', () => {
    it('should return an empty object if no games are saved', () => {
      expect(getAllSavedGames()).toEqual({});
    });

    it('should return all saved games', () => {
      const games: SavedGamesCollection = { g1: sampleGame1, g2: sampleGame2 };
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(games));
      expect(getAllSavedGames()).toEqual(games);
    });

    it('should return an empty object and log error if localStorage data is invalid JSON', () => {
      localStorage.setItem(SAVED_GAMES_KEY, 'invalid-json');
      expect(getAllSavedGames()).toEqual({});
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('getGameById', () => {
    it('should return null if the game ID does not exist', () => {
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify({ g1: sampleGame1 }));
      expect(getGameById('nonexistent')).toBeNull();
    });

    it('should return the game state for the given ID', () => {
      const games: SavedGamesCollection = { g1: sampleGame1, g2: sampleGame2 };
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(games));
      expect(getGameById('g1')).toEqual(sampleGame1);
    });

    it('should return null if localStorage contains invalid JSON', () => {
      localStorage.setItem(SAVED_GAMES_KEY, 'invalid-json');
      expect(getGameById('g1')).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled(); // For getAllSavedGames
      // expect(consoleErrorSpy).toHaveBeenCalledTimes(1); // Potentially 2 if getGameById also logs
    });
  });

  describe('saveGame', () => {
    it('should add a new game if it does not exist', () => {
      saveGame('g1', sampleGame1);
      const games = JSON.parse(localStorage.getItem(SAVED_GAMES_KEY)!);
      expect(games.g1).toEqual(sampleGame1);
    });

    it('should overwrite an existing game', () => {
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify({ g1: sampleGame1 }));
      const updatedGame1 = { ...sampleGame1, teamName: 'Team A Updated' };
      saveGame('g1', updatedGame1);
      const games = JSON.parse(localStorage.getItem(SAVED_GAMES_KEY)!);
      expect(games.g1).toEqual(updatedGame1);
    });
    
    it('should log an error if JSON.stringify fails', () => {
      localStorageMock.setItem.mockClear(); // Clear calls specifically for setItem before this test action
      const stringifySpy = jest.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
        throw new Error('Simulated JSON.stringify error');
      });
      saveGame('g_stringify_error', sampleGame1);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('Error saving game g_stringify_error');
      // Now this assertion should be accurate for the setItem call *within this specific saveGame execution*
      expect(localStorageMock.setItem).not.toHaveBeenCalled(); 
      stringifySpy.mockRestore(); // Important to restore the original JSON.stringify
    });

    it('should handle localStorage quota exceeded (mocked scenario)', () => {
        localStorageMock.setItem.mockImplementationOnce(() => {
            throw new Error('QuotaExceededError');
        });
        saveGame('g_quota', sampleGame1);
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(consoleErrorSpy.mock.calls[0][0]).toContain('Error saving game g_quota');
    });
  });

  describe('deleteGame', () => {
    it('should do nothing and warn if the game ID does not exist', () => {
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify({ g1: sampleGame1 }));
      deleteGame('nonexistent');
      const games = JSON.parse(localStorage.getItem(SAVED_GAMES_KEY)!);
      expect(games.g1).toEqual(sampleGame1);
      expect(games.nonexistent).toBeUndefined();
      expect(consoleWarnSpy).toHaveBeenCalledWith('Game with ID nonexistent not found for deletion.');
    });

    it('should delete the game with the given ID', () => {
      const games: SavedGamesCollection = { g1: sampleGame1, g2: sampleGame2 };
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(games));
      deleteGame('g1');
      const remainingGames = JSON.parse(localStorage.getItem(SAVED_GAMES_KEY)!);
      expect(remainingGames.g1).toBeUndefined();
      expect(remainingGames.g2).toEqual(sampleGame2);
    });
  });

  describe('saveAllGames', () => {
    it('should save the entire collection, overwriting existing games', () => {
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify({ g_old: sampleGame1 }));
      const newCollection: SavedGamesCollection = { g_new1: sampleGame1, g_new2: sampleGame2 };
      saveAllGames(newCollection);
      const games = JSON.parse(localStorage.getItem(SAVED_GAMES_KEY)!);
      expect(games).toEqual(newCollection);
      expect(games.g_old).toBeUndefined();
    });
  });

  describe('getCurrentGameIdSetting', () => {
    it('should return DEFAULT_GAME_ID if no settings are saved', () => {
      expect(getCurrentGameIdSetting()).toBe(DEFAULT_GAME_ID);
    });

    it('should return DEFAULT_GAME_ID if settings are invalid JSON', () => {
      localStorage.setItem(APP_SETTINGS_KEY, 'invalid-json');
      expect(getCurrentGameIdSetting()).toBe(DEFAULT_GAME_ID);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should return DEFAULT_GAME_ID if currentGameId is not in settings', () => {
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ otherSetting: 'value' }));
      expect(getCurrentGameIdSetting()).toBe(DEFAULT_GAME_ID);
    });

    it('should return the saved currentGameId', () => {
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ currentGameId: 'customGameId' }));
      expect(getCurrentGameIdSetting()).toBe('customGameId');
    });
  });

  describe('saveCurrentGameIdSetting', () => {
    it('should save the given game ID to app settings', () => {
      saveCurrentGameIdSetting('myGameId');
      const settings = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY)!);
      expect(settings.currentGameId).toBe('myGameId');
    });

    it('should save DEFAULT_GAME_ID if null is passed', () => {
      saveCurrentGameIdSetting(null);
      const settings = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY)!);
      expect(settings.currentGameId).toBe(DEFAULT_GAME_ID);
    });
  });

  describe('performHardReset', () => {
    it('should remove saved games and app settings from localStorage', () => {
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify({ g1: sampleGame1 }));
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ currentGameId: 'g1' }));
      performHardReset();
      expect(localStorage.getItem(SAVED_GAMES_KEY)).toBeNull();
      expect(localStorage.getItem(APP_SETTINGS_KEY)).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalledWith('Hard reset performed: Cleared saved games and app settings from localStorage.');
    });

    it('should not throw if keys do not exist', () => {
      expect(() => performHardReset()).not.toThrow();
      expect(consoleLogSpy).toHaveBeenCalledWith('Hard reset performed: Cleared saved games and app settings from localStorage.');
    });
  });
}); 