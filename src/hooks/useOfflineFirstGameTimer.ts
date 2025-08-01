import { useEffect, useCallback, useRef } from 'react';
import { useWakeLock } from './useWakeLock';
import { GameSessionState, GameSessionAction } from './useGameSessionReducer';
import { useSyncProgress } from './useSyncProgress';
import { OfflineFirstStorageManager } from '@/lib/storage/offlineFirstStorageManager';
import type { TimerState } from '@/types';
import logger from '@/utils/logger';

interface UseOfflineFirstGameTimerArgs {
  state: GameSessionState;
  dispatch: React.Dispatch<GameSessionAction>;
  currentGameId: string;
}

// Create offline storage manager instance lazily (client-side only)
let offlineStorage: OfflineFirstStorageManager | null = null;

const getOfflineStorage = (): OfflineFirstStorageManager => {
  if (!offlineStorage && typeof window !== 'undefined') {
    offlineStorage = new OfflineFirstStorageManager({
      enableOfflineMode: true,
      syncOnReconnect: true,
      maxRetries: 3,
      batchSize: 10,
    });
  }
  return offlineStorage!;
};

export const useOfflineFirstGameTimer = ({ 
  state, 
  dispatch, 
  currentGameId 
}: UseOfflineFirstGameTimerArgs) => {
  const { syncWakeLock } = useWakeLock();
  const { addOperation, updateOperation } = useSyncProgress();

  const startPause = useCallback(() => {
    if (state.gameStatus === 'notStarted') {
      dispatch({
        type: 'START_PERIOD',
        payload: {
          nextPeriod: 1,
          periodDurationMinutes: state.periodDurationMinutes,
          subIntervalMinutes: state.subIntervalMinutes,
        },
      });
    } else if (state.gameStatus === 'periodEnd') {
      dispatch({
        type: 'START_PERIOD',
        payload: {
          nextPeriod: state.currentPeriod + 1,
          periodDurationMinutes: state.periodDurationMinutes,
          subIntervalMinutes: state.subIntervalMinutes,
        },
      });
    } else if (state.gameStatus === 'inProgress') {
      dispatch({ type: 'SET_TIMER_RUNNING', payload: !state.isTimerRunning });
    }
  }, [dispatch, state]);

  const reset = useCallback(async () => {
    try {
      if (typeof window !== 'undefined') {
        await getOfflineStorage().deleteTimerState(currentGameId);
      }
      dispatch({ type: 'RESET_TIMER_ONLY' });
    } catch (error) {
      console.error('Failed to delete timer state:', error);
      // Still reset in memory even if storage fails
      dispatch({ type: 'RESET_TIMER_ONLY' });
    }
  }, [dispatch, currentGameId]);

  const ackSubstitution = useCallback(() => {
    dispatch({ type: 'CONFIRM_SUBSTITUTION' });
  }, [dispatch]);

  const setSubInterval = useCallback(
    (minutes: number) => {
      dispatch({ type: 'SET_SUB_INTERVAL', payload: Math.max(1, minutes) });
    },
    [dispatch]
  );

  const stateRef = useRef(state);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  stateRef.current = state;

  // Save timer state to offline-first storage
  const saveTimerState = useCallback(async (timerState: TimerState) => {
    if (!currentGameId || typeof window === 'undefined') return;

    try {
      const operationId = addOperation({
        type: 'upload',
        table: 'timer_states',
        status: 'syncing',
        progress: 0,
      });

      await getOfflineStorage().saveTimerState(timerState);

      updateOperation(operationId, {
        status: 'completed',  
        progress: 100,
      });
    } catch (error) {
      console.error('Failed to save timer state:', error);
      // Don't throw - timer should continue working even if storage fails
    }
  }, [currentGameId, addOperation, updateOperation]);

  // Load timer state from offline-first storage
  const loadTimerState = useCallback(async (): Promise<TimerState | null> => {
    if (!currentGameId || typeof window === 'undefined') return null;

    try {
      return await getOfflineStorage().getTimerState(currentGameId);
    } catch (error) {
      console.error('Failed to load timer state:', error);
      return null;
    }
  }, [currentGameId]);

  // --- Restore timer state when the game ID changes ---
  const previousGameIdRef = useRef<string | null>(null);
  useEffect(() => {
    const restoreTimer = async () => {
      if (!currentGameId) {
        previousGameIdRef.current = currentGameId;
        return;
      }

      try {
        // Only restore timer state for the current game
        // Do NOT migrate timer state between games
        const savedState = await loadTimerState();
        if (savedState && savedState.gameId === currentGameId) {
          dispatch({
            type: 'RESTORE_TIMER_STATE',
            payload: { savedTime: savedState.timeElapsedInSeconds, timestamp: savedState.timestamp }
          });
        }
      } catch (error) {
        console.error('Failed to restore timer state:', error);
      }

      previousGameIdRef.current = currentGameId;
    };

    restoreTimer();
  }, [currentGameId, loadTimerState, dispatch]);

  // Timer interval effect
  useEffect(() => {
    syncWakeLock(state.isTimerRunning);

    const startInterval = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        const s = stateRef.current;
        const periodEnd = s.currentPeriod * s.periodDurationMinutes * 60;
        const nextTime = Math.round(s.timeElapsedInSeconds) + 1;

        // Save timer state asynchronously without blocking the interval
        if (currentGameId) {
          const timerState: TimerState = {
            gameId: currentGameId,
            timeElapsedInSeconds: nextTime,
            timestamp: Date.now(),
          };
          saveTimerState(timerState).catch((error) => {
            logger.error('[useOfflineFirstGameTimer] Failed to save timer state:', error);
          });
        }

        if (nextTime >= periodEnd) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          
          // Clean up timer state when period/game ends
          if (currentGameId && typeof window !== 'undefined') {
            getOfflineStorage().deleteTimerState(currentGameId).catch((error) => {
              console.error('Failed to delete timer state on period end:', error);
            });
          }
          
          if (s.currentPeriod === s.numberOfPeriods) {
            dispatch({ type: 'END_PERIOD_OR_GAME', payload: { newStatus: 'gameEnd', finalTime: periodEnd } });
          } else {
            dispatch({ type: 'END_PERIOD_OR_GAME', payload: { newStatus: 'periodEnd', finalTime: periodEnd } });
          }
        } else {
          dispatch({ type: 'SET_TIMER_ELAPSED', payload: nextTime });
        }
      }, 1000);
    };

    if (state.isTimerRunning && state.gameStatus === 'inProgress') {
      startInterval();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    state.isTimerRunning, 
    state.gameStatus, 
    state.currentPeriod, 
    state.periodDurationMinutes, 
    state.numberOfPeriods, 
    currentGameId, 
    dispatch, 
    syncWakeLock,
    saveTimerState
  ]);

  // Visibility change effect for background/foreground handling
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Save timer state when going to background
        if (state.isTimerRunning && currentGameId) {
          const timerState: TimerState = {
            gameId: currentGameId,
            timeElapsedInSeconds: state.timeElapsedInSeconds,
            timestamp: Date.now(),
          };
          await saveTimerState(timerState);
          dispatch({ type: 'PAUSE_TIMER_FOR_HIDDEN' });
        }
      } else {
        // Restore timer state when coming back to foreground
        const savedTimerState = await loadTimerState();
        if (savedTimerState && savedTimerState.gameId === currentGameId) {
          dispatch({
            type: 'RESTORE_TIMER_STATE',
            payload: {
              savedTime: savedTimerState.timeElapsedInSeconds,
              timestamp: savedTimerState.timestamp,
            },
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    state.isTimerRunning, 
    state.timeElapsedInSeconds, 
    currentGameId, 
    dispatch, 
    saveTimerState, 
    loadTimerState
  ]);

  return {
    timeElapsedInSeconds: state.timeElapsedInSeconds,
    isTimerRunning: state.isTimerRunning,
    nextSubDueTimeSeconds: state.nextSubDueTimeSeconds,
    subAlertLevel: state.subAlertLevel,
    lastSubConfirmationTimeSeconds: state.lastSubConfirmationTimeSeconds,
    startPause,
    reset,
    ackSubstitution,
    setSubInterval,
  };
};