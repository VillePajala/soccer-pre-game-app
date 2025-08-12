'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireAdmin } from '@/hooks/useAdminAuth';
import { useAuth } from '@/context/AuthContext';

interface HealthData {
  status: string;
  timestamp: string;
  version: string;
  environment: string;
  branch: string;
  commit: string;
  checks: {
    app: string;
    database: string;
    serviceWorker: string;
  };
  metrics: {
    responseTime: number;
    uptime: number;
    memory: {
      used: number;
      total: number;
    };
  };
}

interface MetricsData {
  timestamp: string;
  app: {
    version: string;
    environment: string;
    branch: string;
    commit: string;
  };
  system: {
    uptime: number;
    nodeVersion: string;
    platform: string;
    memory: {
      used: number;
      total: number;
      external: number;
      unit: string;
    };
    cpu: unknown;
  };
  sentry: {
    enabled: boolean;
    environment?: string;
  };
  aggregated: {
    errors24h: number;
    requests24h: number;
    activeUsers24h: number;
    avgResponseTime: number;
    webVitals: {
      lcp: { p50: number | null; p75: number | null; p95: number | null; count: number };
      fid: { p50: number | null; p75: number | null; p95: number | null; count: number };
      cls: { p50: number | null; p75: number | null; p95: number | null; count: number };
      ttfb: { p50: number | null; p75: number | null; p95: number | null; count: number };
      fcp?: { p50: number | null; p75: number | null; p95: number | null; count: number };
      inp?: { p50: number | null; p75: number | null; p95: number | null; count: number };
    };
    metricsInfo: {
      hasData: boolean;
      totalMeasurements: number;
      lastUpdated: number;
    };
  };
}

