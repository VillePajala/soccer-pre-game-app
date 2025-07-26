'use client';

import { useState, useEffect } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { useAuthStorage } from '@/hooks/useAuthStorage';
import type { Player } from '@/types';

export default function DebugStatsDetailedPage() {
  const { user } = useAuth();
  useAuthStorage();
  const [debugOutput, setDebugOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    const output: string[] = [];
    
    try {
      // Load all data
      const games = await storageManager.getSavedGames() as Record<string, unknown>;
      const players = await storageManager.getPlayers() as Player[];
      
      output.push('=== DEBUG PLAYER STATS ISSUES ===\n');
      output.push(`Total games: ${Object.keys(games).length}`);
      output.push(`Total players in roster: ${players.length}\n`);
      
      // Check each game for issues
      let issueCount = 0;
      
      for (const [gameId, game] of Object.entries(games)) {
        const gameIssues: string[] = [];
        const gameData = game as { 
          gameEvents?: Array<{ type: string; scorerId?: string; assisterId?: string; time?: number }>; 
          selectedPlayerIds?: string[]; 
          teamName?: string; 
          opponentName?: string; 
          gameDate?: string; 
          seasonId?: string; 
          tournamentId?: string 
        };
        
        // Check if game has events
        if (!gameData.gameEvents || gameData.gameEvents.length === 0) {
          continue; // Skip games without events
        }
        
        // Get all scorer/assister IDs from events
        const eventPlayerIds = new Set<string>();
        gameData.gameEvents.forEach((event) => {
          if (event.type === 'goal') {
            if (event.scorerId) eventPlayerIds.add(event.scorerId);
            if (event.assisterId) eventPlayerIds.add(event.assisterId);
          }
        });
        
        // Check if all event players are in selectedPlayerIds
        const selectedSet = new Set(gameData.selectedPlayerIds || []);
        const missingFromSelected: string[] = [];
        
        eventPlayerIds.forEach(playerId => {
          if (!selectedSet.has(playerId)) {
            const player = players.find(p => p.id === playerId);
            const playerName = player ? player.name : 'Unknown';
            missingFromSelected.push(`${playerId} (${playerName})`);
          }
        });
        
        if (missingFromSelected.length > 0) {
          issueCount++;
          gameIssues.push(`Game: ${gameData.teamName} vs ${gameData.opponentName} (${gameData.gameDate})`);
          gameIssues.push(`  Game ID: ${gameId}`);
          gameIssues.push(`  ⚠️ Players with events but NOT in selectedPlayerIds:`);
          missingFromSelected.forEach(p => gameIssues.push(`    - ${p}`));
          gameIssues.push(`  Selected players: ${gameData.selectedPlayerIds?.length || 0}`);
          gameIssues.push(`  Total events: ${gameData.gameEvents.length}`);
          
          // Show sample events
          const sampleEvents = gameData.gameEvents
            .filter((e) => e.type === 'goal' && missingFromSelected.some(m => m.includes(e.scorerId || '')))
            .slice(0, 3);
          if (sampleEvents.length > 0) {
            gameIssues.push('  Sample problematic events:');
            sampleEvents.forEach((e) => {
              gameIssues.push(`    - Goal by ${e.scorerId || 'Unknown'} at ${e.time || 0}s`);
            });
          }
          gameIssues.push('');
        }
        
        // Also check if scorer IDs exist in the player roster
        const missingFromRoster: string[] = [];
        eventPlayerIds.forEach(playerId => {
          if (!players.find(p => p.id === playerId)) {
            missingFromRoster.push(playerId);
          }
        });
        
        if (missingFromRoster.length > 0) {
          if (missingFromSelected.length === 0) issueCount++;
          gameIssues.push(`  ❌ Player IDs in events but NOT in roster:`);
          missingFromRoster.forEach(id => gameIssues.push(`    - ${id}`));
          gameIssues.push('');
        }
        
        if (gameIssues.length > 0) {
          output.push(...gameIssues);
        }
      }
      
      output.push(`\n=== SUMMARY ===`);
      output.push(`Games with issues: ${issueCount}`);
      output.push(`\nThis explains why stats are missing!`);
      output.push(`The GameStatsModal only counts goals/assists for players in selectedPlayerIds.`);
      output.push(`But some players scored goals without being in selectedPlayerIds.`);
      
      // Check data structure from Supabase
      output.push(`\n=== SUPABASE DATA STRUCTURE CHECK ===`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const firstGame = Object.values(games)[0] as any;
      if (firstGame) {
        output.push(`Sample game structure:`);
        output.push(`- Has gameEvents: ${!!firstGame.gameEvents}`);
        output.push(`- Has selectedPlayerIds: ${!!firstGame.selectedPlayerIds}`);
        output.push(`- Has availablePlayers: ${!!firstGame.availablePlayers}`);
        output.push(`- Has playersOnField: ${!!firstGame.playersOnField}`);
        
        if (firstGame.gameEvents && firstGame.gameEvents.length > 0) {
          output.push(`\nSample event structure:`);
          const sampleEvent = firstGame.gameEvents[0];
          output.push(JSON.stringify(sampleEvent, null, 2));
        }
      }
      
    } catch (error) {
      output.push(`Error: ${error}`);
    }
    
    setDebugOutput(output);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      runDebug();
    }
  }, [user]);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Player Stats Issues</h1>
      
      <button
        onClick={runDebug}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Running...' : 'Re-run Debug'}
      </button>
      
      <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs whitespace-pre-wrap">
        {debugOutput.join('\n')}
      </pre>
      
      <div className="mt-4 p-4 bg-yellow-100 rounded">
        <h2 className="font-bold">The Fix:</h2>
        <p>The GameStatsModal needs to be updated to:</p>
        <ol className="list-decimal list-inside mt-2">
          <li>Include ALL players who have events, not just those in selectedPlayerIds</li>
          <li>Or update selectedPlayerIds to include all players who participated (including substitutes)</li>
        </ol>
      </div>
    </div>
  );
}