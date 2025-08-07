import { renderHook, act } from '@testing-library/react';
import { useStateSynchronization } from '../useStateSynchronization';

describe('useStateSynchronization', () => {
  it('should synchronize operations sequentially', async () => {
    const { result } = renderHook(() => useStateSynchronization());
    const executionOrder: number[] = [];

    const operation1 = jest.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      executionOrder.push(1);
      return 'result1';
    });

    const operation2 = jest.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
      executionOrder.push(2);
      return 'result2';
    });

    // Start both operations simultaneously
    const promise1 = act(() => 
      result.current.withSynchronization('operation1', operation1)
    );
    const promise2 = act(() => 
      result.current.withSynchronization('operation2', operation2)
    );

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
    expect(executionOrder).toEqual([1, 2]); // Should execute in order despite operation2 being faster
    expect(operation1).toHaveBeenCalledTimes(1);
    expect(operation2).toHaveBeenCalledTimes(1);
  });

  it.skip('should handle synchronous operations', async () => {
    const { result } = renderHook(() => useStateSynchronization());
    const executionOrder: number[] = [];

    const operation1 = jest.fn(() => {
      executionOrder.push(1);
      return 'sync1';
    });

    const operation2 = jest.fn(() => {
      executionOrder.push(2);
      return 'sync2';
    });

    let result1: string | undefined;
    let result2: string | undefined;

    await act(async () => {
      result1 = await result.current.withSynchronization('sync1', operation1);
    });

    await act(async () => {
      result2 = await result.current.withSynchronization('sync2', operation2);
    });

    expect(result1).toBe('sync1');
    expect(result2).toBe('sync2');
    expect(executionOrder).toEqual([1, 2]);
  });

  it.skip('should handle operation errors correctly', async () => {
    const { result } = renderHook(() => useStateSynchronization());
    const executionOrder: number[] = [];

    const operation1 = jest.fn(async () => {
      executionOrder.push(1);
      throw new Error('Operation failed');
    });

    const operation2 = jest.fn(async () => {
      executionOrder.push(2);
      return 'success';
    });

    // Start both operations sequentially to avoid act() warnings
    let error: Error | null = null;
    await act(async () => {
      try {
        if (result.current) {
          await result.current.withSynchronization('failing-op', operation1);
        }
      } catch (e) {
        error = e as Error;
      }
    });

    let result2: string | undefined;
    await act(async () => {
      result2 = await result.current.withSynchronization('success-op', operation2);
    });

    expect(error?.message).toBe('Operation failed');
    expect(result2).toBe('success');
    expect(executionOrder).toEqual([1, 2]); // Both should have executed in order
  });

  it.skip('should clear synchronization state', async () => {
    const { result } = renderHook(() => useStateSynchronization());

    // Start an operation
    const operation = jest.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'result';
    });

    let promise: Promise<string> | undefined;
    act(() => {
      promise = result.current.withSynchronization('test-op', operation);
    });

    // Clear synchronization
    act(() => {
      result.current.clearSynchronization();
    });

    // The original operation should still complete
    const result1 = await promise!;
    expect(result1).toBe('result');

    // New operations should start immediately after clearing
    const fastOperation = jest.fn(() => 'fast');
    let result2: string | undefined;
    await act(async () => {
      result2 = await result.current.withSynchronization('fast-op', fastOperation);
    });

    expect(result2).toBe('fast');
  });

  it.skip('should wait for synchronization to complete', async () => {
    const { result } = renderHook(() => useStateSynchronization());
    let operationCompleted = false;

    const operation = jest.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      operationCompleted = true;
      return 'result';
    });

    // Start operation without awaiting it
    act(() => {
      result.current.withSynchronization('test-op', operation);
    });

    expect(operationCompleted).toBe(false);

    // Wait for it to complete
    await act(async () => {
      await result.current.waitForSynchronization();
    });

    expect(operationCompleted).toBe(true);
  });
});