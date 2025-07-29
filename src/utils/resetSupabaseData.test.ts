/**
 * Tests for resetSupabaseData utility
 */

import { resetAllSupabaseData } from './resetSupabaseData';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

jest.mock('@/lib/supabase');
jest.mock('@/utils/logger');

describe('resetAllSupabaseData', () => {
  const mockUser = { id: 'user123' };
  const mockSupabase = supabase as jest.Mocked<typeof supabase>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default auth mock
    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
    } as any;
    
    // Setup default from mocks
    mockSupabase.from = jest.fn().mockImplementation((table) => ({
      select: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      count: null,
      data: null,
      error: null
    }));
  });

  it('should successfully reset all data when user is authenticated', async () => {
    // Mock count queries
    const mockCounts = {
      games: { count: 5 },
      tournaments: { count: 2 },
      seasons: { count: 3 },
      players: { count: 10 },
      app_settings: { count: 1 }
    };

    mockSupabase.from = jest.fn().mockImplementation((table) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => {
          if (chain.select.mock.calls.length > 0) {
            // This is a count query
            return Promise.resolve({
              count: mockCounts[table as keyof typeof mockCounts]?.count || 0,
              data: null,
              error: null
            });
          } else {
            // This is a delete query
            return Promise.resolve({ data: null, error: null });
          }
        })
      };
      return chain;
    });

    const result = await resetAllSupabaseData();

    expect(result).toEqual({
      success: true,
      message: 'Successfully deleted: 5 games, 2 tournaments, 3 seasons, 10 players, and app settings',
      details: {
        gamesDeleted: 5,
        tournamentsDeleted: 2,
        seasonsDeleted: 3,
        playersDeleted: 10,
        settingsDeleted: true
      }
    });

    // Verify logger calls
    expect(mockLogger.log).toHaveBeenCalledWith('[ResetSupabaseData] Starting complete data reset...');
    expect(mockLogger.log).toHaveBeenCalledWith('[ResetSupabaseData] Deleting games...');
    expect(mockLogger.log).toHaveBeenCalledWith('[ResetSupabaseData] Deleting tournaments...');
    expect(mockLogger.log).toHaveBeenCalledWith('[ResetSupabaseData] Deleting seasons...');
    expect(mockLogger.log).toHaveBeenCalledWith('[ResetSupabaseData] Deleting players...');
    expect(mockLogger.log).toHaveBeenCalledWith('[ResetSupabaseData] Deleting app settings...');
    expect(mockLogger.log).toHaveBeenCalledWith('[ResetSupabaseData] All data cleared successfully');

    // Verify delete operations were called for each table
    const fromCalls = mockSupabase.from.mock.calls;
    expect(fromCalls).toContainEqual(['games']);
    expect(fromCalls).toContainEqual(['tournaments']);
    expect(fromCalls).toContainEqual(['seasons']);
    expect(fromCalls).toContainEqual(['players']);
    expect(fromCalls).toContainEqual(['app_settings']);
  });

  it('should handle case when no data exists', async () => {
    // Mock count queries returning 0
    mockSupabase.from = jest.fn().mockImplementation((table) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => {
          if (chain.select.mock.calls.length > 0) {
            return Promise.resolve({ count: 0, data: null, error: null });
          } else {
            return Promise.resolve({ data: null, error: null });
          }
        })
      };
      return chain;
    });

    const result = await resetAllSupabaseData();

    expect(result).toEqual({
      success: true,
      message: 'Successfully deleted: 0 games, 0 tournaments, 0 seasons, 0 players',
      details: {
        gamesDeleted: 0,
        tournamentsDeleted: 0,
        seasonsDeleted: 0,
        playersDeleted: 0,
        settingsDeleted: false
      }
    });
  });

  it('should return error when user is not authenticated', async () => {
    mockSupabase.auth.getUser = jest.fn().mockResolvedValue({ 
      data: { user: null }, 
      error: null 
    });

    const result = await resetAllSupabaseData();

    expect(result).toEqual({
      success: false,
      message: 'Reset failed: No authenticated user'
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[ResetSupabaseData] Reset failed:',
      expect.any(Error)
    );
  });

  it('should handle auth error', async () => {
    mockSupabase.auth.getUser = jest.fn().mockResolvedValue({ 
      data: null, 
      error: new Error('Auth error') 
    });

    const result = await resetAllSupabaseData();

    expect(result).toEqual({
      success: false,
      message: 'Reset failed: Cannot read properties of null (reading \'user\')'
    });
  });

  it('should handle games deletion error', async () => {
    mockSupabase.from = jest.fn().mockImplementation((table) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => {
          if (chain.select.mock.calls.length > 0) {
            return Promise.resolve({ count: 5, data: null, error: null });
          } else if (table === 'games') {
            return Promise.resolve({ 
              data: null, 
              error: { message: 'Games deletion failed' } 
            });
          } else {
            return Promise.resolve({ data: null, error: null });
          }
        })
      };
      return chain;
    });

    const result = await resetAllSupabaseData();

    expect(result).toEqual({
      success: false,
      message: 'Reset failed: Failed to delete games: Games deletion failed'
    });

    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should handle tournaments deletion error', async () => {
    mockSupabase.from = jest.fn().mockImplementation((table) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => {
          if (chain.select.mock.calls.length > 0) {
            return Promise.resolve({ count: 2, data: null, error: null });
          } else if (table === 'tournaments') {
            return Promise.resolve({ 
              data: null, 
              error: { message: 'Tournaments deletion failed' } 
            });
          } else {
            return Promise.resolve({ data: null, error: null });
          }
        })
      };
      return chain;
    });

    const result = await resetAllSupabaseData();

    expect(result).toEqual({
      success: false,
      message: 'Reset failed: Failed to delete tournaments: Tournaments deletion failed'
    });
  });

  it('should handle seasons deletion error', async () => {
    mockSupabase.from = jest.fn().mockImplementation((table) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => {
          if (chain.select.mock.calls.length > 0) {
            return Promise.resolve({ count: 3, data: null, error: null });
          } else if (table === 'seasons') {
            return Promise.resolve({ 
              data: null, 
              error: { message: 'Seasons deletion failed' } 
            });
          } else {
            return Promise.resolve({ data: null, error: null });
          }
        })
      };
      return chain;
    });

    const result = await resetAllSupabaseData();

    expect(result).toEqual({
      success: false,
      message: 'Reset failed: Failed to delete seasons: Seasons deletion failed'
    });
  });

  it('should handle players deletion error', async () => {
    mockSupabase.from = jest.fn().mockImplementation((table) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => {
          if (chain.select.mock.calls.length > 0) {
            return Promise.resolve({ count: 10, data: null, error: null });
          } else if (table === 'players') {
            return Promise.resolve({ 
              data: null, 
              error: { message: 'Players deletion failed' } 
            });
          } else {
            return Promise.resolve({ data: null, error: null });
          }
        })
      };
      return chain;
    });

    const result = await resetAllSupabaseData();

    expect(result).toEqual({
      success: false,
      message: 'Reset failed: Failed to delete players: Players deletion failed'
    });
  });

  it('should handle app settings deletion error', async () => {
    mockSupabase.from = jest.fn().mockImplementation((table) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => {
          if (chain.select.mock.calls.length > 0) {
            return Promise.resolve({ count: 1, data: null, error: null });
          } else if (table === 'app_settings') {
            return Promise.resolve({ 
              data: null, 
              error: { message: 'Settings deletion failed' } 
            });
          } else {
            return Promise.resolve({ data: null, error: null });
          }
        })
      };
      return chain;
    });

    const result = await resetAllSupabaseData();

    expect(result).toEqual({
      success: false,
      message: 'Reset failed: Failed to delete app settings: Settings deletion failed'
    });
  });

  it('should handle null count values', async () => {
    mockSupabase.from = jest.fn().mockImplementation((table) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation(() => {
          if (chain.select.mock.calls.length > 0) {
            return Promise.resolve({ count: null, data: null, error: null });
          } else {
            return Promise.resolve({ data: null, error: null });
          }
        })
      };
      return chain;
    });

    const result = await resetAllSupabaseData();

    expect(result).toEqual({
      success: true,
      message: 'Successfully deleted: 0 games, 0 tournaments, 0 seasons, 0 players',
      details: {
        gamesDeleted: 0,
        tournamentsDeleted: 0,
        seasonsDeleted: 0,
        playersDeleted: 0,
        settingsDeleted: false
      }
    });
  });

  it('should handle non-Error exceptions', async () => {
    mockSupabase.auth.getUser = jest.fn().mockImplementation(() => {
      throw 'String error';
    });

    const result = await resetAllSupabaseData();

    expect(result).toEqual({
      success: false,
      message: 'Reset failed: Unknown error'
    });

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[ResetSupabaseData] Reset failed:',
      'String error'
    );
  });

  it('should delete tables in correct order to avoid foreign key constraints', async () => {
    const deletionOrder: string[] = [];

    mockSupabase.from = jest.fn().mockImplementation((table) => {
      const chain = {
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockImplementation(() => {
          deletionOrder.push(table);
          return chain;
        }),
        eq: jest.fn().mockImplementation(() => {
          if (chain.select.mock.calls.length > 0) {
            return Promise.resolve({ count: 1, data: null, error: null });
          } else {
            return Promise.resolve({ data: null, error: null });
          }
        })
      };
      return chain;
    });

    await resetAllSupabaseData();

    // Verify deletion order (games first, then tournaments, seasons, players, settings)
    const deleteOperations = deletionOrder.filter(table => 
      ['games', 'tournaments', 'seasons', 'players', 'app_settings'].includes(table)
    );
    
    expect(deleteOperations).toEqual([
      'games',
      'tournaments',
      'seasons',
      'players',
      'app_settings'
    ]);
  });
});