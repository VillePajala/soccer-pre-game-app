import { renderHook } from '@testing-library/react';
import { usePlayerStats } from '../usePlayerStats';
import { Player, GameEvent, AppState } from '@/types';

const mockPlayers: Player[] = [
  { id: 'player1', name: 'John Doe', jerseyNumber: '10' },
  { id: 'player2', name: 'Jane Smith', jerseyNumber: '7' },
];

const mockGameEvents: GameEvent[] = [
  {
    id: 'event1',
    type: 'goal',
    time: 300,
    playerId: 'player1',
    assistId: 'player2',
    gameId: 'current-game',
  },
  {
    id: 'event2',
    type: 'goal',
    time: 600,
    playerId: 'player1',
    gameId: 'current-game',
  },
];

const defaultProps = {
  activeTab: 'currentGame' as const,
  availablePlayers: mockPlayers,
  selectedPlayerIds: ['player1', 'player2'],
  localGameEvents: mockGameEvents,
  savedGames: null,
  currentGameId: 'current-game',
  selectedSeasonIdFilter: '',
  selectedTournamentIdFilter: '',
  sortColumn: 'goals' as const,
  sortDirection: 'desc' as const,
  filterText: '',
};

describe('usePlayerStats', () => {
  describe('basic functionality', () => {
    it('should return stats array and gameIds', () => {
      const { result } = renderHook(() => usePlayerStats(defaultProps));
      
      expect(result.current).toHaveProperty('stats');
      expect(result.current).toHaveProperty('gameIds');
      expect(Array.isArray(result.current.stats)).toBe(true);
      expect(Array.isArray(result.current.gameIds)).toBe(true);
    });

    it('should calculate basic goal stats', () => {
      const { result } = renderHook(() => usePlayerStats(defaultProps));
      
      const player1Stats = result.current.stats.find((p) => p.id === 'player1');
      const player2Stats = result.current.stats.find((p) => p.id === 'player2');
      
      expect(player1Stats?.goals).toBe(2);
      expect(player2Stats?.assists).toBe(1);
    });

    it('should include player information', () => {
      const { result } = renderHook(() => usePlayerStats(defaultProps));
      
      const player1Stats = result.current.stats.find((p) => p.id === 'player1');
      
      expect(player1Stats).toEqual(expect.objectContaining({
        id: 'player1',
        name: 'John Doe',
        jerseyNumber: '10',
      }));
    });
  });

  describe('filtering', () => {
    it('should filter players by name', () => {
      const props = {
        ...defaultProps,
        filterText: 'john',
      };
      
      const { result } = renderHook(() => usePlayerStats(props));
      
      expect(result.current.stats).toHaveLength(1);
      expect(result.current.stats[0].name).toBe('John Doe');
    });

    it('should be case insensitive', () => {
      const props = {
        ...defaultProps,
        filterText: 'JANE',
      };
      
      const { result } = renderHook(() => usePlayerStats(props));
      
      expect(result.current.stats).toHaveLength(1);
      expect(result.current.stats[0].name).toBe('Jane Smith');
    });

    it('should return empty array when no matches', () => {
      const props = {
        ...defaultProps,
        filterText: 'xyz',
      };
      
      const { result } = renderHook(() => usePlayerStats(props));
      
      expect(result.current.stats).toHaveLength(0);
    });
  });

  describe('sorting', () => {
    it('should sort by goals in descending order by default', () => {
      const { result } = renderHook(() => usePlayerStats(defaultProps));
      
      // Player1 has 2 goals, Player2 has 0 goals
      expect(result.current.stats[0].id).toBe('player1');
    });

    it('should sort by name when specified', () => {
      const props = {
        ...defaultProps,
        sortColumn: 'name' as const,
        sortDirection: 'asc' as const,
      };
      
      const { result } = renderHook(() => usePlayerStats(props));
      
      // Alphabetical: Jane Smith, John Doe
      expect(result.current.stats[0].name).toBe('Jane Smith');
      expect(result.current.stats[1].name).toBe('John Doe');
    });
  });

  describe('edge cases', () => {
    it('should handle empty game events', () => {
      const props = {
        ...defaultProps,
        localGameEvents: [],
      };
      
      const { result } = renderHook(() => usePlayerStats(props));
      
      result.current.stats.forEach((player) => {
        expect(player.goals).toBe(0);
        expect(player.assists).toBe(0);
      });
    });

    it('should handle empty player list', () => {
      const props = {
        ...defaultProps,
        availablePlayers: [],
        selectedPlayerIds: [],
      };
      
      const { result } = renderHook(() => usePlayerStats(props));
      
      expect(result.current.stats).toHaveLength(0);
    });

    it('should handle null savedGames', () => {
      const props = {
        ...defaultProps,
        savedGames: null,
      };
      
      const { result } = renderHook(() => usePlayerStats(props));
      
      expect(result.current.stats).toHaveLength(2);
    });
  });
});