'use client';

import React from 'react';
import LegacySoccerField from './SoccerField';
import { MigratedSoccerField } from './MigratedSoccerField';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import type { Player, Opponent, Point, TacticalDisc } from '@/types';

export interface SoccerFieldProps {
  players: Player[];
  opponents: Opponent[];
  drawings: Point[][];
  showPlayerNames: boolean;
  onPlayerDrop: (playerId: string, relX: number, relY: number) => void;
  onPlayerMove: (playerId: string, relX: number, relY: number) => void;
  onPlayerMoveEnd: () => void;
  onDrawingStart: (point: Point) => void;
  onDrawingAddPoint: (point: Point) => void;
  onDrawingEnd: () => void;
  onPlayerRemove: (playerId: string) => void;
  onOpponentMove: (opponentId: string, relX: number, relY: number) => void;
  onOpponentMoveEnd: (opponentId: string) => void;
  onOpponentRemove: (opponentId: string) => void;
  draggingPlayerFromBarInfo: Player | null;
  onPlayerDropViaTouch: (relX: number, relY: number) => void;
  onPlayerDragCancelViaTouch: () => void;
  timeElapsedInSeconds: number;
  isTacticsBoardView: boolean;
  tacticalDiscs: TacticalDisc[];
  onTacticalDiscMove: (discId: string, relX: number, relY: number) => void;
  onTacticalDiscRemove: (discId: string) => void;
  onToggleTacticalDiscType: (discId: string) => void;
  tacticalBallPosition: Point | null;
  onTacticalBallMove: (position: Point) => void;
}

/**
 * Migration wrapper for SoccerField component
 * Switches between legacy and migrated implementation based on migration flags
 */
const SoccerField: React.FC<SoccerFieldProps> = (props) => {
  const { shouldUseLegacy, componentStatus } = useMigrationSafety('SoccerField');
  
  // Log migration status in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[SoccerField Migration]', {
      shouldUseLegacy,
      componentStatus,
    });
  }
  
  if (shouldUseLegacy) {
    return <LegacySoccerField {...props} />;
  }
  
  return <MigratedSoccerField {...props} />;
};

export default React.memo(SoccerField);