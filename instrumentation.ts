import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side configuration
    const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    
    // Only initialize Sentry if DSN is provided
    if (!dsn) {
      console.warn('Sentry DSN not found - skipping Sentry initialization');
      return;
    }
    
    Sentry.init({
      dsn,
      
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Release tracking
      release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
      
      // Disable in development unless explicitly enabled
      enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_DEBUG,
      
      // Error filtering
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
          return null;
        }
        
        return event;
      },
      
      // Ignore certain errors
      ignoreErrors: [
        // Database connection errors that are handled
        'ECONNREFUSED',
        // Timeout errors that are retried
        'ETIMEDOUT',
        'ECONNRESET',
      ],
    });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime configuration
    const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
    
    // Only initialize Sentry if DSN is provided
    if (!dsn) {
      console.warn('Sentry DSN not found - skipping Sentry edge initialization');
      return;
    }
    
    Sentry.init({
      dsn,
      
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      
      // Release tracking
      release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
      
      // Disable in development unless explicitly enabled
      enabled: process.env.NODE_ENV === 'production' || !!process.env.SENTRY_DEBUG,
      
      // Error filtering
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (process.env.NODE_ENV === 'development' && !process.env.SENTRY_DEBUG) {
          return null;
        }
        
        return event;
      },
    });
  }
}

export const onRequestError = Sentry.captureRequestError;