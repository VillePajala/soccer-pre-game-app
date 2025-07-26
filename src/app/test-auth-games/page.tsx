'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { authAwareStorageManager as storageManager } from '@/lib/storage';

export default function TestAuthGames() {
  const { user, loading: authLoading } = useAuth();
  const [games, setGames] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!authLoading) {
      loadGames();
    }
  }, [authLoading, user]);

  const loadGames = async () => {
    setLoading(true);
    try {
      if (!user) {
        setError('Not authenticated');
        setGames({});
      } else {
        const savedGames = await storageManager.getSavedGames() as Record<string, unknown>;
        setGames(savedGames || {});
        setError('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setGames({});
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <h1 className="text-3xl font-bold mb-8">Test Auth & Games</h1>
        <p>Loading... (Auth: {authLoading ? 'loading' : 'ready'}, Data: {loading ? 'loading' : 'ready'})</p>
      </div>
    );
  }

  const gameCount = Object.keys(games).length;
  const gamesList = Object.entries(games).slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Test Auth & Games</h1>
        
        <div className="mb-6 bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Authentication Status</h2>
          <p>User: <span className="font-bold text-yellow-400">{user ? user.email : 'Not authenticated'}</span></p>
          <p>User ID: <span className="font-mono text-sm">{user?.id || 'N/A'}</span></p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900 rounded">
            <p>Error: {error}</p>
          </div>
        )}

        <div className="mb-6 bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Games Data</h2>
          <p>Storage Provider: <span className="font-bold text-yellow-400">{storageManager.getProviderName?.() || 'Unknown'}</span></p>
          <p>Total Games Found: <span className="font-bold text-yellow-400 text-2xl">{gameCount}</span></p>
          
          {gameCount > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-400 mb-2">First 5 games:</p>
              {gamesList.map(([id, game]) => {
                const g = game as Record<string, unknown>;
                return (
                  <div key={id} className="border-b border-slate-700 py-2">
                    <p className="text-sm">
                      {String(g.teamName || '')} vs {String(g.opponentName || '')} - {String(g.gameDate || '')}
                    </p>
                    <p className="text-xs text-gray-400">
                      ID: {id} | isPlayed: {String(g.isPlayed)} | Events: {Array.isArray(g.gameEvents) ? g.gameEvents.length : 0}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mb-6">
          <button
            onClick={loadGames}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-medium"
          >
            Reload Games
          </button>
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