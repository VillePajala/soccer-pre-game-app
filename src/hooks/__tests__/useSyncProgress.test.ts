import { renderHook, act } from '@testing-library/react';
import { useSyncProgress } from '../useSyncProgress';

// Mock timers for testing cleanup intervals
jest.useFakeTimers();

describe('useSyncProgress', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useSyncProgress());

    expect(result.current.operations).toEqual([]);
    expect(result.current.isActive).toBe(false);
    expect(result.current.overallProgress).toBe(0);
    expect(result.current.lastSync).toBeNull();
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.failedCount).toBe(0);
  });

  it('should add operation correctly', () => {
    const { result } = renderHook(() => useSyncProgress());

    act(() => {
      result.current.addOperation({
        type: 'upload',
        table: 'players',
        status: 'pending',
        progress: 0,
      });
    });

    expect(result.current.operations).toHaveLength(1);
    expect(result.current.operations[0]).toEqual(
      expect.objectContaining({
        type: 'upload',
        table: 'players',
        status: 'pending',
        progress: 0,
        id: expect.any(String),
        timestamp: expect.any(Number),
      })
    );
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.isActive).toBe(true);
  });

  it('should update operation correctly', () => {
    const { result } = renderHook(() => useSyncProgress());

    let operationId: string;

    act(() => {
      operationId = result.current.addOperation({
        type: 'upload',
        table: 'players',
        status: 'pending',
        progress: 0,
      });
    });

    act(() => {
      result.current.updateOperation(operationId, {
        status: 'syncing',
        progress: 50,
      });
    });

    expect(result.current.operations[0]).toEqual(
      expect.objectContaining({
        status: 'syncing',
        progress: 50,
      })
    );
    expect(result.current.overallProgress).toBe(50);
  });

  it('should update lastSync when operation completes', () => {
    const { result } = renderHook(() => useSyncProgress());

    let operationId: string;

    act(() => {
      operationId = result.current.addOperation({
        type: 'upload',
        table: 'players',
        status: 'pending',
        progress: 0,
      });
    });

    act(() => {
      result.current.updateOperation(operationId, {
        status: 'completed',
        progress: 100,
      });
    });

    expect(result.current.lastSync).toBeInstanceOf(Date);
    expect(result.current.isActive).toBe(false);
    expect(result.current.overallProgress).toBe(100);
  });

  it('should calculate counts correctly', () => {
    const { result } = renderHook(() => useSyncProgress());

    act(() => {
      result.current.addOperation({
        type: 'upload',
        table: 'players',
        status: 'pending',
        progress: 0,
      });
      result.current.addOperation({
        type: 'upload',
        table: 'games',
        status: 'failed',
        progress: 0,
        error: 'Network error',
      });
      result.current.addOperation({
        type: 'download',
        table: 'seasons',
        status: 'completed',
        progress: 100,
      });
    });

    expect(result.current.pendingCount).toBe(1);
    expect(result.current.failedCount).toBe(1);
    expect(result.current.operations).toHaveLength(3);
  });

  it('should remove operation correctly', () => {
    const { result } = renderHook(() => useSyncProgress());

    let operationId: string;

    act(() => {
      operationId = result.current.addOperation({
        type: 'upload',
        table: 'players',
        status: 'pending',
        progress: 0,
      });
    });

    expect(result.current.operations).toHaveLength(1);

    act(() => {
      result.current.removeOperation(operationId);
    });

    expect(result.current.operations).toHaveLength(0);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.isActive).toBe(false);
  });

  it('should clear completed operations', () => {
    const { result } = renderHook(() => useSyncProgress());

    act(() => {
      result.current.addOperation({
        type: 'upload',
        table: 'players',
        status: 'completed',
        progress: 100,
      });
      result.current.addOperation({
        type: 'upload',
        table: 'games',
        status: 'pending',
        progress: 0,
      });
      result.current.addOperation({
        type: 'download',
        table: 'seasons',
        status: 'completed',
        progress: 100,
      });
    });

    expect(result.current.operations).toHaveLength(3);

    act(() => {
      result.current.clearCompleted();
    });

    expect(result.current.operations).toHaveLength(1);
    expect(result.current.operations[0].status).toBe('pending');
  });

  it('should retry failed operations', () => {
    const { result } = renderHook(() => useSyncProgress());

    act(() => {
      result.current.addOperation({
        type: 'upload',
        table: 'players',
        status: 'failed',
        progress: 50,
        error: 'Network error',
      });
      result.current.addOperation({
        type: 'upload',
        table: 'games',
        status: 'completed',
        progress: 100,
      });
    });

    expect(result.current.failedCount).toBe(1);

    act(() => {
      result.current.retryFailed();
    });

    expect(result.current.failedCount).toBe(0);
    expect(result.current.pendingCount).toBe(1);
    expect(result.current.operations[0]).toEqual(
      expect.objectContaining({
        status: 'pending',
        progress: 0,
        error: undefined,
      })
    );
  });

  it('should calculate overall progress correctly', () => {
    const { result } = renderHook(() => useSyncProgress());

    act(() => {
      result.current.addOperation({
        type: 'upload',
        table: 'players',
        status: 'syncing',
        progress: 50,
      });
      result.current.addOperation({
        type: 'upload',
        table: 'games',
        status: 'completed',
        progress: 100,
      });
    });

    // (50 + 100) / 2 = 75
    expect(result.current.overallProgress).toBe(75);
  });

  it('should clean up old completed operations', () => {
    const { result } = renderHook(() => useSyncProgress());

    // Add many completed operations
    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.addOperation({
          type: 'upload',
          table: `table_${i}`,
          status: 'completed',
          progress: 100,
        });
      }
    });

    expect(result.current.operations).toHaveLength(60);

    // Fast-forward time to trigger cleanup
    act(() => {
      jest.advanceTimersByTime(60000);
    });

    // Should keep only last 50 completed operations
    expect(result.current.operations).toHaveLength(50);
  });

  it('should preserve active operations during cleanup', () => {
    const { result } = renderHook(() => useSyncProgress());

    // Add many completed operations and some active ones
    act(() => {
      for (let i = 0; i < 55; i++) {
        result.current.addOperation({
          type: 'upload',
          table: `completed_${i}`,
          status: 'completed',
          progress: 100,
        });
      }
      result.current.addOperation({
        type: 'upload',
        table: 'pending',
        status: 'pending',
        progress: 0,
      });
      result.current.addOperation({
        type: 'upload',
        table: 'failed',
        status: 'failed',
        progress: 25,
        error: 'Error',
      });
    });

    expect(result.current.operations).toHaveLength(57);

    // Fast-forward time to trigger cleanup
    act(() => {
      jest.advanceTimersByTime(60000);
    });

    // Should keep active operations + last 50 completed
    expect(result.current.operations).toHaveLength(52);
    expect(result.current.operations.filter(op => op.status === 'pending')).toHaveLength(1);
    expect(result.current.operations.filter(op => op.status === 'failed')).toHaveLength(1);
    expect(result.current.operations.filter(op => op.status === 'completed')).toHaveLength(50);
  });
});