'use client';

import React, { Component, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import logger from '@/utils/logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// Error fallback component
const ErrorFallback: React.FC<{ 
  error: Error | null; 
  resetError: () => void; 
  errorInfo: React.ErrorInfo | null;
}> = ({ error, resetError, errorInfo }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 max-w-lg w-full">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-100 mb-4">
            {t('errorBoundary.title', 'Something went wrong')}
          </h1>
          <p className="text-slate-300 mb-6">
            {t('errorBoundary.description', 'An unexpected error occurred. The development team has been notified.')}
          </p>
          
          {process.env.NODE_ENV === 'development' && error && (
            <details className="text-left bg-slate-900 p-4 rounded border border-slate-600 mb-6">
              <summary className="text-slate-400 cursor-pointer mb-2">
                {t('errorBoundary.technicalDetails', 'Technical Details')}
              </summary>
              <div className="text-xs text-red-400 space-y-2">
                <div>
                  <strong>Error:</strong> {error.message}
                </div>
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1 text-slate-500">
                    {error.stack}
                  </pre>
                </div>
                {errorInfo && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1 text-slate-500">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
          
          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              {t('errorBoundary.tryAgain', 'Try Again')}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-600 hover:bg-slate-500 text-slate-200 font-medium py-2 px-4 rounded-md transition-colors"
            >
              {t('errorBoundary.reloadPage', 'Reload Page')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for monitoring
    logger.error('ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
    });

    // TODO: Send error to monitoring service (Sentry, etc.)
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided, otherwise use default
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;