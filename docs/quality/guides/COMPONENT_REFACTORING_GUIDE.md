# Component Refactoring Guide

## Breaking Down the Monolithic HomePage Component

This guide provides step-by-step instructions for refactoring the 2,081-line HomePage component into maintainable, focused components.

## Overview

**Current State**: Single component handling all concerns  
**Target State**: 6-8 focused components (<300 lines each)  
**Estimated Time**: 20-30 hours  
**Risk Level**: High (requires careful migration)

## Pre-Refactoring Checklist

Before starting the refactoring process:

- [ ] Create backup branch: `git checkout -b backup-before-homepage-refactor`
- [ ] Ensure all tests are passing: `npm test`
- [ ] Document current component behavior
- [ ] Set up monitoring for regressions

## Step 1: Analysis and Planning (4 hours)

### 1.1 Map Current Responsibilities
Create a detailed map of what the HomePage component currently handles:

```bash
# Analyze the component structure
grep -n "useState\|useReducer\|useCallback\|useEffect" src/components/HomePage.tsx > homepage-analysis.txt
```

**Expected Responsibilities**:
1. **State Management** (lines ~40-150)
   - Game session state
   - Modal states (10+ modals)
   - Field player states
   - UI interaction states

2. **Event Handling** (lines ~200-800)
   - Game control events
   - Player management events
   - Modal opening/closing
   - Data save/load events

3. **Data Operations** (lines ~800-1200)
   - Game data fetching
   - Player roster management
   - Settings management
   - Import/export operations

4. **UI Rendering** (lines ~1200-2081)
   - Game field rendering
   - Control panels
   - Modal orchestration
   - Loading states

### 1.2 Define Component Boundaries
Plan the new component structure:

```
HomePage (Orchestrator)
├── GameStateProvider (Context Provider)
├── GameView (Field + Players)
├── GameControls (Timer + Actions)
├── DataSyncManager (Background sync)
├── ModalOrchestrator (Modal management)
└── ErrorBoundary (Error handling)
```

### 1.3 Create Migration Strategy
1. **Phase 1**: Extract state management to context
2. **Phase 2**: Extract pure UI components
3. **Phase 3**: Extract business logic
4. **Phase 4**: Create orchestrator
5. **Phase 5**: Cleanup and optimization

## Step 2: Extract GameStateProvider (6 hours)

### 2.1 Create Context Structure
```typescript
// src/components/game/GameStateProvider.tsx
'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { gameSessionReducer, GameSessionState, initialGameSessionState } from '@/hooks/useGameSessionReducer';
import { useGameState, UseGameStateReturn } from '@/hooks/useGameState';

interface GameStateContextType {
  // Game session state
  gameSessionState: GameSessionState;
  gameSessionDispatch: React.Dispatch<any>;
  
  // Field state
  gameState: UseGameStateReturn;
  
  // Actions
  actions: {
    startGame: (config: GameConfig) => void;
    pauseGame: () => void;
    resumeGame: () => void;
    endGame: () => void;
    addGoal: (playerId: string, assisterId?: string) => void;
    // ... other actions
  };
}

const GameStateContext = createContext<GameStateContextType | null>(null);

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const [gameSessionState, gameSessionDispatch] = useReducer(
    gameSessionReducer,
    initialGameSessionState
  );
  
  const gameState = useGameState(/* initial state */);
  
  // Extract action creators from HomePage
  const actions = {
    startGame: useCallback((config: GameConfig) => {
      // Move logic from HomePage
      gameSessionDispatch({
        type: 'START_GAME',
        payload: config,
      });
    }, [gameSessionDispatch]),
    
    pauseGame: useCallback(() => {
      gameSessionDispatch({ type: 'PAUSE_GAME' });
    }, [gameSessionDispatch]),
    
    // ... other actions extracted from HomePage
  };

  const value = {
    gameSessionState,
    gameSessionDispatch,
    gameState,
    actions,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameStateContext() {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameStateContext must be used within GameStateProvider');
  }
  return context;
}
```

