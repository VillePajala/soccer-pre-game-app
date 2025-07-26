'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function CheckAllGames() {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<any[]>([]);
  const [error, setError] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    checkGames();
  }, []);

  const checkGames = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Query all games for this user
      const { data, error: queryError } = await supabase
        .from('games')
        .select('id, team_name, opponent_name, game_date, home_score, away_score, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (queryError) {
        setError(queryError.message);
      } else {
        setGames(data || []);
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
        <h1 className="text-3xl font-bold mb-8">Checking All Games in Supabase</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">All Games in Supabase</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-900 rounded">
            <p>Error: {error}</p>
          </div>
        )}

        <div className="mb-4 p-4 bg-slate-800 rounded">
          <p>User ID: <span className="font-mono text-sm">{userId}</span></p>
          <p>Total Games Found: <span className="font-bold text-yellow-400 text-2xl">{games.length}</span></p>
        </div>

        {games.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Teams</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">Score</th>
                  <th className="text-left py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id} className="border-b border-slate-700">
                    <td className="py-2 font-mono text-xs">{game.id}</td>
                    <td className="py-2">{game.team_name} vs {game.opponent_name}</td>
                    <td className="py-2">{game.game_date}</td>
                    <td className="py-2">{game.home_score}-{game.away_score}</td>
                    <td className="py-2 text-xs">{new Date(game.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8">
          <a href="/" className="text-indigo-400 hover:text-indigo-300">
            ← Back to App
          </a>
        </div>
      </div>
    </div>
  );
}