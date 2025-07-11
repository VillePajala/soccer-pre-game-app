import { getPlayerAssessments, savePlayerAssessment } from './playerAssessments';
import { getGame, saveGame } from './savedGames';
import type { PlayerAssessment, AppState } from '@/types';

jest.mock('./savedGames');
const mockedGetGame = getGame as jest.MockedFunction<typeof getGame>;
const mockedSaveGame = saveGame as jest.MockedFunction<typeof saveGame>;

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

describe('playerAssessments utils', () => {
  beforeEach(() => {
    mockedGetGame.mockReset();
    mockedSaveGame.mockReset();
  });

  it('returns assessments for a game', async () => {
    const game = { ...baseGame, assessments: { p1: { overall: 5, sliders: { intensity: 5, courage: 5, duels: 5, technique: 5, creativity: 5, decisions: 5, awareness: 5, teamwork: 5, fair_play: 5, impact: 5 }, notes: '', minutesPlayed: 90, createdAt: 0, createdBy: 'me' } } };
    mockedGetGame.mockResolvedValue(game);
    await expect(getPlayerAssessments('game1')).resolves.toEqual(game.assessments);
  });

  it('saves assessment and returns updated game', async () => {
    const game = { ...baseGame };
    mockedGetGame.mockResolvedValue(game);
    mockedSaveGame.mockResolvedValue({ ...game, assessments: { p1: {} as PlayerAssessment } });
    const assessment: PlayerAssessment = { overall: 4, sliders: { intensity: 4, courage: 4, duels: 4, technique: 4, creativity: 4, decisions: 4, awareness: 4, teamwork: 4, fair_play: 4, impact: 4 }, notes: 'good', minutesPlayed: 45, createdAt: 1, createdBy: 'me' };
    const result = await savePlayerAssessment('game1', 'p1', assessment);
    expect(mockedSaveGame).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });
});
