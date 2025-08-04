/**
 * PersistenceStore Integration Tests
 * 
 * Comprehensive tests for the centralized data persistence and management store
 * to ensure reliable data operations before migrating components.
 */

import { renderHook, act } from '@testing-library/react';
import { 
  usePersistenceStore, 
  useSavedGames, 
  useMasterRoster, 
  useAppSettings, 
  useUserData,
  useLoadingStates 
} from '../persistenceStore';
import type { AppState, Player } from '@/types';

// Mock dependencies
jest.mock('@/utils/typedStorageHelpers', () => ({
  getTypedSavedGames: jest.fn(),
  saveTypedGame: jest.fn(),
  getTypedMasterRoster: jest.fn(),
}));

jest.mock('@/lib/storage', () => ({
  authAwareStorageManager: {
    deleteGame: jest.fn(),
    saveMasterRoster: jest.fn(),
    clearAllData: jest.fn(),
    getSavedGames: jest.fn(),
    getPlayers: jest.fn(),
  },
}));

jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Import mocked functions
import { getTypedSavedGames, saveTypedGame, getTypedMasterRoster } from '@/utils/typedStorageHelpers';
import { authAwareStorageManager } from '@/lib/storage';

const mockGetTypedSavedGames = getTypedSavedGames as jest.MockedFunction<typeof getTypedSavedGames>;
const mockSaveTypedGame = saveTypedGame as jest.MockedFunction<typeof saveTypedGame>;
const mockGetTypedMasterRoster = getTypedMasterRoster as jest.MockedFunction<typeof getTypedMasterRoster>;
const mockStorageManager = authAwareStorageManager as jest.Mocked<typeof authAwareStorageManager>;

