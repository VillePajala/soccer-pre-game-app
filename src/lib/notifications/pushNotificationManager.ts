/**
 * Push Notification Manager for Soccer Coaching App
 * Handles push notification subscriptions, permissions, and messaging for game alerts and sync notifications
 */

interface NotificationData {
  url?: string;
  [key: string]: unknown;
}

interface NotificationConfig {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: NotificationData;
  actions?: NotificationAction[];
  requireInteraction?: boolean;
  silent?: boolean;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

interface PushSubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userId?: string;
  subscribedAt: number;
}

export class PushNotificationManager {
  private vapidPublicKey: string;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor(vapidPublicKey?: string) {
    // In production, this would come from environment variables
    this.vapidPublicKey = vapidPublicKey || 'demo-vapid-key-for-development';
  }

  /**
   * Initialize push notification system
   */
  async initialize(registration?: ServiceWorkerRegistration): Promise<boolean> {
    try {
      // Check for service worker support
      if (!('serviceWorker' in navigator)) {
        console.warn('[Push] Service Worker not supported');
        return false;
      }

      // Check for push messaging support
      if (!('PushManager' in window)) {
        console.warn('[Push] Push messaging not supported');
        return false;
      }

      // Get or use provided service worker registration
      if (registration) {
        this.swRegistration = registration;
      } else {
        this.swRegistration = await navigator.serviceWorker.ready;
      }

      console.log('[Push] Push notification system initialized');
      return true;
    } catch (error) {
      console.error('[Push] Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    try {
      if (!('Notification' in window)) {
        console.warn('[Push] Notifications not supported');
        return 'denied';
      }

      let permission = Notification.permission;

      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      console.log('[Push] Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('[Push] Failed to request notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<PushSubscriptionInfo | null> {
    try {
      if (!this.swRegistration) {
        console.error('[Push] Service worker not registered');
        return null;
      }

      // Check if already subscribed
      const existingSubscription = await this.swRegistration.pushManager.getSubscription();
      if (existingSubscription) {
        return this.formatSubscription(existingSubscription);
      }

      // Request permission first
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('[Push] Notification permission denied');
        return null;
      }

      // Create new subscription
      const subscription = await this.swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      const subscriptionInfo = this.formatSubscription(subscription);
      
      // Save subscription to backend (would integrate with Supabase)
      await this.saveSubscriptionToBackend(subscriptionInfo);

      console.log('[Push] Successfully subscribed to push notifications');
      return subscriptionInfo;
    } catch (error) {
      console.error('[Push] Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.swRegistration) {
        console.error('[Push] Service worker not registered');
        return false;
      }

      const subscription = await this.swRegistration.pushManager.getSubscription();
      if (!subscription) {
        console.log('[Push] No active subscription found');
        return true;
      }

      const success = await subscription.unsubscribe();
      if (success) {
        // Remove subscription from backend
        await this.removeSubscriptionFromBackend(subscription.endpoint);
        console.log('[Push] Successfully unsubscribed from push notifications');
      }

      return success;
    } catch (error) {
      console.error('[Push] Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  /**
   * Get current subscription status
   */
  async getSubscription(): Promise<PushSubscriptionInfo | null> {
    try {
      if (!this.swRegistration) {
        return null;
      }

      const subscription = await this.swRegistration.pushManager.getSubscription();
      return subscription ? this.formatSubscription(subscription) : null;
    } catch (error) {
      console.error('[Push] Failed to get subscription:', error);
      return null;
    }
  }

  /**
   * Check if push notifications are supported and permitted
   */
  async isAvailable(): Promise<{
    supported: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
  }> {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const permission = supported ? Notification.permission : 'denied';
    const subscription = supported ? await this.getSubscription() : null;

    return {
      supported,
      permission,
      subscribed: !!subscription
    };
  }

  /**
   * Send a local notification (fallback for testing)
   */
  async sendLocalNotification(config: NotificationConfig): Promise<boolean> {
    try {
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return false;
      }

      const notification = new Notification(config.title, {
        body: config.body,
        icon: config.icon || '/icon-192.png',
        badge: config.badge || '/icon-192.png',
        tag: config.tag,
        data: config.data,
        requireInteraction: config.requireInteraction || false,
        silent: config.silent || false
      });

      // Auto-close after 5 seconds if not requiring interaction
      if (!config.requireInteraction) {
        setTimeout(() => notification.close(), 5000);
      }

      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Handle notification click
        if (config.data?.url) {
          window.location.href = config.data.url;
        }
      };

      return true;
    } catch (error) {
      console.error('[Push] Failed to send local notification:', error);
      return false;
    }
  }

  /**
   * Predefined notification templates for soccer coaching scenarios
   */
  getNotificationTemplates() {
    return {
      gameReminder: (teamName: string, gameTime: string): NotificationConfig => ({
        title: '⚽ Game Reminder',
        body: `${teamName} game starts in 30 minutes at ${gameTime}`,
        icon: '/icon-192.png',
        tag: 'game-reminder',
        requireInteraction: true,
        actions: [
          { action: 'view', title: 'View Game', icon: '/icon-192.png' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
        data: { type: 'game-reminder', url: '/' }
      }),

      syncComplete: (operationsCount: number): NotificationConfig => ({
        title: '✅ Data Synced',
        body: `Successfully synced ${operationsCount} changes to the cloud`,
        icon: '/icon-192.png',
        tag: 'sync-complete',
        silent: true,
        data: { type: 'sync-complete' }
      }),

      syncFailed: (errorMessage: string): NotificationConfig => ({
        title: '❌ Sync Failed',
        body: `Unable to sync data: ${errorMessage}. Will retry automatically.`,
        icon: '/icon-192.png',
        tag: 'sync-failed',
        requireInteraction: true,
        actions: [
          { action: 'retry', title: 'Retry Now' },
          { action: 'view', title: 'View App' }
        ],
        data: { type: 'sync-failed', url: '/' }
      }),

      playerUpdate: (playerName: string, updateType: string): NotificationConfig => ({
        title: '👤 Player Update',
        body: `${playerName} ${updateType}`,
        icon: '/icon-192.png',
        tag: 'player-update',
        data: { type: 'player-update', playerName }
      }),

      gameComplete: (teamName: string, score: string): NotificationConfig => ({
        title: '🏆 Game Complete',
        body: `${teamName} finished! Final score: ${score}`,
        icon: '/icon-192.png',
        tag: 'game-complete',
        requireInteraction: true,
        actions: [
          { action: 'view-stats', title: 'View Stats' },
          { action: 'share', title: 'Share Result' }
        ],
        data: { type: 'game-complete', url: '/stats' }
      })
    };
  }

  /**
   * Helper: Convert VAPID key to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Helper: Format subscription for storage
   */
  private formatSubscription(subscription: PushSubscription): PushSubscriptionInfo {
    const keys = subscription.getKey ? {
      p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')),
      auth: this.arrayBufferToBase64(subscription.getKey('auth'))
    } : { p256dh: '', auth: '' };

    return {
      endpoint: subscription.endpoint,
      keys,
      subscribedAt: Date.now()
    };
  }

  /**
   * Helper: Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Save subscription to backend (Supabase integration)
   */
  private async saveSubscriptionToBackend(subscription: PushSubscriptionInfo): Promise<void> {
    try {
      // In production, this would save to Supabase push_subscriptions table
      console.log('[Push] Subscription would be saved to backend:', subscription);
      
      // Store locally for demo purposes
      localStorage.setItem('push-subscription', JSON.stringify(subscription));
    } catch (error) {
      console.error('[Push] Failed to save subscription to backend:', error);
    }
  }

  /**
   * Remove subscription from backend
   */
  private async removeSubscriptionFromBackend(endpoint: string): Promise<void> {
    try {
      // In production, this would remove from Supabase
      console.log('[Push] Subscription would be removed from backend:', endpoint);
      
      // Remove from local storage
      localStorage.removeItem('push-subscription');
    } catch (error) {
      console.error('[Push] Failed to remove subscription from backend:', error);
    }
  }
}

// Export a singleton instance
export const pushNotificationManager = new PushNotificationManager();