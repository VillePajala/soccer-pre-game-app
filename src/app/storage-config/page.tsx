'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getConfigInfo } from '@/lib/storage/config';
import { authAwareStorageManager } from '@/lib/storage';

export default function StorageConfigPage() {
  const [config, setConfig] = useState<ReturnType<typeof getConfigInfo> | null>(null);
  const [providerName, setProviderName] = useState<string>('');
  const [connectionTest, setConnectionTest] = useState<{ provider: string; online: boolean; error?: string } | null>(null);

  useEffect(() => {
    // Get configuration info
    setConfig(getConfigInfo());
    setProviderName(authAwareStorageManager.getProviderName());
    
    // Test connection
    authAwareStorageManager.isOnline().then(online => {
      setConnectionTest({
        provider: authAwareStorageManager.getProviderName(),
        online
      });
    }).catch(error => {
      setConnectionTest({
        provider: authAwareStorageManager.getProviderName(),
        online: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });
  }, []);

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Storage Configuration</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const isSupabaseOnly = config.provider === 'supabase' && !config.fallbackEnabled;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Storage Configuration</h1>
        
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Current Configuration</h2>
          <div className={`rounded-lg p-6 ${isSupabaseOnly ? 'bg-green-900' : 'bg-yellow-900'}`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-300">Provider</p>
                <p className="text-xl font-semibold">{config.provider}</p>
              </div>
              <div>
                <p className="text-sm text-slate-300">Fallback to localStorage</p>
                <p className="text-xl font-semibold">{config.fallbackEnabled ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-300">Supabase Configured</p>
                <p className="text-xl font-semibold">{config.supabaseConfigured ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-300">Environment</p>
                <p className="text-xl font-semibold">{config.environment}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Environment Variables</h2>
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="space-y-2 font-mono text-sm">
              <p>NEXT_PUBLIC_ENABLE_SUPABASE: <span className="text-green-400">{process.env.NEXT_PUBLIC_ENABLE_SUPABASE || 'not set'}</span></p>
              <p>NEXT_PUBLIC_DISABLE_FALLBACK: <span className="text-green-400">{process.env.NEXT_PUBLIC_DISABLE_FALLBACK || 'not set'}</span></p>
              <p>NEXT_PUBLIC_SUPABASE_URL: <span className="text-green-400">{process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set'}</span></p>
              <p>NEXT_PUBLIC_SUPABASE_ANON_KEY: <span className="text-green-400">{process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</span></p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Storage Manager Status</h2>
          <div className="bg-slate-800 rounded-lg p-6">
            <p className="mb-2">Current Provider: <span className="font-semibold text-yellow-400">{providerName}</span></p>
            {connectionTest && (
              <>
                <p className="mb-2">Connection Status: 
                  <span className={`font-semibold ml-2 ${connectionTest.online ? 'text-green-400' : 'text-red-400'}`}>
                    {connectionTest.online ? 'Online' : 'Offline'}
                  </span>
                </p>
                {connectionTest.error && (
                  <p className="text-red-400 text-sm mt-2">Error: {connectionTest.error}</p>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Status Summary</h2>
          {isSupabaseOnly ? (
            <div className="bg-green-900 rounded-lg p-6">
              <p className="text-xl font-semibold mb-2">✅ App is using Supabase only</p>
              <p className="text-sm">The app is configured to use Supabase as the storage provider with no fallback to localStorage. All data operations will use Supabase.</p>
            </div>
          ) : (
            <div className="bg-yellow-900 rounded-lg p-6">
              <p className="text-xl font-semibold mb-2">⚠️ App may fall back to localStorage</p>
              <p className="text-sm mb-4">To ensure only Supabase is used, add the following to your .env.local file:</p>
              <pre className="bg-slate-800 p-3 rounded text-xs">NEXT_PUBLIC_DISABLE_FALLBACK=true</pre>
              <p className="text-sm mt-2">Then restart your development server.</p>
            </div>
          )}
        </div>

        <div className="mt-8">
          <Link href="/" className="text-indigo-400 hover:text-indigo-300">
            ← Back to App
          </Link>
        </div>
      </div>
    </div>
  );
}