describe('PersistenceStore', () => {
  const mockGameState: AppState = {
      gameId: 'game-1',
      teamName: 'Arsenal FC',
      opponentName: 'Chelsea FC',
      gameDate: '2025-01-04',
      gameLocation: 'Emirates Stadium',
      gameStatus: 'completed',
      isPlayed: true,
      homeScore: 2,
      awayScore: 1,
      timeElapsedInSeconds: 5400,
      currentPeriod: 2,
      playersOnField: [],
      opponents: [],
      availablePlayers: [],
      gameEvents: [],
      drawings: [],
      tacticalDrawings: [],
      tacticalDiscs: [],
      tacticalBallPosition: null,
      showPlayerNames: true,
      selectedPlayerIds: [],
      homeOrAway: 'home',
      numberOfPeriods: 2,
      periodDurationMinutes: 45,
      subIntervalMinutes: 15,
      completedIntervalDurations: [],
      lastSubConfirmationTimeSeconds: 0,
      gameNotes: 'Great game!',
      ageGroup: 'U18',
      tournamentLevel: 'Premier League',
      demandFactor: 1.0,
      seasonId: 'season-1',
      tournamentId: 'tournament-1',
      isTimerRunning: false,
    };

  const mockSavedGames = {
    'game-1': mockGameState,
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Reset store state
    act(() => {
      const store = usePersistenceStore.getState();
      store.clearAllData();
    });
  });

  describe('Game Management', () => {
    it('should save games successfully', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      mockSaveTypedGame.mockResolvedValue(true);
      mockGetTypedSavedGames.mockResolvedValue(mockSavedGames);
      
      let saveResult: boolean = false;
      
      await act(async () => {
        saveResult = await result.current.saveGame('game-1', mockGameState);
      });
      
      expect(saveResult).toBe(true);
      expect(mockSaveTypedGame).toHaveBeenCalledWith('game-1', mockGameState);
      expect(result.current.savedGames).toEqual(mockSavedGames);
      expect(result.current.userData.totalGamesManaged).toBe(1);
    });

    it('should handle save failures gracefully', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      mockSaveTypedGame.mockResolvedValue(false);
      
      let saveResult: boolean = true;
      
      await act(async () => {
        saveResult = await result.current.saveGame('game-1', mockGameState);
      });
      
      expect(saveResult).toBe(false);
      expect(result.current.lastError).toBe('Failed to save game');
    });

    it('should load games successfully', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      mockGetTypedSavedGames.mockResolvedValue(mockSavedGames);
      
      let loadedGame: AppState | null = null;
      
      await act(async () => {
        loadedGame = await result.current.loadGame('game-1');
      });
      
      expect(loadedGame).toEqual(mockGameState);
      expect(mockGetTypedSavedGames).toHaveBeenCalled();
    });

    it('should handle loading non-existent games', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      mockGetTypedSavedGames.mockResolvedValue({});
      
      let loadedGame: AppState | null = mockGameState;
      
      await act(async () => {
        loadedGame = await result.current.loadGame('non-existent');
      });
      
      expect(loadedGame).toBeNull();
      expect(result.current.lastError).toBe('Game non-existent not found');
    });

    it('should delete games successfully', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      mockStorageManager.deleteGame.mockResolvedValue(true);
      mockGetTypedSavedGames.mockResolvedValue({});
      
      let deleteResult: boolean = false;
      
      await act(async () => {
        deleteResult = await result.current.deleteGame('game-1');
      });
      
      expect(deleteResult).toBe(true);
      expect(mockStorageManager.deleteGame).toHaveBeenCalledWith('game-1');
    });

    it('should duplicate games correctly', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      // Mock successful load and save
      mockGetTypedSavedGames.mockResolvedValue(mockSavedGames);
      mockSaveTypedGame.mockResolvedValue(true);
      
      let duplicateResult: boolean = false;
      
      await act(async () => {
        duplicateResult = await result.current.duplicateGame('game-1', 'game-2');
      });
      
      expect(duplicateResult).toBe(true);
      expect(mockSaveTypedGame).toHaveBeenCalledWith('game-2', expect.objectContaining({
        gameId: 'game-2',
        isPlayed: false,
      }));
    });

    it('should get games list correctly', () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      // Set saved games
      act(() => {
        (result.current as any).savedGames = mockSavedGames;
      });
      
      const gamesList = result.current.getGamesList();
      
      expect(gamesList).toHaveLength(1);
      expect(gamesList[0]).toEqual({
        id: 'game-1',
        name: 'Chelsea FC',
        date: '2025-01-04',
        isPlayed: true,
      });
    });
  });

  describe('Roster Management', () => {
    const mockPlayers: Player[] = [
      {
        id: 'player-1',
        name: 'John Doe',
        number: 10,
        position: { x: 100, y: 200 },
        isActive: true,
        stats: {},
      },
      {
        id: 'player-2',
        name: 'Jane Smith',
        number: 7,
        position: { x: 200, y: 300 },
        isActive: true,
        stats: {},
      },
    ];

    it('should save master roster successfully', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      mockStorageManager.saveMasterRoster.mockResolvedValue(true);
      
      let saveResult: boolean = false;
      
      await act(async () => {
        saveResult = await result.current.saveMasterRoster(mockPlayers);
      });
      
      expect(saveResult).toBe(true);
      expect(result.current.masterRoster).toEqual(mockPlayers);
      expect(result.current.userData.totalPlayersManaged).toBe(2);
    });

    it('should load master roster successfully', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      mockGetTypedMasterRoster.mockResolvedValue(mockPlayers);
      
      let loadedPlayers: Player[] = [];
      
      await act(async () => {
        loadedPlayers = await result.current.loadMasterRoster();
      });
      
      expect(loadedPlayers).toEqual(mockPlayers);
      expect(result.current.masterRoster).toEqual(mockPlayers);
    });

    it('should add player to roster', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      const newPlayer: Player = {
        id: 'player-3',
        name: 'New Player',
        number: 11,
        position: { x: 0, y: 0 },
        isActive: true,
        stats: {},
      };
      
      // Set initial roster
      act(() => {
        (result.current as any).masterRoster = mockPlayers;
      });
      
      mockStorageManager.saveMasterRoster.mockResolvedValue(true);
      
      let addResult: boolean = false;
      
      await act(async () => {
        addResult = await result.current.addPlayerToRoster(newPlayer);
      });
      
      expect(addResult).toBe(true);
      expect(mockStorageManager.saveMasterRoster).toHaveBeenCalledWith([...mockPlayers, newPlayer]);
    });

    it('should update player in roster', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      // Set initial roster
      act(() => {
        (result.current as any).masterRoster = mockPlayers;
      });
      
      mockStorageManager.saveMasterRoster.mockResolvedValue(true);
      
      let updateResult: boolean = false;
      
      await act(async () => {
        updateResult = await result.current.updatePlayerInRoster('player-1', { 
          name: 'Updated Name',
          number: 99 
        });
      });
      
      expect(updateResult).toBe(true);
      expect(mockStorageManager.saveMasterRoster).toHaveBeenCalledWith([
        expect.objectContaining({ 
          id: 'player-1', 
          name: 'Updated Name', 
          number: 99 
        }),
        mockPlayers[1],
      ]);
    });

    it('should remove player from roster', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      // Set initial roster
      act(() => {
        (result.current as any).masterRoster = mockPlayers;
      });
      
      mockStorageManager.saveMasterRoster.mockResolvedValue(true);
      
      let removeResult: boolean = false;
      
      await act(async () => {
        removeResult = await result.current.removePlayerFromRoster('player-1');
      });
      
      expect(removeResult).toBe(true);
      expect(mockStorageManager.saveMasterRoster).toHaveBeenCalledWith([mockPlayers[1]]);
    });
  });

  describe('Settings Management', () => {
    it('should update settings correctly', () => {
      const { result } = renderHook(() => useAppSettings());
      const { result: storeResult } = renderHook(() => usePersistenceStore());
      
      act(() => {
        storeResult.current.updateSettings({
          language: 'fi',
          theme: 'dark',
          defaultPeriodDuration: 90,
        });
      });
      
      expect(result.current.language).toBe('fi');
      expect(result.current.theme).toBe('dark');
      expect(result.current.defaultPeriodDuration).toBe(90);
    });

    it('should reset settings to defaults', () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      // Update some settings first
      act(() => {
        result.current.updateSettings({
          language: 'fi',
          theme: 'dark',
        });
      });
      
      expect(result.current.settings.language).toBe('fi');
      
      // Reset settings
      act(() => {
        result.current.resetSettings();
      });
      
      expect(result.current.settings.language).toBe('en');
      expect(result.current.settings.theme).toBe('auto');
    });

    it('should export and import settings', () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      // Update some settings
      act(() => {
        result.current.updateSettings({
          language: 'fi',
          theme: 'dark',
          enableAnalytics: false,
        });
      });
      
      // Export settings
      const exportedSettings = result.current.exportSettings();
      const parsedSettings = JSON.parse(exportedSettings);
      
      expect(parsedSettings.language).toBe('fi');
      expect(parsedSettings.theme).toBe('dark');
      expect(parsedSettings.enableAnalytics).toBe(false);
      
      // Reset and import
      act(() => {
        result.current.resetSettings();
        const importResult = result.current.importSettings(exportedSettings);
        expect(importResult).toBe(true);
      });
      
      expect(result.current.settings.language).toBe('fi');
      expect(result.current.settings.theme).toBe('dark');
      expect(result.current.settings.enableAnalytics).toBe(false);
    });
  });

  describe('User Data Management', () => {
    it('should update user data correctly', () => {
      const { result } = renderHook(() => useUserData());
      const { result: storeResult } = renderHook(() => usePersistenceStore());
      
      act(() => {
        storeResult.current.updateUserData({
          userId: 'user-123',
          userEmail: 'test@example.com',
          displayName: 'Test User',
          teamName: 'My Team',
          isAuthenticated: true,
        });
      });
      
      expect(result.current.userId).toBe('user-123');
      expect(result.current.userEmail).toBe('test@example.com');
      expect(result.current.displayName).toBe('Test User');
      expect(result.current.teamName).toBe('My Team');
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should clear user data correctly', () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      // Set some user data
      act(() => {
        result.current.updateUserData({
          userId: 'user-123',
          userEmail: 'test@example.com',
          isAuthenticated: true,
        });
      });
      
      expect(result.current.userData.userId).toBe('user-123');
      
      // Clear user data
      act(() => {
        result.current.clearUserData();
      });
      
      expect(result.current.userData.userId).toBeNull();
      expect(result.current.userData.userEmail).toBeNull();
      expect(result.current.userData.isAuthenticated).toBe(false);
    });
  });

  describe('Loading States', () => {
    it('should track loading states correctly', async () => {
      const { result: loadingResult } = renderHook(() => useLoadingStates());
      const { result: storeResult } = renderHook(() => usePersistenceStore());
      
      expect(loadingResult.current.isLoading).toBe(false);
      expect(loadingResult.current.isSaving).toBe(false);
      
      // Mock a long-running operation
      mockSaveTypedGame.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(true), 100))
      );
      mockGetTypedSavedGames.mockResolvedValue({});
      
      // Start save operation
      const savePromise = act(async () => {
        await storeResult.current.saveGame('game-1', mockGameState);
      });
      
      // Check that saving state is set immediately
      expect(loadingResult.current.isSaving).toBe(true);
      
      // Wait for completion
      await savePromise;
      
      expect(loadingResult.current.isSaving).toBe(false);
    });

    it('should handle errors in loading states', async () => {
      const { result: loadingResult } = renderHook(() => useLoadingStates());
      const { result: storeResult } = renderHook(() => usePersistenceStore());
      
      mockSaveTypedGame.mockRejectedValue(new Error('Save failed'));
      
      await act(async () => {
        await storeResult.current.saveGame('game-1', mockGameState);
      });
      
      expect(loadingResult.current.isSaving).toBe(false);
      expect(loadingResult.current.lastError).toBe('Save failed');
    });
  });

  describe('Data Export/Import', () => {
    it('should export all data correctly', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      // Set some data
      act(() => {
        (result.current as any).savedGames = mockSavedGames;
        (result.current as any).masterRoster = [{ id: 'player-1', name: 'Test Player' }];
        result.current.updateSettings({ language: 'fi' });
        result.current.updateUserData({ teamName: 'Test Team' });
      });
      
      let exportedData: string = '';
      
      await act(async () => {
        exportedData = await result.current.exportAllData();
      });
      
      const parsedData = JSON.parse(exportedData);
      
      expect(parsedData.savedGames).toEqual(mockSavedGames);
      expect(parsedData.masterRoster).toHaveLength(1);
      expect(parsedData.settings.language).toBe('fi');
      expect(parsedData.userData.teamName).toBe('Test Team');
      expect(parsedData.dataIntegrity.lastBackupDate).toBeTruthy();
    });

    it('should import all data correctly', async () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      const importData = {
        savedGames: mockSavedGames,
        masterRoster: [{ id: 'player-1', name: 'Imported Player' }],
        settings: { language: 'fi', theme: 'dark' },
        userData: { teamName: 'Imported Team' },
      };
      
      let importResult: boolean = false;
      
      await act(async () => {
        importResult = await result.current.importAllData(JSON.stringify(importData));
      });
      
      expect(importResult).toBe(true);
      expect(result.current.savedGames).toEqual(mockSavedGames);
      expect(result.current.masterRoster[0].name).toBe('Imported Player');
      expect(result.current.settings.language).toBe('fi');
      expect(result.current.userData.teamName).toBe('Imported Team');
    });
  });

  describe('Storage Usage', () => {
    it('should calculate storage usage', () => {
      const { result } = renderHook(() => usePersistenceStore());
      
      const usage = result.current.getStorageUsage();
      
      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('available');
      expect(usage).toHaveProperty('percentage');
      expect(usage.used).toBeGreaterThanOrEqual(0);
      expect(usage.available).toBeGreaterThan(0);
      expect(usage.percentage).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cross-Hook State Consistency', () => {
    it('should maintain consistency between hook selectors', () => {
      const { result: storeResult } = renderHook(() => usePersistenceStore());
      const { result: savedGamesResult } = renderHook(() => useSavedGames());
      const { result: settingsResult } = renderHook(() => useAppSettings());
      const { result: userDataResult } = renderHook(() => useUserData());
      
      // Update through store
      act(() => {
        (storeResult.current as any).savedGames = mockSavedGames;
        storeResult.current.updateSettings({ language: 'fi' });
        storeResult.current.updateUserData({ teamName: 'Test Team' });
      });
      
      // Verify consistency across hooks
      expect(savedGamesResult.current).toEqual(mockSavedGames);
      expect(settingsResult.current.language).toBe('fi');
      expect(userDataResult.current.teamName).toBe('Test Team');
    });
  });
});