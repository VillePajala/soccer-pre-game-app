// Supabase import utility for migration
import { supabase } from '../supabase';
import { updateMigrationStatus } from './migrationStatus';
import type { LocalDataExport } from './exportLocalData';
import { toSupabase } from '../../utils/transforms';
import type { Player, Season, Tournament } from '../../types';

export interface ImportProgress {
  stage: 'players' | 'seasons' | 'tournaments' | 'games' | 'settings' | 'complete';
  completed: number;
  total: number;
  currentItem?: string;
  errors: string[];
}

export interface ImportResult {
  success: boolean;
  imported: {
    players: number;
    seasons: number;
    tournaments: number;
    games: number;
    settings: boolean;
  };
  errors: string[];
  duration: number;
}

/**
 * Import localStorage data to Supabase
 */
export async function importDataToSupabase(
  exportData: LocalDataExport,
  userId: string,
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportResult> {
  const startTime = Date.now();
  const result: ImportResult = {
    success: false,
    imported: {
      players: 0,
      seasons: 0,
      tournaments: 0,
      games: 0,
      settings: false,
    },
    errors: [],
    duration: 0,
  };

  try {
    console.log('Starting Supabase data import for user:', userId);

    // Update migration status to started
    await updateMigrationStatus(userId, {
      migrationStarted: true,
      migrationProgress: 0,
      errorMessage: null,
    });

    const { data } = exportData;
    const totalItems = data.players.length + data.seasons.length + data.tournaments.length + 
                      Object.keys(data.savedGames).length + (data.appSettings ? 1 : 0);

    let completedItems = 0;

    // Import players
    onProgress?.({
      stage: 'players',
      completed: 0,
      total: data.players.length,
      errors: result.errors,
    });

    for (const player of data.players) {
      try {
        await importPlayer(player, userId);
        result.imported.players++;
        completedItems++;
        
        onProgress?.({
          stage: 'players',
          completed: result.imported.players,
          total: data.players.length,
          currentItem: player.name,
          errors: result.errors,
        });

        // Update overall progress
        const progress = Math.round((completedItems / totalItems) * 100);
        await updateMigrationStatus(userId, { migrationProgress: progress });
      } catch (error) {
        const errorMsg = `Failed to import player ${player.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Import seasons
    onProgress?.({
      stage: 'seasons',
      completed: 0,
      total: data.seasons.length,
      errors: result.errors,
    });

    for (const season of data.seasons) {
      try {
        await importSeason(season, userId);
        result.imported.seasons++;
        completedItems++;
        
        onProgress?.({
          stage: 'seasons',
          completed: result.imported.seasons,
          total: data.seasons.length,
          currentItem: season.name,
          errors: result.errors,
        });

        const progress = Math.round((completedItems / totalItems) * 100);
        await updateMigrationStatus(userId, { migrationProgress: progress });
      } catch (error) {
        const errorMsg = `Failed to import season ${season.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Import tournaments
    onProgress?.({
      stage: 'tournaments',
      completed: 0,
      total: data.tournaments.length,
      errors: result.errors,
    });

    for (const tournament of data.tournaments) {
      try {
        await importTournament(tournament, userId);
        result.imported.tournaments++;
        completedItems++;
        
        onProgress?.({
          stage: 'tournaments',
          completed: result.imported.tournaments,
          total: data.tournaments.length,
          currentItem: tournament.name,
          errors: result.errors,
        });

        const progress = Math.round((completedItems / totalItems) * 100);
        await updateMigrationStatus(userId, { migrationProgress: progress });
      } catch (error) {
        const errorMsg = `Failed to import tournament ${tournament.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Import saved games
    const gameEntries = Object.entries(data.savedGames);
    onProgress?.({
      stage: 'games',
      completed: 0,
      total: gameEntries.length,
      errors: result.errors,
    });

    for (const [gameId, game] of gameEntries) {
      try {
        await importGame(game, userId);
        result.imported.games++;
        completedItems++;
        
        onProgress?.({
          stage: 'games',
          completed: result.imported.games,
          total: gameEntries.length,
          currentItem: `Game ${gameId}`,
          errors: result.errors,
        });

        const progress = Math.round((completedItems / totalItems) * 100);
        await updateMigrationStatus(userId, { migrationProgress: progress });
      } catch (error) {
        const errorMsg = `Failed to import game ${gameId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Import app settings
    if (data.appSettings) {
      onProgress?.({
        stage: 'settings',
        completed: 0,
        total: 1,
        errors: result.errors,
      });

      try {
        await importAppSettings(data.appSettings, userId);
        result.imported.settings = true;
        completedItems++;
        
        onProgress?.({
          stage: 'settings',
          completed: 1,
          total: 1,
          currentItem: 'App Settings',
          errors: result.errors,
        });
      } catch (error) {
        const errorMsg = `Failed to import app settings: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    // Mark migration as complete
    const hasErrors = result.errors.length > 0;
    await updateMigrationStatus(userId, {
      migrationCompleted: !hasErrors,
      migrationProgress: 100,
      errorMessage: hasErrors ? result.errors.join('; ') : null,
    });

    result.success = !hasErrors;
    result.duration = Date.now() - startTime;

    onProgress?.({
      stage: 'complete',
      completed: completedItems,
      total: totalItems,
      errors: result.errors,
    });

    console.log('Import completed:', result);
    return result;

  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    result.duration = Date.now() - startTime;

    await updateMigrationStatus(userId, {
      migrationCompleted: false,
      errorMessage: errorMsg,
    });

    console.error('Import failed:', error);
    return result;
  }
}

/**
 * Import a single player to Supabase
 */
async function importPlayer(player: Player, userId: string): Promise<void> {
  const supabasePlayer = toSupabase.player(player, userId);
  
  const { error } = await supabase
    .from('players')
    .upsert(supabasePlayer, { onConflict: 'id' });

  if (error) {
    throw error;
  }
}

/**
 * Import a single season to Supabase
 */
async function importSeason(season: Season, userId: string): Promise<void> {
  const supabaseSeason = toSupabase.season(season, userId);
  
  const { error } = await supabase
    .from('seasons')
    .upsert(supabaseSeason, { onConflict: 'id' });

  if (error) {
    throw error;
  }
}

/**
 * Import a single tournament to Supabase
 */
async function importTournament(tournament: Tournament, userId: string): Promise<void> {
  const supabaseTournament = toSupabase.tournament(tournament, userId);
  
  const { error } = await supabase
    .from('tournaments')
    .upsert(supabaseTournament, { onConflict: 'id' });

  if (error) {
    throw error;
  }
}

/**
 * Import a single game to Supabase
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importGame(game: any, userId: string): Promise<void> {
  const supabaseGame = toSupabase.game(game, userId);
  
  const { error } = await supabase
    .from('games')
    .upsert(supabaseGame, { onConflict: 'id' });

  if (error) {
    throw error;
  }
}

/**
 * Import app settings to Supabase
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function importAppSettings(settings: any, userId: string): Promise<void> {
  const supabaseSettings = toSupabase.appSettings(settings, userId);
  
  const { error } = await supabase
    .from('app_settings')
    .upsert(supabaseSettings, { onConflict: 'user_id' });

  if (error) {
    throw error;
  }
}

/**
 * Rollback migration by deleting imported data
 */
export async function rollbackMigration(userId: string): Promise<void> {
  try {
    console.log('Rolling back migration for user:', userId);

    // Delete in reverse order to respect foreign key constraints
    const tables = ['games', 'app_settings', 'tournaments', 'seasons', 'players'];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error(`Error deleting from ${table}:`, error);
        throw error;
      }
    }

    // Reset migration status
    await updateMigrationStatus(userId, {
      migrationCompleted: false,
      migrationStarted: false,
      migrationProgress: 0,
      errorMessage: null,
    });

    console.log('Migration rollback completed');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}