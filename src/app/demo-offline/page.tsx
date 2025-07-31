'use client';

import { useState, useEffect } from 'react';
import { OfflineFirstStorageManager } from '@/lib/storage/offlineFirstStorageManager';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import type { Player, TimerState } from '@/types';

export default function OfflineDemo() {
  const [storageManager, setStorageManager] = useState<OfflineFirstStorageManager | null>(null);
  
  // Initialize storage manager only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const manager = new OfflineFirstStorageManager({
        enableOfflineMode: true,
        syncOnReconnect: true,
        maxRetries: 3,
        batchSize: 5
      });
      setStorageManager(manager);
    }
  }, []);

  const connectionStatus = useConnectionStatus();
  const [players, setPlayers] = useState<Player[]>([]);
  const [timerState, setTimerState] = useState<TimerState | null>(null);
  const [syncStats, setSyncStats] = useState<Record<string, unknown> | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to add log entries
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Load initial data
  useEffect(() => {
    if (!storageManager) return;
    
    const loadData = async () => {
      try {
        const playersData = await storageManager.getPlayers();
        setPlayers(playersData);
        addLog(`Loaded ${playersData.length} players from IndexedDB`);

        const stats = await storageManager.getSyncStats();
        setSyncStats(stats);
        addLog(`Sync queue: ${stats.pendingCount} pending, ${stats.failedCount} failed`);
      } catch (error) {
        addLog(`Error loading data: ${error}`);
      }
    };

    loadData();
  }, [storageManager]);

  // Demo functions
  const addPlayer = async () => {
    if (!storageManager) return;
    
    setIsLoading(true);
    try {
      const newPlayer: Player = {
        id: `player-${Date.now()}`,
        name: `Test Player ${Math.floor(Math.random() * 1000)}`,
        jerseyNumber: (Math.floor(Math.random() * 99) + 1).toString(),
        isGoalie: Math.random() < 0.1 // 10% chance of being a goalie
      };

      const savedPlayer = await storageManager.savePlayer(newPlayer);
      setPlayers(prev => [...prev, savedPlayer]);
      addLog(`✅ Added player: ${savedPlayer.name} (Jersey #${savedPlayer.jerseyNumber})`);

      // Update sync stats
      const stats = await storageManager.getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      addLog(`❌ Failed to add player: ${error}`);
    }
    setIsLoading(false);
  };

  const deleteLastPlayer = async () => {
    if (!storageManager) return;
    
    if (players.length === 0) {
      addLog('⚠️ No players to delete');
      return;
    }

    setIsLoading(true);
    try {
      const playerToDelete = players[players.length - 1];
      await storageManager.deletePlayer(playerToDelete.id);
      setPlayers(prev => prev.slice(0, -1));
      addLog(`🗑️ Deleted player: ${playerToDelete.name}`);

      // Update sync stats
      const stats = await storageManager.getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      addLog(`❌ Failed to delete player: ${error}`);
    }
    setIsLoading(false);
  };

  const saveTimerState = async () => {
    if (!storageManager) return;
    
    setIsLoading(true);
    try {
      const newTimerState: TimerState = {
        gameId: 'demo-game-123',
        timeElapsedInSeconds: Math.floor(Math.random() * 1800), // 0-30 minutes
        timestamp: Date.now()
      };

      const savedState = await storageManager.saveTimerState(newTimerState);
      setTimerState(savedState);
      addLog(`⏱️ Saved timer state: ${Math.floor(savedState.timeElapsedInSeconds / 60)}m ${savedState.timeElapsedInSeconds % 60}s`);
    } catch (error) {
      addLog(`❌ Failed to save timer state: ${error}`);
    }
    setIsLoading(false);
  };

  const loadTimerState = async () => {
    if (!storageManager) return;
    
    setIsLoading(true);
    try {
      const state = await storageManager.getTimerState('demo-game-123');
      setTimerState(state);
      if (state) {
        addLog(`📖 Loaded timer state: ${Math.floor(state.timeElapsedInSeconds / 60)}m ${state.timeElapsedInSeconds % 60}s`);
      } else {
        addLog('📖 No timer state found');
      }
    } catch (error) {
      addLog(`❌ Failed to load timer state: ${error}`);
    }
    setIsLoading(false);
  };

  const forceSync = async () => {
    if (!storageManager) return;
    
    setIsLoading(true);
    try {
      addLog('🔄 Starting manual sync...');
      await storageManager.forceSyncToSupabase();
      addLog('✅ Manual sync completed successfully');

      // Update sync stats
      const stats = await storageManager.getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      addLog(`❌ Manual sync failed: ${error}`);
    }
    setIsLoading(false);
  };

  const exportData = async () => {
    if (!storageManager) return;
    
    setIsLoading(true);
    try {
      const data = await storageManager.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `offline-demo-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog('📥 Data exported successfully');
    } catch (error) {
      addLog(`❌ Export failed: ${error}`);
    }
    setIsLoading(false);
  };

  const clearAllData = async () => {
    if (!storageManager) return;
    
    if (!confirm('Are you sure you want to clear all demo data?')) return;
    
    setIsLoading(true);
    try {
      // Delete all players
      for (const player of players) {
        await storageManager.deletePlayer(player.id);
      }
      setPlayers([]);

      // Delete timer state
      if (timerState) {
        await storageManager.deleteTimerState(timerState.gameId);
        setTimerState(null);
      }

      addLog('🧹 Cleared all demo data');

      // Update sync stats
      const stats = await storageManager.getSyncStats();
      setSyncStats(stats);
    } catch (error) {
      addLog(`❌ Failed to clear data: ${error}`);
    }
    setIsLoading(false);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus.connectionQuality) {
      case 'good': return 'text-green-500';
      case 'poor': return 'text-yellow-500';
      case 'offline': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus.connectionQuality) {
      case 'good': return '🟢';
      case 'poor': return '🟡';
      case 'offline': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🚀 Offline-First Storage Demo
          </h1>
          <p className="text-gray-600 mb-4">
            Demonstrating IndexedDB + Supabase sync with automatic offline/online handling
          </p>

          {/* Connection Status */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3">📡 Connection Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl mb-1">{getConnectionStatusIcon()}</div>
                <div className={`font-medium ${getConnectionStatusColor()}`}>
                  {connectionStatus.connectionQuality.toUpperCase()}
                </div>
                <div className="text-xs text-gray-500">Quality</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">{connectionStatus.isOnline ? '🌐' : '📱'}</div>
                <div className={connectionStatus.isOnline ? 'text-green-600' : 'text-red-600'}>
                  {connectionStatus.isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
                <div className="text-xs text-gray-500">Navigator</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">{connectionStatus.isSupabaseReachable ? '☁️' : '🔌'}</div>
                <div className={connectionStatus.isSupabaseReachable ? 'text-green-600' : 'text-red-600'}>
                  {connectionStatus.isSupabaseReachable ? 'REACHABLE' : 'UNREACHABLE'}
                </div>
                <div className="text-xs text-gray-500">Supabase</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">🔄</div>
                <div className="text-blue-600">
                  {(syncStats as { pendingCount?: number })?.pendingCount || 0}
                </div>
                <div className="text-xs text-gray-500">Pending Sync</div>
              </div>
            </div>
          </div>

          {/* Demo Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <button
              onClick={addPlayer}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              👤 Add Player
            </button>
            <button
              onClick={deleteLastPlayer}
              disabled={isLoading || players.length === 0}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              🗑️ Delete Player
            </button>
            <button
              onClick={saveTimerState}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              ⏱️ Save Timer
            </button>
            <button
              onClick={loadTimerState}
              disabled={isLoading}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              📖 Load Timer
            </button>
            <button
              onClick={forceSync}
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              🔄 Force Sync
            </button>
            <button
              onClick={exportData}
              disabled={isLoading}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              📥 Export Data
            </button>
            <button
              onClick={() => connectionStatus.checkConnection()}
              disabled={isLoading}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              🔍 Check Connection
            </button>
            <button
              onClick={clearAllData}
              disabled={isLoading}
              className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              🧹 Clear All
            </button>
          </div>

          {/* Data Display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Players */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">👥 Players ({players.length})</h3>
              <div className="max-h-60 overflow-y-auto">
                {players.length === 0 ? (
                  <p className="text-gray-500 italic">No players yet. Add some to test offline functionality!</p>
                ) : (
                  <div className="space-y-2">
                    {players.map((player) => (
                      <div key={player.id} className="bg-white p-3 rounded border">
                        <div className="font-medium">#{player.jerseyNumber} {player.name}</div>
                        <div className="text-sm text-gray-600">{player.isGoalie ? 'Goalkeeper' : 'Field Player'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Timer State */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">⏱️ Timer State</h3>
              {timerState ? (
                <div className="bg-white p-3 rounded border">
                  <div className="font-medium">Game: {timerState.gameId}</div>
                  <div className="text-sm text-gray-600">
                    Time: {Math.floor(timerState.timeElapsedInSeconds / 60)}m {timerState.timeElapsedInSeconds % 60}s
                  </div>
                  <div className="text-xs text-gray-500">
                    Saved: {new Date(timerState.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 italic">No timer state. Save one to test timer persistence!</p>
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3">📋 Activity Log</h3>
            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-60 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No activity yet...</p>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">🧪 How to Test Offline Functionality</h3>
            <ol className="list-decimal list-inside space-y-2 text-blue-700">
              <li>Add some players while online (they sync to Supabase automatically)</li>
              <li>Open browser DevTools → Network tab → Check &quot;Offline&quot; to simulate being offline</li>
              <li>Add/delete players while offline (they save to IndexedDB and queue for sync)</li>
              <li>Save/load timer state (always uses IndexedDB for real-time data)</li>
              <li>Go back online and watch automatic sync happen in the activity log</li>
              <li>Export data to see what&apos;s stored in IndexedDB</li>
              <li>Try &quot;Force Sync&quot; to manually trigger synchronization</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}