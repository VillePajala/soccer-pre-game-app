import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';

// FID has been deprecated in favor of INP in web-vitals v3+
// We'll use a fallback for older browsers
let onFID: ((callback: (metric: Metric) => void) => void) | undefined;
try {
  // @ts-expect-error FID is optional in newer versions
  onFID = require('web-vitals').onFID;
} catch (_e) {
  // FID not available, use INP as fallback
}
import * as Sentry from '@sentry/nextjs';
// import { metricsStore } from './metricsStore'; // Unused - client-side only

// Thresholds based on Google's recommendations
const THRESHOLDS = {
  CLS: { good: 0.1, needsImprovement: 0.25 }, // Cumulative Layout Shift
  FID: { good: 100, needsImprovement: 300 },   // First Input Delay (ms)
  FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint (ms)
  LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint (ms)
  TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte (ms)
  INP: { good: 200, needsImprovement: 500 },   // Interaction to Next Paint (ms)
};

function getRating(metric: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[metric as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function sendToAnalytics(metric: Metric) {
  const rating = getRating(metric.name, metric.value);
  
  // Send to server-side metrics store first (this makes dashboard work)
  console.log(`🎯 [Web Vital Collected] ${metric.name}: ${metric.value} (${rating})`);
  
  // Send to our monitoring API endpoint so server can store it
  fetch('/api/monitoring/metrics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'webvital',
      name: metric.name,
      value: metric.value,
      rating,
      timestamp: Date.now(),
      navigationType: metric.navigationType || 'navigate',
      delta: metric.delta,
      id: metric.id,
      entries: metric.entries?.map(entry => ({
        name: entry.name,
        startTime: entry.startTime,
        duration: 'duration' in entry ? entry.duration : undefined,
      })),
    }),
  }).then(() => {
    console.log(`📤 [Metrics API] Sent ${metric.name} to server store`);
  }).catch(e => {
    console.warn('Failed to send Web Vital to metrics API:', e);
  });
  
  // Try to send to Sentry (but don't fail if this doesn't work)
  try {
    Sentry.setMeasurement(
      metric.name.toLowerCase(),
      metric.value,
      metric.name === 'CLS' ? '' : 'millisecond'
    );
    console.log(`📡 [Sentry] Sent ${metric.name} to Sentry`);
  } catch (e) {
    console.warn('Failed to send metric to Sentry (dashboard will still work):', e);
  }
  
  // Try to send as custom event for tracking (but don't fail if this doesn't work)
  try {
    Sentry.captureMessage(`Web Vital: ${metric.name}`, {
      level: rating === 'poor' ? 'warning' : 'info',
      tags: {
        'webvital.name': metric.name,
        'webvital.rating': rating,
        'webvital.navigationType': metric.navigationType,
      },
      contexts: {
        webvital: {
          name: metric.name,
          value: metric.value,
          rating,
          delta: metric.delta,
          id: metric.id,
          navigationType: metric.navigationType,
          entries: metric.entries?.map(entry => ({
            name: entry.name,
            startTime: entry.startTime,
            duration: 'duration' in entry ? entry.duration : undefined,
          })),
        },
      },
    });
  } catch (e) {
    console.warn('Failed to send Web Vital event to Sentry:', e);
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vital] ${metric.name}: ${metric.value} (${rating})`, metric);
  }
  
  // Send to custom analytics endpoint if needed
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        metric: metric.name,
        value: metric.value,
        rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    }).catch(err => {
      console.error('Failed to send analytics:', err);
    });
  }
}

export function reportWebVitals() {
  // Core Web Vitals
  onCLS(sendToAnalytics);
  if (onFID) {
    onFID(sendToAnalytics);
  }
  onLCP(sendToAnalytics);
  
  // Additional metrics
  onFCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onINP(sendToAnalytics); // New metric replacing FID
}

// Helper function to manually report custom metrics
export function reportCustomMetric(name: string, value: number, unit: string = 'millisecond') {
  // Use standard Sentry measurement API
  try {
    Sentry.setMeasurement(name, value, unit);
  } catch (e) {
    console.warn('Failed to report custom metric:', e);
  }
  
  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Custom Metric] ${name}: ${value} ${unit}`);
  }
}

// Performance observer for additional metrics
export function observePerformance() {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return;
  }
  
  // Observe long tasks (blocking the main thread)
  try {
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) { // Tasks longer than 50ms
          Sentry.captureMessage('Long Task Detected', {
            level: 'warning',
            contexts: {
              performance: {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name,
              },
            },
          });
        }
      }
    });
    longTaskObserver.observe({ entryTypes: ['longtask'] });
  } catch (_e) {
    // Long task observer not supported
  }
  
  // Observe layout shifts
  try {
    const layoutShiftObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if ('value' in entry && entry.value > 0.1) {
          console.warn('Layout shift detected:', entry);
        }
      }
    });
    layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
  } catch (_e) {
    // Layout shift observer not supported
  }
}