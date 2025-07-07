import { renderHook } from '@testing-library/react';
import { useGameDataQueries } from '../useGameDataQueries';
import { useQuery } from '@tanstack/react-query';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/utils/masterRosterManager', () => ({
  getMasterRoster: jest.fn(),
}));
jest.mock('@/utils/seasons', () => ({
  getSeasons: jest.fn(),
}));
jest.mock('@/utils/tournaments', () => ({
  getTournaments: jest.fn(),
}));
jest.mock('@/utils/savedGames', () => ({
  getSavedGames: jest.fn(),
}));
jest.mock('@/utils/appSettings', () => ({
  getCurrentGameIdSetting: jest.fn(),
}));

const mockUseQuery = useQuery as jest.Mock;

describe('useGameDataQueries', () => {
  afterEach(() => {
    mockUseQuery.mockReset();
  });

  test('returns aggregated data', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: [{ id: 'p1' }], isLoading: false })
      .mockReturnValueOnce({ data: [{ id: 's1' }], isLoading: false })
      .mockReturnValueOnce({ data: [{ id: 't1' }], isLoading: false })
      .mockReturnValueOnce({ data: { game1: {} }, isLoading: false })
      .mockReturnValueOnce({ data: 'game1', isLoading: false });

    const { result } = renderHook(() => useGameDataQueries());

    expect(result.current.masterRoster).toEqual([{ id: 'p1' }]);
    expect(result.current.seasons).toEqual([{ id: 's1' }]);
    expect(result.current.tournaments).toEqual([{ id: 't1' }]);
    expect(result.current.savedGames).toEqual({ game1: {} });
    expect(result.current.currentGameId).toBe('game1');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  test('loading true when any query is loading', () => {
    mockUseQuery
      .mockReturnValueOnce({ data: [], isLoading: true })
      .mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useGameDataQueries());

    expect(result.current.loading).toBe(true);
  });
});
