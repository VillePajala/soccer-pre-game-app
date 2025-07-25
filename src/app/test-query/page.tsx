'use client';

import { useState, useEffect } from 'react';
import { getSavedGames } from '@/utils/savedGames';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { useAuthStorage } from '@/hooks/useAuthStorage';

export default function TestQueryPage() {
  const { user } = useAuth();
  useAuthStorage(); // Ensure auth state is synced
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testQuery = async () => {
      setResult('');
      
      // Test 1: Direct getSavedGames call
      setResult(prev => prev + '=== Test 1: Direct getSavedGames() ===\n');
      try {
        const games = await getSavedGames();
        setResult(prev => prev + `Type: ${typeof games}\n`);
        setResult(prev => prev + `Is null: ${games === null}\n`);
        setResult(prev => prev + `Is undefined: ${games === undefined}\n`);
        setResult(prev => prev + `Keys: ${games ? Object.keys(games).length : 'N/A'}\n`);
        setResult(prev => prev + `First few keys: ${games ? Object.keys(games).slice(0, 3).join(', ') : 'N/A'}\n`);
      } catch (error) {
        setResult(prev => prev + `Error: ${error}\n`);
      }
      
      // Test 2: Direct storageManager call
      setResult(prev => prev + '\n=== Test 2: Direct storageManager.getSavedGames() ===\n');
      try {
        const games = await storageManager.getSavedGames();
        setResult(prev => prev + `Type: ${typeof games}\n`);
        setResult(prev => prev + `Is null: ${games === null}\n`);
        setResult(prev => prev + `Keys: ${games ? Object.keys(games as object).length : 'N/A'}\n`);
      } catch (error) {
        setResult(prev => prev + `Error: ${error}\n`);
      }
      
      // Test 3: Auth state
      setResult(prev => prev + '\n=== Test 3: Auth State ===\n');
      setResult(prev => prev + `User authenticated: ${!!user}\n`);
      setResult(prev => prev + `User ID: ${user?.id || 'none'}\n`);
      setResult(prev => prev + `Storage provider: ${storageManager.getProviderName?.() || 'unknown'}\n`);
      
      setLoading(false);
    };

    testQuery();
  }, [user]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Test Query Function</h1>
      
      {loading ? (
        <p>Testing...</p>
      ) : (
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
          {result}
        </div>
      )}
      
      <div className="mt-8">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-4"
        >
          Refresh
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Back to App
        </button>
      </div>
    </div>
  );
}