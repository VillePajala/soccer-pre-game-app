'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authAwareStorageManager } from '@/lib/storage';
import { AuthAwareStorageManager } from '@/lib/storage/authAwareStorageManager';
import { OfflineCacheManager } from '@/lib/offline/offlineCacheManager';

export default function FixAuthPage() {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<string[]>([]);
  const [fixed, setFixed] = useState(false);

  const addStatus = (message: string) => {
    setStatus(prev => [...prev, message]);
  };

  const fixAuthState = () => {
    addStatus('Starting auth state fix...');
    
    // Get the actual manager
    let manager = authAwareStorageManager;
    
    // If wrapped in offline cache, get the primary provider
    if (manager instanceof OfflineCacheManager) {
      const offlineManager = manager as unknown as { primaryProvider: AuthAwareStorageManager };
      manager = offlineManager.primaryProvider;
      addStatus('Found offline cache wrapper, getting primary provider');
    }
    
    // Update auth state if it\'s an AuthAwareStorageManager
    if (manager instanceof AuthAwareStorageManager) {
      addStatus(`Current auth state: ${JSON.stringify(manager.getAuthState())}`);
      addStatus(`Updating auth state to: isAuthenticated=${!!user}, userId=${user?.id || null}`);
      
      // Force update the auth state
      manager.updateAuthState(!!user, user?.id || null);
      
      addStatus(`New auth state: ${JSON.stringify(manager.getAuthState())}`);
      addStatus('Auth state updated successfully!');
      setFixed(true);
    } else {
      addStatus('ERROR: Manager is not an AuthAwareStorageManager');
    }
  };

  useEffect(() => {
    if (!authLoading) {
      addStatus(`Auth loading complete. User: ${user?.email || 'Not signed in'}`);
      addStatus(`User ID: ${user?.id || 'None'}`);
    }
  }, [user, authLoading]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Fix Auth State</h1>
      
      <div className="mb-6 p-4 bg-blue-100 rounded">
        <p className="mb-2"><strong>Current User:</strong> {user?.email || 'Not signed in'}</p>
        <p><strong>User ID:</strong> {user?.id || 'None'}</p>
      </div>

      <div className="mb-6">
        <button
          onClick={fixAuthState}
          disabled={authLoading || !user}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Fix Auth State
        </button>
        
        {!user && (
          <p className="mt-2 text-red-600">You must be signed in to fix the auth state</p>
        )}
      </div>

      {fixed && (
        <div className="mb-6 p-4 bg-green-100 rounded">
          <p className="font-semibold">✅ Auth state fixed!</p>
          <p>Now try refreshing the page or going back to the app.</p>
        </div>
      )}

      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
        <h2 className="text-lg font-bold mb-2">Status Log:</h2>
        {status.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}