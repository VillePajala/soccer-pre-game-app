import { useCallback } from 'react';
import { AppState, Player, Opponent, Point } from '@/types';
import { GameSessionState, GameSessionAction } from './useGameSessionReducer';
import logger from '@/utils/logger';

interface UseGameStateManagerProps {
  gameSessionState: GameSessionState;
  dispatchGameSession: React.Dispatch<GameSessionAction>;
  initialGameSessionData: GameSessionState;
  setPlayersOnField: (players: Player[]) => void;
  setOpponents: (opponents: Opponent[]) => void;
  setDrawings: (drawings: Point[][]) => void;
  // resetHistory: (state: AppState) => void; // Not used directly in this hook
  setIsPlayed: (isPlayed: boolean) => void;
}

/**
 * Custom hook that manages all game session state changes.
 * Centralizes all dispatchGameSession calls and related game state logic.
 */
export const useGameStateManager = ({
  gameSessionState,
  dispatchGameSession,
  initialGameSessionData,
  setPlayersOnField,
  setOpponents,
  setDrawings,
  // resetHistory, // Not used directly in this hook
  setIsPlayed,
}: UseGameStateManagerProps) => {

  // --- Team and Opponent Management ---
  const handleTeamNameChange = useCallback((newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName) {
      logger.log('[useGameStateManager] Updating team name to:', trimmedName);
      dispatchGameSession({ type: 'SET_TEAM_NAME', payload: trimmedName });
    }
  }, [dispatchGameSession]);

  const handleOpponentNameChange = useCallback((newName: string) => {
    logger.log('[useGameStateManager] handleOpponentNameChange called with:', newName);
    dispatchGameSession({ type: 'SET_OPPONENT_NAME', payload: newName });
  }, [dispatchGameSession]);

  // --- Game Metadata Management ---
  const handleGameDateChange = useCallback((newDate: string) => {
    logger.log('[useGameStateManager] Setting game date to:', newDate);
    dispatchGameSession({ type: 'SET_GAME_DATE', payload: newDate });
  }, [dispatchGameSession]);

  const handleGameNotesChange = useCallback((notes: string) => {
    logger.log('[useGameStateManager] Setting game notes');
    dispatchGameSession({ type: 'SET_GAME_NOTES', payload: notes });
  }, [dispatchGameSession]);

  const handleGameLocationChange = useCallback((location: string) => {
    logger.log('[useGameStateManager] Setting game location to:', location);
    dispatchGameSession({ type: 'SET_GAME_LOCATION', payload: location });
  }, [dispatchGameSession]);

  const handleGameTimeChange = useCallback((time: string) => {
    logger.log('[useGameStateManager] Setting game time to:', time);
    dispatchGameSession({ type: 'SET_GAME_TIME', payload: time });
  }, [dispatchGameSession]);

  // --- Game Settings Management ---
  const handleSetNumberOfPeriods = useCallback((periods: number) => {
    const validPeriods = Math.max(1, Math.min(periods, 2)) as 1 | 2;
    logger.log('[useGameStateManager] Setting number of periods to:', validPeriods);
    dispatchGameSession({ type: 'SET_NUMBER_OF_PERIODS', payload: validPeriods });
  }, [dispatchGameSession]);

  const handleSetPeriodDuration = useCallback((newMinutes: number) => {
    logger.log('[useGameStateManager] Setting period duration to:', newMinutes);
    dispatchGameSession({ type: 'SET_PERIOD_DURATION', payload: newMinutes });
  }, [dispatchGameSession]);

  const handleSetDemandFactor = useCallback((factor: number) => {
    logger.log('[useGameStateManager] Setting demand factor to:', factor);
    dispatchGameSession({ type: 'SET_DEMAND_FACTOR', payload: factor });
  }, [dispatchGameSession]);

  const handleSetHomeOrAway = useCallback((status: 'home' | 'away') => {
    logger.log('[useGameStateManager] Setting home/away status to:', status);
    dispatchGameSession({ type: 'SET_HOME_OR_AWAY', payload: status });
  }, [dispatchGameSession]);

  // --- Tournament and Season Management ---
  const handleSetSeasonId = useCallback((seasonId: string | null | undefined) => {
    const idToSet = seasonId || '';
    logger.log('[useGameStateManager] Setting season ID to:', idToSet);
    dispatchGameSession({ type: 'SET_SEASON_ID', payload: idToSet });
  }, [dispatchGameSession]);

  const handleSetTournamentId = useCallback((tournamentId: string | null | undefined) => {
    const idToSet = tournamentId || '';
    logger.log('[useGameStateManager] Setting tournament ID to:', idToSet);
    dispatchGameSession({ type: 'SET_TOURNAMENT_ID', payload: idToSet });
  }, [dispatchGameSession]);

  const handleSetAgeGroup = useCallback((group: string) => {
    logger.log('[useGameStateManager] Setting age group to:', group);
    dispatchGameSession({ type: 'SET_AGE_GROUP', payload: group });
  }, [dispatchGameSession]);

  const handleSetTournamentLevel = useCallback((level: string) => {
    logger.log('[useGameStateManager] Setting tournament level to:', level);
    dispatchGameSession({ type: 'SET_TOURNAMENT_LEVEL', payload: level });
  }, [dispatchGameSession]);

  // --- Player Selection Management ---
  const handleTogglePlayerSelection = useCallback((playerId: string) => {
    const currentSelected = gameSessionState.selectedPlayerIds;
    const isSelected = currentSelected.includes(playerId);
    
    const newSelectedIds = isSelected
      ? currentSelected.filter(id => id !== playerId)
      : [...currentSelected, playerId];
    
    logger.log('[useGameStateManager] Toggling player selection:', { playerId, isSelected: !isSelected });
    dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: newSelectedIds });
  }, [gameSessionState.selectedPlayerIds, dispatchGameSession]);

  const handleUpdateSelectedPlayers = useCallback((playerIds: string[]) => {
    logger.log('[useGameStateManager] Updating selected player IDs:', playerIds);
    dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: playerIds });
  }, [dispatchGameSession]);

  // --- Score Management ---
  const handleSetHomeScore = useCallback((newScore: number) => {
    logger.log('[useGameStateManager] Setting home score to:', newScore);
    dispatchGameSession({ type: 'SET_HOME_SCORE', payload: newScore });
  }, [dispatchGameSession]);

  const handleSetAwayScore = useCallback((newScore: number) => {
    logger.log('[useGameStateManager] Setting away score to:', newScore);
    dispatchGameSession({ type: 'SET_AWAY_SCORE', payload: newScore });
  }, [dispatchGameSession]);

  // --- Game State Reset and History Management ---
  const handleResetToInitialState = useCallback(() => {
    logger.log('[useGameStateManager] Resetting game session to initial state');
    dispatchGameSession({ type: 'RESET_TO_INITIAL_STATE', payload: initialGameSessionData });
    setIsPlayed(true);
  }, [dispatchGameSession, initialGameSessionData, setIsPlayed]);

  const applyHistoryState = useCallback((state: AppState) => {
    logger.log('[useGameStateManager] Applying history state to game session');
    
    // Update non-reducer states first
    setPlayersOnField(state.playersOnField);
    setOpponents(state.opponents || []);
    setDrawings(state.drawings || []);
    setIsPlayed(state.isPlayed ?? true);
    
    // Create a partial GameSessionState payload for LOAD_STATE_FROM_HISTORY
    const gameSessionPayload: Partial<GameSessionState> = {
      teamName: state.teamName,
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      opponentName: state.opponentName,
      gameDate: state.gameDate,
      gameNotes: state.gameNotes,
      numberOfPeriods: state.numberOfPeriods,
      periodDurationMinutes: state.periodDurationMinutes,
      currentPeriod: state.currentPeriod || 1,
      gameStatus: state.gameStatus || 'notStarted',
      selectedPlayerIds: state.selectedPlayerIds || [],
      showPlayerNames: state.showPlayerNames ?? true,
      seasonId: state.seasonId || '',
      tournamentId: state.tournamentId || '',
      gameLocation: state.gameLocation || '',
      gameTime: state.gameTime || '',
      ageGroup: state.ageGroup || '',
      tournamentLevel: state.tournamentLevel || '',
      demandFactor: state.demandFactor || 1,
      subIntervalMinutes: state.subIntervalMinutes ?? 5,
      homeOrAway: state.homeOrAway,
      completedIntervalDurations: state.completedIntervalDurations || [],
      gameEvents: state.gameEvents || [],
    };

    // Handle lastSubConfirmationTimeSeconds if it exists
    if (state.lastSubConfirmationTimeSeconds !== undefined) {
      gameSessionPayload.lastSubConfirmationTimeSeconds = state.lastSubConfirmationTimeSeconds;
    }
    
    // Use LOAD_STATE_FROM_HISTORY to update all game session state at once
    dispatchGameSession({ type: 'LOAD_STATE_FROM_HISTORY', payload: gameSessionPayload });
  }, [
    dispatchGameSession,
    setPlayersOnField,
    setOpponents,
    setDrawings,
    setIsPlayed,
  ]);

  return {
    // Team and opponent handlers
    handleTeamNameChange,
    handleOpponentNameChange,
    
    // Game metadata handlers
    handleGameDateChange,
    handleGameNotesChange,
    handleGameLocationChange,
    handleGameTimeChange,
    
    // Game settings handlers
    handleSetNumberOfPeriods,
    handleSetPeriodDuration,
    handleSetDemandFactor,
    handleSetHomeOrAway,
    
    // Tournament and season handlers
    handleSetSeasonId,
    handleSetTournamentId,
    handleSetAgeGroup,
    handleSetTournamentLevel,
    
    // Player selection handlers
    handleTogglePlayerSelection,
    handleUpdateSelectedPlayers,
    
    // Score handlers
    handleSetHomeScore,
    handleSetAwayScore,
    
    // State management handlers
    handleResetToInitialState,
    applyHistoryState,
  };
};

export default useGameStateManager;