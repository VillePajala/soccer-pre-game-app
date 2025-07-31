/**
 * Hook to handle automatic roster data migration
 * Runs migration when user signs in and inconsistent data is detected
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { migrateRosterData, checkRosterMigrationNeeded, type RosterMigrationResult } from '@/lib/migration/rosterDataMigration';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import logger from '@/utils/logger';

export interface UseRosterMigrationResult {
  isChecking: boolean;
  isMigrating: boolean;
  migrationResult: RosterMigrationResult | null;
  migrationNeeded: boolean;
  runMigration: () => Promise<void>;
}

export function useRosterMigration(): UseRosterMigrationResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<RosterMigrationResult | null>(null);
  const [migrationNeeded, setMigrationNeeded] = useState(false);

  // Check if migration is needed when user signs in
  useEffect(() => {
    if (!user) {
      setMigrationNeeded(false);
      setMigrationResult(null);
      return;
    }

    let isCancelled = false;

    const checkMigration = async () => {
      setIsChecking(true);
      try {
        const needed = await checkRosterMigrationNeeded();
        if (!isCancelled) {
          setMigrationNeeded(needed);
          logger.log('[useRosterMigration] Migration needed:', needed);
        }
      } catch (error) {
        if (!isCancelled) {
          logger.error('[useRosterMigration] Error checking migration need:', error);
          setMigrationNeeded(false);
        }
      } finally {
        if (!isCancelled) {
          setIsChecking(false);
        }
      }
    };

    checkMigration();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const runMigration = useCallback(async (): Promise<void> => {
    if (!user || isMigrating) return;

    setIsMigrating(true);
    try {
      logger.log('[useRosterMigration] Starting roster migration');
      const result = await migrateRosterData();
      setMigrationResult(result);
      setMigrationNeeded(false);

      if (result.success) {
        logger.log('[useRosterMigration] Migration completed successfully:', result);
        
        // Invalidate queries to refetch with corrected data
        await queryClient.invalidateQueries({ queryKey: queryKeys.seasons });
        await queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
        
        // Clear any cached error states
        queryClient.removeQueries({ 
          queryKey: queryKeys.seasons,
          type: 'inactive'
        });
        queryClient.removeQueries({ 
          queryKey: queryKeys.tournaments,
          type: 'inactive'
        });
      } else {
        logger.error('[useRosterMigration] Migration completed with errors:', result.errors);
      }
    } catch (error) {
      logger.error('[useRosterMigration] Migration failed:', error);
      setMigrationResult({
        success: false,
        seasonsUpdated: 0,
        tournamentsUpdated: 0,
        errors: [`Migration failed: ${error}`]
      });
    } finally {
      setIsMigrating(false);
    }
  }, [user, isMigrating, queryClient]);

  // Auto-run migration if needed
  useEffect(() => {
    if (migrationNeeded && !isMigrating && !migrationResult && user) {
      logger.log('[useRosterMigration] Auto-running migration');
      runMigration();
    }
  }, [migrationNeeded, isMigrating, migrationResult, user, runMigration]);

  return {
    isChecking,
    isMigrating,
    migrationResult,
    migrationNeeded,
    runMigration
  };
}