import { useCallback, useRef } from 'react';
import logger from '@/utils/logger';

/**
 * Hook to manage state synchronization and prevent race conditions
 * during complex state updates like game loading
 */
export const useStateSynchronization = () => {
  const synchronizationLockRef = useRef<Promise<void> | null>(null);
  const operationCounterRef = useRef(0);

  /**
   * Execute a function with synchronization lock to prevent race conditions
   * Only one synchronization operation can run at a time
   */
  const withSynchronization = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T> | T
  ): Promise<T> => {
    const operationId = ++operationCounterRef.current;
    logger.log(`[StatSync] Starting operation ${operationId}: ${operationName}`);

    // Wait for any existing synchronization to complete
    if (synchronizationLockRef.current) {
      logger.log(`[StatSync] Waiting for previous operation to complete...`);
      await synchronizationLockRef.current;
    }

    // Create a new synchronization promise
    const currentOperation = (async () => {
      try {
        const result = await operation();
        logger.log(`[StatSync] Completed operation ${operationId}: ${operationName}`);
        return result;
      } catch (error) {
        logger.error(`[StatSync] Failed operation ${operationId}: ${operationName}`, error);
        throw error;
      }
    })();

    // Store the current operation promise for synchronization
    const lockPromise = currentOperation.then(() => {}, () => {}); // Convert to void promise
    synchronizationLockRef.current = lockPromise;

    return currentOperation;
  }, []);

  /**
   * Check if there's currently a synchronization operation in progress
   */
  const isSynchronizing = useCallback(() => {
    return synchronizationLockRef.current !== null;
  }, []);

  /**
   * Wait for all pending synchronization operations to complete
   */
  const waitForSynchronization = useCallback(async () => {
    if (synchronizationLockRef.current) {
      await synchronizationLockRef.current;
    }
  }, []);

  /**
   * Clear the synchronization lock (useful for cleanup)
   */
  const clearSynchronization = useCallback(() => {
    synchronizationLockRef.current = null;
    operationCounterRef.current = 0;
    logger.log('[StatSync] Synchronization cleared');
  }, []);

  return {
    withSynchronization,
    isSynchronizing,
    waitForSynchronization,
    clearSynchronization
  };
};