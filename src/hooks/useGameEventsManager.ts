import { useCallback } from 'react';
import { DEFAULT_GAME_ID } from '@/config/constants';
import { saveMasterRoster } from '@/utils/masterRoster';
import logger from '@/utils/logger';
import type { Player, GameEvent, AppState } from '@/types';
import type { GameSessionState, GameSessionAction } from './useGameSessionReducer';

interface UseGameEventsManagerProps {
  availablePlayers: Player[];
  playersOnField: Player[];
  setAvailablePlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  setPlayersOnField: React.Dispatch<React.SetStateAction<Player[]>>;
  dispatchGameSession: React.Dispatch<GameSessionAction>;
  gameSessionState: GameSessionState;
  masterRosterPlayers?: Player[];
  setIsGoalLogModalOpen: (open: boolean) => void;
  saveStateToHistory: (state: Partial<AppState>) => void;
  currentGameId: string | null;
}

export const useGameEventsManager = ({
  availablePlayers,
  playersOnField,
  setAvailablePlayers,
  setPlayersOnField,
  dispatchGameSession,
  gameSessionState,
  masterRosterPlayers,
  setIsGoalLogModalOpen,
  saveStateToHistory,
  currentGameId,
}: UseGameEventsManagerProps) => {
  const handleAddGoalEvent = useCallback(
    (scorerId: string, assisterId?: string) => {
      const rosterSource = masterRosterPlayers || availablePlayers;
      const scorer = rosterSource.find(p => p.id === scorerId);
      const assister = assisterId ? rosterSource.find(p => p.id === assisterId) : undefined;
      if (!scorer) {
        logger.error('[useGameEventsManager] Scorer not found:', scorerId);
        return;
      }

      const newEvent: GameEvent = {
        id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'goal',
        time: gameSessionState.timeElapsedInSeconds,
        scorerId: scorer.id,
        assisterId: assister?.id,
      };

      dispatchGameSession({ type: 'ADD_GAME_EVENT', payload: newEvent });
      dispatchGameSession({
        type: 'ADJUST_SCORE_FOR_EVENT',
        payload: { eventType: 'goal', action: 'add' },
      });
    },
    [availablePlayers, masterRosterPlayers, gameSessionState.timeElapsedInSeconds, dispatchGameSession],
  );

  const handleLogOpponentGoal = useCallback(
    (time: number) => {
      logger.log(`[useGameEventsManager] Logging opponent goal at time: ${time}`);
      const newEvent: GameEvent = {
        id: `oppGoal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type: 'opponentGoal',
        time,
        scorerId: 'opponent',
      };

      dispatchGameSession({ type: 'ADD_GAME_EVENT', payload: newEvent });
      dispatchGameSession({
        type: 'ADJUST_SCORE_FOR_EVENT',
        payload: { eventType: 'opponentGoal', action: 'add' },
      });
      setIsGoalLogModalOpen(false);
    },
    [dispatchGameSession, setIsGoalLogModalOpen],
  );

  const handleUpdateGameEvent = useCallback(
    (updatedEvent: GameEvent) => {
      const cleanUpdatedEvent: GameEvent = {
        id: updatedEvent.id,
        type: updatedEvent.type,
        time: updatedEvent.time,
        scorerId: updatedEvent.scorerId,
        assisterId: updatedEvent.assisterId,
        entityId: updatedEvent.entityId,
      };

      dispatchGameSession({ type: 'UPDATE_GAME_EVENT', payload: cleanUpdatedEvent });
      logger.log('[useGameEventsManager] Updated game event:', updatedEvent.id);
    },
    [dispatchGameSession],
  );

  const handleDeleteGameEvent = useCallback(
    (eventId: string) => {
      const eventToDelete = gameSessionState.gameEvents.find(e => e.id === eventId);
      if (!eventToDelete) {
        logger.error('[useGameEventsManager] Event to delete not found:', eventId);
        return;
      }

      dispatchGameSession({ type: 'DELETE_GAME_EVENT', payload: eventId });
      if (eventToDelete.type === 'goal' || eventToDelete.type === 'opponentGoal') {
        dispatchGameSession({
          type: 'ADJUST_SCORE_FOR_EVENT',
          payload: { eventType: eventToDelete.type, action: 'delete' },
        });
      }
      logger.log('[useGameEventsManager] Deleted game event:', eventId);
    },
    [gameSessionState.gameEvents, dispatchGameSession],
  );

  const handleAwardFairPlayCard = useCallback(
    async (playerId: string | null) => {
      logger.log(`[useGameEventsManager] handleAwardFairPlayCard called with playerId: ${playerId}`);

      if (!currentGameId || currentGameId === DEFAULT_GAME_ID) {
        logger.warn('[useGameEventsManager] Cannot award fair play card in unsaved/default state.');
        return;
      }

      let updatedAvailablePlayers = availablePlayers;
      let updatedPlayersOnField = playersOnField;

      const currentlyAwardedPlayerId = availablePlayers.find(p => p.receivedFairPlayCard)?.id;

      if (currentlyAwardedPlayerId) {
        updatedAvailablePlayers = updatedAvailablePlayers.map(p =>
          p.id === currentlyAwardedPlayerId ? { ...p, receivedFairPlayCard: false } : p,
        );
        updatedPlayersOnField = updatedPlayersOnField.map(p =>
          p.id === currentlyAwardedPlayerId ? { ...p, receivedFairPlayCard: false } : p,
        );
      }

      if (playerId && playerId !== currentlyAwardedPlayerId) {
        updatedAvailablePlayers = updatedAvailablePlayers.map(p =>
          p.id === playerId ? { ...p, receivedFairPlayCard: true } : p,
        );
        updatedPlayersOnField = updatedPlayersOnField.map(p =>
          p.id === playerId ? { ...p, receivedFairPlayCard: true } : p,
        );
        logger.log(`[useGameEventsManager] Awarding card to ${playerId}`);
      } else {
        logger.log(
          `[useGameEventsManager] Clearing card. PlayerId: ${playerId}, Currently Awarded: ${currentlyAwardedPlayerId}`,
        );
      }

      setAvailablePlayers(updatedAvailablePlayers);
      setPlayersOnField(updatedPlayersOnField);

      try {
        const success = await saveMasterRoster(updatedAvailablePlayers);
        if (!success) {
          logger.error('[useGameEventsManager] Failed to save master roster.');
        }
      } catch (error) {
        logger.error('[useGameEventsManager] Error saving master roster:', error);
      }

      saveStateToHistory({ playersOnField: updatedPlayersOnField });
      logger.log(
        `[useGameEventsManager] Updated Fair Play card award. ${playerId ? `Awarded to ${playerId}` : 'Cleared'}`,
      );
    },
    [
      availablePlayers,
      playersOnField,
      setAvailablePlayers,
      setPlayersOnField,
      saveStateToHistory,
      currentGameId,
    ],
  );

  return {
    handlers: {
      handleAddGoalEvent,
      handleLogOpponentGoal,
      handleUpdateGameEvent,
      handleDeleteGameEvent,
      handleAwardFairPlayCard,
    },
  } as const;
};

export type UseGameEventsManagerReturn = ReturnType<typeof useGameEventsManager>;
export default useGameEventsManager;
