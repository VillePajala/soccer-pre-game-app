// localStorage data export utility for migration
import { getMasterRoster } from '../../utils/masterRosterManager';
import { getSeasons } from '../../utils/seasons';
import { getTournaments } from '../../utils/tournaments';
import { getSavedGames } from '../../utils/savedGames';
import { getAppSettings } from '../../utils/appSettings';
import type { Player, Season, Tournament, AppState } from '../../types';
import type { AppSettings } from '../../utils/appSettings';

export interface LocalDataExport {
  exportVersion: string;
  exportDate: string;
  source: 'localStorage';
  userId?: string;
  data: {
    players: Player[];
    seasons: Season[];
    tournaments: Tournament[];
    savedGames: Record<string, AppState>;
    appSettings: AppSettings | null;
  };
  stats: {
    totalPlayers: number;
    totalSeasons: number;
    totalTournaments: number;
    totalGames: number;
    hasSettings: boolean;
  };
}

/**
 * Export all localStorage data in a structured format
 */
export async function exportLocalStorageData(): Promise<LocalDataExport> {
  try {
    console.log('Starting localStorage data export...');

    // Fetch all data from localStorage utilities
    const [players, seasons, tournaments, savedGames, appSettings] = await Promise.all([
      getMasterRoster(),
      getSeasons(),
      getTournaments(),
      getSavedGames(),
      getAppSettings(),
    ]);

    console.log('Data fetched:', {
      players: players.length,
      seasons: seasons.length,
      tournaments: tournaments.length,
      games: Object.keys(savedGames).length,
      hasSettings: Boolean(appSettings),
    });

    const exportData: LocalDataExport = {
      exportVersion: '1.0.0',
      exportDate: new Date().toISOString(),
      source: 'localStorage',
      data: {
        players,
        seasons,
        tournaments,
        savedGames,
        appSettings,
      },
      stats: {
        totalPlayers: players.length,
        totalSeasons: seasons.length,
        totalTournaments: tournaments.length,
        totalGames: Object.keys(savedGames).length,
        hasSettings: Boolean(appSettings),
      },
    };

    // Validate exported data
    validateExportData(exportData);

    console.log('localStorage export completed successfully');
    return exportData;
  } catch (error) {
    console.error('Error exporting localStorage data:', error);
    throw new Error(`Failed to export localStorage data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate exported data for completeness and integrity
 */
function validateExportData(exportData: LocalDataExport): void {
  const { data, stats } = exportData;

  // Validate players
  if (data.players.length !== stats.totalPlayers) {
    throw new Error('Player count mismatch in export');
  }

  data.players.forEach((player, index) => {
    if (!player.id || !player.name) {
      throw new Error(`Invalid player at index ${index}: missing id or name`);
    }
  });

  // Validate seasons
  if (data.seasons.length !== stats.totalSeasons) {
    throw new Error('Season count mismatch in export');
  }

  data.seasons.forEach((season, index) => {
    if (!season.id || !season.name) {
      throw new Error(`Invalid season at index ${index}: missing id or name`);
    }
  });

  // Validate tournaments
  if (data.tournaments.length !== stats.totalTournaments) {
    throw new Error('Tournament count mismatch in export');
  }

  data.tournaments.forEach((tournament, index) => {
    if (!tournament.id || !tournament.name) {
      throw new Error(`Invalid tournament at index ${index}: missing id or name`);
    }
  });

  // Validate saved games
  const gameCount = Object.keys(data.savedGames).length;
  if (gameCount !== stats.totalGames) {
    throw new Error('Saved games count mismatch in export');
  }

  Object.entries(data.savedGames).forEach(([gameId, game]) => {
    if (!gameId || !game.teamName) {
      throw new Error(`Invalid game ${gameId}: missing gameId or teamName`);
    }
  });

  console.log('Export data validation passed');
}

/**
 * Export data to a downloadable JSON file
 */
export async function downloadLocalDataExport(): Promise<void> {
  try {
    const exportData = await exportLocalStorageData();
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `soccer-coach-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    console.log('Export file downloaded successfully');
  } catch (error) {
    console.error('Error downloading export:', error);
    throw error;
  }
}

/**
 * Get a summary of localStorage data without full export
 */
export async function getLocalDataSummary(): Promise<LocalDataExport['stats']> {
  try {
    const [players, seasons, tournaments, savedGames, appSettings] = await Promise.all([
      getMasterRoster(),
      getSeasons(),
      getTournaments(),
      getSavedGames(),
      getAppSettings(),
    ]);

    return {
      totalPlayers: players.length,
      totalSeasons: seasons.length,
      totalTournaments: tournaments.length,
      totalGames: Object.keys(savedGames).length,
      hasSettings: Boolean(appSettings),
    };
  } catch (error) {
    console.error('Error getting local data summary:', error);
    return {
      totalPlayers: 0,
      totalSeasons: 0,
      totalTournaments: 0,
      totalGames: 0,
      hasSettings: false,
    };
  }
}

/**
 * Check if there's significant data to migrate
 */
export async function hasSignificantLocalData(): Promise<boolean> {
  const summary = await getLocalDataSummary();
  return summary.totalPlayers > 0 || 
         summary.totalSeasons > 0 || 
         summary.totalTournaments > 0 || 
         summary.totalGames > 0;
}