'use client';

import { useState, useEffect } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { useAuthStorage } from '@/hooks/useAuthStorage';
import { calculatePlayerStats } from '@/utils/playerStats';
import { Player, Season, Tournament, AppState } from '@/types';

export default function DebugPlayerStatsPage() {
  const { user } = useAuth();
  useAuthStorage();
  const [debugOutput, setDebugOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    setLoading(true);
    const output: string[] = [];
    
    try {
      // Load all data
      const games = await storageManager.getSavedGames() as Record<string, AppState>;
      const players = await storageManager.getPlayers() as Player[];
      const seasons = await storageManager.getSeasons() as Season[];
      const tournaments = await storageManager.getTournaments() as Tournament[];
      
      output.push('=== PLAYER STATS DEBUG ===\n');
      output.push(`Total games: ${Object.keys(games).length}`);
      output.push(`Total players: ${players.length}`);
      output.push(`Total seasons: ${seasons.length}`);
      output.push(`Total tournaments: ${tournaments.length}\n`);
      
      // Check stats for each player
      for (const player of players) {
        const stats = calculatePlayerStats(player, games, seasons, tournaments);
        
        if (stats.totalGoals > 0 || stats.totalAssists > 0) {
          output.push(`\nPlayer: ${player.name} (#${player.jerseyNumber})`);
          output.push(`  Total Games: ${stats.totalGames}`);
          output.push(`  Total Goals: ${stats.totalGoals}`);
          output.push(`  Total Assists: ${stats.totalAssists}`);
          
          // Check for games where player scored but wasn't in selectedPlayerIds
          let gamesWithEventsButNotSelected = 0;
          Object.entries(games).forEach(([, game]) => {
            const gameData = game as { gameEvents?: Array<{ type: string; scorerId?: string; assisterId?: string }>; selectedPlayerIds?: string[] };
            const hasGoals = gameData.gameEvents?.some((e) => e.type === 'goal' && e.scorerId === player.id);
            const hasAssists = gameData.gameEvents?.some((e) => e.type === 'goal' && e.assisterId === player.id);
            const isSelected = gameData.selectedPlayerIds?.includes(player.id);
            
            if ((hasGoals || hasAssists) && !isSelected) {
              gamesWithEventsButNotSelected++;
            }
          });
          
          if (gamesWithEventsButNotSelected > 0) {
            output.push(`  ⚠️ Games with events but NOT in selectedPlayerIds: ${gamesWithEventsButNotSelected}`);
          }
          
          // Show season stats
          if (Object.keys(stats.performanceBySeason).length > 0) {
            output.push('  Season Stats:');
            Object.entries(stats.performanceBySeason).forEach(([, seasonStats]) => {
              output.push(`    - ${seasonStats.name}: ${seasonStats.gamesPlayed} games, ${seasonStats.goals} goals, ${seasonStats.assists} assists`);
            });
          }
          
          // Show tournament stats
          if (Object.keys(stats.performanceByTournament).length > 0) {
            output.push('  Tournament Stats:');
            Object.entries(stats.performanceByTournament).forEach(([, tournamentStats]) => {
              output.push(`    - ${tournamentStats.name}: ${tournamentStats.gamesPlayed} games, ${tournamentStats.goals} goals, ${tournamentStats.assists} assists`);
            });
          }
        }
      }
      
      output.push('\n=== SUMMARY ===');
      output.push('The calculatePlayerStats function has been updated to include players who have events (goals/assists) even if they are not in selectedPlayerIds.');
      output.push('This should fix the issue where tournament/season/overall stats were missing.');
      
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
      <h1 className="text-2xl font-bold mb-4">Debug Player Stats</h1>
      
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
      
      <div className="mt-4 p-4 bg-green-100 rounded">
        <h2 className="font-bold">Fix Applied:</h2>
        <p>The calculatePlayerStats function now includes players who have any events (goals/assists) in a game, even if they&apos;re not in selectedPlayerIds.</p>
        <p className="mt-2">This ensures that substitute players who scored/assisted are properly counted in all statistics views.</p>
      </div>
    </div>
  );
}