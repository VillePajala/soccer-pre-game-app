import { 
  AppState, 
  Player, 
  GameEvent,
  SavedGamesCollection
} from '@/app/page';

// Constants used in the app
const SAVED_GAMES_KEY = 'savedSoccerGames';
const APP_SETTINGS_KEY = 'soccerAppSettings';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    getStore: () => store // Helper to inspect the mock store
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Utility function to create a valid minimal game state for testing
function createValidGameState(overrides: Partial<AppState> = {}): AppState {
  return {
    playersOnField: [],
    opponents: [],
    drawings: [],
    availablePlayers: [],
    showPlayerNames: true,
    teamName: "Test Team",
    gameEvents: [],
    opponentName: "Test Opponent",
    gameDate: "2023-01-01",
    homeScore: 0,
    awayScore: 0,
    gameNotes: "",
    homeOrAway: 'home',
    numberOfPeriods: 2,
    periodDurationMinutes: 10,
    currentPeriod: 1,
    gameStatus: 'notStarted',
    selectedPlayerIds: [],
    seasonId: "",
    tournamentId: "",
    ...overrides
  };
}

// Utility function to validate a game state object
function validateGameState(gameState: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if gameState is an object
  if (typeof gameState !== 'object' || gameState === null) {
    return { isValid: false, errors: ['Game state must be an object'] };
  }

  // Check required string properties
  ['teamName', 'opponentName', 'gameDate'].forEach(prop => {
    if (typeof gameState[prop] !== 'string') {
      errors.push(`${prop} must be a string`);
    }
  });

  // Check required numeric properties
  ['homeScore', 'awayScore', 'currentPeriod', 'periodDurationMinutes'].forEach(prop => {
    if (typeof gameState[prop] !== 'number') {
      errors.push(`${prop} must be a number`);
    }
  });

  // Check arrays
  ['playersOnField', 'opponents', 'drawings', 'gameEvents', 'selectedPlayerIds'].forEach(prop => {
    if (!Array.isArray(gameState[prop])) {
      errors.push(`${prop} must be an array`);
    }
  });

  // Check homeOrAway is valid
  if (gameState.homeOrAway !== 'home' && gameState.homeOrAway !== 'away') {
    errors.push("homeOrAway must be either 'home' or 'away'");
  }

  // Check gameStatus is valid
  const validGameStatuses = ['notStarted', 'inProgress', 'periodEnd', 'gameEnd'];
  if (!validGameStatuses.includes(gameState.gameStatus)) {
    errors.push(`gameStatus must be one of: ${validGameStatuses.join(', ')}`);
  }

  // Check numberOfPeriods is valid
  if (gameState.numberOfPeriods !== 1 && gameState.numberOfPeriods !== 2) {
    errors.push("numberOfPeriods must be either 1 or 2");
  }

  return { isValid: errors.length === 0, errors };
}

