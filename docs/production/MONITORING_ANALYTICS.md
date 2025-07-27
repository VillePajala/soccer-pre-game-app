# Monitoring & Analytics Strategy

## Overview

This document outlines a comprehensive monitoring and analytics strategy for MatchDay Coach to ensure optimal performance, user satisfaction, and business growth.

**Monitoring Stack**: Sentry + Datadog + Custom Dashboard
**Analytics Stack**: Google Analytics 4 + Mixpanel + Custom Events
**Alerting**: PagerDuty + Slack

---

## 1. Application Performance Monitoring (APM)

### 1.1 Frontend Monitoring

#### Sentry Configuration
```typescript
// src/lib/monitoring/sentry.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing({
      tracingOrigins: ['matchdaycoach.com', /^\//],
      routingInstrumentation: Sentry.nextRouterInstrumentation,
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
      sessionSampleRate: 0.1,
      errorSampleRate: 1.0,
    }),
  ],
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  beforeSend(event, hint) {
    // Filter out known issues
    if (event.exception?.values?.[0]?.value?.includes('ResizeObserver')) {
      return null;
    }
    
    // Add user context
    event.user = {
      id: getCurrentUserId(),
      subscription_tier: getUserTier(),
    };
    
    return event;
  },
});
```

#### Performance Metrics
```typescript
// src/lib/monitoring/performance.ts
export class PerformanceMonitor {
  static measurePageLoad() {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      const metrics = {
        dns: perfData.domainLookupEnd - perfData.domainLookupStart,
        tcp: perfData.connectEnd - perfData.connectStart,
        ttfb: perfData.responseStart - perfData.requestStart,
        download: perfData.responseEnd - perfData.responseStart,
        domComplete: perfData.domComplete - perfData.domLoading,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
      };
      
      // Send to analytics
      analytics.track('Page Performance', metrics);
      
      // Send to monitoring
      Sentry.addBreadcrumb({
        category: 'performance',
        message: 'Page load metrics',
        level: 'info',
        data: metrics,
      });
    });
  }
  
  static measureApiCall(endpoint: string, duration: number, status: number) {
    const metric = {
      endpoint,
      duration,
      status,
      timestamp: new Date().toISOString(),
    };
    
    // Send to monitoring if slow
    if (duration > 1000) {
      Sentry.captureMessage('Slow API Call', {
        level: 'warning',
        extra: metric,
      });
    }
    
    // Always track in analytics
    analytics.track('API Performance', metric);
  }
}
```

### 1.2 Backend Monitoring

#### Supabase Function Monitoring
```typescript
// supabase/functions/_shared/monitoring.ts
export async function withMonitoring<T>(
  functionName: string,
  handler: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  const traceId = crypto.randomUUID();
  
  try {
    console.log(`[${traceId}] Starting ${functionName}`);
    
    const result = await handler();
    
    const duration = Date.now() - start;
    console.log(`[${traceId}] Completed ${functionName} in ${duration}ms`);
    
    // Send metrics to monitoring service
    await sendMetrics({
      function: functionName,
      duration,
      status: 'success',
      traceId,
    });
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`[${traceId}] Failed ${functionName} in ${duration}ms:`, error);
    
    // Send error to monitoring
    await sendMetrics({
      function: functionName,
      duration,
      status: 'error',
      error: error.message,
      traceId,
    });
    
    throw error;
  }
}
```

#### Database Performance Monitoring
```sql
-- Create performance monitoring views
CREATE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;

CREATE VIEW table_sizes AS
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY size_bytes DESC;

-- Monitor connection pool
CREATE VIEW connection_stats AS
SELECT 
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active,
  count(*) FILTER (WHERE state = 'idle') as idle,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity;
```

### 1.3 Infrastructure Monitoring

#### Health Check Endpoints
```typescript
// src/pages/api/health.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const checks = {
    server: 'ok',
    database: 'pending',
    cache: 'pending',
    storage: 'pending',
  };
  
  // Check database
  try {
    await supabase.from('health_check').select('*').limit(1);
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
  }
  
  // Check cache (if using Redis)
  try {
    await redis.ping();
    checks.cache = 'ok';
  } catch (error) {
    checks.cache = 'error';
  }
  
  const allHealthy = Object.values(checks).every(status => status === 'ok');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks,
  });
}
```

