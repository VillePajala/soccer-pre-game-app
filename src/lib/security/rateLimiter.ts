/**
 * Rate Limiting System for Authentication
 * 
 * Provides protection against:
 * - Brute force login attempts
 * - Password reset spam
 * - Account enumeration attacks
 * - Excessive API requests
 */

import logger from '../../utils/logger';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
  progressiveDelay?: boolean;
}

interface AttemptRecord {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  blockedUntil?: number;
}

export class RateLimiter {
  private attempts: Map<string, AttemptRecord> = new Map();
  private readonly config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Cleanup old entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.windowMs);
  }

  /**
   * Check if an action is allowed for a given key
   */
  isAllowed(key: string): { allowed: boolean; retryAfter?: number; attemptsRemaining?: number } {
    const now = Date.now();
    const record = this.attempts.get(key);

    // No previous attempts - allow
    if (!record) {
      return { allowed: true, attemptsRemaining: this.config.maxAttempts - 1 };
    }

    // Check if currently blocked
    if (record.blockedUntil && now < record.blockedUntil) {
      const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
      logger.warn(`Rate limit blocked for key ${key}, retry after ${retryAfter}s`);
      return { allowed: false, retryAfter };
    }

    // Check if window has expired
    if (now - record.firstAttempt > this.config.windowMs) {
      // Window expired, reset counter
      this.attempts.delete(key);
      return { allowed: true, attemptsRemaining: this.config.maxAttempts - 1 };
    }

    // Check if limit exceeded
    if (record.count >= this.config.maxAttempts) {
      // Block for the specified duration
      const blockedUntil = now + this.config.blockDurationMs;
      this.attempts.set(key, {
        ...record,
        blockedUntil
      });
      
      const retryAfter = Math.ceil(this.config.blockDurationMs / 1000);
      logger.warn(`Rate limit exceeded for key ${key}, blocked for ${retryAfter}s`);
      return { allowed: false, retryAfter };
    }

    // Within limits
    const attemptsRemaining = this.config.maxAttempts - record.count;
    return { allowed: true, attemptsRemaining };
  }

  /**
   * Record an attempt for a given key
   */
  recordAttempt(key: string, success: boolean = false): void {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now,
        lastAttempt: now
      });
    } else {
      // If window expired, reset
      if (now - record.firstAttempt > this.config.windowMs) {
        this.attempts.set(key, {
          count: 1,
          firstAttempt: now,
          lastAttempt: now
        });
      } else {
        this.attempts.set(key, {
          ...record,
          count: record.count + 1,
          lastAttempt: now
        });
      }
    }

    // If successful, optionally reset the counter
    if (success) {
      this.attempts.delete(key);
      logger.info(`Successful attempt for key ${key}, counter reset`);
    }
  }

  /**
   * Get progressive delay based on attempt count
   */
  getProgressiveDelay(key: string): number {
    if (!this.config.progressiveDelay) return 0;

    const record = this.attempts.get(key);
    if (!record) return 0;

    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return Math.min(Math.pow(2, record.count - 1) * 1000, 30000); // Max 30 seconds
  }

  /**
   * Reset attempts for a key
   */
  reset(key: string): void {
    this.attempts.delete(key);
  }

  /**
   * Get attempt info for a key
   */
  getAttemptInfo(key: string): AttemptRecord | null {
    return this.attempts.get(key) || null;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, record] of this.attempts.entries()) {
      // Remove if window expired and not blocked
      if (now - record.firstAttempt > this.config.windowMs && 
          (!record.blockedUntil || now > record.blockedUntil)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.attempts.delete(key));
    
    if (keysToDelete.length > 0) {
      logger.info(`Cleaned up ${keysToDelete.length} expired rate limit entries`);
    }
  }

  /**
   * Get current stats
   */
  getStats(): { totalKeys: number; blockedKeys: number } {
    const now = Date.now();
    let blockedKeys = 0;

    for (const record of this.attempts.values()) {
      if (record.blockedUntil && now < record.blockedUntil) {
        blockedKeys++;
      }
    }

    return {
      totalKeys: this.attempts.size,
      blockedKeys
    };
  }

  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.attempts.clear();
  }
}

// Pre-configured rate limiters for different use cases
export const authRateLimiter = new RateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  blockDurationMs: 15 * 60 * 1000, // 15 minutes block
  progressiveDelay: true
});

export const passwordResetRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // 1 hour block
  progressiveDelay: true
});

export const signupRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 30 * 60 * 1000, // 30 minutes block
  progressiveDelay: false
});

/**
 * Utility functions for creating rate limit keys
 */
export const RateLimitKeys = {
  /**
   * Create key for login attempts by email
   */
  loginByEmail: (email: string): string => `login:email:${email.toLowerCase()}`,

  /**
   * Create key for login attempts by IP (if available)
   */
  loginByIP: (ip: string): string => `login:ip:${ip}`,

  /**
   * Create key for password reset by email
   */
  passwordResetByEmail: (email: string): string => `reset:email:${email.toLowerCase()}`,

  /**
   * Create key for signup attempts by email
   */
  signupByEmail: (email: string): string => `signup:email:${email.toLowerCase()}`,

  /**
   * Create key for signup attempts by IP
   */
  signupByIP: (ip: string): string => `signup:ip:${ip}`,

  /**
   * Create key for general actions by user ID
   */
  actionByUser: (userId: string, action: string): string => `action:${action}:user:${userId}`,
};

