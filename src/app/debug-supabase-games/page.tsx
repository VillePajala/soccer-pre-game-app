'use client';

import React, { useState, useEffect } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export default function DebugSupabaseGames() {
  const [loading, setLoading] = useState(true);
  const [storageGames, setStorageGames] = useState<Record<string, unknown>>({});
  const [directGames, setDirectGames] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Get games through storage manager
      const games = await storageManager.getSavedGames() as Record<string, unknown>;
      setStorageGames(games);

      // Get games directly from Supabase
      const { data: directData, error: directError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (directError) {
        setError(`Direct query error: ${directError.message}`);
      } else {
        setDirectGames(directData || []);
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
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Debug Supabase Games</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const storageGameCount = Object.keys(storageGames).length;
  const directGameCount = directGames.length;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Supabase Games</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-900 rounded">
            <p>Error: {error}</p>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Summary</h2>
          <div className="bg-slate-800 rounded-lg p-4">
            <p>User ID: <span className="font-mono text-sm">{userId}</span></p>
            <p>Games via Storage Manager: <span className="font-bold text-yellow-400">{storageGameCount}</span></p>
            <p>Games via Direct Query: <span className="font-bold text-yellow-400">{directGameCount}</span></p>
            {storageGameCount !== directGameCount && (
              <p className="text-red-400 mt-2">⚠️ Mismatch in game counts!</p>
            )}
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Games from Storage Manager</h2>
          <div className="bg-slate-800 rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Teams</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Score</th>
                  <th className="text-left py-2">Events</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(storageGames).map(([id, game]) => {
                  const g = game as any;
                  return (
                    <tr key={id} className="border-b border-slate-700">
                      <td className="py-2 font-mono text-xs">{id}</td>
                      <td className="py-2">{g.teamName} vs {g.opponentName}</td>
                      <td className="py-2">{g.gameDate}</td>
                      <td className="py-2">{g.homeScore}-{g.awayScore}</td>
                      <td className="py-2">{g.gameEvents?.length || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Games from Direct Supabase Query</h2>
          <div className="bg-slate-800 rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Teams</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Score</th>
                  <th className="text-left py-2">Has game_data</th>
                </tr>
              </thead>
              <tbody>
                {directGames.map((game) => (
                  <tr key={game.id} className="border-b border-slate-700">
                    <td className="py-2 font-mono text-xs">{game.id}</td>
                    <td className="py-2">{game.team_name} vs {game.opponent_name}</td>
                    <td className="py-2">{game.game_date}</td>
                    <td className="py-2">{game.home_score}-{game.away_score}</td>
                    <td className="py-2">{game.game_data ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Diagnostic Details</h2>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="mb-2">Storage Manager Response:</p>
            <pre className="text-xs overflow-x-auto">{JSON.stringify(Object.keys(storageGames), null, 2)}</pre>
            
            <p className="mb-2 mt-4">Direct Query IDs:</p>
            <pre className="text-xs overflow-x-auto">{JSON.stringify(directGames.map(g => g.id), null, 2)}</pre>
          </div>
        </div>

        <div className="mt-8">
          <a href="/" className="text-indigo-400 hover:text-indigo-300">
            ← Back to App
          </a>
        </div>
      </div>
    </div>
  );
}