
'use client';

import React, { useState } from 'react';
import { fixGameEventPlayerIds } from '@/utils/fixGameEventPlayerIds';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export default function FixPlayerIdsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleFixPlayerIds = async () => {
    setLoading(true);
    setResult('');
    try {
      // First, ensure the storage manager is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      const manager = storageManager as any;
      if (manager.primaryProvider && typeof manager.primaryProvider.updateAuthState === 'function') {
        manager.primaryProvider.updateAuthState(!!user, user?.id);
      } else if (typeof manager.updateAuthState === 'function') {
        manager.updateAuthState(!!user, user?.id);
      }
      
      const fixResult = await fixGameEventPlayerIds();
      if (fixResult.success) {
        setResult(`Success! ${fixResult.message}`);
      } else {
        setResult(`Error: ${fixResult.message}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResult(`An unexpected error occurred: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Fix Player IDs in Game Events</h1>
        <p className="mb-6 text-slate-400">
          This tool will scan all saved games and update the player IDs in game events 
          (goals, assists, etc.) to match the current roster. This is useful after
          a data import or migration where player IDs may have changed.
        </p>
        <button
          onClick={handleFixPlayerIds}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded disabled:bg-slate-700 disabled:cursor-not-allowed"
        >
          {loading ? 'Fixing...' : 'Start Player ID Fix'}
        </button>
        {result && (
          <div className="mt-6 p-4 bg-slate-800 rounded">
            <h2 className="text-xl font-semibold mb-2">Result</h2>
            <p className="font-mono">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
} 