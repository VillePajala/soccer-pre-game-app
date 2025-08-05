/**
 * Utility Registry - Dependency Injection for Utility Functions
 * 
 * This registry provides a centralized way to access utility functions
 * without dynamic imports, improving bundle stability and testing.
 * 
 * 🔧 DEPENDENCY INJECTION FIXES:
 * - Replaces dynamic imports for utility functions
 * - Provides centralized error handling and fallbacks
 * - Enables utility function preloading and caching
 * - Supports testing with mock utilities
 */

import logger from '@/utils/logger';

// Utility loader function type
type UtilityLoader<T = any> = () => Promise<T>;

// Registry entry interface
interface UtilityRegistryEntry<T = any> {
  loader: UtilityLoader<T>;
  utility?: T;
  loading: boolean;
  error?: Error;
  preloaded: boolean;
}

class UtilityRegistry {
  private registry = new Map<string, UtilityRegistryEntry>();

  /**
   * Register a utility with lazy loading
   */
  register<T = any>(name: string, loader: UtilityLoader<T>): void {
    this.registry.set(name, {
      loader,
      loading: false,
      preloaded: false,
    });
    logger.debug(`[UtilityRegistry] Registered utility '${name}'`);
  }

  /**
   * Preload a utility (useful for critical utilities)
   */
  async preload(name: string): Promise<void> {
    const entry = this.registry.get(name);
    if (!entry || entry.preloaded || entry.utility) return;

    entry.loading = true;
    try {
      const utility = await entry.loader();
      entry.utility = utility;
      entry.preloaded = true;
      entry.loading = false;
      logger.debug(`[UtilityRegistry] Preloaded utility '${name}'`);
    } catch (error) {
      entry.error = error as Error;
      entry.loading = false;
      logger.error(`[UtilityRegistry] Failed to preload utility '${name}':`, error);
    }
  }

  /**
   * Get a utility function with error handling
   */
  async getUtility<T = any>(name: string): Promise<T | null> {
    const entry = this.registry.get(name);
    if (!entry) {
      logger.warn(`[UtilityRegistry] Utility '${name}' not registered`);
      return null;
    }

    // Return cached utility if available
    if (entry.utility) {
      return entry.utility;
    }

    // Load utility if not already loading
    if (!entry.loading) {
      entry.loading = true;
      try {
        const utility = await entry.loader();
        entry.utility = utility;
        entry.loading = false;
        logger.debug(`[UtilityRegistry] Loaded utility '${name}'`);
        return utility;
      } catch (error) {
        entry.error = error as Error;
        entry.loading = false;
        logger.error(`[UtilityRegistry] Failed to load utility '${name}':`, error);
        return null;
      }
    }

    // Wait for current loading to complete
    while (entry.loading) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return entry.utility || null;
  }

  /**
   * Get a specific function from a utility module
   */
  async getUtilityFunction<T = any>(utilityName: string, functionName: string): Promise<T | null> {
    const utility = await this.getUtility(utilityName);
    if (!utility || typeof utility !== 'object') {
      return null;
    }

    const func = (utility as any)[functionName];
    if (typeof func !== 'function') {
      logger.warn(`[UtilityRegistry] Function '${functionName}' not found in utility '${utilityName}'`);
      return null;
    }

    return func as T;
  }

  /**
   * Execute a utility function with error handling
   */
  async executeUtilityFunction<T = any>(
    utilityName: string, 
    functionName: string, 
    ...args: any[]
  ): Promise<T | null> {
    try {
      const func = await this.getUtilityFunction<(...args: any[]) => T>(utilityName, functionName);
      if (!func) {
        return null;
      }

      const result = await func(...args);
      logger.debug(`[UtilityRegistry] Executed ${utilityName}.${functionName} successfully`);
      return result;
    } catch (error) {
      logger.error(`[UtilityRegistry] Failed to execute ${utilityName}.${functionName}:`, error);
      return null;
    }
  }

  /**
   * Preload multiple utilities in parallel
   */
  async preloadAll(names: string[]): Promise<void> {
    const preloadPromises = names.map(name => this.preload(name));
    await Promise.allSettled(preloadPromises);
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    preloaded: number;
    loading: number;
    errors: number;
  } {
    let preloaded = 0;
    let loading = 0;
    let errors = 0;

    for (const entry of this.registry.values()) {
      if (entry.preloaded || entry.utility) preloaded++;
      if (entry.loading) loading++;
      if (entry.error) errors++;
    }

    return {
      total: this.registry.size,
      preloaded,
      loading,
      errors,
    };
  }

  /**
   * Clear all cached utilities (useful for testing)
   */
  clear(): void {
    this.registry.clear();
  }
}

// Export singleton instance
export const utilityRegistry = new UtilityRegistry();

// Helper function to register common utilities
export const registerExportUtilities = (): void => {
  utilityRegistry.register('exportGames', () => import('@/utils/exportGames'));
  
  logger.debug('[UtilityRegistry] Registered export utilities');
};

// Helper function to execute export functions with fallback
export const executeExportFunction = async (
  functionName: string,
  ...args: any[]
): Promise<boolean> => {
  try {
    const result = await utilityRegistry.executeUtilityFunction('exportGames', functionName, ...args);
    return result !== null;
  } catch (error) {
    logger.error(`[UtilityRegistry] Export function '${functionName}' failed:`, error);
    return false;
  }
};