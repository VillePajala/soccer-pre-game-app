import { calculatePlayerStats } from './playerStats';
import { Player, Season, Tournament, AppState, GameEvent } from '@/types';

describe('calculatePlayerStats', () => {
  const player: Player = { id: 'p1', name: 'John', nickname: 'John', color: '#fff', isGoalie: false };

  const seasons: Season[] = [{ id: 's1', name: 'Season 1' } as Season];
  const tournaments: Tournament[] = [{ id: 't1', name: 'Tourn 1' } as Tournament];

  const game1: AppState = {
    teamName: 'A', opponentName: 'B', gameDate: '2024-01-01', homeScore: 2, awayScore: 1,
    gameNotes: '', homeOrAway: 'home', numberOfPeriods: 2, periodDurationMinutes: 1,
    currentPeriod: 1, gameStatus: 'gameEnd', selectedPlayerIds: ['p1'], seasonId: 's1',
    tournamentId: '', gameLocation: '', gameTime: '',
    gameEvents: [{ id: 'g1', type: 'goal', time: 10, scorerId: 'p1' } as GameEvent],
    timeElapsedInSeconds: 0, startTimestamp: null,
    isTimerRunning: false, subIntervalMinutes: 1, nextSubDueTimeSeconds: 0,
    subAlertLevel: 'none', lastSubConfirmationTimeSeconds: 0,
    completedIntervalDurations: [], showPlayerNames: true,
    assessments: {},
  } as AppState;

  const game2: AppState = {
    teamName: 'A', opponentName: 'C', gameDate: '2024-02-01', homeScore: 0, awayScore: 1,
    gameNotes: '', homeOrAway: 'home', numberOfPeriods: 2, periodDurationMinutes: 1,
    currentPeriod: 1, gameStatus: 'gameEnd', selectedPlayerIds: ['p1'], seasonId: '',
    tournamentId: 't1', gameLocation: '', gameTime: '',
    gameEvents: [{ id: 'a1', type: 'goal', time: 20, scorerId: 'other', assisterId: 'p1' } as GameEvent],
    timeElapsedInSeconds: 0, startTimestamp: null,
    isTimerRunning: false, subIntervalMinutes: 1, nextSubDueTimeSeconds: 0,
    subAlertLevel: 'none', lastSubConfirmationTimeSeconds: 0,
    completedIntervalDurations: [], showPlayerNames: true,
    assessments: {},
  } as AppState;

  const savedGames = { g1: game1, g2: game2 };

  it('calculates totals correctly', () => {
    const stats = calculatePlayerStats(player, savedGames, seasons, tournaments);
    expect(stats.totalGames).toBe(2);
    expect(stats.totalGoals).toBe(1);
    expect(stats.totalAssists).toBe(1);
    expect(stats.avgGoalsPerGame).toBeCloseTo(0.5);
    expect(stats.performanceBySeason['s1'].gamesPlayed).toBe(1);
    expect(stats.performanceByTournament['t1'].gamesPlayed).toBe(1);
  });
});
