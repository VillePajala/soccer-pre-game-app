'use client';

import React from 'react';
import LegacyGameInfoBar from './GameInfoBar';
import { MigratedGameInfoBar } from './MigratedGameInfoBar';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';

export interface GameInfoBarProps {
  teamName: string;
  opponentName: string;
  homeScore: number;
  awayScore: number;
  onTeamNameChange: (newName: string) => void;
  onOpponentNameChange: (newName: string) => void;
  homeOrAway: 'home' | 'away';
}

/**
 * Migration wrapper for GameInfoBar component
 * Switches between legacy and migrated implementation based on migration flags
 */
const GameInfoBar: React.FC<GameInfoBarProps> = (props) => {
  const { shouldUseLegacy, componentStatus } = useMigrationSafety('GameInfoBar');
  
  // Log migration status in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[GameInfoBar Migration]', {
      shouldUseLegacy,
      componentStatus,
    });
  }
  
  if (shouldUseLegacy) {
    return <LegacyGameInfoBar {...props} />;
  }
  
  return <MigratedGameInfoBar {...props} />;
};

export default React.memo(GameInfoBar);