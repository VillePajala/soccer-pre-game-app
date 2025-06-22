import { Player } from '@/types';
import { AppState } from '@/app/page';

// Define a type for the processed stats
export interface PlayerStats {
  totalGames: number;
  totalGoals: number;
  totalAssists: number;
  avgGoalsPerGame: number;
  avgAssistsPerGame: number;
  gameByGameStats: GameStats[];
}

export interface GameStats {
  gameId: string;
  date: string;
  opponentName: string;
  goals: number;
  assists: number;
  result: 'W' | 'L' | 'D' | 'N/A';
}

/**
 * Processes all saved games to calculate stats for a single player.
 * @param player - The player to calculate stats for.
 * @param savedGames - The collection of all saved games.
 * @returns The calculated stats for the player.
 */
export const calculatePlayerStats = (player: Player, savedGames: { [key: string]: AppState }): PlayerStats => {
  const gameByGameStats: GameStats[] = [];

  Object.entries(savedGames).forEach(([gameId, game]) => {
    // Check if the player was part of this game's roster
    if (game.selectedPlayerIds?.includes(player.id)) {
      const goals = game.gameEvents?.filter(e => e.type === 'goal' && e.scorerId === player.id).length || 0;
      const assists = game.gameEvents?.filter(e => e.type === 'goal' && e.assisterId === player.id).length || 0;

      let result: 'W' | 'L' | 'D' | 'N/A' = 'N/A';
      if (game.homeScore > game.awayScore) {
        result = game.homeOrAway === 'home' ? 'W' : 'L';
      } else if (game.awayScore > game.homeScore) {
        result = game.homeOrAway === 'home' ? 'L' : 'W';
      } else if (game.homeScore === game.awayScore) {
        result = 'D';
      }

      gameByGameStats.push({
        gameId,
        date: game.gameDate,
        opponentName: game.opponentName,
        goals,
        assists,
        result,
      });
    }
  });

  const totalGoals = gameByGameStats.reduce((sum, game) => sum + game.goals, 0);
  const totalAssists = gameByGameStats.reduce((sum, game) => sum + game.assists, 0);
  const totalGames = gameByGameStats.length;
  const avgGoalsPerGame = totalGames > 0 ? totalGoals / totalGames : 0;
  const avgAssistsPerGame = totalGames > 0 ? totalAssists / totalGames : 0;

  // Sort games by date, most recent first
  gameByGameStats.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    totalGames,
    totalGoals,
    totalAssists,
    avgGoalsPerGame,
    avgAssistsPerGame,
    gameByGameStats,
  };
}; 