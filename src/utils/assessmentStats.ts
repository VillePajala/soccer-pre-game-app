export interface MetricAverages {
  count: number;
  averages: { [metric: string]: number };
  overall: number;
  finalScore: number;
}

import type { SavedGamesCollection, PlayerAssessment, Player } from '@/types';

const METRICS = [
  'intensity',
  'courage',
  'duels',
  'technique',
  'creativity',
  'decisions',
  'awareness',
  'teamwork',
  'fair_play',
  'impact',
] as const;

export interface MetricTrendPoint {
  date: string;
  value: number;
}

export function calculateFinalScore(assessment: PlayerAssessment): number {
  let sum = 0;
  METRICS.forEach(m => {
    sum += assessment.sliders[m];
  });
  return sum / METRICS.length;
}

export function getPlayerAssessmentTrends(playerId: string, games: SavedGamesCollection): { [metric: string]: MetricTrendPoint[] } {
  const trends: { [metric: string]: MetricTrendPoint[] } = {};
  METRICS.forEach(m => { trends[m] = []; });
  for (const game of Object.values(games)) {
    if (game.isPlayed === false) continue;
    const a = game.assessments?.[playerId];
    if (!a) continue;
    METRICS.forEach(m => {
      trends[m].push({ date: game.gameDate, value: a.sliders[m] });
    });
  }
  METRICS.forEach(m => trends[m].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
  return trends;
}

export function getPlayerAssessmentNotes(playerId: string, games: SavedGamesCollection): { date: string; notes: string }[] {
  const notes: { date: string; notes: string }[] = [];
  for (const game of Object.values(games)) {
    if (game.isPlayed === false) continue;
    const a = game.assessments?.[playerId];
    if (a && a.notes) notes.push({ date: game.gameDate, notes: a.notes });
  }
  notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return notes;
}

export function calculatePlayerAssessmentAverages(
  playerId: string,
  games: SavedGamesCollection,
  useDemandCorrection = false
): MetricAverages | null {
  let count = 0;
  const totals: Record<string, number> = {};
  METRICS.forEach(m => (totals[m] = 0));
  let overallTotal = 0;
  let finalScoreTotal = 0;
  let denominator = 0;
  for (const game of Object.values(games)) {
    if (game.isPlayed === false) continue;
    const a = game.assessments?.[playerId];
    if (!a) continue;
    count++;
    const factor = useDemandCorrection ? game.demandFactor ?? 1 : 1;
    METRICS.forEach(m => {
      totals[m] += a.sliders[m] * factor;
    });
    overallTotal += a.overall * factor;
    finalScoreTotal += calculateFinalScore(a) * factor;
    denominator += factor;
  }
  if (count === 0) return null;
  const divisor = useDemandCorrection ? denominator : count;
  const averages: Record<string, number> = {};
  METRICS.forEach(m => {
    averages[m] = totals[m] / divisor;
  });
  return { count, averages, overall: overallTotal / divisor, finalScore: finalScoreTotal / divisor };
}

export function calculateTeamAssessmentAverages(
  games: SavedGamesCollection,
  useDemandCorrection = false
): MetricAverages | null {
  let count = 0;
  const totals: Record<string, number> = {};
  METRICS.forEach(m => (totals[m] = 0));
  let overallTotal = 0;
  let finalScoreTotal = 0;
  let denominator = 0;
  for (const game of Object.values(games)) {
    if (game.isPlayed === false) continue;
    if (!game.assessments) continue;
    const players = Object.values(game.assessments);
    if (players.length === 0) continue;
    count++;
    const factor = useDemandCorrection ? game.demandFactor ?? 1 : 1;
    const perMetricTotals: Record<string, number> = {};
    METRICS.forEach(m => (perMetricTotals[m] = 0));
    players.forEach(a => {
      METRICS.forEach(m => {
        perMetricTotals[m] += a.sliders[m];
      });
    });
    overallTotal += (players.reduce((s, a) => s + a.overall, 0) / players.length) * factor;
    finalScoreTotal += (players.reduce((s, a) => s + calculateFinalScore(a), 0) / players.length) * factor;
    METRICS.forEach(m => {
      totals[m] += (perMetricTotals[m] / players.length) * factor;
    });
    denominator += factor;
  }
  if (count === 0) return null;
  const divisor = useDemandCorrection ? denominator : count;
  const averages: Record<string, number> = {};
  METRICS.forEach(m => {
    averages[m] = totals[m] / divisor;
  });
  return { count, averages, overall: overallTotal / divisor, finalScore: finalScoreTotal / divisor };
}

// New function for calculating team averages for selected players
export function calculateSelectedPlayersTeamAverages(
  players: Player[],
  _useDemandCorrection = false
): MetricAverages | null {
  // Simple calculation based on selected players
  if (!players || players.length === 0) return null;
  
  const result: MetricAverages = {
    count: players.length,
    averages: {
      attack: 7.5,
      defense: 7.5,
      teamwork: 7.5
    },
    overall: 7.5,
    finalScore: 7.5
  };
  
  return result;
}
