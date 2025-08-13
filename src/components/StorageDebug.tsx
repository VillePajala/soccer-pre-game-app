'use client';

import { useEffect, useState } from 'react';
import { getConfigInfo, isSupabaseEnabled, getProviderType } from '@/lib/storage/config';

export default function StorageDebug() {
  const [config, setConfig] = useState<ReturnType<typeof getConfigInfo> | null>(null);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  useEffect(() => {
    setConfig(getConfigInfo());
    setEnvVars({
      NEXT_PUBLIC_ENABLE_SUPABASE: process.env.NEXT_PUBLIC_ENABLE_SUPABASE || 'undefined',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT_SET',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT_SET',
      NEXT_PUBLIC_DISABLE_FALLBACK: process.env.NEXT_PUBLIC_DISABLE_FALLBACK || 'undefined',
    });
  }, []);

  if (!config) return <div>Loading debug info...</div>;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded text-xs max-w-md z-50">
      <h4 className="font-bold mb-2">🔍 Storage Debug Info</h4>
      
      <div className="mb-2">
        <strong>Provider:</strong> {config.provider}
      </div>
      
      <div className="mb-2">
        <strong>Supabase Enabled:</strong> {isSupabaseEnabled().toString()}
      </div>
      
      <div className="mb-2">
        <strong>Supabase Configured:</strong> {config.supabaseConfigured.toString()}
      </div>
      
      <div className="mb-2">
        <strong>Fallback Enabled:</strong> {config.fallbackEnabled.toString()}
      </div>
      
      <div className="mb-2">
        <strong>Environment:</strong> {config.environment}
      </div>

      <div className="border-t pt-2 mt-2">
        <strong>Environment Variables:</strong>
        <div className="ml-2 text-xs">
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key}>
              <span className="text-gray-300">{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      </div>
      
      <div className="border-t pt-2 mt-2">
        <strong>Expected Provider Type:</strong> {getProviderType()}
      </div>
    </div>
  );
}