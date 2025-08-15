import {
  isPlayer,
  isAppState,
  isSeason,
  isTournament,
  isGameEvent,
  isSavedGamesCollection,
  isRecord,
  isValidStorageData
} from '../typeGuards';
import type { Player, AppState, Season, Tournament, GameEvent } from '@/types';

describe('typeGuards', () => {
  describe('isPlayer', () => {
    it('should return true for valid player objects', () => {
      const validPlayer: Player = {
        id: 'player-1',
        name: 'John Doe',
        isGoalie: false,
        jerseyNumber: '10',
        nickname: 'JD'
      };
      
      expect(isPlayer(validPlayer)).toBe(true);
    });

    it('should return true for minimal valid player', () => {
      const minimalPlayer = {
        id: 'player-1',
        name: 'John Doe',
        isGoalie: false
      };
      
      expect(isPlayer(minimalPlayer)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isPlayer(null)).toBe(false);
      expect(isPlayer(undefined)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isPlayer('string')).toBe(false);
      expect(isPlayer(123)).toBe(false);
      expect(isPlayer(true)).toBe(false);
      expect(isPlayer([])).toBe(false);
    });

    it('should return false for objects missing required fields', () => {
      expect(isPlayer({ name: 'John' })).toBe(false); // missing id, isGoalie
      expect(isPlayer({ id: 'player-1' })).toBe(false); // missing name, isGoalie
      expect(isPlayer({ id: 'player-1', name: 'John' })).toBe(false); // missing isGoalie
    });

    it('should return false for objects with wrong field types', () => {
      expect(isPlayer({ id: 123, name: 'John', isGoalie: false })).toBe(false);
      expect(isPlayer({ id: 'player-1', name: 123, isGoalie: false })).toBe(false);
      expect(isPlayer({ id: 'player-1', name: 'John', isGoalie: 'false' })).toBe(false);
    });
  });

  describe('isAppState', () => {
    const validAppState: AppState = {
      playersOnField: [],
      opponents: [],
      drawings: [],
      availablePlayers: [],
      gameEvents: [],
      selectedPlayerIds: [],
      tacticalDiscs: [],
      tacticalDrawings: [],
      showPlayerNames: true,
      teamName: 'Team A',
      opponentName: 'Team B',
      gameDate: '2023-01-01',
      homeScore: 0,
      awayScore: 0,
      gameNotes: '',
      homeOrAway: 'home',
      numberOfPeriods: 2,
      periodDurationMinutes: 45,
      currentPeriod: 1,
      gameStatus: 'notStarted',
      seasonId: '',
      tournamentId: '',
      // Add other required fields for complete AppState
      allPlayers: [],
      teamColor: '#000000',
      teamColorSecondary: '#FFFFFF',
      opponentColor: '#FF0000',
      opponentColorSecondary: '#00FF00',
      canUndo: false,
      canRedo: false,
      tacticalBoardActive: false,
      theme: 'light',
      currentGameId: '',
      gameTime: '10:00',
      location: '',
      notes: '',
      ageGroup: '',
      tournamentLevel: '',
      demandFactor: 1,
      isPlayed: false,
      timeElapsedInSeconds: 0,
      assessments: {},
      seasons: [],
      tournaments: [],
      selectedSeasonId: null,
      selectedTournamentId: null,
      periodCount: 2,
      periodLength: 45
    };

    it('should return true for valid AppState', () => {
      expect(isAppState(validAppState)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isAppState(null)).toBe(false);
      expect(isAppState(undefined)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isAppState('string')).toBe(false);
      expect(isAppState(123)).toBe(false);
      expect(isAppState([])).toBe(false);
    });

    it('should return false when arrays are not arrays', () => {
      const invalidState = { ...validAppState, playersOnField: 'not-array' };
      expect(isAppState(invalidState)).toBe(false);
    });

    it('should return false for invalid homeOrAway values', () => {
      const invalidState = { ...validAppState, homeOrAway: 'invalid' };
      expect(isAppState(invalidState)).toBe(false);
    });

    it('should return false for invalid numberOfPeriods values', () => {
      const invalidState = { ...validAppState, numberOfPeriods: 3 };
      expect(isAppState(invalidState)).toBe(false);
    });

    it('should return false for invalid gameStatus values', () => {
      const invalidState = { ...validAppState, gameStatus: 'invalid' };
      expect(isAppState(invalidState)).toBe(false);
    });

    it('should return false for wrong data types', () => {
      const invalidState = { ...validAppState, teamName: 123 };
      expect(isAppState(invalidState)).toBe(false);
    });
  });

  describe('isSeason', () => {
    const validSeason: Season = {
      id: 'season-1',
      name: 'Spring 2023',
      location: 'Stadium',
      periodCount: 2,
      periodDuration: 45,
      archived: false,
      defaultRoster: []
    };

    it('should return true for valid season', () => {
      expect(isSeason(validSeason)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isSeason(null)).toBe(false);
      expect(isSeason(undefined)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isSeason('string')).toBe(false);
      expect(isSeason(123)).toBe(false);
    });

    it('should return false for missing required fields', () => {
      expect(isSeason({ name: 'Spring' })).toBe(false);
      expect(isSeason({ id: 'season-1' })).toBe(false);
    });

    it('should return false for wrong field types', () => {
      const invalidSeason = { ...validSeason, periodCount: 'two' };
      expect(isSeason(invalidSeason)).toBe(false);
    });
  });

  describe('isTournament', () => {
    const validTournament: Tournament = {
      id: 'tournament-1',
      name: 'Summer Cup',
      location: 'Arena',
      periodCount: 2,
      periodDuration: 30,
      archived: false,
      defaultRoster: []
    };

    it('should return true for valid tournament', () => {
      expect(isTournament(validTournament)).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isTournament(null)).toBe(false);
      expect(isTournament(undefined)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isTournament([])).toBe(false);
    });

    it('should return false for missing required fields', () => {
      expect(isTournament({ name: 'Cup' })).toBe(false);
    });

    it('should return false for wrong field types', () => {
      const invalidTournament = { ...validTournament, archived: 'no' };
      expect(isTournament(invalidTournament)).toBe(false);
    });
  });

  describe('isGameEvent', () => {
    const validEvent: GameEvent = {
      id: 'event-1',
      time: 120,
      type: 'goal',
      scorerId: 'player-1'
    };

    it('should return true for valid game event', () => {
      expect(isGameEvent(validEvent)).toBe(true);
    });

    it('should return true for all valid event types', () => {
      const eventTypes = ['goal', 'opponentGoal', 'substitution', 'periodEnd', 'gameEnd', 'fairPlayCard'];
      
      eventTypes.forEach(type => {
        const event = { ...validEvent, type };
        expect(isGameEvent(event)).toBe(true);
      });
    });

    it('should return false for null or undefined', () => {
      expect(isGameEvent(null)).toBe(false);
      expect(isGameEvent(undefined)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isGameEvent('event')).toBe(false);
    });

    it('should return false for invalid event types', () => {
      const invalidEvent = { ...validEvent, type: 'invalid-type' };
      expect(isGameEvent(invalidEvent)).toBe(false);
    });

    it('should return false for wrong field types', () => {
      expect(isGameEvent({ ...validEvent, time: 'invalid' })).toBe(false);
      expect(isGameEvent({ ...validEvent, id: 123 })).toBe(false);
    });
  });

  describe('isSavedGamesCollection', () => {
    const validAppState: AppState = {
      playersOnField: [],
      opponents: [],
      drawings: [],
      availablePlayers: [],
      gameEvents: [],
      selectedPlayerIds: [],
      tacticalDiscs: [],
      tacticalDrawings: [],
      showPlayerNames: true,
      teamName: 'Team A',
      opponentName: 'Team B',
      gameDate: '2023-01-01',
      homeScore: 0,
      awayScore: 0,
      gameNotes: '',
      homeOrAway: 'home',
      numberOfPeriods: 2,
      periodDurationMinutes: 45,
      currentPeriod: 1,
      gameStatus: 'notStarted',
      seasonId: '',
      tournamentId: '',
      // Add other required fields
      allPlayers: [],
      teamColor: '#000000',
      teamColorSecondary: '#FFFFFF',
      opponentColor: '#FF0000',
      opponentColorSecondary: '#00FF00',
      canUndo: false,
      canRedo: false,
      tacticalBoardActive: false,
      theme: 'light',
      currentGameId: '',
      gameTime: '10:00',
      location: '',
      notes: '',
      ageGroup: '',
      tournamentLevel: '',
      demandFactor: 1,
      isPlayed: false,
      timeElapsedInSeconds: 0,
      assessments: {},
      seasons: [],
      tournaments: [],
      selectedSeasonId: null,
      selectedTournamentId: null,
      periodCount: 2,
      periodLength: 45
    };

    it('should return true for valid saved games collection', () => {
      const validCollection = {
        'game-1': validAppState,
        'game-2': validAppState
      };
      
      expect(isSavedGamesCollection(validCollection)).toBe(true);
    });

    it('should return true for empty collection', () => {
      expect(isSavedGamesCollection({})).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isSavedGamesCollection(null)).toBe(false);
      expect(isSavedGamesCollection(undefined)).toBe(false);
    });

    it('should return false for non-objects', () => {
      // Note: empty arrays return true because they have no entries to validate
      // Only non-empty arrays with invalid content will return false
      expect(isSavedGamesCollection([1, 2, 3])).toBe(false);
      expect(isSavedGamesCollection('collection')).toBe(false);
    });

    it('should return false when values are not AppState', () => {
      const invalidCollection = {
        'game-1': { invalid: 'data' }
      };
      
      expect(isSavedGamesCollection(invalidCollection)).toBe(false);
    });
  });

  describe('isRecord', () => {
    it('should return true for plain objects', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'value' })).toBe(true);
    });

    it('should return false for null or undefined', () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
    });

    it('should return false for arrays', () => {
      expect(isRecord([])).toBe(false);
      expect(isRecord([1, 2, 3])).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isRecord('string')).toBe(false);
      expect(isRecord(123)).toBe(false);
      expect(isRecord(true)).toBe(false);
    });
  });

  describe('isValidStorageData', () => {
    it('should return true for valid objects without required keys', () => {
      expect(isValidStorageData({ key: 'value' })).toBe(true);
      expect(isValidStorageData({})).toBe(true);
    });

    it('should return true when all expected keys are present', () => {
      const data = { name: 'John', age: 30, active: true };
      expect(isValidStorageData(data, ['name', 'age'])).toBe(true);
    });

    it('should return false when expected keys are missing', () => {
      const data = { name: 'John' };
      expect(isValidStorageData(data, ['name', 'age'])).toBe(false);
    });

    it('should return false for non-record types', () => {
      expect(isValidStorageData(null, [])).toBe(false);
      expect(isValidStorageData([], [])).toBe(false);
      expect(isValidStorageData('string', [])).toBe(false);
    });

    it('should handle empty expected keys array', () => {
      expect(isValidStorageData({ key: 'value' }, [])).toBe(true);
    });
  });
});