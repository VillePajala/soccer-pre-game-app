'use client';

import React, { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';
import RatingBar from '../RatingBar';
import { calculateTeamAssessmentAverages } from '@/utils/assessmentStats';
import { useGoalEditing } from '@/hooks/useGoalEditing';
import type { CurrentGameStatsProps } from './types';
import { sortPlayerStats, getSortIcon, formatNumber } from './utils';

/**
 * Current Game Statistics Tab Component
 * Handles display of statistics for the currently active game
 */
const CurrentGameStats = memo<CurrentGameStatsProps>(({
  players,
  gameEvents,
  selectedPlayerIds,
  currentGameId,
  playerStats,
  sortColumn,
  sortDirection,
  onSort,
  gameNotes = '',
  onGameNotesChange,
  onUpdateGameEvent,
  onExportOneJson,
  onExportOneCsv,
}) => {
  const { t } = useTranslation();

  // Memoized sorted stats
  const sortedStats = useMemo(() => 
    sortPlayerStats(playerStats, sortColumn, sortDirection),
    [playerStats, sortColumn, sortDirection]
  );

  // Team assessment averages
  const teamAssessmentAverages = useMemo(() => 
    calculateTeamAssessmentAverages(players.filter(p => selectedPlayerIds.includes(p.id))),
    [players, selectedPlayerIds]
  );

  // Goal editing hook (currently unused but available for future features)
  const {} = useGoalEditing(gameEvents, onUpdateGameEvent);

  // Render sort icon helper
  const renderSortIcon = (column: keyof typeof sortColumn) => {
    const iconType = getSortIcon(column, sortColumn, sortDirection);
    const IconComponent = iconType === 'FaSortUp' ? FaSortUp : 
                         iconType === 'FaSortDown' ? FaSortDown : FaSort;
    return <IconComponent className="ml-1 h-3 w-3" />;
  };

  // Filter events for current game
  const currentGameEvents = useMemo(() =>
    gameEvents.filter(event => 
      event.type === 'goal' || event.type === 'assist'
    ),
    [gameEvents]
  );

  return (
    <div className="space-y-6">
      {/* Team Assessment Averages */}
      {teamAssessmentAverages && (
        <div className="bg-slate-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">
            {t('gameStatsModal.teamAverages', 'Team Assessment Averages')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm text-slate-600 mb-1">
                {t('gameStatsModal.overallAverage', 'Overall')}
              </div>
              <RatingBar rating={teamAssessmentAverages.overall} maxRating={10} />
              <div className="text-xs text-slate-500 mt-1">
                {formatNumber(teamAssessmentAverages.overall, 1)}/10
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-600 mb-1">
                {t('gameStatsModal.attackAverage', 'Attack')}
              </div>
              <RatingBar rating={teamAssessmentAverages.attack} maxRating={10} />
              <div className="text-xs text-slate-500 mt-1">
                {formatNumber(teamAssessmentAverages.attack, 1)}/10
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-600 mb-1">
                {t('gameStatsModal.defenseAverage', 'Defense')}
              </div>
              <RatingBar rating={teamAssessmentAverages.defense} maxRating={10} />
              <div className="text-xs text-slate-500 mt-1">
                {formatNumber(teamAssessmentAverages.defense, 1)}/10
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-600 mb-1">
                {t('gameStatsModal.teamworkAverage', 'Teamwork')}
              </div>
              <RatingBar rating={teamAssessmentAverages.teamwork} maxRating={10} />
              <div className="text-xs text-slate-500 mt-1">
                {formatNumber(teamAssessmentAverages.teamwork, 1)}/10
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Player Statistics Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b">
          <h3 className="text-lg font-semibold text-slate-900">
            {t('gameStatsModal.currentGameStats', 'Current Game Statistics')}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => onSort('name')}
                >
                  <div className="flex items-center">
                    {t('gameStatsModal.playerName', 'Player Name')}
                    {renderSortIcon('name')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => onSort('goals')}
                >
                  <div className="flex items-center">
                    {t('gameStatsModal.goals', 'Goals')}
                    {renderSortIcon('goals')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => onSort('assists')}
                >
                  <div className="flex items-center">
                    {t('gameStatsModal.assists', 'Assists')}
                    {renderSortIcon('assists')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => onSort('totalScore')}
                >
                  <div className="flex items-center">
                    {t('gameStatsModal.assessment', 'Assessment')}
                    {renderSortIcon('totalScore')}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                  onClick={() => onSort('fpAwards')}
                >
                  <div className="flex items-center">
                    {t('gameStatsModal.fairPlay', 'Fair Play')}
                    {renderSortIcon('fpAwards')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {sortedStats.map((stat, index) => (
                <tr key={stat.playerId || index} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    {stat.name || t('gameStatsModal.unknownPlayer', 'Unknown Player')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatNumber(stat.goals || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatNumber(stat.assists || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {stat.totalScore ? (
                      <div className="flex items-center space-x-2">
                        <RatingBar rating={stat.totalScore} maxRating={10} />
                        <span className="text-xs">
                          {formatNumber(stat.totalScore, 1)}/10
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {stat.fpAwards ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {formatNumber(stat.fpAwards)}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
              {sortedStats.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                    {t('gameStatsModal.noCurrentGameData', 'No current game data available')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Game Events */}
      {currentGameEvents.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b">
            <h3 className="text-lg font-semibold text-slate-900">
              {t('gameStatsModal.gameEvents', 'Game Events')}
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {currentGameEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-slate-900 capitalize">
                    {event.type}
                  </span>
                  <span className="text-sm text-slate-600">
                    {event.playerName || t('gameStatsModal.unknownPlayer', 'Unknown Player')}
                  </span>
                  <span className="text-xs text-slate-500">
                    {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Notes */}
      {onGameNotesChange && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">
            {t('gameStatsModal.gameNotes', 'Game Notes')}
          </h3>
          <textarea
            value={gameNotes}
            onChange={(e) => onGameNotesChange(e.target.value)}
            placeholder={t('gameStatsModal.gameNotesPlaceholder', 'Add notes about this game...')}
            className="w-full p-3 border border-slate-300 rounded-md resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
          />
        </div>
      )}

      {/* Export Buttons */}
      {(onExportOneJson || onExportOneCsv) && currentGameId && (
        <div className="flex space-x-3">
          {onExportOneJson && (
            <button
              onClick={() => onExportOneJson(currentGameId)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-sm font-medium transition-colors"
            >
              {t('common.exportJson', 'Export JSON')}
            </button>
          )}
          {onExportOneCsv && (
            <button
              onClick={() => onExportOneCsv(currentGameId)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-sm font-medium transition-colors"
            >
              {t('common.exportCsv', 'Export CSV')}
            </button>
          )}
        </div>
      )}
    </div>
  );
});

CurrentGameStats.displayName = 'CurrentGameStats';

export default CurrentGameStats;