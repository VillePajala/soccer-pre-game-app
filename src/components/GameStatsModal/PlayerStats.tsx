'use client';

import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlayerStatsProps } from './types';

/**
 * Player Statistics Tab Component
 * Handles display of individual player statistics
 */
const PlayerStats = memo<PlayerStatsProps>(({
  players: _players,
  gameEvents: _gameEvents,
  selectedPlayerIds: _selectedPlayerIds,
  savedGames: _savedGames,
}) => {
  const { t } = useTranslation();

  // Unused props prefixed with underscore to avoid ESLint warnings
  void _players;
  void _gameEvents;
  void _selectedPlayerIds;
  void _savedGames;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 bg-slate-50 border-b">
          <h3 className="text-lg font-semibold text-slate-900">
            {t('gameStatsModal.playerStats', 'Player Statistics')}
          </h3>
        </div>
        
        <div className="p-4">
          {/* PlayerStatsView requires different props - placeholder implementation */}
          <div className="text-center py-8 text-slate-500">
            {t('gameStatsModal.playerStatsNotImplemented', 'Player statistics view not yet implemented')}
          </div>
        </div>
      </div>
    </div>
  );
});

PlayerStats.displayName = 'PlayerStats';

export default PlayerStats;