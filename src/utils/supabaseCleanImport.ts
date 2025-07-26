import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';
import type { Player, Season, Tournament, SavedGamesCollection } from '@/types';
import type { AppSettings } from '@/utils/appSettings';
import {
  SAVED_GAMES_KEY,
  APP_SETTINGS_KEY,
  SEASONS_LIST_KEY,
  TOURNAMENTS_LIST_KEY,
  MASTER_ROSTER_KEY,
} from '@/config/storageKeys';

interface BackupData {
  localStorage?: {
    [SAVED_GAMES_KEY]?: SavedGamesCollection | null;
    [APP_SETTINGS_KEY]?: AppSettings | null;
    [SEASONS_LIST_KEY]?: Season[] | null;
    [TOURNAMENTS_LIST_KEY]?: Tournament[] | null;
    [MASTER_ROSTER_KEY]?: Player[] | null;
  };
}

/**
 * Clears all user data from Supabase
 */
async function clearAllSupabaseData(): Promise<void> {
  logger.log('[SupabaseCleanImport] Clearing all Supabase data...');
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');
  
  // Delete in order to avoid foreign key constraints
  await supabase.from('games').delete().eq('user_id', user.id);
  await supabase.from('tournaments').delete().eq('user_id', user.id);
  await supabase.from('seasons').delete().eq('user_id', user.id);
  await supabase.from('players').delete().eq('user_id', user.id);
  await supabase.from('app_settings').delete().eq('user_id', user.id);
  
  logger.log('[SupabaseCleanImport] All data cleared');
}

/**
 * Clean import that replaces all Supabase data with backup file contents
 */
export async function cleanImportToSupabase(jsonContent: string): Promise<{
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
  logger.log('[SupabaseCleanImport] Starting clean import...');
  
  try {
    const backupData: BackupData = JSON.parse(jsonContent);
    
    if (!backupData.localStorage) {
      throw new Error('Invalid backup format - missing localStorage data');
    }
    
    // Type the localStorage object for old key access
    const localStorage = backupData.localStorage as Record<string, unknown>;
    
    const playersToImport = (localStorage[MASTER_ROSTER_KEY] || 
                           localStorage['soccerMasterRoster'] || []) as Player[];
    const seasonsToImport = (localStorage[SEASONS_LIST_KEY] || 
                           localStorage['soccerSeasons'] || []) as Season[];
    const tournamentsToImport = (localStorage[TOURNAMENTS_LIST_KEY] || 
                               localStorage['soccerTournaments'] || []) as Tournament[];
    const gamesToImport = (localStorage[SAVED_GAMES_KEY] || 
                         localStorage['savedSoccerGames'] || {}) as SavedGamesCollection;
    const settingsToImport = (localStorage[APP_SETTINGS_KEY] || 
                            localStorage['soccerAppSettings'] || null) as AppSettings | null;
    
    // Show confirmation with strong warning
    if (!window.confirm(
      `⚠️ WARNING: This will COMPLETELY REPLACE all your Supabase data!\n\n` +
      `This will:\n` +
      `- DELETE all existing data in Supabase\n` +
      `- Import ${playersToImport.length} players\n` +
      `- Import ${seasonsToImport.length} seasons\n` +
      `- Import ${tournamentsToImport.length} tournaments\n` +
      `- Import ${Object.keys(gamesToImport).length} games\n\n` +
      `This action cannot be undone. Continue?`
    )) {
      return {
        success: false,
        message: 'Import cancelled by user'
      };
    }
    
    // Clear all existing data first
    await clearAllSupabaseData();
    
    const stats = {
      players: 0,
      seasons: 0,
      tournaments: 0,
      games: 0,
      settings: false
    };
    
    // Track ID mappings
    const gameIdMapping: Record<string, string> = {};
    
    // Import players
    for (const player of playersToImport) {
      try {
        await storageManager.savePlayer({ ...player, id: '' });
        stats.players++;
      } catch (error) {
        logger.error(`Failed to import player:`, error);
      }
    }
    
    // Import seasons
    for (const season of seasonsToImport) {
      try {
        await storageManager.saveSeason({ ...season, id: '' });
        stats.seasons++;
      } catch (error) {
        logger.error(`Failed to import season:`, error);
      }
    }
    
    // Import tournaments
    for (const tournament of tournamentsToImport) {
      try {
        await storageManager.saveTournament({ ...tournament, id: '' });
        stats.tournaments++;
      } catch (error) {
        logger.error(`Failed to import tournament:`, error);
      }
    }
    
    // Import games with ID mapping
    for (const [oldGameId, game] of Object.entries(gamesToImport)) {
      try {
        if (game && typeof game === 'object') {
          const savedGame = await storageManager.saveSavedGame(game);
          const newGameId = (savedGame as Record<string, unknown> & { id?: string }).id;
          
          if (newGameId && newGameId !== oldGameId) {
            gameIdMapping[oldGameId] = newGameId;
          }
          
          stats.games++;
        }
      } catch (error) {
        logger.error(`Failed to import game:`, error);
      }
    }
    
    // Import settings with mapped currentGameId
    if (settingsToImport) {
      try {
        const settingsToSave = { ...settingsToImport };
        if (settingsToSave.currentGameId && gameIdMapping[settingsToSave.currentGameId]) {
          settingsToSave.currentGameId = gameIdMapping[settingsToSave.currentGameId];
        }
        
        await storageManager.saveAppSettings(settingsToSave);
        stats.settings = true;
      } catch (error) {
        logger.error('Failed to import settings:', error);
      }
    }
    
    const message = `Clean import completed! Imported: ${stats.players} players, ${stats.seasons} seasons, ${stats.tournaments} tournaments, ${stats.games} games${stats.settings ? ', and app settings' : ''}`;
    logger.log(`[SupabaseCleanImport] ${message}`);
    
    return {
      success: true,
      message,
      details: stats
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[SupabaseCleanImport] Import failed:', error);
    
    return {
      success: false,
      message: `Import failed: ${errorMessage}`
    };
  }
}