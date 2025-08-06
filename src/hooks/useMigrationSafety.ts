/**
 * Migration Safety Hook - Stub Implementation
 * 
 * This is a stub implementation that always returns shouldUseLegacy: false
 * since we've completed the migration to Zustand and no longer use legacy fallbacks.
 * 
 * TODO: Remove this completely when all references are cleaned up.
 */

export interface MigrationSafetyResult {
  shouldUseLegacy: boolean;
  migrationStatus: 'zustand' | 'legacy';
}

export function useMigrationSafety(_componentName: string): MigrationSafetyResult {
  // Always use Zustand implementation - migration is complete
  return {
    shouldUseLegacy: false,
    migrationStatus: 'zustand',
  };
}