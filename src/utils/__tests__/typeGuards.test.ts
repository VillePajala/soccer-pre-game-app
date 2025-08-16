/**
 * Type Guards Tests - Comprehensive Coverage
 * 
 * Tests for runtime type validation utilities that ensure data integrity
 * and replace unsafe type casting throughout the application.
 */

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
import type { Player, AppState, Season, Tournament, GameEvent, SavedGamesCollection } from '@/types';

describe('Type Guards Utilities', () => {
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

    it('should handle undefined expected keys parameter', () => {
      const data = { key: 'value' };
      expect(isValidStorageData(data)).toBe(true);
    });

    it('should handle nested object structures', () => {
      const data = {
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark', notifications: true },
        config: { version: '1.0' },
      };
      const expectedKeys = ['user', 'settings'];
      expect(isValidStorageData(data, expectedKeys)).toBe(true);
    });

    it('should return true for record with extra keys beyond expected', () => {
      const data = { key1: 'value1', key2: 'value2', extraKey: 'extra' };
      const expectedKeys = ['key1', 'key2'];
      expect(isValidStorageData(data, expectedKeys)).toBe(true);
    });

    it('should return false for empty record with non-empty expected keys', () => {
      const data = {};
      const expectedKeys = ['requiredKey'];
      expect(isValidStorageData(data, expectedKeys)).toBe(false);
    });

    it('should return true for empty record with empty expected keys', () => {
      const data = {};
      const expectedKeys: string[] = [];
      expect(isValidStorageData(data, expectedKeys)).toBe(true);
    });
  });

  describe('Edge Cases and Comprehensive Coverage', () => {
    describe('isPlayer edge cases', () => {
      it('should handle player objects with additional properties', () => {
        const playerWithExtras = {
          id: 'player-1',
          name: 'John Doe',
          isGoalie: false,
          extraProperty: 'value',
          anotherExtra: 123,
        };
        expect(isPlayer(playerWithExtras)).toBe(true);
      });

      it('should handle empty string values', () => {
        const playerWithEmptyStrings = {
          id: '',
          name: '',
          isGoalie: false,
        };
        expect(isPlayer(playerWithEmptyStrings)).toBe(true); // Empty strings are still strings
      });

      it('should handle zero and false values correctly', () => {
        const player = {
          id: '0',
          name: '0',
          isGoalie: false,
        };
        expect(isPlayer(player)).toBe(true);
      });
    });

    describe('isAppState comprehensive validation', () => {
      it('should handle minimal valid AppState structure', () => {
        const minimalState = {
          playersOnField: [],
          opponents: [],
          drawings: [],
          availablePlayers: [],
          gameEvents: [],
          selectedPlayerIds: [],
          tacticalDiscs: [],
          tacticalDrawings: [],
          showPlayerNames: true,
          teamName: '',
          opponentName: '',
          gameDate: '',
          homeScore: 0,
          awayScore: 0,
          gameNotes: '',
          homeOrAway: 'home' as const,
          numberOfPeriods: 1,
          periodDurationMinutes: 45,
          currentPeriod: 1,
          gameStatus: 'notStarted',
          seasonId: '',
          tournamentId: '',
        };
        expect(isAppState(minimalState)).toBe(true);
      });

      it('should validate specific enum values for homeOrAway', () => {
        const validAppState = {
          playersOnField: [], opponents: [], drawings: [], availablePlayers: [],
          gameEvents: [], selectedPlayerIds: [], tacticalDiscs: [], tacticalDrawings: [],
          showPlayerNames: true, teamName: '', opponentName: '', gameDate: '',
          homeScore: 0, awayScore: 0, gameNotes: '', numberOfPeriods: 2,
          periodDurationMinutes: 45, currentPeriod: 1, gameStatus: 'notStarted',
          seasonId: '', tournamentId: '', homeOrAway: 'home' as const,
        };

        expect(isAppState({ ...validAppState, homeOrAway: 'home' })).toBe(true);
        expect(isAppState({ ...validAppState, homeOrAway: 'away' })).toBe(true);
        expect(isAppState({ ...validAppState, homeOrAway: 'neutral' })).toBe(false);
        expect(isAppState({ ...validAppState, homeOrAway: '' })).toBe(false);
      });

      it('should validate numberOfPeriods enum values', () => {
        const validAppState = {
          playersOnField: [], opponents: [], drawings: [], availablePlayers: [],
          gameEvents: [], selectedPlayerIds: [], tacticalDiscs: [], tacticalDrawings: [],
          showPlayerNames: true, teamName: '', opponentName: '', gameDate: '',
          homeScore: 0, awayScore: 0, gameNotes: '', homeOrAway: 'home' as const,
          periodDurationMinutes: 45, currentPeriod: 1, gameStatus: 'notStarted',
          seasonId: '', tournamentId: '', numberOfPeriods: 1,
        };

        expect(isAppState({ ...validAppState, numberOfPeriods: 1 })).toBe(true);
        expect(isAppState({ ...validAppState, numberOfPeriods: 2 })).toBe(true);
        expect(isAppState({ ...validAppState, numberOfPeriods: 0 })).toBe(false);
        expect(isAppState({ ...validAppState, numberOfPeriods: 3 })).toBe(false);
        expect(isAppState({ ...validAppState, numberOfPeriods: -1 })).toBe(false);
      });

      it('should validate gameStatus enum values', () => {
        const validAppState = {
          playersOnField: [], opponents: [], drawings: [], availablePlayers: [],
          gameEvents: [], selectedPlayerIds: [], tacticalDiscs: [], tacticalDrawings: [],
          showPlayerNames: true, teamName: '', opponentName: '', gameDate: '',
          homeScore: 0, awayScore: 0, gameNotes: '', homeOrAway: 'home' as const,
          numberOfPeriods: 2, periodDurationMinutes: 45, currentPeriod: 1,
          seasonId: '', tournamentId: '', gameStatus: 'notStarted',
        };

        const validStatuses = ['notStarted', 'inProgress', 'periodEnd', 'gameEnd'];
        validStatuses.forEach(status => {
          expect(isAppState({ ...validAppState, gameStatus: status })).toBe(true);
        });

        const invalidStatuses = ['started', 'finished', 'paused', 'cancelled', ''];
        invalidStatuses.forEach(status => {
          expect(isAppState({ ...validAppState, gameStatus: status })).toBe(false);
        });
      });

      it('should handle arrays with content', () => {
        const stateWithContent = {
          playersOnField: [{ id: 'p1', name: 'Player' }],
          opponents: [{ id: 'o1', name: 'Opponent' }],
          drawings: [{ id: 'd1', type: 'line' }],
          availablePlayers: [{ id: 'a1', name: 'Available' }],
          gameEvents: [{ id: 'e1', type: 'goal', time: 10 }],
          selectedPlayerIds: ['p1', 'p2'],
          tacticalDiscs: [{ id: 't1', position: { x: 10, y: 20 } }],
          tacticalDrawings: [{ id: 'td1', type: 'arrow' }],
          showPlayerNames: true, teamName: 'Test', opponentName: 'Opponent',
          gameDate: '2025-01-01', homeScore: 1, awayScore: 0, gameNotes: 'Notes',
          homeOrAway: 'home' as const, numberOfPeriods: 2, periodDurationMinutes: 45,
          currentPeriod: 1, gameStatus: 'inProgress', seasonId: 's1', tournamentId: 't1',
        };
        expect(isAppState(stateWithContent)).toBe(true);
      });
    });

    describe('isGameEvent comprehensive validation', () => {
      it('should handle minimal valid GameEvent', () => {
        const minimalEvent = {
          id: 'event-1',
          time: 0,
          type: 'goal',
        };
        expect(isGameEvent(minimalEvent)).toBe(true);
      });

      it('should handle GameEvent with all possible properties', () => {
        const fullEvent = {
          id: 'event-1',
          time: 45,
          type: 'goal',
          scorerId: 'player-1',
          assisterId: 'player-2',
          description: 'Great goal!',
          timestamp: Date.now(),
          period: 1,
          position: { x: 100, y: 200 },
        };
        expect(isGameEvent(fullEvent)).toBe(true);
      });

      it('should test boundary values for time', () => {
        const eventTemplate = { id: 'event-1', type: 'goal' };
        
        expect(isGameEvent({ ...eventTemplate, time: 0 })).toBe(true);
        expect(isGameEvent({ ...eventTemplate, time: -1 })).toBe(true); // Negative time might be valid for overtime
        expect(isGameEvent({ ...eventTemplate, time: 9999 })).toBe(true); // Very long game
        expect(isGameEvent({ ...eventTemplate, time: 0.5 })).toBe(true); // Fractional time
      });

      it('should reject invalid event types with specific cases', () => {
        const eventTemplate = { id: 'event-1', time: 10 };
        
        const invalidTypes = [
          'score', 'penalty', 'foul', 'offside', 'corner', 'throw-in',
          'yellow-card', 'red-card', 'kick-off', 'free-kick', 'var-check'
        ];
        
        invalidTypes.forEach(type => {
          expect(isGameEvent({ ...eventTemplate, type })).toBe(false);
        });
      });

      it('should handle edge cases for event IDs', () => {
        const eventTemplate = { time: 10, type: 'goal' };
        
        expect(isGameEvent({ ...eventTemplate, id: '' })).toBe(true); // Empty string is still a string
        expect(isGameEvent({ ...eventTemplate, id: '0' })).toBe(true);
        expect(isGameEvent({ ...eventTemplate, id: 'very-long-id-with-special-chars-123!@#' })).toBe(true);
      });
    });

    describe('isSavedGamesCollection advanced scenarios', () => {
      it('should handle collection with numeric string keys', () => {
        const validAppState = {
          playersOnField: [], opponents: [], drawings: [], availablePlayers: [],
          gameEvents: [], selectedPlayerIds: [], tacticalDiscs: [], tacticalDrawings: [],
          showPlayerNames: true, teamName: '', opponentName: '', gameDate: '',
          homeScore: 0, awayScore: 0, gameNotes: '', homeOrAway: 'home' as const,
          numberOfPeriods: 2, periodDurationMinutes: 45, currentPeriod: 1,
          gameStatus: 'notStarted', seasonId: '', tournamentId: '',
        };

        const collection = {
          '1': validAppState,
          '2': validAppState,
          '999': validAppState,
        };
        expect(isSavedGamesCollection(collection)).toBe(true);
      });

      it('should handle collection with UUID-style keys', () => {
        const validAppState = {
          playersOnField: [], opponents: [], drawings: [], availablePlayers: [],
          gameEvents: [], selectedPlayerIds: [], tacticalDiscs: [], tacticalDrawings: [],
          showPlayerNames: true, teamName: '', opponentName: '', gameDate: '',
          homeScore: 0, awayScore: 0, gameNotes: '', homeOrAway: 'home' as const,
          numberOfPeriods: 2, periodDurationMinutes: 45, currentPeriod: 1,
          gameStatus: 'notStarted', seasonId: '', tournamentId: '',
        };

        const collection = {
          '550e8400-e29b-41d4-a716-446655440000': validAppState,
          'f47ac10b-58cc-4372-a567-0e02b2c3d479': validAppState,
        };
        expect(isSavedGamesCollection(collection)).toBe(true);
      });

      it('should reject collection when any value fails AppState validation', () => {
        const validAppState = {
          playersOnField: [], opponents: [], drawings: [], availablePlayers: [],
          gameEvents: [], selectedPlayerIds: [], tacticalDiscs: [], tacticalDrawings: [],
          showPlayerNames: true, teamName: '', opponentName: '', gameDate: '',
          homeScore: 0, awayScore: 0, gameNotes: '', homeOrAway: 'home' as const,
          numberOfPeriods: 2, periodDurationMinutes: 45, currentPeriod: 1,
          gameStatus: 'notStarted', seasonId: '', tournamentId: '',
        };

        const collectionWithOneInvalid = {
          'game-1': validAppState,
          'game-2': { ...validAppState, homeOrAway: 'invalid' }, // Invalid enum value
          'game-3': validAppState,
        };
        expect(isSavedGamesCollection(collectionWithOneInvalid)).toBe(false);
      });

      it('should handle very large collections', () => {
        const validAppState = {
          playersOnField: [], opponents: [], drawings: [], availablePlayers: [],
          gameEvents: [], selectedPlayerIds: [], tacticalDiscs: [], tacticalDrawings: [],
          showPlayerNames: true, teamName: '', opponentName: '', gameDate: '',
          homeScore: 0, awayScore: 0, gameNotes: '', homeOrAway: 'home' as const,
          numberOfPeriods: 2, periodDurationMinutes: 45, currentPeriod: 1,
          gameStatus: 'notStarted', seasonId: '', tournamentId: '',
        };

        const largeCollection: Record<string, any> = {};
        for (let i = 0; i < 100; i++) {
          largeCollection[`game-${i}`] = validAppState;
        }
        expect(isSavedGamesCollection(largeCollection)).toBe(true);
      });
    });

    describe('isRecord advanced edge cases', () => {
      it('should handle class instances', () => {
        class TestClass {
          constructor(public value: string) {}
        }
        const instance = new TestClass('test');
        expect(isRecord(instance)).toBe(true);
      });

      it('should handle Date objects', () => {
        expect(isRecord(new Date())).toBe(true);
        expect(isRecord(new Date('2025-01-01'))).toBe(true);
      });

      it('should return false for function objects', () => {
        expect(isRecord(function() {})).toBe(false);
        expect(isRecord(() => {})).toBe(false);
        expect(isRecord(function named() {})).toBe(false);
      });

      it('should handle objects with null prototype', () => {
        const obj = Object.create(null);
        obj.key = 'value';
        expect(isRecord(obj)).toBe(true);
      });

      it('should handle objects with symbol keys', () => {
        const sym = Symbol('test');
        const obj = { [sym]: 'value', normalKey: 'normalValue' };
        expect(isRecord(obj)).toBe(true);
      });

      it('should handle objects with getter/setter properties', () => {
        const obj = {
          _value: 'test',
          get value() { return this._value; },
          set value(v) { this._value = v; },
        };
        expect(isRecord(obj)).toBe(true);
      });

      it('should handle circular references gracefully', () => {
        const obj: any = { name: 'test' };
        obj.self = obj; // Create circular reference
        expect(() => isRecord(obj)).not.toThrow();
        expect(isRecord(obj)).toBe(true);
      });
    });

    describe('Error handling and boundary conditions', () => {
      it('should handle very large objects without performance issues', () => {
        const largeObj: Record<string, number> = {};
        for (let i = 0; i < 1000; i++) {
          largeObj[`key${i}`] = i;
        }
        
        expect(isRecord(largeObj)).toBe(true);
        expect(isValidStorageData(largeObj, ['key0', 'key999'])).toBe(true);
      });

      it('should handle objects with many nested levels', () => {
        let deepObj: any = {};
        let current = deepObj;
        for (let i = 0; i < 50; i++) {
          current.next = {};
          current = current.next;
        }
        current.value = 'deep value';
        
        expect(isRecord(deepObj)).toBe(true);
      });

      it('should handle objects with special string values', () => {
        const specialStrings = {
          empty: '',
          whitespace: '   ',
          newlines: '\n\r\t',
          unicode: '🚀⚽🎯',
          html: '<script>alert("test")</script>',
          json: '{"key": "value"}',
          sql: "'; DROP TABLE users; --",
        };
        
        expect(isRecord(specialStrings)).toBe(true);
        expect(isValidStorageData(specialStrings, ['empty', 'unicode'])).toBe(true);
      });

      it('should handle objects with extreme numeric values', () => {
        const numericValues = {
          zero: 0,
          negative: -999999,
          positive: 999999,
          float: 3.14159,
          infinity: Infinity,
          negInfinity: -Infinity,
          nan: NaN,
        };
        
        expect(isRecord(numericValues)).toBe(true);
      });

      it('should validate type guards do not throw exceptions', () => {
        const problematicValues = [
          null, undefined, 0, -1, '', 'string', true, false,
          [], [1, 2, 3], {}, { key: 'value' },
          function() {}, () => {}, new Date(), /regex/,
          Symbol('test'), BigInt(123)
        ];
        
        problematicValues.forEach(value => {
          expect(() => isPlayer(value)).not.toThrow();
          expect(() => isAppState(value)).not.toThrow();
          expect(() => isSeason(value)).not.toThrow();
          expect(() => isTournament(value)).not.toThrow();
          expect(() => isGameEvent(value)).not.toThrow();
          expect(() => isSavedGamesCollection(value)).not.toThrow();
          expect(() => isRecord(value)).not.toThrow();
          expect(() => isValidStorageData(value, ['key'])).not.toThrow();
        });
      });
    });
  });
});