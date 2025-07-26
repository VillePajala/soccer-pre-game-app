'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { queryKeys } from '@/config/queryKeys';
import type { Player } from '@/types';

interface GameEvent {
  type: string;
  gameTime: number;
  period: string;
  scorerId?: string;
  assisterId?: string;
  isHomeTeam?: boolean;
}

interface GameData {
  id?: string;
  teamName?: string;
  opponentName?: string;
  gameDate?: string;
  isPlayed?: boolean;
  homeScore?: number;
  awayScore?: number;
  gameEvents?: GameEvent[];
}

export default function DebugStatsCalculation() {
  const [players, setPlayers] = useState<Player[]>([]);

  // Use React Query to get saved games, same as the main app
  const { data: savedGames, isLoading } = useQuery({
    queryKey: queryKeys.savedGames,
    queryFn: async () => {
      const games = await storageManager.getSavedGames();
      return games as Record<string, GameData>;
    }
  });

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    const loadedPlayers = await storageManager.getPlayers();
    setPlayers(loadedPlayers);
  };

  // Calculate stats the same way GameStatsModal does
  const playedGameIds = Object.keys(savedGames || {}).filter(
    id => savedGames?.[id]?.isPlayed !== false
  );

  const totalGames = Object.keys(savedGames || {}).length;
  const gamesWithEvents = Object.values(savedGames || {}).filter(
    game => game?.gameEvents && game.gameEvents.length > 0
  ).length;

  // Calculate player stats
  const playerStats: Record<string, { goals: number; assists: number; games: Set<string> }> = {};
  
  playedGameIds.forEach(gameId => {
    const game = savedGames?.[gameId];
    if (!game?.gameEvents) return;

    game.gameEvents.forEach(event => {
      if (event.type === 'goal') {
        if (event.scorerId) {
          if (!playerStats[event.scorerId]) {
            playerStats[event.scorerId] = { goals: 0, assists: 0, games: new Set() };
          }
          playerStats[event.scorerId].goals++;
          playerStats[event.scorerId].games.add(gameId);
        }
        if (event.assisterId) {
          if (!playerStats[event.assisterId]) {
            playerStats[event.assisterId] = { goals: 0, assists: 0, games: new Set() };
          }
          playerStats[event.assisterId].assists++;
          playerStats[event.assisterId].games.add(gameId);
        }
      }
    });
  });

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    return player ? player.name : `Unknown (${playerId})`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <h1 className="text-3xl font-bold mb-8">Debug Stats Calculation</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Stats Calculation</h1>
        
        <div className="mb-8 bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Game Filtering (Same as GameStatsModal)</h2>
          <p>Total games in savedGames: <span className="font-bold text-yellow-400">{totalGames}</span></p>
          <p>Games after filter (isPlayed !== false): <span className="font-bold text-yellow-400">{playedGameIds.length}</span></p>
          <p>Games with events: <span className="font-bold text-yellow-400">{gamesWithEvents}</span></p>
          
          <div className="mt-4">
            <h3 className="font-semibold mb-2">isPlayed values breakdown:</h3>
            <p>isPlayed = true: <span className="font-bold text-green-400">{Object.values(savedGames || {}).filter(g => g?.isPlayed === true).length}</span></p>
            <p>isPlayed = false: <span className="font-bold text-red-400">{Object.values(savedGames || {}).filter(g => g?.isPlayed === false).length}</span></p>
            <p>isPlayed = undefined: <span className="font-bold text-yellow-400">{Object.values(savedGames || {}).filter(g => g?.isPlayed === undefined).length}</span></p>
          </div>
        </div>

        <div className="mb-8 bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Player Statistics</h2>
          {Object.keys(playerStats).length === 0 ? (
            <p className="text-red-400">No player statistics found!</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2">Player</th>
                  <th className="text-left py-2">Goals</th>
                  <th className="text-left py-2">Assists</th>
                  <th className="text-left py-2">Games</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(playerStats).map(([playerId, stats]) => (
                  <tr key={playerId} className="border-b border-slate-700">
                    <td className="py-2">{getPlayerName(playerId)}</td>
                    <td className="py-2">{stats.goals}</td>
                    <td className="py-2">{stats.assists}</td>
                    <td className="py-2">{stats.games.size}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mb-8 bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Games Included in Stats (First 10)</h2>
          <div className="space-y-2">
            {playedGameIds.slice(0, 10).map(gameId => {
              const game = savedGames?.[gameId];
              const eventCount = game?.gameEvents?.length || 0;
              const goalCount = game?.gameEvents?.filter(e => e.type === 'goal').length || 0;
              return (
                <div key={gameId} className="border-b border-slate-700 pb-2">
                  <p className="text-sm">
                    {game?.teamName} vs {game?.opponentName} - {game?.gameDate}
                  </p>
                  <p className="text-xs text-gray-400">
                    Score: {game?.homeScore}-{game?.awayScore} | 
                    Events: {eventCount} | 
                    Goals: {goalCount} | 
                    isPlayed: {String(game?.isPlayed)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mb-8 bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Sample Game Events (First Game with Events)</h2>
          {(() => {
            const gameWithEvents = playedGameIds.find(id => {
              const game = savedGames?.[id];
              return game?.gameEvents && game.gameEvents.length > 0;
            });
            
            if (!gameWithEvents) {
              return <p className="text-red-400">No games with events found!</p>;
            }
            
            const game = savedGames?.[gameWithEvents];
            return (
              <div>
                <p className="mb-2">{game?.teamName} vs {game?.opponentName}</p>
                {game?.gameEvents?.slice(0, 5).map((event, index) => (
                  <div key={index} className="text-sm border-b border-slate-700 py-1">
                    <p>Type: {event.type} | Time: {event.gameTime}&apos; | Period: {event.period}</p>
                    {event.type === 'goal' && (
                      <p className="text-xs">
                        Scorer: {getPlayerName(event.scorerId || '')} | 
                        Assist: {getPlayerName(event.assisterId || '')}
                      </p>
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