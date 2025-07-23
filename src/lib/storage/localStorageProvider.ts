// localStorage storage provider implementation
import type { IStorageProvider } from './types';
import { StorageError } from './types';
import type { Player, Season, Tournament } from '../../types';
import type { AppSettings } from '../../utils/appSettings';

// Import existing localStorage utilities
import { getMasterRoster, addPlayer, updatePlayer as updatePlayerInRoster, deletePlayer as removePlayerFromRoster } from '../../utils/masterRosterManager';
import { getSeasons, saveSeason, deleteSeason, updateSeason } from '../../utils/seasons';
import { getTournaments, saveTournament, deleteTournament, updateTournament } from '../../utils/tournaments';
import { getAppSettings, saveAppSettings } from '../../utils/appSettings';
import { getSavedGames, saveGame, deleteGame } from '../../utils/savedGames';
import { generateFullBackupJson, importFullBackup } from '../../utils/fullBackup';

export class LocalStorageProvider implements IStorageProvider {
  private static warned = false;

  constructor() {
    if (!LocalStorageProvider.warned && process.env.NODE_ENV !== 'test') {
      console.warn(
        '[Deprecation] LocalStorageProvider will be removed once all users migrate to Supabase.'
      );
      LocalStorageProvider.warned = true;
    }
  }
  
  getProviderName(): string {
    return 'localStorage';
  }

  async isOnline(): Promise<boolean> {
    // localStorage is always "online" in the browser
    return true;
  }

  // Player management
  async getPlayers(): Promise<Player[]> {
    try {
      return await getMasterRoster();
    } catch (error) {
      throw new StorageError('Failed to get players', 'localStorage', 'getPlayers', error as Error);
    }
  }

  async savePlayer(player: Player): Promise<Player> {
    try {
      // If player has ID, it's an update, otherwise it's a new player
      if (player.id) {
        const updated = await updatePlayerInRoster(player.id, player);
        if (!updated) {
          throw new Error('Player update returned null');
        }
        return updated;
      } else {
        // Create new player
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, isGoalie, receivedFairPlayCard, ...playerData } = player;
        const newPlayer = await addPlayer(playerData);
        if (!newPlayer) {
          throw new Error('Player creation returned null');
        }
        return newPlayer;
      }
    } catch (error) {
      throw new StorageError('Failed to save player', 'localStorage', 'savePlayer', error as Error);
    }
  }

  async deletePlayer(playerId: string): Promise<void> {
    try {
      await removePlayerFromRoster(playerId);
    } catch (error) {
      throw new StorageError('Failed to delete player', 'localStorage', 'deletePlayer', error as Error);
    }
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<Player> {
    try {
      const updated = await updatePlayerInRoster(playerId, updates);
      if (!updated) {
        throw new Error('Player update returned null');
      }
      return updated;
    } catch (error) {
      throw new StorageError('Failed to update player', 'localStorage', 'updatePlayer', error as Error);
    }
  }

  // Season management
  async getSeasons(): Promise<Season[]> {
    try {
      return await getSeasons();
    } catch (error) {
      throw new StorageError('Failed to get seasons', 'localStorage', 'getSeasons', error as Error);
    }
  }

  async saveSeason(season: Season): Promise<Season> {
    try {
      return await saveSeason(season);
    } catch (error) {
      throw new StorageError('Failed to save season', 'localStorage', 'saveSeason', error as Error);
    }
  }

  async deleteSeason(seasonId: string): Promise<void> {
    try {
      await deleteSeason(seasonId);
    } catch (error) {
      throw new StorageError('Failed to delete season', 'localStorage', 'deleteSeason', error as Error);
    }
  }

  async updateSeason(seasonId: string, updates: Partial<Season>): Promise<Season> {
    try {
      const updated = await updateSeason(seasonId, updates);
      if (!updated) {
        throw new Error('Season update returned null');
      }
      return updated;
    } catch (error) {
      throw new StorageError('Failed to update season', 'localStorage', 'updateSeason', error as Error);
    }
  }

  // Tournament management
  async getTournaments(): Promise<Tournament[]> {
    try {
      return await getTournaments();
    } catch (error) {
      throw new StorageError('Failed to get tournaments', 'localStorage', 'getTournaments', error as Error);
    }
  }

  async saveTournament(tournament: Tournament): Promise<Tournament> {
    try {
      return await saveTournament(tournament);
    } catch (error) {
      throw new StorageError('Failed to save tournament', 'localStorage', 'saveTournament', error as Error);
    }
  }

  async deleteTournament(tournamentId: string): Promise<void> {
    try {
      await deleteTournament(tournamentId);
    } catch (error) {
      throw new StorageError('Failed to delete tournament', 'localStorage', 'deleteTournament', error as Error);
    }
  }

  async updateTournament(tournamentId: string, updates: Partial<Tournament>): Promise<Tournament> {
    try {
      const updated = await updateTournament(tournamentId, updates);
      if (!updated) {
        throw new Error('Tournament update returned null');
      }
      return updated;
    } catch (error) {
      throw new StorageError('Failed to update tournament', 'localStorage', 'updateTournament', error as Error);
    }
  }

  // App settings
  async getAppSettings(): Promise<AppSettings | null> {
    try {
      return await getAppSettings();
    } catch (error) {
      throw new StorageError('Failed to get app settings', 'localStorage', 'getAppSettings', error as Error);
    }
  }

  async saveAppSettings(settings: AppSettings): Promise<AppSettings> {
    try {
      return await saveAppSettings(settings);
    } catch (error) {
      throw new StorageError('Failed to save app settings', 'localStorage', 'saveAppSettings', error as Error);
    }
  }

  // Saved games
  async getSavedGames(): Promise<unknown[]> {
    try {
      const savedGames = await getSavedGames();
      return Object.values(savedGames);
    } catch (error) {
      throw new StorageError('Failed to get saved games', 'localStorage', 'getSavedGames', error as Error);
    }
  }

  async saveSavedGame(gameData: unknown): Promise<unknown> {
    try {
      const gameWithId = gameData as { id?: string };
      const gameId = gameWithId.id || `game_${Date.now()}`;
      return await saveGame(gameId, gameData);
    } catch (error) {
      throw new StorageError('Failed to save game', 'localStorage', 'saveSavedGame', error as Error);
    }
  }

  async deleteSavedGame(gameId: string): Promise<void> {
    try {
      await deleteGame(gameId);
    } catch (error) {
      throw new StorageError('Failed to delete saved game', 'localStorage', 'deleteSavedGame', error as Error);
    }
  }

  // Backup/restore
  async exportAllData(): Promise<unknown> {
    try {
      const jsonString = await generateFullBackupJson();
      return JSON.parse(jsonString);
    } catch (error) {
      throw new StorageError('Failed to export data', 'localStorage', 'exportAllData', error as Error);
    }
  }

  async importAllData(data: unknown): Promise<void> {
    try {
      const jsonString = JSON.stringify(data);
      await importFullBackup(jsonString);
    } catch (error) {
      throw new StorageError('Failed to import data', 'localStorage', 'importAllData', error as Error);
    }
  }
}