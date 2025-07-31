import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import EnhancedServiceWorkerRegistration from '../EnhancedServiceWorkerRegistration';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

// Mock the connection status hook
jest.mock('@/hooks/useConnectionStatus');
const mockUseConnectionStatus = useConnectionStatus as jest.MockedFunction<typeof useConnectionStatus>;

// Mock service worker
const mockServiceWorkerRegistration = {
  waiting: null,
  installing: null,
  active: null,
  update: jest.fn().mockResolvedValue(undefined),
  addEventListener: jest.fn(),
  sync: {
    register: jest.fn().mockResolvedValue(undefined)
  }
} as unknown as ServiceWorkerRegistration;

const mockServiceWorker = {
  postMessage: jest.fn(),
  addEventListener: jest.fn(),
  state: 'installed'
} as unknown as ServiceWorker;

// Mock MessageChannel
global.MessageChannel = jest.fn().mockImplementation(() => ({
  port1: { onmessage: null },
  port2: {}
}));

// Mock navigator.serviceWorker
Object.defineProperty(window.navigator, 'serviceWorker', {
  value: {
    register: jest.fn(),
    addEventListener: jest.fn(),
    controller: {
      postMessage: jest.fn()
    }
  },
  configurable: true
});

describe('EnhancedServiceWorkerRegistration', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseConnectionStatus.mockReturnValue({
      isOnline: true,
      isSupabaseReachable: true,
      connectionQuality: 'good',
      lastChecked: Date.now(),
      checkConnection: jest.fn()
    });

    // Mock successful service worker registration
    (navigator.serviceWorker.register as jest.Mock).mockResolvedValue(mockServiceWorkerRegistration);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Service Worker Registration', () => {
    it('should register enhanced service worker on mount', async () => {
      render(<EnhancedServiceWorkerRegistration />);

      await waitFor(() => {
        expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw-enhanced.js', {
          scope: '/',
          updateViaCache: 'none'
        });
      });
    });

    it('should handle registration errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (navigator.serviceWorker.register as jest.Mock).mockRejectedValue(new Error('Registration failed'));

      render(<EnhancedServiceWorkerRegistration />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          '[SW] Enhanced service worker registration failed:',
          expect.any(Error)
        );
      });

      // Should show error banner
      expect(screen.getByText(/Service Worker Error/)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe('Update Management', () => {
    it('should show update banner when update is available', async () => {
      const registration = {
        ...mockServiceWorkerRegistration,
        waiting: mockServiceWorker
      };
      (navigator.serviceWorker.register as jest.Mock).mockResolvedValue(registration);

      render(<EnhancedServiceWorkerRegistration />);

      // Simulate update found event
      const updateFoundCallback = mockServiceWorkerRegistration.addEventListener.mock.calls
        .find(call => call[0] === 'updatefound')?.[1];
      
      if (updateFoundCallback) {
        // Simulate new worker with state change
        const newWorker = {
          ...mockServiceWorker,
          addEventListener: jest.fn(),
          state: 'installing'
        };
        
        registration.installing = newWorker;
        
        act(() => {
          updateFoundCallback();
        });

        // Simulate state change to installed
        const stateChangeCallback = newWorker.addEventListener.mock.calls
          .find(call => call[0] === 'statechange')?.[1];
        
        if (stateChangeCallback) {
          newWorker.state = 'installed';
          // Mock existing controller
          Object.defineProperty(navigator.serviceWorker, 'controller', {
            value: mockServiceWorker,
            configurable: true
          });
          
          act(() => {
            stateChangeCallback();
          });
        }

        await waitFor(() => {
          expect(screen.getByText('🚀 App update available!')).toBeInTheDocument();
          expect(screen.getByText('Update Now')).toBeInTheDocument();
        });
      }
    });

    it('should activate update when button is clicked', async () => {
      const registration = {
        ...mockServiceWorkerRegistration,
        waiting: mockServiceWorker
      };
      (navigator.serviceWorker.register as jest.Mock).mockResolvedValue(registration);

      render(<EnhancedServiceWorkerRegistration />);

      // Simulate update available state
      const updateFoundCallback = mockServiceWorkerRegistration.addEventListener.mock.calls
        .find(call => call[0] === 'updatefound')?.[1];
      
      if (updateFoundCallback) {
        registration.installing = mockServiceWorker;
        act(() => {
          updateFoundCallback();
        });

        const stateChangeCallback = mockServiceWorker.addEventListener.mock.calls
          .find(call => call[0] === 'statechange')?.[1];
        
        if (stateChangeCallback) {
          mockServiceWorker.state = 'installed';
          Object.defineProperty(navigator.serviceWorker, 'controller', {
            value: mockServiceWorker,
            configurable: true
          });
          
          act(() => {
            stateChangeCallback();
          });
        }

        await waitFor(() => {
          expect(screen.getByText('Update Now')).toBeInTheDocument();
        });

        // Click update button
        const updateButton = screen.getByText('Update Now');
        await user.click(updateButton);

        expect(mockServiceWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
        expect(screen.getByText('⏳ Updating app...')).toBeInTheDocument();
      }
    });
  });

  describe('Sync Management', () => {
    it('should request manual sync when connection status changes to online', async () => {
      const registration = mockServiceWorkerRegistration;
      (navigator.serviceWorker.register as jest.Mock).mockResolvedValue(registration);

      const { rerender } = render(<EnhancedServiceWorkerRegistration />);

      await waitFor(() => {
        expect(navigator.serviceWorker.register).toHaveBeenCalled();
      });

      // Change connection status to offline, then back to online
      mockUseConnectionStatus.mockReturnValue({
        isOnline: false,
        isSupabaseReachable: false,
        connectionQuality: 'offline',
        lastChecked: Date.now(),
        checkConnection: jest.fn()
      });

      rerender(<EnhancedServiceWorkerRegistration />);

      mockUseConnectionStatus.mockReturnValue({
        isOnline: true,
        isSupabaseReachable: true,
        connectionQuality: 'good',
        lastChecked: Date.now(),
        checkConnection: jest.fn()
      });

      rerender(<EnhancedServiceWorkerRegistration />);

      await waitFor(() => {
        expect(navigator.serviceWorker.controller?.postMessage).toHaveBeenCalledWith({
          type: 'SYNC_REQUEST'
        });
      });
    });

    it('should display sync notifications', async () => {
      render(<EnhancedServiceWorkerRegistration />);

      // Simulate sync completed message
      const messageHandler = (navigator.serviceWorker.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        act(() => {
          messageHandler({
            data: {
              type: 'SYNC_COMPLETED',
              data: { success: true, timestamp: Date.now() }
            }
          });
        });

        await waitFor(() => {
          expect(screen.getByText('Sync Complete')).toBeInTheDocument();
          expect(screen.getByText('Your data has been synced to the cloud')).toBeInTheDocument();
        });
      }
    });

    it('should display sync failure notifications', async () => {
      render(<EnhancedServiceWorkerRegistration />);

      const messageHandler = (navigator.serviceWorker.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        act(() => {
          messageHandler({
            data: {
              type: 'SYNC_FAILED',
              data: { error: 'Network error', timestamp: Date.now() }
            }
          });
        });

        await waitFor(() => {
          expect(screen.getByText('Sync Failed')).toBeInTheDocument();
          expect(screen.getByText('Sync error: Network error')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Developer Tools', () => {
    it('should show developer tools in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<EnhancedServiceWorkerRegistration />);

      expect(screen.getByText('SW Dev Tools')).toBeInTheDocument();
      expect(screen.getByText('🔄 Manual Sync')).toBeInTheDocument();
      expect(screen.getByText('📊 Cache Status')).toBeInTheDocument();
      expect(screen.getByText('🗑️ Clear Caches')).toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should not show developer tools in production mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(<EnhancedServiceWorkerRegistration />);

      expect(screen.queryByText('SW Dev Tools')).not.toBeInTheDocument();

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle manual sync button click', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<EnhancedServiceWorkerRegistration />);

      const manualSyncButton = screen.getByText('🔄 Manual Sync');
      await user.click(manualSyncButton);

      expect(navigator.serviceWorker.controller?.postMessage).toHaveBeenCalledWith({
        type: 'SYNC_REQUEST'
      });

      process.env.NODE_ENV = originalEnv;
    });

    it('should handle cache status button click', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      render(<EnhancedServiceWorkerRegistration />);

      const cacheStatusButton = screen.getByText('📊 Cache Status');
      await user.click(cacheStatusButton);

      // Should send message to service worker
      expect(navigator.serviceWorker.controller?.postMessage).toHaveBeenCalledWith(
        { type: 'CACHE_STATUS' },
        expect.any(Array)
      );

      process.env.NODE_ENV = originalEnv;
      consoleSpy.mockRestore();
    });

    it('should handle clear caches button click', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(<EnhancedServiceWorkerRegistration />);

      const clearCachesButton = screen.getByText('🗑️ Clear Caches');
      await user.click(clearCachesButton);

      expect(navigator.serviceWorker.controller?.postMessage).toHaveBeenCalledWith(
        { type: 'CLEAR_CACHE' },
        expect.any(Array)
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Handling', () => {
    it('should handle service worker not supported gracefully', () => {
      // Temporarily remove service worker support
      const originalServiceWorker = navigator.serviceWorker;
      delete (navigator as any).serviceWorker;

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(<EnhancedServiceWorkerRegistration />);

      // Should not crash and not show any banners
      expect(screen.queryByText(/Service Worker Error/)).not.toBeInTheDocument();
      expect(screen.queryByText(/App update available/)).not.toBeInTheDocument();

      // Restore service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalServiceWorker,
        configurable: true
      });

      consoleSpy.mockRestore();
    });

    it('should close error banner when X is clicked', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      (navigator.serviceWorker.register as jest.Mock).mockRejectedValue(new Error('Registration failed'));

      render(<EnhancedServiceWorkerRegistration />);

      await waitFor(() => {
        expect(screen.getByText(/Service Worker Error/)).toBeInTheDocument();
      });

      const closeButton = screen.getByText('✕');
      await user.click(closeButton);

      expect(screen.queryByText(/Service Worker Error/)).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});