### 2.2 Migration Checklist
Move the following from HomePage to GameStateProvider:

- [ ] `useReducer(gameSessionReducer, ...)`
- [ ] `useGameState()` hook
- [ ] All game-related action creators
- [ ] State initialization logic
- [ ] Game event handlers

### 2.3 Update HomePage to Use Context
```typescript
// src/components/HomePage.tsx (partial update)
import { GameStateProvider, useGameStateContext } from './game/GameStateProvider';

function HomePageContent() {
  const { gameSessionState, gameState, actions } = useGameStateContext();
  
  // Remove all state declarations that were moved to provider
  // Update all action handlers to use context actions
  
  // Rest of component logic...
}

export default function HomePage() {
  return (
    <GameStateProvider>
      <HomePageContent />
    </GameStateProvider>
  );
}
```

## Step 3: Extract GameView Component (6 hours)

### 3.1 Create GameView Component
```typescript
// src/components/game/GameView.tsx
'use client';

import React from 'react';
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import { useGameStateContext } from './GameStateProvider';

interface GameViewProps {
  isLoading?: boolean;
  className?: string;
}

export function GameView({ isLoading = false, className = '' }: GameViewProps) {
  const { gameSessionState, gameState, actions } = useGameStateContext();
  
  if (isLoading) {
    return <div className="game-view-loading">Loading game...</div>;
  }

  return (
    <div className={`game-view ${className}`}>
      <div className="soccer-field-container">
        <SoccerField
          playersOnField={gameState.playersOnField}
          opponents={gameState.opponents}
          drawings={gameState.drawings}
          onPlayerMove={gameState.movePlayer}
          onPlayerAdd={actions.addPlayerToField}
          onPlayerRemove={actions.removePlayerFromField}
          onDrawingAdd={gameState.addDrawing}
          showPlayerNames={gameState.showPlayerNames}
          // ... other props from HomePage
        />
      </div>
      
      <div className="player-bar-container">
        <PlayerBar
          availablePlayers={gameState.availablePlayers}
          playersOnField={gameState.playersOnField}
          onPlayerToggle={actions.togglePlayerAvailability}
          onPlayerEdit={actions.editPlayer}
          // ... other props from HomePage
        />
      </div>
    </div>
  );
}
```

### 3.2 Migration Tasks
- [ ] Move SoccerField integration logic
- [ ] Move PlayerBar integration logic
- [ ] Move drag-and-drop handlers
- [ ] Move field-related event handlers
- [ ] Test field interactions work correctly

## Step 4: Extract GameControls Component (6 hours)

### 4.1 Create GameControls Component
```typescript
// src/components/game/GameControls.tsx
'use client';

import React from 'react';
import ControlBar from '@/components/ControlBar';
import TimerOverlay from '@/components/TimerOverlay';
import GameInfoBar from '@/components/GameInfoBar';
import { useGameStateContext } from './GameStateProvider';

export function GameControls() {
  const { gameSessionState, actions } = useGameStateContext();
  
  return (
    <div className="game-controls">
      <GameInfoBar
        teamName={gameSessionState.teamName}
        opponentName={gameSessionState.opponentName}
        currentPeriod={gameSessionState.currentPeriod}
        score={gameSessionState.score}
        gameDate={gameSessionState.gameDate}
        gameLocation={gameSessionState.gameLocation}
      />
      
      <ControlBar
        gameStatus={gameSessionState.gameStatus}
        isTimerRunning={gameSessionState.isTimerRunning}
        onStartGame={actions.startGame}
        onPauseGame={actions.pauseGame}
        onResumeGame={actions.resumeGame}
        onEndGame={actions.endGame}
        onEndPeriod={actions.endPeriod}
        // ... other control props
      />
      
      <TimerOverlay
        timeRemaining={gameSessionState.timeRemaining}
        isVisible={gameSessionState.isTimerRunning}
        currentPeriod={gameSessionState.currentPeriod}
        totalPeriods={gameSessionState.totalPeriods}
      />
    </div>
  );
}
```

