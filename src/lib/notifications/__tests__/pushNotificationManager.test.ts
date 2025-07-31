import { PushNotificationManager } from '../pushNotificationManager';

// Mock the global objects
const mockServiceWorkerRegistration = {
  pushManager: {
    getSubscription: jest.fn(),
    subscribe: jest.fn()
  }
};

const mockPushSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
  getKey: jest.fn((name: string) => {
    if (name === 'p256dh') return new ArrayBuffer(65);
    if (name === 'auth') return new ArrayBuffer(16);
    return null;
  }),
  unsubscribe: jest.fn()
};

const mockNotification = {
  close: jest.fn(),
  onclick: null
};

// Mock global APIs
Object.defineProperty(global, 'navigator', {
  value: {
    serviceWorker: {
      register: jest.fn(),
      ready: Promise.resolve(mockServiceWorkerRegistration)
    }
  },
  writable: true
});

Object.defineProperty(global, 'window', {
  value: {
    PushManager: jest.fn(),
    Notification: jest.fn().mockImplementation(() => mockNotification),
    atob: jest.fn((input: string) => Buffer.from(input, 'base64').toString('binary')),
    btoa: jest.fn((input: string) => Buffer.from(input, 'binary').toString('base64')),
    location: {
      origin: 'https://test.app'
    }
  },
  writable: true
});

// Mock Notification constructor and static properties
const mockNotificationConstructor = jest.fn().mockImplementation(() => mockNotification);
mockNotificationConstructor.permission = 'default';
mockNotificationConstructor.requestPermission = jest.fn().mockResolvedValue('granted');

Object.defineProperty(global, 'Notification', {
  value: mockNotificationConstructor,
  writable: true
});

