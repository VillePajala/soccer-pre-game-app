'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authAwareStorageManager } from '@/lib/storage';
import { AuthAwareStorageManager } from '@/lib/storage/authAwareStorageManager';
import { OfflineCacheManager } from '@/lib/offline/offlineCacheManager';
import { isSupabaseEnabled, validateSupabaseConfig, getConfigInfo } from '@/lib/storage/config';

export default function DebugStoragePage() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<Record<string, unknown>>({});
  const [managerInfo, setManagerInfo] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const checkStatus = async () => {
      // Get environment info
      const envInfo = {
        NEXT_PUBLIC_ENABLE_SUPABASE: process.env.NEXT_PUBLIC_ENABLE_SUPABASE,
        isSupabaseEnabled: isSupabaseEnabled(),
        validateSupabaseConfig: validateSupabaseConfig(),
        configInfo: getConfigInfo(),
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '[SET]' : '[NOT SET]',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '[SET]' : '[NOT SET]',
      };

      // Get manager info
      let manager = authAwareStorageManager;
      let isWrapped = false;
      
      if (manager instanceof OfflineCacheManager) {
        isWrapped = true;
        const offlineManager = manager as unknown as { primaryProvider: AuthAwareStorageManager };
        manager = offlineManager.primaryProvider;
      }
      
      let authState = null;
      let storageStatus = null;
      
      if (manager instanceof AuthAwareStorageManager) {
        authState = manager.getAuthState();
        storageStatus = await manager.getStatus();
      }

      const info = {
        isWrapped,
        providerName: authAwareStorageManager.getProviderName?.() || 'unknown',
        authState,
        storageStatus,
        managerType: manager.constructor.name,
      };

      setStatus(envInfo);
      setManagerInfo(info);
    };

    if (!authLoading) {
      checkStatus();
    }
  }, [user, authLoading]);

  const forceSupabase = async () => {
    let manager = authAwareStorageManager;
    
    if (manager instanceof OfflineCacheManager) {
      const offlineManager = manager as unknown as { primaryProvider: AuthAwareStorageManager };
      manager = offlineManager.primaryProvider;
    }
    
    if (manager instanceof AuthAwareStorageManager) {
      await manager.forceProvider('supabase');
      window.location.reload();
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Storage Debug Information</h1>
      
      <div className="mb-6 p-4 bg-blue-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Auth Status</h2>
        <p><strong>User:</strong> {user?.email || 'Not signed in'}</p>
        <p><strong>User ID:</strong> {user?.id || 'None'}</p>
      </div>

      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Environment Configuration</h2>
        <pre className="text-sm overflow-auto">{JSON.stringify(status, null, 2)}</pre>
      </div>

      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-xl font-semibold mb-2">Storage Manager Info</h2>
        <pre className="text-sm overflow-auto">{JSON.stringify(managerInfo, null, 2)}</pre>
      </div>

      <div className="mb-6">
        <button
          onClick={forceSupabase}
          disabled={!user}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          Force Switch to Supabase
        </button>
        
        {!user && (
          <p className="mt-2 text-red-600">You must be signed in to force Supabase</p>
        )}
      </div>

      <div className="mt-8">
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-4"
        >
          Go Back to App
        </button>
        <button
          onClick={() => window.location.href = '/import-backup'}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Try Import Again
        </button>
      </div>
    </div>
  );
}