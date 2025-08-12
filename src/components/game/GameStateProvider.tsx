'use client';

import React, { createContext, useContext, useReducer, useState, useCallback, useEffect } from 'react';
import { gameSessionReducer, GameSessionState } from '@/hooks/useGameSessionReducer';
import { GameStateContextType } from '@/types/gameComponents';
import { Player, AppState } from '@/types';
import { useGameState } from '@/hooks/useGameState';
import { DEFAULT_GAME_ID } from '@/config/constants';
import logger from '@/utils/logger';

// Create the context
const GameStateContext = createContext<GameStateContextType | null>(null);

// Initial game session state
const createInitialGameSessionState = (): GameSessionState => ({
  
  // Team information
  teamName: "My Team",
  opponentName: "Opponent",
  
  // Game timing and structure
  gameDate: new Date().toISOString().split('T')[0],
  gameTime: "",
  gameLocation: "",
  numberOfPeriods: 2,
  periodDurationMinutes: 10,
  currentPeriod: 1,
  
  // Game status
  gameStatus: 'notStarted',
  homeOrAway: 'home',
  
  // Score tracking
  homeScore: 0,
  awayScore: 0,
  
  // Player management
  selectedPlayerIds: [],
  
  // Game events
  gameEvents: [],
  
  // Game settings
  demandFactor: 1.0,
  showPlayerNames: true,
  
  // Competition context
  seasonId: "",
  tournamentId: "",
  ageGroup: "",
  tournamentLevel: "",
  gameNotes: "",
  
  // Timer state
  timeElapsedInSeconds: 0,
  startTimestamp: null,
  isTimerRunning: false,
  subIntervalMinutes: 5,
  completedIntervalDurations: [],
  lastSubConfirmationTimeSeconds: 0,
  nextSubDueTimeSeconds: 5 * 60,
  subAlertLevel: 'none' as 'none' | 'warning' | 'due',
});

interface GameStateProviderProps {
  children: React.ReactNode;
  initialState?: Partial<AppState>;
  initialGameId?: string | null;
}

