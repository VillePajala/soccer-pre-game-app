// Migration status detection and tracking
import React from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../../context/AuthContext';

export interface MigrationStatus {
  userId: string;
  hasLocalData: boolean;
  migrationCompleted: boolean;
  migrationStarted: boolean;
  lastMigrationAttempt: string | null;
  migrationProgress: number; // 0-100
  errorMessage: string | null;
  dataTypes: {
    players: number;
    seasons: number;
    tournaments: number;
    games: number;
    settings: boolean;
  };
}

/**
 * Check if user has existing data in localStorage
 */
export function checkLocalStorageData(): MigrationStatus['dataTypes'] {
  const players = JSON.parse(localStorage.getItem('masterRoster') || '[]').length;
  const seasons = JSON.parse(localStorage.getItem('seasons') || '[]').length;
  const tournaments = JSON.parse(localStorage.getItem('tournaments') || '[]').length;
  const games = Object.keys(JSON.parse(localStorage.getItem('savedGames') || '{}')).length;
  const settings = Boolean(localStorage.getItem('appSettings'));

  return { players, seasons, tournaments, games, settings };
}

/**
 * Check if user needs migration
 */
export async function checkMigrationStatus(userId: string): Promise<MigrationStatus> {
  const localData = checkLocalStorageData();
  const hasLocalData = localData.players > 0 || localData.seasons > 0 || localData.tournaments > 0 || localData.games > 0;

  try {
    // Check if migration status exists in Supabase
    const { data, error } = await supabase
      .from('migration_status')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // PGRST116 = no rows returned (expected when user hasn't migrated)
      // 42P01 = table does not exist (expected if migration_status table not created yet)
      if (error.code !== 'PGRST116' && error.code !== '42P01') {
        console.warn('Migration status check warning:', error.code, error.message);
      }
      // Continue with default values
    }

    const migrationRecord = data || {
      migration_completed: false,
      migration_started: false,
      last_migration_attempt: null,
      migration_progress: 0,
      error_message: null,
    };

    return {
      userId,
      hasLocalData,
      migrationCompleted: migrationRecord.migration_completed || false,
      migrationStarted: migrationRecord.migration_started || false,
      lastMigrationAttempt: migrationRecord.last_migration_attempt,
      migrationProgress: migrationRecord.migration_progress || 0,
      errorMessage: migrationRecord.error_message,
      dataTypes: localData,
    };
  } catch (error) {
    console.warn('Migration status check failed:', error instanceof Error ? error.message : 'Unknown error');
    // Return default status if we can't check Supabase
    return {
      userId,
      hasLocalData,
      migrationCompleted: false,
      migrationStarted: false,
      lastMigrationAttempt: null,
      migrationProgress: 0,
      errorMessage: null,
      dataTypes: localData,
    };
  }
}

/**
 * Update migration status in Supabase
 */
export async function updateMigrationStatus(
  userId: string, 
  updates: Partial<Omit<MigrationStatus, 'userId' | 'hasLocalData' | 'dataTypes'>>
): Promise<void> {
  const supabaseUpdates = {
    user_id: userId,
    migration_completed: updates.migrationCompleted,
    migration_started: updates.migrationStarted,
    last_migration_attempt: updates.lastMigrationAttempt || new Date().toISOString(),
    migration_progress: updates.migrationProgress,
    error_message: updates.errorMessage,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('migration_status')
    .upsert(supabaseUpdates, { onConflict: 'user_id' });

  if (error) {
    console.error('Error updating migration status:', error.message || 'Unknown error', error);
    // Don't throw if table doesn't exist - migration can continue
    if (error.code !== '42P01') {
      throw error;
    }
  }
}

/**
 * Hook to get migration status for current user
 */
export function useMigrationStatus() {
  const { user } = useAuth();
  const [status, setStatus] = React.useState<MigrationStatus | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadStatus() {
      if (!user) {
        setStatus(null);
        setLoading(false);
        return;
      }

      try {
        const migrationStatus = await checkMigrationStatus(user.id);
        setStatus(migrationStatus);
      } catch (error) {
        console.error('Failed to load migration status:', error);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [user]);

  const updateStatus = React.useCallback(async (updates: Partial<Omit<MigrationStatus, 'userId' | 'hasLocalData' | 'dataTypes'>>) => {
    if (!user || !status) return;

    try {
      await updateMigrationStatus(user.id, updates);
      setStatus(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Failed to update migration status:', error);
      throw error;
    }
  }, [user, status]);

  return {
    status,
    loading,
    updateStatus,
    needsMigration: status?.hasLocalData && !status?.migrationCompleted,
  };
}