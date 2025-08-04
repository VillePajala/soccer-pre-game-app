'use client';

import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import { GameStateContextType } from '@/types/gameComponents';
import { Player, AppState, Point, Opponent } from '@/types';
import { 
  useGameStore, 
  useGameSession, 
  useFieldState,
  useGameTimer,
  useGameScore,
  // type GameSessionState as ZustandGameSessionState // TODO: Remove if not needed 
} from '@/stores/gameStore';
import { DEFAULT_GAME_ID } from '@/config/constants';
import logger from '@/utils/logger';

// Create the context (same as legacy)
const GameStateContext = createContext<GameStateContextType | null>(null);

interface MigratedGameStateProviderProps {
  children: React.ReactNode;
  initialState?: Partial<AppState>;
  initialGameId?: string | null;
}

/**
 * Migrated GameStateProvider that uses Zustand stores
 * Provides the same interface as the legacy provider but with centralized state
 */
export function MigratedGameStateProvider({ 
  children, 
  initialState,
  initialGameId = DEFAULT_GAME_ID 
}: MigratedGameStateProviderProps) {
  // Get store state and actions
  const gameStore = useGameStore();
  const gameSession = useGameSession();
  const fieldState = useFieldState();
  const { setTimeElapsed, setTimerRunning, setCurrentPeriod } = useGameTimer();
  const { setHomeScore, setAwayScore } = useGameScore();
  
  // Initialize store with provided initial state
  useEffect(() => {
    if (initialState) {
      gameStore.loadGameState(initialState);
    }
    if (initialGameId) {
      gameStore.setGameId(initialGameId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount
  
  // Adapt Zustand state to match legacy GameSessionState interface
  const gameSessionState = useMemo(() => ({
    teamName: gameSession.teamName,
    opponentName: gameSession.opponentName,
    gameDate: gameSession.gameDate,
    homeScore: gameSession.homeScore,
    awayScore: gameSession.awayScore,
    gameNotes: gameSession.gameNotes,
    homeOrAway: gameSession.homeOrAway,
    numberOfPeriods: gameSession.numberOfPeriods as 1 | 2,
    periodDurationMinutes: gameSession.periodDurationMinutes,
    currentPeriod: gameSession.currentPeriod,
    gameStatus: gameSession.gameStatus as 'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd',
    selectedPlayerIds: gameSession.selectedPlayerIds,
    seasonId: gameSession.seasonId,
    tournamentId: gameSession.tournamentId,
    ageGroup: gameSession.ageGroup,
    tournamentLevel: gameSession.tournamentLevel,
    gameLocation: gameSession.gameLocation,
    gameTime: gameSession.gameTime,
    demandFactor: gameSession.demandFactor,
    gameEvents: gameSession.gameEvents,
    timeElapsedInSeconds: gameSession.timeElapsedInSeconds,
    startTimestamp: null, // Not used in Zustand version
    isTimerRunning: gameSession.isTimerRunning,
    subIntervalMinutes: gameSession.subIntervalMinutes,
    nextSubDueTimeSeconds: 0, // Calculated differently in Zustand
    subAlertLevel: 'none' as const,
    lastSubConfirmationTimeSeconds: gameSession.lastSubConfirmationTimeSeconds,
    completedIntervalDurations: gameSession.completedIntervalDurations,
    showPlayerNames: gameSession.showPlayerNames,
  }), [gameSession]);
  
  // Create dispatch function that maps legacy actions to Zustand actions
  const dispatchGameSession = useCallback((action: { type: string; payload?: unknown }) => {
    logger.debug('[MigratedGameStateProvider] Dispatch action:', action);
    
    switch (action.type) {
      case 'SET_TEAM_NAME':
        gameStore.setTeamName(action.payload);
        break;
      case 'SET_OPPONENT_NAME':
        gameStore.setOpponentName(action.payload);
        break;
      case 'SET_GAME_DATE':
        gameStore.setGameDate(action.payload);
        break;
      case 'SET_HOME_SCORE':
        setHomeScore(action.payload);
        break;
      case 'SET_AWAY_SCORE':
        setAwayScore(action.payload);
        break;
      case 'SET_GAME_NOTES':
        gameStore.setGameNotes(action.payload);
        break;
      case 'SET_HOME_OR_AWAY':
        gameStore.setHomeOrAway(action.payload);
        break;
      case 'SET_NUMBER_OF_PERIODS':
        gameStore.setNumberOfPeriods(action.payload);
        break;
      case 'SET_PERIOD_DURATION':
        gameStore.setPeriodDuration(action.payload);
        break;
      case 'SET_GAME_STATUS':
        gameStore.setGameStatus(action.payload);
        break;
      case 'SET_CURRENT_PERIOD':
        setCurrentPeriod(action.payload);
        break;
      case 'START_TIMER':
        setTimerRunning(true);
        break;
      case 'STOP_TIMER':
        setTimerRunning(false);
        break;
      case 'SET_TIME_ELAPSED':
        setTimeElapsed(action.payload);
        break;
      case 'RESET_TIMER':
        gameStore.resetTimer();
        break;
      case 'SET_SELECTED_PLAYER_IDS':
        gameStore.setSelectedPlayerIds(action.payload);
        break;
      case 'ADD_GAME_EVENT':
        gameStore.addGameEvent(action.payload);
        break;
      case 'UPDATE_GAME_EVENT':
        gameStore.updateGameEvent(action.payload.id, action.payload.updates);
        break;
      case 'REMOVE_GAME_EVENT':
        gameStore.removeGameEvent(action.payload);
        break;
      case 'SET_SEASON_ID':
        gameStore.setSeasonId(action.payload);
        break;
      case 'SET_TOURNAMENT_ID':
        gameStore.setTournamentId(action.payload);
        break;
      case 'SET_AGE_GROUP':
        gameStore.setAgeGroup(action.payload);
        break;
      case 'SET_TOURNAMENT_LEVEL':
        gameStore.setTournamentLevel(action.payload);
        break;
      case 'SET_GAME_LOCATION':
        gameStore.setGameLocation(action.payload);
        break;
      case 'SET_GAME_TIME':
        gameStore.setGameTime(action.payload);
        break;
      case 'SET_DEMAND_FACTOR':
        gameStore.setDemandFactor(action.payload);
        break;
      case 'SET_SUB_INTERVAL':
        gameStore.setSubInterval(action.payload);
        break;
      case 'SET_SHOW_PLAYER_NAMES':
        gameStore.setShowPlayerNames(action.payload);
        break;
      case 'LOAD_STATE_FROM_HISTORY':
        gameStore.loadGameState(action.payload);
        break;
      case 'RESET_TO_INITIAL_STATE':
        gameStore.resetGameSession();
        break;
      default:
        logger.warn('[MigratedGameStateProvider] Unknown action type:', action.type);
    }
  }, [gameStore, setTimeElapsed, setTimerRunning, setCurrentPeriod, setHomeScore, setAwayScore]);
  
  // Field state handlers using Zustand
  const setPlayersOnField = useCallback((players: Player[]) => {
    gameStore.setPlayersOnField(players);
  }, [gameStore]);
  
  const setOpponents = useCallback((opponents: Opponent[]) => {
    gameStore.setOpponents(opponents);
  }, [gameStore]);
  
  const setDrawings = useCallback((drawings: Point[][]) => {
    gameStore.setDrawings(drawings);
  }, [gameStore]);
  
  const setAvailablePlayers = useCallback((players: Player[]) => {
    gameStore.setAvailablePlayers(players);
  }, [gameStore]);
  
  // Additional handlers for tactical elements
  const setTacticalDrawings = useCallback((drawings: Point[][]) => {
    gameStore.setTacticalDrawings(drawings);
  }, [gameStore]);
  
  const setTacticalDiscs = useCallback((discs: unknown[]) => {
    gameStore.setTacticalDiscs(discs);
  }, [gameStore]);
  
  const setTacticalBallPosition = useCallback((position: Point | null) => {
    gameStore.setTacticalBallPosition(position);
  }, [gameStore]);
  
  // Create context value matching legacy interface
  const contextValue: GameStateContextType = useMemo(() => ({
    // Game session state
    gameSessionState,
    dispatchGameSession,
    
    // Field state from Zustand
    playersOnField: fieldState.playersOnField,
    setPlayersOnField,
    opponents: fieldState.opponents,
    setOpponents,
    drawings: fieldState.drawings,
    setDrawings,
    availablePlayers: fieldState.availablePlayers,
    setAvailablePlayers,
    
    // Tactical state
    tacticalDrawings: fieldState.tacticalDrawings,
    setTacticalDrawings,
    tacticalDiscs: fieldState.tacticalDiscs,
    setTacticalDiscs,
    tacticalBallPosition: fieldState.tacticalBallPosition,
    setTacticalBallPosition,
    
    // Additional properties to match interface
    isTacticsBoardView: false, // Will be handled by UI store in future migration
    setIsTacticsBoardView: () => {}, // Placeholder
  }), [
    gameSessionState,
    dispatchGameSession,
    fieldState,
    setPlayersOnField,
    setOpponents,
    setDrawings,
    setAvailablePlayers,
    setTacticalDrawings,
    setTacticalDiscs,
    setTacticalBallPosition,
  ]);
  
  return (
    <GameStateContext.Provider value={contextValue}>
      {children}
    </GameStateContext.Provider>
  );
}

// Export the hook to use the context
export function useGameStateContext() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameStateContext must be used within GameStateProvider');
  }
  return context;
}