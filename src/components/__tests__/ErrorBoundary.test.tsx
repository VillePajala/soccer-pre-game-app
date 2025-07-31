import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';
import { useTranslation } from 'react-i18next';

// Mock dependencies
jest.mock('react-i18next');
jest.mock('@/utils/logger');

const mockT = jest.fn((key: string, fallback: string) => fallback);

beforeEach(() => {
  jest.clearAllMocks();
  (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
  
  // Mock console.error to avoid error logs in tests
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  describe('when no error occurs', () => {
    it('should render children normally', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('should display error fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('An unexpected error occurred. The development team has been notified.')).toBeInTheDocument();
    });

    it('should show Try Again and Reload Page buttons', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Reload Page')).toBeInTheDocument();
    });

    it('should show error icon', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('⚠️')).toBeInTheDocument();
    });

    it('should reset error state when Try Again is clicked', () => {
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error');
        }
        return <div>No error</div>;
      };

      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );
      
      // Error UI should be showing
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Click Try Again and stop throwing error
      shouldThrow = false;
      fireEvent.click(screen.getByText('Try Again'));
      
      // Rerender the same component tree
      rerender(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );
      
      // Should show normal content
      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should reload page when Reload Page is clicked', () => {
      // Mock window.location.reload
      const mockReload = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      });
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      fireEvent.click(screen.getByText('Reload Page'));
      
      expect(mockReload).toHaveBeenCalled();
    });

    it('should call custom onError handler when provided', () => {
      const mockOnError = jest.fn();
      
      render(
        <ErrorBoundary onError={mockOnError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error UI</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should use translated text', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(mockT).toHaveBeenCalledWith('errorBoundary.title', 'Something went wrong');
      expect(mockT).toHaveBeenCalledWith('errorBoundary.description', 'An unexpected error occurred. The development team has been notified.');
      expect(mockT).toHaveBeenCalledWith('errorBoundary.tryAgain', 'Try Again');
      expect(mockT).toHaveBeenCalledWith('errorBoundary.reloadPage', 'Reload Page');
    });
  });

  describe('development mode', () => {
    beforeEach(() => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        configurable: true
      });
      
      return () => {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalEnv,
          configurable: true
        });
      };
    });

    it('should show technical details in development mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Should show details section
      expect(screen.getByText('Technical Details')).toBeInTheDocument();
      
      // Expand details
      fireEvent.click(screen.getByText('Technical Details'));
      
      // Should show error message and stack
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('production mode', () => {
    beforeEach(() => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        configurable: true
      });
      
      return () => {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalEnv,
          configurable: true
        });
      };
    });

    it('should not show technical details in production mode', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Should not show details section
      expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
    });
  });
});