'use client';

import { useState, useEffect, useCallback } from 'react';
import { pushNotificationManager } from '@/lib/notifications/pushNotificationManager';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

interface UsePushNotificationsReturn extends PushNotificationState {
  requestPermission: () => Promise<boolean>;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  sendTestNotification: (type: 'gameReminder' | 'syncComplete' | 'syncFailed' | 'playerUpdate' | 'gameComplete') => Promise<boolean>;
  clearError: () => void;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    error: null
  });

  // Initialize and check current state
  useEffect(() => {
    const initializePushNotifications = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Initialize the push notification manager
        const initialized = await pushNotificationManager.initialize();
        if (!initialized) {
          setState(prev => ({
            ...prev,
            isSupported: false,
            isLoading: false,
            error: 'Push notifications not supported'
          }));
          return;
        }

        // Check current availability
        const availability = await pushNotificationManager.isAvailable();
        
        setState(prev => ({
          ...prev,
          isSupported: availability.supported,
          permission: availability.permission,
          isSubscribed: availability.subscribed,
          isLoading: false
        }));

        console.log('[Push Hook] Initialized with state:', availability);
      } catch (error) {
        console.error('[Push Hook] Initialization failed:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize push notifications'
        }));
      }
    };

    initializePushNotifications();
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const permission = await pushNotificationManager.requestPermission();
      const success = permission === 'granted';

      setState(prev => ({
        ...prev,
        permission,
        isLoading: false,
        error: success ? null : 'Notification permission denied'
      }));

      return success;
    } catch (error) {
      console.error('[Push Hook] Failed to request permission:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to request permission'
      }));
      return false;
    }
  }, []);

  // Send test notification
  const sendTestNotification = useCallback(async (
    type: 'gameReminder' | 'syncComplete' | 'syncFailed' | 'playerUpdate' | 'gameComplete'
  ): Promise<boolean> => {
    try {
      const templates = pushNotificationManager.getNotificationTemplates();
      let config;

      switch (type) {
        case 'gameReminder':
          config = templates.gameReminder('Test Team', '3:00 PM');
          break;
        case 'syncComplete':
          config = templates.syncComplete(5);
          break;
        case 'syncFailed':
          config = templates.syncFailed('Network error');
          break;
        case 'playerUpdate':
          config = templates.playerUpdate('John Doe', 'substitution');
          break;
        case 'gameComplete':
          config = templates.gameComplete('Team A', 'Team B', '3-2');
          break;
      }

      const success = await pushNotificationManager.sendLocalNotification(config);
      
      if (!success) {
        setState(prev => ({ ...prev, error: 'Failed to send test notification' }));
      }
      
      return success;
    } catch (error) {
      console.error('[Push Hook] Failed to send test notification:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to send test notification'
      }));
      return false;
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const subscription = await pushNotificationManager.subscribe();
      const success = !!subscription;

      setState(prev => ({
        ...prev,
        isSubscribed: success,
        permission: success ? 'granted' : prev.permission,
        isLoading: false,
        error: success ? null : 'Failed to subscribe to push notifications'
      }));

      if (success) {
        console.log('[Push Hook] Successfully subscribed to push notifications');
        
        // Send a welcome notification
        await sendTestNotification('syncComplete');
      }

      return success;
    } catch (error) {
      console.error('[Push Hook] Failed to subscribe:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to subscribe'
      }));
      return false;
    }
  }, [sendTestNotification]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const success = await pushNotificationManager.unsubscribe();

      setState(prev => ({
        ...prev,
        isSubscribed: !success,
        isLoading: false,
        error: success ? null : 'Failed to unsubscribe from push notifications'
      }));

      if (success) {
        console.log('[Push Hook] Successfully unsubscribed from push notifications');
      }

      return success;
    } catch (error) {
      console.error('[Push Hook] Failed to unsubscribe:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to unsubscribe'
      }));
      return false;
    }
  }, []);


  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
    clearError
  };
}