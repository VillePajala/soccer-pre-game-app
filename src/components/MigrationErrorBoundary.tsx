/**
 * Migration Error Boundary - Comprehensive error handling for state migration
 * 
 * This component provides safety net for migration-related crashes and automatically
 * falls back to legacy implementations when new store-based components fail.
 */

import React, { Component, ReactNode } from 'react';
import { markComponentFailed, shouldUseLegacyState } from '@/utils/stateMigration';
import logger from '@/utils/logger';
import { safeLocalStorageGet } from '@/utils/safeJson';

interface Props {
  children: ReactNode;
  componentName: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fallbackComponent?: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fallbackProps?: any;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  shouldUseLegacy: boolean;
  retryCount: number;
}

export class MigrationErrorBoundary extends Component<Props, State> {
  private maxRetries = 2;
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      shouldUseLegacy: shouldUseLegacyState(props.componentName),
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { componentName, onError } = this.props;
    
    // Log the error with full context
    logger.error(`[MigrationErrorBoundary] ${componentName} crashed:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });

    // Mark component as failed in migration system
    markComponentFailed(componentName, error);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      shouldUseLegacy: true, // Force legacy mode after crash
    });

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, errorInfo);
      } catch (handlerError) {
        logger.error(`[MigrationErrorBoundary] Error handler failed for ${componentName}:`, handlerError);
      }
    }

    // Report to error tracking service (if available)
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // In a real app, this would report to Sentry, LogRocket, etc.
    const errorReport = {
      component: this.props.componentName,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    };

    logger.error('[MigrationErrorBoundary] Error Report:', errorReport);
    
    // Store error report for debugging
    try {
      const existingReports = safeLocalStorageGet<any[]>('migration-error-reports', []);
      existingReports.push(errorReport);
      // Keep only last 10 reports
      const recentReports = existingReports.slice(-10);
      localStorage.setItem('migration-error-reports', JSON.stringify(recentReports));
    } catch (storageError) {
      logger.error('[MigrationErrorBoundary] Failed to store error report:', storageError);
    }
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= this.maxRetries) {
      logger.warn(`[MigrationErrorBoundary] Max retries exceeded for ${this.props.componentName}`);
      return;
    }

    logger.info(`[MigrationErrorBoundary] Retrying ${this.props.componentName} (attempt ${retryCount + 1})`);

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1,
    });
  };

  private handleForceLegacy = () => {
    logger.info(`[MigrationErrorBoundary] Forcing legacy mode for ${this.props.componentName}`);
    
    // Force legacy mode and reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      shouldUseLegacy: true,
    });
  };

  componentWillUnmount() {
    // Cleanup retry timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    const { hasError, error, retryCount } = this.state;
    // const { shouldUseLegacy } = this.state; // Removed unused variable
    const { children, componentName, fallbackComponent: FallbackComponent, fallbackProps } = this.props;

    // If we have an error and a fallback component, render it
    if (hasError && FallbackComponent) {
      return <FallbackComponent {...fallbackProps} />;
    }

    // If we have an error but no fallback component, render error UI
    if (hasError) {
      return (
        <div className="p-4 border border-red-300 rounded-lg bg-red-50">
          <div className="flex items-center mb-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Component Error: {componentName}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error?.message || 'An unexpected error occurred'}</p>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {retryCount < this.maxRetries && (
              <button
                onClick={this.handleRetry}
                className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
              >
                Retry ({this.maxRetries - retryCount} attempts left)
              </button>
            )}
            
            <button
              onClick={this.handleForceLegacy}
              className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 transition-colors"
            >
              Use Legacy Mode
            </button>
          </div>
          
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4">
              <summary className="text-sm text-red-600 cursor-pointer">Show Error Details (Dev)</summary>
              <pre className="mt-2 text-xs text-red-700 bg-red-100 p-2 rounded overflow-auto">
                {error?.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    // Normal render - no error
    return <>{children}</>;
  }
}

// Higher-order component for easy wrapping
export function withMigrationErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName: string,
  fallbackComponent?: React.ComponentType<P>
) {
  const WithErrorBoundary = (props: P) => (
    <MigrationErrorBoundary
      componentName={componentName}
      fallbackComponent={fallbackComponent}
      fallbackProps={props}
    >
      <WrappedComponent {...props} />
    </MigrationErrorBoundary>
  );

  WithErrorBoundary.displayName = `withMigrationErrorBoundary(${componentName})`;
  return WithErrorBoundary;
}

// Hook for programmatic error boundary usage
export function useMigrationErrorHandler(componentName: string) {
  const handleError = React.useCallback((error: Error) => {
    logger.error(`[useMigrationErrorHandler] ${componentName} error:`, error);
    markComponentFailed(componentName, error);
  }, [componentName]);

  return { handleError };
}

export default MigrationErrorBoundary;