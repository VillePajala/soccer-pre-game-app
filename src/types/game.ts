import { Player } from '.';

// Define the Point type for drawing - Use relative coordinates
export interface Point {
  relX: number; // Relative X (0.0 to 1.0)
  relY: number; // Relative Y (0.0 to 1.0)
}

// Define the Opponent type - Use relative coordinates
export interface Opponent {
  id: string;
  relX: number; // Relative X (0.0 to 1.0)
  relY: number; // Relative Y (0.0 to 1.0)
}

// Define the structure for a game event
export interface GameEvent {
  id: string; // Unique ID for the event
  type: 'goal' | 'opponentGoal' | 'substitution' | 'periodEnd' | 'gameEnd' | 'fairPlayCard';
  time: number; // Time in seconds relative to the start of the game
  scorerId?: string; // Player ID of the scorer (optional)
  assisterId?: string; // Player ID of the assister (optional)
  entityId?: string; // Optional: For events associated with a specific entity (e.g., player ID for fair play card)
}

// Define structure for substitution interval logs
export interface IntervalLog {
  period: number;
  duration: number; // Duration in seconds
  timestamp: number; // Unix timestamp when the interval ended
}

// Define the structure for the application state (for history)
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
  seasonId: string; 
  tournamentId: string;
  gameLocation?: string;
  gameTime?: string; 
  subIntervalMinutes?: number;
  completedIntervalDurations?: IntervalLog[];
  lastSubConfirmationTimeSeconds?: number;
}

// Define structure for saved games collection
export interface SavedGamesCollection {
  [gameId: string]: AppState;
} 