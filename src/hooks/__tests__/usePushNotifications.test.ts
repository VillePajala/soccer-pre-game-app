import { renderHook, act, waitFor } from '@testing-library/react';
import { usePushNotifications } from '../usePushNotifications';
import { pushNotificationManager } from '@/lib/notifications/pushNotificationManager';

// Mock the push notification manager
jest.mock('@/lib/notifications/pushNotificationManager', () => ({
  pushNotificationManager: {
    initialize: jest.fn(),
    isAvailable: jest.fn(),
    requestPermission: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    sendLocalNotification: jest.fn(),
    getNotificationTemplates: jest.fn()
  }
}));

const mockPushNotificationManager = pushNotificationManager as jest.Mocked<typeof pushNotificationManager>;

describe('usePushNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock responses
    mockPushNotificationManager.initialize.mockResolvedValue(true);
    mockPushNotificationManager.isAvailable.mockResolvedValue({
      supported: true,
      permission: 'default',
      subscribed: false
    });
    mockPushNotificationManager.requestPermission.mockResolvedValue('granted');
    mockPushNotificationManager.subscribe.mockResolvedValue({
      endpoint: 'test-endpoint',
      keys: { p256dh: 'test-key', auth: 'test-auth' },
      subscribedAt: Date.now()
    });
    mockPushNotificationManager.unsubscribe.mockResolvedValue(true);
    mockPushNotificationManager.sendLocalNotification.mockResolvedValue(true);
    mockPushNotificationManager.getNotificationTemplates.mockReturnValue({
      gameReminder: jest.fn(),
      syncComplete: jest.fn(),
      syncFailed: jest.fn(),
      playerUpdate: jest.fn(),
      gameComplete: jest.fn()
    } as any);
  });

  describe('initialization', () => {
    it('should initialize with correct default state', async () => {
      const { result } = renderHook(() => usePushNotifications());

      // Initial loading state
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isSupported).toBe(false);
      expect(result.current.permission).toBe('default');
      expect(result.current.isSubscribed).toBe(false);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSupported).toBe(true);
      expect(mockPushNotificationManager.initialize).toHaveBeenCalled();
      expect(mockPushNotificationManager.isAvailable).toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      mockPushNotificationManager.initialize.mockResolvedValue(false);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSupported).toBe(false);
      expect(result.current.error).toBe('Push notifications not supported');
    });

    it('should handle initialization error', async () => {
      const error = new Error('Initialization failed');
      mockPushNotificationManager.initialize.mockRejectedValue(error);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Initialization failed');
    });

    it('should initialize with granted permission and subscription', async () => {
      mockPushNotificationManager.isAvailable.mockResolvedValue({
        supported: true,
        permission: 'granted',
        subscribed: true
      });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.permission).toBe('granted');
      expect(result.current.isSubscribed).toBe(true);
    });
  });

  describe('requestPermission', () => {
    it('should successfully request permission', async () => {
      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let permissionResult: boolean;
      await act(async () => {
        permissionResult = await result.current.requestPermission();
      });

      expect(permissionResult!).toBe(true);
      expect(result.current.permission).toBe('granted');
      expect(result.current.error).toBeNull();
      expect(mockPushNotificationManager.requestPermission).toHaveBeenCalled();
    });

    it('should handle permission denial', async () => {
      mockPushNotificationManager.requestPermission.mockResolvedValue('denied');

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let permissionResult: boolean;
      await act(async () => {
        permissionResult = await result.current.requestPermission();
      });

      expect(permissionResult!).toBe(false);
      expect(result.current.permission).toBe('denied');
      expect(result.current.error).toBe('Notification permission denied');
    });

    it('should handle permission request error', async () => {
      const error = new Error('Permission request failed');
      mockPushNotificationManager.requestPermission.mockRejectedValue(error);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let permissionResult: boolean;
      await act(async () => {
        permissionResult = await result.current.requestPermission();
      });

      expect(permissionResult!).toBe(false);
      expect(result.current.error).toBe('Permission request failed');
    });
  });

  describe('subscribe', () => {
    it('should successfully subscribe to push notifications', async () => {
      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let subscribeResult: boolean;
      await act(async () => {
        subscribeResult = await result.current.subscribe();
      });

      expect(subscribeResult!).toBe(true);
      expect(result.current.isSubscribed).toBe(true);
      expect(result.current.permission).toBe('granted');
      expect(result.current.error).toBeNull();
      expect(mockPushNotificationManager.subscribe).toHaveBeenCalled();
    });

    it('should request permission before subscribing if not granted', async () => {
      mockPushNotificationManager.isAvailable.mockResolvedValue({
        supported: true,
        permission: 'default',
        subscribed: false
      });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let subscribeResult: boolean;
      await act(async () => {
        subscribeResult = await result.current.subscribe();
      });

      expect(subscribeResult!).toBe(true);
      expect(mockPushNotificationManager.requestPermission).toHaveBeenCalled();
      expect(mockPushNotificationManager.subscribe).toHaveBeenCalled();
    });

    it('should fail if permission is denied', async () => {
      mockPushNotificationManager.requestPermission.mockResolvedValue('denied');

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let subscribeResult: boolean;
      await act(async () => {
        subscribeResult = await result.current.subscribe();
      });

      expect(subscribeResult!).toBe(false);
      expect(mockPushNotificationManager.subscribe).not.toHaveBeenCalled();
    });

    it('should handle subscription failure', async () => {
      mockPushNotificationManager.subscribe.mockResolvedValue(null);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let subscribeResult: boolean;
      await act(async () => {
        subscribeResult = await result.current.subscribe();
      });

      expect(subscribeResult!).toBe(false);
      expect(result.current.error).toBe('Failed to subscribe to push notifications');
    });

    it('should send welcome notification after successful subscription', async () => {
      const mockTemplates = {
        syncComplete: jest.fn().mockReturnValue({
          title: 'Welcome',
          body: 'Successfully subscribed!'
        }),
        gameReminder: jest.fn(),
        syncFailed: jest.fn(),
        playerUpdate: jest.fn(),
        gameComplete: jest.fn()
      };
      mockPushNotificationManager.getNotificationTemplates.mockReturnValue(mockTemplates as any);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.subscribe();
      });

      expect(mockPushNotificationManager.sendLocalNotification).toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('should successfully unsubscribe from push notifications', async () => {
      mockPushNotificationManager.isAvailable.mockResolvedValue({
        supported: true,
        permission: 'granted',
        subscribed: true
      });

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let unsubscribeResult: boolean;
      await act(async () => {
        unsubscribeResult = await result.current.unsubscribe();
      });

      expect(unsubscribeResult!).toBe(true);
      expect(result.current.isSubscribed).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockPushNotificationManager.unsubscribe).toHaveBeenCalled();
    });

    it('should handle unsubscription failure', async () => {
      mockPushNotificationManager.unsubscribe.mockResolvedValue(false);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let unsubscribeResult: boolean;
      await act(async () => {
        unsubscribeResult = await result.current.unsubscribe();
      });

      expect(unsubscribeResult!).toBe(false);
      expect(result.current.error).toBe('Failed to unsubscribe from push notifications');
    });

    it('should handle unsubscription error', async () => {
      const error = new Error('Unsubscribe failed');
      mockPushNotificationManager.unsubscribe.mockRejectedValue(error);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let unsubscribeResult: boolean;
      await act(async () => {
        unsubscribeResult = await result.current.unsubscribe();
      });

      expect(unsubscribeResult!).toBe(false);
      expect(result.current.error).toBe('Unsubscribe failed');
    });
  });

  describe('sendTestNotification', () => {
    beforeEach(async () => {
      const mockTemplates = {
        gameReminder: jest.fn().mockReturnValue({ title: 'Game Reminder', body: 'Test game reminder' }),
        syncComplete: jest.fn().mockReturnValue({ title: 'Sync Complete', body: 'Test sync complete' }),
        syncFailed: jest.fn().mockReturnValue({ title: 'Sync Failed', body: 'Test sync failed' }),
        playerUpdate: jest.fn().mockReturnValue({ title: 'Player Update', body: 'Test player update' }),
        gameComplete: jest.fn().mockReturnValue({ title: 'Game Complete', body: 'Test game complete' })
      };
      mockPushNotificationManager.getNotificationTemplates.mockReturnValue(mockTemplates as any);
    });

    it('should send game reminder test notification', async () => {
      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let testResult: boolean;
      await act(async () => {
        testResult = await result.current.sendTestNotification('gameReminder');
      });

      expect(testResult!).toBe(true);
      expect(mockPushNotificationManager.sendLocalNotification).toHaveBeenCalledWith({
        title: 'Game Reminder',
        body: 'Test game reminder'
      });
    });

    it('should send sync complete test notification', async () => {
      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let testResult: boolean;
      await act(async () => {
        testResult = await result.current.sendTestNotification('syncComplete');
      });

      expect(testResult!).toBe(true);
      expect(mockPushNotificationManager.sendLocalNotification).toHaveBeenCalledWith({
        title: 'Sync Complete',
        body: 'Test sync complete'
      });
    });

    it('should handle all notification types', async () => {
      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const types: Array<'gameReminder' | 'syncComplete' | 'syncFailed' | 'playerUpdate' | 'gameComplete'> = [
        'gameReminder', 'syncComplete', 'syncFailed', 'playerUpdate', 'gameComplete'
      ];

      for (const type of types) {
        await act(async () => {
          const result = await result.current.sendTestNotification(type);
          expect(result).toBe(true);
        });
      }

      expect(mockPushNotificationManager.sendLocalNotification).toHaveBeenCalledTimes(types.length);
    });

    it('should handle notification send failure', async () => {
      mockPushNotificationManager.sendLocalNotification.mockResolvedValue(false);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let testResult: boolean;
      await act(async () => {
        testResult = await result.current.sendTestNotification('syncComplete');
      });

      expect(testResult!).toBe(false);
    });

    it('should handle notification send error', async () => {
      const error = new Error('Send failed');
      mockPushNotificationManager.sendLocalNotification.mockRejectedValue(error);

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let testResult: boolean;
      await act(async () => {
        testResult = await result.current.sendTestNotification('syncComplete');
      });

      expect(testResult!).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockPushNotificationManager.initialize.mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(() => usePushNotifications());

      await waitFor(() => {
        expect(result.current.error).toBe('Test error');
      });

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});