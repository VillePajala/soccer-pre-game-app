import { useMemo } from 'react';
import { Player, PlayerStatRow, GameEvent, SavedGamesCollection } from '@/types';

type StatsTab = 'currentGame' | 'season' | 'tournament' | 'overall' | 'player';
type SortableColumn = 'name' | 'goals' | 'assists' | 'totalScore' | 'fpAwards' | 'gamesPlayed' | 'avgPoints';
type SortDirection = 'asc' | 'desc';

interface SavedGame {
  availablePlayers?: Player[];
  selectedPlayerIds?: string[];
  seasonId?: string | null;
  tournamentId?: string | null;
  gameEvents?: GameEvent[];
}

interface UsePlayerStatsProps {
  activeTab: StatsTab;
  availablePlayers: Player[];
  selectedPlayerIds?: string[];
  localGameEvents: GameEvent[];
  savedGames: SavedGamesCollection | null;
  currentGameId: string | null;
  selectedSeasonIdFilter: string;
  selectedTournamentIdFilter: string;
  sortColumn: SortableColumn;
  sortDirection: SortDirection;
  filterText: string;
}

interface UsePlayerStatsReturn {
  stats: PlayerStatRow[];
  gameIds: string[];
}

export function usePlayerStats({
  activeTab,
  availablePlayers,
  selectedPlayerIds,
  localGameEvents,
  savedGames,
  currentGameId,
  selectedSeasonIdFilter,
  selectedTournamentIdFilter,
  sortColumn,
  sortDirection,
  filterText,
}: UsePlayerStatsProps): UsePlayerStatsReturn {
  return useMemo(() => {
    // Initialize stats map - MODIFIED: Initialize differently based on tab
    const statsMap: { [key: string]: PlayerStatRow } = {};
    let relevantGameEvents: GameEvent[] = [];
    let processedGameIds: string[] = []; // Keep track of games considered for GP calc

    if (activeTab === 'currentGame') {
      // Current game: Only include players that were selected
      const playersInGame = availablePlayers.filter(p => selectedPlayerIds?.includes(p.id));
      playersInGame.forEach(player => {
          statsMap[player.id] = {
              ...player,
              goals: 0,
              assists: 0,
              totalScore: 0,
              gamesPlayed: 1,
              avgPoints: 0,
          };
      });

      relevantGameEvents = localGameEvents || [];
      if (currentGameId) {
        processedGameIds = [currentGameId];
      }
    } else {
      // Handle 'season', 'tournament', 'overall' tabs
      const allGameIds = Object.keys(savedGames || {}).filter(
        id => savedGames?.[id]?.isPlayed !== false
      );
      
      // Filter game IDs based on tab and selected filter
      processedGameIds = allGameIds.filter(gameId => {
        const game: SavedGame | undefined = savedGames?.[gameId];
        if (!game) return false;

        if (activeTab === 'season') {
          // Stricter Check: If 'all', include only if it has a seasonId AND NOT a tournamentId.
          return selectedSeasonIdFilter === 'all'
            ? game.seasonId != null && (game.tournamentId == null || game.tournamentId === '')
            : game.seasonId === selectedSeasonIdFilter;
        } else if (activeTab === 'tournament') {
          // Stricter Check: If 'all', include only if it has a tournamentId AND NOT a seasonId.
          return selectedTournamentIdFilter === 'all'
            ? game.tournamentId != null && (game.seasonId == null || game.seasonId === '')
            : game.tournamentId === selectedTournamentIdFilter;
        } else if (activeTab === 'overall') {
          return true; // Include all games for overall stats
        }
        return false;
      });

      // Get all unique players from filtered games
      const allPlayers: Set<string> = new Set();
      processedGameIds.forEach(gameId => {
        const game: SavedGame | undefined = savedGames?.[gameId];
        if (game?.availablePlayers) {
          game.availablePlayers.forEach(p => allPlayers.add(p.id));
        }
      });

      // Initialize stats for all players found in filtered games
      availablePlayers.forEach(player => {
        if (allPlayers.has(player.id)) {
          statsMap[player.id] = {
            ...player,
            goals: 0,
            assists: 0,
            totalScore: 0,
            gamesPlayed: 0,
            avgPoints: 0,
          };
        }
      });

      // Collect game events from filtered games
      relevantGameEvents = [];
      processedGameIds.forEach(gameId => {
        const game: SavedGame | undefined = savedGames?.[gameId];
        if (game?.gameEvents) {
          relevantGameEvents.push(...game.gameEvents);
        }
      });

      // Calculate games played for each player
      processedGameIds.forEach(gameId => {
        const game: SavedGame | undefined = savedGames?.[gameId];
        if (game?.selectedPlayerIds) {
          game.selectedPlayerIds.forEach(playerId => {
            if (statsMap[playerId]) {
              statsMap[playerId].gamesPlayed++;
            }
          });
        }
      });
    }

    // Process game events to calculate stats
    relevantGameEvents.forEach(event => {
      if (event.type === 'goal') {
        // Credit goal to scorer
        if (event.scorerId && statsMap[event.scorerId]) {
          statsMap[event.scorerId].goals++;
          statsMap[event.scorerId].totalScore += 2;
        }
        
        // Credit assist
        if (event.assisterId && statsMap[event.assisterId]) {
          statsMap[event.assisterId].assists++;
          statsMap[event.assisterId].totalScore += 1;
        }
      }
      
      if (event.type === 'fairPlayCard' && event.playerId && statsMap[event.playerId]) {
        statsMap[event.playerId].fpAwards = (statsMap[event.playerId].fpAwards || 0) + 1;
        statsMap[event.playerId].totalScore += 1;
      }
    });

    // Calculate average points
    Object.values(statsMap).forEach(player => {
      if (player.gamesPlayed > 0) {
        player.avgPoints = Math.round((player.totalScore / player.gamesPlayed) * 100) / 100;
      }
    });

    // Filter by search text
    const filteredStats = Object.values(statsMap).filter(player =>
      player.name.toLowerCase().includes(filterText.toLowerCase())
    );

    // Sort the results
    const sortedStats = [...filteredStats].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'goals':
          comparison = a.goals - b.goals;
          break;
        case 'assists':
          comparison = a.assists - b.assists;
          break;
        case 'totalScore':
          comparison = a.totalScore - b.totalScore;
          break;
        case 'fpAwards':
          comparison = (a.fpAwards || 0) - (b.fpAwards || 0);
          break;
        case 'gamesPlayed':
          comparison = a.gamesPlayed - b.gamesPlayed;
          break;
        case 'avgPoints':
          comparison = a.avgPoints - b.avgPoints;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return {
      stats: sortedStats,
      gameIds: processedGameIds,
    };
  }, [
    activeTab,
    availablePlayers,
    selectedPlayerIds,
    localGameEvents,
    savedGames,
    currentGameId,
    selectedSeasonIdFilter,
    selectedTournamentIdFilter,
    sortColumn,
    sortDirection,
    filterText,
  ]);
}