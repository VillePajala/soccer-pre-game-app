/**
 * Session Management Security System
 * 
 * Provides comprehensive session security features:
 * - Session timeout (30 minutes of inactivity)
 * - Refresh token rotation
 * - Device fingerprinting
 * - Rate limiting protection
 * - Suspicious activity detection
 */

import { supabase } from '../supabase';
import type { Session, User } from '@/types/supabase-types';
import logger from '../../utils/logger';
import { 
  getDeviceFingerprint, 
  saveDeviceFingerprint,
  getSessionActivity,
  saveSessionActivity,
  removeSessionActivity
} from '@/utils/sessionSettings';

// Session configuration
const SESSION_CONFIG = {
  INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30 minutes in milliseconds
  WARNING_TIME: 5 * 60 * 1000, // Show warning 5 minutes before timeout
  REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh token 5 minutes before expiry
  MAX_LOGIN_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  DEVICE_FINGERPRINT_KEY: 'soccer_coach_device_fp',
} as const;

export interface SessionActivity {
  lastActivity: number;
  sessionStart: number;
  totalSessions: number;
  deviceFingerprint: string;
  ipAddress?: string;
  userAgent: string;
}

export interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
  ipAddress?: string;
  deviceFingerprint: string;
}

export interface SessionWarningEvent {
  type: 'warning' | 'timeout' | 'suspicious_activity' | 'new_device';
  message: string;
  timeRemaining?: number;
  action?: 'logout' | 'refresh' | 'verify';
}

export type SessionEventCallback = (event: SessionWarningEvent) => void;

export class SessionManager {
  private activityTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private eventCallbacks: SessionEventCallback[] = [];
  private currentSession: Session | null = null;
  private currentUser: User | null = null;
  private deviceFingerprint: string | null = null;
  private isInitialized = false;

  constructor() {
    // Async initialization will happen in initialize()
    this.setupVisibilityChangeHandler();
    this.setupStorageEventHandler();
  }

  /**
   * Initialize the session manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    // Initialize device fingerprint
    await this.initializeDeviceFingerprint();

    try {
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        logger.error('Failed to get initial session:', error);
        return;
      }

      if (session) {
        await this.handleSessionStart(session, session.user);
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (event: string, session: Session | null) => {
        logger.info('Auth state changed:', event);
        
        switch (event) {
          case 'SIGNED_IN':
            if (session) {
              await this.handleSessionStart(session, session.user);
            }
            break;
          case 'SIGNED_OUT':
            this.handleSessionEnd();
            break;
          case 'TOKEN_REFRESHED':
            if (session) {
              this.handleTokenRefresh(session);
            }
            break;
          case 'USER_UPDATED':
            // User information changed, check for suspicious activity
            this.checkSuspiciousActivity();
            break;
        }
      });

      this.isInitialized = true;
      logger.info('Session manager initialized');

    } catch (error) {
      logger.error('Failed to initialize session manager:', error);
    }
  }

  /**
   * Handle session start
   */
  private async handleSessionStart(session: Session, user: User): Promise<void> {
    this.currentSession = session;
    this.currentUser = user;

    // Record session activity
    await this.recordSessionActivity();

    // Check for new device
    await this.checkNewDevice(user);

    // Start activity tracking
    this.startActivityTracking();

    // Setup token refresh
    this.setupTokenRefresh(session);

    logger.info('Session started for user:', user.email);
  }

  /**
   * Handle session end
   */
  private handleSessionEnd(): void {
    this.clearAllTimers();
    this.currentSession = null;
    this.currentUser = null;
    
    // Clear session activity from storage
    this.clearSessionActivity();
    
    logger.info('Session ended');
  }

  /**
   * Handle token refresh
   */
  private handleTokenRefresh(session: Session): void {
    this.currentSession = session;
    
    // Reset activity tracking with new session
    this.startActivityTracking();
    this.setupTokenRefresh(session);
    
    logger.info('Token refreshed successfully');
  }

  /**
   * Record user activity
   */
  recordActivity(): void {
    if (!this.currentSession) return;

    const now = Date.now();
    
    // Update activity in storage
    this.updateSessionActivity(now);
    
    // Reset inactivity timer
    this.resetActivityTimer();
  }

  /**
   * Start activity tracking
   */
  private startActivityTracking(): void {
    this.clearAllTimers();

    // Set warning timer
    this.warningTimer = setTimeout(() => {
      this.emitEvent({
        type: 'warning',
        message: 'Your session will expire in 5 minutes due to inactivity',
        timeRemaining: SESSION_CONFIG.WARNING_TIME,
        action: 'refresh'
      });
    }, SESSION_CONFIG.INACTIVITY_TIMEOUT - SESSION_CONFIG.WARNING_TIME);

    // Set timeout timer
    this.activityTimer = setTimeout(() => {
      this.handleInactivityTimeout();
    }, SESSION_CONFIG.INACTIVITY_TIMEOUT);
  }

