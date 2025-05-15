import { GameEvent } from '@/app/page'; // Assuming AppState might be useful context

// --- State Definition ---
export interface GameSessionState {
  teamName: string;
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
  gameEvents: GameEvent[];
  // Timer related state
  timeElapsedInSeconds: number;
  isTimerRunning: boolean;
  subIntervalMinutes: number;
  nextSubDueTimeSeconds: number;
  subAlertLevel: 'none' | 'warning' | 'due';
  lastSubConfirmationTimeSeconds: number;
  completedIntervalDurations?: IntervalLog[]; // Made optional to align with AppState
  showPlayerNames: boolean;
}

// Define IntervalLog if it's not globally available from AppState import
// For now, assuming AppState might not be directly importable or could cause circular deps
// So, defining it locally or ensuring it's available via a shared types file is better.
export interface IntervalLog {
  period: number;
  duration: number; // Duration in seconds
  timestamp: number; // Unix timestamp when the interval ended
}


// --- Initial State ---
// The actual initial state will be derived from page.tsx's initialState object.
// This is just a placeholder for type completeness if needed directly in this file,
// but generally, the page will provide the true initial state.
export const initialGameSessionStatePlaceholder: GameSessionState = {
  teamName: "My Team",
  opponentName: "Opponent",
  gameDate: new Date().toISOString().split('T')[0],
  homeScore: 0,
  awayScore: 0,
  gameNotes: '',
  homeOrAway: 'home',
  numberOfPeriods: 2,
  periodDurationMinutes: 10,
  currentPeriod: 1,
  gameStatus: 'notStarted',
  selectedPlayerIds: [],
  seasonId: '',
  tournamentId: '',
  gameLocation: '',
  gameTime: '',
  gameEvents: [],
  timeElapsedInSeconds: 0,
  isTimerRunning: false,
  subIntervalMinutes: 5,
  nextSubDueTimeSeconds: 300,
  subAlertLevel: 'none',
  lastSubConfirmationTimeSeconds: 0,
  completedIntervalDurations: [],
  showPlayerNames: true,
};


// --- Action Definitions ---
export type GameSessionAction =
  | { type: 'LOAD_STATE_FROM_HISTORY'; payload: Partial<GameSessionState> }
  | { type: 'RESET_TO_INITIAL_STATE'; payload: GameSessionState } // Payload is the full initial state
  | { type: 'SET_TEAM_NAME'; payload: string }
  | { type: 'SET_OPPONENT_NAME'; payload: string }
  | { type: 'SET_GAME_DATE'; payload: string }
  | { type: 'SET_HOME_SCORE'; payload: number }
  | { type: 'SET_AWAY_SCORE'; payload: number }
  | { type: 'ADJUST_SCORE_FOR_EVENT'; payload: { eventType: 'goal' | 'opponentGoal', action: 'add' | 'delete' } }
  | { type: 'SET_GAME_NOTES'; payload: string }
  | { type: 'SET_HOME_OR_AWAY'; payload: 'home' | 'away' }
  | { type: 'SET_NUMBER_OF_PERIODS'; payload: 1 | 2 }
  | { type: 'SET_PERIOD_DURATION'; payload: number }
  | { type: 'SET_GAME_STATUS'; payload: GameSessionState['gameStatus'] }
  | { type: 'START_PERIOD'; payload: { nextPeriod: number, periodDurationMinutes: number, subIntervalMinutes: number } }
  | { type: 'END_PERIOD_OR_GAME'; payload: { newStatus: 'periodEnd' | 'gameEnd', finalTime?: number } }
  | { type: 'SET_SELECTED_PLAYER_IDS'; payload: string[] }
  | { type: 'SET_SEASON_ID'; payload: string }
  | { type: 'SET_TOURNAMENT_ID'; payload: string }
  | { type: 'SET_GAME_LOCATION'; payload: string }
  | { type: 'SET_GAME_TIME'; payload: string }
  | { type: 'ADD_GAME_EVENT'; payload: GameEvent }
  | { type: 'UPDATE_GAME_EVENT'; payload: GameEvent }
  | { type: 'DELETE_GAME_EVENT'; payload: string } // eventId
  | { type: 'SET_TIMER_ELAPSED'; payload: number }
  | { type: 'SET_TIMER_RUNNING'; payload: boolean }
  | { type: 'SET_SUB_INTERVAL'; payload: number } // subIntervalMinutes
  | { type: 'CONFIRM_SUBSTITUTION' }
  | { type: 'RESET_TIMER_AND_GAME_PROGRESS'; payload?: Partial<GameSessionState> } // Optional payload for selective reset
  | { type: 'TOGGLE_SHOW_PLAYER_NAMES' }
  | { type: 'LOAD_GAME_SESSION_STATE'; payload: Partial<GameSessionState> }
  | { type: 'RESET_GAME_SESSION_STATE'; payload: GameSessionState }; // Action to reset to a specific state

