// Mock for LocalStorageProvider
import type { IStorageProvider } from '../types';

export class LocalStorageProvider implements IStorageProvider {
  getProviderName = jest.fn().mockReturnValue('localStorage');
  isOnline = jest.fn().mockResolvedValue(true);
  
  // Player operations
  getPlayers = jest.fn().mockResolvedValue([]);
  savePlayer = jest.fn();
  updatePlayer = jest.fn();
  deletePlayer = jest.fn().mockResolvedValue(undefined);
  
  // Season operations
  getSeasons = jest.fn().mockResolvedValue([]);
  saveSeason = jest.fn();
  updateSeason = jest.fn();
  deleteSeason = jest.fn().mockResolvedValue(undefined);
  
  // Tournament operations
  getTournaments = jest.fn().mockResolvedValue([]);
  saveTournament = jest.fn();
  updateTournament = jest.fn();
  deleteTournament = jest.fn().mockResolvedValue(undefined);
  
  // Game operations
  getGames = jest.fn().mockResolvedValue([]);
  saveGame = jest.fn();
  updateGame = jest.fn();
  deleteGame = jest.fn().mockResolvedValue(undefined);
  
  // Settings operations
  getAppSettings = jest.fn().mockResolvedValue({});
  saveAppSettings = jest.fn();
  
  // Backup operations
  exportData = jest.fn().mockResolvedValue({});
  importData = jest.fn().mockResolvedValue(undefined);
}