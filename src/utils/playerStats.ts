import { Player, Season, Tournament } from '@/types';
import { AppState } from '@/types';

// Define a type for the processed stats
export interface PlayerStats {
  totalGames: number;
  totalGoals: number;
  totalAssists: number;
  avgGoalsPerGame: number;
  avgAssistsPerGame: number;
  gameByGameStats: GameStats[];
  performanceBySeason: { [seasonId: string]: { name: string, gamesPlayed: number, goals: number, assists: number, points: number } };
  performanceByTournament: { [tournamentId: string]: { name: string, gamesPlayed: number, goals: number, assists: number, points: number } };
}

export interface GameStats {
  gameId: string;
  date: string;
  opponentName: string;
  goals: number;
  assists: number;
  points: number;
  result: 'W' | 'L' | 'D' | 'N/A';
}

/**
 * Processes all saved games to calculate stats for a single player.
 * @param player - The player to calculate stats for.
 * @param savedGames - The collection of all saved games.
 * @param seasons - The collection of all seasons.
 * @param tournaments - The collection of all tournaments.
 * @returns The calculated stats for the player.
 */
export const calculatePlayerStats = (player: Player, savedGames: { [key: string]: AppState }, seasons: Season[], tournaments: Tournament[]): PlayerStats => {
  const gameByGameStats: GameStats[] = [];
  const performanceBySeason: { [seasonId: string]: { name: string, gamesPlayed: number, goals: number, assists: number, points: number } } = {};
  const performanceByTournament: { [tournamentId: string]: { name: string, gamesPlayed: number, goals: number, assists: number, points: number } } = {};

  Object.entries(savedGames).forEach(([gameId, game]) => {
    if (game.isPlayed === false) {
      return;
    }
    // Check if the player was part of this game's roster
    if (game.selectedPlayerIds?.includes(player.id)) {
      const goals = game.gameEvents?.filter(e => e.type === 'goal' && e.scorerId === player.id).length || 0;
      const assists = game.gameEvents?.filter(e => e.type === 'goal' && e.assisterId === player.id).length || 0;
      const points = goals + assists;

      // Aggregate stats by season
      if (game.seasonId) {
        if (!performanceBySeason[game.seasonId]) {
          const seasonInfo = seasons.find(s => s.id === game.seasonId);
          performanceBySeason[game.seasonId] = { name: seasonInfo?.name || 'Unknown Season', gamesPlayed: 0, goals: 0, assists: 0, points: 0 };
        }
        performanceBySeason[game.seasonId].gamesPlayed += 1;
        performanceBySeason[game.seasonId].goals += goals;
        performanceBySeason[game.seasonId].assists += assists;
        performanceBySeason[game.seasonId].points += points;
      }

      // Aggregate stats by tournament
      if (game.tournamentId) {
        if (!performanceByTournament[game.tournamentId]) {
          const tournamentInfo = tournaments.find(t => t.id === game.tournamentId);
          performanceByTournament[game.tournamentId] = { name: tournamentInfo?.name || 'Unknown Tournament', gamesPlayed: 0, goals: 0, assists: 0, points: 0 };
        }
        performanceByTournament[game.tournamentId].gamesPlayed += 1;
        performanceByTournament[game.tournamentId].goals += goals;
        performanceByTournament[game.tournamentId].assists += assists;
        performanceByTournament[game.tournamentId].points += points;
      }

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
        points,
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
    performanceBySeason,
    performanceByTournament,
  };
}; 