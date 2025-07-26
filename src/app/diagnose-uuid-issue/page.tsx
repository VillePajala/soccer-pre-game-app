'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import type { Player } from '@/types';
import type { IStorageProvider } from '@/lib/storage/types';

// Define a more specific type for the storage manager to satisfy the linter
type AuthAwareManager = IStorageProvider & {
  updateAuthState?: (isAuthenticated: boolean, userId: string | null) => void;
  primaryProvider?: {
    updateAuthState?: (isAuthenticated: boolean, userId: string | null) => void;
  };
};

interface GameRecord {
  id: string;
  team_name: string;
  opponent_name: string;
  game_date: string;
  game_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export default function DiagnoseUuidIssue() {
  const [loading, setLoading] = useState(true);
  const [directGames, setDirectGames] = useState<GameRecord[]>([]);
  const [storageGames, setStorageGames] = useState<Record<string, unknown>>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Explicitly update the storage manager with the auth state
      const manager: AuthAwareManager = storageManager;
      if (manager.primaryProvider && typeof manager.primaryProvider.updateAuthState === 'function') {
        manager.primaryProvider.updateAuthState(!!user, user.id);
      } else if (typeof manager.updateAuthState === 'function') {
        manager.updateAuthState(!!user, user.id);
      }

      // Load players
      const loadedPlayers = await storageManager.getPlayers();
      setPlayers(loadedPlayers);

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
      setStorageGames(storageData || {});

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const analyzeGame = (game: GameRecord) => {
    const gameData = game.game_data as Record<string, unknown> | undefined;
    if (!gameData) return { hasData: false };

    const events = gameData.gameEvents as Array<Record<string, unknown>> || [];
    const goalEvents = events.filter(e => e.type === 'goal');
    
    // Check player IDs in events
    const playerIdsInEvents = new Set<string>();
    const unmatchedPlayerIds = new Set<string>();
    
    goalEvents.forEach(event => {
      if (event.scorerId && typeof event.scorerId === 'string') {
        playerIdsInEvents.add(event.scorerId);
        if (!players.find(p => p.id === event.scorerId)) {
          unmatchedPlayerIds.add(event.scorerId);
        }
      }
      if (event.assisterId && typeof event.assisterId === 'string') {
        playerIdsInEvents.add(event.assisterId);
        if (!players.find(p => p.id === event.assisterId)) {
          unmatchedPlayerIds.add(event.assisterId);
        }
      }
    });

    return {
      hasData: true,
      isPlayed: gameData.isPlayed,
      eventCount: events.length,
      goalCount: goalEvents.length,
      playerIdsInEvents: Array.from(playerIdsInEvents),
      unmatchedPlayerIds: Array.from(unmatchedPlayerIds),
      idFormat: game.id.includes('-') ? 'UUID' : 'Old Format'
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <h1 className="text-3xl font-bold mb-8">Diagnose UUID Issue</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Diagnose UUID & Player ID Issue</h1>
        
        {error && (
          <div className="mb-4 p-4 bg-red-900 rounded">
            <p>Error: {error}</p>
          </div>
        )}

        <div className="mb-6 bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Summary</h2>
          <p>Games in Supabase: <span className="font-bold text-yellow-400">{directGames.length}</span></p>
          <p>Games via Storage Manager: <span className="font-bold text-yellow-400">{Object.keys(storageGames).length}</span></p>
          <p>Current Players in Roster: <span className="font-bold text-yellow-400">{players.length}</span></p>
        </div>

        <div className="mb-6 bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Game Analysis</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2">Game ID</th>
                  <th className="text-left py-2">ID Format</th>
                  <th className="text-left py-2">Teams</th>
                  <th className="text-left py-2">isPlayed</th>
                  <th className="text-left py-2">Goals</th>
                  <th className="text-left py-2">Player Issues</th>
                  <th className="text-left py-2">In Storage?</th>
                </tr>
              </thead>
              <tbody>
                {directGames.map(game => {
                  const analysis = analyzeGame(game);
                  const inStorage = storageGames[game.id] !== undefined;
                  
                  return (
                    <tr key={game.id} className="border-b border-slate-700">
                      <td className="py-2 font-mono text-xs">{game.id.substring(0, 8)}...</td>
                      <td className="py-2">
                        <span className={analysis.idFormat === 'UUID' ? 'text-green-400' : 'text-yellow-400'}>
                          {analysis.idFormat}
                        </span>
                      </td>
                      <td className="py-2 text-xs">{game.team_name} vs {game.opponent_name}</td>
                      <td className="py-2">
                        <span className={analysis.isPlayed === true ? 'text-green-400' : 'text-red-400'}>
                          {String(analysis.isPlayed)}
                        </span>
                      </td>
                      <td className="py-2">{analysis.goalCount || 0}</td>
                      <td className="py-2">
                        {analysis.unmatchedPlayerIds && analysis.unmatchedPlayerIds.length > 0 ? (
                          <span className="text-red-400">{analysis.unmatchedPlayerIds.length} unmatched</span>
                        ) : (
                          <span className="text-green-400">OK</span>
                        )}
                      </td>
                      <td className="py-2">
                        <span className={inStorage ? 'text-green-400' : 'text-red-400'}>
                          {inStorage ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-6 bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Player ID Format Check</h2>
          <p className="mb-2">Current roster player IDs:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {players.slice(0, 10).map(player => (
              <div key={player.id} className="font-mono">
                {player.name}: {player.id.substring(0, 8)}... ({player.id.includes('-') ? 'UUID' : 'Old'})
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Detailed Game Check (First game with goals)</h2>
          {(() => {
            const gameWithGoals = directGames.find(g => {
              const analysis = analyzeGame(g);
              return analysis.goalCount && analysis.goalCount > 0;
            });
            
            if (!gameWithGoals) {
              return <p className="text-yellow-400">No games with goals found</p>;
            }
            
            const gameData = gameWithGoals.game_data as Record<string, unknown>;
            const events = gameData.gameEvents as Array<Record<string, unknown>> || [];
            const goalEvents = events.filter(e => e.type === 'goal');
            
            return (
              <div>
                <p className="mb-2">{gameWithGoals.team_name} vs {gameWithGoals.opponent_name}</p>
                <p className="text-sm mb-2">Game ID: {gameWithGoals.id}</p>
                {goalEvents.map((event, idx) => (
                  <div key={idx} className="border-b border-slate-700 py-2 text-sm">
                    <p>Goal at {String(event.gameTime || 0)}&apos;</p>
                    <p>Scorer ID: {String(event.scorerId || 'none')}</p>
                    <p>Scorer in roster: {players.find(p => p.id === event.scorerId) ? 'Yes' : 'No'}</p>
                    {Boolean(event.assisterId) && (
                      <>
                        <p>Assist ID: {String(event.assisterId)}</p>
                        <p>Assister in roster: {players.find(p => p.id === event.assisterId) ? 'Yes' : 'No'}</p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}
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