import { promises as fs } from 'fs';
import path from 'path';

async function getStorageKeys() {
  const file = await fs.readFile(path.join('src','config','storageKeys.ts'),'utf8');
  const regex = /export const (\w+) = '([^']+)'/g;
  const keys = {};
  let match;
  while ((match = regex.exec(file))) {
    keys[match[2]] = match[1];
  }
  // Additional hard-coded keys not in storageKeys.ts
  keys['installPromptDismissed'] = 'INSTALL_PROMPT_DISMISSED';
  return keys;
}

async function generateSampleData() {
  return {
    soccerSeasons: [
      { id: 'season_1', name: 'Sample Season' }
    ],
    soccerTournaments: [
      { id: 'tournament_1', name: 'Sample Tournament' }
    ],
    savedSoccerGames: {
      game_1: { teamName: 'Team A', opponentName: 'Team B', playersOnField: [], opponents: [], drawings: [], availablePlayers: [], showPlayerNames: true, gameEvents: [], gameDate: '2024-01-01', homeScore: 0, awayScore: 0, gameNotes: '', homeOrAway: 'home', numberOfPeriods: 2, periodDurationMinutes: 45, currentPeriod: 1, gameStatus: 'notStarted', selectedPlayerIds: [], seasonId: 'season_1', tournamentId: 'tournament_1', tacticalDiscs: [], tacticalDrawings: [], tacticalBallPosition: null }
    },
    soccerAppSettings: {
      currentGameId: null,
      lastHomeTeamName: '',
      language: 'en',
      hasSeenAppGuide: false,
      autoBackupEnabled: false,
      autoBackupIntervalHours: 24,
      lastBackupTime: undefined,
      useDemandCorrection: false
    },
    soccerMasterRoster: [
      { id: 'player_1', name: 'Sample Player' }
    ],
    lastHomeTeamName: 'FC Sample',
    soccerTimerState: {
      gameId: 'game_1',
      timeElapsedInSeconds: 0,
      timestamp: Date.now()
    },
    installPromptDismissed: Date.now().toString()
  };
}

async function main() {
  const keys = await getStorageKeys();
  const samples = await generateSampleData();
  const map = {};
  for (const [key] of Object.entries(keys)) {
    map[key] = samples[key] ?? null;
  }
  await fs.mkdir('docs', { recursive: true });
  await fs.writeFile(path.join('docs','localStorage-map.json'), JSON.stringify(map, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
