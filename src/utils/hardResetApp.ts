import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { resetAppSettings } from '@/utils/appSettings';
import logger from '@/utils/logger';

export interface HardResetResult {
  playersDeleted: number;
  seasonsDeleted: number;
  tournamentsDeleted: number;
  gamesDeleted: number;
}

/**
 * Permanently deletes ALL user data (players, seasons, tournaments, games) and resets app settings.
 * Safe for both localStorage and Supabase providers.
 * Also clears PWA caches and best-effort IndexedDB used for offline features.
 */
export async function hardResetAllUserData(): Promise<HardResetResult> {
  try {
    // Fetch current data snapshots
    const [players, seasons, tournaments, gamesObj] = await Promise.all([
      storageManager.getPlayers(),
      storageManager.getSeasons(),
      storageManager.getTournaments(),
      storageManager.getSavedGames(),
    ]);

    const gameIds = Object.keys(gamesObj as Record<string, unknown>);

    // Delete domain data in parallel batches
    await Promise.all([
      Promise.all(players.map((p) => storageManager.deletePlayer(p.id).catch((e) => logger.warn('[HardReset] deletePlayer failed', p.id, e)))),
      Promise.all(seasons.map((s) => storageManager.deleteSeason(s.id).catch((e) => logger.warn('[HardReset] deleteSeason failed', s.id, e)))),
      Promise.all(tournaments.map((t) => storageManager.deleteTournament(t.id).catch((e) => logger.warn('[HardReset] deleteTournament failed', t.id, e)))),
      Promise.all(gameIds.map((id) => storageManager.deleteSavedGame(id).catch((e) => logger.warn('[HardReset] deleteSavedGame failed', id, e)))),
    ]);

    // Reset app settings to defaults
    await resetAppSettings();

    // Best-effort: clear all PWA caches (static, data, etc.)
    if (typeof caches !== 'undefined' && caches?.keys) {
      try {
        const names = await caches.keys();
        await Promise.all(names.map((name) => caches.delete(name)));
        logger.debug('[HardReset] Cleared PWA caches:', names);
      } catch (err) {
        logger.warn('[HardReset] Failed clearing caches', err);
      }
    }

    // Best-effort: clear offline IndexedDB used by the app (if present)
    if (typeof indexedDB !== 'undefined' && indexedDB.deleteDatabase) {
      try {
        indexedDB.deleteDatabase('matchops-coach-offline');
      } catch (err) {
        logger.warn('[HardReset] Failed deleting IndexedDB', err);
      }
    }

    return {
      playersDeleted: players.length,
      seasonsDeleted: seasons.length,
      tournamentsDeleted: tournaments.length,
      gamesDeleted: gameIds.length,
    };
  } catch (error) {
    logger.error('[HardReset] Unexpected error', error);
    throw error;
  }
}


