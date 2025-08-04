import React from 'react';
import { render, act, renderHook } from '@testing-library/react';
import { GameStateProvider } from '../GameStateProvider.migration';
import { MigratedGameStateProvider, useGameStateContext } from '../MigratedGameStateProvider';
import { useGameStore } from '@/stores/gameStore';
import { startMigration, completeMigration, rollbackMigration } from '@/utils/stateMigration';

// Mock logger - both default and named export
jest.mock('@/utils/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the migration safety hook
jest.mock('@/hooks/useMigrationSafety', () => ({
  useMigrationSafety: jest.fn(),
}));

// Mock the legacy provider
jest.mock('../GameStateProvider', () => ({
  GameStateProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="legacy-provider">{children}</div>
  ),
}));

import { useMigrationSafety } from '@/hooks/useMigrationSafety';

const mockUseMigrationSafety = useMigrationSafety as jest.MockedFunction<typeof useMigrationSafety>;

describe('GameStateProvider Migration', () => {
  beforeEach(() => {
    // Reset stores
    act(() => {
      useGameStore.getState().resetGameSession();
      useGameStore.getState().resetField();
    });
    
    // Clear migration state
    rollbackMigration();
  });

  describe('Migration Wrapper', () => {
    it('should use legacy provider when migration is disabled', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
        componentStatus: {
          useLegacy: true,
          isMigrated: false,
          hasFailed: false,
          lastError: null,
        },
        migrationStatus: {} as any,
        withSafety: jest.fn(),
        markMigrated: jest.fn(),
        markFailed: jest.fn(),
        isMigrationInProgress: false,
        canUseMigratedState: false,
      });
      
      const { getByTestId } = render(
        <GameStateProvider>
          <div>Test Content</div>
        </GameStateProvider>
      );
      
      expect(getByTestId('legacy-provider')).toBeInTheDocument();
    });
    
    it('should use migrated provider when migration is enabled', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
        componentStatus: {
          useLegacy: false,
          isMigrated: true,
          hasFailed: false,
          lastError: null,
        },
        migrationStatus: {} as any,
        withSafety: jest.fn(),
        markMigrated: jest.fn(),
        markFailed: jest.fn(),
        isMigrationInProgress: true,
        canUseMigratedState: true,
      });
      
      const { queryByTestId } = render(
        <GameStateProvider>
          <div>Test Content</div>
        </GameStateProvider>
      );
      
      expect(queryByTestId('legacy-provider')).not.toBeInTheDocument();
    });
  });

  describe('Migrated Provider', () => {
    it('should initialize with default state', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MigratedGameStateProvider>{children}</MigratedGameStateProvider>
      );
      
      const { result } = renderHook(() => useGameStateContext(), { wrapper });
      
      expect(result.current.gameSessionState.teamName).toBe('');
      expect(result.current.gameSessionState.opponentName).toBe('');
      expect(result.current.gameSessionState.homeScore).toBe(0);
      expect(result.current.gameSessionState.awayScore).toBe(0);
      expect(result.current.playersOnField).toEqual([]);
    });
    
    it('should initialize with provided initial state', () => {
      const initialState = {
        teamName: 'Arsenal FC',
        opponentName: 'Chelsea FC',
        homeScore: 2,
        awayScore: 1,
      };
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MigratedGameStateProvider initialState={initialState}>
          {children}
        </MigratedGameStateProvider>
      );
      
      const { result } = renderHook(() => useGameStateContext(), { wrapper });
      
      expect(result.current.gameSessionState.teamName).toBe('Arsenal FC');
      expect(result.current.gameSessionState.opponentName).toBe('Chelsea FC');
      expect(result.current.gameSessionState.homeScore).toBe(2);
      expect(result.current.gameSessionState.awayScore).toBe(1);
    });
    
    it('should handle dispatch actions correctly', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MigratedGameStateProvider>{children}</MigratedGameStateProvider>
      );
      
      const { result } = renderHook(() => useGameStateContext(), { wrapper });
      
      // Test team name update
      act(() => {
        result.current.dispatchGameSession({ 
          type: 'SET_TEAM_NAME', 
          payload: 'Manchester United' 
        });
      });
      
      expect(result.current.gameSessionState.teamName).toBe('Manchester United');
      
      // Test score update
      act(() => {
        result.current.dispatchGameSession({ 
          type: 'SET_HOME_SCORE', 
          payload: 3 
        });
      });
      
      expect(result.current.gameSessionState.homeScore).toBe(3);
      
      // Test timer actions
      act(() => {
        result.current.dispatchGameSession({ type: 'START_TIMER' });
      });
      
      expect(result.current.gameSessionState.isTimerRunning).toBe(true);
      
      act(() => {
        result.current.dispatchGameSession({ type: 'STOP_TIMER' });
      });
      
      expect(result.current.gameSessionState.isTimerRunning).toBe(false);
    });
    
    it('should handle field state updates', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MigratedGameStateProvider>{children}</MigratedGameStateProvider>
      );
      
      const { result } = renderHook(() => useGameStateContext(), { wrapper });
      
      const mockPlayer = {
        id: 'player-1',
        name: 'John Doe',
        number: 10,
        position: { x: 100, y: 200 },
        isActive: true,
        stats: {},
      };
      
      // Update players on field
      act(() => {
        result.current.setPlayersOnField([mockPlayer]);
      });
      
      expect(result.current.playersOnField).toHaveLength(1);
      expect(result.current.playersOnField[0].id).toBe('player-1');
      
      // Update opponents
      const mockOpponent = {
        id: 'opp-1',
        position: { x: 300, y: 400 },
      };
      
      act(() => {
        result.current.setOpponents([mockOpponent]);
      });
      
      expect(result.current.opponents).toHaveLength(1);
      expect(result.current.opponents[0].id).toBe('opp-1');
    });
    
    it('should handle game events', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MigratedGameStateProvider>{children}</MigratedGameStateProvider>
      );
      
      const { result } = renderHook(() => useGameStateContext(), { wrapper });
      
      const mockEvent = {
        id: 'event-1',
        type: 'goal',
        playerId: 'player-1',
        playerName: 'John Doe',
        timestamp: 1800,
        period: 1,
        description: 'Goal scored',
        metadata: {},
      };
      
      // Add game event
      act(() => {
        result.current.dispatchGameSession({ 
          type: 'ADD_GAME_EVENT', 
          payload: mockEvent 
        });
      });
      
      expect(result.current.gameSessionState.gameEvents).toHaveLength(1);
      expect(result.current.gameSessionState.gameEvents[0].id).toBe('event-1');
      
      // Update game event
      act(() => {
        result.current.dispatchGameSession({ 
          type: 'UPDATE_GAME_EVENT', 
          payload: { 
            id: 'event-1', 
            updates: { description: 'Updated goal' } 
          } 
        });
      });
      
      expect(result.current.gameSessionState.gameEvents[0].description).toBe('Updated goal');
      
      // Remove game event
      act(() => {
        result.current.dispatchGameSession({ 
          type: 'REMOVE_GAME_EVENT', 
          payload: 'event-1' 
        });
      });
      
      expect(result.current.gameSessionState.gameEvents).toHaveLength(0);
    });
    
    it('should sync with Zustand store correctly', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <MigratedGameStateProvider>{children}</MigratedGameStateProvider>
      );
      
      const { result } = renderHook(() => useGameStateContext(), { wrapper });
      
      // Update through context
      act(() => {
        result.current.dispatchGameSession({ 
          type: 'SET_TEAM_NAME', 
          payload: 'Liverpool FC' 
        });
      });
      
      // Verify it's reflected in Zustand store
      const storeState = useGameStore.getState();
      expect(storeState.gameSession.teamName).toBe('Liverpool FC');
      
      // Update through Zustand directly
      act(() => {
        useGameStore.getState().setOpponentName('Everton FC');
      });
      
      // Verify it's reflected in context
      expect(result.current.gameSessionState.opponentName).toBe('Everton FC');
    });
  });
});