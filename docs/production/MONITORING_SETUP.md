# Monitoring & Observability Setup Guide

## Overview

This application is configured with comprehensive monitoring and observability features using Sentry for error tracking and custom Web Vitals monitoring for performance metrics.

## Features

### 1. Error Tracking
- Automatic error capture and reporting
- Error boundaries for React components
- Source maps for debugging production errors
- User context and breadcrumbs
- Custom error filtering for offline scenarios

### 2. Performance Monitoring
- Core Web Vitals tracking (CLS, FID, LCP, INP, TTFB, FCP)
- Custom performance transactions
- Long task detection
- Layout shift monitoring
- Performance thresholds and alerts

### 3. Health Monitoring
- `/api/health` endpoint for uptime monitoring
- Database connectivity checks
- Service worker status
- Memory and CPU usage metrics

### 4. Monitoring Dashboard
- Real-time metrics at `/admin/monitoring`
- System health overview
- Web Vitals percentiles
- Auto-refresh capability

## Setup Instructions

### Step 1: Create Sentry Account

1. Go to [https://sentry.io/](https://sentry.io/)
2. Sign up for a free account (or use paid plan for more features)
3. Create a new project:
   - Platform: Next.js
   - Alert frequency: As needed
   - Team: Your team name

### Step 2: Get Sentry Configuration

1. **DSN (Data Source Name)**:
   - Go to Settings → Projects → [Your Project] → Client Keys
   - Copy the DSN value

2. **Organization and Project**:
   - Organization slug: Found in Settings → Organization Settings
   - Project slug: Found in Settings → Projects

3. **Auth Token**:
   - Go to Settings → Account → API → Auth Tokens
   - Create new token with scopes:
     - `project:releases`
     - `org:read`
     - `project:write`

### Step 3: Configure Environment Variables

Add to your `.env.local` file:

```env
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://[your-key]@[your-org].ingest.sentry.io/[project-id]
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token

# Optional: Monitoring API Key
MONITORING_API_KEY=generate-a-secure-key-here

# Application Version (update for each release)
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Step 4: Verify Installation

1. **Test Sentry Integration**:
   - Navigate to `/test-sentry` in your app
   - Click "Send Test Message"
   - Check Sentry dashboard for the message

2. **Check Health Endpoint**:
   ```bash
   curl http://localhost:3000/api/health
   ```

3. **View Monitoring Dashboard**:
   - Navigate to `/admin/monitoring`
   - Verify all metrics are displayed

## Production Deployment

### Vercel Deployment

Add environment variables in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add all Sentry variables for Production environment
3. Redeploy to apply changes

### Source Maps

Source maps are automatically uploaded to Sentry during build when:
- `NODE_ENV=production`
- `SENTRY_AUTH_TOKEN` is set
- Building with `npm run build`

### Performance Budgets

Configure thresholds in `webVitals.ts`:

```typescript
const THRESHOLDS = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FID: { good: 100, needsImprovement: 300 },
  LCP: { good: 2500, needsImprovement: 4000 },
  // ... adjust as needed
};
```

## Monitoring Best Practices

### 1. Alert Configuration

In Sentry, set up alerts for:
- Error rate spikes (> 1% of sessions)
- New error types
- Performance regressions
- Crash-free rate drops

### 2. Custom Context

Add user context for better debugging:

```typescript
import * as Sentry from '@sentry/nextjs';

// After user login
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// Add custom context
Sentry.setContext('game_session', {
  gameId: currentGame.id,
  teamName: currentGame.teamName,
});
```

### 3. Performance Tracking

Track custom operations:

```typescript
import { reportCustomMetric } from '@/lib/monitoring/webVitals';

// Track save operation
const startTime = performance.now();
await saveGame();
reportCustomMetric('game.save.duration', performance.now() - startTime);
```

### 4. Error Boundaries

Wrap critical components:

```tsx
import ErrorBoundary from '@/components/ErrorBoundary';

<ErrorBoundary>
  <CriticalComponent />
</ErrorBoundary>
```

## Troubleshooting

### Sentry Not Receiving Events

1. Check DSN is configured correctly
2. Verify no ad blockers are blocking Sentry
3. Check browser console for errors
4. Ensure CSP allows Sentry domains

### Web Vitals Not Tracking

1. Verify Web Vitals reporter is mounted
2. Check browser supports Performance Observer API
3. Look for errors in console

### Health Check Failing

1. Verify database connection string
2. Check Supabase service is running
3. Review server logs for errors

## Monitoring Checklist

- [ ] Sentry account created and configured
- [ ] Environment variables set in production
- [ ] Test error sent and received
- [ ] Web Vitals tracking verified
- [ ] Health endpoint responding
- [ ] Alerts configured in Sentry
- [ ] Source maps uploading correctly
- [ ] Monitoring dashboard accessible
- [ ] Error boundaries in place
- [ ] Performance budgets defined

## Support

For monitoring issues:
1. Check Sentry status: https://status.sentry.io/
2. Review Sentry docs: https://docs.sentry.io/
3. Check application logs
4. Contact support@matchdaycoach.com