### 4.2 Migration Tasks
- [ ] Move timer management logic
- [ ] Move game control handlers
- [ ] Move period management
- [ ] Move score display logic
- [ ] Test all game controls work

## Step 5: Extract ModalOrchestrator (8 hours)

### 5.1 Create Modal Management System
```typescript
// src/components/game/ModalOrchestrator.tsx
'use client';

import React, { Suspense } from 'react';
import { useModalContext } from '@/contexts/ModalProvider';
import { GameStatsModalSkeleton, LoadGameModalSkeleton, ModalSkeleton } from '@/components/ui/ModalSkeleton';

// Lazy load all modals
const GameStatsModal = React.lazy(() => import('@/components/GameStatsModal'));
const GameSettingsModal = React.lazy(() => import('@/components/GameSettingsModal'));
const LoadGameModal = React.lazy(() => import('@/components/LoadGameModal'));
const NewGameSetupModal = React.lazy(() => import('@/components/NewGameSetupModal'));
const RosterSettingsModal = React.lazy(() => import('@/components/RosterSettingsModal'));
const SettingsModal = React.lazy(() => import('@/components/SettingsModal'));
const SeasonTournamentManagementModal = React.lazy(() => import('@/components/SeasonTournamentManagementModal'));
const InstructionsModal = React.lazy(() => import('@/components/InstructionsModal'));
const PlayerAssessmentModal = React.lazy(() => import('@/components/PlayerAssessmentModal'));
const GoalLogModal = React.lazy(() => import('@/components/GoalLogModal'));

export function ModalOrchestrator() {
  const modalStates = useModalContext();

  return (
    <>
      <Suspense fallback={<GameStatsModalSkeleton />}>
        {modalStates.isGameStatsModalOpen && (
          <GameStatsModal />
        )}
      </Suspense>

      <Suspense fallback={<ModalSkeleton />}>
        {modalStates.isGameSettingsModalOpen && (
          <GameSettingsModal />
        )}
      </Suspense>

      <Suspense fallback={<LoadGameModalSkeleton />}>
        {modalStates.isLoadGameModalOpen && (
          <LoadGameModal />
        )}
      </Suspense>

      <Suspense fallback={<ModalSkeleton />}>
        {modalStates.isNewGameSetupModalOpen && (
          <NewGameSetupModal />
        )}
      </Suspense>

      <Suspense fallback={<ModalSkeleton />}>
        {modalStates.isRosterSettingsModalOpen && (
          <RosterSettingsModal />
        )}
      </Suspense>

      <Suspense fallback={<ModalSkeleton />}>
        {modalStates.isSettingsModalOpen && (
          <SettingsModal />
        )}
      </Suspense>

      <Suspense fallback={<ModalSkeleton />}>
        {modalStates.isSeasonTournamentManagementModalOpen && (
          <SeasonTournamentManagementModal />
        )}
      </Suspense>

      <Suspense fallback={<ModalSkeleton />}>
        {modalStates.isInstructionsModalOpen && (
          <InstructionsModal />
        )}
      </Suspense>

      <Suspense fallback={<ModalSkeleton />}>
        {modalStates.isPlayerAssessmentModalOpen && (
          <PlayerAssessmentModal />
        )}
      </Suspense>

      <Suspense fallback={<ModalSkeleton />}>
        {modalStates.isGoalLogModalOpen && (
          <GoalLogModal />
        )}
      </Suspense>
    </>
  );
}
```

### 5.2 Migration Tasks
- [ ] Move all modal rendering logic
- [ ] Ensure lazy loading works correctly
- [ ] Add proper error boundaries
- [ ] Test modal opening/closing
- [ ] Verify modal interactions

