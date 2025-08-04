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

// Base interface for common properties
interface BaseGameEvent {
  id: string;
  time: number;
  timestamp?: number;
}

// Goal event - requires scorerId
export interface GoalEvent extends BaseGameEvent {
  type: 'goal';
  scorerId: string; // Required for goals
  assisterId?: string; // Optional
  playerName?: string; // For display purposes
}

// Opponent goal event
export interface OpponentGoalEvent extends BaseGameEvent {
  type: 'opponentGoal';
  scorerId?: string; // Can be 'opponent' or undefined
}

// Substitution event
export interface SubstitutionEvent extends BaseGameEvent {
  type: 'substitution';
  entityId?: string; // Player ID being substituted
}

// Period end event
export interface PeriodEndEvent extends BaseGameEvent {
  type: 'periodEnd';
}

// Game end event
export interface GameEndEvent extends BaseGameEvent {
  type: 'gameEnd';
}

// Fair play card event
export interface FairPlayCardEvent extends BaseGameEvent {
  type: 'fairPlayCard';
  entityId?: string; // Player ID receiving the card
}

// Discriminated union of all game events
export type GameEvent = 
  | GoalEvent 
  | OpponentGoalEvent 
  | SubstitutionEvent 
  | PeriodEndEvent 
  | GameEndEvent 
  | FairPlayCardEvent;

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
  /** Indicates if the game has been fully played */
  isPlayed?: boolean;
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
  subIntervalMinutes?: number;
  completedIntervalDurations?: IntervalLog[];
  lastSubConfirmationTimeSeconds?: number;
  tacticalDiscs: TacticalDisc[];
  tacticalDrawings: Point[][];
  tacticalBallPosition: Point | null;
  /** Timer elapsed time in seconds - persisted to maintain state across loads */
  timeElapsedInSeconds?: number;
}

export interface SavedGamesCollection {
  [gameId: string]: AppState;
}
