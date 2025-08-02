import { useEffect, useCallback, useRef } from 'react';
import { useWakeLock } from './useWakeLock';
import { GameSessionState, GameSessionAction } from './useGameSessionReducer';
import type { TimerState } from '../types';
import type { OfflineFirstStorageManager } from '../lib/storage/offlineFirstStorageManager';

interface UseOfflineGameTimerArgs {
  state: GameSessionState;
  dispatch: React.Dispatch<GameSessionAction>;
  currentGameId: string;
  storageManager: OfflineFirstStorageManager;
}

/**
 * Enhanced game timer hook with offline-first storage
 * Replaces localStorage with IndexedDB for timer state persistence
 */
export const useOfflineGameTimer = ({ 
  state, 
  dispatch, 
  currentGameId, 
  storageManager 
}: UseOfflineGameTimerArgs) => {
  const { syncWakeLock } = useWakeLock();

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
    // Remove timer state from IndexedDB
    if (currentGameId) {
      try {
        await storageManager.deleteTimerState(currentGameId);
      } catch (error) {
        console.warn('Failed to delete timer state:', error);
      }
    }
    dispatch({ type: 'RESET_TIMER_ONLY' });
  }, [dispatch, storageManager, currentGameId]);

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

  // Main timer effect - enhanced with IndexedDB persistence
  useEffect(() => {
    syncWakeLock(state.isTimerRunning);

    const startInterval = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        const s = stateRef.current;
        const periodEnd = s.currentPeriod * s.periodDurationMinutes * 60;
        const nextTime = Math.round(s.timeElapsedInSeconds) + 1;

        // Save timer state to IndexedDB asynchronously without blocking the interval
        if (currentGameId) {
          const timerState: TimerState = {
            gameId: currentGameId,
            timeElapsedInSeconds: nextTime,
            timestamp: Date.now(),
          };
          
          storageManager.saveTimerState(timerState).catch((error) => {
            console.warn('Failed to save timer state:', error);
          });
        }

        if (nextTime >= periodEnd) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          
          // Remove timer state when period/game ends (async without blocking)
          if (currentGameId) {
            storageManager.deleteTimerState(currentGameId).catch((error) => {
              console.warn('Failed to delete timer state on period end:', error);
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
    storageManager
  ]);

  // Enhanced visibility change handling with IndexedDB
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Save timer state when page becomes hidden
        if (state.isTimerRunning && currentGameId) {
          const timerState: TimerState = {
            gameId: currentGameId,
            timeElapsedInSeconds: state.timeElapsedInSeconds,
            timestamp: Date.now(),
          };
          
          try {
            await storageManager.saveTimerState(timerState);
            dispatch({ type: 'PAUSE_TIMER_FOR_HIDDEN' });
          } catch (error) {
            console.warn('Failed to save timer state on visibility change:', error);
          }
        }
      } else {
        // Restore timer state when page becomes visible
        if (currentGameId) {
          try {
            const savedTimerState = await storageManager.getTimerState(currentGameId);
            
            if (savedTimerState && savedTimerState.gameId === currentGameId) {
              dispatch({
                type: 'RESTORE_TIMER_STATE',
                payload: {
                  savedTime: savedTimerState.timeElapsedInSeconds,
                  timestamp: savedTimerState.timestamp,
                },
              });
            }
          } catch (error) {
            console.warn('Failed to restore timer state on visibility change:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isTimerRunning, state.timeElapsedInSeconds, currentGameId, dispatch, storageManager]);

  // Migration utility - check for old localStorage timer state and migrate
  useEffect(() => {
    const migrateLegacyTimerState = async () => {
      // Check if there's old localStorage timer state to migrate
      try {
        const legacyTimerState = localStorage.getItem('soccerTimerState');
        if (legacyTimerState && currentGameId) {
          const parsedState = JSON.parse(legacyTimerState);
          
          // Convert to new format and save to IndexedDB
          const timerState: TimerState = {
            gameId: currentGameId,
            timeElapsedInSeconds: parsedState.timeElapsedInSeconds || 0,
            timestamp: parsedState.timestamp || Date.now(),
          };
          
          await storageManager.saveTimerState(timerState);
          
          // Remove from localStorage after successful migration
          localStorage.removeItem('soccerTimerState');
          
          console.log('✅ Migrated legacy timer state to IndexedDB');
        }
      } catch (error) {
        console.warn('Failed to migrate legacy timer state:', error);
      }
    };

    if (currentGameId) {
      migrateLegacyTimerState();
    }
  }, [currentGameId, storageManager]);

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