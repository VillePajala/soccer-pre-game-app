'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { fixGameEventPlayerIds } from '@/utils/fixGameEventPlayerIds';
import type { Player } from '@/types';

interface PlayerIdInfo {
  playerId: string;
  playerName: string;
  games: number;
  goals: number;
  assists: number;
}

export default function DebugPlayerIds() {
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerIdIssues, setPlayerIdIssues] = useState<PlayerIdInfo[]>([]);
  const [fixResult, setFixResult] = useState<string>('');
  const [isFixing, setIsFixing] = useState(false);

  useEffect(() => {
    loadDebugData();
  }, []);

  const loadDebugData = async () => {
    setLoading(true);
    try {
      // Load current players
      const currentPlayers = await storageManager.getPlayers();
      setPlayers(currentPlayers);

      // Load all games and check for player ID mismatches
      const savedGames = await storageManager.getSavedGames() as Record<string, unknown>;
      const playerIdStats: Record<string, PlayerIdInfo> = {};

      // Create a set of current player IDs
      const currentPlayerIds = new Set(currentPlayers.map(p => p.id));

      // Check each game for player IDs not in current roster
      Object.values(savedGames).forEach(game => {
        if (!game || typeof game !== 'object') return;
        
        const gameData = game as Record<string, unknown>;
        const gameEvents = gameData.gameEvents as Array<Record<string, unknown>> || [];
        
        gameEvents.forEach(event => {
          if (event.type !== 'goal') return;
          
          // Check scorerId
          const scorerId = event.scorerId as string;
          if (scorerId && !currentPlayerIds.has(scorerId)) {
            // Find player name from game's availablePlayers
            const availablePlayers = gameData.availablePlayers as Array<Record<string, unknown>> || [];
            const scorer = availablePlayers.find(p => p.id === scorerId);
            const scorerName = scorer?.name as string || 'Unknown';
            
            if (!playerIdStats[scorerId]) {
              playerIdStats[scorerId] = {
                playerId: scorerId,
                playerName: scorerName,
                games: 0,
                goals: 0,
                assists: 0
              };
            }
            playerIdStats[scorerId].goals++;
          }
          
          // Check assisterId
          const assisterId = event.assisterId as string;
          if (assisterId && !currentPlayerIds.has(assisterId)) {
            // Find player name from game's availablePlayers
            const availablePlayers = gameData.availablePlayers as Array<Record<string, unknown>> || [];
            const assister = availablePlayers.find(p => p.id === assisterId);
            const assisterName = assister?.name as string || 'Unknown';
            
            if (!playerIdStats[assisterId]) {
              playerIdStats[assisterId] = {
                playerId: assisterId,
                playerName: assisterName,
                games: 0,
                goals: 0,
                assists: 0
              };
            }
            playerIdStats[assisterId].assists++;
          }
        });
      });

      setPlayerIdIssues(Object.values(playerIdStats));
    } catch (error) {
      console.error('Error loading debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFixPlayerIds = async () => {
    setIsFixing(true);
    setFixResult('');
    
    try {
      const result = await fixGameEventPlayerIds();
      setFixResult(result.message);
      
      if (result.success) {
        // Reload debug data to see the changes
        await loadDebugData();
      }
    } catch (error) {
      setFixResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFixing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Debug Player IDs</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Player IDs</h1>
        
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Current Players in Roster</h2>
          <div className="bg-slate-800 rounded-lg p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2">Name</th>
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Jersey</th>
                </tr>
              </thead>
              <tbody>
                {players.map(player => (
                  <tr key={player.id} className="border-b border-slate-700">
                    <td className="py-2">{player.name}</td>
                    <td className="py-2 font-mono text-sm">{player.id}</td>
                    <td className="py-2">{player.jerseyNumber || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Player ID Issues in Game Events</h2>
          {playerIdIssues.length === 0 ? (
            <div className="bg-green-900 rounded-lg p-4">
              <p>✅ No player ID issues found! All game events reference valid player IDs.</p>
            </div>
          ) : (
            <>
              <div className="bg-red-900 rounded-lg p-4 mb-4">
                <p>⚠️ Found {playerIdIssues.length} player IDs in game events that don&apos;t exist in current roster:</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2">Player Name</th>
                      <th className="text-left py-2">Old ID</th>
                      <th className="text-left py-2">Goals</th>
                      <th className="text-left py-2">Assists</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerIdIssues.map(issue => (
                      <tr key={issue.playerId} className="border-b border-slate-700">
                        <td className="py-2">{issue.playerName}</td>
                        <td className="py-2 font-mono text-sm">{issue.playerId}</td>
                        <td className="py-2">{issue.goals}</td>
                        <td className="py-2">{issue.assists}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Fix Player IDs</h2>
          <div className="bg-slate-800 rounded-lg p-4">
            <p className="mb-4">
              This will attempt to fix player IDs in game events by matching player names
              with the current roster. Game events will be updated to use the current player IDs.
            </p>
            <button
              onClick={handleFixPlayerIds}
              disabled={isFixing || playerIdIssues.length === 0}
              className={`px-6 py-2 rounded-md font-medium ${
                isFixing || playerIdIssues.length === 0
                  ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isFixing ? 'Fixing...' : 'Fix Player IDs'}
            </button>
            
            {fixResult && (
              <div className={`mt-4 p-3 rounded ${
                fixResult.includes('Error') ? 'bg-red-800' : 'bg-green-800'
              }`}>
                {fixResult}
              </div>
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