---

## 2. User Analytics

### 2.1 Google Analytics 4 Setup

```typescript
// src/lib/analytics/ga4.ts
export function initializeGA4() {
  if (typeof window === 'undefined') return;
  
  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]) {
    window.dataLayer.push(args);
  }
  
  gtag('js', new Date());
  gtag('config', process.env.NEXT_PUBLIC_GA4_ID, {
    send_page_view: false,
    custom_map: {
      dimension1: 'user_tier',
      dimension2: 'team_size',
      dimension3: 'games_played',
    },
  });
  
  // Enhanced ecommerce
  gtag('set', {
    country: getUserCountry(),
    currency: getUserCurrency(),
  });
}

// Track custom events
export function trackEvent(eventName: string, parameters?: Record<string, any>) {
  if (typeof window === 'undefined') return;
  
  gtag('event', eventName, {
    ...parameters,
    user_tier: getUserTier(),
    timestamp: new Date().toISOString(),
  });
}
```

### 2.2 Mixpanel Configuration

```typescript
// src/lib/analytics/mixpanel.ts
import mixpanel from 'mixpanel-browser';

export function initializeMixpanel() {
  mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN, {
    debug: process.env.NODE_ENV === 'development',
    track_pageview: true,
    persistence: 'localStorage',
    ip: false, // GDPR compliance
  });
  
  // Set super properties
  mixpanel.register({
    app_version: process.env.NEXT_PUBLIC_APP_VERSION,
    platform: getPlatform(),
    language: navigator.language,
  });
}

// User identification
export function identifyUser(userId: string, properties?: Record<string, any>) {
  mixpanel.identify(userId);
  mixpanel.people.set({
    $email: properties?.email,
    $name: properties?.name,
    subscription_tier: properties?.tier,
    created_at: properties?.createdAt,
    team_count: properties?.teamCount,
  });
}

// Track user actions
export function trackAction(action: string, properties?: Record<string, any>) {
  mixpanel.track(action, {
    ...properties,
    session_id: getSessionId(),
    timestamp: new Date().toISOString(),
  });
}
```

### 2.3 Custom Event Tracking

```typescript
// src/lib/analytics/events.ts
export const AnalyticsEvents = {
  // Onboarding events
  SIGNUP_STARTED: 'Signup Started',
  SIGNUP_COMPLETED: 'Signup Completed',
  ONBOARDING_STARTED: 'Onboarding Started',
  ONBOARDING_COMPLETED: 'Onboarding Completed',
  FIRST_PLAYER_ADDED: 'First Player Added',
  FIRST_GAME_STARTED: 'First Game Started',
  
  // Feature usage
  GAME_STARTED: 'Game Started',
  GAME_ENDED: 'Game Ended',
  GOAL_LOGGED: 'Goal Logged',
  TACTICS_DRAWN: 'Tactics Drawn',
  STATS_VIEWED: 'Stats Viewed',
  DATA_EXPORTED: 'Data Exported',
  
  // Monetization
  PAYWALL_VIEWED: 'Paywall Viewed',
  TRIAL_STARTED: 'Trial Started',
  PURCHASE_INITIATED: 'Purchase Initiated',
  PURCHASE_COMPLETED: 'Purchase Completed',
  SUBSCRIPTION_CANCELLED: 'Subscription Cancelled',
  
  // Engagement
  SESSION_STARTED: 'Session Started',
  SESSION_ENDED: 'Session Ended',
  FEATURE_DISCOVERED: 'Feature Discovered',
  ACHIEVEMENT_UNLOCKED: 'Achievement Unlocked',
};

// Event tracking wrapper
export function track(event: keyof typeof AnalyticsEvents, properties?: Record<string, any>) {
  const eventName = AnalyticsEvents[event];
  
  // Send to all analytics providers
  trackEvent(eventName, properties); // GA4
  trackAction(eventName, properties); // Mixpanel
  
  // Log to console in dev
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', eventName, properties);
  }
}
```

---

## 3. Business Metrics Dashboard

