// Mock useErrorHandler first, before any imports
jest.mock('../useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleStorageError: jest.fn(),
    handleNetworkError: jest.fn(),
    handleValidationError: jest.fn(),
    handleGenericError: jest.fn(),
  }),
}));

// Mock AuthContext
const mockUser = { id: 'user-123', email: 'test@example.com' };
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({ user: mockUser })),
}));

// Mock the OfflineCacheManager
const mockOfflineManager = {
  getOfflineStatus: jest.fn(),
  clearOfflineData: jest.fn(),
  setUserId: jest.fn(),
};

// Mock the offline manager constructor
jest.mock('../../lib/offline/offlineCacheManager', () => ({
  OfflineCacheManager: jest.fn().mockImplementation(() => mockOfflineManager),
}));

// Mock storage manager
jest.mock('../../lib/storage', () => ({
  storageManager: {
    getProviderName: jest.fn(() => 'MockProvider'),
  },
  authAwareStorageManager: {
    getProviderName: jest.fn(() => 'MockProvider'),
  },
}));

// Unit tests for useOfflineManager hook
import { renderHook, act, waitFor } from '@/__tests__/test-utils';
import { useOfflineManager } from '../useOfflineManager';

import { useAuth } from '../../context/AuthContext';
const mockUseAuth = useAuth as jest.Mock;

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
});

// Mock window.addEventListener
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});

Object.defineProperty(window, 'removeEventListener', {
  value: mockRemoveEventListener,
});

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    controller: {
      postMessage: jest.fn(),
    },
  },
  writable: true,
});