// --- Reducer Function ---
export const gameSessionReducer = (state: GameSessionState, action: GameSessionAction): GameSessionState => {
  console.log('[gameSessionReducer] action type:', action.type);
  switch (action.type) {
    case 'LOAD_STATE_FROM_HISTORY':
    case 'LOAD_GAME_SESSION_STATE':
      return { ...state, ...action.payload };
    case 'RESET_TO_INITIAL_STATE':
      return { ...action.payload };
    case 'SET_TEAM_NAME':
      return { ...state, teamName: action.payload };
    case 'SET_OPPONENT_NAME':
      return { ...state, opponentName: action.payload };
    case 'SET_GAME_DATE':
      return { ...state, gameDate: action.payload };
    case 'SET_HOME_SCORE':
      return { ...state, homeScore: action.payload };
    case 'SET_AWAY_SCORE':
      return { ...state, awayScore: action.payload };
    case 'ADJUST_SCORE_FOR_EVENT': {
        let newHomeScore = state.homeScore;
        let newAwayScore = state.awayScore;
        const adjustment = action.payload.action === 'add' ? 1 : -1;

        if (action.payload.eventType === 'goal') {
            if (state.homeOrAway === 'home') newHomeScore = Math.max(0, state.homeScore + adjustment);
            else newAwayScore = Math.max(0, state.awayScore + adjustment);
        } else if (action.payload.eventType === 'opponentGoal') {
            if (state.homeOrAway === 'home') newAwayScore = Math.max(0, state.awayScore + adjustment);
            else newHomeScore = Math.max(0, state.homeScore + adjustment);
        }
        return { ...state, homeScore: newHomeScore, awayScore: newAwayScore };
    }
    case 'SET_GAME_NOTES':
      return { ...state, gameNotes: action.payload };
    case 'SET_HOME_OR_AWAY':
      return { ...state, homeOrAway: action.payload };
    case 'SET_NUMBER_OF_PERIODS':
      return { ...state, numberOfPeriods: action.payload };
    case 'SET_PERIOD_DURATION':
      return { ...state, periodDurationMinutes: action.payload };
    case 'SET_GAME_STATUS':
      return { ...state, gameStatus: action.payload };
    case 'START_PERIOD': {
        const { nextPeriod, periodDurationMinutes, subIntervalMinutes } = action.payload;
        const previousPeriodEndTime = (nextPeriod - 1) * periodDurationMinutes * 60;
        return {
            ...state,
            currentPeriod: nextPeriod,
            gameStatus: 'inProgress',
            timeElapsedInSeconds: nextPeriod === 1 ? 0 : previousPeriodEndTime,
            isTimerRunning: true,
            lastSubConfirmationTimeSeconds: nextPeriod === 1 ? 0 : previousPeriodEndTime,
            nextSubDueTimeSeconds: (nextPeriod === 1 ? 0 : previousPeriodEndTime) + (subIntervalMinutes * 60),
            subAlertLevel: 'none',
            completedIntervalDurations: nextPeriod === 1 ? [] : state.completedIntervalDurations,
        };
    }
    case 'END_PERIOD_OR_GAME': {
        const { newStatus, finalTime } = action.payload;
        const timeToSet = finalTime !== undefined ? finalTime : state.timeElapsedInSeconds;
        return {
            ...state,
            gameStatus: newStatus,
            isTimerRunning: false,
            timeElapsedInSeconds: timeToSet,
            subAlertLevel: timeToSet >= state.nextSubDueTimeSeconds ? 'due' : state.subAlertLevel,
        };
    }
    case 'SET_SELECTED_PLAYER_IDS':
      return { ...state, selectedPlayerIds: action.payload };
    case 'SET_SEASON_ID':
      return { ...state, seasonId: action.payload, tournamentId: action.payload ? '' : state.tournamentId };
    case 'SET_TOURNAMENT_ID':
      return { ...state, tournamentId: action.payload, seasonId: action.payload ? '' : state.seasonId };
    case 'SET_GAME_LOCATION':
      return { ...state, gameLocation: action.payload };
    case 'SET_GAME_TIME':
      return { ...state, gameTime: action.payload };
    case 'ADD_GAME_EVENT':
      return { ...state, gameEvents: [...state.gameEvents, action.payload] };
    case 'UPDATE_GAME_EVENT': {
      const index = state.gameEvents.findIndex(e => e.id === action.payload.id);
      if (index === -1) return state;
      const newGameEvents = [...state.gameEvents];
      newGameEvents[index] = action.payload;
      return { ...state, gameEvents: newGameEvents };
    }
    case 'DELETE_GAME_EVENT': {
      return { ...state, gameEvents: state.gameEvents.filter(e => e.id !== action.payload) };
    }
    case 'SET_TIMER_ELAPSED': {
        const newTime = action.payload;
        let newAlertLevel: GameSessionState['subAlertLevel'] = 'none';
        const warningTime = state.nextSubDueTimeSeconds - 60;
        if (newTime >= state.nextSubDueTimeSeconds) {
            newAlertLevel = 'due';
        } else if (warningTime >= 0 && newTime >= warningTime) {
            newAlertLevel = 'warning';
        }
        return { ...state, timeElapsedInSeconds: newTime, subAlertLevel: newAlertLevel };
    }
    case 'SET_TIMER_RUNNING':
      return { ...state, isTimerRunning: action.payload };
    case 'SET_SUB_INTERVAL': {
        const newIntervalMinutes = Math.max(1, action.payload);
        const currentElapsedTime = state.timeElapsedInSeconds;
        const newIntervalSec = newIntervalMinutes * 60;
        let newDueTime = Math.ceil((currentElapsedTime + 1) / newIntervalSec) * newIntervalSec;
        if (newDueTime <= currentElapsedTime && newIntervalSec > 0 ) newDueTime += newIntervalSec;
        if (newDueTime === 0 && newIntervalSec > 0) newDueTime = newIntervalSec;


        let alertLevel: GameSessionState['subAlertLevel'] = 'none';
        const warningTime = newDueTime - 60;
        if (currentElapsedTime >= newDueTime && newIntervalSec > 0) alertLevel = 'due';
        else if (warningTime >=0 && currentElapsedTime >= warningTime) alertLevel = 'warning';

        return {
            ...state,
            subIntervalMinutes: newIntervalMinutes,
            nextSubDueTimeSeconds: newDueTime,
            subAlertLevel: alertLevel,
        };
    }
    case 'CONFIRM_SUBSTITUTION': {
        const duration = state.timeElapsedInSeconds - state.lastSubConfirmationTimeSeconds;
        const newIntervalLog: IntervalLog = {
            period: state.currentPeriod,
            duration: duration,
            timestamp: state.timeElapsedInSeconds,
        };
        const newNextSubDueTime = state.nextSubDueTimeSeconds + (state.subIntervalMinutes * 60);
        let alertLevelAfterSub: GameSessionState['subAlertLevel'] = 'none';
        const warningTimeForNext = newNextSubDueTime - 60;
        if (state.timeElapsedInSeconds >= newNextSubDueTime) alertLevelAfterSub = 'due';
        else if (warningTimeForNext >=0 && state.timeElapsedInSeconds >= warningTimeForNext) alertLevelAfterSub = 'warning';

        return {
            ...state,
            completedIntervalDurations: [newIntervalLog, ...(state.completedIntervalDurations || [])],
            lastSubConfirmationTimeSeconds: state.timeElapsedInSeconds,
            nextSubDueTimeSeconds: newNextSubDueTime,
            subAlertLevel: alertLevelAfterSub,
        };
    }
    case 'RESET_TIMER_AND_GAME_PROGRESS': {
        const subIntervalMins = action.payload?.subIntervalMinutes || state.subIntervalMinutes || 5;
        return {
            ...state,
            timeElapsedInSeconds: 0,
            isTimerRunning: false,
            currentPeriod: 1,
            gameStatus: 'notStarted',
            gameEvents: [],
            homeScore: 0,
            awayScore: 0,
            subIntervalMinutes: subIntervalMins,
            nextSubDueTimeSeconds: subIntervalMins * 60,
            subAlertLevel: 'none',
            lastSubConfirmationTimeSeconds: 0,
            completedIntervalDurations: [],
            ...(action.payload || {}), // Apply any other partial state resets from payload
        };
    }
    case 'TOGGLE_SHOW_PLAYER_NAMES':
      return { ...state, showPlayerNames: !state.showPlayerNames };
    case 'RESET_GAME_SESSION_STATE':
      return action.payload; // Directly set the state to the provided payload
    default:
      return state;
  }
}; 