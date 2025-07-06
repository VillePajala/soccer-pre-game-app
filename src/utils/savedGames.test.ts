import type { Player } from '@/types';
// Import AppState and other necessary types from @/types
import type { 
  AppState, 
  SavedGamesCollection, 
  GameEvent as PageGameEvent 
  // Point, // Removed unused import
  // Opponent, // Removed unused import
  // IntervalLog // Removed unused import
} from '@/types';
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
  getLatestGameId,
  // GameData, // No longer importing GameData for test mocks, using AppState
} from './savedGames';
import { SAVED_GAMES_KEY } from '@/config/storageKeys';

// TestGameEvent is no longer needed, use PageGameEvent directly

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
  const mockPlayer2: Player = { id: 'player_2', name: 'Jane', jerseyNumber: '5', isGoalie: true, receivedFairPlayCard: false, notes: 'Goalie' };

  const mockEvent1: PageGameEvent = { id: 'event_1', type: 'goal', scorerId: 'player_1', time: 1234567890 };
  const mockEvent2: PageGameEvent = { id: 'event_2', type: 'periodEnd', time: 1234568890 };

  // Base AppState structure for re-use (ensure all AppState fields are covered)
  const mockBaseAppState: AppState = {
    playersOnField: [],
    opponents: [],
    drawings: [],
    availablePlayers: [mockPlayer1, mockPlayer2],
    showPlayerNames: true,
    teamName: 'Dragons',
    gameEvents: [mockEvent1],
    opponentName: 'Tigers',
    gameDate: '2023-04-15T14:00:00.000Z',
    homeScore: 1,
    awayScore: 0,
    gameNotes: 'Game notes',
    homeOrAway: 'home',
    numberOfPeriods: 2,
    periodDurationMinutes: 10,
    currentPeriod: 1,
    gameStatus: 'inProgress',
    selectedPlayerIds: ['player_1'],
    seasonId: 'season_1',
    tournamentId: 'tournament_1',
    gameLocation: 'Stadium A',
    gameTime: '14:00',
    subIntervalMinutes: 5,
    completedIntervalDurations: [],
    lastSubConfirmationTimeSeconds: 0,
  };

  const mockGame1_AppState: AppState = {
    ...mockBaseAppState, // Spread base and then override specifics if any for game 1
    // No specific overrides for game1 from mockBaseAppState needed for this example
  };

  const mockGame2_AppState: AppState = {
    ...mockBaseAppState,
    teamName: 'Eagles', // Was homeTeam
    opponentName: 'Condors', // Was awayTeam
    gameEvents: [mockEvent2],
      seasonId: 'season_2',
    tournamentId: '', // AppState.tournamentId is string, use '' for empty
    homeScore: 0,
    awayScore: 2,
  };

  const mockSavedGamesCollection: SavedGamesCollection = {
    'game_123': mockGame1_AppState,
    'game_456': mockGame2_AppState,
  };

  beforeEach(() => {
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.clear.mockReset();
    localStorageMock.removeItem.mockReset();
    localStorageMock.key.mockReset();
  });

  describe('getSavedGames', () => {
    it('should return an empty object if no games are stored', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      // getSavedGames now returns a Promise
      await expect(getSavedGames()).resolves.toEqual({});
    });

    it('should return the games (as AppState collection) if they exist', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
      // getSavedGames now returns a Promise<SavedGamesCollection>
      // The mockSavedGamesCollection is already Record<string, AppState>
      await expect(getSavedGames()).resolves.toEqual(mockSavedGamesCollection);
    });

    it('should handle invalid JSON and reject with an error', async () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      // Expect the promise to reject
      await expect(getSavedGames()).rejects.toThrow(); 
    });
  });

  describe('getGame', () => {
    beforeEach(() => {
      // This mock setup is for getSavedGames which getGame calls internally
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
    });
    it('should return the requested game as AppState if it exists', async () => {
      // getGame now returns a Promise<AppState | null>
      await expect(getGame('game_123')).resolves.toEqual(mockGame1_AppState);
    });
    it('should return null if game does not exist', async () => {
      await expect(getGame('nonexistent_game')).resolves.toBeNull();
    });
    it('should return null if gameId is empty', async () => {
      await expect(getGame('')).resolves.toBeNull();
    });
    // Test for localStorage error propagation if getSavedGames within getGame fails
    it('should reject if internal getSavedGames fails', async () => {
      localStorageMock.getItem.mockImplementation(() => { 
        throw new Error('LocalStorage failure'); 
      });
      await expect(getGame('game_123')).rejects.toThrow('LocalStorage failure');
    });
  });

  describe('saveGames', () => {
    it('should save a AppState collection to localStorage', async () => {
      // saveGames expects SavedGamesCollection (Record<string, AppState>) and returns Promise<void>
      await expect(saveGames(mockSavedGamesCollection)).resolves.toBeUndefined(); // Promise<void> resolves to undefined
      expect(localStorageMock.setItem).toHaveBeenCalledWith(SAVED_GAMES_KEY, JSON.stringify(mockSavedGamesCollection));
    });

    it('should handle localStorage errors during saveGames and reject', async () => {
      const error = new Error('Storage quota exceeded');
      localStorageMock.setItem.mockImplementation(() => { 
        throw error; 
      });
      // saveGames now rejects on error
      await expect(saveGames(mockSavedGamesCollection)).rejects.toThrow('Storage quota exceeded');
    });
  });

  describe('saveGame', () => {
    beforeEach(() => {
      // Mock for the internal getSavedGames call
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
      // Clear setItem mock for each test to check its specific call
      localStorageMock.setItem.mockReset(); 
    });
    it('should add a new game (as AppState) to localStorage and resolve with the game', async () => {
      const newGameId = 'game_789';
      // Ensure newGame is a complete AppState
      const newGame: AppState = { 
        ...mockBaseAppState, 
        teamName: 'Wolves', 
        // any other AppState specific fields for this new game if different from base
        // For this test, assume teamName is the main difference for identification.
        // gameId is not part of AppState, it's the key.
      };
      
      // saveGame now returns Promise<AppState>
      await expect(saveGame(newGameId, newGame)).resolves.toEqual(newGame);
      
      // Verify localStorage.setItem was called correctly
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const savedCollection = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedCollection[newGameId]).toEqual(newGame);
      // Ensure other games are preserved using their known IDs
      expect(savedCollection['game_123']).toEqual(mockGame1_AppState); // Use known ID 'game_123' for mockGame1_AppState
      expect(savedCollection['game_456']).toEqual(mockGame2_AppState); // Use known ID 'game_456' for mockGame2_AppState
    });

    it('should update an existing game (as AppState) and resolve with the updated game', async () => {
      const gameIdToUpdate = 'game_123'; // Assuming this ID exists from mockGame1_AppState
      const updatedGame: AppState = { ...mockGame1_AppState, teamName: 'Updated Dragons' };
      
      await expect(saveGame(gameIdToUpdate, updatedGame)).resolves.toEqual(updatedGame);
      
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const savedCollection = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedCollection[gameIdToUpdate]).toEqual(updatedGame);
    });

     it('should reject if gameId is empty', async () => {
      await expect(saveGame('', mockGame1_AppState)).rejects.toThrow('Game ID is required');
    });

    it('should reject if internal getSavedGames fails', async () => {
      localStorageMock.getItem.mockImplementation(() => { 
        throw new Error('LocalStorage failure'); 
      });
      await expect(saveGame('game_123', mockGame1_AppState)).rejects.toThrow('LocalStorage failure');
    });

    it('should reject if internal saveGames fails', async () => {
      localStorageMock.setItem.mockImplementation(() => { 
        throw new Error('LocalStorage set failure'); 
      });
      await expect(saveGame('game_123', mockGame1_AppState)).rejects.toThrow('LocalStorage set failure');
    });
  });

  describe('deleteGame', () => {
    beforeEach(() => {
      // Mock for the internal getSavedGames and saveGames calls
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
      localStorageMock.setItem.mockReset(); // Reset setItem to check its call for delete
    });
    it('should delete the game and return the gameId', async () => {
      // deleteGame now returns Promise<string | null>
      await expect(deleteGame('game_123')).resolves.toBe('game_123');
      
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const savedCollection = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedCollection['game_123']).toBeUndefined();
      expect(savedCollection['game_456']).toEqual(mockGame2_AppState);
    });

     it('should return null if game to delete is not found', async () => {
      await expect(deleteGame('nonexistent_id')).resolves.toBe(null);
      // setItem should not have been called if the game wasn't found for deletion
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should return null if gameId is empty', async () => {
      await expect(deleteGame('')).resolves.toBe(null);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should reject if internal getSavedGames fails', async () => {
      localStorageMock.getItem.mockImplementation(() => { 
        throw new Error('LocalStorage failure'); 
      });
      await expect(deleteGame('game_123')).rejects.toThrow('LocalStorage failure');
    });

    it('should reject if internal saveGames (after delete) fails', async () => {
      localStorageMock.setItem.mockImplementation(() => { 
        throw new Error('LocalStorage set failure after delete'); 
      });
      await expect(deleteGame('game_123')).rejects.toThrow('LocalStorage set failure after delete');
    });
  });

  describe('createGame', () => {
    const mockDateNow = 1234567890123;
    const expectedNewGameId = `game_${mockDateNow}`;

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);
      // Mock for internal getSavedGames and saveGames calls
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection)); 
      localStorageMock.setItem.mockReset();
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create a new game with provided AppState partial, save it, and resolve with ID and data', async () => {
      const initialGamePartial: Partial<AppState> = { teamName: 'New Team FC', seasonId: 'season_2077' };
      
      // createGame resolves to { gameId: string, gameData: AppState }
      const result = await createGame(initialGamePartial);
      
      expect(result).not.toBeNull();
      expect(result.gameId).toBe(expectedNewGameId);
      expect(result.gameData.teamName).toBe('New Team FC');
      expect(result.gameData.seasonId).toBe('season_2077');
      // Check some default fields from AppState that createGame sets
      expect(result.gameData.opponentName).toBe('Opponent'); // Default from createGame via AppState structure
      expect(result.gameData.gameStatus).toBe('notStarted');

      // Verify it was saved to localStorage
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const savedCollection = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedCollection[expectedNewGameId]).toEqual(result.gameData);
    });

    it('should use full AppState defaults for unspecified fields', async () => {
      const minimalInitialData: Partial<AppState> = { teamName: 'Minimal FC' };
      const result = await createGame(minimalInitialData);
      
      expect(result.gameData.teamName).toBe('Minimal FC');
      // Check a few AppState defaults
      expect(result.gameData.playersOnField).toEqual([]);
      expect(result.gameData.opponents).toEqual([]);
      expect(result.gameData.availablePlayers).toEqual([]); // Default from AppState in createGame
      expect(result.gameData.showPlayerNames).toBe(true);
      expect(result.gameData.homeOrAway).toBe('home');
      expect(result.gameData.numberOfPeriods).toBe(2);
      expect(result.gameData.periodDurationMinutes).toBe(10);
      expect(result.gameData.subIntervalMinutes).toBe(5);
    });

    it('should reject if internal saveGame fails', async () => {
      localStorageMock.setItem.mockImplementation(() => { 
        throw new Error('LocalStorage set failure during create'); 
      });
      const initialGamePartial: Partial<AppState> = { teamName: 'Fail Team' };
      
      await expect(createGame(initialGamePartial)).rejects.toThrow('LocalStorage set failure during create');
    });
  });

  describe('addGameEvent', () => {
    beforeEach(() => {
      // Mock for getGame and saveGame internals
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
      localStorageMock.setItem.mockReset();
    });

    it('should add an event to a game and resolve with the updated AppState', async () => {
      const newEvent: PageGameEvent = { id: 'event_add', type: 'goal', scorerId: 'player_new', time: 100 };
      
      // addGameEvent now returns Promise<AppState | null>
      const result = await addGameEvent('game_123', newEvent);
      
      expect(result).not.toBeNull();
      if (!result) return; // Type guard

      expect(result.gameEvents.length).toBe(mockGame1_AppState.gameEvents.length + 1);
      expect(result.gameEvents.find((e: PageGameEvent) => e.id === 'event_add')).toEqual(expect.objectContaining(newEvent));
      
      // Verify localStorage.setItem was called correctly by the internal saveGame
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const savedCollection = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedCollection['game_123'].gameEvents.length).toBe(mockGame1_AppState.gameEvents.length + 1);
    });

    it('should resolve with null if game is not found', async () => {
      await expect(addGameEvent('nonexistent_game', mockEvent1)).resolves.toBeNull();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should reject if internal getGame fails', async () => {
      localStorageMock.getItem.mockImplementation(() => { 
        throw new Error('LocalStorage get failure'); 
      });
      await expect(addGameEvent('game_123', mockEvent1)).rejects.toThrow('LocalStorage get failure');
    });

    it('should reject if internal saveGame fails', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
      localStorageMock.setItem.mockImplementation(() => { 
        throw new Error('LocalStorage set failure'); 
      });

      try {
        await addGameEvent('game_123', mockEvent1);
        throw new Error('addGameEvent did not reject as expected');
      } catch (error) {
        expect((error as Error).message).toBe('LocalStorage set failure');
      }
    });
  });

  describe('updateGameEvent', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
      localStorageMock.setItem.mockReset();
    });

    it('should update an event in a game and resolve with the updated AppState', async () => {
      const eventToUpdate = mockGame1_AppState.gameEvents[0];
      const changes: Partial<PageGameEvent> = { time: 9999, type: 'opponentGoal' };
      const updatedEventData = { ...eventToUpdate, ...changes } as PageGameEvent; // Keep cast if changes are Partial
      
      // updateGameEvent now returns Promise<AppState | null>
      const result = await updateGameEvent('game_123', 0, updatedEventData);
      
      expect(result).not.toBeNull();
      if (!result) return; // Type guard

      expect(result.gameEvents[0]).toEqual(expect.objectContaining(updatedEventData));
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const savedCollection = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedCollection['game_123'].gameEvents[0]).toEqual(updatedEventData);
    });

    it('should resolve with null if game is not found', async () => {
      const eventData: PageGameEvent = { ...mockEvent1, time: 123 };
      await expect(updateGameEvent('nonexistent_game', 0, eventData)).resolves.toBeNull();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should resolve with null if event index is out of bounds', async () => {
      const eventData: PageGameEvent = { ...mockEvent1, time: 456 };
      await expect(updateGameEvent('game_123', 99, eventData)).resolves.toBeNull(); // Index 99 is out of bounds
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should reject if internal getGame fails', async () => {
      localStorageMock.getItem.mockImplementation(() => { 
        throw new Error('LocalStorage get failure'); 
      });
      await expect(updateGameEvent('game_123', 0, mockEvent1)).rejects.toThrow('LocalStorage get failure');
    });

    it('should reject if internal saveGame fails', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
      localStorageMock.setItem.mockImplementation(() => { 
        throw new Error('LocalStorage set failure'); 
      });
      const eventData: PageGameEvent = { ...mockEvent1, time: 101112 };

      try {
        await updateGameEvent('game_123', 0, eventData);
        throw new Error('updateGameEvent did not reject as expected');
      } catch (error) {
        expect((error as Error).message).toBe('LocalStorage set failure');
      }
    });
  });

  describe('removeGameEvent', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
      localStorageMock.setItem.mockReset();
    });

    it('should remove an event from a game and resolve with the updated AppState', async () => {
      const initialEventCount = mockGame1_AppState.gameEvents.length;
      const eventIdToRemove = mockGame1_AppState.gameEvents[0].id;
      
      // removeGameEvent now returns Promise<AppState | null>
      const result = await removeGameEvent('game_123', 0);
      
      expect(result).not.toBeNull();
      if (!result) return; // Type guard

      expect(result.gameEvents.length).toBe(initialEventCount - 1);
      expect(result.gameEvents.find((e: PageGameEvent) => e.id === eventIdToRemove)).toBeUndefined();

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const savedCollection = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedCollection['game_123'].gameEvents.length).toBe(initialEventCount - 1);
    });

    it('should resolve with null if game is not found', async () => {
      await expect(removeGameEvent('nonexistent_game', 0)).resolves.toBeNull();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should resolve with null if event index is out of bounds', async () => {
      await expect(removeGameEvent('game_123', 99)).resolves.toBeNull(); // Index 99 is out of bounds
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should reject if internal getGame fails', async () => {
      localStorageMock.getItem.mockImplementation(() => { 
        throw new Error('LocalStorage get failure'); 
      });
      await expect(removeGameEvent('game_123', 0)).rejects.toThrow('LocalStorage get failure');
    });

    it('should reject if internal saveGame fails', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection)); 
      localStorageMock.setItem.mockImplementation(() => { 
        throw new Error('LocalStorage set failure'); 
      });
      
      try {
        await removeGameEvent('game_123', 0);
        throw new Error('removeGameEvent did not reject as expected');
      } catch (error) {
        expect((error as Error).message).toBe('LocalStorage set failure');
      }
    });
  });

  describe('exportGamesAsJson', () => {
    it('should export AppState collection as formatted JSON string', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
      // exportGamesAsJson now returns Promise<string | null>
      const result = await exportGamesAsJson();
      expect(result).toEqual(JSON.stringify(mockSavedGamesCollection, null, 2));
    });

    it('should resolve to null if no games are stored', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({}));
      await expect(exportGamesAsJson()).resolves.toBeNull();
    });

    it('should resolve to null if localStorage returns null', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      await expect(exportGamesAsJson()).resolves.toBeNull();
    });

    it('should reject if internal getSavedGames fails', async () => {
      localStorageMock.getItem.mockImplementation(() => { 
        throw new Error('LocalStorage failure'); 
      });
      await expect(exportGamesAsJson()).rejects.toThrow('LocalStorage failure');
    });
  });

  describe('importGamesFromJson', () => {
    beforeEach(() => {
      // Mock initial localStorage state for import tests
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ 'existing_game_id': mockGame1_AppState }));
      localStorageMock.setItem.mockReset();
    });

    it('should import games (as AppState) and merge with existing if overwrite is false, then resolve with count', async () => {
      const gamesToImport: SavedGamesCollection = {
        'imported_1': { ...mockGame2_AppState }, // Ensure it's a valid AppState
      };
      const jsonData = JSON.stringify(gamesToImport);
      
      // importGamesFromJson now returns Promise<number>
      await expect(importGamesFromJson(jsonData, false)).resolves.toBe(1);
      
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(saved['existing_game_id']).toEqual(mockGame1_AppState);
      expect(saved['imported_1']).toEqual(gamesToImport['imported_1']);
    });

    it('should import games (as AppState) and overwrite existing if overwrite is true, then resolve with count', async () => {
      const gamesToImport: SavedGamesCollection = {
        'imported_1': { ...mockGame2_AppState },
        'existing_game_id': { ...mockGame1_AppState, teamName: 'Overwritten Team' },
      };
      const jsonData = JSON.stringify(gamesToImport);
      
      await expect(importGamesFromJson(jsonData, true)).resolves.toBe(2);
      
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const saved = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(saved).toEqual(expect.objectContaining(gamesToImport));
    });

    it('should resolve with 0 if JSON is valid but contains no new games to import (overwrite false)', async () => {
      const gamesToImport: SavedGamesCollection = {
        'existing_game_id': mockGame1_AppState, // Game that already exists
      };
      const jsonData = JSON.stringify(gamesToImport);
      await expect(importGamesFromJson(jsonData, false)).resolves.toBe(0);
      expect(localStorageMock.setItem).not.toHaveBeenCalled(); // setItem shouldn't be called if no new games are added
    });

    it('should reject if JSON data is invalid', async () => {
      const invalidJsonData = 'invalid-json';
      await expect(importGamesFromJson(invalidJsonData, false)).rejects.toThrow();
    });

    it('should reject if internal getSavedGames fails', async () => {
      localStorageMock.getItem.mockImplementation(() => { 
        throw new Error('LocalStorage get failure'); 
      });
      const gamesToImport: SavedGamesCollection = { 'new_game': mockGame2_AppState };
      const jsonData = JSON.stringify(gamesToImport);
      await expect(importGamesFromJson(jsonData, false)).rejects.toThrow('LocalStorage get failure');
    });

    it('should reject if internal saveGames fails during import', async () => {
      // getSavedGames works initially
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ 'existing_game_id': mockGame1_AppState }));
      // But setItem (for saveGames) fails
      localStorageMock.setItem.mockImplementation(() => { 
        throw new Error('LocalStorage set failure during import'); 
      });
      const gamesToImport: SavedGamesCollection = { 'new_game': mockGame2_AppState };
      const jsonData = JSON.stringify(gamesToImport);
      await expect(importGamesFromJson(jsonData, false)).rejects.toThrow('LocalStorage set failure during import');
    });

  });

  describe('getAllGameIds', () => {
    it('should return an array of all game IDs', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
      // getAllGameIds now returns Promise<string[]>
      const ids = await getAllGameIds();
      expect(ids).toEqual(expect.arrayContaining(['game_123', 'game_456']));
      expect(ids.length).toBe(Object.keys(mockSavedGamesCollection).length);
    });

    it('should return an empty array if no games are stored', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({}));
      await expect(getAllGameIds()).resolves.toEqual([]);
    });

    it('should return an empty array if localStorage returns null', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      await expect(getAllGameIds()).resolves.toEqual([]);
    });

    it('should reject if internal getSavedGames fails', async () => {
      localStorageMock.getItem.mockImplementation(() => { 
        throw new Error('LocalStorage failure'); 
      });
      await expect(getAllGameIds()).rejects.toThrow('LocalStorage failure');
    });
  });

  describe('getFilteredGames', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
    });

    it('should return all games if no filters are provided', async () => {
      const result = await getFilteredGames({});
      expect(result.length).toBe(2);
      expect(result).toEqual(expect.arrayContaining([
        ['game_123', mockGame1_AppState],
        ['game_456', mockGame2_AppState],
      ]));
    });

    it('should filter games by seasonId', async () => {
      const result = await getFilteredGames({ seasonId: 'season_1' });
      expect(result.length).toBe(1);
      expect(result[0][0]).toBe('game_123');
      expect(result[0][1]).toEqual(mockGame1_AppState);
    });

    it('should filter games by tournamentId (even if empty string for no tournament)', async () => {
      // mockGame2_AppState has tournamentId: ''
      const result = await getFilteredGames({ tournamentId: '' });
      expect(result.length).toBe(1);
      expect(result[0][0]).toBe('game_456');
      expect(result[0][1]).toEqual(mockGame2_AppState);
    });

    it('should filter games by both seasonId and tournamentId', async () => {
      const result = await getFilteredGames({ seasonId: 'season_1', tournamentId: 'tournament_1' });
      expect(result.length).toBe(1);
      expect(result[0][0]).toBe('game_123');
      expect(result[0][1]).toEqual(mockGame1_AppState);
    });

    it('should return an empty array if no games match the filter', async () => {
      const result = await getFilteredGames({ seasonId: 'non_existent_season' });
      expect(result.length).toBe(0);
    });

    it('should return an empty array if games collection is empty', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({}));
      const result = await getFilteredGames({ seasonId: 'season_1' });
      expect(result.length).toBe(0);
    });

    it('should reject if internal getSavedGames fails', async () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('LocalStorage get failure for filter');
      });
      await expect(getFilteredGames({ seasonId: 'season_1' })).rejects.toThrow('LocalStorage get failure for filter');
    });
  });

  describe('getLatestGameId', () => {
    it('should return the id of the newest game', () => {
      const id = getLatestGameId(mockSavedGamesCollection);
      expect(id).toBe('game_456');
    });

    it('should return null when collection is empty', () => {
      expect(getLatestGameId({})).toBeNull();
    });
  });

  describe('updateGameDetails', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection));
      localStorageMock.setItem.mockReset();
    });

    it('should update game details and resolve with the updated AppState', async () => {
      const gameIdToUpdate = 'game_123';
      const updates: Partial<Omit<AppState, 'id' | 'gameEvents'>> = {
        teamName: 'Super Dragons',
        opponentName: 'Mega Tigers',
        gameNotes: 'An epic battle!',
        homeScore: 5,
        awayScore: 4,
        seasonId: 'new_season_id'
      };

      const result = await updateGameDetails(gameIdToUpdate, updates);
      expect(result).not.toBeNull();
      if (!result) return; // Type guard

      expect(result.teamName).toBe('Super Dragons');
      expect(result.opponentName).toBe('Mega Tigers');
      expect(result.gameNotes).toBe('An epic battle!');
      expect(result.homeScore).toBe(5);
      expect(result.awayScore).toBe(4);
      expect(result.seasonId).toBe('new_season_id');
      // Ensure events were not touched
      expect(result.gameEvents).toEqual(mockGame1_AppState.gameEvents);

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      const savedCollection = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedCollection[gameIdToUpdate].teamName).toBe('Super Dragons');
    });

    it('should resolve with null if game to update is not found', async () => {
      const updates: Partial<AppState> = { teamName: 'Does Not Matter' };
      await expect(updateGameDetails('nonexistent_id', updates)).resolves.toBeNull();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should reject if internal getGame fails', async () => {
      localStorageMock.getItem.mockImplementation(() => { 
        throw new Error('LocalStorage get failure for update'); 
      });
      const updates: Partial<AppState> = { teamName: 'Still Matters Not' };
      await expect(updateGameDetails('game_123', updates)).rejects.toThrow('LocalStorage get failure for update');
    });

    it('should reject if internal saveGame (after update) fails', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedGamesCollection)); // For getGame
      localStorageMock.setItem.mockImplementation(() => { // For saveGame (which calls saveGames)
        throw new Error('LocalStorage set failure for update');
      });
      const updates: Partial<AppState> = { teamName: 'Yet Another Update' };

      try {
        await updateGameDetails('game_123', updates);
        throw new Error('updateGameDetails did not reject as expected');
      } catch (error) {
        expect((error as Error).message).toBe('LocalStorage set failure for update');
      }
    });
  });
}); 
