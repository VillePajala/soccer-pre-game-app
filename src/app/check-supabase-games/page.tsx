'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function CheckSupabaseGamesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkGames = async () => {
      if (!user) {
        setData({ error: 'Not authenticated' });
        setLoading(false);
        return;
      }

      try {
        // Check games directly in Supabase
        const { data: games, error: gamesError } = await supabase
          .from('games')
          .select('id, team_name, opponent_name, home_score, away_score, game_date, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (gamesError) {
          setData({ error: `Games error: ${gamesError.message}` });
        } else {
          setData({
            userId: user.id,
            gameCount: games?.length || 0,
            games: games || []
          });
        }
      } catch (error) {
        setData({ error: `Error: ${error}` });
      } finally {
        setLoading(false);
      }
    };

    checkGames();
  }, [user]);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Check Supabase Games Directly</h1>
      
      <div className="mb-4 p-4 bg-blue-100 rounded">
        <p><strong>User ID:</strong> {data.userId || 'Not authenticated'}</p>
        <p><strong>Total games in Supabase:</strong> {data.gameCount || 0}</p>
      </div>

      {data.error && (
        <div className="mb-4 p-4 bg-red-100 rounded">
          <p className="text-red-600">{data.error}</p>
        </div>
      )}

      {data.games && data.games.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-semibold mb-2">Games in Database:</h2>
          {data.games.map((game: any, index: number) => (
            <div key={game.id} className="bg-gray-100 p-3 rounded">
              <p className="text-sm">
                <strong>{index + 1}.</strong> {game.team_name} vs {game.opponent_name} | 
                Score: {game.home_score}-{game.away_score} | 
                Date: {game.game_date} |
                ID: {game.id.substring(0, 8)}...
              </p>
            </div>
          ))}
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