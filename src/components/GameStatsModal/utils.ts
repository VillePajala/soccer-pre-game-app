import type { PlayerStatRow } from '@/types';
import type { SortableColumn, SortDirection } from './types';

/**
 * Shared utilities for GameStatsModal components
 */

/**
 * Sort player statistics by column and direction
 */
export function sortPlayerStats(
  stats: PlayerStatRow[],
  sortColumn: SortableColumn,
  sortDirection: SortDirection
): PlayerStatRow[] {
  return [...stats].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortColumn) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'goals':
        aValue = a.goals || 0;
        bValue = b.goals || 0;
        break;
      case 'assists':
        aValue = a.assists || 0;
        bValue = b.assists || 0;
        break;
      case 'totalScore':
        aValue = a.totalScore || 0;
        bValue = b.totalScore || 0;
        break;
      case 'fpAwards':
        aValue = a.fpAwards || 0;
        bValue = b.fpAwards || 0;
        break;
      case 'gamesPlayed':
        aValue = a.gamesPlayed || 0;
        bValue = b.gamesPlayed || 0;
        break;
      case 'avgPoints':
        aValue = a.avgPoints || 0;
        bValue = b.avgPoints || 0;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    }

    const numA = typeof aValue === 'number' ? aValue : 0;
    const numB = typeof bValue === 'number' ? bValue : 0;
    
    if (sortDirection === 'asc') {
      return numA - numB;
    }
    return numB - numA;
  });
}

/**
 * Get sort icon for column header
 */
export function getSortIcon(
  column: SortableColumn,
  sortColumn: SortableColumn,
  sortDirection: SortDirection
) {
  if (sortColumn !== column) {
    return 'FaSort'; // Unsorted
  }
  return sortDirection === 'asc' ? 'FaSortUp' : 'FaSortDown';
}

/**
 * Format number with fallback
 */
export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return value.toFixed(decimals);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Calculate win percentage
 */
export function calculateWinPercentage(wins: number, losses: number, ties: number): number {
  const totalGames = wins + losses + ties;
  if (totalGames === 0) return 0;
  return wins / totalGames;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}