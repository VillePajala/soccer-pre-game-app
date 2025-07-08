import { useEffect, useCallback, useRef } from 'react';
import { TIMER_STATE_KEY } from '@/config/storageKeys';
import {
  removeLocalStorageItem,
  setLocalStorageItem,
  getLocalStorageItem,
} from '@/utils/localStorage';
import { useWakeLock } from './useWakeLock';
import { GameSessionState, GameSessionAction } from './useGameSessionReducer';

interface UseGameTimerArgs {
  state: GameSessionState;
  dispatch: React.Dispatch<GameSessionAction>;
  currentGameId: string;
}

export const useGameTimer = ({ state, dispatch, currentGameId }: UseGameTimerArgs) => {
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

  const reset = useCallback(() => {
    removeLocalStorageItem(TIMER_STATE_KEY);
    dispatch({ type: 'RESET_TIMER_ONLY' });
  }, [dispatch]);

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

  useEffect(() => {
    syncWakeLock(state.isTimerRunning);

    const startInterval = () => {
      if (intervalRef.current) return;
      intervalRef.current = setInterval(() => {
        const s = stateRef.current;
        const periodEnd = s.currentPeriod * s.periodDurationMinutes * 60;
        const nextTime = Math.round(s.timeElapsedInSeconds) + 1;

        if (currentGameId) {
          const timerState = {
            gameId: currentGameId,
            timeElapsedInSeconds: nextTime,
            timestamp: Date.now(),
          };
          setLocalStorageItem(TIMER_STATE_KEY, JSON.stringify(timerState));
        }

        if (nextTime >= periodEnd) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          removeLocalStorageItem(TIMER_STATE_KEY);
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
  }, [state.isTimerRunning, state.gameStatus, state.currentPeriod, state.periodDurationMinutes, state.numberOfPeriods, currentGameId, dispatch, syncWakeLock]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        if (state.isTimerRunning) {
          const timerState = {
            gameId: currentGameId || '',
            timeElapsedInSeconds: state.timeElapsedInSeconds,
            timestamp: Date.now(),
          };
          setLocalStorageItem(TIMER_STATE_KEY, JSON.stringify(timerState));
          dispatch({ type: 'PAUSE_TIMER_FOR_HIDDEN' });
        }
      } else {
        const savedTimerStateJSON = getLocalStorageItem(TIMER_STATE_KEY);
        if (savedTimerStateJSON) {
          const savedTimerState = JSON.parse(savedTimerStateJSON);
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
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isTimerRunning, state.timeElapsedInSeconds, currentGameId, dispatch]);

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
