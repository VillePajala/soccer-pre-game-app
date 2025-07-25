'use client';

import { useEffect, useState } from 'react';
import { getConfigInfo } from '@/lib/storage/config';

export default function DebugPage() {
  const [configInfo, setConfigInfo] = useState<Record<string, unknown> | null>(null);
  const [envVars, setEnvVars] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // Get configuration info
    setConfigInfo(getConfigInfo());
    
    // Get environment variables (safe subset)
    setEnvVars({
      NEXT_PUBLIC_ENABLE_SUPABASE: process.env.NEXT_PUBLIC_ENABLE_SUPABASE,
      NEXT_PUBLIC_DISABLE_FALLBACK: process.env.NEXT_PUBLIC_DISABLE_FALLBACK,
      NEXT_PUBLIC_ENABLE_OFFLINE_CACHE: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_CACHE,
      NEXT_PUBLIC_SUPABASE_URL_SET: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_SET: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NODE_ENV: process.env.NODE_ENV,
    });
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Information</h1>
      
      <section className="mb-6 p-4 bg-purple-100 border border-purple-400 rounded">
        <h2 className="text-xl font-semibold mb-2">Auth Button Status</h2>
        <div className="space-y-2">
          <p><strong>Auth Button Visible:</strong> {envVars?.NEXT_PUBLIC_ENABLE_SUPABASE === 'true' ? '✅ YES' : '❌ NO'}</p>
          <p><strong>NEXT_PUBLIC_ENABLE_SUPABASE:</strong> {envVars?.NEXT_PUBLIC_ENABLE_SUPABASE || 'NOT SET'}</p>
          <p className="text-sm text-gray-600">
            The auth button only shows when NEXT_PUBLIC_ENABLE_SUPABASE is exactly "true" (as a string)
          </p>
        </div>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Configuration</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(configInfo, null, 2)}
        </pre>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Environment Variables</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(envVars, null, 2)}
        </pre>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Troubleshooting</h2>
        <div className="space-y-2">
          {configInfo?.supabaseConfigured === false && (
            <div className="p-3 bg-red-100 border border-red-400 rounded">
              <strong>Supabase Not Configured:</strong> Environment variables are missing.
              <br />
              Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel environment settings.
            </div>
          )}
          {envVars?.NEXT_PUBLIC_ENABLE_SUPABASE === 'true' && !envVars?.NEXT_PUBLIC_SUPABASE_URL_SET && (
            <div className="p-3 bg-yellow-100 border border-yellow-400 rounded">
              <strong>Warning:</strong> Supabase is enabled but URL is not set.
            </div>
          )}
          {configInfo?.provider === 'localStorage' && (
            <div className="p-3 bg-blue-100 border border-blue-400 rounded">
              <strong>Using localStorage:</strong> The app will store data locally in the browser.
            </div>
          )}
        </div>
      </section>
      
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Next Steps</h2>
        <ol className="list-decimal list-inside space-y-1">
          <li>If on Vercel, add environment variables in project settings</li>
          <li>Set NEXT_PUBLIC_SUPABASE_URL to your Supabase project URL</li>
          <li>Set NEXT_PUBLIC_SUPABASE_ANON_KEY to your public anon key</li>
          <li>Redeploy the application</li>
        </ol>
      </section>
    </div>
  );
}