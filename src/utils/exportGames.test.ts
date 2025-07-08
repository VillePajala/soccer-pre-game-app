import { exportJson, exportCsv } from './exportGames';
import type { AppState, Player, Season, Tournament } from '@/types';

interface BlobWithText extends Blob {
  text: () => Promise<string>;
}

const mockBlobStore: Record<string, BlobWithText> = {};

describe('exportGames utilities', () => {
  const players: Player[] = [
    { id: 'p1', name: 'Player 1', jerseyNumber: '1', isGoalie: false, receivedFairPlayCard: true },
    { id: 'p2', name: 'Player 2', jerseyNumber: '2', isGoalie: false, receivedFairPlayCard: false },
  ];

  const baseGame: AppState = {
    playersOnField: [],
    opponents: [],
    drawings: [],
    availablePlayers: players,
    showPlayerNames: true,
    teamName: 'Home',
    gameEvents: [{ id: 'e1', type: 'goal', time: 30, scorerId: 'p1', assisterId: 'p2' }],
    opponentName: 'Away',
    gameDate: '2024-01-01',
    homeScore: 1,
    awayScore: 0,
    gameNotes: '',
    homeOrAway: 'home',
    numberOfPeriods: 2,
    periodDurationMinutes: 10,
    currentPeriod: 1,
    gameStatus: 'inProgress',
    selectedPlayerIds: ['p1', 'p2'],
    seasonId: 's1',
    tournamentId: 't1',
    gameLocation: 'Stadium',
    gameTime: '10:00',
    subIntervalMinutes: 5,
    completedIntervalDurations: [{ period: 1, duration: 30, timestamp: 30 }],
    lastSubConfirmationTimeSeconds: 0,
    tacticalDiscs: [],
    tacticalDrawings: [],
    tacticalBallPosition: { relX: 0.5, relY: 0.5 },
  };

  beforeAll(() => {
    window.URL.createObjectURL = jest.fn((blob: Blob): string => {
      const url = `blob:mock/${Math.random()}`;
      const b = blob as BlobWithText;
      b.text = async () =>
        await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsText(blob);
        });
      mockBlobStore[url] = b;
      return url;
    });
    window.URL.revokeObjectURL = jest.fn((url: string) => {
      delete mockBlobStore[url];
    });
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();
    document.createElement = jest.fn((tag: string) => {
      const el = document.createElementNS('http://www.w3.org/1999/xhtml', tag);
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: jest.fn() });
      }
      return el as unknown as HTMLElement;
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exportJson stringifies game data', async () => {
    exportJson('game1', baseGame, [{ id: 's1', name: 'Season' } as Season], [{ id: 't1', name: 'Tournament' } as Tournament]);
    const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
    const text = await blob.text();
    expect(JSON.parse(text)).toEqual({ game1: { ...baseGame, seasonName: 'Season', tournamentName: 'Tournament' } });
    const anchor = (document.createElement as jest.Mock).mock.results[0].value as HTMLAnchorElement;
    expect(anchor.download).toBe('game1.json');
  });

  it('exportCsv outputs header row and formatted time', async () => {
    exportCsv('game1', baseGame, players, [{ id: 's1', name: 'Season' } as Season], [{ id: 't1', name: 'Tournament' } as Tournament]);
    const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
    const text = await blob.text();
    expect(text).toContain('"Player";"Goals";"Assists";"Points";"Fair Play"');
    expect(text).toContain('00:30');
    const anchor = (document.createElement as jest.Mock).mock.results[0].value as HTMLAnchorElement;
    expect(anchor.download).toBe('game1.csv');
  });

  it('exportCsv includes only selected players', async () => {
    const playersWithExtra: Player[] = [
      ...players,
      { id: 'p3', name: 'Extra', jerseyNumber: '3', isGoalie: false, receivedFairPlayCard: false },
    ];
    const gameWithExtra: AppState = {
      ...baseGame,
      availablePlayers: playersWithExtra,
      selectedPlayerIds: ['p1', 'p2'],
    };

    exportCsv('game1', gameWithExtra, playersWithExtra, [{ id: 's1', name: 'Season' } as Season], [{ id: 't1', name: 'Tournament' } as Tournament]);
    const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
    const text = await blob.text();
    expect(text).toContain('Player 1');
    expect(text).toContain('Player 2');
    expect(text).not.toContain('Extra');
  });
});
