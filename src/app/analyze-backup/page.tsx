'use client';

import { useState, useRef } from 'react';

export default function AnalyzeBackupPage() {
  const [analysis, setAnalysis] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Analyze structure
      const topLevelKeys = Object.keys(data);
      const analysis: any = {
        fileName: file.name,
        fileSize: file.size,
        topLevelKeys: topLevelKeys,
        structure: {}
      };

      // Check localStorage structure
      if (data.localStorage) {
        analysis.structure.localStorage = {
          keys: Object.keys(data.localStorage),
          masterRoster: Array.isArray(data.localStorage.masterRoster) 
            ? data.localStorage.masterRoster.length 
            : 'Not an array',
          seasonsList: Array.isArray(data.localStorage.seasonsList) 
            ? data.localStorage.seasonsList.length 
            : 'Not an array',
          tournamentsList: Array.isArray(data.localStorage.tournamentsList) 
            ? data.localStorage.tournamentsList.length 
            : 'Not an array',
          savedGames: data.localStorage.savedGames 
            ? Object.keys(data.localStorage.savedGames).length 
            : 'Not found'
        };
        
        // Sample some games
        if (data.localStorage.savedGames) {
          const gameIds = Object.keys(data.localStorage.savedGames);
          analysis.structure.localStorage.sampleGameIds = gameIds.slice(0, 5);
          if (gameIds.length > 0) {
            const firstGame = data.localStorage.savedGames[gameIds[0]];
            analysis.structure.localStorage.sampleGame = {
              id: firstGame.id,
              teamName: firstGame.teamName,
              opponentName: firstGame.opponentName,
              date: firstGame.date,
              hasPlayers: !!firstGame.players,
              playerCount: firstGame.players ? Object.keys(firstGame.players).length : 0
            };
          }
        }
      }

      // Check direct structure
      analysis.structure.direct = {
        players: Array.isArray(data.players) ? data.players.length : 'Not found',
        seasons: Array.isArray(data.seasons) ? data.seasons.length : 'Not found',
        tournaments: Array.isArray(data.tournaments) ? data.tournaments.length : 'Not found',
        savedGames: data.savedGames ? Object.keys(data.savedGames).length : 'Not found',
        masterRoster: Array.isArray(data.masterRoster) ? data.masterRoster.length : 'Not found',
        seasonsList: Array.isArray(data.seasonsList) ? data.seasonsList.length : 'Not found',
        tournamentsList: Array.isArray(data.tournamentsList) ? data.tournamentsList.length : 'Not found'
      };

      // Check for any other interesting keys
      analysis.otherKeys = topLevelKeys.filter(key => 
        !['localStorage', 'players', 'seasons', 'tournaments', 'savedGames', 
          'masterRoster', 'seasonsList', 'tournamentsList', 'meta'].includes(key)
      );

      setAnalysis(analysis);
    } catch (error) {
      setAnalysis({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Backup File Analyzer</h1>
      
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={analyzeFile}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Select Backup File to Analyze
        </button>
      </div>

      {analysis && (
        <div className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-auto">
          <h2 className="text-xl font-bold mb-4">Analysis Results:</h2>
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {JSON.stringify(analysis, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}