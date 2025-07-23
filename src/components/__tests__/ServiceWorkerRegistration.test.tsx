// Unit tests for Service Worker Registration component
import { render, screen, waitFor } from '@testing-library/react';
import ServiceWorkerRegistration from '../ServiceWorkerRegistration';

// Mock service worker registration
const mockServiceWorker = {
  register: jest.fn(),
  ready: Promise.resolve({
    active: {
      postMessage: jest.fn(),
    },
    update: jest.fn(),
  }),
};

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
});

// Mock console methods to avoid noise in tests
const originalConsole = console;
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

describe('ServiceWorkerRegistration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service worker support
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      writable: true,
    });
  });

  it('should render without crashing', () => {
    render(<ServiceWorkerRegistration />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should show unsupported message when service workers are not supported', () => {
    // Remove service worker support
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      writable: true,
    });

    render(<ServiceWorkerRegistration />);
    
    expect(screen.getByText(/service workers are not supported/i)).toBeInTheDocument();
  });

  describe('Service Worker Registration', () => {
    it('should register service worker when supported', async () => {
      const mockRegistration = {
        installing: null,
        waiting: null,
        active: {
          postMessage: jest.fn(),
        },
        addEventListener: jest.fn(),
        update: jest.fn(),
      };

      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js');
      });

      expect(screen.getByText(/service worker registered/i)).toBeInTheDocument();
    });

    it('should handle registration failure', async () => {
      const registrationError = new Error('Registration failed');
      mockServiceWorker.register.mockRejectedValue(registrationError);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith(
          'Service worker registration failed:',
          registrationError
        );
      });

      expect(screen.getByText(/service worker registration failed/i)).toBeInTheDocument();
    });

    it('should detect new service worker available', async () => {
      const mockRegistration = {
        installing: null,
        waiting: {
          postMessage: jest.fn(),
        },
        active: {
          postMessage: jest.fn(),
        },
        addEventListener: jest.fn(),
        update: jest.fn(),
      };

      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockRegistration.addEventListener).toHaveBeenCalledWith(
          'updatefound',
          expect.any(Function)
        );
      });
    });

    it('should handle service worker in installing state', async () => {
      const mockInstalling = {
        state: 'installing',
        addEventListener: jest.fn(),
      };

      const mockRegistration = {
        installing: mockInstalling,
        waiting: null,
        active: null,
        addEventListener: jest.fn(),
        update: jest.fn(),
      };

      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(mockInstalling.addEventListener).toHaveBeenCalledWith(
          'statechange',
          expect.any(Function)
        );
      });

      expect(screen.getByText(/new version installing/i)).toBeInTheDocument();
    });
  });

  describe('Update Notifications', () => {
    it('should show update available message when new service worker is waiting', async () => {
      const mockRegistration = {
        installing: null,
        waiting: {
          postMessage: jest.fn(),
        },
        active: {
          postMessage: jest.fn(),
        },
        addEventListener: jest.fn(),
        update: jest.fn(),
      };

      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(screen.getByText(/new version available/i)).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
    });

    it('should handle update button click', async () => {
      const mockWaiting = {
        postMessage: jest.fn(),
      };

      const mockRegistration = {
        installing: null,
        waiting: mockWaiting,
        active: {
          postMessage: jest.fn(),
        },
        addEventListener: jest.fn(),
        update: jest.fn(),
      };

      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
      });

      const updateButton = screen.getByRole('button', { name: /update/i });
      updateButton.click();

      expect(mockWaiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });

    it('should reload page when service worker is activated', async () => {
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });

      const mockRegistration = {
        installing: null,
        waiting: {
          postMessage: jest.fn(),
        },
        active: {
          postMessage: jest.fn(),
        },
        addEventListener: jest.fn(),
        update: jest.fn(),
      };

      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      // Simulate controlling service worker change
      await waitFor(() => {
        const controllerChangeHandler = mockServiceWorker.addEventListener?.mock.calls
          .find(call => call[0] === 'controllerchange')?.[1];
        
        if (controllerChangeHandler) {
          controllerChangeHandler();
        }
      });

      expect(mockReload).toHaveBeenCalled();
    });
  });

  describe('Offline Detection', () => {
    it('should show offline status', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      });

      render(<ServiceWorkerRegistration />);

      expect(screen.getByText(/offline/i)).toBeInTheDocument();
    });

    it('should show online status', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      });

      render(<ServiceWorkerRegistration />);

      expect(screen.getByText(/online/i)).toBeInTheDocument();
    });

    it('should handle online/offline events', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');

      render(<ServiceWorkerRegistration />);

      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      addEventListenerSpy.mockRestore();
    });
  });

  describe('Error Boundary', () => {
    it('should handle service worker errors gracefully', async () => {
      // Mock console.error to track error calls
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockRegistration = {
        installing: null,
        waiting: null,
        active: {
          postMessage: jest.fn(),
        },
        addEventListener: jest.fn((event, handler) => {
          if (event === 'error') {
            // Simulate an error
            setTimeout(() => handler(new Error('Service worker error')), 0);
          }
        }),
        update: jest.fn(),
      };

      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Component Lifecycle', () => {
    it('should clean up event listeners on unmount', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      const { unmount } = render(<ServiceWorkerRegistration />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      removeEventListenerSpy.mockRestore();
    });

    it('should handle missing service worker gracefully', () => {
      // Remove service worker entirely
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
      });

      expect(() => render(<ServiceWorkerRegistration />)).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<ServiceWorkerRegistration />);

      const statusElement = screen.getByRole('status');
      expect(statusElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should provide screen reader friendly update messages', async () => {
      const mockRegistration = {
        installing: null,
        waiting: {
          postMessage: jest.fn(),
        },
        active: {
          postMessage: jest.fn(),
        },
        addEventListener: jest.fn(),
        update: jest.fn(),
      };

      mockServiceWorker.register.mockResolvedValue(mockRegistration);

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        const updateMessage = screen.getByText(/new version available/i);
        expect(updateMessage).toBeInTheDocument();
      });
    });
  });

  describe('Progressive Enhancement', () => {
    it('should work without service worker support', () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
      });

      render(<ServiceWorkerRegistration />);

      // Should still render and show appropriate message
      expect(screen.getByText(/service workers are not supported/i)).toBeInTheDocument();
    });

    it('should provide fallback when registration fails', async () => {
      mockServiceWorker.register.mockRejectedValue(new Error('Network error'));

      render(<ServiceWorkerRegistration />);

      await waitFor(() => {
        expect(screen.getByText(/service worker registration failed/i)).toBeInTheDocument();
      });
    });
  });
});