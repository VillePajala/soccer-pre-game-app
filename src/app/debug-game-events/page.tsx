'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import type { Player } from '@/types';

interface GameEventData {
  type: string;
  gameTime: number;
  period: string;
  scorerId?: string;
  assisterId?: string;
  isHomeTeam?: boolean;
}

interface GameData {
  id: string;
  teamName: string;
  opponentName: string;
  gameDate: string;
  isPlayed?: boolean;
  gameEvents?: GameEventData[];
}

export default function DebugGameEvents() {
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState<GameData[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load current players
      const currentPlayers = await storageManager.getPlayers();
      setPlayers(currentPlayers);

      // Load all games
      const savedGames = await storageManager.getSavedGames() as Record<string, unknown>;
      const gamesList: GameData[] = [];

      Object.entries(savedGames).forEach(([id, game]) => {
        if (!game || typeof game !== 'object') return;
        
        const gameData = game as Record<string, unknown>;
        gamesList.push({
          id,
          teamName: String(gameData.teamName || ''),
          opponentName: String(gameData.opponentName || ''),
          gameDate: String(gameData.gameDate || ''),
          isPlayed: gameData.isPlayed as boolean,
          gameEvents: gameData.gameEvents as GameEventData[] || []
        });
      });

      // Sort by date
      gamesList.sort((a, b) => new Date(b.gameDate).getTime() - new Date(a.gameDate).getTime());
      setGames(gamesList);

      // Select first game with events
      const firstGameWithEvents = gamesList.find(g => g.gameEvents && g.gameEvents.length > 0);
      if (firstGameWithEvents) {
        setSelectedGameId(firstGameWithEvents.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlayerName = (playerId?: string) => {
    if (!playerId) return 'None';
    const player = players.find(p => p.id === playerId);
    return player ? player.name : `Unknown (${playerId})`;
  };

  const selectedGame = games.find(g => g.id === selectedGameId);
  const totalGoals = games.reduce((sum, game) => {
    const goals = game.gameEvents?.filter(e => e.type === 'goal') || [];
    return sum + goals.length;
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Debug Game Events</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Game Events</h1>
        
        <div className="mb-8 bg-slate-800 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-2">Summary</h2>
          <p>Total Games: <span className="font-bold text-yellow-400">{games.length}</span></p>
          <p>Games with isPlayed=true: <span className="font-bold text-yellow-400">{games.filter(g => g.isPlayed === true).length}</span></p>
          <p>Games with isPlayed=false: <span className="font-bold text-yellow-400">{games.filter(g => g.isPlayed === false).length}</span></p>
          <p>Games with isPlayed=undefined: <span className="font-bold text-yellow-400">{games.filter(g => g.isPlayed === undefined).length}</span></p>
          <p>Games with Events: <span className="font-bold text-yellow-400">{games.filter(g => g.gameEvents && g.gameEvents.length > 0).length}</span></p>
          <p>Total Goals in All Games: <span className="font-bold text-yellow-400">{totalGoals}</span></p>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Select Game to View Events</h2>
          <select
            value={selectedGameId}
            onChange={(e) => setSelectedGameId(e.target.value)}
            className="w-full p-2 bg-slate-700 rounded-md"
          >
            <option value="">Select a game</option>
            {games.map(game => (
              <option key={game.id} value={game.id}>
                {game.teamName} vs {game.opponentName} - {game.gameDate} 
                ({game.gameEvents?.length || 0} events, isPlayed: {String(game.isPlayed)})
              </option>
            ))}
          </select>
        </div>

        {selectedGame && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Events for: {selectedGame.teamName} vs {selectedGame.opponentName}
            </h2>
            <div className="bg-slate-800 rounded-lg p-4">
              {selectedGame.gameEvents && selectedGame.gameEvents.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Time</th>
                      <th className="text-left py-2">Period</th>
                      <th className="text-left py-2">Scorer</th>
                      <th className="text-left py-2">Assister</th>
                      <th className="text-left py-2">Team</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedGame.gameEvents.map((event, index) => (
                      <tr key={index} className="border-b border-slate-700">
                        <td className="py-2">{event.type}</td>
                        <td className="py-2">{event.gameTime}'</td>
                        <td className="py-2">{event.period}</td>
                        <td className="py-2">{getPlayerName(event.scorerId)}</td>
                        <td className="py-2">{getPlayerName(event.assisterId)}</td>
                        <td className="py-2">{event.isHomeTeam ? 'Home' : 'Away'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-yellow-400">No events in this game</p>
              )}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">All Games Overview</h2>
          <div className="bg-slate-800 rounded-lg p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2">Teams</th>
                  <th className="text-left py-2">Date</th>
                  <th className="text-left py-2">isPlayed</th>
                  <th className="text-left py-2">Events</th>
                  <th className="text-left py-2">Goals</th>
                </tr>
              </thead>
              <tbody>
                {games.map(game => {
                  const goalCount = game.gameEvents?.filter(e => e.type === 'goal').length || 0;
                  return (
                    <tr key={game.id} className="border-b border-slate-700">
                      <td className="py-2">{game.teamName} vs {game.opponentName}</td>
                      <td className="py-2">{game.gameDate}</td>
                      <td className="py-2">
                        <span className={game.isPlayed === true ? 'text-green-400' : 'text-red-400'}>
                          {String(game.isPlayed)}
                        </span>
                      </td>
                      <td className="py-2">{game.gameEvents?.length || 0}</td>
                      <td className="py-2">{goalCount}</td>
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