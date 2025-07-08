import { AppState, Player, Season, Tournament, SavedGamesCollection, PlayerStatRow } from '@/types';

/** Utility to create and trigger a download from a data string */
const triggerDownload = (data: string, filename: string, type: string): void => {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = filename;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Escape a value for CSV output */
const escapeCsvField = (field: string | number | undefined | null): string => {
  const str = String(field ?? '');
  return `"${str.replace(/"/g, '""')}"`;
};

/** Format seconds as mm:ss */
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Export a single game as JSON.
 */
export const exportJson = (
  gameId: string,
  game: AppState,
  seasons: Season[] = [],
  tournaments: Tournament[] = []
): void => {
  const seasonName = game.seasonId ? seasons.find((s) => s.id === game.seasonId)?.name : null;
  const tournamentName = game.tournamentId ? tournaments.find((t) => t.id === game.tournamentId)?.name : null;
  const exportObject = { [gameId]: { ...game, seasonName, tournamentName } };
  const jsonString = JSON.stringify(exportObject, null, 2);
  triggerDownload(jsonString, `${gameId}.json`, 'application/json');
};

/**
 * Export a single game as CSV.
 */
export const exportCsv = (
  gameId: string,
  game: AppState,
  players: Player[],
  seasons: Season[] = [],
  tournaments: Tournament[] = []
): void => {
  const rows: string[] = [];
  const EOL = '\r\n';
  const DELIMITER = ';';

  const seasonName = game.seasonId ? seasons.find((s) => s.id === game.seasonId)?.name : '';
  const tournamentName = game.tournamentId ? tournaments.find((t) => t.id === game.tournamentId)?.name : '';

  rows.push('Game Info');
  rows.push(`${escapeCsvField('Game ID:')}${DELIMITER}${escapeCsvField(gameId)}`);
  rows.push(`${escapeCsvField('Game Date:')}${DELIMITER}${escapeCsvField(game.gameDate)}`);
  rows.push(`${escapeCsvField('Home Team:')}${DELIMITER}${escapeCsvField(game.teamName)}`);
  rows.push(`${escapeCsvField('Away Team:')}${DELIMITER}${escapeCsvField(game.opponentName)}`);
  rows.push(`${escapeCsvField('Home Score:')}${DELIMITER}${escapeCsvField(game.homeScore)}`);
  rows.push(`${escapeCsvField('Away Score:')}${DELIMITER}${escapeCsvField(game.awayScore)}`);
  rows.push(`${escapeCsvField('Location:')}${DELIMITER}${escapeCsvField(game.gameLocation)}`);
  rows.push(`${escapeCsvField('Time:')}${DELIMITER}${escapeCsvField(game.gameTime)}`);
  rows.push(`${escapeCsvField('Season:')}${DELIMITER}${escapeCsvField(seasonName || (game.seasonId || 'None'))}`);
  rows.push(`${escapeCsvField('Tournament:')}${DELIMITER}${escapeCsvField(tournamentName || (game.tournamentId || 'None'))}`);
  rows.push('');

  rows.push('Game Settings');
  rows.push(`${escapeCsvField('Number of Periods:')}${DELIMITER}${escapeCsvField(game.numberOfPeriods)}`);
  rows.push(`${escapeCsvField('Period Duration (min):')}${DELIMITER}${escapeCsvField(game.periodDurationMinutes)}`);
  rows.push(`${escapeCsvField('Substitution Interval (min):')}${DELIMITER}${escapeCsvField(game.subIntervalMinutes ?? '?')}`);
  rows.push('');

  rows.push('Substitution Intervals');
  rows.push(`${escapeCsvField('Period')}${DELIMITER}${escapeCsvField('Duration (mm:ss)')}`);
  const intervals = game.completedIntervalDurations || [];
  if (intervals.length > 0) {
    intervals
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((log) => {
        rows.push(`${escapeCsvField(log.period)}${DELIMITER}${escapeCsvField(formatTime(log.duration))}`);
      });
  } else {
    rows.push('No substitutions recorded');
  }
  rows.push('');

  rows.push('Player Stats');
  rows.push(`${escapeCsvField('Player')}${DELIMITER}${escapeCsvField('Goals')}${DELIMITER}${escapeCsvField('Assists')}${DELIMITER}${escapeCsvField('Points')}${DELIMITER}${escapeCsvField('Fair Play')}`);

  const selectedPlayers = players.filter(p => game.selectedPlayerIds?.includes(p.id));

  const playerStats = selectedPlayers
    .map((p) => {
      const goals = game.gameEvents.filter((e) => e.type === 'goal' && e.scorerId === p.id).length;
      const assists = game.gameEvents.filter((e) => e.type === 'goal' && e.assisterId === p.id).length;
      const totalScore = goals + assists;
      return { name: p.name, goals, assists, totalScore, fairPlay: p.receivedFairPlayCard };
    })
    .sort((a, b) => b.totalScore - a.totalScore || b.goals - a.goals);

  if (playerStats.length > 0) {
    playerStats.forEach((ps) => {
      rows.push(`${escapeCsvField(ps.name)}${DELIMITER}${escapeCsvField(ps.goals)}${DELIMITER}${escapeCsvField(ps.assists)}${DELIMITER}${escapeCsvField(ps.totalScore)}${DELIMITER}${escapeCsvField(ps.fairPlay ? 'Yes' : 'No')}`);
    });
  } else {
    rows.push('No player stats recorded');
  }
  rows.push('');

  rows.push('Event Log');
  rows.push(`${escapeCsvField('Time')}${DELIMITER}${escapeCsvField('Type')}${DELIMITER}${escapeCsvField('Scorer')}${DELIMITER}${escapeCsvField('Assister')}`);
  const sortedEvents = game.gameEvents.filter((e) => e.type === 'goal' || e.type === 'opponentGoal').sort((a, b) => a.time - b.time);
  if (sortedEvents.length > 0) {
    sortedEvents.forEach((event) => {
      const timeFormatted = formatTime(event.time);
      const type = event.type === 'goal' ? 'Goal' : 'Opponent Goal';
      const scorerName = event.type === 'goal'
        ? selectedPlayers.find((p) => p.id === event.scorerId)?.name ?? event.scorerId
        : game.opponentName || 'Opponent';
      const assisterName = event.type === 'goal' && event.assisterId
        ? selectedPlayers.find((p) => p.id === event.assisterId)?.name ?? event.assisterId
        : '';
      rows.push(`${escapeCsvField(timeFormatted)}${DELIMITER}${escapeCsvField(type)}${DELIMITER}${escapeCsvField(scorerName)}${DELIMITER}${escapeCsvField(assisterName)}`);
    });
  } else {
    rows.push('No goals logged');
  }
  rows.push('');

  rows.push('Notes:');
  rows.push(escapeCsvField(game.gameNotes || ''));

  const csvString = rows.join(EOL);
  triggerDownload(csvString, `${gameId}.csv`, 'text/csv;charset=utf-8;');
};

/**
 * Export multiple games with aggregated stats as JSON.
 */
export const exportAggregateJson = (
  games: SavedGamesCollection,
  aggregateStats: PlayerStatRow[]
): void => {
  const exportData = {
    exportedTimestamp: new Date().toISOString(),
    summaryStats: aggregateStats,
    games,
  };
  const jsonString = JSON.stringify(exportData, null, 2);
  const now = new Date();
  const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
  triggerDownload(jsonString, `SoccerApp_AggregateStats_${timestamp}.json`, 'application/json');
};

/**
 * Export multiple games with aggregated stats as CSV.
 */
export const exportAggregateCsv = (
  games: SavedGamesCollection,
  aggregateStats: PlayerStatRow[]
): void => {
  const EOL = '\r\n';
  const DELIMITER = ';';
  const allRows: string[] = [];

  allRows.push(`${escapeCsvField('Export Type:')}${DELIMITER}${escapeCsvField('Aggregate Stats')}`);
  allRows.push(`${escapeCsvField('Export Timestamp:')}${DELIMITER}${escapeCsvField(new Date().toISOString())}`);
  allRows.push('');

  allRows.push(escapeCsvField('Aggregate Player Stats Summary'));
  allRows.push([
    escapeCsvField('Player'),
    escapeCsvField('GP'),
    escapeCsvField('G'),
    escapeCsvField('A'),
    escapeCsvField('Pts'),
    escapeCsvField('FP'),
  ].join(DELIMITER));

  aggregateStats
    .filter((player) => player.gamesPlayed > 0)
    .forEach((player) => {
      allRows.push([
        escapeCsvField(player.name),
        escapeCsvField(player.gamesPlayed),
        escapeCsvField(player.goals),
        escapeCsvField(player.assists),
        escapeCsvField(player.totalScore),
        escapeCsvField(player.fpAwards ?? 0),
      ].join(DELIMITER));
    });
  allRows.push('');

  allRows.push(escapeCsvField('Included Game Details'));
  allRows.push([
    escapeCsvField('Game ID'),
    escapeCsvField('Date'),
    escapeCsvField('Time'),
    escapeCsvField('Location'),
    escapeCsvField('Home Team'),
    escapeCsvField('Away Team'),
    escapeCsvField('Home Score'),
    escapeCsvField('Away Score'),
    escapeCsvField('Notes'),
  ].join(DELIMITER));

  Object.entries(games).forEach(([id, game]) => {
    allRows.push([
      escapeCsvField(id),
      escapeCsvField(game.gameDate),
      escapeCsvField(game.gameTime),
      escapeCsvField(game.gameLocation),
      escapeCsvField(game.teamName),
      escapeCsvField(game.opponentName),
      escapeCsvField(game.homeScore),
      escapeCsvField(game.awayScore),
      escapeCsvField(game.gameNotes),
    ].join(DELIMITER));
  });
  allRows.push('');

  const csvString = allRows.join(EOL);
  const now = new Date();
  const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
  triggerDownload(csvString, `SoccerApp_AggregateStats_${timestamp}.csv`, 'text/csv;charset=utf-8;');
};

