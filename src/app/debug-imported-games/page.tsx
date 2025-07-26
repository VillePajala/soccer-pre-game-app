'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { authAwareStorageManager as storageManager } from '@/lib/storage';

interface GameRecord {
  id: string;
  team_name: string;
  opponent_name: string;
  game_date: string;
  home_score: number;
  away_score: number;
  created_at: string;
  game_data?: Record<string, unknown>;
}

export default function DebugImportedGames() {
  const [loading, setLoading] = useState(true);
  const [directGames, setDirectGames] = useState<GameRecord[]>([]);
  const [storageGames, setStorageGames] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Get games directly from Supabase
      const { data: games, error: queryError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (queryError) {
        setError(queryError.message);
      } else {
        setDirectGames(games || []);
      }

      // Get games through storage manager
      const storageData = await storageManager.getSavedGames() as Record<string, unknown>;
      setStorageGames(storageData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fixImportedGames = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      let fixed = 0;
      for (const game of directGames) {
        if (game.game_data && typeof game.game_data === 'object') {
          // Check if isPlayed is missing or undefined
          const gameData = game.game_data as Record<string, unknown>;
          if (gameData.isPlayed === undefined || gameData.isPlayed === null) {
            // Set isPlayed to true for all imported games
            gameData.isPlayed = true;
            
            // Update the game in Supabase
            const { error: updateError } = await supabase
              .from('games')
              .update({ game_data: gameData })
              .eq('id', game.id);

            if (updateError) {
              console.error(`Failed to update game ${game.id}:`, updateError);
            } else {
              fixed++;
              console.log(`Fixed game ${game.id} - set isPlayed to true`);
            }
          }
        }
      }

      alert(`Fixed ${fixed} games. Please refresh the page.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <h1 className="text-3xl font-bold mb-8">Debug Imported Games</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Imported Games</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-900 rounded">
            <p>Error: {error}</p>
          </div>
        )}

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Summary</h2>
          <div className="bg-slate-800 rounded-lg p-4">
            <p>Total games in database: <span className="font-bold text-yellow-400">{directGames.length}</span></p>
            <p>Games visible in app: <span className="font-bold text-yellow-400">{Object.keys(storageGames).length}</span></p>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={fixImportedGames}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-md font-medium"
          >
            Fix Imported Games (Set isPlayed=true)
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Game Details</h2>
          <div className="bg-slate-800 rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Teams</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">isPlayed</th>
                  <th className="text-left py-2">Has game_data</th>
                  <th className="text-left py-2">Visible in App</th>
                </tr>
              </thead>
              <tbody>
                {directGames.map((game: GameRecord) => {
                  const gameData = game.game_data;
                  const isVisible = storageGames[game.id] !== undefined;
                  return (
                    <tr key={game.id} className="border-b border-slate-700">
                      <td className="py-2 font-mono text-xs">{game.id}</td>
                      <td className="py-2">{game.team_name} vs {game.opponent_name}</td>
                      <td className="py-2">{game.game_date}</td>
                      <td className="py-2">
                        <span className={gameData?.isPlayed === false ? 'text-red-400' : 'text-green-400'}>
                          {gameData?.isPlayed === undefined ? 'undefined' : String(gameData?.isPlayed)}
                        </span>
                      </td>
                      <td className="py-2">{game.game_data ? 'Yes' : 'No'}</td>
                      <td className="py-2">
                        <span className={isVisible ? 'text-green-400' : 'text-red-400'}>
                          {isVisible ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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