### 3.1 Key Performance Indicators

```typescript
// src/lib/metrics/kpis.ts
export interface KPIMetrics {
  // User metrics
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
  retention: {
    day1: number;
    day7: number;
    day30: number;
  };
  
  // Engagement metrics
  sessionsPerUser: number;
  avgSessionDuration: number;
  gamesPerUser: number;
  featuresUsedPerUser: number;
  
  // Monetization metrics
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  arpu: number; // Average Revenue Per User
  conversionRate: number;
  churnRate: number;
  ltv: number; // Lifetime Value
  
  // Technical metrics
  crashRate: number;
  apiErrorRate: number;
  avgLoadTime: number;
  uptimePercentage: number;
}

// Calculate KPIs
export async function calculateKPIs(): Promise<KPIMetrics> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Fetch data from various sources
  const [users, sessions, revenue, errors] = await Promise.all([
    getUserMetrics(),
    getSessionMetrics(),
    getRevenueMetrics(),
    getErrorMetrics(),
  ]);
  
  return {
    dau: users.active.day,
    wau: users.active.week,
    mau: users.active.month,
    retention: calculateRetention(users),
    sessionsPerUser: sessions.total / users.active.day,
    avgSessionDuration: sessions.avgDuration,
    gamesPerUser: calculateGamesPerUser(),
    featuresUsedPerUser: calculateFeatureAdoption(),
    mrr: revenue.mrr,
    arr: revenue.arr,
    arpu: revenue.mrr / users.active.month,
    conversionRate: revenue.conversions / users.trials,
    churnRate: revenue.churned / revenue.totalSubscribers,
    ltv: calculateLTV(revenue.arpu, revenue.churnRate),
    crashRate: errors.crashes / sessions.total,
    apiErrorRate: errors.apiErrors / errors.apiCalls,
    avgLoadTime: calculateAvgLoadTime(),
    uptimePercentage: calculateUptime(),
  };
}
```

### 3.2 Real-time Dashboard

```typescript
// src/components/Dashboard/MetricsDashboard.tsx
export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  
  useEffect(() => {
    const fetchMetrics = async () => {
      const data = await calculateKPIs();
      setMetrics(data);
    };
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [timeRange]);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* User Metrics */}
      <MetricCard
        title="Daily Active Users"
        value={metrics?.dau || 0}
        change={calculateChange(metrics?.dau, previousDAU)}
        icon={<UsersIcon />}
      />
      
      {/* Revenue Metrics */}
      <MetricCard
        title="Monthly Recurring Revenue"
        value={`$${metrics?.mrr.toFixed(2)}`}
        change={calculateChange(metrics?.mrr, previousMRR)}
        icon={<DollarIcon />}
        format="currency"
      />
      
      {/* Engagement Metrics */}
      <MetricCard
        title="Avg Session Duration"
        value={formatDuration(metrics?.avgSessionDuration || 0)}
        change={calculateChange(metrics?.avgSessionDuration, previousDuration)}
        icon={<ClockIcon />}
      />
      
      {/* Performance Metrics */}
      <MetricCard
        title="Crash-Free Rate"
        value={`${((1 - (metrics?.crashRate || 0)) * 100).toFixed(2)}%`}
        change={calculateChange(1 - metrics?.crashRate, previousCrashFree)}
        icon={<ShieldCheckIcon />}
        format="percentage"
      />
    </div>
  );
}
```

---

## 4. Error Tracking & Alerting

### 4.1 Error Classification

```typescript
// src/lib/monitoring/errors.ts
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  user_id?: string;
  session_id: string;
  url: string;
  user_agent: string;
  timestamp: string;
  feature?: string;
  action?: string;
}

export class ErrorTracker {
  static trackError(
    error: Error,
    severity: ErrorSeverity,
    context?: Partial<ErrorContext>
  ) {
    const fullContext: ErrorContext = {
      session_id: getSessionId(),
      url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      ...context,
    };
    
    // Send to Sentry
    Sentry.captureException(error, {
      level: this.mapSeverityToSentryLevel(severity),
      contexts: {
        app: fullContext,
      },
    });
    
    // Send to analytics
    analytics.track('Error Occurred', {
      error_message: error.message,
      error_stack: error.stack,
      severity,
      ...fullContext,
    });
    
    // Trigger alerts for critical errors
    if (severity === ErrorSeverity.CRITICAL) {
      this.triggerAlert(error, fullContext);
    }
  }
  
  private static triggerAlert(error: Error, context: ErrorContext) {
    // Send to alerting service
    fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'critical_error',
        error: error.message,
        context,
        priority: 'high',
      }),
    });
  }
}
```

