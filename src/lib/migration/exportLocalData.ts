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

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
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
export function validateExportData(exportData: LocalDataExport): void {
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

/**
 * Validate exported data and return validation result
 */
export function validateExportedData(exportData: unknown): ValidationResult {
  const errors: string[] = [];

  // Check if data is an object
  if (!exportData || typeof exportData !== 'object') {
    return { isValid: false, errors: ['Invalid data: not an object'] };
  }

  const data = exportData as Record<string, unknown>;

  // Check required fields
  if (!data.exportVersion) errors.push('Missing exportVersion');
  if (!data.exportDate) errors.push('Missing exportDate');
  if (!data.source) errors.push('Missing source');
  if (!data.data) errors.push('Missing data section');
  if (!data.stats) errors.push('Missing stats section');

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  // Validate data section
  const dataSection = data.data as Record<string, unknown>;
  
  // Validate players
  if (!Array.isArray(dataSection.players)) {
    errors.push('Invalid players data: not an array');
  } else {
    dataSection.players.forEach((player: unknown, index: number) => {
      if (!player || typeof player !== 'object') {
        errors.push(`Invalid player at index ${index}: not an object`);
      } else {
        const p = player as Record<string, unknown>;
        if (!p.id || !p.name) {
          errors.push('Invalid player data: missing required fields');
        }
      }
    });
  }

  // Validate seasons
  if (!Array.isArray(dataSection.seasons)) {
    errors.push('Invalid seasons data: not an array');
  } else {
    dataSection.seasons.forEach((season: unknown, index: number) => {
      if (!season || typeof season !== 'object') {
        errors.push(`Invalid season at index ${index}: not an object`);
      } else {
        const s = season as Record<string, unknown>;
        if (!s.id || !s.name) {
          errors.push('Invalid season data: missing required fields');
        }
      }
    });
  }

  // Validate tournaments
  if (!Array.isArray(dataSection.tournaments)) {
    errors.push('Invalid tournaments data: not an array');
  } else {
    dataSection.tournaments.forEach((tournament: unknown, index: number) => {
      if (!tournament || typeof tournament !== 'object') {
        errors.push(`Invalid tournament at index ${index}: not an object`);
      } else {
        const t = tournament as Record<string, unknown>;
        if (!t.id || !t.name) {
          errors.push('Invalid tournament data: missing required fields');
        }
      }
    });
  }

  // Validate saved games
  if (!dataSection.savedGames || typeof dataSection.savedGames !== 'object') {
    errors.push('Invalid savedGames data: not an object');
  } else {
    Object.entries(dataSection.savedGames).forEach(([gameId, game]) => {
      if (!game || typeof game !== 'object') {
        errors.push(`Invalid game ${gameId}: not an object`);
      } else {
        const g = game as Record<string, unknown>;
        if (!g.teamName) {
          errors.push('Invalid game data: missing required fields');
        }
      }
    });
  }

  // Validate stats match data
  const statsSection = data.stats as Record<string, unknown>;
  if (Array.isArray(dataSection.players) && statsSection.totalPlayers !== dataSection.players.length) {
    errors.push('Data types in metadata do not match actual data');
  }

  return { isValid: errors.length === 0, errors };
}