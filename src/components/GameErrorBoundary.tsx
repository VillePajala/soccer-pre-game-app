/**
 * Game Error Boundary - Critical component error handling
 * Addresses CR-007: Missing Error Boundaries in Critical Paths
 */

import React, { Component, ReactNode } from 'react';
import logger from '@/utils/logger';

interface Props {
  children: ReactNode;
  componentName: string;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showRetryButton?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export class GameErrorBoundary extends Component<Props, State> {
  private maxRetries = 2;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { componentName, onError } = this.props;
    
    // Log the error with context
    logger.error(`[${componentName}] Component Error:`, error);
    logger.error(`[${componentName}] Error Info:`, errorInfo);
    
    // Store detailed error information
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    onError?.(error, errorInfo);

    // Store error report for debugging
    try {
      const errorReport = {
        component: componentName,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        errorInfo: {
          componentStack: errorInfo.componentStack
        },
        timestamp: new Date().toISOString(),
        retryCount: this.state.retryCount,
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const existingReports = JSON.parse(localStorage.getItem('game-error-reports') || '[]');
      existingReports.push(errorReport);
      // Keep only last 10 reports
      const recentReports = existingReports.slice(-10);
      localStorage.setItem('game-error-reports', JSON.stringify(recentReports));
    } catch (storageError) {
      logger.error(`[${componentName}] Failed to store error report:`, storageError);
    }
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      logger.log(`[${this.props.componentName}] Retrying component (attempt ${retryCount + 1})`);
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { 
        componentName, 
        fallbackTitle = 'Something went wrong',
        fallbackMessage = 'An error occurred in the game component. Please try refreshing the page.',
        showRetryButton = true
      } = this.props;
      
      const canRetry = this.state.retryCount < this.maxRetries && showRetryButton;

      return (
        <div className="min-h-[200px] flex items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="text-center max-w-md">
            <div className="mb-4">
              <svg 
                className="mx-auto h-12 w-12 text-red-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {fallbackTitle}
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
              {fallbackMessage}
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Debug Info
                </summary>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  <div><strong>Component:</strong> {componentName}</div>
                  <div><strong>Error:</strong> {this.state.error?.message}</div>
                  <div><strong>Retry Count:</strong> {this.state.retryCount}/{this.maxRetries}</div>
                </div>
              </details>
            )}
            
            <div className="space-x-3">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Try Again
                </button>
              )}
              
              <button
                onClick={this.handleReload}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy wrapping
export function withGameErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string,
  errorBoundaryProps?: Partial<Props>
) {
  const WrappedComponent = (props: T) => (
    <GameErrorBoundary componentName={componentName} {...errorBoundaryProps}>
      <Component {...props} />
    </GameErrorBoundary>
  );

  WrappedComponent.displayName = `withGameErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}