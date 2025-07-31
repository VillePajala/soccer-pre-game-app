/**
 * Database migration to clean up roster data inconsistencies
 * This migration handles the tournament/season roster field evolution from single ID to array format
 */

import { supabase } from '../supabase';
import logger from '@/utils/logger';

export interface RosterMigrationResult {
  success: boolean;
  seasonsUpdated: number;
  tournamentsUpdated: number;
  errors: string[];
}

/**
 * Migrate roster data to ensure consistency
 * - Convert single roster IDs to arrays
 * - Clean up null/invalid roster data
 * - Ensure all rosters are properly formatted arrays
 */
export async function migrateRosterData(): Promise<RosterMigrationResult> {
  const result: RosterMigrationResult = {
    success: false,
    seasonsUpdated: 0,
    tournamentsUpdated: 0,
    errors: []
  };

  try {
    // Get current user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      result.errors.push('No authenticated user found');
      return result;
    }

    logger.log('[RosterMigration] Starting roster data migration for user:', user.id);

    // Migrate seasons
    try {
      const seasonsResult = await migrateSeasonRosters(user.id);
      result.seasonsUpdated = seasonsResult.updated;
      result.errors.push(...seasonsResult.errors);
    } catch (error) {
      result.errors.push(`Season migration failed: ${error}`);
    }

    // Migrate tournaments  
    try {
      const tournamentsResult = await migrateTournamentRosters(user.id);
      result.tournamentsUpdated = tournamentsResult.updated;
      result.errors.push(...tournamentsResult.errors);
    } catch (error) {
      result.errors.push(`Tournament migration failed: ${error}`);
    }

    result.success = result.errors.length === 0;
    logger.log('[RosterMigration] Migration completed:', result);
    
    return result;
  } catch (error) {
    result.errors.push(`Migration failed: ${error}`);
    logger.error('[RosterMigration] Migration error:', error);
    return result;
  }
}

/**
 * Migrate season roster data
 */
async function migrateSeasonRosters(userId: string): Promise<{ updated: number; errors: string[] }> {
  const result: { updated: number; errors: string[] } = { updated: 0, errors: [] };

  // Get all seasons for the user
  const { data: seasons, error: fetchError } = await supabase
    .from('seasons')
    .select('id, default_roster_ids')
    .eq('user_id', userId);

  if (fetchError) {
    result.errors.push(`Failed to fetch seasons: ${fetchError.message}`);
    return result;
  }

  if (!seasons || seasons.length === 0) {
    logger.log('[RosterMigration] No seasons found to migrate');
    return result;
  }

  // Process each season
  for (const season of seasons) {
    try {
      const updatedRoster = normalizeRosterIds(season.default_roster_ids);
      
      // Only update if the roster changed
      if (JSON.stringify(updatedRoster) !== JSON.stringify(season.default_roster_ids)) {
        const { error: updateError } = await supabase
          .from('seasons')
          .update({ default_roster_ids: updatedRoster })
          .eq('id', season.id)
          .eq('user_id', userId);

        if (updateError) {
          result.errors.push(`Failed to update season ${season.id}: ${updateError.message}`);
        } else {
          result.updated++;
          logger.log(`[RosterMigration] Updated season ${season.id} roster:`, {
            old: season.default_roster_ids,
            new: updatedRoster
          });
        }
      }
    } catch (error) {
      result.errors.push(`Error processing season ${season.id}: ${error}`);
    }
  }

  return result;
}

/**
 * Migrate tournament roster data
 */
async function migrateTournamentRosters(userId: string): Promise<{ updated: number; errors: string[] }> {
  const result: { updated: number; errors: string[] } = { updated: 0, errors: [] };

  // Get all tournaments for the user
  const { data: tournaments, error: fetchError } = await supabase
    .from('tournaments')
    .select('id, default_roster_ids')
    .eq('user_id', userId);

  if (fetchError) {
    result.errors.push(`Failed to fetch tournaments: ${fetchError.message}`);
    return result;
  }

  if (!tournaments || tournaments.length === 0) {
    logger.log('[RosterMigration] No tournaments found to migrate');
    return result;
  }

  // Process each tournament
  for (const tournament of tournaments) {
    try {
      const updatedRoster = normalizeRosterIds(tournament.default_roster_ids);
      
      // Only update if the roster changed
      if (JSON.stringify(updatedRoster) !== JSON.stringify(tournament.default_roster_ids)) {
        const { error: updateError } = await supabase
          .from('tournaments')
          .update({ default_roster_ids: updatedRoster })
          .eq('id', tournament.id)
          .eq('user_id', userId);

        if (updateError) {
          result.errors.push(`Failed to update tournament ${tournament.id}: ${updateError.message}`);
        } else {
          result.updated++;
          logger.log(`[RosterMigration] Updated tournament ${tournament.id} roster:`, {
            old: tournament.default_roster_ids,
            new: updatedRoster
          });
        }
      }
    } catch (error) {
      result.errors.push(`Error processing tournament ${tournament.id}: ${error}`);
    }
  }

  return result;
}

/**
 * Normalize roster IDs to ensure they're always arrays of strings
 */
function normalizeRosterIds(rosterData: unknown): string[] | null {
  if (!rosterData) {
    return null;
  }

  try {
    // If it's already an array, validate and clean it
    if (Array.isArray(rosterData)) {
      return rosterData
        .filter(id => typeof id === 'string' && id.trim() !== '')
        .map(id => String(id).trim());
    }

    // If it's a string, convert to single-item array
    if (typeof rosterData === 'string' && rosterData.trim() !== '') {
      return [rosterData.trim()];
    }

    // If it's some other format, try to parse as JSON
    if (typeof rosterData === 'object') {
      const jsonString = JSON.stringify(rosterData);
      try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(id => typeof id === 'string' && id.trim() !== '')
            .map(id => String(id).trim());
        }
      } catch {
        // JSON parsing failed, ignore
      }
    }

    // Fallback: return null for invalid data
    return null;
  } catch (error) {
    logger.warn('[RosterMigration] Failed to normalize roster data:', { rosterData, error });
    return null;
  }
}

/**
 * Check if roster migration is needed for the current user
 */
export async function checkRosterMigrationNeeded(): Promise<boolean> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return false;
    }

    // Check for seasons with non-array roster data
    const { data: seasons } = await supabase
      .from('seasons')
      .select('default_roster_ids')
      .eq('user_id', user.id)
      .not('default_roster_ids', 'is', null);

    // Check for tournaments with non-array roster data  
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('default_roster_ids')
      .eq('user_id', user.id)
      .not('default_roster_ids', 'is', null);

    const allRosters = [
      ...(seasons?.map((s: { default_roster_ids: unknown }) => s.default_roster_ids) || []),
      ...(tournaments?.map((t: { default_roster_ids: unknown }) => t.default_roster_ids) || [])
    ];

    // Check if any roster data needs normalization
    return allRosters.some(roster => {
      if (!roster) return false;
      if (!Array.isArray(roster)) return true; // Non-array needs migration
      // Check if array contains non-string values
      return roster.some(id => typeof id !== 'string' || id.trim() === '');
    });
  } catch (error) {
    logger.error('[RosterMigration] Error checking migration need:', error);
    return false;
  }
}