import { useRef, useCallback, useEffect } from 'react';
import logger from '@/utils/logger';

/**
 * Custom hook for debounced game saving
 * Prevents multiple rapid saves and batches operations
 */
export const useDebouncedSave = (
  saveFunction: () => Promise<void>,
  delay: number = 2000 // 2 seconds default
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef(false);
  const isSavingRef = useRef(false);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedSave = useCallback(() => {
    // If already saving, mark as pending
    if (isSavingRef.current) {
      pendingSaveRef.current = true;
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      isSavingRef.current = true;
      pendingSaveRef.current = false;

      try {
        await saveFunction();
        
        // If there was a pending save during this save, trigger another save
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;
          debouncedSave();
        }
      } catch (error) {
        logger.error('Debounced save failed:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, delay);
  }, [saveFunction, delay]);

  const saveImmediately = useCallback(async () => {
    // Clear any pending debounced saves
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Save immediately
    isSavingRef.current = true;
    try {
      await saveFunction();
    } finally {
      isSavingRef.current = false;
    }
  }, [saveFunction]);

  return { debouncedSave, saveImmediately };
};