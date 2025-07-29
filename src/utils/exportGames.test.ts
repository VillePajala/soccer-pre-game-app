/**
 * Tests for game export utilities
 */

import { 
  exportJson, 
  exportCsv, 
  exportAggregateJson, 
  exportAggregateCsv 
} from './exportGames';
import type { 
  AppState, 
  Player, 
  Season, 
  Tournament, 
  SavedGamesCollection, 
  PlayerStatRow 
} from '@/types';

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
    assessments: {},
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
      assessments: {},
    };

    exportCsv('game1', gameWithExtra, playersWithExtra, [{ id: 's1', name: 'Season' } as Season], [{ id: 't1', name: 'Tournament' } as Tournament]);
    const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
    const text = await blob.text();
    expect(text).toContain('Player 1');
    expect(text).toContain('Player 2');
    expect(text).not.toContain('Extra');
  });

  describe('exportJson', () => {
    it('should export game with season and tournament names', async () => {
      const seasons: Season[] = [{ id: 's1', name: 'Season 1' } as Season];
      const tournaments: Tournament[] = [{ id: 't1', name: 'Tournament 1' } as Tournament];
      
      exportJson('game123', baseGame, seasons, tournaments);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      const exportedData = JSON.parse(text);
      
      expect(exportedData.game123.seasonName).toBe('Season 1');
      expect(exportedData.game123.tournamentName).toBe('Tournament 1');
      expect(exportedData.game123.teamName).toBe('Home');
    });

    it('should export game without season and tournament', async () => {
      const gameWithoutIds: AppState = { ...baseGame, seasonId: null, tournamentId: null };
      
      exportJson('game123', gameWithoutIds, [], []);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      const exportedData = JSON.parse(text);
      
      expect(exportedData.game123.seasonName).toBeNull();
      expect(exportedData.game123.tournamentName).toBeNull();
    });

    it('should handle missing season/tournament in arrays', async () => {
      const seasons: Season[] = [{ id: 'other', name: 'Other Season' } as Season];
      const tournaments: Tournament[] = [{ id: 'other', name: 'Other Tournament' } as Tournament];
      
      exportJson('game123', baseGame, seasons, tournaments);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      const exportedData = JSON.parse(text);
      
      expect(exportedData.game123.seasonName).toBeUndefined();
      expect(exportedData.game123.tournamentName).toBeUndefined();
    });

    it('should create correct download filename', () => {
      exportJson('test-game-123', baseGame);
      
      const anchor = (document.createElement as jest.Mock).mock.results[0].value as HTMLAnchorElement;
      expect(anchor.download).toBe('test-game-123.json');
    });
  });

  describe('exportCsv', () => {
    it('should export complete CSV with all sections', async () => {
      const seasons: Season[] = [{ id: 's1', name: 'Season 1' } as Season];
      const tournaments: Tournament[] = [{ id: 't1', name: 'Tournament 1' } as Tournament];
      
      exportCsv('game123', baseGame, players, seasons, tournaments);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      
      // Check all major sections exist
      expect(text).toContain('Game Info');
      expect(text).toContain('Game Settings');
      expect(text).toContain('Substitution Intervals');
      expect(text).toContain('Player Stats');
      expect(text).toContain('Event Log');
      expect(text).toContain('Notes:');
    });

    it('should handle game with multiple goals and assists', async () => {
      const gameWithMultipleEvents: AppState = {
        ...baseGame,
        gameEvents: [
          { id: 'e1', type: 'goal', time: 30, scorerId: 'p1', assisterId: 'p2' },
          { id: 'e2', type: 'goal', time: 60, scorerId: 'p2', assisterId: 'p1' },
          { id: 'e3', type: 'goal', time: 90, scorerId: 'p1', assisterId: null },
          { id: 'e4', type: 'opponentGoal', time: 120 }
        ]
      };
      
      exportCsv('game123', gameWithMultipleEvents, players, [], []);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      
      // Check player stats sorting (p1 should have 2 goals, 1 assist = 3 points)
      expect(text).toContain('"Player 1";"2";"1";"3"');
      expect(text).toContain('"Player 2";"1";"1";"2"');
      
      // Check event log includes all events
      expect(text).toContain('00:30');
      expect(text).toContain('01:00');
      expect(text).toContain('01:30');
      expect(text).toContain('02:00');
      expect(text).toContain('Opponent Goal');
    });

    it('should handle CSV field escaping', async () => {
      const gameWithSpecialChars: AppState = {
        ...baseGame,
        teamName: 'Team "A"',
        opponentName: 'Team; B',
        gameNotes: 'Game notes with "quotes" and; semicolons\nand newlines',
        gameLocation: 'Stadium, City'
      };
      
      exportCsv('game123', gameWithSpecialChars, players, [], []);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      
      // Check proper escaping
      expect(text).toContain('"Team ""A"""');
      expect(text).toContain('"Team; B"');
      expect(text).toContain('"Stadium, City"');
      expect(text).toContain('with ""quotes""');
    });

    it('should handle empty/null values', async () => {
      const gameWithNulls: AppState = {
        ...baseGame,
        gameTime: null,
        gameLocation: null,
        gameNotes: null,
        subIntervalMinutes: null,
        completedIntervalDurations: []
      };
      
      exportCsv('game123', gameWithNulls, players, [], []);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      
      expect(text).toContain('No substitutions recorded');
      expect(text).toContain('"?"'); // subIntervalMinutes null handling
    });

    it('should handle game with no player stats', async () => {
      const gameWithNoPlayers: AppState = {
        ...baseGame,
        selectedPlayerIds: [],
        gameEvents: []
      };
      
      exportCsv('game123', gameWithNoPlayers, [], [], []);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      
      expect(text).toContain('No player stats recorded');
      expect(text).toContain('No goals logged');
    });

    it('should handle fair play awards correctly', async () => {
      const playersWithFairPlay: Player[] = [
        { id: 'p1', name: 'Player 1', receivedFairPlayCard: true } as Player,
        { id: 'p2', name: 'Player 2', receivedFairPlayCard: false } as Player
      ];
      
      exportCsv('game123', baseGame, playersWithFairPlay, [], []);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      
      // Player 1 has 1 goal (from baseGame events), 0 assists = 1 point, fair play = Yes
      // Player 2 has 0 goals, 1 assist (from baseGame events) = 1 point, no fair play = No
      expect(text).toContain('"Player 1";"1";"0";"1";"Yes"');
      expect(text).toContain('"Player 2";"0";"1";"1";"No"');
    });
  });

  describe('exportAggregateJson', () => {
    const mockGames: SavedGamesCollection = {
      'game1': baseGame,
      'game2': { ...baseGame, teamName: 'Team 2', homeScore: 2, awayScore: 1 }
    };

    const mockStats: PlayerStatRow[] = [
      { id: 'p1', name: 'Player 1', gamesPlayed: 2, goals: 3, assists: 1, totalScore: 4, fpAwards: 1 },
      { id: 'p2', name: 'Player 2', gamesPlayed: 2, goals: 1, assists: 2, totalScore: 3, fpAwards: 0 }
    ];

    it('should export aggregate data with timestamp', async () => {
      const mockDate = new Date('2024-01-01T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) {
          return mockDate;
        }
        return new (Date as any)(...args);
      });
      
      exportAggregateJson(mockGames, mockStats);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      const exportedData = JSON.parse(text);
      
      expect(exportedData.exportedTimestamp).toBe('2024-01-01T12:00:00.000Z');
      expect(exportedData.summaryStats).toEqual(mockStats);
      expect(exportedData.games).toEqual(mockGames);
      
      jest.restoreAllMocks();
    });

    it('should create timestamped filename', () => {
      exportAggregateJson(mockGames, mockStats);
      
      const anchor = (document.createElement as jest.Mock).mock.results[0].value as HTMLAnchorElement;
      expect(anchor.download).toMatch(/SoccerApp_AggregateStats_\d{8}_\d{6}\.json/);
    });
  });

  describe('exportAggregateCsv', () => {
    const mockGames: SavedGamesCollection = {
      'game1': baseGame,
      'game2': { ...baseGame, teamName: 'Team 2', homeScore: 2, awayScore: 1, gameNotes: 'Great game!' }
    };

    const mockStats: PlayerStatRow[] = [
      { id: 'p1', name: 'Player 1', gamesPlayed: 2, goals: 3, assists: 1, totalScore: 4, fpAwards: 1 },
      { id: 'p2', name: 'Player 2', gamesPlayed: 2, goals: 1, assists: 2, totalScore: 3, fpAwards: 0 },
      { id: 'p3', name: 'Player 3', gamesPlayed: 0, goals: 0, assists: 0, totalScore: 0, fpAwards: 0 }
    ];

    it('should export complete aggregate CSV', async () => {
      exportAggregateCsv(mockGames, mockStats);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      
      // Check main sections
      expect(text).toContain('Aggregate Stats');
      expect(text).toContain('Aggregate Player Stats Summary');
      expect(text).toContain('Included Game Details');
      
      // Check headers
      expect(text).toContain('"Player";"GP";"G";"A";"Pts";"FP"');
      expect(text).toContain('"Game ID";"Date";"Time";"Location"');
    });

    it('should filter out players with 0 games played', async () => {
      exportAggregateCsv(mockGames, mockStats);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      
      expect(text).toContain('"Player 1";"2";"3";"1";"4";"1"');
      expect(text).toContain('"Player 2";"2";"1";"2";"3";"0"');
      expect(text).not.toContain('"Player 3"');
    });

    it('should include all game details', async () => {
      exportAggregateCsv(mockGames, mockStats);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      
      expect(text).toContain('"game1";"2024-01-01";"10:00";"Stadium";"Home";"Away";"1";"0";""');
      expect(text).toContain('"game2";"2024-01-01";"10:00";"Stadium";"Team 2";"Away";"2";"1";"Great game!"');
    });

    it('should handle null fpAwards values', async () => {
      const statsWithNullFP: PlayerStatRow[] = [
        { id: 'p1', name: 'Player 1', gamesPlayed: 1, goals: 1, assists: 0, totalScore: 1, fpAwards: null }
      ];
      
      exportAggregateCsv(mockGames, statsWithNullFP);
      
      const blob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0] as BlobWithText;
      const text = await blob.text();
      
      expect(text).toContain('"Player 1";"1";"1";"0";"1";"0"');
    });

    it('should create timestamped filename', () => {
      exportAggregateCsv(mockGames, mockStats);
      
      const anchor = (document.createElement as jest.Mock).mock.results[0].value as HTMLAnchorElement;
      expect(anchor.download).toMatch(/SoccerApp_AggregateStats_\d{8}_\d{6}\.csv/);
    });
  });

  describe('DOM interaction and download mechanism', () => {
    it('should create and cleanup anchor element properly', () => {
      exportJson('test', baseGame);
      
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
      
      const anchor = (document.createElement as jest.Mock).mock.results[0].value as HTMLAnchorElement;
      expect(anchor.click).toHaveBeenCalled();
    });

    it('should set correct MIME types', () => {
      exportJson('test', baseGame);
      const jsonBlob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0];
      expect(jsonBlob.type).toBe('application/json');
      
      jest.clearAllMocks();
      
      exportCsv('test', baseGame, players);
      const csvBlob = (window.URL.createObjectURL as jest.Mock).mock.calls[0][0];
      expect(csvBlob.type).toBe('text/csv;charset=utf-8;');
    });

    it('should revoke object URLs after download', () => {
      exportJson('test', baseGame);
      
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
      const url = (window.URL.createObjectURL as jest.Mock).mock.results[0].value;
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(url);
    });
  });
});
