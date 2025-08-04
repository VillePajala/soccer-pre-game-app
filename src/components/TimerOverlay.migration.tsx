'use client';

import React from 'react';
import LegacyTimerOverlay from './TimerOverlay';
import { MigratedTimerOverlay } from './MigratedTimerOverlay';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import type { IntervalLog } from '@/types/game';

// Re-export the props interface
export interface TimerOverlayProps {
  timeElapsedInSeconds: number;
  subAlertLevel: 'none' | 'warning' | 'due';
  onSubstitutionMade: () => void;
  completedIntervalDurations: number[] | IntervalLog[];
  subIntervalMinutes: number;
  onSetSubInterval: (minutes: number) => void;
  isTimerRunning: boolean;
  onStartPauseTimer: () => void;
  onResetTimer: () => void;
  onToggleGoalLogModal?: () => void;
  onRecordOpponentGoal?: () => void;
  teamName: string;
  opponentName: string;
  homeScore: number;
  awayScore: number;
  homeOrAway: 'home' | 'away';
  numberOfPeriods: 1 | 2;
  periodDurationMinutes: number;
  currentPeriod: number;
  gameStatus: 'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd';
  lastSubTime: number | null;
  onOpponentNameChange: (name: string) => void;
  onClose?: () => void;
  isLoaded: boolean;
}

/**
 * Migration wrapper for TimerOverlay component
 * Switches between legacy and migrated implementation based on migration flags
 */
const TimerOverlay: React.FC<TimerOverlayProps> = (props) => {
  const { shouldUseLegacy, componentStatus } = useMigrationSafety('TimerOverlay');
  
  // Log migration status in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[TimerOverlay Migration]', {
      shouldUseLegacy,
      componentStatus,
    });
  }
  
  if (shouldUseLegacy) {
    return <LegacyTimerOverlay {...props} />;
  }
  
  return <MigratedTimerOverlay {...props} />;
};

export default React.memo(TimerOverlay);