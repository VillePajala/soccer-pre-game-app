import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

async function getGitInfo() {
  try {
    // Get current branch
    const { stdout: branch } = await execAsync('git rev-parse --abbrev-ref HEAD', { 
      cwd: process.cwd(),
      timeout: 5000 
    });
    
    // Get current commit hash
    const { stdout: commit } = await execAsync('git rev-parse --short HEAD', { 
      cwd: process.cwd(),
      timeout: 5000 
    });
    
    return {
      branch: branch.trim(),
      commit: commit.trim()
    };
  } catch {
    // Fallback to environment variables (Vercel)
    return {
      branch: process.env.VERCEL_GIT_COMMIT_REF || 'unknown',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'unknown'
    };
  }
}

export async function GET() {
  const startTime = Date.now();
  
  // Get git information
  const gitInfo = await getGitInfo();
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV,
    branch: gitInfo.branch,
    commit: gitInfo.commit,
    checks: {
      app: 'ok',
      database: 'unknown',
      serviceWorker: 'unknown',
    },
    metrics: {
      responseTime: 0,
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
      },
    },
  };
  
  // Check database connectivity
  try {
    const supabase = await createServerSupabase();
    // Try to query a table that should exist (games table)
    const { error } = await supabase.from('games').select('id').limit(1);
    
    // If games table doesn't exist, try a simple RPC call or auth check
    if (error && error.message?.includes('does not exist')) {
      // Fallback: test basic connectivity with a simple query
      const { error: authError } = await supabase.auth.getSession();
      health.checks.database = authError ? 'degraded' : 'ok';
    } else {
      health.checks.database = error ? 'degraded' : 'ok';
    }
  } catch {
    health.checks.database = 'error';
    health.status = 'degraded';
  }
  
  // Check service worker
  try {
    await fs.access(path.join(process.cwd(), 'public', 'sw.js'));
    health.checks.serviceWorker = 'ok';
  } catch {
    health.checks.serviceWorker = 'missing';
  }

  // Calculate response time
  health.metrics.responseTime = Date.now() - startTime;
  
  // Determine overall health status
  if (Object.values(health.checks).includes('error')) {
    health.status = 'unhealthy';
  } else if (Object.values(health.checks).includes('degraded')) {
    health.status = 'degraded';
  }
  
  return NextResponse.json(health, {
    status: health.status === 'unhealthy' ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': health.status,
    },
  });
}