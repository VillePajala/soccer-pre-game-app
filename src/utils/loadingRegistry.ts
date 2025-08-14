/**
 * PHASE 2: Loading Registry with Auto-Timeout
 * Prevents stuck loading states by automatically timing out operations
 */

interface LoadingEntry {
  timeout: NodeJS.Timeout;
  started: number;
  operation: string;
}

export class LoadingRegistry {
  private registry = new Map<string, LoadingEntry>();
  private defaultTimeoutMs = 10000; // 10 seconds

  setLoading(
    id: string, 
    loading: boolean, 
    onTimeout?: (id: string) => void,
    timeoutMs?: number,
    operation = 'unknown'
  ) {
    if (loading) {
      // Clear any existing timeout for this ID
      this.clearTimeout(id);
      
      const timeout = setTimeout(() => {
        console.warn(`[LoadingRegistry] Operation "${operation}" for ID "${id}" timed out after ${timeoutMs || this.defaultTimeoutMs}ms`);
        this.registry.delete(id);
        onTimeout?.(id);
      }, timeoutMs || this.defaultTimeoutMs);
      
      this.registry.set(id, { 
        timeout, 
        started: Date.now(), 
        operation 
      });
      
      console.debug(`[LoadingRegistry] Started tracking "${operation}" for ID "${id}"`);
    } else {
      this.clearTimeout(id);
    }
  }

  private clearTimeout(id: string) {
    const entry = this.registry.get(id);
    if (entry) {
      clearTimeout(entry.timeout);
      const duration = Date.now() - entry.started;
      console.debug(`[LoadingRegistry] Completed "${entry.operation}" for ID "${id}" in ${duration}ms`);
      this.registry.delete(id);
    }
  }

  isLoading(id: string): boolean {
    return this.registry.has(id);
  }

  getLoadingOperations(): Array<{ id: string; operation: string; duration: number }> {
    const now = Date.now();
    return Array.from(this.registry.entries()).map(([id, entry]) => ({
      id,
      operation: entry.operation,
      duration: now - entry.started
    }));
  }

  clearAll() {
    for (const [id] of this.registry) {
      this.clearTimeout(id);
    }
  }
}

// Singleton instance
export const loadingRegistry = new LoadingRegistry();