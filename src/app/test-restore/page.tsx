'use client';

import { useState, useRef } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { importBackupToSupabase } from '@/utils/supabaseBackupImport';

export default function TestRestorePage() {
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    console.log('[TestRestore]', message);
  };

  const testStorage = async () => {
    addLog('Testing storage manager...');
    try {
      // Test if we can save a simple player
      const testPlayer = {
        id: '',
        name: 'Test Player ' + Date.now(),
        nickname: 'Test',
        isActive: true
      };
      
      addLog(`Saving test player: ${testPlayer.name}`);
      await storageManager.savePlayer(testPlayer);
      addLog('Test player saved successfully');
      
      // Try to fetch all players
      const players = await storageManager.getPlayers();
      addLog(`Fetched ${players.length} players from storage`);
      
      // Find our test player
      const found = players.find(p => p.name === testPlayer.name);
      if (found) {
        addLog(`Found test player with ID: ${found.id}`);
        // Clean up
        await storageManager.deletePlayer(found.id);
        addLog('Test player deleted');
      } else {
        addLog('ERROR: Test player not found after save');
      }
    } catch (error) {
      addLog(`ERROR in storage test: ${error}`);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    addLog('File input changed event triggered');
    const file = event.target.files?.[0];
    if (!file) {
      addLog('No file selected');
      return;
    }

    setLoading(true);
    setLog([]);
    addLog(`File selected: ${file.name} (${file.size} bytes)`);

    try {
      // Read file
      const text = await file.text();
      addLog(`File read successfully, length: ${text.length}`);

      // Check current storage provider
      const provider = storageManager.getProviderName?.() || 'unknown';
      addLog(`Current storage provider: ${provider}`);

      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(text);
        addLog(`JSON parsed successfully`);
        addLog(`Top-level keys: ${Object.keys(data).join(', ')}`);
      } catch (e) {
        addLog(`ERROR: Failed to parse JSON - ${e}`);
        return;
      }

      // Check backup format
      if (data.localStorage) {
        addLog('Detected localStorage format backup');
        const keys = Object.keys(data.localStorage);
        addLog(`localStorage keys: ${keys.join(', ')}`);
        
        // Show counts
        if (data.localStorage.masterRoster) {
          addLog(`- Players: ${data.localStorage.masterRoster.length}`);
        }
        if (data.localStorage.seasonsList) {
          addLog(`- Seasons: ${data.localStorage.seasonsList.length}`);
        }
        if (data.localStorage.tournamentsList) {
          addLog(`- Tournaments: ${data.localStorage.tournamentsList.length}`);
        }
        if (data.localStorage.savedGames) {
          addLog(`- Games: ${Object.keys(data.localStorage.savedGames).length}`);
        }
      } else if (data.players || data.seasons) {
        addLog('Detected Supabase format backup');
        if (data.players) addLog(`- Players: ${data.players.length}`);
        if (data.seasons) addLog(`- Seasons: ${data.seasons.length}`);
        if (data.tournaments) addLog(`- Tournaments: ${data.tournaments.length}`);
        if (data.savedGames) addLog(`- Games: ${Object.keys(data.savedGames).length}`);
      } else {
        addLog('WARNING: Unrecognized backup format');
      }

      // Try import
      addLog('Starting import...');
      const result = await importBackupToSupabase(text);
      
      addLog(`Import result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      addLog(`Message: ${result.message}`);
      
      if (result.details) {
        addLog('Import details:');
        addLog(`- Players imported: ${result.details.players}`);
        addLog(`- Seasons imported: ${result.details.seasons}`);
        addLog(`- Tournaments imported: ${result.details.tournaments}`);
        addLog(`- Games imported: ${result.details.games}`);
        addLog(`- Settings imported: ${result.details.settings}`);
      }

      // Test: Try to fetch data after import
      addLog('Testing data fetch after import...');
      try {
        const players = await storageManager.getPlayers();
        addLog(`Fetched ${players.length} players from storage`);
        
        const seasons = await storageManager.getSeasons();
        addLog(`Fetched ${seasons.length} seasons from storage`);
      } catch (e) {
        addLog(`ERROR fetching data: ${e}`);
      }

    } catch (error) {
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Backup Restore Test</h1>
      
      <div className="mb-8">
        <div className="mb-4">
          <span className="text-lg font-semibold mb-2 block">Select backup file:</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            disabled={loading}
            className="hidden"
          />
          <button
            onClick={() => {
              addLog('Button clicked - triggering file input');
              fileInputRef.current?.click();
            }}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Choose Backup File
          </button>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm">
            <strong>Current auth status:</strong> {storageManager.getProviderName?.() || 'unknown'}
          </p>
          <button
            onClick={testStorage}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            Test Storage
          </button>
        </div>
      </div>

      <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
        <h2 className="text-lg font-bold mb-2">Import Log:</h2>
        {log.length === 0 ? (
          <p className="text-gray-500">Select a file to start...</p>
        ) : (
          log.map((line, i) => (
            <div key={i} className={line.includes('ERROR') ? 'text-red-400' : line.includes('SUCCESS') ? 'text-green-400' : ''}>
              {line}
            </div>
          ))
        )}
      </div>

      {loading && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2">Processing...</p>
        </div>
      )}
    </div>
  );
}