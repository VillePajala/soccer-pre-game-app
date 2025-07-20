import { migrateSavedGamesIsPlayed } from './migrateSavedGames';
import { getSavedGames, saveGames } from './savedGames';
import type { SavedGamesCollection, AppState } from '@/types';

jest.mock('./savedGames');
const mockedGetSavedGames = getSavedGames as jest.MockedFunction<typeof getSavedGames>;
const mockedSaveGames = saveGames as jest.MockedFunction<typeof saveGames>;

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

describe('migrateSavedGamesIsPlayed', () => {
  beforeEach(() => {
    mockedGetSavedGames.mockReset();
    mockedSaveGames.mockReset();
  });

  it('adds isPlayed true to games missing the field', async () => {
    const games: SavedGamesCollection = {
      g1: { ...baseGame },
      g2: { ...baseGame, isPlayed: false },
    };
    mockedGetSavedGames.mockResolvedValue(games);
    mockedSaveGames.mockResolvedValue();

    const updated = await migrateSavedGamesIsPlayed();
    expect(updated).toBe(1);
    expect(games.g1.isPlayed).toBe(true);
    expect(games.g2.isPlayed).toBe(false);
    expect(mockedSaveGames).toHaveBeenCalledWith(games);
  });

  it('does nothing when all games have the field', async () => {
    const games: SavedGamesCollection = {
      g1: { ...baseGame, isPlayed: true },
    };
    mockedGetSavedGames.mockResolvedValue(games);

    const updated = await migrateSavedGamesIsPlayed();
    expect(updated).toBe(0);
    expect(mockedSaveGames).not.toHaveBeenCalled();
  });
});
