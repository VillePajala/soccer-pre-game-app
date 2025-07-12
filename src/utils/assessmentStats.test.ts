import { calculatePlayerAssessmentAverages, calculateTeamAssessmentAverages } from './assessmentStats';
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
});
