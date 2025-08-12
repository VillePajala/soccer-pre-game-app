import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only initialize Sentry if DSN is provided
if (!SENTRY_DSN) {
  console.warn('Sentry client DSN not found - skipping Sentry initialization');
} else {
  Sentry.init({
    dsn: SENTRY_DSN,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
  
  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Privacy-safe defaults - mask sensitive content
      maskAllText: process.env.NODE_ENV === 'production' ? true : false,
      blockAllMedia: process.env.NODE_ENV === 'production' ? true : false,
      // Allow configuration via env vars
      maskAllInputs: process.env.SENTRY_MASK_INPUTS !== 'false',
    }),
    Sentry.browserTracingIntegration(),
  ],
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out network errors that are expected in offline mode
    if (event.exception?.values?.[0]?.type === 'NetworkError') {
      return null;
    }
    
    // Don't send events in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_SENTRY_DEBUG) {
      return null;
    }
    
    return event;
  },
  
  // Ignore certain errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Facebook related errors
    'fb_xd_fragment',
    // Chrome extensions
    /extensions\//i,
    /^chrome:\/\//i,
    /^moz-extension:\/\//i,
    // Resize observer errors (benign)
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Network errors during offline mode
    'NetworkError',
    'Failed to fetch',
  ],
  
  // Breadcrumb configuration
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy breadcrumbs
    if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') {
      return null;
    }
    return breadcrumb;
  },
  });
}

// Export router transition hook for navigation instrumentation
// This needs to be outside the conditional to avoid module errors
try {
  exports.onRouterTransitionStart = Sentry.captureRouterTransitionStart;
} catch (e) {
  // Fallback when Sentry is not available
  exports.onRouterTransitionStart = () => {};
}