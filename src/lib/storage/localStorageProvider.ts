// localStorage storage provider implementation
import type { IStorageProvider } from './types';
import { StorageError } from './types';
import type { Player, Season, Tournament } from '../../types';
import { validatePlayerData, validateAndParseJSON, ValidationError } from '../../utils/inputValidation';
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
import { MASTER_ROSTER_KEY, SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '../../config/storageKeys';
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
      // Validate player data before saving
      const validatedPlayer = validatePlayerData(player);
      
      const currentPlayers = await this.getPlayers();
      
      // If player has ID, it's an update, otherwise it's a new player
      if (validatedPlayer.id) {
        const playerIndex = currentPlayers.findIndex(p => p.id === player.id);
        if (playerIndex === -1) {
          throw new Error('Player not found for update');
        }
        
        // Update the player
        const updatedPlayer = { ...currentPlayers[playerIndex], ...validatedPlayer };
        currentPlayers[playerIndex] = updatedPlayer;
        await this.savePlayers(currentPlayers);
        return updatedPlayer;
      } else {
        // Create new player with unique ID
        const newPlayer: Player = {
          ...validatedPlayer,
          id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          isGoalie: validatedPlayer.isGoalie || false,
          receivedFairPlayCard: validatedPlayer.receivedFairPlayCard || false,
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

  // Season management - implemented directly to avoid circular dependency
  async getSeasons(): Promise<Season[]> {
    try {
      const seasonsStr = getLocalStorageItem(SEASONS_LIST_KEY);
      if (!seasonsStr) {
        return [];
      }
      return JSON.parse(seasonsStr) as Season[];
    } catch (error) {
      throw new StorageError('Failed to get seasons', 'localStorage', 'getSeasons', error as Error);
    }
  }

  private async saveSeasons(seasons: Season[]): Promise<void> {
    try {
      setLocalStorageItem(SEASONS_LIST_KEY, JSON.stringify(seasons));
    } catch (error) {
      throw new Error(`Failed to save seasons to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveSeason(season: Season): Promise<Season> {
    try {
      const currentSeasons = await this.getSeasons();
      
      if (season.id) {
        // Update existing season
        const seasonIndex = currentSeasons.findIndex(s => s.id === season.id);
        if (seasonIndex === -1) {
          throw new Error('Season not found for update');
        }
        currentSeasons[seasonIndex] = season;
      } else {
        // Create new season with unique ID
        const newSeason: Season = {
          ...season,
          id: `season_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        };
        currentSeasons.push(newSeason);
        await this.saveSeasons(currentSeasons);
        return newSeason;
      }
      
      await this.saveSeasons(currentSeasons);
      return season;
    } catch (error) {
      throw new StorageError('Failed to save season', 'localStorage', 'saveSeason', error as Error);
    }
  }

  async deleteSeason(seasonId: string): Promise<void> {
    try {
      const currentSeasons = await this.getSeasons();
      const updatedSeasons = currentSeasons.filter(s => s.id !== seasonId);
      
      if (updatedSeasons.length === currentSeasons.length) {
        throw new Error('Season not found for deletion');
      }
      
      await this.saveSeasons(updatedSeasons);
    } catch (error) {
      throw new StorageError('Failed to delete season', 'localStorage', 'deleteSeason', error as Error);
    }
  }

  async updateSeason(seasonId: string, updates: Partial<Season>): Promise<Season> {
    try {
      const currentSeasons = await this.getSeasons();
      const seasonIndex = currentSeasons.findIndex(s => s.id === seasonId);
      
      if (seasonIndex === -1) {
        throw new Error('Season not found for update');
      }
      
      // Create updated season object
      const updatedSeason = {
        ...currentSeasons[seasonIndex],
        ...updates,
        id: seasonId // Ensure ID doesn't change
      };
      
      currentSeasons[seasonIndex] = updatedSeason;
      await this.saveSeasons(currentSeasons);
      return updatedSeason;
    } catch (error) {
      throw new StorageError('Failed to update season', 'localStorage', 'updateSeason', error as Error);
    }
  }

  // Tournament management - implemented directly to avoid circular dependency
  async getTournaments(): Promise<Tournament[]> {
    try {
      const tournamentsStr = getLocalStorageItem(TOURNAMENTS_LIST_KEY);
      if (!tournamentsStr) {
        return [];
      }
      return JSON.parse(tournamentsStr) as Tournament[];
    } catch (error) {
      throw new StorageError('Failed to get tournaments', 'localStorage', 'getTournaments', error as Error);
    }
  }

  private async saveTournaments(tournaments: Tournament[]): Promise<void> {
    try {
      setLocalStorageItem(TOURNAMENTS_LIST_KEY, JSON.stringify(tournaments));
    } catch (error) {
      throw new Error(`Failed to save tournaments to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveTournament(tournament: Tournament): Promise<Tournament> {
    try {
      const currentTournaments = await this.getTournaments();
      
      if (tournament.id) {
        // Update existing tournament
        const tournamentIndex = currentTournaments.findIndex(t => t.id === tournament.id);
        if (tournamentIndex === -1) {
          throw new Error('Tournament not found for update');
        }
        currentTournaments[tournamentIndex] = tournament;
      } else {
        // Create new tournament with unique ID
        const newTournament: Tournament = {
          ...tournament,
          id: `tournament_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        };
        currentTournaments.push(newTournament);
        await this.saveTournaments(currentTournaments);
        return newTournament;
      }
      
      await this.saveTournaments(currentTournaments);
      return tournament;
    } catch (error) {
      throw new StorageError('Failed to save tournament', 'localStorage', 'saveTournament', error as Error);
    }
  }

  async deleteTournament(tournamentId: string): Promise<void> {
    try {
      const currentTournaments = await this.getTournaments();
      const updatedTournaments = currentTournaments.filter(t => t.id !== tournamentId);
      
      if (updatedTournaments.length === currentTournaments.length) {
        throw new Error('Tournament not found for deletion');
      }
      
      await this.saveTournaments(updatedTournaments);
    } catch (error) {
      throw new StorageError('Failed to delete tournament', 'localStorage', 'deleteTournament', error as Error);
    }
  }

  async updateTournament(tournamentId: string, updates: Partial<Tournament>): Promise<Tournament> {
    try {
      const currentTournaments = await this.getTournaments();
      const tournamentIndex = currentTournaments.findIndex(t => t.id === tournamentId);
      
      if (tournamentIndex === -1) {
        throw new Error('Tournament not found for update');
      }
      
      // Create updated tournament object
      const updatedTournament = {
        ...currentTournaments[tournamentIndex],
        ...updates,
        id: tournamentId // Ensure ID doesn't change
      };
      
      currentTournaments[tournamentIndex] = updatedTournament;
      await this.saveTournaments(currentTournaments);
      return updatedTournament;
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
  async getSavedGames(): Promise<unknown> {
    try {
      const savedGamesStr = getLocalStorageItem('savedGames');
      if (!savedGamesStr) {
        return {};
      }
      const savedGamesCollection = JSON.parse(savedGamesStr);
      return savedGamesCollection;
    } catch (error) {
      throw new StorageError('Failed to get saved games', 'localStorage', 'getSavedGames', error as Error);
    }
  }

  async saveSavedGame(gameData: unknown): Promise<unknown> {
    try {
      const gameWithId = gameData as { id?: string };
      
      // Validate that we have a game ID for existing games
      if (!gameWithId.id) {
        throw new Error('Game ID is required when saving game data');
      }
      
      const gameId = gameWithId.id;
      
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