### 4.2 Alert Configuration

```yaml
# monitoring/alerts.yaml
alerts:
  - name: high_error_rate
    condition: error_rate > 5%
    duration: 5m
    severity: warning
    channels: [slack, email]
    
  - name: critical_error
    condition: error_severity = "critical"
    duration: immediate
    severity: critical
    channels: [pagerduty, slack, sms]
    
  - name: api_latency
    condition: p95_latency > 1000ms
    duration: 10m
    severity: warning
    channels: [slack]
    
  - name: low_conversion
    condition: daily_conversion_rate < 3%
    duration: 1d
    severity: info
    channels: [email]
    
  - name: high_churn
    condition: monthly_churn_rate > 15%
    duration: 1d
    severity: warning
    channels: [slack, email]
```

### 4.3 Incident Response

```typescript
// src/lib/monitoring/incidents.ts
export class IncidentManager {
  static async createIncident(
    title: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    metrics?: Record<string, any>
  ) {
    const incident = {
      id: generateIncidentId(),
      title,
      severity,
      description,
      status: 'open',
      created_at: new Date().toISOString(),
      metrics,
      timeline: [{
        timestamp: new Date().toISOString(),
        action: 'incident_created',
        user: 'system',
      }],
    };
    
    // Store incident
    await supabase.from('incidents').insert(incident);
    
    // Notify on-call
    if (severity === 'critical' || severity === 'high') {
      await this.pageOnCall(incident);
    }
    
    // Create Slack channel
    if (severity !== 'low') {
      await this.createSlackChannel(incident);
    }
    
    return incident;
  }
  
  static async updateIncidentStatus(
    incidentId: string,
    status: 'investigating' | 'identified' | 'monitoring' | 'resolved',
    notes: string
  ) {
    await supabase
      .from('incidents')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);
    
    // Add to timeline
    await supabase
      .from('incident_timeline')
      .insert({
        incident_id: incidentId,
        timestamp: new Date().toISOString(),
        action: `status_changed_to_${status}`,
        notes,
        user: getCurrentUser(),
      });
  }
}
```

---

## 5. User Behavior Analytics

### 5.1 Feature Adoption Tracking

```typescript
// src/lib/analytics/features.ts
export class FeatureTracker {
  private static readonly FEATURES = [
    'player_management',
    'game_timer',
    'tactics_board',
    'statistics',
    'data_export',
    'season_management',
    'player_assessment',
    'animations',
  ];
  
  static trackFeatureUsage(feature: string, metadata?: Record<string, any>) {
    analytics.track('Feature Used', {
      feature,
      first_time: !hasUsedFeature(feature),
      user_tier: getUserTier(),
      ...metadata,
    });
    
    // Update user profile
    mixpanel.people.set({
      [`has_used_${feature}`]: true,
      [`${feature}_last_used`]: new Date().toISOString(),
    });
    
    // Increment usage counter
    mixpanel.people.increment(`${feature}_usage_count`);
  }
  
  static async getFeatureAdoptionMetrics() {
    const users = await getTotalUsers();
    const adoption: Record<string, number> = {};
    
    for (const feature of this.FEATURES) {
      const usageCount = await getFeatureUsageCount(feature);
      adoption[feature] = (usageCount / users) * 100;
    }
    
    return adoption;
  }
}
```

### 5.2 User Journey Analysis

