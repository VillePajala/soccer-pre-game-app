'use client';

import { useState, useEffect } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { useAuthStorage } from '@/hooks/useAuthStorage';

export default function VerifyIdMappingPage() {
  const { user } = useAuth();
  useAuthStorage();
  const [output, setOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const runVerification = async () => {
    setLoading(true);
    const log: string[] = [];
    
    try {
      // Load all data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const games = await storageManager.getSavedGames() as Record<string, any>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const players = await storageManager.getPlayers() as any[];
      
      log.push('=== ID MAPPING VERIFICATION ===');
      log.push(`Total games: ${Object.keys(games).length}`);
      log.push(`Total players: ${players.length}\n`);
      
      // Create a set of all player IDs for quick lookup
      const playerIdSet = new Set(players.map(p => p.id));
      log.push('Current player IDs in roster:');
      players.forEach(p => log.push(`  - ${p.id}: ${p.name} (#${p.jerseyNumber})`));
      log.push('');
      
      // Check each game
      let issueCount = 0;
      for (const [gameId, game] of Object.entries(games)) {
        const issues: string[] = [];
        
        // Check selectedPlayerIds
        if (game.selectedPlayerIds && Array.isArray(game.selectedPlayerIds)) {
          const missingIds = game.selectedPlayerIds.filter((id: string) => !playerIdSet.has(id));
          if (missingIds.length > 0) {
            issues.push(`  - ${missingIds.length} invalid IDs in selectedPlayerIds: ${missingIds.join(', ')}`);
          }
        }
        
        // Check gameEvents
        if (game.gameEvents && Array.isArray(game.gameEvents)) {
          const invalidScorers = new Set<string>();
          const invalidAssisters = new Set<string>();
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          game.gameEvents.forEach((event: any) => {
            if (event.type === 'goal') {
              if (event.scorerId && !playerIdSet.has(event.scorerId)) {
                invalidScorers.add(event.scorerId);
              }
              if (event.assisterId && !playerIdSet.has(event.assisterId)) {
                invalidAssisters.add(event.assisterId);
              }
            }
          });
          
          if (invalidScorers.size > 0) {
            issues.push(`  - ${invalidScorers.size} invalid scorer IDs: ${Array.from(invalidScorers).join(', ')}`);
          }
          if (invalidAssisters.size > 0) {
            issues.push(`  - ${invalidAssisters.size} invalid assister IDs: ${Array.from(invalidAssisters).join(', ')}`);
          }
        }
        
        // Check playersOnField
        if (game.playersOnField && Array.isArray(game.playersOnField)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const invalidFieldPlayers = game.playersOnField.filter((p: any) => !playerIdSet.has(p.id));
          if (invalidFieldPlayers.length > 0) {
            issues.push(`  - ${invalidFieldPlayers.length} invalid IDs in playersOnField`);
          }
        }
        
        if (issues.length > 0) {
          issueCount++;
          log.push(`\nGame: ${game.teamName} vs ${game.opponentName} (${game.gameDate})`);
          log.push(`Game ID: ${gameId}`);
          log.push('Issues:');
          issues.forEach(issue => log.push(issue));
        }
      }
      
      log.push('\n=== SUMMARY ===');
      if (issueCount === 0) {
        log.push('✅ All player IDs are properly mapped!');
        log.push('Statistics should now work correctly.');
      } else {
        log.push(`❌ Found ${issueCount} games with invalid player IDs`);
        log.push('This will cause missing statistics.');
      }
      
      // Check for UUID format
      log.push('\n=== ID FORMAT CHECK ===');
      const nonUuidPlayers = players.filter(p => !p.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
      if (nonUuidPlayers.length > 0) {
        log.push(`Found ${nonUuidPlayers.length} players with non-UUID IDs:`);
        nonUuidPlayers.forEach(p => log.push(`  - ${p.id}: ${p.name}`));
      } else {
        log.push('✅ All player IDs are in UUID format');
      }
      
    } catch (error) {
      log.push(`Error: ${error}`);
    }
    
    setOutput(log);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      runVerification();
    }
  }, [user]);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Verify ID Mapping After Import</h1>
      
      <button
        onClick={runVerification}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Running...' : 'Re-run Verification'}
      </button>
      
      <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs whitespace-pre-wrap">
        {output.join('\n')}
      </pre>
      
      <div className="mt-4 p-4 bg-blue-100 rounded">
        <h2 className="font-bold">What this checks:</h2>
        <ul className="list-disc list-inside mt-2">
          <li>All player IDs in game data exist in the current roster</li>
          <li>selectedPlayerIds contains valid player IDs</li>
          <li>scorerId and assisterId in events are valid</li>
          <li>playersOnField references valid players</li>
          <li>All IDs are in UUID format (Supabase requirement)</li>
        </ul>
      </div>
    </div>
  );
}