/**
 * Request Debouncing & Batching for Storage Operations
 * Implements Phase 4 Storage Layer Performance optimization
 * Combines rapid successive requests to reduce server load and improve performance
 */

export interface DebouncedRequest {
  key: string;
  operation: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timestamp: number;
  data?: unknown;
}

export interface BatchConfig {
  debounceMs: number;
  maxBatchSize: number;
  maxWaitMs: number;
}

export class RequestDebouncer {
  private pendingRequests: Map<string, DebouncedRequest[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private config: BatchConfig;

  constructor(config: BatchConfig = {
    debounceMs: 500,
    maxBatchSize: 10,
    maxWaitMs: 2000
  }) {
    this.config = config;
  }

  /**
   * Debounce a request - combines multiple calls with the same key
   */
  async debounce<T>(
    key: string, 
    operation: () => Promise<T>,
    data?: unknown
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const request: DebouncedRequest = {
        key,
        operation: operation as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject: reject as (error: unknown) => void,
        timestamp: Date.now(),
        data
      };

      // Add to pending requests
      if (!this.pendingRequests.has(key)) {
        this.pendingRequests.set(key, []);
      }
      
      const requests = this.pendingRequests.get(key)!;
      requests.push(request);

      // Clear existing timer
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key)!);
      }

      // Check if we should execute immediately (batch is full)
      if (requests.length >= this.config.maxBatchSize) {
        this.executeRequests(key);
        return;
      }

      // Check if we've been waiting too long
      const oldestRequest = requests[0];
      const waitTime = Date.now() - oldestRequest.timestamp;
      
      if (waitTime >= this.config.maxWaitMs) {
        this.executeRequests(key);
        return;
      }

      // Set new timer
      const timer = setTimeout(() => {
        this.executeRequests(key);
      }, this.config.debounceMs);
      
      this.timers.set(key, timer);
    });
  }

  /**
   * Batch multiple save operations together
   */
  async batchSave<T>(
    key: string,
    items: T[],
    saveOperation: (batch: T[]) => Promise<T[]>
  ): Promise<T[]> {
    const batchKey = `batch_${key}`;
    
    return this.debounce(batchKey, async () => {
      // Collect all items from pending requests
      const requests = this.pendingRequests.get(batchKey) || [];
      const allItems: T[] = [];
      
      for (const request of requests) {
        if (request.data) {
          if (Array.isArray(request.data)) {
            allItems.push(...request.data);
          } else {
            allItems.push(request.data as T);
          }
        }
      }

      // Execute batch operation
      try {
        const results = await saveOperation(allItems);
        
        // Resolve all pending requests with their portion of results
        let resultIndex = 0;
        for (const request of requests) {
          const itemCount = Array.isArray(request.data) ? request.data.length : 1;
          const requestResults = results.slice(resultIndex, resultIndex + itemCount);
          request.resolve(requestResults);
          resultIndex += itemCount;
        }

        return results;
      } catch (error) {
        // Reject all pending requests
        for (const request of requests) {
          request.reject(error);
        }
        throw error;
      }
    }, items);
  }

  /**
   * Debounce player roster updates
   */
  async debouncedPlayerUpdate(
    playerId: string,
    updates: Record<string, unknown>,
    updateOperation: (id: string, data: Record<string, unknown>) => Promise<unknown>
  ): Promise<unknown> {
    const key = `player_update_${playerId}`;
    
    return this.debounce(key, async () => {
      // Get the most recent update data
      const requests = this.pendingRequests.get(key) || [];
      // Use the most recent update data
      
      // Merge all update data
      const mergedUpdates = requests.reduce((merged, req) => {
        return { ...merged, ...(req.data as Record<string, unknown>) };
      }, {} as Record<string, unknown>);

      try {
        const result = await updateOperation(playerId, mergedUpdates);
        
        // Resolve all requests with the same result
        for (const request of requests) {
          request.resolve(result);
        }
        
        return result;
      } catch (error) {
        // Reject all requests
        for (const request of requests) {
          request.reject(error);
        }
        throw error;
      }
    }, updates);
  }

  /**
   * Debounce game state saves
   */
  async debouncedGameSave(
    gameId: string,
    gameData: Record<string, unknown>,
    saveOperation: (id: string, data: Record<string, unknown>) => Promise<unknown>
  ): Promise<unknown> {
    const key = `game_save_${gameId}`;
    
    return this.debounce(key, async () => {
      // Get the most recent game data
      const requests = this.pendingRequests.get(key) || [];
      const latestRequest = requests[requests.length - 1];
      
      try {
        const result = await saveOperation(gameId, latestRequest.data as Record<string, unknown>);
        
        // Resolve all requests with the same result
        for (const request of requests) {
          request.resolve(result);
        }
        
        return result;
      } catch (error) {
        // Reject all requests
        for (const request of requests) {
          request.reject(error);
        }
        throw error;
      }
    }, gameData);
  }

  /**
   * Smart debouncing for auto-save operations
   */
  async debouncedAutoSave<T>(
    key: string,
    data: T,
    saveOperation: (data: T) => Promise<unknown>,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<unknown> {
    // Adjust debounce timing based on priority
    const originalDebounce = this.config.debounceMs;
    
    switch (priority) {
      case 'high':
        this.config.debounceMs = 100; // Fast save for critical data
        break;
      case 'low':
        this.config.debounceMs = 1000; // Slower save for non-critical data
        break;
      default:
        this.config.debounceMs = 500; // Normal timing
    }

    try {
      return await this.debounce(`autosave_${key}`, async () => {
        const requests = this.pendingRequests.get(`autosave_${key}`) || [];
        const latestRequest = requests[requests.length - 1];
        
        const result = await saveOperation(latestRequest.data as T);
        
        // Resolve all requests
        for (const request of requests) {
          request.resolve(result);
        }
        
        return result;
      }, data);
    } finally {
      // Restore original debounce timing
      this.config.debounceMs = originalDebounce;
    }
  }

  private async executeRequests(key: string): Promise<void> {
    const requests = this.pendingRequests.get(key);
    if (!requests || requests.length === 0) return;

    // Clear timer and pending requests
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
    this.pendingRequests.delete(key);

    // For single operation requests, execute the last one
    if (requests.length === 1 || key.includes('_update_') || key.includes('_save_')) {
      const lastRequest = requests[requests.length - 1];
      try {
        const result = await lastRequest.operation();
        
        // Resolve all requests with the same result
        for (const request of requests) {
          request.resolve(result);
        }
      } catch (error) {
        // Reject all requests
        for (const request of requests) {
          request.reject(error);
        }
      }
    } else {
      // For batch operations, execute each operation
      for (const request of requests) {
        try {
          const result = await request.operation();
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      }
    }
  }

  /**
   * Force execute all pending requests immediately
   */
  async flush(): Promise<void> {
    const keys = Array.from(this.pendingRequests.keys());
    await Promise.all(keys.map(key => this.executeRequests(key)));
  }

  /**
   * Clear all pending requests
   */
  clear(): void {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.timers.clear();
    this.pendingRequests.clear();
  }

  /**
   * Get statistics about pending requests
   */
  getStats(): {
    pendingBatches: number;
    totalPendingRequests: number;
    oldestRequestAge: number;
  } {
    const pendingBatches = this.pendingRequests.size;
    let totalRequests = 0;
    let oldestTimestamp = Date.now();

    for (const requests of this.pendingRequests.values()) {
      totalRequests += requests.length;
      for (const request of requests) {
        if (request.timestamp < oldestTimestamp) {
          oldestTimestamp = request.timestamp;
        }
      }
    }

    return {
      pendingBatches,
      totalPendingRequests: totalRequests,
      oldestRequestAge: totalRequests > 0 ? Date.now() - oldestTimestamp : 0,
    };
  }
}

// Export singleton instance with default configuration
export const requestDebouncer = new RequestDebouncer();