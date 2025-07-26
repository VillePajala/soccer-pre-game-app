'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import { authAwareStorageManager as storageManager } from '@/lib/storage';

export default function RefreshGamesCache() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>('');
  const [games, setGames] = useState<Record<string, unknown>>({});

  const handleRefreshCache = async () => {
    setStatus('Refreshing...');
    try {
      // Invalidate the cache
      await queryClient.invalidateQueries({ queryKey: queryKeys.savedGames });
      
      // Force refetch
      await queryClient.refetchQueries({ queryKey: queryKeys.savedGames });
      
      // Get the fresh data directly
      const freshGames = await storageManager.getSavedGames() as Record<string, unknown>;
      setGames(freshGames);
      
      setStatus(`Cache refreshed! Found ${Object.keys(freshGames).length} games`);
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearAndRefresh = async () => {
    setStatus('Clearing and refreshing...');
    try {
      // Remove the query from cache entirely
      queryClient.removeQueries({ queryKey: queryKeys.savedGames });
      
      // Fetch fresh data
      const freshGames = await storageManager.getSavedGames() as Record<string, unknown>;
      setGames(freshGames);
      
      // Set the new data in cache
      queryClient.setQueryData(queryKeys.savedGames, freshGames);
      
      setStatus(`Cache cleared and refreshed! Found ${Object.keys(freshGames).length} games`);
    } catch (error) {
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Refresh Games Cache</h1>
        
        <div className="space-y-4">
          <button
            onClick={handleRefreshCache}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md font-medium"
          >
            Refresh Cache
          </button>
          
          <button
            onClick={handleClearAndRefresh}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-md font-medium ml-4"
          >
            Clear & Refresh Cache
          </button>
        </div>

        {status && (
          <div className="mt-6 p-4 bg-slate-800 rounded">
            <p>{status}</p>
          </div>
        )}

        {Object.keys(games).length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Games Found:</h2>
            <div className="bg-slate-800 rounded-lg p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2">ID</th>
                    <th className="text-left py-2">Teams</th>
                    <th className="text-left py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(games).map(([id, game]) => {
                    const g = game as Record<string, unknown>;
                    return (
                      <tr key={id} className="border-b border-slate-700">
                        <td className="py-2 font-mono text-xs">{id}</td>
                        <td className="py-2">{String(g.teamName || '')} vs {String(g.opponentName || '')}</td>
                        <td className="py-2">{String(g.gameDate || '')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-8">
          <Link href="/" className="text-indigo-400 hover:text-indigo-300">
            ← Back to App
          </Link>
        </div>
      </div>
    </div>
  );
}