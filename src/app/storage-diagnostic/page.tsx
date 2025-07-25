'use client';

import { useEffect, useState } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { AuthAwareStorageManager } from '@/lib/storage/authAwareStorageManager';
import { OfflineCacheManager } from '@/lib/offline/offlineCacheManager';
import { useAuth } from '@/context/AuthContext';

interface Diagnostics {
  timestamp?: string;
  auth?: {
    user: string;
    userId: string | null;
    authLoading: boolean;
    authState: unknown;
  };
  config?: {
    supabaseEnabled: string | undefined;
    supabaseUrlSet: boolean;
    supabaseKeySet: boolean;
    supabaseUrl: string;
  };
  storageManager?: {
    providerName: string;
    currentProviderName: string;
    isOfflineCacheWrapped: boolean;
    isAuthAware: boolean;
  };
  currentData?: Record<string, unknown>;
  localStorage?: Record<string, number | string>;
  error?: string;
}

export default function StorageDiagnosticPage() {
  const { user, loading: authLoading } = useAuth();
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        // Get base manager info
        const baseManager = storageManager;
        let actualManager = baseManager;
        
        // Check if wrapped in offline cache
        if (baseManager instanceof OfflineCacheManager) {
          actualManager = (baseManager as unknown as { primaryProvider: AuthAwareStorageManager }).primaryProvider;
        }
        
        // Get auth state
        let authState = null;
        if (actualManager instanceof AuthAwareStorageManager) {
          authState = actualManager.getAuthState();
        }

        // Get provider info
        const providerName = storageManager.getProviderName?.() || 'unknown';
        const currentProviderName = actualManager.getProviderName?.() || 'unknown';
        
        // Check Supabase config
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const supabaseEnabled = process.env.NEXT_PUBLIC_ENABLE_SUPABASE;
        
        // Get data from different sources
        const storageData = await Promise.all([
          storageManager.getPlayers().catch(e => ({ error: e.message })),
          storageManager.getSeasons().catch(e => ({ error: e.message })),
          storageManager.getTournaments().catch(e => ({ error: e.message })),
          storageManager.getSavedGames().catch(e => ({ error: e.message }))
        ]);
        
        // Check localStorage directly
        const localStorageKeys = [
          'masterRoster',
          'seasonsList', 
          'tournamentsList',
          'savedGames'
        ];
        
        const localStorageData: Record<string, number | string> = {};
        localStorageKeys.forEach(key => {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              localStorageData[key] = Array.isArray(parsed) ? parsed.length : Object.keys(parsed).length;
            } else {
              localStorageData[key] = 0;
            }
          } catch {
            localStorageData[key] = 'error';
          }
        });
        
        setDiagnostics({
          timestamp: new Date().toISOString(),
          auth: {
            user: user?.email || 'Not signed in',
            userId: user?.id || null,
            authLoading,
            authState
          },
          config: {
            supabaseEnabled,
            supabaseUrlSet: !!supabaseUrl,
            supabaseKeySet: !!supabaseKey,
            supabaseUrl: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET'
          },
          storageManager: {
            providerName,
            currentProviderName,
            isOfflineCacheWrapped: baseManager instanceof OfflineCacheManager,
            isAuthAware: actualManager instanceof AuthAwareStorageManager
          },
          currentData: {
            players: Array.isArray(storageData[0]) ? storageData[0].length : storageData[0],
            seasons: Array.isArray(storageData[1]) ? storageData[1].length : storageData[1],
            tournaments: Array.isArray(storageData[2]) ? storageData[2].length : storageData[2],
            games: storageData[3] && typeof storageData[3] === 'object' && !('error' in storageData[3])
              ? Object.keys(storageData[3]).length 
              : storageData[3]
          },
          localStorage: localStorageData
        });
      } catch (error) {
        setDiagnostics({ error: error instanceof Error ? error.message : String(error) });
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      runDiagnostics();
    }
  }, [user, authLoading]);

  if (loading || authLoading) return <div className="p-8">Loading diagnostics...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Storage Diagnostics</h1>
      
      <div className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-auto">
        <pre className="text-sm font-mono whitespace-pre-wrap">
          {JSON.stringify(diagnostics, null, 2)}
        </pre>
      </div>
      
      <div className="mt-8 space-y-4">
        <div className="bg-yellow-100 border border-yellow-400 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Key Issues:</h2>
          {diagnostics.auth?.user === 'Not signed in' && diagnostics.config?.supabaseEnabled === 'true' && (
            <p>• You have Supabase enabled but are not signed in. Sign in to use cloud storage.</p>
          )}
          {diagnostics.storageManager?.currentProviderName === 'localStorage' && diagnostics.auth?.user !== 'Not signed in' && (
            <p>• You are signed in but still using localStorage. The auth state may not have synced.</p>
          )}
          {diagnostics.localStorage && Object.values(diagnostics.localStorage as Record<string, unknown>).some((v) => typeof v === 'number' && v > 0) && 
           diagnostics.currentData && Object.values(diagnostics.currentData as Record<string, unknown>).some((v) => v === 0 || (v && typeof v === 'object' && 'error' in v)) && (
            <p>• Data exists in localStorage but not in current storage provider.</p>
          )}
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}