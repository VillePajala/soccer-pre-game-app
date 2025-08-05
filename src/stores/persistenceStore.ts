/**
 * Persistence State Store - Centralized data management and localStorage operations
 * 
 * This store replaces the distributed localStorage references throughout the codebase:
 * - Game saving and loading
 * - Settings persistence
 * - User preferences and configuration
 * - Data synchronization and integrity
 * 
 * Migration Strategy: Consolidate 474 localStorage references into centralized operations
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  AppState, 
  SavedGamesCollection, 
  Player,
  Season,
  Tournament 
} from '@/types';
import { getTypedSavedGames, saveTypedGame, getTypedMasterRoster } from '@/utils/typedStorageHelpers';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';

// App settings interface
export interface AppSettings {
  // Language and localization
  language: string;
  
  // Display preferences
  theme: 'light' | 'dark' | 'auto';
  showPlayerNames: boolean;
  showPlayerNumbers: boolean;
  animationsEnabled: boolean;
  
  // Game defaults
  defaultPeriodDuration: number;
  defaultNumberOfPeriods: number;
  defaultSubInterval: number;
  
  // Field preferences
  fieldDisplayMode: 'realistic' | 'tactical' | 'minimal';
  showFieldGrid: boolean;
  showFieldMarkers: boolean;
  
  // Notification preferences
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  notificationLevel: 'all' | 'important' | 'none';
  
  // Performance settings
  enableAnalytics: boolean;
  enableCrashReporting: boolean;
  
  // Feature flags
  enableExperimentalFeatures: boolean;
  enableBetaFeatures: boolean;
}

// User data interface
export interface UserData {
  // Profile information
  userId: string | null;
  userEmail: string | null;
  displayName: string | null;
  
  // Team information
  teamName: string;
  coachName: string;
  seasonName: string;
  
  // Authentication state
  isAuthenticated: boolean;
  lastLoginDate: string | null;
  
  // Usage statistics
  totalGamesManaged: number;
  totalPlayersManaged: number;
  accountCreatedDate: string | null;
}

// Data integrity interface
export interface DataIntegrity {
  lastBackupDate: string | null;
  lastSyncDate: string | null;
  dataVersion: string;
  migrationHistory: string[];
  corruptedDataSessions: string[];
}

// Combined persistence store interface
export interface PersistenceStore {
  // State
  savedGames: SavedGamesCollection;
  masterRoster: Player[];
  seasons: Season[];
  tournaments: Tournament[];
  settings: AppSettings;
  userData: UserData;
  dataIntegrity: DataIntegrity;
  
  // Loading states
  isLoading: boolean;
  isSaving: boolean;
  lastError: string | null;
  
  // Game management actions
  saveGame: (gameId: string, gameState: AppState) => Promise<boolean>;
  loadGame: (gameId: string) => Promise<AppState | null>;
  deleteGame: (gameId: string) => Promise<boolean>;
  duplicateGame: (gameId: string, newGameId: string) => Promise<boolean>;
  getGamesList: () => Array<{ id: string; name: string; date: string; isPlayed: boolean }>;
  
  // Roster management actions
  saveMasterRoster: (players: Player[]) => Promise<boolean>;
  loadMasterRoster: () => Promise<Player[]>;
  addPlayerToRoster: (player: Player) => Promise<boolean>;
  updatePlayerInRoster: (playerId: string, updates: Partial<Player>) => Promise<boolean>;
  removePlayerFromRoster: (playerId: string) => Promise<boolean>;
  
  // Season management actions
  saveSeasons: (seasons: Season[]) => Promise<boolean>;
  loadSeasons: () => Promise<Season[]>;
  addSeason: (season: Season) => Promise<boolean>;
  updateSeason: (seasonId: string, updates: Partial<Season>) => Promise<boolean>;
  deleteSeason: (seasonId: string) => Promise<boolean>;
  
  // Tournament management actions
  saveTournaments: (tournaments: Tournament[]) => Promise<boolean>;
  loadTournaments: () => Promise<Tournament[]>;
  addTournament: (tournament: Tournament) => Promise<boolean>;
  updateTournament: (tournamentId: string, updates: Partial<Tournament>) => Promise<boolean>;
  deleteTournament: (tournamentId: string) => Promise<boolean>;
  
  // Settings actions
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => boolean;
  
  // User data actions
  updateUserData: (updates: Partial<UserData>) => void;
  clearUserData: () => void;
  
  // Data management actions
  exportAllData: () => Promise<string>;
  importAllData: (dataJson: string) => Promise<boolean>;
  createBackup: () => Promise<string>;
  restoreFromBackup: (backupJson: string) => Promise<boolean>;
  
  // Data integrity actions
  validateDataIntegrity: () => Promise<boolean>;
  repairCorruptedData: () => Promise<boolean>;
  clearCorruptedSessions: () => void;
  
  // Unified localStorage API (Phase 3)
  getStorageItem: <T = any>(key: string, defaultValue?: T) => Promise<T | null>;
  setStorageItem: <T = any>(key: string, value: T) => Promise<boolean>;
  removeStorageItem: (key: string) => Promise<boolean>;
  hasStorageItem: (key: string) => Promise<boolean>;
  getStorageKeys: () => Promise<string[]>;
  
  // Utility actions
  clearAllData: () => Promise<boolean>;
  getStorageUsage: () => { used: number; available: number; percentage: number };
  
  // Internal actions
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
}

// Default state values
const defaultSettings: AppSettings = {
  language: 'en',
  theme: 'auto',
  showPlayerNames: true,
  showPlayerNumbers: false,
  animationsEnabled: true,
  defaultPeriodDuration: 45,
  defaultNumberOfPeriods: 2,
  defaultSubInterval: 15,
  fieldDisplayMode: 'realistic',
  showFieldGrid: false,
  showFieldMarkers: true,
  soundEnabled: true,
  vibrationEnabled: true,
  notificationLevel: 'important',
  enableAnalytics: true,
  enableCrashReporting: true,
  enableExperimentalFeatures: false,
  enableBetaFeatures: false,
};

const defaultUserData: UserData = {
  userId: null,
  userEmail: null,
  displayName: null,
  teamName: '',
  coachName: '',
  seasonName: '',
  isAuthenticated: false,
  lastLoginDate: null,
  totalGamesManaged: 0,
  totalPlayersManaged: 0,
  accountCreatedDate: null,
};

const defaultDataIntegrity: DataIntegrity = {
  lastBackupDate: null,
  lastSyncDate: null,
  dataVersion: '1.0.0',
  migrationHistory: [],
  corruptedDataSessions: [],
};

// Create the persistence store with Zustand
export const usePersistenceStore = create<PersistenceStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        savedGames: {},
        masterRoster: [],
        seasons: [],
        tournaments: [],
        settings: defaultSettings,
        userData: defaultUserData,
        dataIntegrity: defaultDataIntegrity,
        
        // Loading states
        isLoading: false,
        isSaving: false,
        lastError: null,
        
        // Game management actions
        saveGame: async (gameId, gameState) => {
          set({ isSaving: true, lastError: null }, false, 'saveGame:start');
          
          try {
            const gameStateWithId = { ...gameState, gameId };
            const success = await saveTypedGame(gameStateWithId);
            
            if (success) {
              // Update local state
              const savedGames = await getTypedSavedGames();
              set({ savedGames, isSaving: false }, false, 'saveGame:success');
              
              // Update user stats
              const { userData } = get();
              set({
                userData: {
                  ...userData,
                  totalGamesManaged: Object.keys(savedGames).length,
                }
              }, false, 'saveGame:updateStats');
              
              return true;
            } else {
              set({ 
                isSaving: false, 
                lastError: 'Failed to save game' 
              }, false, 'saveGame:error');
              return false;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error('Save game error:', errorMessage);
            set({ 
              isSaving: false, 
              lastError: errorMessage 
            }, false, 'saveGame:exception');
            return false;
          }
        },
        
        loadGame: async (gameId) => {
          set({ isLoading: true, lastError: null }, false, 'loadGame:start');
          
          try {
            const savedGames = await getTypedSavedGames();
            const gameState = savedGames[gameId];
            
            set({ isLoading: false }, false, 'loadGame:complete');
            
            if (gameState) {
              return gameState;
            } else {
              set({ lastError: `Game ${gameId} not found` }, false, 'loadGame:notFound');
              return null;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error('Load game error:', errorMessage);
            set({ 
              isLoading: false, 
              lastError: errorMessage 
            }, false, 'loadGame:exception');
            return null;
          }
        },
        
        deleteGame: async (gameId) => {
          set({ isSaving: true, lastError: null }, false, 'deleteGame:start');
          
          try {
            await storageManager.deleteSavedGame(gameId);
            const success = true;
            
            if (success) {
              const savedGames = await getTypedSavedGames();
              set({ savedGames, isSaving: false }, false, 'deleteGame:success');
              return true;
            } else {
              set({ 
                isSaving: false, 
                lastError: 'Failed to delete game' 
              }, false, 'deleteGame:error');
              return false;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error('Delete game error:', errorMessage);
            set({ 
              isSaving: false, 
              lastError: errorMessage 
            }, false, 'deleteGame:exception');
            return false;
          }
        },
        
        duplicateGame: async (gameId, newGameId) => {
          const gameState = await get().loadGame(gameId);
          if (gameState) {
            // Create new game with updated metadata
            const newGameState = {
              ...gameState,
              gameId: newGameId,
              gameDate: new Date().toISOString().split('T')[0],
              isPlayed: false,
            };
            
            return await get().saveGame(newGameId, newGameState);
          }
          return false;
        },
        
        getGamesList: () => {
          const { savedGames } = get();
          return Object.entries(savedGames).map(([id, state]) => ({
            id,
            name: state.opponentName || `Game ${id}`,
            date: state.gameDate || 'Unknown date',
            isPlayed: state.isPlayed || false,
          }));
        },
        
        // Roster management actions
        saveMasterRoster: async (players) => {
          set({ isSaving: true, lastError: null }, false, 'saveMasterRoster:start');
          
          try {
            // Save each player individually as the interface doesn't support batch roster saving
            for (const player of players) {
              await storageManager.savePlayer(player);
            }
            const success = true;
            
            if (success) {
              set({ 
                masterRoster: players, 
                isSaving: false,
                userData: {
                  ...get().userData,
                  totalPlayersManaged: players.length,
                }
              }, false, 'saveMasterRoster:success');
              return true;
            } else {
              set({ 
                isSaving: false, 
                lastError: 'Failed to save roster' 
              }, false, 'saveMasterRoster:error');
              return false;
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error('Save roster error:', errorMessage);
            set({ 
              isSaving: false, 
              lastError: errorMessage 
            }, false, 'saveMasterRoster:exception');
            return false;
          }
        },
        
        loadMasterRoster: async () => {
          set({ isLoading: true, lastError: null }, false, 'loadMasterRoster:start');
          
          try {
            const players = await getTypedMasterRoster();
            set({ 
              masterRoster: players, 
              isLoading: false 
            }, false, 'loadMasterRoster:success');
            return players;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            logger.error('Load roster error:', errorMessage);
            set({ 
              isLoading: false, 
              lastError: errorMessage 
            }, false, 'loadMasterRoster:exception');
            return [];
          }
        },
        
        addPlayerToRoster: async (player) => {
          const { masterRoster } = get();
          const updatedRoster = [...masterRoster, player];
          return await get().saveMasterRoster(updatedRoster);
        },
        
        updatePlayerInRoster: async (playerId, updates) => {
          const { masterRoster } = get();
          const updatedRoster = masterRoster.map(player =>
            player.id === playerId ? { ...player, ...updates } : player
          );
          return await get().saveMasterRoster(updatedRoster);
        },
        
        removePlayerFromRoster: async (playerId) => {
          const { masterRoster } = get();
          const updatedRoster = masterRoster.filter(player => player.id !== playerId);
          return await get().saveMasterRoster(updatedRoster);
        },
        
        // Season management actions (placeholder implementations)
        saveSeasons: async (seasons) => {
          set({ seasons }, false, 'saveSeasons');
          return true;
        },
        
        loadSeasons: async () => {
          return get().seasons;
        },
        
        addSeason: async (season) => {
          const { seasons } = get();
          set({ seasons: [...seasons, season] }, false, 'addSeason');
          return true;
        },
        
        updateSeason: async (seasonId, updates) => {
          const { seasons } = get();
          const updatedSeasons = seasons.map(season =>
            season.id === seasonId ? { ...season, ...updates } : season
          );
          set({ seasons: updatedSeasons }, false, 'updateSeason');
          return true;
        },
        
        deleteSeason: async (seasonId) => {
          const { seasons } = get();
          const updatedSeasons = seasons.filter(season => season.id !== seasonId);
          set({ seasons: updatedSeasons }, false, 'deleteSeason');
          return true;
        },
        
        // Tournament management actions (placeholder implementations)
        saveTournaments: async (tournaments) => {
          set({ tournaments }, false, 'saveTournaments');
          return true;
        },
        
        loadTournaments: async () => {
          return get().tournaments;
        },
        
        addTournament: async (tournament) => {
          const { tournaments } = get();
          set({ tournaments: [...tournaments, tournament] }, false, 'addTournament');
          return true;
        },
        
        updateTournament: async (tournamentId, updates) => {
          const { tournaments } = get();
          const updatedTournaments = tournaments.map(tournament =>
            tournament.id === tournamentId ? { ...tournament, ...updates } : tournament
          );
          set({ tournaments: updatedTournaments }, false, 'updateTournament');
          return true;
        },
        
        deleteTournament: async (tournamentId) => {
          const { tournaments } = get();
          const updatedTournaments = tournaments.filter(tournament => tournament.id !== tournamentId);
          set({ tournaments: updatedTournaments }, false, 'deleteTournament');
          return true;
        },
        
        // Settings actions
        updateSettings: (updates) => set(
          (state) => ({ 
            settings: { ...state.settings, ...updates } 
          }),
          false,
          'updateSettings'
        ),
        
        resetSettings: () => set(
          { settings: defaultSettings },
          false,
          'resetSettings'
        ),
        
        exportSettings: () => {
          const { settings } = get();
          return JSON.stringify(settings, null, 2);
        },
        
        importSettings: (settingsJson) => {
          try {
            const settings = JSON.parse(settingsJson);
            set({ settings: { ...defaultSettings, ...settings } }, false, 'importSettings');
            return true;
          } catch (error) {
            logger.error('Import settings error:', error);
            return false;
          }
        },
        
        // User data actions
        updateUserData: (updates) => set(
          (state) => ({ 
            userData: { ...state.userData, ...updates } 
          }),
          false,
          'updateUserData'
        ),
        
        clearUserData: () => set(
          { userData: defaultUserData },
          false,
          'clearUserData'
        ),
        
        // Data management actions (placeholder implementations)
        exportAllData: async () => {
          const state = get();
          const exportData = {
            savedGames: state.savedGames,
            masterRoster: state.masterRoster,
            seasons: state.seasons,
            tournaments: state.tournaments,
            settings: state.settings,
            userData: state.userData,
            dataIntegrity: {
              ...state.dataIntegrity,
              lastBackupDate: new Date().toISOString(),
            },
          };
          return JSON.stringify(exportData, null, 2);
        },
        
        importAllData: async (dataJson) => {
          try {
            const data = JSON.parse(dataJson);
            set({
              savedGames: data.savedGames || {},
              masterRoster: data.masterRoster || [],
              seasons: data.seasons || [],
              tournaments: data.tournaments || [],
              settings: { ...defaultSettings, ...data.settings },
              userData: { ...defaultUserData, ...data.userData },
              dataIntegrity: {
                ...defaultDataIntegrity,
                ...data.dataIntegrity,
                lastSyncDate: new Date().toISOString(),
              },
            }, false, 'importAllData');
            return true;
          } catch (error) {
            logger.error('Import data error:', error);
            return false;
          }
        },
        
        createBackup: async () => {
          const backupData = await get().exportAllData();
          const { dataIntegrity } = get();
          set({
            dataIntegrity: {
              ...dataIntegrity,
              lastBackupDate: new Date().toISOString(),
            }
          }, false, 'createBackup');
          return backupData;
        },
        
        restoreFromBackup: async (backupJson) => {
          return await get().importAllData(backupJson);
        },
        
        // Data integrity actions
        validateDataIntegrity: async () => {
          // Placeholder implementation
          return true;
        },
        
        repairCorruptedData: async () => {
          // Placeholder implementation
          return true;
        },
        
        clearCorruptedSessions: () => set(
          (state) => ({
            dataIntegrity: {
              ...state.dataIntegrity,
              corruptedDataSessions: [],
            }
          }),
          false,
          'clearCorruptedSessions'
        ),
        
        // Unified localStorage API (Phase 3)
        getStorageItem: async <T = any>(key: string, defaultValue?: T): Promise<T | null> => {
          try {
            // First try to get from the storage manager (preferred)
            try {
              const result = await storageManager.getGenericData(key);
              if (result !== null) {
                return result as T;
              }
            } catch (storageManagerError) {
              logger.debug('[PersistenceStore] Storage manager failed, falling back to localStorage:', storageManagerError);
            }
            
            // Fallback to direct localStorage access
            const item = localStorage.getItem(key);
            if (item === null) {
              return defaultValue ?? null;
            }
            
            try {
              const parsed = JSON.parse(item) as T;
              return parsed;
            } catch (parseError) {
              // Return as string if JSON parsing fails
              return item as unknown as T;
            }
          } catch (error) {
            logger.error(`[PersistenceStore] Error getting storage item '${key}':`, error);
            return defaultValue ?? null;
          }
        },
        
        setStorageItem: async <T = any>(key: string, value: T): Promise<boolean> => {
          try {
            get().setLoading(true);
            
            // First try to save with the storage manager (preferred)
            try {
              await storageManager.setGenericData(key, value);
              logger.debug(`[PersistenceStore] Saved '${key}' via storage manager`);
              return true;
            } catch (storageManagerError) {
              logger.debug('[PersistenceStore] Storage manager failed, falling back to localStorage:', storageManagerError);
            }
            
            // Fallback to direct localStorage access
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            localStorage.setItem(key, serialized);
            logger.debug(`[PersistenceStore] Saved '${key}' via localStorage fallback`);
            return true;
          } catch (error) {
            logger.error(`[PersistenceStore] Error setting storage item '${key}':`, error);
            get().setError(`Failed to save ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
          } finally {
            get().setLoading(false);
          }
        },
        
        removeStorageItem: async (key: string): Promise<boolean> => {
          try {
            // First try to remove from the storage manager (preferred)
            try {
              await storageManager.deleteGenericData(key);
              logger.debug(`[PersistenceStore] Removed '${key}' via storage manager`);
              return true;
            } catch (storageManagerError) {
              logger.debug('[PersistenceStore] Storage manager failed, falling back to localStorage:', storageManagerError);
            }
            
            // Fallback to direct localStorage access
            localStorage.removeItem(key);
            logger.debug(`[PersistenceStore] Removed '${key}' via localStorage fallback`);
            return true;
          } catch (error) {
            logger.error(`[PersistenceStore] Error removing storage item '${key}':`, error);
            return false;
          }
        },
        
        hasStorageItem: async (key: string): Promise<boolean> => {
          try {
            // Check storage manager first
            try {
              const result = await storageManager.getGenericData(key);
              return result !== null;
            } catch (storageManagerError) {
              logger.debug('[PersistenceStore] Storage manager failed, checking localStorage:', storageManagerError);
            }
            
            // Fallback to direct localStorage check
            return localStorage.getItem(key) !== null;
          } catch (error) {
            logger.error(`[PersistenceStore] Error checking storage item '${key}':`, error);
            return false;
          }
        },
        
        getStorageKeys: async (): Promise<string[]> => {
          try {
            // For now, return localStorage keys as the storage manager doesn't expose a keys method
            const keys: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) {
                keys.push(key);
              }
            }
            return keys;
          } catch (error) {
            logger.error('[PersistenceStore] Error getting storage keys:', error);
            return [];
          }
        },
        
        // Utility actions
        clearAllData: async () => {
          try {
            // Clear data by removing individual items (no clearAllData method in interface)
            const savedGames = await getTypedSavedGames();
            for (const gameId of Object.keys(savedGames)) {
              await storageManager.deleteSavedGame(gameId);
            }
            const players = await storageManager.getPlayers();
            for (const player of players) {
              await storageManager.deletePlayer(player.id);
            }
            const seasons = await storageManager.getSeasons();
            for (const season of seasons) {
              await storageManager.deleteSeason(season.id);
            }
            const tournaments = await storageManager.getTournaments();
            for (const tournament of tournaments) {
              await storageManager.deleteTournament(tournament.id);
            }
            set({
              savedGames: {},
              masterRoster: [],
              seasons: [],
              tournaments: [],
              settings: defaultSettings,
              userData: defaultUserData,
              dataIntegrity: defaultDataIntegrity,
            }, false, 'clearAllData');
            return true;
          } catch (error) {
            logger.error('Clear all data error:', error);
            return false;
          }
        },
        
        getStorageUsage: () => {
          try {
            const used = JSON.stringify(get()).length;
            const available = 5 * 1024 * 1024; // 5MB typical localStorage limit
            const percentage = (used / available) * 100;
            
            return { used, available, percentage };
          } catch (error) {
            logger.error('Get storage usage error:', error);
            return { used: 0, available: 0, percentage: 0 };
          }
        },
        
        // Internal actions
        setLoading: (loading) => set({ isLoading: loading }, false, 'setLoading'),
        setSaving: (saving) => set({ isSaving: saving }, false, 'setSaving'),
        setError: (error) => set({ lastError: error }, false, 'setError'),
      }),
      {
        name: 'persistence-storage', // localStorage key
        partialize: (state) => ({
          // Persist all data except loading states and errors
          savedGames: state.savedGames,
          masterRoster: state.masterRoster,
          seasons: state.seasons,
          tournaments: state.tournaments,
          settings: state.settings,
          userData: state.userData,
          dataIntegrity: state.dataIntegrity,
        }),
      }
    ),
    {
      name: 'PersistenceStore', // DevTools name
    }
  )
);

// Selector hooks for performance optimization
export const useSavedGames = () => usePersistenceStore((state) => state.savedGames);
export const useMasterRoster = () => usePersistenceStore((state) => state.masterRoster);
export const useAppSettings = () => usePersistenceStore((state) => state.settings);
export const useUserData = () => usePersistenceStore((state) => state.userData);
export const usePersistenceActions = () => usePersistenceStore((state) => ({
  // Storage API
  getStorageItem: state.getStorageItem,
  setStorageItem: state.setStorageItem,
  removeStorageItem: state.removeStorageItem,
  hasStorageItem: state.hasStorageItem,
  getStorageKeys: state.getStorageKeys,
  
  // Game actions
  saveGame: state.saveGame,
  loadGame: state.loadGame,
  deleteGame: state.deleteGame,
  
  // Roster actions
  saveMasterRoster: state.saveMasterRoster,
  loadMasterRoster: state.loadMasterRoster,
  addPlayerToRoster: state.addPlayerToRoster,
  updatePlayerInRoster: state.updatePlayerInRoster,
  removePlayerFromRoster: state.removePlayerFromRoster,
  
  // Settings actions
  updateSettings: state.updateSettings,
  resetSettings: state.resetSettings,
  
  // User data actions
  updateUserData: state.updateUserData,
  clearUserData: state.clearUserData,
  
  // Utility actions
  clearAllData: state.clearAllData,
  getStorageUsage: state.getStorageUsage,
}));
export const useDataIntegrity = () => usePersistenceStore((state) => state.dataIntegrity);

// Loading state hooks
export const useLoadingStates = () => {
  const isLoading = usePersistenceStore((state) => state.isLoading);
  const isSaving = usePersistenceStore((state) => state.isSaving);
  const lastError = usePersistenceStore((state) => state.lastError);
  
  return {
    isLoading,
    isSaving,
    lastError,
  };
};