```typescript
// src/lib/analytics/journey.ts
export class UserJourneyTracker {
  private static journey: string[] = [];
  
  static trackStep(step: string, metadata?: Record<string, any>) {
    this.journey.push(step);
    
    analytics.track('Journey Step', {
      step,
      step_number: this.journey.length,
      previous_step: this.journey[this.journey.length - 2],
      journey_id: getSessionId(),
      ...metadata,
    });
    
    // Track funnel completion
    if (this.isKeyMilestone(step)) {
      this.trackMilestone(step);
    }
  }
  
  private static isKeyMilestone(step: string): boolean {
    const milestones = [
      'signup_completed',
      'first_player_added',
      'first_game_started',
      'first_goal_logged',
      'first_export',
      'subscription_started',
    ];
    
    return milestones.includes(step);
  }
  
  private static trackMilestone(milestone: string) {
    const timeToMilestone = Date.now() - getSessionStartTime();
    
    analytics.track('Milestone Reached', {
      milestone,
      time_to_milestone: timeToMilestone,
      steps_taken: this.journey.length,
      journey: this.journey,
    });
  }
}
```

---

## 6. Performance Monitoring

### 6.1 Web Vitals Tracking

```typescript
// src/lib/monitoring/webvitals.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

export function trackWebVitals() {
  getCLS(metric => sendMetric('CLS', metric));
  getFID(metric => sendMetric('FID', metric));
  getFCP(metric => sendMetric('FCP', metric));
  getLCP(metric => sendMetric('LCP', metric));
  getTTFB(metric => sendMetric('TTFB', metric));
}

function sendMetric(name: string, metric: any) {
  const data = {
    metric: name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
    url: window.location.href,
    timestamp: new Date().toISOString(),
  };
  
  // Send to analytics
  analytics.track('Web Vital', data);
  
  // Alert on poor performance
  if (metric.rating === 'poor') {
    console.warn(`Poor ${name} performance:`, metric.value);
    
    // Send to monitoring
    Sentry.captureMessage(`Poor ${name} performance`, {
      level: 'warning',
      extra: data,
    });
  }
}
```

### 6.2 Resource Usage Monitoring

```typescript
// src/lib/monitoring/resources.ts
export class ResourceMonitor {
  static startMonitoring() {
    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usage = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          percentUsed: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        };
        
        if (usage.percentUsed > 90) {
          console.warn('High memory usage:', usage);
          this.trackHighMemoryUsage(usage);
        }
      }, 30000); // Check every 30 seconds
    }
    
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            this.trackLongTask(entry);
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
    }
  }
  
  private static trackHighMemoryUsage(usage: any) {
    analytics.track('High Memory Usage', usage);
  }
  
  private static trackLongTask(task: PerformanceEntry) {
    analytics.track('Long Task', {
      duration: task.duration,
      startTime: task.startTime,
      name: task.name,
    });
  }
}
```

---

## 7. Custom Dashboards

### 7.1 Executive Dashboard

```sql
-- Executive summary view
CREATE VIEW executive_dashboard AS
WITH user_metrics AS (
  SELECT 
    COUNT(DISTINCT user_id) FILTER (WHERE last_active > NOW() - INTERVAL '1 day') as dau,
    COUNT(DISTINCT user_id) FILTER (WHERE last_active > NOW() - INTERVAL '7 days') as wau,
    COUNT(DISTINCT user_id) FILTER (WHERE last_active > NOW() - INTERVAL '30 days') as mau
  FROM user_activity
),
revenue_metrics AS (
  SELECT 
    SUM(CASE WHEN interval = 'month' THEN amount ELSE amount/12 END) as mrr,
    COUNT(DISTINCT user_id) as paying_users,
    AVG(CASE WHEN interval = 'month' THEN amount ELSE amount/12 END) as arpu
  FROM subscriptions
  WHERE status = 'active'
),
engagement_metrics AS (
  SELECT 
    AVG(session_duration) as avg_session_duration,
    AVG(games_per_user) as avg_games_per_user,
    AVG(features_used) as avg_features_used
  FROM user_engagement
  WHERE date > NOW() - INTERVAL '7 days'
)
SELECT 
  u.dau,
  u.wau,
  u.mau,
  r.mrr,
  r.paying_users,
  r.arpu,
  e.avg_session_duration,
  e.avg_games_per_user,
  e.avg_features_used,
  (r.paying_users::float / u.mau) * 100 as conversion_rate
FROM user_metrics u, revenue_metrics r, engagement_metrics e;
```

