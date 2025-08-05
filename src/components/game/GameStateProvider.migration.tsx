'use client';

import React, { useContext, createContext } from 'react';
import { GameStateProvider as LegacyGameStateProvider, useGameStateContext as useLegacyGameStateContext } from './GameStateProvider';
import { MigratedGameStateProvider, useGameStateContext as useMigratedGameStateContext } from './MigratedGameStateProvider';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import { AppState } from '@/types';
import { GameStateContextType } from '@/types/gameComponents';

// Create a unified context for the migration wrapper
const UnifiedGameStateContext = createContext<GameStateContextType | null>(null);

interface GameStateProviderMigrationProps {
  children: React.ReactNode;
  initialState?: Partial<AppState>;
  initialGameId?: string | null;
}

// Context forwarder for legacy provider
function LegacyContextForwarder({ children }: { children: React.ReactNode }) {
  const contextValue = useLegacyGameStateContext();
  return (
    <UnifiedGameStateContext.Provider value={contextValue}>
      {children}
    </UnifiedGameStateContext.Provider>
  );
}

// Context forwarder for migrated provider  
function MigratedContextForwarder({ children }: { children: React.ReactNode }) {
  const contextValue = useMigratedGameStateContext();
  return (
    <UnifiedGameStateContext.Provider value={contextValue}>
      {children}
    </UnifiedGameStateContext.Provider>
  );
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
        <LegacyContextForwarder>
          {children}
        </LegacyContextForwarder>
      </LegacyGameStateProvider>
    );
  }
  
  return (
    <MigratedGameStateProvider
      initialState={initialState}
      initialGameId={initialGameId}
    >
      <MigratedContextForwarder>
        {children}
      </MigratedContextForwarder>
    </MigratedGameStateProvider>
  );
}

/**
 * Hook to access the unified game state context
 * This hook accesses the unified context provided by the migration wrapper
 */
export function useGameStateContext(): GameStateContextType {
  const context = useContext(UnifiedGameStateContext);
  if (!context) {
    throw new Error('useGameStateContext must be used within a GameStateProvider (migration wrapper)');
  }
  return context;
}