// Simulate saving a game
function saveGame(gameState: AppState, gameId?: string): string {
  // Generate ID if not provided
  const savedGameId = gameId || `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  // Get existing games or initialize empty collection
  let savedGames: SavedGamesCollection = {};
  const existingGames = localStorage.getItem(SAVED_GAMES_KEY);
  
  if (existingGames) {
    try {
      savedGames = JSON.parse(existingGames);
    } catch (error) {
      console.error("Failed to parse saved games:", error);
      throw new Error("Failed to parse saved games data");
    }
  }
  
  // Add this game to the collection
  savedGames[savedGameId] = gameState;
  
  // Save back to localStorage
  localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(savedGames));
  
  // Update current game ID in settings
  const settings = { currentGameId: savedGameId };
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  
  return savedGameId;
}

// Simulate loading a game
function loadGame(gameId: string): AppState {
  const savedGames = localStorage.getItem(SAVED_GAMES_KEY);
  
  if (!savedGames) {
    throw new Error("No saved games found");
  }
  
  const gamesCollection: SavedGamesCollection = JSON.parse(savedGames);
  const game = gamesCollection[gameId];
  
  if (!game) {
    throw new Error(`Game with ID ${gameId} not found`);
  }
  
  return game;
}

// Simulate deleting a game
function deleteGame(gameId: string): void {
  const savedGames = localStorage.getItem(SAVED_GAMES_KEY);
  
  if (!savedGames) {
    throw new Error("No saved games found");
  }
  
  const gamesCollection: SavedGamesCollection = JSON.parse(savedGames);
  
  if (!gamesCollection[gameId]) {
    throw new Error(`Game with ID ${gameId} not found`);
  }
  
  delete gamesCollection[gameId];
  localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(gamesCollection));
  
  // Update settings if this was the current game
  const settingsJson = localStorage.getItem(APP_SETTINGS_KEY);
  if (settingsJson) {
    const settings = JSON.parse(settingsJson);
    if (settings.currentGameId === gameId) {
      settings.currentGameId = null;
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
    }
  }
}

describe('Game Data Validation', () => {
  it('should validate a complete valid game state', () => {
    const gameState = createValidGameState();
    const validation = validateGameState(gameState);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should invalidate a game state with missing required properties', () => {
    const incompleteState: any = {
      // Missing most required properties
      playersOnField: [],
      homeScore: 0,
      awayScore: 0
    };
    
    const validation = validateGameState(incompleteState);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors).toContain('teamName must be a string');
    expect(validation.errors).toContain('opponentName must be a string');
  });

  it('should invalidate a game state with incorrect property types', () => {
    const invalidState = createValidGameState({
      teamName: 123 as any, // Invalid type
      homeScore: "5" as any, // Invalid type
      playersOnField: {} as any // Invalid type
    });
    
    const validation = validateGameState(invalidState);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('teamName must be a string');
    expect(validation.errors).toContain('homeScore must be a number');
    expect(validation.errors).toContain('playersOnField must be an array');
  });

  it('should invalidate a game state with invalid enum values', () => {
    const invalidState = createValidGameState({
      homeOrAway: 'neutral' as any, // Invalid enum value
      gameStatus: 'paused' as any, // Invalid enum value
      numberOfPeriods: 3 as any // Invalid enum value
    });
    
    const validation = validateGameState(invalidState);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain("homeOrAway must be either 'home' or 'away'");
    expect(validation.errors).toContain("gameStatus must be one of: notStarted, inProgress, periodEnd, gameEnd");
    expect(validation.errors).toContain("numberOfPeriods must be either 1 or 2");
  });
});

describe('Game State Management', () => {
  beforeEach(() => {
    // Reset localStorage before each test
    localStorage.clear();
  });

  it('should save a valid game to localStorage', () => {
    const gameState = createValidGameState();
    const gameId = saveGame(gameState);
    
    // Verify game was saved
    const savedGamesJson = localStorage.getItem(SAVED_GAMES_KEY);
    expect(savedGamesJson).not.toBeNull();
    
    const savedGames = JSON.parse(savedGamesJson!);
    expect(savedGames[gameId]).toEqual(gameState);
    
    // Verify settings were updated
    const settingsJson = localStorage.getItem(APP_SETTINGS_KEY);
    expect(settingsJson).not.toBeNull();
    
    const settings = JSON.parse(settingsJson!);
    expect(settings.currentGameId).toBe(gameId);
  });

  it('should load a game from localStorage', () => {
    // First save a game
    const gameState = createValidGameState({ teamName: "Special Test Team" });
    const gameId = saveGame(gameState);
    
    // Now load it
    const loadedGame = loadGame(gameId);
    
    // Verify loaded data matches saved data
    expect(loadedGame).toEqual(gameState);
    expect(loadedGame.teamName).toBe("Special Test Team");
  });

  it('should delete a game from localStorage', () => {
    // First save a game
    const gameState = createValidGameState();
    const gameId = saveGame(gameState);
    
    // Verify it was saved
    const savedGamesBefore = JSON.parse(localStorage.getItem(SAVED_GAMES_KEY)!);
    expect(savedGamesBefore[gameId]).toBeTruthy();
    
    // Now delete it
    deleteGame(gameId);
    
    // Verify it was deleted
    const savedGamesAfter = JSON.parse(localStorage.getItem(SAVED_GAMES_KEY)!);
    expect(savedGamesAfter[gameId]).toBeUndefined();
    
    // Verify settings were updated
    const settings = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY)!);
    expect(settings.currentGameId).toBeNull();
  });

  it('should throw an error when loading a non-existent game', () => {
    expect(() => loadGame('non-existent-id')).toThrow("No saved games found");
    
    // Save a game so we have saved games but with different ID
    saveGame(createValidGameState());
    
    expect(() => loadGame('non-existent-id')).toThrow("Game with ID non-existent-id not found");
  });

  it('should throw an error when deleting a non-existent game', () => {
    expect(() => deleteGame('non-existent-id')).toThrow("No saved games found");
    
    // Save a game so we have saved games but with different ID
    saveGame(createValidGameState());
    
    expect(() => deleteGame('non-existent-id')).toThrow("Game with ID non-existent-id not found");
  });
});

describe('Game Data Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should maintain game state across save and load operations', () => {
    // Create a game with specific properties
    const originalGame = createValidGameState({
      teamName: "Persistence Test Team",
      opponentName: "Rival FC",
      homeScore: 3,
      awayScore: 2,
      gameEvents: [
        { 
          id: "goal1", 
          type: "goal", 
          time: 300, 
          scorerId: "player1" 
        }
      ] as GameEvent[],
      gameNotes: "Important test game"
    });
    
    // Save it
    const gameId = saveGame(originalGame);
    
    // Load it back
    const loadedGame = loadGame(gameId);
    
    // Verify all properties were preserved
    expect(loadedGame).toEqual(originalGame);
    expect(loadedGame.teamName).toBe("Persistence Test Team");
    expect(loadedGame.homeScore).toBe(3);
    expect(loadedGame.awayScore).toBe(2);
    expect(loadedGame.gameEvents).toHaveLength(1);
    expect(loadedGame.gameEvents[0].type).toBe("goal");
    expect(loadedGame.gameNotes).toBe("Important test game");
  });

  it('should save multiple games in localStorage', () => {
    // Save first game
    const game1 = createValidGameState({ teamName: "Team 1" });
    const id1 = saveGame(game1);
    
    // Save second game
    const game2 = createValidGameState({ teamName: "Team 2" });
    const id2 = saveGame(game2);
    
    // Verify both games are saved
    const savedGames = JSON.parse(localStorage.getItem(SAVED_GAMES_KEY)!);
    expect(Object.keys(savedGames)).toHaveLength(2);
    expect(savedGames[id1].teamName).toBe("Team 1");
    expect(savedGames[id2].teamName).toBe("Team 2");
    
    // Verify the current game is the last one saved
    const settings = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY)!);
    expect(settings.currentGameId).toBe(id2);
  });

  it('should update an existing game when saving with the same ID', () => {
    // Save initial version
    const originalGame = createValidGameState({ homeScore: 0, awayScore: 0 });
    const gameId = saveGame(originalGame);
    
    // Update and save with same ID
    const updatedGame = {...originalGame, homeScore: 2, awayScore: 1 };
    saveGame(updatedGame, gameId);
    
    // Load and verify
    const loadedGame = loadGame(gameId);
    expect(loadedGame.homeScore).toBe(2);
    expect(loadedGame.awayScore).toBe(1);
    
    // Check we only have one saved game
    const savedGames = JSON.parse(localStorage.getItem(SAVED_GAMES_KEY)!);
    expect(Object.keys(savedGames)).toHaveLength(1);
  });
}); 