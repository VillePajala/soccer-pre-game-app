'use client';

import React from 'react';
import LegacyGameControls from './GameControls';
import { MigratedGameControls } from './MigratedGameControls';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import { GameControlsProps } from '@/types/gameComponents';

export interface ExtendedGameControlsProps extends Partial<GameControlsProps> {
  // Additional control state from HomePage
  canUndo?: boolean;
  canRedo?: boolean;
  isTacticsBoardView?: boolean;
  highlightRosterButton?: boolean;
  isGameLoaded?: boolean;
  
  // Extended handlers from HomePage
  onUndo?: () => void;
  onRedo?: () => void;
  onResetField?: () => void;
  onClearDrawings?: () => void;
  onAddOpponent?: () => void;
  onToggleTrainingResources?: () => void;
  onToggleTacticsBoard?: () => void;
  onAddHomeDisc?: () => void;
  onAddOpponentDisc?: () => void;
  onPlaceAllPlayers?: () => void;
  onSignOut?: () => void;
  
  // Missing modal handlers
  onToggleLargeTimerOverlay?: () => void;
  onToggleGoalLogModal?: () => void;
  onToggleGameStatsModal?: () => void;
  onOpenLoadGameModal?: () => void;
  onStartNewGame?: () => void;
  onOpenRosterModal?: () => void;
  onQuickSave?: () => void;
  onOpenGameSettingsModal?: () => void;
  onOpenSeasonTournamentModal?: () => void;
  onToggleInstructionsModal?: () => void;
  onOpenSettingsModal?: () => void;
  
  // Style
  barStyle?: string;
}

/**
 * Migration wrapper for GameControls component
 * Switches between legacy and migrated implementation based on migration flags
 */
export const GameControls = React.memo<ExtendedGameControlsProps>((props) => {
  const { shouldUseLegacy, componentStatus } = useMigrationSafety('GameControls');
  
  // Log migration status in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[GameControls Migration]', {
      shouldUseLegacy,
      componentStatus,
    });
  }
  
  if (shouldUseLegacy) {
    return <LegacyGameControls {...props} />;
  }
  
  return <MigratedGameControls {...props} />;
});

GameControls.displayName = 'GameControls';

export default GameControls;