### 7.2 Technical Dashboard

```typescript
// src/pages/admin/dashboard.tsx
export function TechnicalDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* API Performance */}
      <ChartCard title="API Response Times">
        <LineChart
          data={apiPerformanceData}
          lines={['p50', 'p95', 'p99']}
          yAxis="Duration (ms)"
        />
      </ChartCard>
      
      {/* Error Rates */}
      <ChartCard title="Error Rates">
        <AreaChart
          data={errorRateData}
          areas={['client_errors', 'server_errors']}
          stacked
        />
      </ChartCard>
      
      {/* Database Performance */}
      <ChartCard title="Database Query Performance">
        <BarChart
          data={queryPerformanceData}
          bars={['avg_time', 'max_time']}
          horizontal
        />
      </ChartCard>
      
      {/* Cache Hit Rate */}
      <ChartCard title="Cache Performance">
        <GaugeChart
          value={cacheHitRate}
          target={95}
          thresholds={[80, 90, 95]}
        />
      </ChartCard>
    </div>
  );
}
```

---

## 8. Alerting Rules

### 8.1 Business Alerts

```yaml
# Business metric alerts
- alert: LowDailyActiveUsers
  expr: dau < 100
  for: 1h
  labels:
    severity: warning
    team: product
  annotations:
    summary: "Low daily active users"
    description: "DAU has dropped below 100 (current: {{ $value }})"

- alert: HighChurnRate
  expr: churn_rate > 0.15
  for: 1d
  labels:
    severity: critical
    team: product
  annotations:
    summary: "High churn rate detected"
    description: "Monthly churn rate is {{ $value | humanizePercentage }}"

- alert: LowConversionRate
  expr: conversion_rate < 0.03
  for: 1d
  labels:
    severity: warning
    team: growth
  annotations:
    summary: "Conversion rate below target"
    description: "Free to paid conversion is {{ $value | humanizePercentage }}"
```

### 8.2 Technical Alerts

```yaml
# Technical alerts
- alert: HighErrorRate
  expr: error_rate > 0.05
  for: 5m
  labels:
    severity: critical
    team: engineering
  annotations:
    summary: "High error rate"
    description: "Error rate is {{ $value | humanizePercentage }}"

- alert: SlowAPIResponse
  expr: api_response_time_p95 > 1000
  for: 10m
  labels:
    severity: warning
    team: engineering
  annotations:
    summary: "Slow API responses"
    description: "95th percentile response time is {{ $value }}ms"

- alert: DatabaseConnectionPoolExhausted
  expr: db_connections_available < 5
  for: 5m
  labels:
    severity: critical
    team: engineering
  annotations:
    summary: "Database connection pool nearly exhausted"
    description: "Only {{ $value }} connections available"
```

---

## 9. Implementation Timeline

### Phase 1: Core Monitoring (Week 1)
- [ ] Set up Sentry for error tracking
- [ ] Implement basic analytics events
- [ ] Create health check endpoints
- [ ] Set up critical alerts

### Phase 2: Analytics (Week 2)
- [ ] Implement GA4 and Mixpanel
- [ ] Create event taxonomy
- [ ] Set up conversion tracking
- [ ] Build KPI calculations

### Phase 3: Dashboards (Week 3)
- [ ] Create executive dashboard
- [ ] Build technical dashboard
- [ ] Set up real-time monitoring
- [ ] Configure alert rules

### Phase 4: Optimization (Week 4)
- [ ] Fine-tune alert thresholds
- [ ] Create custom reports
- [ ] Set up A/B testing framework
- [ ] Document runbooks

---

## 10. Monitoring Checklist

### Pre-Launch
- [ ] Error tracking configured
- [ ] Analytics events implemented
- [ ] Health checks working
- [ ] Alerts configured
- [ ] Dashboards created

### Post-Launch
- [ ] Monitor error rates
- [ ] Track user adoption
- [ ] Review performance metrics
- [ ] Analyze conversion funnel
- [ ] Optimize based on data

---

**Document Status**: Monitoring Strategy v1.0
**Last Updated**: 2025-07-27
**Owner**: Engineering & Product
**Review Schedule**: Monthly