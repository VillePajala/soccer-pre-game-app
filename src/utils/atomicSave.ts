/**
 * Atomic Save Operations - Ensures all-or-nothing game saves
 * Addresses CR-008: Non-Atomic Game Save Operations
 */

import logger from './logger';

export interface SaveOperation<T> {
  name: string;
  execute: () => Promise<T>;
  rollback?: () => Promise<void>;
}

export interface SaveTransactionResult<T> {
  success: boolean;
  results?: T[];
  error?: string;
  rolledBack?: boolean;
}

/**
 * Execute multiple save operations atomically with rollback support
 * If any operation fails, all completed operations are rolled back
 */
export async function executeAtomicSave<T>(
  operations: SaveOperation<T>[]
): Promise<SaveTransactionResult<T>> {
  const completedOperations: Array<{ operation: SaveOperation<T>; result: T }> = [];
  
  try {
    logger.log(`[AtomicSave] Starting transaction with ${operations.length} operations`);
    
    // Execute all operations in sequence
    for (const operation of operations) {
      logger.log(`[AtomicSave] Executing: ${operation.name}`);
      
      try {
        const result = await operation.execute();
        completedOperations.push({ operation, result });
        logger.log(`[AtomicSave] Completed: ${operation.name}`);
      } catch (error) {
        logger.error(`[AtomicSave] Failed: ${operation.name}`, error);
        
        // Operation failed - rollback all completed operations
        await rollbackOperations(completedOperations.reverse()); // Rollback in reverse order
        
        return {
          success: false,
          error: `Operation "${operation.name}" failed: ${error instanceof Error ? error.message : String(error)}`,
          rolledBack: completedOperations.length > 0
        };
      }
    }
    
    logger.log(`[AtomicSave] Transaction completed successfully`);
    return {
      success: true,
      results: completedOperations.map(c => c.result)
    };
    
  } catch (error) {
    logger.error('[AtomicSave] Transaction failed with unexpected error:', error);
    
    // Attempt rollback if we have completed operations
    if (completedOperations.length > 0) {
      await rollbackOperations(completedOperations.reverse());
    }
    
    return {
      success: false,
      error: `Transaction failed: ${error instanceof Error ? error.message : String(error)}`,
      rolledBack: completedOperations.length > 0
    };
  }
}

/**
 * Rollback completed operations in reverse order
 */
async function rollbackOperations<T>(
  completedOperations: Array<{ operation: SaveOperation<T>; result: T }>
): Promise<void> {
  logger.log(`[AtomicSave] Rolling back ${completedOperations.length} operations`);
  
  for (const { operation } of completedOperations) {
    if (operation.rollback) {
      try {
        await operation.rollback();
        logger.log(`[AtomicSave] Rolled back: ${operation.name}`);
      } catch (rollbackError) {
        logger.error(`[AtomicSave] Rollback failed for ${operation.name}:`, rollbackError);
        // Continue with other rollbacks even if one fails
      }
    } else {
      logger.warn(`[AtomicSave] No rollback available for: ${operation.name}`);
    }
  }
}

/**
 * Create a save operation that can be used in atomic transactions
 */
export function createSaveOperation<T>(
  name: string,
  execute: () => Promise<T>,
  rollback?: () => Promise<void>
): SaveOperation<T> {
  return { name, execute, rollback };
}

/**
 * Simple retry wrapper for operations that might fail temporarily
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        logger.warn(`[Retry] Attempt ${attempt} failed, retrying in ${delayMs}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError!;
}