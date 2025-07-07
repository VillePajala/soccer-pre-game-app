import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseUndoRedoReturn<T> {
  state: T;
  set: (next: T) => void;
  /**
   * Reset the entire history to a single state. Useful when loading
   * a completely new game or discarding previous history.
   */
  reset: (next: T) => void;
  undo: () => T | null;
  redo: () => T | null;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndoRedo<T>(initialState: T): UseUndoRedoReturn<T> {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);
  const historyRef = useRef(history);
  const indexRef = useRef(index);

  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const set = useCallback((next: T) => {
    setHistory(prev => {
      const current = historyRef.current[indexRef.current];
      if (JSON.stringify(current) === JSON.stringify(next)) {
        return prev;
      }
      const newHistory = prev.slice(0, indexRef.current + 1);
      newHistory.push(next);
      historyRef.current = newHistory;
      indexRef.current = newHistory.length - 1;
      setIndex(indexRef.current);
      return newHistory;
    });
  }, []);

  const reset = useCallback((next: T) => {
    historyRef.current = [next];
    indexRef.current = 0;
    setIndex(0);
    setHistory([next]);
  }, []);

  const undo = useCallback((): T | null => {
    if (indexRef.current === 0) return null;
    const newIndex = indexRef.current - 1;
    indexRef.current = newIndex;
    setIndex(newIndex);
    return historyRef.current[newIndex];
  }, []);

  const redo = useCallback((): T | null => {
    if (indexRef.current >= historyRef.current.length - 1) return null;
    const newIndex = indexRef.current + 1;
    indexRef.current = newIndex;
    setIndex(newIndex);
    return historyRef.current[newIndex];
  }, []);

  const state = history[index];
  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return { state, set, reset, undo, redo, canUndo, canRedo };
}

export default useUndoRedo;
