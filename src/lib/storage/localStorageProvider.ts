// localStorage storage provider implementation
import type { IStorageProvider } from './types';
import { StorageError } from './types';
import type { Player, Season, Tournament } from '../../types';
// AppSettings interface defined inline to avoid circular dependency
interface AppSettings {
  currentGameId: string | null;
  lastHomeTeamName?: string;
  language?: string;
  hasSeenAppGuide?: boolean;
  autoBackupEnabled?: boolean;
  autoBackupIntervalHours?: number;
  lastBackupTime?: string;
  backupEmail?: string;
  useDemandCorrection?: boolean;
}

// Import storage keys
import { MASTER_ROSTER_KEY } from '../../config/storageKeys';
import { getSeasons, saveSeason, deleteSeason, updateSeason } from '../../utils/seasons';
import { getTournaments, saveTournament, deleteTournament, updateTournament } from '../../utils/tournaments';
// Removed circular import of appSettings
import { generateFullBackupJson, importFullBackup } from '../../utils/fullBackup';
import { getLocalStorageItem, setLocalStorageItem } from '../../utils/localStorage';

export class LocalStorageProvider implements IStorageProvider {
  
  getProviderName(): string {
    return 'localStorage';
  }

  async isOnline(): Promise<boolean> {
    // localStorage is always "online" in the browser
    return true;
  }

  // Player management - implemented directly to avoid circular dependency
  async getPlayers(): Promise<Player[]> {
    try {
      const rosterJson = getLocalStorageItem(MASTER_ROSTER_KEY);
      if (!rosterJson) {
        return [];
      }
      return JSON.parse(rosterJson) as Player[];
    } catch (error) {
      throw new StorageError('Failed to get players', 'localStorage', 'getPlayers', error as Error);
    }
  }

  private async savePlayers(players: Player[]): Promise<void> {
    try {
      setLocalStorageItem(MASTER_ROSTER_KEY, JSON.stringify(players));
    } catch (error) {
      throw new Error(`Failed to save players to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async savePlayer(player: Player): Promise<Player> {
    try {
      const currentPlayers = await this.getPlayers();
      
      // If player has ID, it's an update, otherwise it's a new player
      if (player.id) {
        const playerIndex = currentPlayers.findIndex(p => p.id === player.id);
        if (playerIndex === -1) {
          throw new Error('Player not found for update');
        }
        
        // Update the player
        const updatedPlayer = { ...currentPlayers[playerIndex], ...player };
        currentPlayers[playerIndex] = updatedPlayer;
        await this.savePlayers(currentPlayers);
        return updatedPlayer;
      } else {
        // Create new player with unique ID
        const newPlayer: Player = {
          ...player,
          id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          isGoalie: player.isGoalie || false,
          receivedFairPlayCard: player.receivedFairPlayCard || false,
        };
        
        const updatedPlayers = [...currentPlayers, newPlayer];
        await this.savePlayers(updatedPlayers);
        return newPlayer;
      }
    } catch (error) {
      throw new StorageError('Failed to save player', 'localStorage', 'savePlayer', error as Error);
    }
  }

  async deletePlayer(playerId: string): Promise<void> {
    try {
      const currentPlayers = await this.getPlayers();
      const updatedPlayers = currentPlayers.filter(p => p.id !== playerId);
      
      if (updatedPlayers.length === currentPlayers.length) {
        throw new Error('Player not found for deletion');
      }
      
      await this.savePlayers(updatedPlayers);
    } catch (error) {
      throw new StorageError('Failed to delete player', 'localStorage', 'deletePlayer', error as Error);
    }
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<Player> {
    try {
      const currentPlayers = await this.getPlayers();
      const playerIndex = currentPlayers.findIndex(p => p.id === playerId);
      
      if (playerIndex === -1) {
        throw new Error('Player not found for update');
      }
      
      // Create updated player object
      const updatedPlayer = {
        ...currentPlayers[playerIndex],
        ...updates,
        id: playerId // Ensure ID doesn't change
      };
      
      currentPlayers[playerIndex] = updatedPlayer;
      await this.savePlayers(currentPlayers);
      return updatedPlayer;
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

  // App settings - implemented directly to avoid circular dependency
  async getAppSettings(): Promise<AppSettings | null> {
    try {
      const settingsStr = getLocalStorageItem('appSettings');
      if (!settingsStr) {
        return null;
      }
      return JSON.parse(settingsStr);
    } catch (error) {
      throw new StorageError('Failed to get app settings', 'localStorage', 'getAppSettings', error as Error);
    }
  }

  async saveAppSettings(settings: AppSettings): Promise<AppSettings> {
    try {
      setLocalStorageItem('appSettings', JSON.stringify(settings));
      return settings;
    } catch (error) {
      throw new StorageError('Failed to save app settings', 'localStorage', 'saveAppSettings', error as Error);
    }
  }

  // Saved games - implemented directly to avoid circular dependency
  async getSavedGames(): Promise<unknown[]> {
    try {
      const savedGamesStr = getLocalStorageItem('savedGames');
      if (!savedGamesStr) {
        return [];
      }
      const savedGamesCollection = JSON.parse(savedGamesStr);
      return Object.values(savedGamesCollection);
    } catch (error) {
      throw new StorageError('Failed to get saved games', 'localStorage', 'getSavedGames', error as Error);
    }
  }

  async saveSavedGame(gameData: unknown): Promise<unknown> {
    try {
      const gameWithId = gameData as { id?: string };
      const gameId = gameWithId.id || `game_${Date.now()}`;
      
      // Get existing saved games
      const savedGamesStr = getLocalStorageItem('savedGames');
      const savedGamesCollection = savedGamesStr ? JSON.parse(savedGamesStr) : {};
      
      // Add/update the game
      savedGamesCollection[gameId] = { ...gameWithId, id: gameId };
      
      // Save back to localStorage
      setLocalStorageItem('savedGames', JSON.stringify(savedGamesCollection));
      
      return savedGamesCollection[gameId];
    } catch (error) {
      throw new StorageError('Failed to save game', 'localStorage', 'saveSavedGame', error as Error);
    }
  }

  async deleteSavedGame(gameId: string): Promise<void> {
    try {
      const savedGamesStr = getLocalStorageItem('savedGames');
      if (!savedGamesStr) {
        return; // Nothing to delete
      }
      
      const savedGamesCollection = JSON.parse(savedGamesStr);
      delete savedGamesCollection[gameId];
      
      setLocalStorageItem('savedGames', JSON.stringify(savedGamesCollection));
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