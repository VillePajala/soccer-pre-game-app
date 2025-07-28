// Authentication-aware storage manager
import { StorageManager } from './storageManager';
import { getStorageConfig, isSupabaseEnabled } from './config';
import type { StorageConfig } from './types';

export class AuthAwareStorageManager extends StorageManager {
  private authState: { isAuthenticated: boolean; userId: string | null } = {
    isAuthenticated: false,
    userId: null,
  };

  constructor() {
    // Start with localStorage until auth state is known
    super({
      provider: 'localStorage',
      fallbackToLocalStorage: false,
    });
    
    // Will be reconfigured when auth state is updated
  }

  /**
   * Update authentication state and reconfigure storage accordingly
   */
  updateAuthState(isAuthenticated: boolean, userId: string | null = null): void {
    const previousAuth = this.authState.isAuthenticated;
    this.authState = { isAuthenticated, userId };

    // Only reconfigure if auth state actually changed
    if (previousAuth !== isAuthenticated) {
      this.reconfigureForAuthState();
    }
  }

  /**
   * Get current authentication state
   */
  getAuthState(): { isAuthenticated: boolean; userId: string | null } {
    return { ...this.authState };
  }

  /**
   * Reconfigure storage based on current authentication state
   */
  private reconfigureForAuthState(): void {
    if (!isSupabaseEnabled()) {
      // If Supabase is not enabled, always use localStorage
      this.setConfig({
        provider: 'localStorage',
        fallbackToLocalStorage: false,
      });
      return;
    }

    // Use the recommended provider based on auth state
    const recommendedProvider = this.getRecommendedProvider();
    const baseConfig = getStorageConfig();
    
    // Override the provider based on authentication state
    const newConfig: StorageConfig = {
      ...baseConfig,
      provider: recommendedProvider,
      // Keep fallback enabled when using Supabase
      fallbackToLocalStorage: recommendedProvider === 'supabase' ? baseConfig.fallbackToLocalStorage : false,
    };

    this.setConfig(newConfig);
  }

  /**
   * Force switch to a specific provider (useful for testing or migration)
   */
  async forceProvider(provider: 'localStorage' | 'supabase'): Promise<void> {
    const config: StorageConfig = {
      provider,
      fallbackToLocalStorage: provider === 'supabase',
    };
    
    this.setConfig(config);
  }

  /**
   * Get recommended provider based on current state
   */
  getRecommendedProvider(): 'localStorage' | 'supabase' {
    if (!isSupabaseEnabled()) {
      return 'localStorage';
    }

    return this.authState.isAuthenticated ? 'supabase' : 'localStorage';
  }

  /**
   * Check if provider switching is available
   */
  canSwitchToSupabase(): boolean {
    return isSupabaseEnabled() && this.authState.isAuthenticated;
  }

  /**
   * Test connection and return status with auth info
   */
  async getStatus(): Promise<{
    currentProvider: string;
    recommendedProvider: string;
    isAuthenticated: boolean;
    canUseSupabase: boolean;
    online: boolean;
    error?: string;
  }> {
    const connectionTest = await this.testConnection();
    
    return {
      currentProvider: this.getCurrentProviderName(),
      recommendedProvider: this.getRecommendedProvider(),
      isAuthenticated: this.authState.isAuthenticated,
      canUseSupabase: this.canSwitchToSupabase(),
      online: connectionTest.online,
      error: connectionTest.error,
    };
  }
}

// Export singleton instance
export const authAwareStorageManager = new AuthAwareStorageManager();