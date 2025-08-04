'use client';

import React from 'react';
import LegacyPlayerBar from './PlayerBar';
import { MigratedPlayerBar } from './MigratedPlayerBar';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import type { Player, GameEvent } from '@/types';

export interface PlayerBarProps {
  players: Player[];
  onPlayerDragStartFromBar?: (player: Player) => void;
  selectedPlayerIdFromBar?: string | null;
  onBarBackgroundClick?: () => void;
  gameEvents: GameEvent[];
  onPlayerTapInBar?: (player: Player) => void;
  onToggleGoalie?: (playerId: string) => void;
}

/**
 * Migration wrapper for PlayerBar component
 * Switches between legacy and migrated implementation based on migration flags
 */
const PlayerBar: React.FC<PlayerBarProps> = (props) => {
  const { shouldUseLegacy, componentStatus } = useMigrationSafety('PlayerBar');
  
  // Log migration status in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[PlayerBar Migration]', {
      shouldUseLegacy,
      componentStatus,
    });
  }
  
  if (shouldUseLegacy) {
    return <LegacyPlayerBar {...props} />;
  }
  
  return <MigratedPlayerBar {...props} />;
};

export default React.memo(PlayerBar);