// Also mock for window (some tests check window.Notification)
Object.defineProperty(window, 'Notification', {
  value: mockNotificationConstructor,
  writable: true
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

describe('PushNotificationManager', () => {
  let pushManager: PushNotificationManager;

  beforeEach(() => {
    jest.clearAllMocks();
    pushManager = new PushNotificationManager('test-vapid-key');
    
    // Reset mocked values
    mockNotificationConstructor.permission = 'default';
    (mockNotificationConstructor.requestPermission as jest.Mock).mockResolvedValue('granted');
    mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null);
    mockServiceWorkerRegistration.pushManager.subscribe.mockResolvedValue(mockPushSubscription);
    mockPushSubscription.unsubscribe.mockResolvedValue(true);
  });

  describe('initialize', () => {
    it('should initialize successfully with service worker support', async () => {
      const result = await pushManager.initialize();
      expect(result).toBe(true);
    });

    it('should fail initialization without service worker support', async () => {
      // Remove service worker support
      const originalNavigator = global.navigator;
      (global as any).navigator = {};

      const result = await pushManager.initialize();
      expect(result).toBe(false);

      // Restore navigator
      global.navigator = originalNavigator;
    });

    it('should fail initialization without PushManager support', async () => {
      // Remove PushManager support
      const originalPushManager = window.PushManager;
      delete (window as any).PushManager;

      const result = await pushManager.initialize();
      expect(result).toBe(false);

      // Restore PushManager
      (window as any).PushManager = originalPushManager;
    });

    it('should use provided service worker registration', async () => {
      const customRegistration = { ...mockServiceWorkerRegistration };
      const result = await pushManager.initialize(customRegistration as any);
      
      expect(result).toBe(true);
    });
  });

  describe('requestPermission', () => {
    it('should request and return granted permission', async () => {
      (mockNotificationConstructor.requestPermission as jest.Mock).mockResolvedValue('granted');
      
      const permission = await pushManager.requestPermission();
      expect(permission).toBe('granted');
      expect(mockNotificationConstructor.requestPermission).toHaveBeenCalled();
    });

    it('should return denied permission', async () => {
      (mockNotificationConstructor.requestPermission as jest.Mock).mockResolvedValue('denied');
      
      const permission = await pushManager.requestPermission();
      expect(permission).toBe('denied');
    });

    it('should return current permission if already granted', async () => {
      mockNotificationConstructor.permission = 'granted';
      
      const permission = await pushManager.requestPermission();
      expect(permission).toBe('granted');
      expect(mockNotificationConstructor.requestPermission).not.toHaveBeenCalled();
    });

    it('should handle missing Notification API', async () => {
      const originalNotification = window.Notification;
      delete (window as any).Notification;

      const permission = await pushManager.requestPermission();
      expect(permission).toBe('denied');

      (window as any).Notification = originalNotification;
    });
  });

  describe('subscribe', () => {
    beforeEach(async () => {
      await pushManager.initialize();
    });

    it('should successfully subscribe to push notifications', async () => {
      (mockNotificationConstructor.requestPermission as jest.Mock).mockResolvedValue('granted');
      
      const subscription = await pushManager.subscribe();
      
      expect(subscription).toBeTruthy();
      expect(subscription?.endpoint).toBe('https://fcm.googleapis.com/fcm/send/test-endpoint');
      expect(mockServiceWorkerRegistration.pushManager.subscribe).toHaveBeenCalledWith({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array)
      });
    });

    it('should return existing subscription if already subscribed', async () => {
      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(mockPushSubscription);
      
      const subscription = await pushManager.subscribe();
      
      expect(subscription).toBeTruthy();
      expect(mockServiceWorkerRegistration.pushManager.subscribe).not.toHaveBeenCalled();
    });

    it('should fail if permission is denied', async () => {
      (mockNotificationConstructor.requestPermission as jest.Mock).mockResolvedValue('denied');
      
      const subscription = await pushManager.subscribe();
      
      expect(subscription).toBeNull();
      expect(mockServiceWorkerRegistration.pushManager.subscribe).not.toHaveBeenCalled();
    });

    it('should handle subscription errors', async () => {
      (mockNotificationConstructor.requestPermission as jest.Mock).mockResolvedValue('granted');
      mockServiceWorkerRegistration.pushManager.subscribe.mockRejectedValue(new Error('Subscription failed'));
      
      const subscription = await pushManager.subscribe();
      
      expect(subscription).toBeNull();
    });

    it('should fail without service worker registration', async () => {
      const managerWithoutSW = new PushNotificationManager();
      
      const subscription = await managerWithoutSW.subscribe();
      
      expect(subscription).toBeNull();
    });
  });

  describe('unsubscribe', () => {
    beforeEach(async () => {
      await pushManager.initialize();
    });

    it('should successfully unsubscribe from push notifications', async () => {
      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(mockPushSubscription);
      
      const result = await pushManager.unsubscribe();
      
      expect(result).toBe(true);
      expect(mockPushSubscription.unsubscribe).toHaveBeenCalled();
    });

    it('should return true if no active subscription', async () => {
      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null);
      
      const result = await pushManager.unsubscribe();
      
      expect(result).toBe(true);
      expect(mockPushSubscription.unsubscribe).not.toHaveBeenCalled();
    });

    it('should handle unsubscription errors', async () => {
      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(mockPushSubscription);
      mockPushSubscription.unsubscribe.mockRejectedValue(new Error('Unsubscribe failed'));
      
      const result = await pushManager.unsubscribe();
      
      expect(result).toBe(false);
    });

    it('should fail without service worker registration', async () => {
      const managerWithoutSW = new PushNotificationManager();
      
      const result = await managerWithoutSW.unsubscribe();
      
      expect(result).toBe(false);
    });
  });

  describe('getSubscription', () => {
    beforeEach(async () => {
      await pushManager.initialize();
    });

    it('should return current subscription', async () => {
      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(mockPushSubscription);
      
      const subscription = await pushManager.getSubscription();
      
      expect(subscription).toBeTruthy();
      expect(subscription?.endpoint).toBe('https://fcm.googleapis.com/fcm/send/test-endpoint');
    });

    it('should return null if no subscription', async () => {
      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(null);
      
      const subscription = await pushManager.getSubscription();
      
      expect(subscription).toBeNull();
    });

    it('should return null without service worker registration', async () => {
      const managerWithoutSW = new PushNotificationManager();
      
      const subscription = await managerWithoutSW.getSubscription();
      
      expect(subscription).toBeNull();
    });
  });

  describe('isAvailable', () => {
    it('should return availability status', async () => {
      mockServiceWorkerRegistration.pushManager.getSubscription.mockResolvedValue(mockPushSubscription);
      mockNotificationConstructor.permission = 'granted';
      
      await pushManager.initialize();
      const availability = await pushManager.isAvailable();
      
      expect(availability).toEqual({
        supported: true,
        permission: 'granted',
        subscribed: true
      });
    });

    it('should handle unsupported environment', async () => {
      // Remove service worker support
      const originalNavigator = global.navigator;
      (global as any).navigator = {};
      
      const availability = await pushManager.isAvailable();
      
      expect(availability).toEqual({
        supported: false,
        permission: 'denied',
        subscribed: false
      });

      // Restore navigator
      global.navigator = originalNavigator;
    });
  });

  describe('sendLocalNotification', () => {
    it('should send local notification with granted permission', async () => {
      mockNotificationConstructor.permission = 'granted';
      
      const config = {
        title: 'Test Notification',
        body: 'This is a test',
        icon: '/test-icon.png'
      };
      
      const result = await pushManager.sendLocalNotification(config);
      
      expect(result).toBe(true);
      expect(mockNotificationConstructor).toHaveBeenCalledWith('Test Notification', {
        body: 'This is a test',
        icon: '/test-icon.png',
        badge: '/icon-192.png',
        tag: undefined,
        data: undefined,
        requireInteraction: false,
        silent: false
      });
    });

    it('should fail with denied permission', async () => {
      (mockNotificationConstructor.requestPermission as jest.Mock).mockResolvedValue('denied');
      
      const config = {
        title: 'Test Notification',
        body: 'This is a test'
      };
      
      const result = await pushManager.sendLocalNotification(config);
      
      expect(result).toBe(false);
      expect(mockNotificationConstructor).not.toHaveBeenCalled();
    });

    it('should handle notification errors', async () => {
      const errorMock = jest.fn().mockImplementation(() => {
        throw new Error('Notification failed');
      });
      errorMock.permission = 'granted';
      errorMock.requestPermission = jest.fn().mockResolvedValue('granted');
      
      Object.defineProperty(global, 'Notification', {
        value: errorMock,
        writable: true
      });
      
      const config = {
        title: 'Test Notification',
        body: 'This is a test'
      };
      
      const result = await pushManager.sendLocalNotification(config);
      
      expect(result).toBe(false);
    });
  });

  describe('getNotificationTemplates', () => {
    it('should return all notification templates', () => {
      const templates = pushManager.getNotificationTemplates();
      
      expect(templates).toHaveProperty('gameReminder');
      expect(templates).toHaveProperty('syncComplete');
      expect(templates).toHaveProperty('syncFailed');
      expect(templates).toHaveProperty('playerUpdate');
      expect(templates).toHaveProperty('gameComplete');
    });

    it('should generate game reminder template correctly', () => {
      const templates = pushManager.getNotificationTemplates();
      const template = templates.gameReminder('Test Team', '3:00 PM');
      
      expect(template.title).toBe('⚽ Game Reminder');
      expect(template.body).toContain('Test Team');
      expect(template.body).toContain('3:00 PM');
      expect(template.requireInteraction).toBe(true);
      expect(template.actions).toHaveLength(2);
    });

    it('should generate sync complete template correctly', () => {
      const templates = pushManager.getNotificationTemplates();
      const template = templates.syncComplete(5);
      
      expect(template.title).toBe('✅ Data Synced');
      expect(template.body).toContain('5 changes');
      expect(template.silent).toBe(true);
    });

    it('should generate sync failed template correctly', () => {
      const templates = pushManager.getNotificationTemplates();
      const template = templates.syncFailed('Network error');
      
      expect(template.title).toBe('❌ Sync Failed');
      expect(template.body).toContain('Network error');
      expect(template.requireInteraction).toBe(true);
      expect(template.actions).toHaveLength(2);
    });
  });
});