export function GameStateProvider({ 
  children, 
  initialState,
  initialGameId = DEFAULT_GAME_ID 
}: GameStateProviderProps) {
  // Core game session state using reducer
  const [gameSessionState, dispatchGameSession] = useReducer(
    gameSessionReducer, 
    createInitialGameSessionState()
  );
  
  // Field and tactical state using existing hook
  const gameStateResult = useGameState({
    initialState: (initialState as AppState) || ({} as AppState),
    saveStateToHistory: (newState: Partial<AppState>) => {
      // State update callback - placeholder for now
      logger.debug('[GameStateProvider] Field state updated:', newState);
    }
  });
  const {
    playersOnField,
    opponents,
    drawings,
    availablePlayers,
    setPlayersOnField,
    setOpponents,
    setDrawings,
    setAvailablePlayers,
  } = gameStateResult;
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Current game ID
  const [currentGameId, setCurrentGameId] = useState<string | null>(initialGameId);
  
  // Game timing state
  const [timeElapsedInSeconds, setTimeElapsedInSeconds] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  
  // Sync game session selectedPlayerIds with field state
  useEffect(() => {
    // For now, manage selectedPlayerIds in the session state
    // Future integration will sync with field state
  }, [gameSessionState.selectedPlayerIds]);
  
  // Update game state function
  const updateGameState = useCallback((update: Partial<GameSessionState>) => {
    logger.debug('[GameStateProvider] Updating game state:', update);
    // For now, use a simple state update - will integrate with reducer properly later
    Object.entries(update).forEach(([key, value]) => {
      if (key === 'teamName') {
        dispatchGameSession({ type: 'SET_TEAM_NAME', payload: value as string });
      } else if (key === 'opponentName') {
        dispatchGameSession({ type: 'SET_OPPONENT_NAME', payload: value as string });
      } else if (key === 'gameStatus') {
        dispatchGameSession({ type: 'SET_GAME_STATUS', payload: value as 'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd' });
      }
      // Add more specific action dispatches as needed
    });
  }, []);
  
  // Update players function
  const updatePlayers = useCallback((players: Player[]) => {
    logger.debug('[GameStateProvider] Updating available players:', players.length);
    setAvailablePlayers(players);
  }, [setAvailablePlayers]);
  
  // Reset game function
  const resetGame = useCallback(() => {
    logger.debug('[GameStateProvider] Resetting game state');
    dispatchGameSession({ type: 'RESET_TO_INITIAL_STATE', payload: createInitialGameSessionState() });
    setTimeElapsedInSeconds(0);
    setIsGameActive(false);
    setError(null);
  }, []);
  
  // Start game function
  const startGame = useCallback(() => {
    logger.debug('[GameStateProvider] Starting game');
    updateGameState({ gameStatus: 'inProgress' });
    setIsGameActive(true);
  }, [updateGameState]);
  
  // Pause game function  
  const pauseGame = useCallback(() => {
    logger.debug('[GameStateProvider] Pausing game');
    // Maintain current status; reduce to paused by toggling running flag
    // Delegate to reducer semantics rather than resetting status
    dispatchGameSession({ type: 'PAUSE_TIMER' });
    setIsGameActive(false);
  }, []);
  
  // End game function
  const endGame = useCallback(() => {
    logger.debug('[GameStateProvider] Ending game');
    updateGameState({ gameStatus: 'gameEnd' });
    setIsGameActive(false);
  }, [updateGameState]);
  
  // Context value
  const contextValue: GameStateContextType = {
    // Core state
    gameState: gameSessionState,
    dispatch: dispatchGameSession as React.Dispatch<unknown>,
    
    // Players state
    availablePlayers,
    playersOnField,
    opponents: opponents as unknown as Player[],
    drawings,
    selectedPlayerIds: gameSessionState.selectedPlayerIds,
    
    // Status
    isLoading,
    error,
    isGameActive,
    timeElapsedInSeconds,
    
    // Update functions
    updateGameState,
    updatePlayers,
    resetGame,
    startGame,
    pauseGame,
    endGame,
    
    // Setters
    setIsLoading,
    setError,
    setTimeElapsedInSeconds,
    setCurrentGameId,
    currentGameId,
    setPlayersOnField,
    setOpponents: setOpponents as (opponents: Player[]) => void,
    setDrawings: setDrawings as (drawings: unknown[]) => void,
    setSelectedPlayerIds: (ids: string[]) => {
      dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: ids });
    },
  };
  
  return (
    <GameStateContext.Provider value={{
      ...contextValue,
      // Extended properties for the hook
      opponents: opponents as unknown as Player[],
      drawings,
      selectedPlayerIds: gameSessionState.selectedPlayerIds,
      startGame,
      pauseGame,
      endGame,
      setIsLoading,
      setError,
      setTimeElapsedInSeconds,
      setCurrentGameId,
      currentGameId,
      setPlayersOnField,
      setOpponents, 
      setDrawings,
      setSelectedPlayerIds: (ids: string[]) => {
        dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: ids });
      },
    } as GameStateContextType & Record<string, unknown>}>
      {children}
    </GameStateContext.Provider>
  );
}

// Custom hook to use the game state context
export function useGameStateContext(): GameStateContextType & {
  opponents: Player[];
  drawings: unknown[];
  selectedPlayerIds: string[];
  startGame: () => void;
  pauseGame: () => void;
  endGame: () => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTimeElapsedInSeconds: (seconds: number) => void;
  setCurrentGameId: (id: string | null) => void;
  currentGameId: string | null;
  setPlayersOnField: (players: Player[]) => void;
  setOpponents: (opponents: Player[]) => void;
  setDrawings: (drawings: unknown[]) => void;
  setSelectedPlayerIds: (ids: string[]) => void;
} {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameStateContext must be used within a GameStateProvider');
  }
  return context as GameStateContextType & {
    opponents: Player[];
    drawings: unknown[];
    selectedPlayerIds: string[];
    startGame: () => void;
    pauseGame: () => void;
    endGame: () => void;
    setIsLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setTimeElapsedInSeconds: (seconds: number) => void;
    setCurrentGameId: (id: string | null) => void;
    currentGameId: string | null;
    setPlayersOnField: (players: Player[]) => void;
    setOpponents: (opponents: Player[]) => void;
    setDrawings: (drawings: unknown[]) => void;
    setSelectedPlayerIds: (ids: string[]) => void;
  };
}

// Export the context for direct access if needed
export { GameStateContext };