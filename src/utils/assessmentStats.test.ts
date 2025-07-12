import { calculatePlayerAssessmentAverages, calculateTeamAssessmentAverages, getPlayerAssessmentTrends, getPlayerAssessmentNotes } from './assessmentStats';
import type { SavedGamesCollection, AppState, PlayerAssessment } from '@/types';

const baseGame: AppState = {
  playersOnField: [],
  opponents: [],
  drawings: [],
  availablePlayers: [],
  showPlayerNames: true,
  teamName: 'Team',
  gameEvents: [],
  opponentName: 'Opp',
  gameDate: '2025-01-01',
  homeScore: 0,
  awayScore: 0,
  gameNotes: '',
  homeOrAway: 'home',
  numberOfPeriods: 2,
  periodDurationMinutes: 10,
  currentPeriod: 1,
  gameStatus: 'notStarted',
  selectedPlayerIds: [],
  assessments: {},
  seasonId: '',
  tournamentId: '',
  gameLocation: '',
  gameTime: '',
  subIntervalMinutes: 5,
  completedIntervalDurations: [],
  lastSubConfirmationTimeSeconds: 0,
  tacticalDiscs: [],
  tacticalDrawings: [],
  tacticalBallPosition: { relX: 0, relY: 0 },
};

const sampleAssessment = (val: number): PlayerAssessment => ({
  overall: val,
  sliders: {
    intensity: val,
    courage: val,
    duels: val,
    technique: val,
    creativity: val,
    decisions: val,
    awareness: val,
    teamwork: val,
    fair_play: val,
    impact: val,
  },
  notes: '',
  minutesPlayed: 90,
  createdAt: 0,
  createdBy: 'me',
});

describe('assessmentStats', () => {
  it('returns null when no assessments exist for player', () => {
    const games: SavedGamesCollection = { g1: { ...baseGame } };
    expect(calculatePlayerAssessmentAverages('p1', games)).toBeNull();
  });

  it('calculates player averages across games', () => {
    const games: SavedGamesCollection = {
      g1: { ...baseGame, assessments: { p1: sampleAssessment(4) } },
      g2: { ...baseGame, assessments: { p1: sampleAssessment(2) } },
    };
    const result = calculatePlayerAssessmentAverages('p1', games);
    expect(result?.count).toBe(2);
    expect(result?.averages.intensity).toBe(3);
    expect(result?.averages.impact).toBe(3);
    expect(result?.overall).toBe(3);
  });

  it('computes team averages across games', () => {
    const games: SavedGamesCollection = {
      g1: {
        ...baseGame,
        assessments: { p1: sampleAssessment(4), p2: sampleAssessment(2) },
      },
      g2: {
        ...baseGame,
        assessments: { p1: sampleAssessment(3) },
      },
    };
    const result = calculateTeamAssessmentAverages(games);
    // For g1: average per metric = (4 + 2)/2 = 3
    // For g2: average = 3
    // Overall average across games = (3 + 3)/2 = 3
    expect(result?.count).toBe(2);
    expect(result?.averages.intensity).toBe(3);
    expect(result?.averages.fair_play).toBe(3);
    expect(result?.overall).toBe(3);
  });

  it('provides trend data', () => {
    const games: SavedGamesCollection = {
      g1: { ...baseGame, gameDate: '2024-01-01', assessments: { p1: sampleAssessment(4) } },
      g2: { ...baseGame, gameDate: '2024-02-01', assessments: { p1: sampleAssessment(2) } },
    };
    const trends = getPlayerAssessmentTrends('p1', games);
    expect(trends.intensity.length).toBe(2);
    expect(trends.intensity[0].value).toBe(4);
    expect(trends.intensity[1].value).toBe(2);
  });

  it('collects notes', () => {
    const games: SavedGamesCollection = {
      g1: { ...baseGame, gameDate: '2024-01-01', assessments: { p1: { ...sampleAssessment(4), notes: 'good' } } },
      g2: { ...baseGame, gameDate: '2024-02-01', assessments: { p1: sampleAssessment(2) } },
    };
    const notes = getPlayerAssessmentNotes('p1', games);
    expect(notes[0].notes).toBe('good');
  });

  it('weights averages using demand factor when enabled', () => {
    const games: SavedGamesCollection = {
      g1: { ...baseGame, demandFactor: 1, assessments: { p1: sampleAssessment(4) } },
      g2: { ...baseGame, demandFactor: 0.5, assessments: { p1: sampleAssessment(2) } },
    };
    const result = calculatePlayerAssessmentAverages('p1', games, true);
    const divisor = 1 + 0.5;
    const expected = (4 * 1 + 2 * 0.5) / divisor;
    expect(result?.overall).toBeCloseTo(expected);
  });

  it('calculates finalScore for a single game', () => {
    const assessment: PlayerAssessment = {
      ...sampleAssessment(0),
      overall: 5,
      sliders: {
        intensity: 4,
        courage: 6,
        duels: 2,
        technique: 3,
        creativity: 5,
        decisions: 4,
        awareness: 5,
        teamwork: 6,
        fair_play: 5,
        impact: 4,
      },
    };
    const games: SavedGamesCollection = { g1: { ...baseGame, assessments: { p1: assessment } } };
    const result = calculatePlayerAssessmentAverages('p1', games);
    expect(result?.finalScore).toBeCloseTo(4.4);
  });

  it('weights finalScore using demand factor', () => {
    const games: SavedGamesCollection = {
      g1: { ...baseGame, demandFactor: 2, assessments: { p1: sampleAssessment(4) } },
      g2: { ...baseGame, demandFactor: 1, assessments: { p1: sampleAssessment(6) } },
    };
    const result = calculatePlayerAssessmentAverages('p1', games, true);
    const divisor = 2 + 1;
    const expected = (4 * 2 + 6 * 1) / divisor;
    expect(result?.finalScore).toBeCloseTo(expected);
  });
});
