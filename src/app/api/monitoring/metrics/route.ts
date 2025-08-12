import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { metricsStore } from '@/lib/monitoring/metricsStore';

// This endpoint provides detailed metrics for monitoring dashboards
export async function GET(request: Request) {
  // Check for basic auth or API key
  const authHeader = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');
  
  // Simple authentication check (configure your own secret)
  const expectedKey = process.env.MONITORING_API_KEY;
  if (expectedKey && apiKey !== expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get aggregated Web Vitals from store
  const webVitalsAggregated = metricsStore.getWebVitalsAggregated();
  const metricsSummary = metricsStore.getMetricsSummary();
  
  const metrics = {
    timestamp: new Date().toISOString(),
    app: {
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
      branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
      commit: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
    },
    system: {
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        unit: 'MB',
      },
      cpu: process.cpuUsage(),
    },
    sentry: {
      enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || 'unknown',
    },
    // Aggregated metrics from actual data
    aggregated: {
      errors24h: 0, // TODO: Get from error tracking
      requests24h: 0, // TODO: Get from access logs
      activeUsers24h: 0, // TODO: Get from session tracking
      avgResponseTime: 0, // TODO: Get from response time tracking
      webVitals: webVitalsAggregated,
      metricsInfo: {
        hasData: metricsSummary.hasData,
        totalMeasurements: metricsSummary.totalWebVitals,
        lastUpdated: metricsSummary.lastUpdated,
      },
    },
  };
  
  return NextResponse.json(metrics, {
    headers: {
      'Cache-Control': 'private, max-age=10',
    },
  });
}

// POST endpoint to receive custom metrics
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Store Web Vital data in metrics store
    if (body.type === 'webvital') {
      console.log(`📥 [Metrics API] Received Web Vital: ${body.name} = ${body.value}`);
      
      // Store in server-side metrics store
      metricsStore.addWebVital({
        name: body.name,
        value: body.value,
        timestamp: body.timestamp || Date.now(),
        rating: body.rating,
        navigationType: body.navigationType || 'navigate'
      });
      
      console.log(`💾 [Server Store] Stored ${body.name} in server metrics store`);
      
      // Send to Sentry as custom event
      try {
        Sentry.captureMessage(`Web Vital: ${body.name}`, {
          level: body.rating === 'poor' ? 'warning' : 'info',
          contexts: {
            webvital: body,
          },
        });
      } catch (e) {
        console.warn('Failed to send to Sentry:', e);
      }
    } else {
      console.log('Received non-webvital metric:', body);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}