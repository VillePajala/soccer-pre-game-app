import { IndexedDBProvider } from '../indexedDBProvider';
import type { Player, Season, Tournament, TimerState } from '../../../types';
import type { AppSettings } from '../../../utils/appSettings';

// Mock IndexedDB
class MockIDBDatabase {
  objectStoreNames = {
    contains: jest.fn(() => false)
  };
  createObjectStore = jest.fn(() => ({
    createIndex: jest.fn()
  }));
  transaction = jest.fn();
}

class MockIDBTransaction {
  objectStore = jest.fn();
}

class MockIDBObjectStore {
  getAll = jest.fn();
  get = jest.fn();
  put = jest.fn();
  delete = jest.fn();
  index = jest.fn();
  openCursor = jest.fn();
}

class MockIDBRequest {
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: any = null;
}

// Setup IndexedDB mock
const mockDB = new MockIDBDatabase();
const mockTransaction = new MockIDBTransaction();
const mockStore = new MockIDBObjectStore();
const mockRequest = new MockIDBRequest();

// Mock global IndexedDB
global.indexedDB = {
  open: jest.fn(() => {
    const request = new MockIDBRequest();
    // Simulate successful database opening
    setTimeout(() => {
      request.result = mockDB;
      if (request.onsuccess) request.onsuccess();
    }, 0);
    return request;
  })
} as any;

mockDB.transaction.mockReturnValue(mockTransaction);
mockTransaction.objectStore.mockReturnValue(mockStore);

