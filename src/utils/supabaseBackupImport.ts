import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';
import { Player, Season, Tournament } from '@/types';
import type { SavedGamesCollection } from '@/types';
import type { AppSettings } from '@/utils/appSettings';
import {
  SAVED_GAMES_KEY,
  APP_SETTINGS_KEY,
  SEASONS_LIST_KEY,
  TOURNAMENTS_LIST_KEY,
  MASTER_ROSTER_KEY,
} from '@/config/storageKeys';

interface BackupData {
  meta?: {
    schema?: number;
    exportedAt?: string;
  };
  localStorage?: {
    [SAVED_GAMES_KEY]?: SavedGamesCollection | null;
    [APP_SETTINGS_KEY]?: AppSettings | null;
    [SEASONS_LIST_KEY]?: Season[] | null;
    [TOURNAMENTS_LIST_KEY]?: Tournament[] | null;
    [MASTER_ROSTER_KEY]?: Player[] | null;
  };
  // Support for new format from Supabase export
  players?: Player[];
  seasons?: Season[];
  tournaments?: Tournament[];
  savedGames?: Record<string, unknown>;
  appSettings?: AppSettings;
}

export async function importBackupToSupabase(jsonContent: string): Promise<{
  success: boolean;
  message: string;
  details?: {
    players: number;
    seasons: number;
    tournaments: number;
    games: number;
    settings: boolean;
  };
}> {
  logger.log('[SupabaseBackupImport] Starting import...');
  
  try {
    const backupData: BackupData = JSON.parse(jsonContent);
    
    let playersToImport: Player[] = [];
    let seasonsToImport: Season[] = [];
    let tournamentsToImport: Tournament[] = [];
    let gamesToImport: Record<string, unknown> = {};
    let settingsToImport: AppSettings | null = null;
    
    // Check if it's the old localStorage format
    if (backupData.localStorage) {
      logger.log('[SupabaseBackupImport] Detected localStorage format backup');
      
      playersToImport = backupData.localStorage[MASTER_ROSTER_KEY] || [];
      seasonsToImport = backupData.localStorage[SEASONS_LIST_KEY] || [];
      tournamentsToImport = backupData.localStorage[TOURNAMENTS_LIST_KEY] || [];
      gamesToImport = backupData.localStorage[SAVED_GAMES_KEY] || {};
      settingsToImport = backupData.localStorage[APP_SETTINGS_KEY] || null;
    } 
    // Or the new Supabase export format
    else if (backupData.players || backupData.seasons || backupData.tournaments) {
      logger.log('[SupabaseBackupImport] Detected Supabase format backup');
      
      playersToImport = backupData.players || [];
      seasonsToImport = backupData.seasons || [];
      tournamentsToImport = backupData.tournaments || [];
      gamesToImport = backupData.savedGames || {};
      settingsToImport = backupData.appSettings || null;
    } else {
      throw new Error('Unrecognized backup format');
    }
    
    // Import statistics
    const stats = {
      players: 0,
      seasons: 0,
      tournaments: 0,
      games: 0,
      settings: false
    };
    
    // Import players
    logger.log(`[SupabaseBackupImport] Importing ${playersToImport.length} players...`);
    for (const player of playersToImport) {
      try {
        // Clear the ID to let Supabase generate new ones
        const playerToSave = { ...player, id: '' };
        await storageManager.savePlayer(playerToSave);
        stats.players++;
      } catch (error) {
        logger.error(`[SupabaseBackupImport] Failed to import player ${player.name}:`, error);
      }
    }
    
    // Import seasons
    logger.log(`[SupabaseBackupImport] Importing ${seasonsToImport.length} seasons...`);
    for (const season of seasonsToImport) {
      try {
        const seasonToSave = { ...season, id: '' };
        await storageManager.saveSeason(seasonToSave);
        stats.seasons++;
      } catch (error) {
        logger.error(`[SupabaseBackupImport] Failed to import season ${season.name}:`, error);
      }
    }
    
    // Import tournaments
    logger.log(`[SupabaseBackupImport] Importing ${tournamentsToImport.length} tournaments...`);
    for (const tournament of tournamentsToImport) {
      try {
        const tournamentToSave = { ...tournament, id: '' };
        await storageManager.saveTournament(tournamentToSave);
        stats.tournaments++;
      } catch (error) {
        logger.error(`[SupabaseBackupImport] Failed to import tournament ${tournament.name}:`, error);
      }
    }
    
    // Import games
    const gameIds = Object.keys(gamesToImport);
    logger.log(`[SupabaseBackupImport] Importing ${gameIds.length} games...`);
    for (const gameId of gameIds) {
      try {
        const game = gamesToImport[gameId];
        if (game && typeof game === 'object') {
          await storageManager.saveSavedGame(game);
          stats.games++;
        }
      } catch (error) {
        logger.error(`[SupabaseBackupImport] Failed to import game ${gameId}:`, error);
      }
    }
    
    // Import app settings
    if (settingsToImport) {
      try {
        logger.log('[SupabaseBackupImport] Importing app settings...');
        await storageManager.saveAppSettings(settingsToImport);
        stats.settings = true;
      } catch (error) {
        logger.error('[SupabaseBackupImport] Failed to import app settings:', error);
      }
    }
    
    const message = `Import completed! Imported: ${stats.players} players, ${stats.seasons} seasons, ${stats.tournaments} tournaments, ${stats.games} games${stats.settings ? ', and app settings' : ''}`;
    logger.log(`[SupabaseBackupImport] ${message}`);
    
    return {
      success: true,
      message,
      details: stats
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[SupabaseBackupImport] Import failed:', error);
    
    return {
      success: false,
      message: `Import failed: ${errorMessage}`
    };
  }
}