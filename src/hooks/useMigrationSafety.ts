/**
 * Migration Safety Hook - React hook for safe state migration
 * 
 * This hook provides a React-friendly interface for managing the migration
 * from legacy useState-based state to centralized Zustand stores with
 * automatic fallback and error handling.
 */

import { useEffect, useState, useCallback } from 'react';
import { 
  getMigrationStatus,
  shouldUseLegacyState,
  markComponentMigrated,
  markComponentFailed,
  withMigrationSafety,
  type MigrationState,
  type MigrationFlags
} from '@/utils/stateMigration';
import logger from '@/utils/logger';

/**
 * Hook for managing component-level migration safety
 */
export const useMigrationSafety = (componentName: string) => {
  const [migrationStatus, setMigrationStatus] = useState<MigrationState & { flags: MigrationFlags }>(() => 
    getMigrationStatus()
  );
  
  const [componentStatus, setComponentStatus] = useState<{
    useLegacy: boolean;
    isMigrated: boolean;
    hasFailed: boolean;
    lastError: string | null;
  }>(() => {
    const status = getMigrationStatus();
    return {
      useLegacy: shouldUseLegacyState(componentName),
      isMigrated: status.migratedComponents.includes(componentName),
      hasFailed: status.failedComponents.includes(componentName),
      lastError: status.lastError,
    };
  });
  
  // Update status when migration state changes
  useEffect(() => {
    const updateStatus = () => {
      const status = getMigrationStatus();
      setMigrationStatus(status);
      setComponentStatus({
        useLegacy: shouldUseLegacyState(componentName),
        isMigrated: status.migratedComponents.includes(componentName),
        hasFailed: status.failedComponents.includes(componentName),
        lastError: status.lastError,
      });
    };
    
    // Check for updates periodically during migration
    // 🔧 PERFORMANCE FIX: Disable frequent polling to prevent UI flicker
    const interval = migrationStatus.isInProgress && process.env.NODE_ENV === 'development' ? 
      setInterval(updateStatus, 5000) : null; // Reduced from 1000ms to 5000ms
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [componentName, migrationStatus.isInProgress]);
  
  // Safe wrapper for migration operations
  const withSafety = useCallback(<T>(
    legacyImplementation: () => T,
    newImplementation: () => T
  ): T => {
    return withMigrationSafety(componentName, legacyImplementation, newImplementation);
  }, [componentName]);
  
  // Mark component as successfully migrated
  const markMigrated = useCallback(() => {
    markComponentMigrated(componentName);
    setComponentStatus(prev => ({ ...prev, isMigrated: true, useLegacy: false }));
  }, [componentName]);
  
  // Mark component migration as failed
  const markFailed = useCallback((error: Error) => {
    markComponentFailed(componentName, error);
    setComponentStatus(prev => ({ 
      ...prev, 
      hasFailed: true, 
      useLegacy: true, 
      lastError: error.message 
    }));
  }, [componentName]);
  
  return {
    // Status information
    migrationStatus,
    componentStatus,
    
    // Migration utilities
    withSafety,
    markMigrated,
    markFailed,
    
    // Convenience flags
    shouldUseLegacy: componentStatus.useLegacy,
    isMigrationInProgress: migrationStatus.isInProgress,
    canUseMigratedState: migrationStatus.flags.enableGameStoreMigration || 
                        migrationStatus.flags.enableUIStoreMigration ||
                        migrationStatus.flags.enablePersistenceStoreMigration,
  };
};

/**
 * Hook for using legacy state with migration safety
 * 
 * This hook helps components that need to conditionally use either
 * legacy useState or new store state based on migration status.
 */
export const useLegacyState = <T>(
  componentName: string,
  legacyStateHook: () => T,
  newStateHook: () => T
): T => {
  const { withSafety } = useMigrationSafety(componentName);
  
  return withSafety(legacyStateHook, newStateHook);
};

/**
 * Hook for safe store access during migration
 * 
 * This hook provides access to stores with automatic fallback
 * to legacy state if the migration hasn't been completed or failed.
 */
export const useSafeStore = <T>(
  componentName: string,
  storeSelector: () => T,
  fallbackValue: T
): T => {
  const { shouldUseLegacy } = useMigrationSafety(componentName);
  
  if (shouldUseLegacy) {
    return fallbackValue;
  }
  
  try {
    return storeSelector();
  } catch (error) {
    logger.error(`Store access failed for ${componentName}:`, error);
    return fallbackValue;
  }
};

/**
 * Hook for migration-aware effect handling
 * 
 * This hook ensures effects only run when the component is using
 * the intended state management approach (legacy vs new stores).
 */
export const useMigrationEffect = (
  componentName: string,
  effect: () => void | (() => void),
  deps: React.DependencyList,
  runOnLegacy: boolean = true,
  runOnNew: boolean = true
) => {
  const { shouldUseLegacy } = useMigrationSafety(componentName);
  
  useEffect(() => {
    const shouldRun = shouldUseLegacy ? runOnLegacy : runOnNew;
    
    if (shouldRun) {
      return effect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldUseLegacy, runOnLegacy, runOnNew, effect, ...deps]);
};

/**
 * Hook for migration status monitoring
 * 
 * This hook provides real-time updates about the overall migration
 * progress and can be used in developer tools or admin interfaces.
 */
export const useMigrationMonitor = () => {
  const [status, setStatus] = useState(() => getMigrationStatus());
  
  useEffect(() => {
    if (!status.isInProgress) {
      return;
    }
    
    const interval = setInterval(() => {
      setStatus(getMigrationStatus());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [status.isInProgress]);
  
  const getProgress = useCallback(() => {
    const total = status.migratedComponents.length + status.failedComponents.length;
    const successful = status.migratedComponents.length;
    
    return {
      total,
      successful,
      failed: status.failedComponents.length,
      percentage: total > 0 ? (successful / total) * 100 : 0,
    };
  }, [status]);
  
  const getDuration = useCallback(() => {
    if (!status.isInProgress && status.currentPhase === 'none') {
      return 0;
    }
    
    const endTime = status.isInProgress ? Date.now() : status.startTime;
    return endTime - status.startTime;
  }, [status]);
  
  return {
    status,
    progress: getProgress(),
    duration: getDuration(),
    isHealthy: status.failedComponents.length === 0,
  };
};