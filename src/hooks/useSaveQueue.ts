import { useCallback, useRef, useState } from 'react';
import logger from '@/utils/logger';

interface SaveOperation {
  id: string;
  operation: () => Promise<void>;
  timestamp: number;
  retryCount: number;
}

interface SaveQueueOptions {
  debounceMs?: number;
  maxRetries?: number;
  maxQueueSize?: number;
}

/**
 * Hook to manage a queue of save operations and prevent race conditions
 * Debounces rapid saves and ensures operations are executed sequentially
 */
export const useSaveQueue = (options: SaveQueueOptions = {}) => {
  const {
    debounceMs = 500,
    maxRetries = 3,
    maxQueueSize = 10
  } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queueRef = useRef<SaveOperation[]>([]);
  const processingRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Process the save queue sequentially
   */
  const processQueue = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);
    setError(null);

    while (queueRef.current.length > 0) {
      const operation = queueRef.current.shift()!;
      setQueueSize(queueRef.current.length);

      try {
        await operation.operation();
        setLastSaveTime(new Date());
        logger.log(`[SaveQueue] Operation ${operation.id} completed successfully`);
      } catch (error) {
        logger.error(`[SaveQueue] Operation ${operation.id} failed:`, error);
        
        // Retry if under retry limit
        if (operation.retryCount < maxRetries) {
          const retryOperation: SaveOperation = {
            ...operation,
            retryCount: operation.retryCount + 1,
            timestamp: Date.now()
          };
          queueRef.current.unshift(retryOperation); // Add to front for immediate retry
          setQueueSize(queueRef.current.length);
          logger.log(`[SaveQueue] Retrying operation ${operation.id} (attempt ${retryOperation.retryCount})`);
        } else {
          setError(`Save operation failed after ${maxRetries} attempts`);
          logger.error(`[SaveQueue] Operation ${operation.id} failed permanently after ${maxRetries} attempts`);
        }
      }
    }

    processingRef.current = false;
    setIsProcessing(false);
    setQueueSize(0);
  }, [maxRetries]);

  /**
   * Add a save operation to the queue with debouncing
   */
  const queueSave = useCallback((
    operationId: string,
    operation: () => Promise<void>,
    immediate: boolean = false
  ) => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    // If queue is full, remove oldest operation
    if (queueRef.current.length >= maxQueueSize) {
      const removed = queueRef.current.shift();
      if (removed) {
        logger.warn(`[SaveQueue] Queue full, removed operation ${removed.id}`);
      }
    }

    // Check if operation with same ID already exists and replace it
    const existingIndex = queueRef.current.findIndex(op => op.id === operationId);
    const newOperation: SaveOperation = {
      id: operationId,
      operation,
      timestamp: Date.now(),
      retryCount: 0
    };

    if (existingIndex >= 0) {
      // Replace existing operation
      queueRef.current[existingIndex] = newOperation;
      logger.log(`[SaveQueue] Replaced existing operation ${operationId}`);
    } else {
      // Add new operation
      queueRef.current.push(newOperation);
      logger.log(`[SaveQueue] Queued new operation ${operationId}`);
    }

    setQueueSize(queueRef.current.length);

    if (immediate) {
      // Process immediately
      processQueue();
    } else {
      // Debounce the processing
      debounceTimerRef.current = setTimeout(() => {
        processQueue();
      }, debounceMs);
    }
  }, [debounceMs, maxQueueSize, processQueue]);

  /**
   * Clear the queue and cancel any pending operations
   */
  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setQueueSize(0);
    setError(null);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    
    logger.log('[SaveQueue] Queue cleared');
  }, []);

  /**
   * Force immediate processing of the queue
   */
  const flushQueue = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    processQueue();
  }, [processQueue]);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  return {
    queueSave,
    clearQueue,
    flushQueue,
    cleanup,
    status: {
      isProcessing,
      queueSize,
      lastSaveTime,
      error
    }
  };
};