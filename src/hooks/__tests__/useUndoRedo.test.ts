import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '../useUndoRedo';

type State = { count: number };

describe('useUndoRedo', () => {
  test('push, undo and redo state', () => {
    const { result } = renderHook(() => useUndoRedo<State>({ count: 0 }));

    act(() => {
      result.current.set({ count: 1 });
      result.current.set({ count: 2 });
    });

    expect(result.current.state.count).toBe(2);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(result.current.state.count).toBe(1);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });

    expect(result.current.state.count).toBe(2);
  });

  test('adding after undo discards redo history', () => {
    const { result } = renderHook(() => useUndoRedo<State>({ count: 0 }));

    act(() => {
      result.current.set({ count: 1 });
      result.current.set({ count: 2 });
    });

    act(() => {
      result.current.undo();
    });

    act(() => {
      result.current.set({ count: 3 });
    });

    expect(result.current.state.count).toBe(3);
    expect(result.current.canRedo).toBe(false);
  });
});