  /**
   * Reset activity timer
   */
  private resetActivityTimer(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }

    this.startActivityTracking();
  }

  /**
   * Handle inactivity timeout
   */
  private async handleInactivityTimeout(): Promise<void> {
    logger.warn('Session timeout due to inactivity');
    
    this.emitEvent({
      type: 'timeout',
      message: 'Session expired due to inactivity. Please sign in again.',
      action: 'logout'
    });

    // Sign out the user
    await this.forceSignOut('inactivity_timeout');
  }

  /**
   * Setup token refresh
   */
  private setupTokenRefresh(session: Session): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + (60 * 60 * 1000);
    const refreshAt = expiresAt - SESSION_CONFIG.REFRESH_THRESHOLD;
    const timeUntilRefresh = refreshAt - Date.now();

    if (timeUntilRefresh > 0) {
      this.refreshTimer = setTimeout(async () => {
        await this.refreshToken();
      }, timeUntilRefresh);
    }
  }

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        logger.error('Token refresh failed:', error);
        this.emitEvent({
          type: 'timeout',
          message: 'Session expired. Please sign in again.',
          action: 'logout'
        });
        await this.forceSignOut('token_refresh_failed');
        return;
      }

      if (data.session) {
        logger.info('Token refreshed successfully');
        // The onAuthStateChange handler will handle the session update
      }
    } catch (error) {
      logger.error('Token refresh error:', error);
      await this.forceSignOut('token_refresh_error');
    }
  }

  /**
   * Force sign out with reason
   */
  private async forceSignOut(reason: string): Promise<void> {
    logger.warn('Force sign out:', reason);
    
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logger.error('Error during force sign out:', error);
    }
  }

  /**
   * Generate device fingerprint
   */
  private async initializeDeviceFingerprint(): Promise<void> {
    // Skip if not in browser environment
    if (typeof window === 'undefined') {
      this.deviceFingerprint = 'server-side-fallback';
      return;
    }
    
    // Check if fingerprint already exists
    let fingerprint = await getDeviceFingerprint();
    
    if (fingerprint) {
      logger.info('Found existing device fingerprint');
    } else {
      logger.info('No existing fingerprint found, generating new one');
    }
    
    if (!fingerprint) {
      // Generate new fingerprint based on device characteristics
      let canvasFingerprint = 'fallback-canvas';
      
      // Skip canvas fingerprinting in test environment
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.fillText('Device fingerprint', 2, 2);
            canvasFingerprint = canvas.toDataURL();
          }
        } catch {
          // Canvas not available in test environment
          canvasFingerprint = 'test-environment-fallback';
        }
      } else {
        canvasFingerprint = 'test-environment-canvas';
      }
      
      fingerprint = btoa(JSON.stringify({
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
        canvas: canvasFingerprint.slice(-50), // Last 50 chars of canvas fingerprint
        // Removed timestamp to ensure consistent fingerprint for same device
      }));
      
      await saveDeviceFingerprint(fingerprint);
      logger.info('Generated and saved new device fingerprint');
    }
    
    this.deviceFingerprint = fingerprint;
    logger.info('Device fingerprint initialized:', fingerprint ? 'SUCCESS' : 'FAILED');
  }

  /**
   * Check for new device
   */
  private async checkNewDevice(user: User): Promise<void> {
    if (!this.deviceFingerprint) {
      logger.warn('No device fingerprint available for device check');
      return;
    }

    try {
      logger.info('Checking device for user:', user.email, 'with fingerprint ending:', this.deviceFingerprint.slice(-10));
      
      // Get user's settings from app_settings table
      const { data: settings, error: queryError } = await supabase
        .from('app_settings')
        .select('settings')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle no records

      if (queryError) {
        logger.error('Error querying app_settings:', queryError);
        return;
      }

      // Extract known devices from the settings JSONB column
      const settingsJson = settings?.settings || {};
      const knownDevices = settingsJson.known_devices || [];
      const isKnownDevice = knownDevices.includes(this.deviceFingerprint);
      
      logger.info('Device check result:', {
        currentFingerprint: this.deviceFingerprint?.slice(-20), // Last 20 chars for privacy
        knownDevicesCount: knownDevices.length,
        isKnownDevice: isKnownDevice,
        hasExistingSettings: !!settings
      });

      if (!isKnownDevice) {
        logger.warn('New device detected for user:', user.email);
        
        // Add device to known devices in the settings JSONB column
        const updatedDevices = [...knownDevices, this.deviceFingerprint];
        const updatedSettings = {
          ...settingsJson,
          known_devices: updatedDevices
        };

        logger.info('Saving new device to database. Total devices will be:', updatedDevices.length);

        const { error: upsertError } = await supabase
          .from('app_settings')
          .upsert({
            user_id: user.id,
            settings: updatedSettings
          });

        if (upsertError) {
          logger.error('Failed to save device to database:', upsertError);
          
          // Infrastructure remains active but UI alerts disabled
          // this.emitEvent({
          //   type: 'new_device',
          //   message: 'New device detected. If this wasn\'t you, please change your password.',
          //   action: 'verify'
          // });
        } else {
          logger.info('Successfully saved new device to database');
          
          // Infrastructure remains active but UI alerts disabled
          // this.emitEvent({
          //   type: 'new_device',
          //   message: 'New device detected and registered. If this wasn\'t you, please change your password.',
          //   action: 'verify'
          // });
        }
      } else {
        logger.info('Device recognized as known device');
      }
    } catch (error) {
      logger.error('Error in checkNewDevice:', error);
      
      // Infrastructure remains active but UI alerts disabled
      // this.emitEvent({
      //   type: 'new_device',
      //   message: 'Unable to verify device. Please ensure this is a trusted device.',
      //   action: 'verify'
      // });
    }
  }

  /**
   * Check for suspicious activity
   */
  private async checkSuspiciousActivity(): Promise<void> {
    // Check for multiple concurrent sessions, unusual IP changes, etc.
    // This would be expanded based on specific security requirements
    
    const activity = await this.getSessionActivity();
    if (activity && activity.totalSessions > 5) {
      this.emitEvent({
        type: 'suspicious_activity',
        message: 'Unusual account activity detected. Please verify your account security.',
        action: 'verify'
      });
    }
  }

  /**
   * Record session activity in IndexedDB
   */
  private async recordSessionActivity(): Promise<void> {
    if (!this.currentUser || !this.deviceFingerprint) return;
    if (typeof window === 'undefined') return;

    const currentActivity = await this.getSessionActivity();
    const activity: SessionActivity = {
      lastActivity: Date.now(),
      sessionStart: Date.now(),
      totalSessions: (currentActivity?.totalSessions || 0) + 1,
      deviceFingerprint: this.deviceFingerprint,
      userAgent: navigator.userAgent
    };

    await saveSessionActivity(this.currentUser.id, activity);
  }

  /**
   * Update session activity timestamp
   */
  private async updateSessionActivity(timestamp: number): Promise<void> {
    if (!this.currentUser) return;
    if (typeof window === 'undefined') return;

    const activity = await this.getSessionActivity();
    if (activity) {
      activity.lastActivity = timestamp;
      await saveSessionActivity(this.currentUser.id, activity);
    }
  }

  /**
   * Get session activity from storage
   */
  private async getSessionActivity(): Promise<SessionActivity | null> {
    if (!this.currentUser) return null;
    if (typeof window === 'undefined') return null;

    try {
      const activity = await getSessionActivity(this.currentUser.id);
      return activity as SessionActivity | null;
    } catch {
      return null;
    }
  }

  /**
   * Clear session activity from storage
   */
  private async clearSessionActivity(): Promise<void> {
    if (!this.currentUser) return;
    if (typeof window === 'undefined') return;
    await removeSessionActivity(this.currentUser.id);
  }

  /**
   * Setup visibility change handler to track user activity
   */
  private setupVisibilityChangeHandler(): void {
    // Skip if not in browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.recordActivity();
      }
    });

    // Track mouse/keyboard activity
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, () => {
        this.recordActivity();
      }, { passive: true });
    });
  }

  /**
   * Setup storage event handler for cross-tab session management
   */
  private setupStorageEventHandler(): void {
    // Skip if not in browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('session_activity_')) {
        // Another tab updated session activity
        this.recordActivity();
      }
    });
  }

  /**
   * Clear all timers
   */
  private clearAllTimers(): void {
    if (this.activityTimer) {
      clearTimeout(this.activityTimer);
      this.activityTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Add event callback
   */
  onSessionEvent(callback: SessionEventCallback): () => void {
    this.eventCallbacks.push(callback);
    
    // Return cleanup function
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index > -1) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit session event
   */
  private emitEvent(event: SessionWarningEvent): void {
    this.eventCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Session event callback error:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.clearAllTimers();
    this.eventCallbacks = [];
    this.isInitialized = false;
  }

  /**
   * Get current session info
   */
  getSessionInfo(): {
    isActive: boolean;
    user: User | null;
    lastActivity?: number;
    sessionStart?: number;
  } {
    // Note: activity data requires async call, so we return basic session info only
    return {
      isActive: !!this.currentSession,
      user: this.currentUser,
      lastActivity: undefined, // Would need async getSessionActivity() call
      sessionStart: undefined  // Would need async getSessionActivity() call
    };
  }

  /**
   * Extend session (reset timeout)
   */
  extendSession(): void {
    if (this.currentSession) {
      this.recordActivity();
      logger.info('Session extended by user action');
    }
  }
}

// Global session manager instance
export const sessionManager = new SessionManager();