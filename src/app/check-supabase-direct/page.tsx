'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { authAwareStorageManager as storageManager } from '@/lib/storage';

export default function CheckSupabaseDirect() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [directGames, setDirectGames] = useState<Array<Record<string, unknown>>>([]);
  const [storageGames, setStorageGames] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string>('');
  const [storageError, setStorageError] = useState<string>('');

  useEffect(() => {
    checkData();
  }, []);

  const checkData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Query games directly from Supabase
      const { data: games, error: queryError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (queryError) {
        setError(`Supabase query error: ${queryError.message}`);
      } else {
        setDirectGames(games || []);
      }

      // Try to get games through storage manager
      try {
        const games = await storageManager.getSavedGames() as Record<string, unknown>;
        setStorageGames(games || {});
      } catch (storageErr) {
        setStorageError(storageErr instanceof Error ? storageErr.message : 'Unknown error');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <h1 className="text-3xl font-bold mb-8">Checking Supabase Direct</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Supabase Direct Check</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-900 rounded">
            <p>Error: {error}</p>
          </div>
        )}

        <div className="mb-6 p-4 bg-slate-800 rounded">
          <p>User ID: <span className="font-mono text-sm">{userId}</span></p>
          <p>Storage Provider: <span className="font-bold text-yellow-400">{storageManager.getProviderName?.() || 'Unknown'}</span></p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Direct Supabase Query</h2>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="mb-2">Games found: <span className="font-bold text-yellow-400 text-2xl">{directGames.length}</span></p>
            {directGames.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-400 mb-2">First 5 games:</p>
                {directGames.slice(0, 5).map((game) => (
                  <div key={String(game.id)} className="border-b border-slate-700 py-2">
                    <p className="text-sm">
                      {String(game.team_name || '')} vs {String(game.opponent_name || '')} - {String(game.game_date || '')}
                    </p>
                    <p className="text-xs text-gray-400">
                      ID: {String(game.id || '')} | Has game_data: {game.game_data ? 'Yes' : 'No'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Storage Manager Query</h2>
          <div className="bg-slate-800 rounded-lg p-4">
            {storageError ? (
              <p className="text-red-400">Error: {storageError}</p>
            ) : (
              <>
                <p className="mb-2">Games found: <span className="font-bold text-yellow-400 text-2xl">{Object.keys(storageGames).length}</span></p>
                {Object.keys(storageGames).length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-2">First 5 game IDs:</p>
                    {Object.keys(storageGames).slice(0, 5).map((id) => (
                      <p key={id} className="text-xs font-mono">{id}</p>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Comparison</h2>
          <div className="bg-slate-800 rounded-lg p-4">
            <p>Direct Supabase: <span className="font-bold text-yellow-400">{directGames.length}</span> games</p>
            <p>Storage Manager: <span className="font-bold text-yellow-400">{Object.keys(storageGames).length}</span> games</p>
            {directGames.length !== Object.keys(storageGames).length && (
              <p className="text-red-400 mt-2">⚠️ Mismatch in game counts!</p>
            )}
          </div>
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