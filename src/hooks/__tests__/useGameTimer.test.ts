import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useGameTimer } from '../useGameTimer';
import { GameSessionState, gameSessionReducer } from '../useGameSessionReducer';

test('startPause toggles running state', () => {
  const initialState: GameSessionState = {
    teamName: '', opponentName: '', gameDate: '', homeScore: 0, awayScore: 0,
    gameNotes: '', homeOrAway: 'home', numberOfPeriods: 2, periodDurationMinutes: 1,
    currentPeriod: 1, gameStatus: 'notStarted', selectedPlayerIds: [], seasonId: '',
    tournamentId: '', gameLocation: '', gameTime: '', gameEvents: [],
    timeElapsedInSeconds: 0, startTimestamp: null, isTimerRunning: false,
    subIntervalMinutes: 1, nextSubDueTimeSeconds: 60, subAlertLevel: 'none',
    lastSubConfirmationTimeSeconds: 0, completedIntervalDurations: [], showPlayerNames: true
  };

  const { result } = renderHook(() => {
    const [state, dispatch] = React.useReducer(gameSessionReducer, initialState);
    return useGameTimer({ state, dispatch, currentGameId: 'game1' });
  });

  expect(result.current.isTimerRunning).toBe(false);
  act(() => {
    result.current.startPause();
  });
  expect(result.current.isTimerRunning).toBe(true);
});
