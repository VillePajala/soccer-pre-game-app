import { DEFAULT_GAME_ID } from '@/config/constants';
import {
  SEASONS_LIST_KEY,
  TOURNAMENTS_LIST_KEY,
  SAVED_GAMES_KEY,
  APP_SETTINGS_KEY,
  MASTER_ROSTER_KEY,
  LAST_HOME_TEAM_NAME_KEY,
  TIMER_STATE_KEY,
} from '@/config/storageKeys';
import type {
  Point,
  GameEvent,
  AppState,
  TacticalDisc,
  SavedGamesCollection,
  TimerState,
} from '@/types';

// Dummy variable to ensure type imports are used
const _dummy: {
  point?: Point;
  event?: GameEvent;
  state?: AppState;
  disc?: TacticalDisc;
  collection?: SavedGamesCollection;
  timer?: TimerState;
} = {};

describe('module resolution', () => {
  it('resolves constants and types', () => {
    expect(typeof DEFAULT_GAME_ID).toBe('string');
    const allKeys = [
      SEASONS_LIST_KEY,
      TOURNAMENTS_LIST_KEY,
      SAVED_GAMES_KEY,
      APP_SETTINGS_KEY,
      MASTER_ROSTER_KEY,
      LAST_HOME_TEAM_NAME_KEY,
      TIMER_STATE_KEY,
    ];
    allKeys.forEach((k) => expect(typeof k).toBe('string'));
    expect(_dummy).toBeDefined();
  });
});