## Step 6: Extract DataSyncManager (6 hours)

### 6.1 Create Background Data Operations
```typescript
// src/components/game/DataSyncManager.tsx
'use client';

import React, { useEffect } from 'react';
import { useGameStateContext } from './GameStateProvider';
import { useGameDataQueries } from '@/hooks/useGameDataQueries';
import { useAutoBackup } from '@/hooks/useAutoBackup';
import logger from '@/utils/logger';

export function DataSyncManager() {
  const { gameSessionState } = useGameStateContext();
  const { 
    savedGames, 
    masterRoster, 
    seasons, 
    tournaments 
  } = useGameDataQueries();
  
  // Auto-backup functionality
  useAutoBackup({
    gameState: gameSessionState,
    interval: 30000, // 30 seconds
  });

  // Background data synchronization
  useEffect(() => {
    const syncData = async () => {
      try {
        // Sync game state to storage
        if (gameSessionState.gameId) {
          await syncGameToStorage(gameSessionState);
        }
        
        // Sync roster changes
        if (masterRoster.data) {
          await syncRosterToStorage(masterRoster.data);
        }
        
        logger.debug('Background sync completed');
      } catch (error) {
        logger.error('Background sync failed:', error);
      }
    };

    const interval = setInterval(syncData, 60000); // Every minute
    return () => clearInterval(interval);
  }, [gameSessionState, masterRoster.data]);

  // This component doesn't render anything visible
  return null;
}

async function syncGameToStorage(gameState: GameSessionState) {
  // Implementation moved from HomePage
}

async function syncRosterToStorage(roster: Player[]) {
  // Implementation moved from HomePage
}
```

### 6.2 Migration Tasks
- [ ] Move auto-save logic
- [ ] Move background sync operations
- [ ] Move data loading logic
- [ ] Test data persistence
- [ ] Verify backup functionality

## Step 7: Create New HomePage Orchestrator (4 hours)

### 7.1 Simplified HomePage
```typescript
// src/components/HomePage.tsx (final version)
'use client';

import React, { Suspense } from 'react';
import { GameStateProvider } from './game/GameStateProvider';
import { GameView } from './game/GameView';
import { GameControls } from './game/GameControls';
import { ModalOrchestrator } from './game/ModalOrchestrator';
import { DataSyncManager } from './game/DataSyncManager';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AppLoadingSkeleton } from '@/components/ui/AppSkeleton';

export default function HomePage() {
  return (
    <ErrorBoundary>
      <GameStateProvider>
        <div className="homepage">
          <Suspense fallback={<AppLoadingSkeleton />}>
            <GameView />
            <GameControls />
            <DataSyncManager />
            <ModalOrchestrator />
          </Suspense>
        </div>
      </GameStateProvider>
    </ErrorBoundary>
  );
}
```

### 7.2 Final Cleanup
- [ ] Remove unused imports
- [ ] Remove unused state variables
- [ ] Remove unused event handlers
- [ ] Clean up CSS classes
- [ ] Update component tests

## Step 8: Testing and Validation (6 hours)

### 8.1 Component Testing
Create tests for each new component:

```typescript
// src/components/game/__tests__/GameView.test.tsx
import { render, screen } from '@testing-library/react';
import { GameView } from '../GameView';
import { GameStateProvider } from '../GameStateProvider';

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <GameStateProvider>
      {component}
    </GameStateProvider>
  );
};

describe('GameView', () => {
  it('renders soccer field and player bar', () => {
    renderWithProvider(<GameView />);
    
    expect(screen.getByTestId('soccer-field')).toBeInTheDocument();
    expect(screen.getByTestId('player-bar')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    renderWithProvider(<GameView isLoading={true} />);
    
    expect(screen.getByText('Loading game...')).toBeInTheDocument();
  });
});
```

### 8.2 Integration Testing
Test component interactions:

