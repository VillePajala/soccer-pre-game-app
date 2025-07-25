'use client';

import { useEffect, useState } from 'react';

export default function EnvCheckPage() {
  const [checks, setChecks] = useState<Record<string, unknown>>({});
  
  useEffect(() => {
    // Check all environment variables
    const envChecks = {
      NEXT_PUBLIC_ENABLE_SUPABASE: process.env.NEXT_PUBLIC_ENABLE_SUPABASE,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NODE_ENV: process.env.NODE_ENV,
    };
    
    // Check localStorage to see if auth is working
    const authData = {
      'sb-auth-token': localStorage.getItem('sb-auth-token') ? 'EXISTS' : 'NOT FOUND',
    };
    
    setChecks({
      env: envChecks,
      auth: authData,
      checks: {
        supabaseEnabled: process.env.NEXT_PUBLIC_ENABLE_SUPABASE === 'true',
        supabaseUrlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKeySet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    });
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Environment Variable Check</h1>
      
      <div className="space-y-6">
        <div className="bg-red-100 border border-red-400 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">⚠️ Critical Issue</h2>
          <p>Your environment variables are not being loaded in the Vercel deployment.</p>
          <p className="mt-2">The yellow debug bar shows: <code>ENV: undefined</code></p>
        </div>

        <div className="bg-blue-100 border border-blue-400 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">🔍 Current Environment</h2>
          <pre className="bg-white p-4 rounded mt-2 overflow-auto">
            {JSON.stringify(checks, null, 2)}
          </pre>
        </div>

        <div className="bg-green-100 border border-green-400 p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">✅ Vercel Setup Checklist</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <strong>vercel.com</strong> and log in</li>
            <li>Select your project: <strong>soccer-pre-game-app</strong></li>
            <li>Click on <strong>Settings</strong> tab</li>
            <li>Click on <strong>Environment Variables</strong> in the left sidebar</li>
            <li>Add these variables EXACTLY as shown:
              <div className="bg-white p-3 rounded mt-2 font-mono text-sm">
                <div>NEXT_PUBLIC_ENABLE_SUPABASE = true</div>
                <div>NEXT_PUBLIC_SUPABASE_URL = {process.env.NEXT_PUBLIC_SUPABASE_URL || '[your-supabase-url]'}</div>
                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY = [your-anon-key]</div>
              </div>
            </li>
            <li>For each variable, check ALL boxes: ✅ Production ✅ Preview ✅ Development</li>
            <li>Click <strong>Save</strong></li>
            <li>Go to <strong>Deployments</strong> tab</li>
            <li>Find the latest deployment, click the 3 dots menu (...)</li>
            <li>Click <strong>Redeploy</strong></li>
            <li>Select <strong>Use existing Build Cache: NO</strong></li>
            <li>Click <strong>Redeploy</strong></li>
          </ol>
        </div>

        <div className="bg-yellow-100 border border-yellow-400 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">⚡ Quick Test</h2>
          <p>After redeploying, the yellow debug bar should show:</p>
          <code className="block bg-white p-2 rounded mt-2">
            TopBarDebug - ENV: true | === &quot;true&quot;: YES | truthy: YES
          </code>
        </div>
      </div>
    </div>
  );
}