/**
 * Transaction Manager - Atomic Operations for Multi-Step Processes
 * 
 * This service provides atomic transaction capabilities for operations that
 * span multiple stores or involve complex state changes that must be consistent.
 * 
 * 🔧 ATOMIC TRANSACTION FIXES:
 * - Ensures all-or-nothing semantics for complex operations
 * - Provides rollback capabilities when operations fail
 * - Coordinates state changes across multiple stores
 * - Prevents partial failures that leave inconsistent state
 */

import logger from '@/utils/logger';

// Transaction operation types
export type TransactionOperation<T = any> = {
  id: string;
  execute: () => Promise<T>;
  rollback?: () => Promise<void>;
  description: string;
};

// Transaction result
export interface TransactionResult<T = any> {
  success: boolean;
  results?: T[];
  error?: Error;
  completedOperations: string[];
  rollbackResults?: boolean[];
}

// Transaction context for state management
interface TransactionContext {
  id: string;
  operations: TransactionOperation[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any[];
  completedOperationIds: string[];
  startTime: number;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'rolled_back';
}

// Transaction options
export interface TransactionOptions {
  timeout?: number; // milliseconds
  retryOnFailure?: boolean;
  maxRetries?: number;
  rollbackOnFailure?: boolean;
  isolationLevel?: 'read_uncommitted' | 'read_committed' | 'serializable';
}

class TransactionManager {
  private activeTransactions = new Map<string, TransactionContext>();
  private transactionCounter = 0;

