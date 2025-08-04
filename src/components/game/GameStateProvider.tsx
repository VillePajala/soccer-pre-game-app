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
  // Game identification
  gameId: DEFAULT_GAME_ID,
  
  // Team information
  teamName: "My Team",
  opponentName: "Opponent",
  
  // Game timing and structure
  gameDate: new Date().toISOString().split('T')[0],
  gameTime: "",
  gameLocation: "",
  numberOfPeriods: 2,
  periodDurationMinutes: 45,
  currentPeriod: 1,
  
  // Game status
  gameStatus: 'not-started',
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
  const {
    playersOnField,
    opponents,
    drawings,
    availablePlayers,
    selectedPlayerIds,
    resetGameState: resetFieldState,
    setPlayersOnField,
    setOpponents,
    setDrawings,
    setAvailablePlayers,
    setSelectedPlayerIds,
  } = useGameState(initialState);
  
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
    if (gameSessionState.selectedPlayerIds !== selectedPlayerIds) {
      setSelectedPlayerIds(gameSessionState.selectedPlayerIds);
    }
  }, [gameSessionState.selectedPlayerIds, selectedPlayerIds, setSelectedPlayerIds]);
  
  // Update game state function
  const updateGameState = useCallback((update: Partial<GameSessionState>) => {
    logger.debug('[GameStateProvider] Updating game state:', update);
    dispatchGameSession({ type: 'UPDATE_MULTIPLE', payload: update });
  }, []);
  
  // Update players function
  const updatePlayers = useCallback((players: Player[]) => {
    logger.debug('[GameStateProvider] Updating available players:', players.length);
    setAvailablePlayers(players);
  }, [setAvailablePlayers]);
  
  // Reset game function
  const resetGame = useCallback(() => {
    logger.debug('[GameStateProvider] Resetting game state');
    dispatchGameSession({ type: 'RESET_GAME', payload: createInitialGameSessionState() });
    resetFieldState();
    setTimeElapsedInSeconds(0);
    setIsGameActive(false);
    setError(null);
  }, [resetFieldState]);
  
  // Start game function
  const startGame = useCallback(() => {
    logger.debug('[GameStateProvider] Starting game');
    updateGameState({ gameStatus: 'in-progress' });
    setIsGameActive(true);
  }, [updateGameState]);
  
  // Pause game function  
  const pauseGame = useCallback(() => {
    logger.debug('[GameStateProvider] Pausing game');
    updateGameState({ gameStatus: 'paused' });
    setIsGameActive(false);
  }, [updateGameState]);
  
  // End game function
  const endGame = useCallback(() => {
    logger.debug('[GameStateProvider] Ending game');
    updateGameState({ gameStatus: 'completed' });
    setIsGameActive(false);
  }, [updateGameState]);
  
  // Context value
  const contextValue: GameStateContextType = {
    // Core state
    gameState: gameSessionState,
    dispatch: dispatchGameSession,
    
    // Players state
    availablePlayers,
    playersOnField,
    
    // Status
    isLoading,
    error,
    isGameActive,
    timeElapsedInSeconds,
    
    // Update functions
    updateGameState,
    updatePlayers,
    resetGame,
    
    // Additional field state (not in interface but useful for components)
    opponents,
    drawings,
    selectedPlayerIds,
    
    // Additional actions (extending the interface)
    startGame,
    pauseGame,
    endGame,
    setIsLoading,
    setError,
    setTimeElapsedInSeconds,
    setCurrentGameId,
    currentGameId,
    
    // Field state setters
    setPlayersOnField,
    setOpponents, 
    setDrawings,
    setSelectedPlayerIds,
  } as GameStateContextType & {
    // Extended properties not in the interface
    opponents: Player[];
    drawings: any[];
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
    setDrawings: (drawings: any[]) => void;
    setSelectedPlayerIds: (ids: string[]) => void;
  };
  
  return (
    <GameStateContext.Provider value={contextValue}>
      {children}
    </GameStateContext.Provider>
  );
}

// Custom hook to use the game state context
export function useGameStateContext(): GameStateContextType & {
  opponents: Player[];
  drawings: any[];
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
  setDrawings: (drawings: any[]) => void;
  setSelectedPlayerIds: (ids: string[]) => void;
} {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameStateContext must be used within a GameStateProvider');
  }
  return context as any;
}

// Export the context for direct access if needed
export { GameStateContext };