/**
 * Enhanced authentication wrapper with rate limiting
 */
export class SecureAuthService {
  /**
   * Secure sign in with rate limiting
   */
  static async signIn(email: string, password: string, clientIP?: string): Promise<{
    success: boolean;
    error?: string;
    rateLimited?: boolean;
    retryAfter?: number;
    progressiveDelay?: number;
  }> {
    const emailKey = RateLimitKeys.loginByEmail(email);
    const ipKey = clientIP ? RateLimitKeys.loginByIP(clientIP) : null;

    // Check rate limits
    const emailLimit = authRateLimiter.isAllowed(emailKey);
    const ipLimit = ipKey ? authRateLimiter.isAllowed(ipKey) : { allowed: true };

    if (!emailLimit.allowed) {
      logger.warn(`Login rate limited for email: ${email}`);
      return {
        success: false,
        error: 'Too many failed login attempts. Please try again later.',
        rateLimited: true,
        retryAfter: emailLimit.retryAfter
      };
    }

    if (!ipLimit.allowed) {
      logger.warn(`Login rate limited for IP: ${clientIP}`);
      return {
        success: false,
        error: 'Too many failed login attempts from this location. Please try again later.',
        rateLimited: true,
        retryAfter: ipLimit.retryAfter
      };
    }

    // Apply progressive delay if configured
    const progressiveDelay = authRateLimiter.getProgressiveDelay(emailKey);
    if (progressiveDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, progressiveDelay));
    }

    try {
      // Here we would call the actual Supabase auth
      // For now, we'll simulate the auth call
      const result = await simulateAuth(email, password);

      // Record the attempt
      authRateLimiter.recordAttempt(emailKey, result.success);
      if (ipKey) {
        authRateLimiter.recordAttempt(ipKey, result.success);
      }

      return {
        success: result.success,
        error: result.error,
        progressiveDelay: progressiveDelay > 0 ? progressiveDelay : undefined
      };

    } catch (error) {
      // Record failed attempt
      authRateLimiter.recordAttempt(emailKey, false);
      if (ipKey) {
        authRateLimiter.recordAttempt(ipKey, false);
      }

      logger.error('Auth service error:', error);
      return {
        success: false,
        error: 'Authentication service error. Please try again.'
      };
    }
  }

  /**
   * Secure password reset with rate limiting
   */
  static async resetPassword(email: string): Promise<{
    success: boolean;
    error?: string;
    rateLimited?: boolean;
    retryAfter?: number;
  }> {
    const key = RateLimitKeys.passwordResetByEmail(email);
    const limit = passwordResetRateLimiter.isAllowed(key);

    if (!limit.allowed) {
      logger.warn(`Password reset rate limited for email: ${email}`);
      return {
        success: false,
        error: 'Too many password reset attempts. Please try again later.',
        rateLimited: true,
        retryAfter: limit.retryAfter
      };
    }

    try {
      // Record attempt (password resets are always recorded as attempts)
      passwordResetRateLimiter.recordAttempt(key, false);

      // Here we would call the actual Supabase password reset
      // For now, simulate success
      return { success: true };

    } catch (error) {
      logger.error('Password reset error:', error);
      return {
        success: false,
        error: 'Password reset service error. Please try again.'
      };
    }
  }

  /**
   * Secure sign up with rate limiting
   */
  static async signUp(email: string, password: string, clientIP?: string): Promise<{
    success: boolean;
    error?: string;
    rateLimited?: boolean;
    retryAfter?: number;
  }> {
    const emailKey = RateLimitKeys.signupByEmail(email);
    const ipKey = clientIP ? RateLimitKeys.signupByIP(clientIP) : null;

    // Check rate limits
    const emailLimit = signupRateLimiter.isAllowed(emailKey);
    const ipLimit = ipKey ? signupRateLimiter.isAllowed(ipKey) : { allowed: true };

    if (!emailLimit.allowed) {
      return {
        success: false,
        error: 'Too many signup attempts. Please try again later.',
        rateLimited: true,
        retryAfter: emailLimit.retryAfter
      };
    }

    if (!ipLimit.allowed) {
      return {
        success: false,
        error: 'Too many signup attempts from this location. Please try again later.',
        rateLimited: true,
        retryAfter: ipLimit.retryAfter
      };
    }

    try {
      // Record attempt
      signupRateLimiter.recordAttempt(emailKey, true); // Signups are generally successful if they pass validation
      if (ipKey) {
        signupRateLimiter.recordAttempt(ipKey, true);
      }

      // Here we would call the actual Supabase signup
      return { success: true };

    } catch (error) {
      logger.error('Signup error:', error);
      return {
        success: false,
        error: 'Signup service error. Please try again.'
      };
    }
  }
}

/**
 * Simulate auth for development (replace with actual Supabase calls)
 */
async function simulateAuth(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  
  // Simulate some failed attempts for testing
  if (password === 'wrongpassword') {
    return { success: false, error: 'Invalid credentials' };
  }
  
  return { success: true };
}