describe('useOfflineManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });

    // Reset user mock
    mockUseAuth.mockReturnValue({ user: mockUser });

    // Default mock returns
    mockOfflineManager.getOfflineStatus.mockResolvedValue({
      isOnline: true,
      hasOfflineData: false,
      syncQueueSize: 0,
      lastSyncAttempt: undefined,
      lastSuccessfulSync: undefined,
    });
  });

  it('should initialize with correct default values', async () => {
    const { result } = renderHook(() => useOfflineManager());

    // Check initial synchronous state
    expect(result.current.isOnline).toBe(true);
    expect(result.current.error).toBe(null);
    
    // Wait for initialization to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // After initialization
    expect(result.current.hasOfflineData).toBe(false);
    expect(result.current.syncQueueSize).toBe(0);
  });

  it('should set up event listeners and initialize cache manager', async () => {
    const { result } = renderHook(() => useOfflineManager());

    expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.cacheManager).toBeTruthy();
    expect(mockOfflineManager.setUserId).toHaveBeenCalledWith(mockUser.id);
  });

  it('should clean up event listeners on unmount', () => {
    const { unmount } = renderHook(() => useOfflineManager());

    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(mockRemoveEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should load offline status on mount', async () => {
    const mockStatus = {
      isOnline: true,
      hasOfflineData: true,
      syncQueueSize: 2,
      lastSyncAttempt: new Date('2024-01-01T12:00:00Z'),
      lastSuccessfulSync: new Date('2024-01-01T11:30:00Z'),
    };

    mockOfflineManager.getOfflineStatus.mockResolvedValue(mockStatus);

    const { result } = renderHook(() => useOfflineManager());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // Wait for status to be loaded
    await waitFor(() => {
      expect(result.current.hasOfflineData).toBe(true);
    });

    expect(result.current.isOnline).toBe(true);
    expect(result.current.syncQueueSize).toBe(2);
  });

  it('should handle offline status loading errors', async () => {
    mockOfflineManager.getOfflineStatus.mockRejectedValue(new Error('Status load failed'));

    const { result } = renderHook(() => useOfflineManager());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should not crash and maintain default state
    expect(result.current.isOnline).toBe(true);
    expect(result.current.hasOfflineData).toBe(false);
    expect(result.current.syncQueueSize).toBe(0);
  });

  describe('Online/Offline Events', () => {
    it('should handle online event', async () => {
      const { result } = renderHook(() => useOfflineManager());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Get the online event handler
      const onlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'online'
      )?.[1];

      expect(onlineHandler).toBeDefined();

      // Mock updated status
      const updatedStatus = {
        isOnline: true,
        hasOfflineData: true,
        syncQueueSize: 0,
        lastSyncAttempt: new Date(),
        lastSuccessfulSync: new Date(),
      };
      mockOfflineManager.getOfflineStatus.mockResolvedValue(updatedStatus);

      // Simulate online event
      act(() => {
        onlineHandler();
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
    });

    it('should handle offline event', async () => {
      const { result } = renderHook(() => useOfflineManager());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Get the offline event handler
      const offlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1];

      expect(offlineHandler).toBeDefined();

      // Mock offline status
      const offlineStatus = {
        isOnline: false,
        hasOfflineData: true,
        syncQueueSize: 3,
        lastSyncAttempt: new Date(),
        lastSuccessfulSync: new Date(),
      };
      mockOfflineManager.getOfflineStatus.mockResolvedValue(offlineStatus);

      // Simulate offline event
      act(() => {
        offlineHandler();
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
    });
  });

  describe('User Context', () => {
    it('should update user ID when user changes', async () => {
      const { result, rerender } = renderHook(() => useOfflineManager());

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOfflineManager.setUserId).toHaveBeenCalledWith(mockUser.id);

      // Change user
      const newUser = { id: 'user-456', email: 'new@example.com' };
      mockUseAuth.mockReturnValue({ user: newUser });

      rerender();

      // Should create new cache manager with new user
      expect(mockOfflineManager.setUserId).toHaveBeenCalledWith(newUser.id);
    });

    it('should handle no user', async () => {
      mockUseAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useOfflineManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockOfflineManager.setUserId).not.toHaveBeenCalled();
    });
  });

  describe('Actions', () => {
    it('should trigger sync when online', async () => {
      const { result } = renderHook(() => useOfflineManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(navigator.serviceWorker.controller?.postMessage).toHaveBeenCalledWith({
        type: 'SYNC_DATA'
      });
    });

    it('should not trigger sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      const { result } = renderHook(() => useOfflineManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.triggerSync();
      });

      expect(navigator.serviceWorker.controller?.postMessage).not.toHaveBeenCalled();
    });

    it('should clear offline data', async () => {
      const { result } = renderHook(() => useOfflineManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockOfflineManager.clearOfflineData.mockResolvedValue(undefined);
      
      await act(async () => {
        await result.current.clearOfflineData();
      });

      expect(mockOfflineManager.clearOfflineData).toHaveBeenCalled();
    });

    it('should update offline status manually', async () => {
      const { result } = renderHook(() => useOfflineManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedStatus = {
        isOnline: true,
        hasOfflineData: true,
        syncQueueSize: 5,
      };
      mockOfflineManager.getOfflineStatus.mockResolvedValue(updatedStatus);

      await act(async () => {
        await result.current.updateOfflineStatus();
      });

      expect(mockOfflineManager.getOfflineStatus).toHaveBeenCalled();
    });

    it('should get cache size', async () => {
      const { result } = renderHook(() => useOfflineManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const cacheSize = await result.current.getCacheSize();

      expect(cacheSize).toBe(0); // Implementation returns 0 for now
    });
  });

  describe('Computed Values', () => {
    it('should calculate needsSync correctly', async () => {
      const mockStatus = {
        isOnline: true,
        hasOfflineData: true,
        syncQueueSize: 3,
        lastSyncAttempt: undefined,
        lastSuccessfulSync: undefined,
      };

      mockOfflineManager.getOfflineStatus.mockResolvedValue(mockStatus);

      const { result } = renderHook(() => useOfflineManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      // Wait for status to be loaded
      await waitFor(() => {
        expect(result.current.syncQueueSize).toBe(3);
      });

      expect(result.current.needsSync).toBe(true);
    });

    it('should handle null offline status', async () => {
      const { result } = renderHook(() => useOfflineManager());

      // Don't wait for status load to complete
      expect(result.current.hasOfflineData).toBe(false);
      expect(result.current.syncQueueSize).toBe(0);
      expect(result.current.needsSync).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache manager initialization errors', async () => {
      // Save the original mock
      const originalMock = jest.requireMock('../../lib/offline/offlineCacheManager');
      
      // Temporarily make the constructor throw
      originalMock.OfflineCacheManager.mockImplementationOnce(() => {
        throw new Error('Init failed');
      });

      const { result } = renderHook(() => useOfflineManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Init failed');
      expect(result.current.cacheManager).toBe(null);
      
      // Restore the original mock for other tests
      originalMock.OfflineCacheManager.mockImplementation(() => mockOfflineManager);
    });

    it('should handle status update errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useOfflineManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockOfflineManager.getOfflineStatus.mockRejectedValue(new Error('Status failed'));

      await act(async () => {
        await result.current.updateOfflineStatus();
      });

      // Should not crash
      expect(result.current.error).toBe(null);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to get offline status:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle clear data errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useOfflineManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockOfflineManager.clearOfflineData.mockRejectedValue(new Error('Clear failed'));

      await act(async () => {
        await result.current.clearOfflineData();
      });

      // Should not crash
      expect(result.current.error).toBe(null);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to clear offline data:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Memory Leaks Prevention', () => {
    it('should not update state after component unmount', async () => {
      const { result, unmount } = renderHook(() => useOfflineManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Unmount the component
      unmount();

      // Try to trigger status update after unmount
      const onlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'online'
      )?.[1];

      // This should not cause any state updates or errors
      expect(() => {
        act(() => {
          onlineHandler();
        });
      }).not.toThrow();
    });
  });
});