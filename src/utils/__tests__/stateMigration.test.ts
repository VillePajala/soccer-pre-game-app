/**
 * State Migration Utilities Tests
 * 
 * Tests for migration safety utilities to ensure reliable transition
 * from legacy useState-based state to centralized stores.
 */

import {
  migrateToGameStore,
  migrateToUIStore,
  migrateToPersistenceStore,
  validateMigratedState,
  createMigrationBackup,
  restoreFromMigrationBackup,
  startMigration,
  completeMigration,
  rollbackMigration,
  getMigrationStatus,
  shouldUseLegacyState,
  markComponentMigrated,
  markComponentFailed,
  withMigrationSafety,
  type LegacyAppState,
  defaultMigrationFlags,
} from '../stateMigration';

// Mock logger
jest.mock('@/utils/logger', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('State Migration Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset migration state between tests
    rollbackMigration();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Migration Conversion Functions', () => {
    const mockLegacyState: LegacyAppState = {
      gameId: 'game-123',
      teamName: 'Arsenal FC',
      opponentName: 'Chelsea FC',
      timeElapsedInSeconds: 1800,
      isTimerRunning: true,
      currentPeriod: 2,
      homeScore: 2,
      awayScore: 1,
      gameDate: '2025-01-04',
      gameLocation: 'Emirates Stadium',
      gameStatus: 'in_progress',
      playersOnField: [{ id: 'player-1', name: 'John Doe' }],
      opponents: [{ id: 'opp-1', name: 'Opponent 1' }],
      availablePlayers: [{ id: 'player-2', name: 'Jane Smith' }],
      drawings: [[{ x: 100, y: 100 }]],
      tacticalDrawings: [[{ x: 200, y: 200 }]],
      showSaveGameModal: true,
      showLoadGameModal: false,
      showGameStatsModal: true,
      isTacticsBoardView: true,
      isDrawingMode: false,
      showPlayerNames: false,
      selectedPlayerIds: ['player-1', 'player-2'],
      savedGames: { 'game-1': {} },
      masterRoster: [{ id: 'player-1', name: 'John Doe' }],
      appSettings: { language: 'fi', theme: 'dark' },
    };

    describe('migrateToGameStore', () => {
      it('should convert legacy state to GameStore format', () => {
        const result = migrateToGameStore(mockLegacyState);
        
        expect(result.gameSession).toBeDefined();
        expect(result.field).toBeDefined();
        
        // Check game session fields
        expect(result.gameSession!.gameId).toBe('game-123');
        expect(result.gameSession!.teamName).toBe('Arsenal FC');
        expect(result.gameSession!.opponentName).toBe('Chelsea FC');
        expect(result.gameSession!.timeElapsedInSeconds).toBe(1800);
        expect(result.gameSession!.isTimerRunning).toBe(true);
        expect(result.gameSession!.currentPeriod).toBe(2);
        expect(result.gameSession!.homeScore).toBe(2);
        expect(result.gameSession!.awayScore).toBe(1);
        expect(result.gameSession!.selectedPlayerIds).toEqual(['player-1', 'player-2']);
        
        // Check field state fields
        expect(result.field!.playersOnField).toEqual([{ id: 'player-1', name: 'John Doe' }]);
        expect(result.field!.opponents).toEqual([{ id: 'opp-1', name: 'Opponent 1' }]);
        expect(result.field!.availablePlayers).toEqual([{ id: 'player-2', name: 'Jane Smith' }]);
        expect(result.field!.drawings).toEqual([[{ x: 100, y: 100 }]]);
        expect(result.field!.tacticalDrawings).toEqual([[{ x: 200, y: 200 }]]);
      });

      it('should handle missing fields with defaults', () => {
        const minimalLegacyState: LegacyAppState = {};
        const result = migrateToGameStore(minimalLegacyState);
        
        expect(result.gameSession!.gameId).toBeNull();
        expect(result.gameSession!.teamName).toBe('');
        expect(result.gameSession!.timeElapsedInSeconds).toBe(0);
        expect(result.gameSession!.isTimerRunning).toBe(false);
        expect(result.field!.playersOnField).toEqual([]);
        expect(result.field!.drawings).toEqual([]);
      });

      it('should throw MigrationError on conversion failure', () => {
        const invalidState = null as any;
        
        expect(() => migrateToGameStore(invalidState)).toThrow('Failed to migrate to GameStore');
      });
    });

    describe('migrateToUIStore', () => {
      it('should convert legacy UI state to UIStore format', () => {
        const result = migrateToUIStore(mockLegacyState);
        
        expect(result.modals).toBeDefined();
        expect(result.view).toBeDefined();
        
        // Check modal states
        expect(result.modals!.saveGameModal).toBe(true);
        expect(result.modals!.loadGameModal).toBe(false);
        expect(result.modals!.gameStatsModal).toBe(true);
        
        // Check view states
        expect(result.view!.isTacticsBoardView).toBe(true);
        expect(result.view!.isDrawingMode).toBe(false);
        expect(result.view!.showPlayerNames).toBe(false);
        expect(result.view!.selectedPlayerIds).toEqual(['player-1', 'player-2']);
      });

      it('should handle undefined showPlayerNames with default true', () => {
        const stateWithoutPlayerNames: LegacyAppState = { ...mockLegacyState };
        delete stateWithoutPlayerNames.showPlayerNames;
        
        const result = migrateToUIStore(stateWithoutPlayerNames);
        
        expect(result.view!.showPlayerNames).toBe(true);
      });
    });

    describe('migrateToPersistenceStore', () => {
      it('should convert legacy persistence data to PersistenceStore format', () => {
        const result = migrateToPersistenceStore(mockLegacyState);
        
        expect(result.savedGames).toEqual({ 'game-1': {} });
        expect(result.masterRoster).toEqual([{ id: 'player-1', name: 'John Doe' }]);
        expect(result.settings).toEqual({ language: 'fi', theme: 'dark' });
      });

      it('should handle missing persistence data with defaults', () => {
        const minimalState: LegacyAppState = {};
        const result = migrateToPersistenceStore(minimalState);
        
        expect(result.savedGames).toEqual({});
        expect(result.masterRoster).toEqual([]);
        expect(result.settings).toEqual({});
      });
    });
  });

  describe('State Validation', () => {
    it('should validate correct migrated state', () => {
      const gameStore = {
        gameSession: {
          timeElapsedInSeconds: 1800,
          currentPeriod: 2,
        },
      };
      
      const uiStore = {
        modals: {
          saveGameModal: true,
          loadGameModal: false,
        },
      };
      
      const persistenceStore = {
        masterRoster: [{ id: 'player-1', name: 'John Doe' }],
      };
      
      const isValid = validateMigratedState(gameStore, uiStore, persistenceStore);
      
      expect(isValid).toBe(true);
    });

    it('should detect invalid GameStore state', () => {
      const invalidGameStore = {
        gameSession: {
          timeElapsedInSeconds: 'invalid', // Should be number
          currentPeriod: 2,
        },
      };
      
      const isValid = validateMigratedState(invalidGameStore, {}, {});
      
      expect(isValid).toBe(false);
    });

    it('should detect invalid UIStore state', () => {
      const invalidUIStore = {
        modals: {
          saveGameModal: 'yes', // Should be boolean
        },
      };
      
      const isValid = validateMigratedState({}, invalidUIStore, {});
      
      expect(isValid).toBe(false);
    });

    it('should detect invalid PersistenceStore state', () => {
      const invalidPersistenceStore = {
        masterRoster: 'not an array', // Should be array
      };
      
      const isValid = validateMigratedState({}, {}, invalidPersistenceStore);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Migration Backup Management', () => {
    it('should create migration backup', () => {
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost:3000/test' },
      });
      
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Test User Agent',
      });
      
      const backupString = createMigrationBackup();
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'migration-backup',
        expect.stringContaining('"version":"1.0.0"')
      );
      
      expect(backupString).toContain('"version":"1.0.0"');
      expect(backupString).toContain('http://localhost:3000/test');
    });

    it('should restore from migration backup', () => {
      const mockBackup = {
        timestamp: Date.now(),
        version: '1.0.0',
        localStorage: {
          'key1': 'value1',
          'key2': 'value2',
        },
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockBackup));
      
      const success = restoreFromMigrationBackup();
      
      expect(success).toBe(true);
      expect(mockLocalStorage.clear).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key1', 'value1');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('key2', 'value2');
    });

    it('should handle missing backup gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const success = restoreFromMigrationBackup();
      
      expect(success).toBe(false);
    });
  });

  describe('Migration Process Management', () => {
    it('should start migration successfully', () => {
      const success = startMigration({ enableGameStoreMigration: true });
      
      expect(success).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'migration-backup',
        expect.any(String)
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'migration-flags',
        expect.stringContaining('enableGameStoreMigration')
      );
    });

    it('should prevent starting migration twice', () => {
      // Start first migration
      startMigration();
      
      // Try to start again
      const success = startMigration();
      
      expect(success).toBe(false);
    });

    it('should complete migration successfully', () => {
      // Start migration first
      startMigration();
      
      const success = completeMigration();
      
      expect(success).toBe(true);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('migration-flags');
    });

    it('should rollback migration successfully', () => {
      const mockBackup = {
        timestamp: Date.now(),
        version: '1.0.0',
        localStorage: { 'key1': 'value1' },
      };
      
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockBackup));
      
      const success = rollbackMigration();
      
      expect(success).toBe(true);
      expect(mockLocalStorage.clear).toHaveBeenCalled();
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('migration-flags');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('migration-backup');
    });
  });

  describe('Component Migration Management', () => {
    beforeEach(() => {
      // Reset migration state
      rollbackMigration();
      // Clear localStorage to ensure clean state
      mockLocalStorage.clear.mockClear();
      mockLocalStorage.getItem.mockReturnValue(null);
    });

    it('should track component migration status (LEGACY - removed)', () => {
      startMigration({ enableLegacyFallback: true });
      
      expect(shouldUseLegacyState('TestComponent')).toBe(true);
      
      markComponentMigrated('TestComponent');
      
      expect(shouldUseLegacyState('TestComponent')).toBe(false);
    });

    it('should handle component migration failures', () => {
      startMigration({ enableLegacyFallback: true });
      
      const error = new Error('Migration failed');
      markComponentFailed('TestComponent', error);
      
      expect(shouldUseLegacyState('TestComponent')).toBe(true);
      
      const status = getMigrationStatus();
      expect(status.failedComponents).toContain('TestComponent');
      expect(status.lastError).toBe('Migration failed');
    });

    it('should provide safe migration wrapper (LEGACY - removed)', () => {
      const legacyImplementation = jest.fn(() => 'legacy');
      const newImplementation = jest.fn(() => 'new');
      
      startMigration({ enableLegacyFallback: true });
      
      // First call should use legacy (component not migrated yet)
      const result1 = withMigrationSafety('TestComponent', legacyImplementation, newImplementation);
      
      expect(result1).toBe('legacy');
      expect(legacyImplementation).toHaveBeenCalled();
      expect(newImplementation).not.toHaveBeenCalled();
      
      // Mark as migrated
      markComponentMigrated('TestComponent');
      
      // Second call should use new implementation
      const result2 = withMigrationSafety('TestComponent', legacyImplementation, newImplementation);
      
      expect(result2).toBe('new');
      expect(newImplementation).toHaveBeenCalled();
    });

    it('should fallback to legacy on new implementation failure', () => {
      const legacyImplementation = jest.fn(() => 'legacy');
      const newImplementation = jest.fn(() => {
        throw new Error('New implementation failed');
      });
      
      startMigration({ enableLegacyFallback: true });
      markComponentMigrated('TestComponent'); // Mark as migrated to trigger new implementation
      
      const result = withMigrationSafety('TestComponent', legacyImplementation, newImplementation);
      
      expect(result).toBe('legacy');
      expect(legacyImplementation).toHaveBeenCalled();
      expect(shouldUseLegacyState('TestComponent')).toBe(true); // Should be marked as failed
    });

    it('should respect legacy fallback disabled', () => {
      startMigration({ enableLegacyFallback: false });
      
      // Mock localStorage to return the flags we just set
      const expectedFlags = { ...defaultMigrationFlags, enableLegacyFallback: false };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(expectedFlags));
      
      // Component should not use legacy even if not migrated
      expect(shouldUseLegacyState('TestComponent')).toBe(false);
      
      // Component should not use legacy even if failed
      markComponentFailed('TestComponent', new Error('Failed'));
      expect(shouldUseLegacyState('TestComponent')).toBe(false);
    });
  });

  describe('Migration Status Tracking', () => {
    it('should provide comprehensive migration status', () => {
      const flags = { enableGameStoreMigration: true, enableLegacyFallback: false };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(flags));
      
      startMigration(flags);
      markComponentMigrated('Component1');
      markComponentMigrated('Component2');
      markComponentFailed('Component3', new Error('Failed'));
      
      const status = getMigrationStatus();
      
      expect(status.isInProgress).toBe(true);
      expect(status.currentPhase).toBe('initialization');
      expect(status.migratedComponents).toEqual(['Component1', 'Component2']);
      expect(status.failedComponents).toEqual(['Component3']);
      expect(status.flags.enableGameStoreMigration).toBe(true);
      expect(status.flags.enableLegacyFallback).toBe(false);
    });

    it('should handle missing flags gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      const status = getMigrationStatus();
      
      expect(status.flags).toEqual(defaultMigrationFlags);
    });
  });
});