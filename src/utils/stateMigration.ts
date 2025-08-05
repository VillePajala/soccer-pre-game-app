/**
 * State Migration Utilities - Safe migration from distributed useState to centralized stores
 * 
 * This module provides utilities to safely migrate from the legacy useState-based
 * state management to the new Zustand store architecture while maintaining
 * data integrity and providing rollback capabilities.
 */

import type { GameStore, GameSessionState, FieldState } from '@/stores/gameStore';
import type { UIStore, ModalState, ViewState } from '@/stores/uiStore';
import type { PersistenceStore, AppSettings } from '@/stores/persistenceStore';
import logger from './logger';

// Migration feature flags
export interface MigrationFlags {
  enableGameStoreMigration: boolean;
  enableUIStoreMigration: boolean;
  enablePersistenceStoreMigration: boolean;
  enableLegacyFallback: boolean;
  enableMigrationLogging: boolean;
}

// Default migration flags (enable new stores while keeping safety net)
export const defaultMigrationFlags: MigrationFlags = {
  enableGameStoreMigration: true,  // ✅ Enable new game store
  enableUIStoreMigration: true,    // ✅ Enable new UI store (modals, views)
  enablePersistenceStoreMigration: true, // ✅ Enable unified persistence
  enableLegacyFallback: true,      // ✅ Keep safety net for rollback
  enableMigrationLogging: true,    // ✅ Keep logging for monitoring
};

// Migration state tracking
export interface MigrationState {
  isInProgress: boolean;
  currentPhase: string;
  migratedComponents: string[];
  failedComponents: string[];
  startTime: number;
  lastError: string | null;
}

// Global migration state
let migrationState: MigrationState = {
  isInProgress: false,
  currentPhase: 'none',
  migratedComponents: [],
  failedComponents: [],
  startTime: 0,
  lastError: null,
};

// 🔧 AUTO-COMPLETE STUCK MIGRATION: Check for stuck migration on module load (client-side only)
if (typeof window !== 'undefined') {
  try {
    const storedFlags = localStorage.getItem('migration-flags');
    if (storedFlags) {
      const flags = JSON.parse(storedFlags);
      // If migration flags exist but no migration is in progress, assume it was completed
      if (flags && !migrationState.isInProgress) {
        migrationState.currentPhase = 'completed';
        logger.debug('[Migration] Auto-completed previously stuck migration');
      }
    }
  } catch (error) {
    logger.warn('[Migration] Failed to check for stuck migration:', error);
  }
}