export default function MonitoringDashboard() {
  const router = useRouter();
  const { signIn, signOut } = useAuth();
  const { isAdmin, isLoading, shouldShowLogin, showAccessDenied, user, role } = useRequireAdmin();
  
  const [health, setHealth] = useState<HealthData | null>(null);
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Login form state
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const fetchData = async () => {
    try {
      // Fetch health data
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      setHealth(healthData);

      // Fetch metrics data
      const metricsRes = await fetch('/api/monitoring/metrics', {
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_MONITORING_API_KEY || '',
        },
      });
      
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }
      
      setError(null);
    } catch (err) {
      setError('Failed to fetch monitoring data');
      console.error('Monitoring fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
      
      if (autoRefresh) {
        const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
        return () => clearInterval(interval);
      }
    }
  }, [autoRefresh, isAdmin]);
  
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    const { error } = await signIn(loginData.email, loginData.password);
    
    if (error) {
      setLoginError('Invalid email or password.');
      return;
    }
    
    // Wait a moment for the auth context to update, then check admin status
    setTimeout(() => {
      // This will be handled by the useRequireAdmin hook's logic
      // If user is not admin after login, shouldShowLogin will remain true
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'ok':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'unhealthy':
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    const color = getStatusColor(status);
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color} bg-opacity-10`}>
        <span className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')} mr-1.5`}></span>
        {status.toUpperCase()}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (showAccessDenied) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-slate-100 mb-4">
            Access Denied
          </h1>
          <p className="text-slate-300 text-sm mb-6">
            You are logged in as <span className="text-indigo-400">{user?.email}</span>, but this account does not have admin privileges required to access this dashboard.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => signOut()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Sign Out & Try Different Account
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-slate-600 hover:bg-slate-500 text-slate-200 font-medium py-2 px-4 rounded-md transition-colors"
            >
              Back to App
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (shouldShowLogin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-slate-100 mb-4 text-center">
            🔒 Admin Login Required
          </h1>
          <p className="text-slate-300 text-sm mb-6 text-center">
            This dashboard requires admin privileges. Please sign in with your admin account.
          </p>
          
          {loginError && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-md">
              <p className="text-red-400 text-sm">{loginError}</p>
            </div>
          )}
          
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder="admin@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 focus:outline-none focus:border-indigo-500"
                placeholder="Enter password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Sign In to Dashboard
            </button>
          </form>
          <div className="mt-4 text-sm text-slate-400 text-center">
            Don&apos;t have admin access?<br/>
            <button 
              onClick={() => router.push('/')}
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Back to App
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading monitoring data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-2 sm:p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto pb-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">Monitoring Dashboard</h1>
              {user && (
                <p className="text-slate-400 text-sm mt-1">
                  Logged in as: {user.email} 
                  {role && <span className="text-indigo-400"> ({role})</span>}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
              <label className="flex items-center gap-2 text-slate-400">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded"
                />
                Auto-refresh
              </label>
              <button
                onClick={fetchData}
                className="px-3 py-2 text-sm sm:px-4 sm:text-base bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
              >
                Refresh
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-3 py-2 text-sm sm:px-4 sm:text-base bg-slate-700 hover:bg-slate-600 text-white rounded-md"
              >
                Back to App
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Health Status */}
        {health && (
          <div className="mb-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">Health Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <div className="text-slate-400 text-sm mb-1">Overall Status</div>
                {getStatusBadge(health.status)}
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Version</div>
                <div className="text-slate-200">{health.version}</div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Environment</div>
                <div className="text-slate-200">{health.environment}</div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Branch</div>
                <div className="text-slate-200">{health.branch}</div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Commit</div>
                <div className="text-slate-200 font-mono">{health.commit}</div>
              </div>
              <div>
                <div className="text-slate-400 text-sm mb-1">Response Time</div>
                <div className="text-slate-200">{health.metrics.responseTime}ms</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700">
              <h3 className="text-lg font-medium text-slate-200 mb-3">Service Checks</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(health.checks).map(([service, status]) => (
                  <div key={service} className="flex items-center justify-between bg-slate-900 rounded p-3">
                    <span className="text-slate-300 capitalize">{service}</span>
                    {getStatusBadge(status)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* System Metrics */}
        {metrics && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-xl font-semibold text-slate-100 mb-4">System Metrics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-900 rounded p-4">
                <div className="text-slate-400 text-sm mb-1">Uptime</div>
                <div className="text-2xl font-semibold text-slate-100">
                  {Math.floor(metrics.system.uptime / 3600)}h {Math.floor((metrics.system.uptime % 3600) / 60)}m
                </div>
              </div>
              <div className="bg-slate-900 rounded p-4">
                <div className="text-slate-400 text-sm mb-1">Memory Usage</div>
                <div className="text-2xl font-semibold text-slate-100">
                  {metrics.system.memory.used}/{metrics.system.memory.total} {metrics.system.memory.unit}
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full"
                    style={{ width: `${(metrics.system.memory.used / metrics.system.memory.total) * 100}%` }}
                  />
                </div>
              </div>
              <div className="bg-slate-900 rounded p-4">
                <div className="text-slate-400 text-sm mb-1">Node Version</div>
                <div className="text-2xl font-semibold text-slate-100">{metrics.system.nodeVersion}</div>
              </div>
              <div className="bg-slate-900 rounded p-4">
                <div className="text-slate-400 text-sm mb-1">Sentry Status</div>
                <div className="text-2xl font-semibold text-slate-100">
                  {metrics.sentry.enabled ? (
                    <span className="text-green-400">Enabled</span>
                  ) : (
                    <span className="text-yellow-400">Disabled</span>
                  )}
                </div>
              </div>
            </div>

            {/* Web Vitals */}
            <div className="border-t border-slate-700 pt-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-slate-200">Web Vitals (24h)</h3>
                {metrics.aggregated.metricsInfo && (
                  <div className="text-sm text-slate-400">
                    {metrics.aggregated.metricsInfo.hasData ? (
                      `${metrics.aggregated.metricsInfo.totalMeasurements} measurements`
                    ) : (
                      'No data yet - interact with the app to generate metrics'
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(metrics.aggregated.webVitals)
                  .filter(([_, values]) => values && typeof values === 'object')
                  .map(([metric, values]) => (
                  <div key={metric} className="bg-slate-900 rounded p-4">
                    <div className="text-slate-400 text-sm mb-2 uppercase">{metric}</div>
                    {values.count > 0 ? (
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">P50:</span>
                          <span className="text-slate-300">
                            {values.p50 !== null ? Math.round(values.p50) : 0}ms
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">P75:</span>
                          <span className="text-slate-300">
                            {values.p75 !== null ? Math.round(values.p75) : 0}ms
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">P95:</span>
                          <span className="text-slate-300">
                            {values.p95 !== null ? Math.round(values.p95) : 0}ms
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-700">
                          <span className="text-slate-500">Samples:</span>
                          <span className="text-slate-300">{values.count}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 text-sm py-4">
                        <div className="text-slate-600 text-2xl mb-1">📊</div>
                        <div>No data</div>
                        <div className="text-xs">Waiting for user interactions</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-slate-500 text-sm">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>
    </div>
  );
}