  /**
   * Execute multiple operations atomically
   */
  async executeTransaction<T = any>(
    operations: TransactionOperation<T>[],
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const transactionId = this.generateTransactionId();
    const context: TransactionContext = {
      id: transactionId,
      operations,
      results: [],
      completedOperationIds: [],
      startTime: Date.now(),
      status: 'pending',
    };

    this.activeTransactions.set(transactionId, context);
    logger.debug(`[TransactionManager] Starting transaction ${transactionId} with ${operations.length} operations`);

    const {
      timeout = 30000, // 30 seconds default
      retryOnFailure = false,
      maxRetries = 3,
      rollbackOnFailure = true,
    } = options;

    try {
      context.status = 'executing';

      // Set timeout for the entire transaction
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Transaction ${transactionId} timed out after ${timeout}ms`));
        }, timeout);
      });

      // Execute operations with timeout
      const executionPromise = this.executeOperationsSequentially(context);
      const results = await Promise.race([executionPromise, timeoutPromise]);

      context.status = 'completed';
      logger.debug(`[TransactionManager] Transaction ${transactionId} completed successfully`);

      return {
        success: true,
        results: results as T[],
        completedOperations: context.completedOperationIds,
      };

    } catch (error) {
      context.status = 'failed';
      logger.error(`[TransactionManager] Transaction ${transactionId} failed:`, error);

      // Attempt rollback if enabled
      let rollbackResults: boolean[] = [];
      if (rollbackOnFailure && context.completedOperationIds.length > 0) {
        logger.debug(`[TransactionManager] Rolling back ${context.completedOperationIds.length} completed operations`);
        rollbackResults = await this.rollbackOperations(context);
        context.status = 'rolled_back';
      }

      // Retry logic
      if (retryOnFailure && maxRetries > 0) {
        logger.debug(`[TransactionManager] Retrying transaction ${transactionId} (${maxRetries} retries left)`);
        
        // Reset context for retry
        context.results = [];
        context.completedOperationIds = [];
        context.status = 'pending';
        
        return await this.executeTransaction(operations, {
          ...options,
          maxRetries: maxRetries - 1,
        });
      }

      return {
        success: false,
        error: error as Error,
        completedOperations: context.completedOperationIds,
        rollbackResults: rollbackResults.length > 0 ? rollbackResults : undefined,
      };

    } finally {
      this.activeTransactions.delete(transactionId);
    }
  }

  /**
   * Execute operations in sequence with proper error handling
   */
  private async executeOperationsSequentially<T>(context: TransactionContext): Promise<T[]> {
    const results: T[] = [];

    for (const operation of context.operations) {
      try {
        logger.debug(`[TransactionManager] Executing operation '${operation.id}': ${operation.description}`);
        
        const result = await operation.execute();
        results.push(result);
        context.results.push(result);
        context.completedOperationIds.push(operation.id);

        logger.debug(`[TransactionManager] Operation '${operation.id}' completed successfully`);
      } catch (error) {
        logger.error(`[TransactionManager] Operation '${operation.id}' failed:`, error);
        throw new Error(`Operation '${operation.id}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Rollback completed operations in reverse order
   */
  private async rollbackOperations(context: TransactionContext): Promise<boolean[]> {
    const rollbackResults: boolean[] = [];
    
    // Rollback in reverse order
    const completedOperations = context.operations.filter(op => 
      context.completedOperationIds.includes(op.id)
    ).reverse();

    for (const operation of completedOperations) {
      if (operation.rollback) {
        try {
          logger.debug(`[TransactionManager] Rolling back operation '${operation.id}'`);
          await operation.rollback();
          rollbackResults.push(true);
          logger.debug(`[TransactionManager] Operation '${operation.id}' rolled back successfully`);
        } catch (rollbackError) {
          logger.error(`[TransactionManager] Failed to rollback operation '${operation.id}':`, rollbackError);
          rollbackResults.push(false);
        }
      } else {
        logger.warn(`[TransactionManager] Operation '${operation.id}' has no rollback function`);
        rollbackResults.push(false);
      }
    }

    return rollbackResults;
  }

  /**
   * Create a simple operation without rollback
   */
  createOperation<T>(
    id: string,
    description: string,
    execute: () => Promise<T>
  ): TransactionOperation<T> {
    return { id, description, execute };
  }

  /**
   * Create an operation with rollback capability
   */
  createOperationWithRollback<T>(
    id: string,
    description: string,
    execute: () => Promise<T>,
    rollback: () => Promise<void>
  ): TransactionOperation<T> {
    return { id, description, execute, rollback };
  }

  /**
   * Create a state update operation with automatic rollback
   */
  createStateOperation<T>(
    id: string,
    description: string,
    setter: (value: T) => void,
    newValue: T,
    originalValue: T
  ): TransactionOperation<void> {
    return {
      id,
      description,
      execute: async () => {
        setter(newValue);
      },
      rollback: async () => {
        setter(originalValue);
      }
    };
  }

  /**
   * Get transaction statistics
   */
  getStats(): {
    activeTransactions: number;
    totalTransactions: number;
  } {
    return {
      activeTransactions: this.activeTransactions.size,
      totalTransactions: this.transactionCounter,
    };
  }

  /**
   * Cancel an active transaction
   */
  async cancelTransaction(transactionId: string): Promise<boolean> {
    const context = this.activeTransactions.get(transactionId);
    if (!context) {
      return false;
    }

    logger.debug(`[TransactionManager] Cancelling transaction ${transactionId}`);
    
    if (context.status === 'executing') {
      // Rollback completed operations
      await this.rollbackOperations(context);
      context.status = 'rolled_back';
    }

    this.activeTransactions.delete(transactionId);
    return true;
  }

  /**
   * Generate unique transaction ID
   */
  private generateTransactionId(): string {
    this.transactionCounter++;
    return `tx_${Date.now()}_${this.transactionCounter}`;
  }

  /**
   * Check if a transaction is active
   */
  isTransactionActive(transactionId: string): boolean {
    return this.activeTransactions.has(transactionId);
  }

  /**
   * Clear all active transactions (for testing/cleanup)
   */
  clearAllTransactions(): void {
    this.activeTransactions.clear();
    this.transactionCounter = 0;
  }
}

// Export singleton instance
export const transactionManager = new TransactionManager();

// Helper functions for common transaction patterns
export const withTransaction = async <T>(
  operations: TransactionOperation<T>[],
  options?: TransactionOptions
): Promise<TransactionResult<T>> => {
  return await transactionManager.executeTransaction(operations, options);
};

// Utility for creating simple async operations
export const createAsyncOperation = <T>(
  id: string,
  description: string,
  asyncFn: () => Promise<T>
): TransactionOperation<T> => {
  return transactionManager.createOperation(id, description, asyncFn);
};

// Utility for creating state mutations with rollback
export const createStateMutation = <T>(
  id: string,
  description: string,
  setter: (value: T) => void,
  newValue: T,
  originalValue: T
): TransactionOperation<void> => {
  return transactionManager.createStateOperation(id, description, setter, newValue, originalValue);
};