describe('IndexedDBProvider', () => {
  let provider: IndexedDBProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new IndexedDBProvider();
  });

  describe('Database Initialization', () => {
    it('should initialize database with correct name and version', async () => {
      expect(indexedDB.open).toHaveBeenCalledWith('soccer_coach_app', 2);
    });

    it('should return correct provider name', () => {
      expect(provider.getProviderName()).toBe('indexedDB');
    });

    it('should always report as online', async () => {
      expect(await provider.isOnline()).toBe(true);
    });
  });

  describe('Player Management', () => {
    const mockPlayer: Player = {
      id: 'player-1',
      name: 'John Doe',
      jerseyNumber: '10',
      isGoalie: false
    };

    beforeEach(() => {
      // Mock successful operations
      mockStore.getAll.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = [mockPlayer];
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      mockStore.put.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = mockPlayer;
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      mockStore.delete.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });
    });

    it('should get all players', async () => {
      const players = await provider.getPlayers();
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['players'], 'readonly');
      expect(mockStore.getAll).toHaveBeenCalled();
      expect(players).toEqual([mockPlayer]);
    });

    it('should save a player', async () => {
      const savedPlayer = await provider.savePlayer(mockPlayer);
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['players'], 'readwrite');
      expect(mockStore.put).toHaveBeenCalledWith(mockPlayer);
      expect(savedPlayer).toEqual(mockPlayer);
    });

    it('should delete a player', async () => {
      await provider.deletePlayer('player-1');
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['players'], 'readwrite');
      expect(mockStore.delete).toHaveBeenCalledWith('player-1');
    });

    it('should update a player', async () => {
      // Mock get for existing player
      mockStore.getAll.mockImplementationOnce(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = [mockPlayer];
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const updates = { name: 'Jane Doe', jerseyNumber: '11' };
      const updatedPlayer = await provider.updatePlayer('player-1', updates);
      
      expect(updatedPlayer).toEqual({ ...mockPlayer, ...updates });
    });

    it('should throw error when updating non-existent player', async () => {
      mockStore.getAll.mockImplementationOnce(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = [];
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      await expect(provider.updatePlayer('non-existent', { name: 'Test' }))
        .rejects.toThrow('Player with id non-existent not found');
    });
  });

  describe('Season Management', () => {
    const mockSeason: Season = {
      id: 'season-1',
      name: 'Spring 2024',
      startDate: '2024-03-01',
      endDate: '2024-05-31'
    };

    beforeEach(() => {
      mockStore.getAll.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = [mockSeason];
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      mockStore.put.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });
    });

    it('should get all seasons', async () => {
      const seasons = await provider.getSeasons();
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['seasons'], 'readonly');
      expect(seasons).toEqual([mockSeason]);
    });

    it('should save a season', async () => {
      const savedSeason = await provider.saveSeason(mockSeason);
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['seasons'], 'readwrite');
      expect(mockStore.put).toHaveBeenCalledWith(mockSeason);
      expect(savedSeason).toEqual(mockSeason);
    });
  });

  describe('Tournament Management', () => {
    const mockTournament: Tournament = {
      id: 'tournament-1',
      name: 'Spring Cup',
      startDate: '2024-04-01',
      endDate: '2024-04-15'
    };

    it('should get all tournaments', async () => {
      mockStore.getAll.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = [mockTournament];
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const tournaments = await provider.getTournaments();
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['tournaments'], 'readonly');
      expect(tournaments).toEqual([mockTournament]);
    });
  });

  describe('App Settings', () => {
    const mockSettings: AppSettings = {
      currentGameId: 'game-123',
      lastHomeTeamName: 'My Team',
      language: 'en'
    };

    it('should get app settings', async () => {
      mockStore.get.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = { id: 'default', ...mockSettings };
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const settings = await provider.getAppSettings();
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['app_settings'], 'readonly');
      expect(mockStore.get).toHaveBeenCalledWith('default');
      expect(settings).toEqual({ id: 'default', ...mockSettings });
    });

    it('should return null when no settings exist', async () => {
      mockStore.get.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = undefined;
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const settings = await provider.getAppSettings();
      expect(settings).toBeNull();
    });

    it('should save app settings', async () => {
      mockStore.put.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const savedSettings = await provider.saveAppSettings(mockSettings);
      
      expect(mockStore.put).toHaveBeenCalledWith({ id: 'default', ...mockSettings });
      expect(savedSettings).toEqual({ id: 'default', ...mockSettings });
    });
  });

  describe('Saved Games', () => {
    const mockGameData = {
      id: 'game-123',
      teamName: 'Test Team',
      playersOnField: [],
      opponents: [],
      drawings: [],
      availablePlayers: [],
      showPlayerNames: true,
      gameEvents: [],
      opponentName: 'Opponent Team'
    };

    it('should get saved games as record object', async () => {
      mockStore.getAll.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = [mockGameData];
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const games = await provider.getSavedGames();
      
      expect(games).toEqual({
        'game-123': mockGameData
      });
    });

    it('should save a game', async () => {
      mockStore.put.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const savedGame = await provider.saveSavedGame(mockGameData);
      
      expect(mockStore.put).toHaveBeenCalledWith(mockGameData);
      expect(savedGame).toEqual(mockGameData);
    });

    it('should throw error when saving invalid game data', async () => {
      await expect(provider.saveSavedGame({}))
        .rejects.toThrow('Invalid game data: missing id');
    });

    it('should delete a saved game', async () => {
      mockStore.delete.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      await provider.deleteSavedGame('game-123');
      
      expect(mockStore.delete).toHaveBeenCalledWith('game-123');
    });
  });

  describe('Timer State Management', () => {
    const mockTimerState: TimerState = {
      gameId: 'game-123',
      timeElapsedInSeconds: 450,
      timestamp: Date.now()
    };

    it('should get timer state', async () => {
      mockStore.get.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = mockTimerState;
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const timerState = await provider.getTimerState('game-123');
      
      expect(mockStore.get).toHaveBeenCalledWith('game-123');
      expect(timerState).toEqual(mockTimerState);
    });

    it('should return null when timer state not found', async () => {
      mockStore.get.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = undefined;
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const timerState = await provider.getTimerState('non-existent');
      expect(timerState).toBeNull();
    });

    it('should save timer state', async () => {
      mockStore.put.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const savedState = await provider.saveTimerState(mockTimerState);
      
      // The saveTimerState method adds an id field for DB v2 compatibility
      const expectedTimerState = { id: 'game-123', ...mockTimerState };
      expect(mockStore.put).toHaveBeenCalledWith(expectedTimerState);
      expect(savedState).toEqual(expectedTimerState);
    });

    it('should delete timer state', async () => {
      mockStore.delete.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      await provider.deleteTimerState('game-123');
      
      expect(mockStore.delete).toHaveBeenCalledWith('game-123');
    });
  });

  describe('Sync Queue Management', () => {
    const mockSyncItem = {
      operation: 'create' as const,
      table: 'players' as const,
      data: { id: 'player-1', name: 'Test Player' }
    };

    it('should add item to sync queue', async () => {
      mockStore.put.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      await provider.addToSyncQueue(mockSyncItem);
      
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockSyncItem,
          id: expect.any(String),
          timestamp: expect.any(Number),
          retryCount: 0,
          status: 'pending'
        })
      );
    });

    it('should get sync queue items', async () => {
      const mockQueueItems = [{
        id: 'sync-1',
        ...mockSyncItem,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const
      }];

      mockStore.getAll.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = mockQueueItems;
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const queueItems = await provider.getSyncQueue();
      
      expect(queueItems).toEqual(mockQueueItems);
    });

    it('should update sync queue item', async () => {
      mockStore.get.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = {
            id: 'sync-1',
            ...mockSyncItem,
            timestamp: Date.now(),
            retryCount: 0,
            status: 'pending'
          };
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      mockStore.put.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      await provider.updateSyncQueueItem('sync-1', { status: 'completed' });
      
      expect(mockStore.get).toHaveBeenCalledWith('sync-1');
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );
    });

    it('should throw error when updating non-existent sync item', async () => {
      mockStore.get.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = undefined;
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      await expect(provider.updateSyncQueueItem('non-existent', { status: 'completed' }))
        .rejects.toThrow('Sync queue item non-existent not found');
    });
  });

  describe('Data Export/Import', () => {
    it('should export all data', async () => {
      const mockPlayer = { id: 'player-1', name: 'Test Player' };
      const mockSeason = { id: 'season-1', name: 'Test Season' };
      const mockTournament = { id: 'tournament-1', name: 'Test Tournament' };
      const mockSettings = { currentGameId: 'game-123' };
      const mockGames = { 'game-123': { id: 'game-123', teamName: 'Test' } };

      // Mock different calls sequentially
      let callCount = 0;
      mockStore.getAll.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          switch (callCount++) {
            case 0: request.result = [mockPlayer]; break;
            case 1: request.result = [mockSeason]; break;
            case 2: request.result = [mockTournament]; break;
            case 3: request.result = [{ id: 'game-123', teamName: 'Test' }]; break;
            default: request.result = [];
          }
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      mockStore.get.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          request.result = mockSettings;
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      const exportedData = await provider.exportAllData();
      
      expect(exportedData).toEqual(
        expect.objectContaining({
          players: [mockPlayer],
          seasons: [mockSeason],
          tournaments: [mockTournament],
          saved_games: mockGames,
          app_settings: mockSettings,
          exported_at: expect.any(String)
        })
      );
    });

    it('should import all data', async () => {
      const importData = {
        players: [{ id: 'player-1', name: 'Test Player' }],
        seasons: [{ id: 'season-1', name: 'Test Season' }],
        tournaments: [{ id: 'tournament-1', name: 'Test Tournament' }],
        saved_games: { 'game-123': { gameId: 'game-123', teamName: 'Test' } },
        app_settings: { currentGameId: 'game-123' }
      };

      mockStore.put.mockImplementation(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          if (request.onsuccess) request.onsuccess();
        }, 0);
        return request;
      });

      await provider.importAllData(importData);
      
      // Should have called put for each data type
      expect(mockStore.put).toHaveBeenCalledTimes(5); // players, seasons, tournaments, games, settings
    });

    it('should throw error for invalid import data', async () => {
      await expect(provider.importAllData(null))
        .rejects.toThrow('Invalid import data');
      
      await expect(provider.importAllData('invalid'))
        .rejects.toThrow('Invalid import data');
    });
  });

  describe('Error Handling', () => {
    it('should handle database initialization errors', async () => {
      // Create a new provider that will fail to initialize
      global.indexedDB.open = jest.fn(() => {
        const request = new MockIDBRequest();
        setTimeout(() => {
          if (request.onerror) request.onerror();
        }, 0);
        return request;
      });

      const failingProvider = new IndexedDBProvider();
      
      await expect(failingProvider.getPlayers())
        .rejects.toThrow('Failed to open IndexedDB database');
    });

    it('should handle not initialized database', async () => {
      // Test what happens when database is not initialized
      const uninitializedProvider = new IndexedDBProvider();
      
      // Mock the initPromise to be null and db to be null
      (uninitializedProvider as any).initPromise = null;
      (uninitializedProvider as any).db = null;

      await expect(uninitializedProvider.getPlayers())
        .rejects.toThrow('IndexedDB not initialized');
    });
  });
});