```typescript
// src/components/game/__tests__/GameIntegration.test.tsx
describe('Game Component Integration', () => {
  it('should handle complete game flow', async () => {
    render(
      <GameStateProvider>
        <GameView />
        <GameControls />
      </GameStateProvider>
    );

    // Test game start
    const startButton = screen.getByText('Start Game');
    fireEvent.click(startButton);

    // Verify game state updates
    expect(screen.getByText('Period 1')).toBeInTheDocument();
    
    // Test player addition
    const player = screen.getByText('Test Player');
    const field = screen.getByTestId('soccer-field');
    
    // Simulate drag and drop
    fireEvent.dragStart(player);
    fireEvent.drop(field);
    
    // Verify player on field
    expect(screen.getByTestId('field-player-test')).toBeInTheDocument();
  });
});
```

### 8.3 Performance Testing
Verify performance hasn't degraded:

```bash
# Run performance tests
npm run test:performance

# Check bundle size
npm run bundle:analyze

# Lighthouse audit
npm run lighthouse
```

## Step 9: Documentation and Cleanup (2 hours)

### 9.1 Update Documentation
- [ ] Update component documentation
- [ ] Add component interaction diagrams
- [ ] Document new folder structure
- [ ] Update development workflow docs

### 9.2 Component Documentation
```typescript
/**
 * GameView - Interactive game field and player management
 * 
 * Responsibilities:
 * - Rendering the soccer field with players
 * - Managing player bar interactions
 * - Handling drag-and-drop operations
 * - Displaying field drawings and annotations
 * 
 * Dependencies:
 * - GameStateProvider context for game state
 * - SoccerField component for field rendering
 * - PlayerBar component for roster display
 * 
 * @example
 * ```tsx
 * <GameStateProvider>
 *   <GameView />
 * </GameStateProvider>
 * ```
 */
export function GameView(props: GameViewProps) {
  // Implementation
}
```

## Risk Mitigation Strategies

### Backup and Recovery
1. **Create backup branch**: Always work on a feature branch
2. **Incremental commits**: Commit after each component extraction
3. **Test after each step**: Don't proceed if tests fail
4. **Rollback plan**: Be prepared to revert if issues arise

### Common Pitfalls
1. **Circular Dependencies**: Watch for import cycles between components
2. **Context Overuse**: Don't put everything in context, only shared state
3. **Prop Drilling**: Use context for deeply nested props, direct props for simple cases
4. **Performance**: Monitor render counts, add React.memo where needed

### Validation Checklist
Before considering the refactoring complete:

- [ ] All existing functionality preserved
- [ ] All tests passing
- [ ] No performance regression
- [ ] Bundle size not significantly increased
- [ ] Each component under 300 lines
- [ ] Clear component responsibilities
- [ ] Proper error handling
- [ ] TypeScript compilation clean
- [ ] ESLint violations resolved

## Success Criteria

### Quantitative Metrics
- **HomePage.tsx**: Reduced from 2,081 lines to <100 lines
- **Component Count**: 6-8 focused components created
- **Max Component Size**: <300 lines per component
- **Test Coverage**: Maintained or improved
- **Performance**: No degradation in key metrics

### Qualitative Improvements
- **Maintainability**: Each component has single responsibility
- **Testability**: Components can be tested in isolation
- **Reusability**: Components can be reused in different contexts
- **Developer Experience**: Easier to locate and modify specific functionality
- **Code Review**: Smaller, focused changes in pull requests

## Next Steps

After completing the HomePage refactoring:

1. **Apply Similar Patterns**: Refactor other large components using same approach
2. **State Management**: Consider migrating to unified state management (Zustand)
3. **Performance Optimization**: Add React.memo and useMemo where beneficial
4. **Component Library**: Extract reusable components to shared library

This refactoring represents a significant architectural improvement that will make the codebase much more maintainable and enable faster feature development going forward.