import { renderHook, act } from '@testing-library/react';
import { useTacticalBoard } from '../useTacticalBoard';

const noop = () => {};

describe('useTacticalBoard', () => {
  test('add and remove disc immutably', () => {
    const { result } = renderHook(() =>
      useTacticalBoard({ saveStateToHistory: noop })
    );

    expect(result.current.tacticalDiscs).toHaveLength(0);
    act(() => {
      result.current.handleAddTacticalDisc('home');
    });
    const firstArray = result.current.tacticalDiscs;
    expect(firstArray).toHaveLength(1);
    act(() => {
      result.current.handleAddTacticalDisc('opponent');
    });
    const secondArray = result.current.tacticalDiscs;
    expect(secondArray).toHaveLength(2);
    expect(secondArray).not.toBe(firstArray);
    const idToRemove = secondArray[0].id;
    act(() => {
      result.current.handleTacticalDiscRemove(idToRemove);
    });
    expect(result.current.tacticalDiscs).toHaveLength(1);
    expect(result.current.tacticalDiscs).not.toBe(secondArray);
  });

  test('toggle disc type cycles', () => {
    const { result } = renderHook(() =>
      useTacticalBoard({ saveStateToHistory: noop })
    );
    act(() => {
      result.current.handleAddTacticalDisc('home');
    });
    const id = result.current.tacticalDiscs[0].id;
    expect(result.current.tacticalDiscs[0].type).toBe('home');
    act(() => {
      result.current.handleToggleTacticalDiscType(id);
    });
    expect(result.current.tacticalDiscs[0].type).toBe('opponent');
    act(() => {
      result.current.handleToggleTacticalDiscType(id);
    });
    expect(result.current.tacticalDiscs[0].type).toBe('goalie');
    act(() => {
      result.current.handleToggleTacticalDiscType(id);
    });
    expect(result.current.tacticalDiscs[0].type).toBe('home');
  });
});
