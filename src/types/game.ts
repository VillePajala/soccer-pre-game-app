import type { Player } from './index';
import type { PlayerAssessment } from './playerAssessment';
export interface Point {
  relX: number;
  relY: number;
}

export interface Opponent {
  id: string;
  relX: number;
  relY: number;
}

export interface GameEvent {
  id: string;
  type: 'goal' | 'opponentGoal' | 'substitution' | 'periodEnd' | 'gameEnd' | 'fairPlayCard';
  time: number;
  scorerId?: string;
  assisterId?: string;
  entityId?: string;
}

export interface TimerState {
  gameId: string;
  timeElapsedInSeconds: number;
  timestamp: number;
}

export interface IntervalLog {
  period: number;
  duration: number;
  timestamp: number;
}

export interface TacticalDisc {
  id: string;
  relX: number;
  relY: number;
  type: 'home' | 'opponent' | 'goalie';
}

export interface AppState {
  playersOnField: Player[];
  opponents: Opponent[];
  drawings: Point[][];
  availablePlayers: Player[];
  showPlayerNames: boolean;
  teamName: string;
  gameEvents: GameEvent[];
  opponentName: string;
  gameDate: string;
  homeScore: number;
  awayScore: number;
  gameNotes: string;
  homeOrAway: 'home' | 'away';
  numberOfPeriods: 1 | 2;
  periodDurationMinutes: number;
  currentPeriod: number;
  gameStatus: 'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd';
  selectedPlayerIds: string[];
  assessments?: { [playerId: string]: PlayerAssessment };
  seasonId: string;
  tournamentId: string;
  tournamentLevel?: string;
  /** Age group for the game, independent of tournament/season */
  ageGroup?: string;
  /** Difficulty weighting factor for demand-correction averages */
  demandFactor?: number;
  gameLocation?: string;
  gameTime?: string;
  /** Whether the game has been played */
  isPlayed?: boolean;
  subIntervalMinutes?: number;
  completedIntervalDurations?: IntervalLog[];
  lastSubConfirmationTimeSeconds?: number;
  tacticalDiscs: TacticalDisc[];
  tacticalDrawings: Point[][];
  tacticalBallPosition: Point | null;
}

export interface SavedGamesCollection {
  [gameId: string]: AppState;
}
