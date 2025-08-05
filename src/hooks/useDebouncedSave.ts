import { useRef, useCallback, useEffect } from 'react';
import logger from '@/utils/logger';

/**
 * Custom hook for debounced game saving
 * Prevents multiple rapid saves and batches operations
 * 
 * 🔧 RACE CONDITION FIXES:
 * - Prevents infinite recursion with retry limits
 * - Handles stale closure issues with current ref
 * - Adds comprehensive error recovery
 * - Implements proper cleanup and memory management
 */
export const useDebouncedSave = (
  saveFunction: () => Promise<void>,
  delay: number = 2000 // 2 seconds default
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSaveRef = useRef(false);
  const isSavingRef = useRef(false);
  const saveFunctionRef = useRef(saveFunction);
  
  // 🔧 RACE CONDITION FIX: Retry limit to prevent infinite loops
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Keep saveFunction ref current to avoid stale closures
  useEffect(() => {
    saveFunctionRef.current = saveFunction;
  }, [saveFunction]);

  // 🔧 COMPREHENSIVE CLEANUP: Clear timeout and reset state on unmount or function change
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Reset all state to prevent memory leaks
      pendingSaveRef.current = false;
      isSavingRef.current = false;
      retryCountRef.current = 0;
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
      timeoutRef.current = null;
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      // 🔧 RACE CONDITION FIX: Check if timeout was cleared before execution
      if (timeoutRef.current === null) {
        logger.debug('[useDebouncedSave] Save cancelled before execution');
        return;
      }
      
      isSavingRef.current = true;
      pendingSaveRef.current = false;

      try {
        // 🔧 STALE CLOSURE FIX: Use current ref instead of closed-over variable
        await saveFunctionRef.current();
        
        // Reset retry count on successful save
        retryCountRef.current = 0;
        
        // 🔧 RACE CONDITION FIX: Handle pending saves with retry limit
        if (pendingSaveRef.current && retryCountRef.current < maxRetries) {
          logger.debug(`[useDebouncedSave] Processing pending save (retry ${retryCountRef.current + 1}/${maxRetries})`);
          pendingSaveRef.current = false;
          retryCountRef.current++;
          
          // Schedule retry instead of immediate recursion
          setTimeout(() => {
            if (!isSavingRef.current) {
              debouncedSave();
            }
          }, Math.min(delay / 4, 500)); // Shorter delay for retries, max 500ms
        }
      } catch (error) {
        logger.error(`[useDebouncedSave] Save failed (attempt ${retryCountRef.current + 1}):`, error);
        
        // 🔧 ERROR RECOVERY: Retry failed saves with exponential backoff
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const backoffDelay = Math.min(delay * Math.pow(2, retryCountRef.current - 1), 10000); // Max 10s backoff
          
          logger.debug(`[useDebouncedSave] Retrying save in ${backoffDelay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
          
          setTimeout(() => {
            if (!isSavingRef.current) {
              debouncedSave();
            }
          }, backoffDelay);
        } else {
          logger.error('[useDebouncedSave] Max retries exceeded, giving up on save');
          retryCountRef.current = 0; // Reset for future attempts
        }
      } finally {
        isSavingRef.current = false;
        timeoutRef.current = null;
      }
    }, delay);
  }, [delay]); // 🔧 DEPENDENCY FIX: Remove saveFunction from deps to prevent recreation

  const saveImmediately = useCallback(async () => {
    // Clear any pending debounced saves
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // 🔧 RACE CONDITION FIX: Prevent concurrent immediate saves
    if (isSavingRef.current) {
      logger.debug('[useDebouncedSave] Immediate save already in progress, skipping');
      return;
    }

    // Save immediately
    isSavingRef.current = true;
    pendingSaveRef.current = false; // Clear any pending saves
    retryCountRef.current = 0; // Reset retry counter
    
    try {
      // 🔧 STALE CLOSURE FIX: Use current ref
      await saveFunctionRef.current();
      logger.debug('[useDebouncedSave] Immediate save completed successfully');
    } catch (error) {
      logger.error('[useDebouncedSave] Immediate save failed:', error);
      throw error; // Re-throw for caller to handle
    } finally {
      isSavingRef.current = false;
    }
  }, []); // 🔧 DEPENDENCY FIX: No dependencies needed with ref approach

  // 🔧 NEW: Add status query methods
  const getStatus = useCallback(() => ({
    isSaving: isSavingRef.current,
    hasPendingSave: pendingSaveRef.current,
    retryCount: retryCountRef.current,
  }), []);

  const cancelPendingSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      logger.debug('[useDebouncedSave] Cancelled pending save');
    }
    pendingSaveRef.current = false;
  }, []);

  return { 
    debouncedSave, 
    saveImmediately, 
    getStatus, 
    cancelPendingSave 
  };
};