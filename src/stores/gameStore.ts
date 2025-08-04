/**
 * Main Game State Store - Centralized game session and player management
 * 
 * This store replaces the distributed useState calls for core game functionality:
 * - Game session state (timer, scoring, periods)
 * - Player management (positioning, roster)
 * - Game events (goals, substitutions, etc.)
 * 
 * Migration Strategy: Start with core game state, then expand to other areas
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  Player, 
  Opponent, 
  GameEvent, 
  Point, 
  TacticalDisc,
  GameStatus 
} from '@/types';

// Game session state (replaces GameSessionReducer useState calls)
export interface GameSessionState {
  // Game identification
  gameId: string | null;
  teamName: string;
  opponentName: string;
  
  // Game timing
  timeElapsedInSeconds: number;
  isTimerRunning: boolean;
  currentPeriod: number;
  numberOfPeriods: number;
  periodDurationMinutes: number;
  subIntervalMinutes: number;
  completedIntervalDurations: number[];
  lastSubConfirmationTimeSeconds: number;
  
  // Game scoring
  homeScore: number;
  awayScore: number;
  homeOrAway: 'home' | 'away';
  
  // Game metadata
  gameDate: string;
  gameLocation: string;
  gameTime: string;
  gameStatus: GameStatus;
  gameNotes: string;
  isPlayed: boolean;
  
  // Game configuration
  ageGroup: string;
  tournamentLevel: string;
  demandFactor: number;
  seasonId: string;
  tournamentId: string;
  
  // UI state
  showPlayerNames: boolean;
  selectedPlayerIds: string[];
  
  // Game events
  gameEvents: GameEvent[];
}

// Player positioning and field state
export interface FieldState {
  playersOnField: Player[];
  opponents: Opponent[];
  availablePlayers: Player[];
  
  // Drawing and tactical elements
  drawings: Point[][];
  tacticalDrawings: Point[][];
  tacticalDiscs: TacticalDisc[];
  tacticalBallPosition: Point | null;
}

// Combined game store interface
export interface GameStore {
  // State
  gameSession: GameSessionState;
  field: FieldState;
  
  // Game session actions
  setGameId: (gameId: string | null) => void;
  setTeamName: (name: string) => void;
  setOpponentName: (name: string) => void;
  setGameDate: (date: string) => void;
  setGameLocation: (location: string) => void;
  setGameTime: (time: string) => void;
  setGameNotes: (notes: string) => void;
  setHomeOrAway: (homeOrAway: 'home' | 'away') => void;
  setAgeGroup: (ageGroup: string) => void;
  setTournamentLevel: (level: string) => void;
  setDemandFactor: (factor: number) => void;
  setSeasonId: (seasonId: string) => void;
  setTournamentId: (tournamentId: string) => void;
  setNumberOfPeriods: (periods: number) => void;
  setPeriodDuration: (minutes: number) => void;
  setSubInterval: (minutes: number) => void;
  setGameStatus: (status: GameStatus) => void;
  setShowPlayerNames: (show: boolean) => void;
  setSelectedPlayerIds: (ids: string[]) => void;
  
  // Timer actions
  setTimeElapsed: (seconds: number) => void;
  setTimerRunning: (running: boolean) => void;
  setCurrentPeriod: (period: number) => void;
  resetTimer: () => void;
  
  // Scoring actions
  setHomeScore: (score: number) => void;
  setAwayScore: (score: number) => void;
  incrementHomeScore: () => void;
  incrementAwayScore: () => void;
  
  // Game events actions
  addGameEvent: (event: GameEvent) => void;
  updateGameEvent: (eventId: string, updates: Partial<GameEvent>) => void;
  removeGameEvent: (eventId: string) => void;
  
  // Player actions
  setPlayersOnField: (players: Player[]) => void;
  setOpponents: (opponents: Opponent[]) => void;
  setAvailablePlayers: (players: Player[]) => void;
  movePlayer: (playerId: string, position: Point) => void;
  removePlayerFromField: (playerId: string) => void;
  addPlayerToField: (player: Player, position: Point) => void;
  
  // Opponent actions
  moveOpponent: (opponentId: string, position: Point) => void;
  removeOpponent: (opponentId: string) => void;
  addOpponent: (opponent: Opponent) => void;
  
  // Drawing actions
  setDrawings: (drawings: Point[][]) => void;
  addDrawing: (drawing: Point[]) => void;
  clearDrawings: () => void;
  
  // Tactical actions
  setTacticalDrawings: (drawings: Point[][]) => void;
  setTacticalDiscs: (discs: TacticalDisc[]) => void;
  setTacticalBallPosition: (position: Point | null) => void;
  addTacticalDisc: (disc: TacticalDisc) => void;
  moveTacticalDisc: (discId: string, position: Point) => void;
  removeTacticalDisc: (discId: string) => void;
  
  // Utility actions
  resetGameSession: () => void;
  resetField: () => void;
  loadGameState: (state: Partial<GameSessionState & FieldState>) => void;
}

// Default state values
const defaultGameSession: GameSessionState = {
  gameId: null,
  teamName: '',
  opponentName: '',
  timeElapsedInSeconds: 0,
  isTimerRunning: false,
  currentPeriod: 1,
  numberOfPeriods: 2,
  periodDurationMinutes: 45,
  subIntervalMinutes: 15,
  completedIntervalDurations: [],
  lastSubConfirmationTimeSeconds: 0,
  homeScore: 0,
  awayScore: 0,
  homeOrAway: 'home',
  gameDate: new Date().toISOString().split('T')[0],
  gameLocation: '',
  gameTime: '',
  gameStatus: 'not_started',
  gameNotes: '',
  isPlayed: false,
  ageGroup: '',
  tournamentLevel: '',
  demandFactor: 1.0,
  seasonId: '',
  tournamentId: '',
  showPlayerNames: true,
  selectedPlayerIds: [],
  gameEvents: [],
};

const defaultFieldState: FieldState = {
  playersOnField: [],
  opponents: [],
  availablePlayers: [],
  drawings: [],
  tacticalDrawings: [],
  tacticalDiscs: [],
  tacticalBallPosition: null,
};

// Create the game store with Zustand
export const useGameStore = create<GameStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        gameSession: defaultGameSession,
        field: defaultFieldState,
        
        // Game session actions
        setGameId: (gameId) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, gameId } 
          }),
          false,
          'setGameId'
        ),
        
        setTeamName: (teamName) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, teamName } 
          }),
          false,
          'setTeamName'
        ),
        
        setOpponentName: (opponentName) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, opponentName } 
          }),
          false,
          'setOpponentName'
        ),
        
        setGameDate: (gameDate) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, gameDate } 
          }),
          false,
          'setGameDate'
        ),
        
        setGameLocation: (gameLocation) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, gameLocation } 
          }),
          false,
          'setGameLocation'
        ),
        
        setGameTime: (gameTime) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, gameTime } 
          }),
          false,
          'setGameTime'
        ),
        
        setGameNotes: (gameNotes) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, gameNotes } 
          }),
          false,
          'setGameNotes'
        ),
        
        setHomeOrAway: (homeOrAway) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, homeOrAway } 
          }),
          false,
          'setHomeOrAway'
        ),
        
        setAgeGroup: (ageGroup) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, ageGroup } 
          }),
          false,
          'setAgeGroup'
        ),
        
        setTournamentLevel: (tournamentLevel) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, tournamentLevel } 
          }),
          false,
          'setTournamentLevel'
        ),
        
        setDemandFactor: (demandFactor) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, demandFactor } 
          }),
          false,
          'setDemandFactor'
        ),
        
        setSeasonId: (seasonId) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, seasonId } 
          }),
          false,
          'setSeasonId'
        ),
        
        setTournamentId: (tournamentId) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, tournamentId } 
          }),
          false,
          'setTournamentId'
        ),
        
        setNumberOfPeriods: (numberOfPeriods) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, numberOfPeriods } 
          }),
          false,
          'setNumberOfPeriods'
        ),
        
        setPeriodDuration: (periodDurationMinutes) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, periodDurationMinutes } 
          }),
          false,
          'setPeriodDuration'
        ),
        
        setSubInterval: (subIntervalMinutes) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, subIntervalMinutes } 
          }),
          false,
          'setSubInterval'
        ),
        
        setGameStatus: (gameStatus) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, gameStatus } 
          }),
          false,
          'setGameStatus'
        ),
        
        setShowPlayerNames: (showPlayerNames) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, showPlayerNames } 
          }),
          false,
          'setShowPlayerNames'
        ),
        
        setSelectedPlayerIds: (selectedPlayerIds) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, selectedPlayerIds } 
          }),
          false,
          'setSelectedPlayerIds'
        ),
        
        // Timer actions
        setTimeElapsed: (timeElapsedInSeconds) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, timeElapsedInSeconds } 
          }),
          false,
          'setTimeElapsed'
        ),
        
        setTimerRunning: (isTimerRunning) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, isTimerRunning } 
          }),
          false,
          'setTimerRunning'
        ),
        
        setCurrentPeriod: (currentPeriod) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, currentPeriod } 
          }),
          false,
          'setCurrentPeriod'
        ),
        
        resetTimer: () => set(
          (state) => ({ 
            gameSession: { 
              ...state.gameSession, 
              timeElapsedInSeconds: 0,
              isTimerRunning: false,
              currentPeriod: 1,
              completedIntervalDurations: [],
              lastSubConfirmationTimeSeconds: 0
            } 
          }),
          false,
          'resetTimer'
        ),
        
        // Scoring actions
        setHomeScore: (homeScore) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, homeScore } 
          }),
          false,
          'setHomeScore'
        ),
        
        setAwayScore: (awayScore) => set(
          (state) => ({ 
            gameSession: { ...state.gameSession, awayScore } 
          }),
          false,
          'setAwayScore'
        ),
        
        incrementHomeScore: () => set(
          (state) => ({ 
            gameSession: { 
              ...state.gameSession, 
              homeScore: state.gameSession.homeScore + 1 
            } 
          }),
          false,
          'incrementHomeScore'
        ),
        
        incrementAwayScore: () => set(
          (state) => ({ 
            gameSession: { 
              ...state.gameSession, 
              awayScore: state.gameSession.awayScore + 1 
            } 
          }),
          false,
          'incrementAwayScore'
        ),
        
        // Game events actions
        addGameEvent: (event) => set(
          (state) => ({ 
            gameSession: { 
              ...state.gameSession, 
              gameEvents: [...state.gameSession.gameEvents, event] 
            } 
          }),
          false,
          'addGameEvent'
        ),
        
        updateGameEvent: (eventId, updates) => set(
          (state) => ({ 
            gameSession: { 
              ...state.gameSession, 
              gameEvents: state.gameSession.gameEvents.map(event => 
                event.id === eventId ? { ...event, ...updates } : event
              ) 
            } 
          }),
          false,
          'updateGameEvent'
        ),
        
        removeGameEvent: (eventId) => set(
          (state) => ({ 
            gameSession: { 
              ...state.gameSession, 
              gameEvents: state.gameSession.gameEvents.filter(event => event.id !== eventId) 
            } 
          }),
          false,
          'removeGameEvent'
        ),
        
        // Player actions
        setPlayersOnField: (playersOnField) => set(
          (state) => ({ 
            field: { ...state.field, playersOnField } 
          }),
          false,
          'setPlayersOnField'
        ),
        
        setOpponents: (opponents) => set(
          (state) => ({ 
            field: { ...state.field, opponents } 
          }),
          false,
          'setOpponents'
        ),
        
        setAvailablePlayers: (availablePlayers) => set(
          (state) => ({ 
            field: { ...state.field, availablePlayers } 
          }),
          false,
          'setAvailablePlayers'
        ),
        
        movePlayer: (playerId, position) => set(
          (state) => ({ 
            field: { 
              ...state.field, 
              playersOnField: state.field.playersOnField.map(player => 
                player.id === playerId ? { ...player, position } : player
              ) 
            } 
          }),
          false,
          'movePlayer'
        ),
        
        removePlayerFromField: (playerId) => set(
          (state) => ({ 
            field: { 
              ...state.field, 
              playersOnField: state.field.playersOnField.filter(player => player.id !== playerId) 
            } 
          }),
          false,
          'removePlayerFromField'
        ),
        
        addPlayerToField: (player, position) => set(
          (state) => ({ 
            field: { 
              ...state.field, 
              playersOnField: [...state.field.playersOnField, { ...player, position }] 
            } 
          }),
          false,
          'addPlayerToField'
        ),
        
        // Opponent actions
        moveOpponent: (opponentId, position) => set(
          (state) => ({ 
            field: { 
              ...state.field, 
              opponents: state.field.opponents.map(opponent => 
                opponent.id === opponentId ? { ...opponent, position } : opponent
              ) 
            } 
          }),
          false,
          'moveOpponent'
        ),
        
        removeOpponent: (opponentId) => set(
          (state) => ({ 
            field: { 
              ...state.field, 
              opponents: state.field.opponents.filter(opponent => opponent.id !== opponentId) 
            } 
          }),
          false,
          'removeOpponent'
        ),
        
        addOpponent: (opponent) => set(
          (state) => ({ 
            field: { 
              ...state.field, 
              opponents: [...state.field.opponents, opponent] 
            } 
          }),
          false,
          'addOpponent'
        ),
        
        // Drawing actions
        setDrawings: (drawings) => set(
          (state) => ({ 
            field: { ...state.field, drawings } 
          }),
          false,
          'setDrawings'
        ),
        
        addDrawing: (drawing) => set(
          (state) => ({ 
            field: { 
              ...state.field, 
              drawings: [...state.field.drawings, drawing] 
            } 
          }),
          false,
          'addDrawing'
        ),
        
        clearDrawings: () => set(
          (state) => ({ 
            field: { ...state.field, drawings: [] } 
          }),
          false,
          'clearDrawings'
        ),
        
        // Tactical actions
        setTacticalDrawings: (tacticalDrawings) => set(
          (state) => ({ 
            field: { ...state.field, tacticalDrawings } 
          }),
          false,
          'setTacticalDrawings'
        ),
        
        setTacticalDiscs: (tacticalDiscs) => set(
          (state) => ({ 
            field: { ...state.field, tacticalDiscs } 
          }),
          false,
          'setTacticalDiscs'
        ),
        
        setTacticalBallPosition: (tacticalBallPosition) => set(
          (state) => ({ 
            field: { ...state.field, tacticalBallPosition } 
          }),
          false,
          'setTacticalBallPosition'
        ),
        
        addTacticalDisc: (disc) => set(
          (state) => ({ 
            field: { 
              ...state.field, 
              tacticalDiscs: [...state.field.tacticalDiscs, disc] 
            } 
          }),
          false,
          'addTacticalDisc'
        ),
        
        moveTacticalDisc: (discId, position) => set(
          (state) => ({ 
            field: { 
              ...state.field, 
              tacticalDiscs: state.field.tacticalDiscs.map(disc => 
                disc.id === discId ? { ...disc, position } : disc
              ) 
            } 
          }),
          false,
          'moveTacticalDisc'
        ),
        
        removeTacticalDisc: (discId) => set(
          (state) => ({ 
            field: { 
              ...state.field, 
              tacticalDiscs: state.field.tacticalDiscs.filter(disc => disc.id !== discId) 
            } 
          }),
          false,
          'removeTacticalDisc'
        ),
        
        // Utility actions
        resetGameSession: () => set(
          { gameSession: defaultGameSession },
          false,
          'resetGameSession'
        ),
        
        resetField: () => set(
          { field: defaultFieldState },
          false,
          'resetField'
        ),
        
        loadGameState: (state) => set(
          (currentState) => ({
            gameSession: { ...currentState.gameSession, ...state },
            field: { ...currentState.field, ...state }
          }),
          false,
          'loadGameState'
        ),
      }),
      {
        name: 'game-storage', // localStorage key
        partialize: (state) => ({
          // Only persist game session data, not temporary field state
          gameSession: {
            ...state.gameSession,
            isTimerRunning: false, // Don't persist timer running state
          }
        }),
      }
    ),
    {
      name: 'GameStore', // DevTools name
    }
  )
);

// Selector hooks for performance optimization
export const useGameSession = () => useGameStore((state) => state.gameSession);
export const useFieldState = () => useGameStore((state) => state.field);

// Separate selectors to avoid creating new objects on every render
export const useGameTimer = () => {
  const timeElapsed = useGameStore((state) => state.gameSession.timeElapsedInSeconds);
  const isRunning = useGameStore((state) => state.gameSession.isTimerRunning);
  const currentPeriod = useGameStore((state) => state.gameSession.currentPeriod);
  const setTimeElapsed = useGameStore((state) => state.setTimeElapsed);
  const setTimerRunning = useGameStore((state) => state.setTimerRunning);
  const setCurrentPeriod = useGameStore((state) => state.setCurrentPeriod);
  const resetTimer = useGameStore((state) => state.resetTimer);
  
  return {
    timeElapsed,
    isRunning,
    currentPeriod,
    setTimeElapsed,
    setTimerRunning,
    setCurrentPeriod,
    resetTimer,
  };
};

export const useGameScore = () => {
  const homeScore = useGameStore((state) => state.gameSession.homeScore);
  const awayScore = useGameStore((state) => state.gameSession.awayScore);
  const homeOrAway = useGameStore((state) => state.gameSession.homeOrAway);
  const setHomeScore = useGameStore((state) => state.setHomeScore);
  const setAwayScore = useGameStore((state) => state.setAwayScore);
  const incrementHomeScore = useGameStore((state) => state.incrementHomeScore);
  const incrementAwayScore = useGameStore((state) => state.incrementAwayScore);
  
  return {
    homeScore,
    awayScore,
    homeOrAway,
    setHomeScore,
    setAwayScore,
    incrementHomeScore,
    incrementAwayScore,
  };
};

export const usePlayersOnField = () => {
  const players = useGameStore((state) => state.field.playersOnField);
  const setPlayers = useGameStore((state) => state.setPlayersOnField);
  const movePlayer = useGameStore((state) => state.movePlayer);
  const removePlayer = useGameStore((state) => state.removePlayerFromField);
  const addPlayer = useGameStore((state) => state.addPlayerToField);
  
  return {
    players,
    setPlayers,
    movePlayer,
    removePlayer,
    addPlayer,
  };
};