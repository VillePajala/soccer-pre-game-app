'use client';

import { useEffect, useState } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';

export default function CheckDataPage() {
  const [data, setData] = useState<{
    provider?: string;
    currentData?: {
      players: number;
      seasons: number;
      tournaments: number;
      games: number;
    };
    localStorageData?: {
      players: number;
      seasons: number;
      tournaments: number;
      games: number;
    };
    error?: string;
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const provider = storageManager.getProviderName?.() || 'unknown';
        
        const [players, seasons, tournaments, games] = await Promise.all([
          storageManager.getPlayers().catch(() => []),
          storageManager.getSeasons().catch(() => []),
          storageManager.getTournaments().catch(() => []),
          storageManager.getSavedGames().catch(() => ({}))
        ]);

        // Also check localStorage directly
        const localStorageData = {
          masterRoster: JSON.parse(localStorage.getItem('masterRoster') || '[]'),
          seasonsList: JSON.parse(localStorage.getItem('seasonsList') || '[]'),
          tournamentsList: JSON.parse(localStorage.getItem('tournamentsList') || '[]'),
          savedGames: JSON.parse(localStorage.getItem('savedGames') || '{}')
        };

        setData({
          provider,
          currentData: {
            players: players.length,
            seasons: seasons.length,
            tournaments: tournaments.length,
            games: Object.keys(games).length
          },
          localStorageData: {
            players: localStorageData.masterRoster.length,
            seasons: localStorageData.seasonsList.length,
            tournaments: localStorageData.tournamentsList.length,
            games: Object.keys(localStorageData.savedGames).length
          }
        });
      } catch (error) {
        console.error('Error loading data:', error);
        setData({ error: error.toString() });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Data Check</h1>
      
      <div className="space-y-6">
        <div className="bg-blue-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Current Provider: {data.provider}</h2>
        </div>

        <div className="bg-green-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Data from Storage Manager ({data.provider}):</h2>
          <ul>
            <li>Players: {data.currentData?.players || 0}</li>
            <li>Seasons: {data.currentData?.seasons || 0}</li>
            <li>Tournaments: {data.currentData?.tournaments || 0}</li>
            <li>Games: {data.currentData?.games || 0}</li>
          </ul>
        </div>

        <div className="bg-yellow-100 p-4 rounded">
          <h2 className="text-xl font-semibold mb-2">Data in localStorage:</h2>
          <ul>
            <li>Players: {data.localStorageData?.players || 0}</li>
            <li>Seasons: {data.localStorageData?.seasons || 0}</li>
            <li>Tournaments: {data.localStorageData?.tournaments || 0}</li>
            <li>Games: {data.localStorageData?.games || 0}</li>
          </ul>
        </div>

        {data.provider === 'supabase' && (
          <div className="bg-red-100 p-4 rounded">
            <h2 className="text-xl font-semibold mb-2">⚠️ Data Mismatch Warning</h2>
            <p>You are using Supabase but have different data in localStorage.</p>
            <p>The app will use Supabase data, not localStorage data.</p>
          </div>
        )}
      </div>

      <div className="mt-8">
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}