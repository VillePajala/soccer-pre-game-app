export interface MetricAverages {
  count: number;
  averages: { [metric: string]: number };
  overall: number;
}

import type { SavedGamesCollection } from '@/types';

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

export function getPlayerAssessmentTrends(playerId: string, games: SavedGamesCollection): { [metric: string]: MetricTrendPoint[] } {
  const trends: { [metric: string]: MetricTrendPoint[] } = {};
  METRICS.forEach(m => { trends[m] = []; });
  for (const game of Object.values(games)) {
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
    const a = game.assessments?.[playerId];
    if (a && a.notes) notes.push({ date: game.gameDate, notes: a.notes });
  }
  notes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return notes;
}

export function calculatePlayerAssessmentAverages(playerId: string, games: SavedGamesCollection): MetricAverages | null {
  let count = 0;
  const totals: Record<string, number> = {};
  METRICS.forEach(m => totals[m] = 0);
  let overallTotal = 0;
  for (const game of Object.values(games)) {
    const a = game.assessments?.[playerId];
    if (!a) continue;
    count++;
    METRICS.forEach(m => { totals[m] += a.sliders[m]; });
    overallTotal += a.overall;
  }
  if (count === 0) return null;
  const averages: Record<string, number> = {};
  METRICS.forEach(m => { averages[m] = totals[m] / count; });
  return { count, averages, overall: overallTotal / count };
}

export function calculateTeamAssessmentAverages(games: SavedGamesCollection): MetricAverages | null {
  let count = 0;
  const totals: Record<string, number> = {};
  METRICS.forEach(m => totals[m] = 0);
  let overallTotal = 0;
  for (const game of Object.values(games)) {
    if (!game.assessments) continue;
    const players = Object.values(game.assessments);
    if (players.length === 0) continue;
    count++;
    const perMetricTotals: Record<string, number> = {};
    METRICS.forEach(m => perMetricTotals[m] = 0);
    players.forEach(a => {
      METRICS.forEach(m => { perMetricTotals[m] += a.sliders[m]; });
    });
    overallTotal += players.reduce((s, a) => s + a.overall, 0) / players.length;
    METRICS.forEach(m => {
      totals[m] += perMetricTotals[m] / players.length;
    });
  }
  if (count === 0) return null;
  const averages: Record<string, number> = {};
  METRICS.forEach(m => { averages[m] = totals[m] / count; });
  return { count, averages, overall: overallTotal / count };
}
