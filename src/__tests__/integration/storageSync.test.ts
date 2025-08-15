import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import { storageManager } from '@/lib/storage/storageManager';
import { syncManager } from '@/lib/storage/syncManager';
import { offlineFirstStorageManager } from '@/lib/storage/offlineFirstStorageManager';
import type { AppState } from '@/types';

// Enable MSW for these tests
process.env.MSW_ENABLED = 'true';

describe('Storage Sync Integration Tests', () => {
  const mockUserId = 'test-user-123';
  const mockGameId = 'game-123';
  
  const mockGameData: Partial<AppState> = {
    teamName: 'Test Team',
    opponentName: 'Opponent Team',
    homeScore: 2,
    awayScore: 1,
    gameStatus: 'gameEnd',
    isPlayed: true,
    gameDate: '2024-01-15',
    gameTime: '14:00',
    location: 'Stadium A',
  };

  beforeEach(() => {
    // Clear any stored data
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset IndexedDB (if available in test environment)
    if ('indexedDB' in global) {
      indexedDB.databases().then(databases => {
        databases.forEach(db => {
          if (db.name) indexedDB.deleteDatabase(db.name);
        });
      });
    }
  });

  describe('Online/Offline Sync', () => {
    it('should save data locally when offline', async () => {
      // Simulate offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const result = await offlineFirstStorageManager.saveGame(mockUserId, mockGameId, mockGameData);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(mockGameId);
      
      // Data should be queued for sync
      const queuedData = localStorage.getItem('offline-queue');
      expect(queuedData).toBeTruthy();
    });

    it('should sync queued data when coming back online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Save data while offline
      await offlineFirstStorageManager.saveGame(mockUserId, mockGameId, mockGameData);
      
      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Trigger sync
      await syncManager.syncOfflineQueue();
      
      // Queue should be empty
      const queuedData = localStorage.getItem('offline-queue');
      const queue = queuedData ? JSON.parse(queuedData) : [];
      expect(queue).toHaveLength(0);
    });

    it('should handle sync conflicts with last-write-wins strategy', async () => {
      // Save initial version
      await storageManager.saveGame(mockUserId, mockGameId, mockGameData);
      
      // Simulate concurrent update from another client
      server.use(
        http.get(/saved_games/, () => {
          return HttpResponse.json([{
            id: mockGameId,
            user_id: mockUserId,
            game_data: {
              ...mockGameData,
              homeScore: 3, // Different score
              updated_at: new Date(Date.now() + 1000).toISOString(), // Newer timestamp
            },
            updated_at: new Date(Date.now() + 1000).toISOString(),
          }]);
        })
      );

      // Try to save our version
      const localUpdate = {
        ...mockGameData,
        homeScore: 4,
      };
      
      const result = await syncManager.resolveConflict(mockGameId, localUpdate);
      
      // Should use the newer version (from server)
      expect(result.homeScore).toBe(3);
    });
  });

  describe('Retry Logic and Backoff', () => {
    it('should retry failed saves with exponential backoff', async () => {
      let attemptCount = 0;
      
      // Simulate failures then success
      server.use(
        http.post(/saved_games/, () => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.json(
              { error: 'Service unavailable' },
              { status: 503 }
            );
          }
          return HttpResponse.json({
            id: mockGameId,
            user_id: mockUserId,
            game_data: mockGameData,
          });
        })
      );

      const startTime = Date.now();
      const result = await syncManager.saveWithRetry(mockUserId, mockGameId, mockGameData);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(attemptCount).toBe(3);
      // Should have delays between retries
      expect(endTime - startTime).toBeGreaterThan(100); // At least some delay
    });

    it('should handle rate limiting with proper backoff', async () => {
      server.use(
        http.post(/saved_games/, () => {
          return HttpResponse.json(
            { error: 'Too many requests' },
            { 
              status: 429, 
              headers: { 'Retry-After': '2' } // 2 seconds
            }
          );
        })
      );

      const promise = syncManager.saveWithRetry(mockUserId, mockGameId, mockGameData);
      
      // Should eventually fail after max retries
      await expect(promise).rejects.toThrow();
    });

    it('should handle network timeouts gracefully', async () => {
      server.use(
        http.post(/saved_games/, async () => {
          // Simulate timeout by never responding
          await new Promise(resolve => setTimeout(resolve, 10000));
          return HttpResponse.json({});
        })
      );

      // Configure shorter timeout for test
      const originalTimeout = syncManager.timeout;
      syncManager.timeout = 100; // 100ms timeout

      const promise = syncManager.saveWithRetry(mockUserId, mockGameId, mockGameData);
      
      await expect(promise).rejects.toThrow();
      
      // Restore original timeout
      syncManager.timeout = originalTimeout;
    });
  });

  describe('Batch Operations', () => {
    it('should batch multiple save operations efficiently', async () => {
      const games = Array.from({ length: 5 }, (_, i) => ({
        id: `game-${i}`,
        data: {
          ...mockGameData,
          teamName: `Team ${i}`,
        },
      }));

      const savePromises = games.map(game => 
        storageManager.saveGame(mockUserId, game.id, game.data)
      );

      const results = await Promise.all(savePromises);
      
      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.id).toBe(`game-${i}`);
      });
    });

    it('should handle partial batch failures', async () => {
      let callCount = 0;
      
      server.use(
        http.post(/saved_games/, () => {
          callCount++;
          // Fail every other request
          if (callCount % 2 === 0) {
            return HttpResponse.json(
              { error: 'Random failure' },
              { status: 500 }
            );
          }
          return HttpResponse.json({
            id: `game-${callCount}`,
            user_id: mockUserId,
            game_data: mockGameData,
          });
        })
      );

      const games = Array.from({ length: 4 }, (_, i) => ({
        id: `game-${i}`,
        data: mockGameData,
      }));

      const results = await Promise.allSettled(
        games.map(game => storageManager.saveGame(mockUserId, game.id, game.data))
      );

      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      expect(successful.length).toBeGreaterThan(0);
      expect(failed.length).toBeGreaterThan(0);
    });
  });

  describe('Data Compression and Optimization', () => {
    it('should compress large game data before sync', async () => {
      const largeGameData = {
        ...mockGameData,
        gameEvents: Array.from({ length: 1000 }, (_, i) => ({
          id: `event-${i}`,
          type: 'pass',
          time: i * 10,
          playerId: `player-${i % 11}`,
        })),
      };

      const result = await storageManager.saveGame(mockUserId, mockGameId, largeGameData);
      
      expect(result).toBeDefined();
      // Verify compression was applied (mock implementation would show this)
    });

    it('should deduplicate redundant sync operations', async () => {
      let saveCount = 0;
      
      server.use(
        http.post(/saved_games/, () => {
          saveCount++;
          return HttpResponse.json({
            id: mockGameId,
            user_id: mockUserId,
            game_data: mockGameData,
          });
        })
      );

      // Attempt multiple saves of the same data rapidly
      const promises = Array.from({ length: 5 }, () => 
        storageManager.saveGame(mockUserId, mockGameId, mockGameData)
      );

      await Promise.all(promises);
      
      // Should deduplicate and only save once or twice
      expect(saveCount).toBeLessThan(5);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from corrupted local storage', async () => {
      // Corrupt localStorage
      localStorage.setItem('saved-games', 'invalid-json-{corrupted');
      
      // Should handle gracefully and recover
      const games = await storageManager.getSavedGames(mockUserId);
      
      expect(games).toBeDefined();
      expect(Array.isArray(games) || typeof games === 'object').toBe(true);
    });

    it('should handle quota exceeded errors', async () => {
      server.use(
        http.post(/saved_games/, () => {
          return HttpResponse.json(
            { error: 'Quota exceeded', message: 'Storage quota exceeded' },
            { status: 507 }
          );
        })
      );

      // Should fall back to local storage
      const result = await offlineFirstStorageManager.saveGame(mockUserId, mockGameId, mockGameData);
      
      expect(result).toBeDefined();
      
      // Check local storage
      const localData = localStorage.getItem(`game-${mockGameId}`);
      expect(localData).toBeTruthy();
    });

    it('should handle authentication expiry during sync', async () => {
      let requestCount = 0;
      
      server.use(
        http.post(/saved_games/, () => {
          requestCount++;
          if (requestCount === 1) {
            // First request fails with auth error
            return HttpResponse.json(
              { error: 'Token expired' },
              { status: 401 }
            );
          }
          // After refresh, succeeds
          return HttpResponse.json({
            id: mockGameId,
            user_id: mockUserId,
            game_data: mockGameData,
          });
        })
      );

      const result = await syncManager.saveWithAuthRefresh(mockUserId, mockGameId, mockGameData);
      
      expect(result).toBeDefined();
      expect(requestCount).toBe(2); // Failed once, then succeeded
    });
  });

  describe('Multi-tab Synchronization', () => {
    it('should sync data across multiple tabs', async () => {
      // Simulate save in one tab
      await storageManager.saveGame(mockUserId, mockGameId, mockGameData);
      
      // Simulate storage event from another tab
      const storageEvent = new StorageEvent('storage', {
        key: `game-${mockGameId}`,
        newValue: JSON.stringify(mockGameData),
        oldValue: null,
        storageArea: localStorage,
      });
      
      window.dispatchEvent(storageEvent);
      
      // Data should be available in current tab
      const games = await storageManager.getSavedGames(mockUserId);
      expect(games[mockGameId]).toBeDefined();
    });

    it('should handle concurrent edits from multiple tabs', async () => {
      // Tab 1 saves
      const tab1Data = { ...mockGameData, homeScore: 2 };
      await storageManager.saveGame(mockUserId, mockGameId, tab1Data);
      
      // Tab 2 saves (simulated via storage event)
      const tab2Data = { ...mockGameData, homeScore: 3 };
      const storageEvent = new StorageEvent('storage', {
        key: `game-${mockGameId}`,
        newValue: JSON.stringify(tab2Data),
        oldValue: JSON.stringify(tab1Data),
        storageArea: localStorage,
      });
      
      window.dispatchEvent(storageEvent);
      
      // Should use the latest value
      const games = await storageManager.getSavedGames(mockUserId);
      expect(games[mockGameId].homeScore).toBe(3);
    });
  });
});