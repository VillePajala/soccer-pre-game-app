import { useCallback } from 'react';
import { GameEvent, Player } from '@/types';
import { DEFAULT_GAME_ID } from '@/config/constants';
import { GameSessionState, GameSessionAction } from './useGameSessionReducer';
import { saveMasterRoster } from '@/utils/masterRoster';
import logger from '@/utils/logger';

interface UseGameEventsManagerProps {
  dispatchGameSession: React.Dispatch<GameSessionAction>;
  gameSessionState: GameSessionState;
  availablePlayers: Player[];
  setAvailablePlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  playersOnField: Player[];
  setPlayersOnField: React.Dispatch<React.SetStateAction<Player[]>>;
  masterRosterQueryResultData?: Player[];
  currentGameId: string | null;
  saveStateToHistory: (state: Partial<{ playersOnField: Player[] }>) => void;
  setIsGoalLogModalOpen: (open: boolean) => void;
}

/**
 * Custom hook that manages all game event operations.
 * Handles goal events, opponent goals, event updates, deletions, and fair play cards.
 */
export const useGameEventsManager = ({
  dispatchGameSession,
  gameSessionState,
  availablePlayers,
  setAvailablePlayers,
  playersOnField,
  setPlayersOnField,
  masterRosterQueryResultData,
  currentGameId,
  saveStateToHistory,
  setIsGoalLogModalOpen,
}: UseGameEventsManagerProps) => {

  // --- Goal Event Handlers ---

  /**
   * Handler to add a goal event
   */
  const handleAddGoalEvent = useCallback((scorerId: string, assisterId?: string) => {
    const scorer = (masterRosterQueryResultData || availablePlayers).find(p => p.id === scorerId);
    const assister = assisterId ? (masterRosterQueryResultData || availablePlayers).find(p => p.id === assisterId) : undefined;

    if (!scorer) {
      logger.error("Scorer not found!");
      return;
    }

    const newEvent: GameEvent = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'goal',
      time: gameSessionState.timeElapsedInSeconds, // Use from gameSessionState
      scorerId: scorer.id,
      assisterId: assister?.id,
    };
    
    // Dispatch actions to update game state via reducer
    dispatchGameSession({ type: 'ADD_GAME_EVENT', payload: newEvent });
    dispatchGameSession({ type: 'ADJUST_SCORE_FOR_EVENT', payload: { eventType: 'goal', action: 'add' } });
  }, [dispatchGameSession, gameSessionState.timeElapsedInSeconds, masterRosterQueryResultData, availablePlayers]);

  /**
   * Handler to log an opponent goal
   */
  const handleLogOpponentGoal = useCallback((time: number) => {
    logger.log(`Logging opponent goal at time: ${time}`);
    const newEvent: GameEvent = {
      id: `oppGoal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'opponentGoal',
      time: time, // Use provided time
      scorerId: 'opponent', 
    };

    dispatchGameSession({ type: 'ADD_GAME_EVENT', payload: newEvent });
    dispatchGameSession({ type: 'ADJUST_SCORE_FOR_EVENT', payload: { eventType: 'opponentGoal', action: 'add' } });
    setIsGoalLogModalOpen(false);
  }, [dispatchGameSession, setIsGoalLogModalOpen]);

  // --- Event Management Handlers ---

  /**
   * Handler to update an existing game event
   */
  const handleUpdateGameEvent = useCallback((updatedEvent: GameEvent) => {
    const cleanUpdatedEvent: GameEvent = { 
      id: updatedEvent.id, 
      type: updatedEvent.type, 
      time: updatedEvent.time, 
      scorerId: updatedEvent.scorerId, 
      assisterId: updatedEvent.assisterId 
    }; // Keep cleaning
    
    dispatchGameSession({ type: 'UPDATE_GAME_EVENT', payload: cleanUpdatedEvent });
    
    logger.log("Updated game event via dispatch:", updatedEvent.id);
  }, [dispatchGameSession]);

  /**
   * Handler to delete a game event
   */
  const handleDeleteGameEvent = useCallback((goalId: string) => {
    const eventToDelete = gameSessionState.gameEvents.find(e => e.id === goalId);
    if (!eventToDelete) {
      logger.error("Event to delete not found in gameSessionState.gameEvents:", goalId);
      return;
    }

    dispatchGameSession({ type: 'DELETE_GAME_EVENT', payload: goalId });
    if (eventToDelete.type === 'goal' || eventToDelete.type === 'opponentGoal') {
      dispatchGameSession({ 
        type: 'ADJUST_SCORE_FOR_EVENT', 
        payload: { eventType: eventToDelete.type, action: 'delete' } 
      });
    }
    
    logger.log("Deleted game event via dispatch and updated state/history:", goalId);
  }, [dispatchGameSession, gameSessionState.gameEvents]);

  // --- Fair Play Card Handler ---

  /**
   * Handler to award fair play card
   */
  const handleAwardFairPlayCard = useCallback(async (playerId: string | null) => {
    // <<< ADD LOG HERE >>>
    logger.log(`[useGameEventsManager] handleAwardFairPlayCard called with playerId: ${playerId}`);
    logger.log(`[useGameEventsManager] availablePlayers BEFORE update:`, JSON.stringify(availablePlayers.map(p => ({id: p.id, fp: p.receivedFairPlayCard}))));
    logger.log(`[useGameEventsManager] playersOnField BEFORE update:`, JSON.stringify(playersOnField.map(p => ({id: p.id, fp: p.receivedFairPlayCard}))));

    if (!currentGameId || currentGameId === DEFAULT_GAME_ID) {
        logger.warn("Cannot award fair play card in unsaved/default state.");
        return; // Prevent awarding in default state
    }

    let updatedAvailablePlayers = availablePlayers;
    let updatedPlayersOnField = playersOnField;

    // Find the currently awarded player, if any
    const currentlyAwardedPlayerId = availablePlayers.find(p => p.receivedFairPlayCard)?.id;

    // If the selected ID is the same as the current one, we are toggling it OFF.
    // If the selected ID is different, we are changing the award.
    // If the selected ID is null, we are clearing the award.

    // Clear any existing card first
    if (currentlyAwardedPlayerId) {
        updatedAvailablePlayers = updatedAvailablePlayers.map(p =>
            p.id === currentlyAwardedPlayerId ? { ...p, receivedFairPlayCard: false } : p
        );
        updatedPlayersOnField = updatedPlayersOnField.map(p =>
            p.id === currentlyAwardedPlayerId ? { ...p, receivedFairPlayCard: false } : p
        );
    }

    // Award the new card if a playerId is provided (and it's different from the one just cleared)
    if (playerId && playerId !== currentlyAwardedPlayerId) {
        // <<< MODIFY LOGGING HERE >>>
        updatedAvailablePlayers = updatedAvailablePlayers.map(p =>
            p.id === playerId ? { ...p, receivedFairPlayCard: true } : p
        );
        updatedPlayersOnField = updatedPlayersOnField.map(p =>
            p.id === playerId ? { ...p, receivedFairPlayCard: true } : p
        );
        logger.log(`[useGameEventsManager] Awarding card to ${playerId}`);
    } else {
        // <<< ADD LOG HERE >>>
        logger.log(`[useGameEventsManager] Clearing card (or toggling off). PlayerId: ${playerId}, Currently Awarded: ${currentlyAwardedPlayerId}`);
    }
    // If playerId is null, we only cleared the existing card.
    // If playerId is the same as currentlyAwardedPlayerId, we cleared it and don't re-award.

    // <<< ADD LOG HERE >>>
    logger.log(`[useGameEventsManager] availablePlayers AFTER update logic:`, JSON.stringify(updatedAvailablePlayers.map(p => ({id: p.id, fp: p.receivedFairPlayCard}))));
    logger.log(`[useGameEventsManager] playersOnField AFTER update logic:`, JSON.stringify(updatedPlayersOnField.map(p => ({id: p.id, fp: p.receivedFairPlayCard}))));

    // <<< ADD LOG HERE >>>
    logger.log(`[useGameEventsManager] Calling setAvailablePlayers and setPlayersOnField...`);
    setAvailablePlayers(updatedAvailablePlayers);
    setPlayersOnField(updatedPlayersOnField);
    // Save updated global roster
    // localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(updatedAvailablePlayers));
    try {
      const success = await saveMasterRoster(updatedAvailablePlayers);
      if (!success) {
        logger.error('[useGameEventsManager] handleAwardFairPlayCard: Failed to save master roster using utility.');
        // Optionally, set an error state to inform the user
      }
    } catch (error) {
      logger.error('[useGameEventsManager] handleAwardFairPlayCard: Error calling saveMasterRoster utility:', error);
      // Optionally, set an error state
    }
    // <<< ADD LOG HERE >>>
    logger.log(`[useGameEventsManager] Calling saveStateToHistory... ONLY for playersOnField`);
    // Save ONLY the playersOnField change to the game history, not the global roster
    saveStateToHistory({ playersOnField: updatedPlayersOnField });

    logger.log(`[useGameEventsManager] Updated Fair Play card award. ${playerId ? `Awarded to ${playerId}` : 'Cleared'}`);
  }, [availablePlayers, playersOnField, setAvailablePlayers, setPlayersOnField, saveStateToHistory, currentGameId]);

  return {
    handleAddGoalEvent,
    handleLogOpponentGoal,
    handleUpdateGameEvent,
    handleDeleteGameEvent,
    handleAwardFairPlayCard,
  };
};

export default useGameEventsManager;