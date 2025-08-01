import type { Player, PlayerStatRow, Season, Tournament, GameEvent, SavedGamesCollection } from '@/types';

// Shared types for GameStatsModal components
export type SortableColumn = 'name' | 'goals' | 'assists' | 'totalScore' | 'fpAwards' | 'gamesPlayed' | 'avgPoints';
export type SortDirection = 'asc' | 'desc';
export type StatsTab = 'currentGame' | 'season' | 'tournament' | 'overall' | 'player';

// Tournament and season statistics interfaces
export interface TournamentSeasonStats {
  id: string;
  name: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  winPercentage: number;
  averageGoalsFor: number;
  averageGoalsAgainst: number;
  lastGameDate?: string;
}

export interface OverallTournamentSeasonStats {
  overallGamesPlayed: number;
  overallWins: number;
  overallLosses: number;
  overallTies: number;
  overallGoalsFor: number;
  overallGoalsAgainst: number;
  overallGoalDifference: number;
  overallWinPercentage: number;
  tournaments: TournamentSeasonStats[];
  seasons: TournamentSeasonStats[];
}

// Base props interface for all tab components
export interface BaseTabProps {
  players: Player[];
  gameEvents: GameEvent[];
  selectedPlayerIds: string[];
  savedGames: SavedGamesCollection;
  currentGameId: string | null;
  playerStats: PlayerStatRow[];
  sortColumn: SortableColumn;
  sortDirection: SortDirection;
  onSort: (column: SortableColumn) => void;
}

// Props for individual tab components
export interface CurrentGameStatsProps extends BaseTabProps {
  gameNotes?: string;
  onGameNotesChange?: (notes: string) => void;
  onUpdateGameEvent?: (updatedEvent: GameEvent) => void;
  onExportOneJson?: (gameId: string) => void;
  onExportOneCsv?: (gameId: string) => void;
}

export interface SeasonStatsProps extends BaseTabProps {
  seasons: Season[];
  selectedSeasonIdFilter: string | null;
  onSeasonFilterChange: (seasonId: string | null) => void;
  onExportAggregateCsv?: (gameIds: string[], playerStats: PlayerStatRow[]) => void;
  onExportAggregateJson?: (gameIds: string[], playerStats: PlayerStatRow[]) => void;
}

export interface TournamentStatsProps extends BaseTabProps {
  tournaments: Tournament[];
  selectedTournamentIdFilter: string | null;
  onTournamentFilterChange: (tournamentId: string | null) => void;
  onExportAggregateCsv?: (gameIds: string[], playerStats: PlayerStatRow[]) => void;
  onExportAggregateJson?: (gameIds: string[], playerStats: PlayerStatRow[]) => void;
}

export interface OverallStatsProps extends BaseTabProps {
  onExportAggregateCsv?: (gameIds: string[], playerStats: PlayerStatRow[]) => void;
  onExportAggregateJson?: (gameIds: string[], playerStats: PlayerStatRow[]) => void;
}

export interface PlayerStatsProps extends BaseTabProps {
  // Additional props for future player stats features
  showDetailedView?: boolean;
}