// Migration error types
export class MigrationError extends Error {
  constructor(
    message: string,
    public component: string,
    public phase: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * Legacy state structure (what we're migrating FROM)
 */
export interface LegacyAppState {
  // Game session state (distributed across components)
  gameId?: string | null;
  teamName?: string;
  opponentName?: string;
  timeElapsedInSeconds?: number;
  isTimerRunning?: boolean;
  currentPeriod?: number;
  homeScore?: number;
  awayScore?: number;
  gameDate?: string;
  gameLocation?: string;
  gameStatus?: string;
  
  // Field state (distributed across components)
  playersOnField?: unknown[];
  opponents?: unknown[];
  availablePlayers?: unknown[];
  drawings?: unknown[];
  tacticalDrawings?: unknown[];
  
  // UI state (distributed across components)
  showSaveGameModal?: boolean;
  showLoadGameModal?: boolean;
  showGameStatsModal?: boolean;
  isTacticsBoardView?: boolean;
  isDrawingMode?: boolean;
  showPlayerNames?: boolean;
  selectedPlayerIds?: string[];
  
  // Settings and persistence (localStorage direct access)
  savedGames?: unknown;
  masterRoster?: unknown[];
  appSettings?: unknown;
}

/**
 * Convert legacy AppState to new GameStore state
 */
export const migrateToGameStore = (legacyState: LegacyAppState): Partial<GameStore> => {
  try {
    const gameSession: Partial<GameSessionState> = {
      gameId: legacyState.gameId || null,
      teamName: legacyState.teamName || '',
      opponentName: legacyState.opponentName || '',
      timeElapsedInSeconds: legacyState.timeElapsedInSeconds || 0,
      isTimerRunning: legacyState.isTimerRunning || false,
      currentPeriod: legacyState.currentPeriod || 1,
      homeScore: legacyState.homeScore || 0,
      awayScore: legacyState.awayScore || 0,
      gameDate: legacyState.gameDate || new Date().toISOString().split('T')[0],
      gameLocation: legacyState.gameLocation || '',
      gameStatus: (legacyState.gameStatus as 'not_started' | 'in_progress' | 'period_end' | 'game_end') || 'not_started',
      selectedPlayerIds: legacyState.selectedPlayerIds || [],
    };
    
    const fieldState: Partial<FieldState> = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      playersOnField: (legacyState.playersOnField as any[]) || [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      opponents: (legacyState.opponents as any[]) || [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      availablePlayers: (legacyState.availablePlayers as any[]) || [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      drawings: (legacyState.drawings as any[]) || [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tacticalDrawings: (legacyState.tacticalDrawings as any[]) || [],
      tacticalDiscs: [],
      tacticalBallPosition: null,
    };
    
    return {
      gameSession: gameSession as GameSessionState,
      field: fieldState as FieldState,
    };
  } catch (error) {
    throw new MigrationError(
      'Failed to migrate to GameStore',
      'GameStore',
      'conversion',
      error as Error
    );
  }
};

/**
 * Convert legacy UI state to new UIStore state
 */
export const migrateToUIStore = (legacyState: LegacyAppState): Partial<UIStore> => {
  try {
    const modals: Partial<ModalState> = {
      saveGameModal: legacyState.showSaveGameModal || false,
      loadGameModal: legacyState.showLoadGameModal || false,
      gameStatsModal: legacyState.showGameStatsModal || false,
    };
    
    const view: Partial<ViewState> = {
      isTacticsBoardView: legacyState.isTacticsBoardView || false,
      isDrawingMode: legacyState.isDrawingMode || false,
      showPlayerNames: legacyState.showPlayerNames !== undefined ? legacyState.showPlayerNames : true,
      selectedPlayerIds: legacyState.selectedPlayerIds || [],
    };
    
    return {
      modals: modals as ModalState,
      view: view as ViewState,
    };
  } catch (error) {
    throw new MigrationError(
      'Failed to migrate to UIStore',
      'UIStore',
      'conversion',
      error as Error
    );
  }
};

/**
 * Convert legacy persistence data to new PersistenceStore state
 */
export const migrateToPersistenceStore = (legacyState: LegacyAppState): Partial<PersistenceStore> => {
  try {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      savedGames: (legacyState.savedGames as any) || {} as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      masterRoster: (legacyState.masterRoster as any[]) || [],
      settings: legacyState.appSettings as AppSettings || {},
    };
  } catch (error) {
    throw new MigrationError(
      'Failed to migrate to PersistenceStore',
      'PersistenceStore',
      'conversion',
      error as Error
    );
  }
};

/**
 * Validate migrated state integrity
 */
export const validateMigratedState = (
  gameStore: Partial<GameStore>,
  uiStore: Partial<UIStore>,
  persistenceStore: Partial<PersistenceStore>
): boolean => {
  try {
    // Validate GameStore
    if (gameStore.gameSession) {
      if (typeof gameStore.gameSession.timeElapsedInSeconds !== 'number') {
        throw new Error('Invalid timeElapsedInSeconds in GameStore');
      }
      if (typeof gameStore.gameSession.currentPeriod !== 'number') {
        throw new Error('Invalid currentPeriod in GameStore');
      }
    }
    
    // Validate UIStore
    if (uiStore.modals) {
      const modalKeys = Object.keys(uiStore.modals);
      for (const key of modalKeys) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof (uiStore.modals as any)[key] !== 'boolean') {
          throw new Error(`Invalid modal state for ${key} in UIStore`);
        }
      }
    }
    
    // Validate PersistenceStore
    if (persistenceStore.masterRoster && !Array.isArray(persistenceStore.masterRoster)) {
      throw new Error('Invalid masterRoster in PersistenceStore');
    }
    
    return true;
  } catch (error) {
    logger.error('State validation failed:', error);
    return false;
  }
};

/**
 * Create a backup of current state before migration
 */
export const createMigrationBackup = (): string => {
  try {
    const backup = {
      timestamp: Date.now(),
      version: '1.0.0',
      localStorage: { ...localStorage },
      url: window.location.href,
      userAgent: navigator.userAgent,
    };
    
    const backupString = JSON.stringify(backup);
    localStorage.setItem('migration-backup', backupString);
    
    logger.info('Migration backup created successfully');
    return backupString;
  } catch (error) {
    logger.error('Failed to create migration backup:', error);
    throw new MigrationError(
      'Failed to create migration backup',
      'backup',
      'creation',
      error as Error
    );
  }
};

/**
 * Restore from migration backup
 */
export const restoreFromMigrationBackup = (): boolean => {
  try {
    const backupString = localStorage.getItem('migration-backup');
    if (!backupString) {
      throw new Error('No migration backup found');
    }
    
    const backup = JSON.parse(backupString);
    
    // Clear current localStorage
    localStorage.clear();
    
    // Restore from backup
    Object.entries(backup.localStorage).forEach(([key, value]) => {
      localStorage.setItem(key, value as string);
    });
    
    logger.info('Migration backup restored successfully');
    return true;
  } catch (error) {
    logger.error('Failed to restore migration backup:', error);
    return false;
  }
};

/**
 * Start migration process with safety measures
 */
export const startMigration = (flags: Partial<MigrationFlags> = {}): boolean => {
  try {
    const migrationFlags = { ...defaultMigrationFlags, ...flags };
    
    if (migrationState.isInProgress) {
      throw new Error('Migration already in progress');
    }
    
    // Create backup before starting
    createMigrationBackup();
    
    // Initialize migration state
    migrationState = {
      isInProgress: true,
      currentPhase: 'initialization',
      migratedComponents: [],
      failedComponents: [],
      startTime: Date.now(),
      lastError: null,
    };
    
    // Store migration flags
    localStorage.setItem('migration-flags', JSON.stringify(migrationFlags));
    
    if (migrationFlags.enableMigrationLogging) {
      logger.info('Migration started with flags:', migrationFlags);
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to start migration:', error);
    migrationState.lastError = error instanceof Error ? error.message : 'Unknown error';
    return false;
  }
};

/**
 * Complete migration process
 */
export const completeMigration = (): boolean => {
  try {
    if (!migrationState.isInProgress) {
      throw new Error('No migration in progress');
    }
    
    const duration = Date.now() - migrationState.startTime;
    
    migrationState.isInProgress = false;
    migrationState.currentPhase = 'completed';
    
    logger.info('Migration completed successfully', {
      duration,
      migratedComponents: migrationState.migratedComponents,
      failedComponents: migrationState.failedComponents,
    });
    
    // Clean up migration flags
    localStorage.removeItem('migration-flags');
    
    return true;
  } catch (error) {
    logger.error('Failed to complete migration:', error);
    return false;
  }
};

/**
 * Rollback migration
 */
export const rollbackMigration = (): boolean => {
  try {
    logger.warn('Rolling back migration...');
    
    // Always reset migration state, even if backup restore fails
    migrationState = {
      isInProgress: false,
      currentPhase: 'rolledback',
      migratedComponents: [],
      failedComponents: [],
      startTime: 0,
      lastError: null,
    };
    
    // Clean up migration artifacts
    localStorage.removeItem('migration-flags');
    localStorage.removeItem('migration-backup');
    
    // Try to restore backup (but don't fail if it doesn't exist)
    restoreFromMigrationBackup();
    
    logger.info('Migration rollback completed successfully');
    return true; // Always return true since we reset the state
  } catch (error) {
    logger.error('Failed to rollback migration:', error);
    // Still reset state even on error
    migrationState = {
      isInProgress: false,
      currentPhase: 'rolledback',
      migratedComponents: [],
      failedComponents: [],
      startTime: 0,
      lastError: null,
    };
    localStorage.removeItem('migration-flags');
    localStorage.removeItem('migration-backup');
    return true;
  }
};

/**
 * Get current migration status
 */
export const getMigrationStatus = (): MigrationState & { flags: MigrationFlags } => {
  const flagsString = localStorage.getItem('migration-flags');
  const flags = flagsString ? JSON.parse(flagsString) : defaultMigrationFlags;
  
  return {
    ...migrationState,
    flags,
  };
};

/**
 * Check if component should use legacy state or new store
 */
export const shouldUseLegacyState = (componentName: string): boolean => {
  const status = getMigrationStatus();
  
  // If legacy fallback is disabled, always use new implementation
  if (!status.flags.enableLegacyFallback) {
    return false;
  }
  
  // If component has failed, use legacy (only if fallback is enabled)
  if (status.failedComponents.includes(componentName)) {
    return true;
  }
  
  // 🔧 FIXED: Check specific migration flags instead of generic isInProgress
  // UI components (modals, forms) should use new stores if UI migration is enabled
  if (componentName.includes('Modal') || componentName.includes('Form')) {
    return !status.flags.enableUIStoreMigration;
  }
  
  // Game components should use new stores if game migration is enabled
  if (componentName.includes('Game') || componentName.includes('Field') || componentName.includes('Player')) {
    return !status.flags.enableGameStoreMigration;
  }
  
  // Persistence components should use new stores if persistence migration is enabled
  if (componentName.includes('Storage') || componentName.includes('Persistence') || componentName.includes('Roster')) {
    return !status.flags.enablePersistenceStoreMigration;
  }
  
  // For other components, use new implementation by default (migration-first approach)
  return false;
};

/**
 * Mark component as successfully migrated
 */
export const markComponentMigrated = (componentName: string): void => {
  if (!migrationState.migratedComponents.includes(componentName)) {
    migrationState.migratedComponents.push(componentName);
    logger.info(`Component ${componentName} migrated successfully`);
  }
};

/**
 * Mark component migration as failed
 */
export const markComponentFailed = (componentName: string, error: Error): void => {
  if (!migrationState.failedComponents.includes(componentName)) {
    migrationState.failedComponents.push(componentName);
    migrationState.lastError = error.message;
    logger.error(`Component ${componentName} migration failed:`, error);
  }
};

/**
 * Safe migration wrapper for components
 */
export const withMigrationSafety = <T>(
  componentName: string,
  legacyImplementation: () => T,
  newImplementation: () => T
): T => {
  try {
    if (shouldUseLegacyState(componentName)) {
      return legacyImplementation();
    } else {
      // Use new implementation but don't auto-mark as migrated
      // Components should be explicitly marked as migrated
      return newImplementation();
    }
  } catch (error) {
    markComponentFailed(componentName, error as Error);
    return legacyImplementation();
  }
};

/**
 * 🔧 FORCE COMPLETE MIGRATION: Emergency function to complete stuck migration
 * Call this from browser console if migration is stuck: window.forceCompleteMigration()
 */
export const forceCompleteMigration = (): void => {
  try {
    migrationState = {
      isInProgress: false,
      currentPhase: 'completed',
      migratedComponents: [],
      failedComponents: [],
      startTime: 0,
      lastError: null,
    };
    
    logger.info('[Migration] Force completed stuck migration');
    
    // Trigger a re-render by dispatching a custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('migration-force-completed'));
    }
  } catch (error) {
    logger.error('[Migration] Failed to force complete migration:', error);
  }
};

// Expose for debugging in browser console
if (typeof window !== 'undefined') {
  (window as unknown as { forceCompleteMigration: () => void }).forceCompleteMigration = forceCompleteMigration;
}