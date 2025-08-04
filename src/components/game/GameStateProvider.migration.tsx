'use client';

import React from 'react';
import { GameStateProvider as LegacyGameStateProvider } from './GameStateProvider';
import { MigratedGameStateProvider } from './MigratedGameStateProvider';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import { AppState } from '@/types';

interface GameStateProviderMigrationProps {
  children: React.ReactNode;
  initialState?: Partial<AppState>;
  initialGameId?: string | null;
}

/**
 * Migration wrapper for GameStateProvider
 * This component switches between legacy and new implementation based on migration flags
 */
export function GameStateProvider({ 
  children, 
  initialState,
  initialGameId 
}: GameStateProviderMigrationProps) {
  const { shouldUseLegacy, componentStatus } = useMigrationSafety('GameStateProvider');
  
  // Log migration status in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[GameStateProvider Migration]', {
      shouldUseLegacy,
      componentStatus,
    });
  }
  
  if (shouldUseLegacy) {
    return (
      <LegacyGameStateProvider 
        initialState={initialState}
        initialGameId={initialGameId}
      >
        {children}
      </LegacyGameStateProvider>
    );
  }
  
  return (
    <MigratedGameStateProvider
      initialState={initialState}
      initialGameId={initialGameId}
    >
      {children}
    </MigratedGameStateProvider>
  );
}