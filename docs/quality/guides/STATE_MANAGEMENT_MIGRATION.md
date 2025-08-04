# State Management Migration Guide

## From Mixed Patterns to Unified Zustand Architecture

This guide provides detailed steps for migrating from the current mixed state management approach (useState, useReducer, React Query) to a unified Zustand-based architecture.

## Overview

**Current State**: Mixed patterns causing complexity and confusion  
**Target State**: Zustand for client state + React Query for server state  
**Estimated Time**: 15-25 hours  
**Risk Level**: Medium (well-tested migration path)

## Pre-Migration Assessment

### Current State Audit
Before beginning migration, document the current state management patterns:

```bash
# Audit current state usage
grep -r "useState" src/ --include="*.tsx" --include="*.ts" | wc -l
grep -r "useReducer" src/ --include="*.tsx" --include="*.ts" | wc -l
grep -r "useQuery" src/ --include="*.tsx" --include="*.ts" | wc -l
```

**Expected Findings**:
- **useState**: 50+ instances (mostly UI state)
- **useReducer**: 3-5 instances (game session, complex state)
- **useQuery**: 15+ instances (server data)
- **localStorage**: Direct usage scattered throughout

### State Domain Mapping
Categorize current state by domain:

```typescript
interface StateAudit {
  // Client State (migrate to Zustand)
  gameSession: 'useReducer';     // Game timer, score, periods
  fieldState: 'useState';        // Player positions, drawings
  modalStates: 'useState[]';     // 10+ modal visibility states
  uiState: 'useState[]';         // Loading, selected items, etc.
  
  // Server State (keep in React Query)
  masterRoster: 'useQuery';      // Player data
  savedGames: 'useQuery';        // Game saves
  seasons: 'useQuery';           // Season data
  tournaments: 'useQuery';       // Tournament data
  
  // Settings (migrate to Zustand + persistence)
  appSettings: 'localStorage';   // User preferences
  gameSettings: 'localStorage'; // Game configuration
}
```

## Step 1: Install and Configure Zustand (2 hours)

### 1.1 Install Dependencies
```bash
npm install zustand
npm install immer  # For easier state updates
```

### 1.2 Setup TypeScript Configuration
```typescript
// src/types/store.ts
export interface AppStore {
  // Game session state
  gameSession: GameSessionState;
  
  // Field state
  field: FieldState;
  
  // UI state
  ui: UIState;
  
  // Modal state
  modals: ModalState;
  
  // Actions
  actions: StoreActions;
}

export interface GameSessionState {
  gameId?: string;
  gameStatus: 'notStarted' | 'inProgress' | 'paused' | 'periodEnd' | 'gameEnd';
  isTimerRunning: boolean;
  timeRemaining: number;
  currentPeriod: number;
  totalPeriods: number;
  score: { home: number; away: number };
  teamName: string;
  opponentName: string;
  gameDate: string;
  gameLocation: string;
  gameEvents: GameEvent[];
  startTime?: string;
  endTime?: string;
}

export interface FieldState {
  playersOnField: Player[];
  opponents: Player[];
  drawings: Drawing[];
  showPlayerNames: boolean;
  fieldDimensions: { width: number; height: number };
}

export interface UIState {
  isLoading: boolean;
  selectedPlayerId?: string;
  isCreatingNewGame: boolean;
  lastSaveTime?: string;
  connectionStatus: 'online' | 'offline';
}

export interface ModalState {
  gameSettings: boolean;
  gameStats: boolean;
  loadGame: boolean;
  newGameSetup: boolean;
  rosterSettings: boolean;
  settings: boolean;
  seasonTournament: boolean;
  instructions: boolean;
  playerAssessment: boolean;
  goalLog: boolean;
}

export interface StoreActions {
  // Game session actions
  startGame: (config: GameStartConfig) => void;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  endPeriod: () => void;
  updateScore: (home: number, away: number) => void;
  addGameEvent: (event: GameEvent) => void;
  
  // Field actions
  addPlayerToField: (player: Player, position: { x: number; y: number }) => void;
  removePlayerFromField: (playerId: string) => void;
  movePlayerOnField: (playerId: string, position: { x: number; y: number }) => void;
  addDrawing: (drawing: Drawing) => void;
  clearDrawings: () => void;
  
  // UI actions
  setLoading: (loading: boolean) => void;
  selectPlayer: (playerId?: string) => void;
  setConnectionStatus: (status: 'online' | 'offline') => void;
  
  // Modal actions
  openModal: (modal: keyof ModalState) => void;
  closeModal: (modal: keyof ModalState) => void;
  closeAllModals: () => void;
  
  // Utility actions
  resetGameSession: () => void;
  loadGameState: (gameState: Partial<GameSessionState>) => void;
}
```

### 1.3 Create Base Store Structure
```typescript
// src/stores/appStore.ts
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { AppStore, GameSessionState, FieldState, UIState, ModalState } from '@/types/store';

// Initial states
const initialGameSession: GameSessionState = {
  gameStatus: 'notStarted',
  isTimerRunning: false,
  timeRemaining: 45 * 60 * 1000, // 45 minutes
  currentPeriod: 1,
  totalPeriods: 2,
  score: { home: 0, away: 0 },
  teamName: '',
  opponentName: '',
  gameDate: new Date().toISOString().split('T')[0],
  gameLocation: '',
  gameEvents: [],
};

const initialFieldState: FieldState = {
  playersOnField: [],
  opponents: [],
  drawings: [],
  showPlayerNames: true,
  fieldDimensions: { width: 800, height: 600 },
};

const initialUIState: UIState = {
  isLoading: false,
  isCreatingNewGame: false,
  connectionStatus: 'online',
};

const initialModalState: ModalState = {
  gameSettings: false,
  gameStats: false,
  loadGame: false,
  newGameSetup: false,
  rosterSettings: false,
  settings: false,
  seasonTournament: false,
  instructions: false,
  playerAssessment: false,
  goalLog: false,
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          gameSession: initialGameSession,
          field: initialFieldState,
          ui: initialUIState,
          modals: initialModalState,

          // Actions
          actions: {
            // Game session actions
            startGame: (config) => set((state) => {
              state.gameSession.gameStatus = 'inProgress';
              state.gameSession.isTimerRunning = true;
              state.gameSession.teamName = config.teamName;
              state.gameSession.opponentName = config.opponentName;
              state.gameSession.gameDate = config.gameDate;
              state.gameSession.gameLocation = config.gameLocation || '';
              state.gameSession.startTime = new Date().toISOString();
              state.gameSession.gameId = config.gameId || crypto.randomUUID();
            }),

            pauseGame: () => set((state) => {
              state.gameSession.isTimerRunning = false;
            }),

            resumeGame: () => set((state) => {
              state.gameSession.isTimerRunning = true;
            }),

            endGame: () => set((state) => {
              state.gameSession.gameStatus = 'gameEnd';
              state.gameSession.isTimerRunning = false;
              state.gameSession.endTime = new Date().toISOString();
            }),

            endPeriod: () => set((state) => {
              const { currentPeriod, totalPeriods } = state.gameSession;
              if (currentPeriod < totalPeriods) {
                state.gameSession.gameStatus = 'periodEnd';
                state.gameSession.isTimerRunning = false;
              } else {
                state.gameSession.gameStatus = 'gameEnd';
                state.gameSession.isTimerRunning = false;
                state.gameSession.endTime = new Date().toISOString();
              }
            }),

            updateScore: (home, away) => set((state) => {
              state.gameSession.score = { home, away };
            }),

            addGameEvent: (event) => set((state) => {
              state.gameSession.gameEvents.push(event);
              
              // Update score if it's a goal
              if (event.type === 'goal') {
                state.gameSession.score.home += 1;
              }
            }),

            // Field actions
            addPlayerToField: (player, position) => set((state) => {
              const playerOnField = {
                ...player,
                relX: position.x,
                relY: position.y,
              };
              state.field.playersOnField.push(playerOnField);
            }),

            removePlayerFromField: (playerId) => set((state) => {
              state.field.playersOnField = state.field.playersOnField.filter(
                p => p.id !== playerId
              );
            }),

            movePlayerOnField: (playerId, position) => set((state) => {
              const player = state.field.playersOnField.find(p => p.id === playerId);
              if (player) {
                player.relX = position.x;
                player.relY = position.y;
              }
            }),

            addDrawing: (drawing) => set((state) => {
              state.field.drawings.push(drawing);
            }),

            clearDrawings: () => set((state) => {
              state.field.drawings = [];
            }),

            // UI actions
            setLoading: (loading) => set((state) => {
              state.ui.isLoading = loading;
            }),

            selectPlayer: (playerId) => set((state) => {
              state.ui.selectedPlayerId = playerId;
            }),

            setConnectionStatus: (status) => set((state) => {
              state.ui.connectionStatus = status;
            }),

            // Modal actions
            openModal: (modal) => set((state) => {
              state.modals[modal] = true;
            }),

            closeModal: (modal) => set((state) => {
              state.modals[modal] = false;
            }),

            closeAllModals: () => set((state) => {
              Object.keys(state.modals).forEach(key => {
                state.modals[key as keyof ModalState] = false;
              });
            }),

            // Utility actions
            resetGameSession: () => set((state) => {
              state.gameSession = { ...initialGameSession };
              state.field.playersOnField = [];
              state.field.drawings = [];
            }),

            loadGameState: (gameState) => set((state) => {
              Object.assign(state.gameSession, gameState);
            }),
          },
        }))
      ),
      {
        name: 'soccer-app-store',
        // Only persist certain parts of the state
        partialize: (state) => ({
          gameSession: state.gameSession,
          field: {
            showPlayerNames: state.field.showPlayerNames,
            fieldDimensions: state.field.fieldDimensions,
          },
        }),
      }
    ),
    { name: 'SoccerAppStore' }
  )
);
```

## Step 2: Create Selector Hooks (3 hours)

### 2.1 Game Session Selectors
```typescript
// src/stores/selectors/gameSelectors.ts
import { useAppStore } from '../appStore';
import { useMemo } from 'react';

// Game session selectors
export const useGameSession = () => useAppStore(state => state.gameSession);

export const useGameStatus = () => useAppStore(state => state.gameSession.gameStatus);

export const useGameTimer = () => useAppStore(state => ({
  timeRemaining: state.gameSession.timeRemaining,
  isTimerRunning: state.gameSession.isTimerRunning,
  currentPeriod: state.gameSession.currentPeriod,
  totalPeriods: state.gameSession.totalPeriods,
}));

export const useGameScore = () => useAppStore(state => state.gameSession.score);

export const useGameInfo = () => useAppStore(state => ({
  teamName: state.gameSession.teamName,
  opponentName: state.gameSession.opponentName,
  gameDate: state.gameSession.gameDate,
  gameLocation: state.gameSession.gameLocation,
}));

export const useGameEvents = () => useAppStore(state => state.gameSession.gameEvents);

// Computed selectors
export const useGameStatistics = () => {
  return useAppStore(state => {
    const events = state.gameSession.gameEvents;
    return useMemo(() => {
      const goals = events.filter(e => e.type === 'goal').length;
      const assists = events.filter(e => e.type === 'goal' && e.assisterId).length;
      const substitutions = events.filter(e => e.type === 'substitution').length;
      
      return { goals, assists, substitutions, totalEvents: events.length };
    }, [events]);
  });
};

export const usePlayerGameStats = (playerId: string) => {
  return useAppStore(state => {
    const events = state.gameSession.gameEvents;
    return useMemo(() => {
      const playerGoals = events.filter(e => 
        e.type === 'goal' && e.playerId === playerId
      ).length;
      
      const playerAssists = events.filter(e => 
        e.type === 'goal' && e.assisterId === playerId
      ).length;
      
      return { goals: playerGoals, assists: playerAssists };
    }, [events, playerId]);
  });
};
```

### 2.2 Field and UI Selectors
```typescript
// src/stores/selectors/fieldSelectors.ts
export const useFieldState = () => useAppStore(state => state.field);

export const usePlayersOnField = () => useAppStore(state => state.field.playersOnField);

export const useOpponents = () => useAppStore(state => state.field.opponents);

export const useDrawings = () => useAppStore(state => state.field.drawings);

export const useShowPlayerNames = () => useAppStore(state => state.field.showPlayerNames);

export const useFieldDimensions = () => useAppStore(state => state.field.fieldDimensions);

export const usePlayerPosition = (playerId: string) => useAppStore(state => {
  const player = state.field.playersOnField.find(p => p.id === playerId);
  return player ? { x: player.relX || 0, y: player.relY || 0 } : null;
});

// src/stores/selectors/uiSelectors.ts
export const useUIState = () => useAppStore(state => state.ui);

export const useIsLoading = () => useAppStore(state => state.ui.isLoading);

export const useSelectedPlayer = () => useAppStore(state => state.ui.selectedPlayerId);

export const useConnectionStatus = () => useAppStore(state => state.ui.connectionStatus);

// src/stores/selectors/modalSelectors.ts
export const useModalState = (modal: keyof ModalState) => 
  useAppStore(state => state.modals[modal]);

export const useAnyModalOpen = () => useAppStore(state => 
  Object.values(state.modals).some(isOpen => isOpen)
);

export const useOpenModals = () => useAppStore(state => {
  return Object.entries(state.modals)
    .filter(([_, isOpen]) => isOpen)
    .map(([modal, _]) => modal);
});
```

### 2.3 Action Selectors
```typescript
// src/stores/selectors/actionSelectors.ts
export const useGameActions = () => useAppStore(state => ({
  startGame: state.actions.startGame,
  pauseGame: state.actions.pauseGame,
  resumeGame: state.actions.resumeGame,
  endGame: state.actions.endGame,
  endPeriod: state.actions.endPeriod,
  updateScore: state.actions.updateScore,
  addGameEvent: state.actions.addGameEvent,
  resetGameSession: state.actions.resetGameSession,
  loadGameState: state.actions.loadGameState,
}));

export const useFieldActions = () => useAppStore(state => ({
  addPlayerToField: state.actions.addPlayerToField,
  removePlayerFromField: state.actions.removePlayerFromField,
  movePlayerOnField: state.actions.movePlayerOnField,
  addDrawing: state.actions.addDrawing,
  clearDrawings: state.actions.clearDrawings,
}));

export const useUIActions = () => useAppStore(state => ({
  setLoading: state.actions.setLoading,
  selectPlayer: state.actions.selectPlayer,
  setConnectionStatus: state.actions.setConnectionStatus,
}));

export const useModalActions = () => useAppStore(state => ({
  openModal: state.actions.openModal,
  closeModal: state.actions.closeModal,
  closeAllModals: state.actions.closeAllModals,
}));
```

## Step 3: Migrate Game Session State (6 hours)

### 3.1 Replace useReducer in HomePage
```typescript
// Before (in HomePage.tsx):
const [gameSessionState, gameSessionDispatch] = useReducer(
  gameSessionReducer,
  initialGameSessionState
);

// After:
import { useGameSession, useGameActions } from '@/stores/selectors';

function HomePage() {
  const gameSession = useGameSession();
  const gameActions = useGameActions();
  
  // Replace all gameSessionDispatch calls with action calls
  // gameSessionDispatch({ type: 'START_GAME', payload: config });
  // becomes:
  // gameActions.startGame(config);
}
```

### 3.2 Update Game Control Components
```typescript
// src/components/ControlBar.tsx
import { useGameStatus, useGameTimer, useGameActions } from '@/stores/selectors';

export default function ControlBar() {
  const gameStatus = useGameStatus();
  const { isTimerRunning } = useGameTimer();
  const { startGame, pauseGame, resumeGame, endGame } = useGameActions();
  
  // Remove all useState and prop drilling
  // Use store selectors and actions directly
  
  return (
    <div className="control-bar">
      {gameStatus === 'notStarted' && (
        <button onClick={() => startGame(gameConfig)}>
          Start Game
        </button>
      )}
      
      {gameStatus === 'inProgress' && (
        <button onClick={isTimerRunning ? pauseGame : resumeGame}>
          {isTimerRunning ? 'Pause' : 'Resume'}
        </button>
      )}
      
      <button onClick={endGame}>End Game</button>
    </div>
  );
}
```

### 3.3 Migration Checklist
- [ ] Replace useReducer with store selectors
- [ ] Update all components using game session state
- [ ] Remove prop drilling for game session props
- [ ] Update event handlers to use store actions
- [ ] Test game flow functionality

## Step 4: Migrate Modal Management (4 hours)

### 4.1 Replace ModalProvider
```typescript
// Before: Complex ModalProvider with multiple useState
// After: Simple store-based modal management

// src/components/GameSettingsModal.tsx
import { useModalState, useModalActions } from '@/stores/selectors';

export default function GameSettingsModal() {
  const isOpen = useModalState('gameSettings');
  const { closeModal } = useModalActions();
  
  if (!isOpen) return null;
  
  return (
    <Modal onClose={() => closeModal('gameSettings')}>
      {/* Modal content */}
    </Modal>
  );
}
```

### 4.2 Update Modal Triggers
```typescript
// Before: 
const { setIsGameSettingsModalOpen } = useModalContext();

// After:
const { openModal } = useModalActions();

// Usage:
<button onClick={() => openModal('gameSettings')}>
  Game Settings
</button>
```

### 4.3 Remove ModalProvider
```typescript
// src/app/layout.tsx
// Remove ModalProvider wrapper
// Modals now get state directly from Zustand store

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            {children}
          </ToastProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
```

## Step 5: Migrate Field State (5 hours)

### 5.1 Replace Field useState Hooks
```typescript
// Before (in HomePage or GameView):
const [playersOnField, setPlayersOnField] = useState<Player[]>([]);
const [opponents, setOpponents] = useState<Player[]>([]);
const [drawings, setDrawings] = useState<Drawing[]>([]);

// After:
import { usePlayersOnField, useOpponents, useDrawings, useFieldActions } from '@/stores/selectors';

function GameView() {
  const playersOnField = usePlayersOnField();
  const opponents = useOpponents();
  const drawings = useDrawings();
  const { addPlayerToField, removePlayerFromField, movePlayerOnField } = useFieldActions();
  
  // Remove all setState calls, use actions instead
}
```

### 5.2 Update SoccerField Component
```typescript
// src/components/SoccerField.tsx
import { usePlayersOnField, useDrawings, useFieldActions } from '@/stores/selectors';

interface SoccerFieldProps {
  // Remove state props that now come from store
  // onPlayerMove, onPlayerAdd, etc. now use store actions directly
}

export default function SoccerField(props: SoccerFieldProps) {
  const playersOnField = usePlayersOnField();
  const drawings = useDrawings();
  const { movePlayerOnField, addPlayerToField, addDrawing } = useFieldActions();
  
  const handlePlayerDrop = (player: Player, position: { x: number; y: number }) => {
    addPlayerToField(player, position);
  };
  
  const handlePlayerMove = (playerId: string, position: { x: number; y: number }) => {
    movePlayerOnField(playerId, position);
  };
  
  // Rest of component logic...
}
```

### 5.3 Update Player Management
```typescript
// src/components/PlayerBar.tsx
import { usePlayersOnField, useFieldActions } from '@/stores/selectors';

export default function PlayerBar() {
  const playersOnField = usePlayersOnField();
  const { addPlayerToField, removePlayerFromField } = useFieldActions();
  
  // Remove prop drilling, use store directly
}
```

## Step 6: Migrate UI State (3 hours)

### 6.1 Replace Loading and Selection State
```typescript
// Before (scattered useState calls):
const [isLoading, setIsLoading] = useState(false);
const [selectedPlayerId, setSelectedPlayerId] = useState<string>();

// After:
import { useIsLoading, useSelectedPlayer, useUIActions } from '@/stores/selectors';

function Component() {
  const isLoading = useIsLoading();
  const selectedPlayerId = useSelectedPlayer();
  const { setLoading, selectPlayer } = useUIActions();
  
  // Use store state and actions
}
```

### 6.2 Create Loading Component
```typescript
// src/components/LoadingOverlay.tsx
import { useIsLoading } from '@/stores/selectors';

export function LoadingOverlay() {
  const isLoading = useIsLoading();
  
  if (!isLoading) return null;
  
  return (
    <div className="loading-overlay">
      <div className="spinner">Loading...</div>
    </div>
  );
}
```

## Step 7: Testing and Validation (4 hours)

### 7.1 Update Existing Tests
```typescript
// Before: Mock useState and useReducer
// After: Mock Zustand store

// src/__tests__/test-utils.tsx
import { useAppStore } from '@/stores/appStore';

// Create test store helper
export const createTestStore = (initialState?: Partial<AppStore>) => {
  return useAppStore.getState();
};

// Mock store for testing
export const mockStore = {
  gameSession: {
    gameStatus: 'notStarted',
    // ... initial test state
  },
  field: {
    playersOnField: [],
    // ... initial test state
  },
  actions: {
    startGame: jest.fn(),
    pauseGame: jest.fn(),
    // ... mock actions
  },
};

beforeEach(() => {
  useAppStore.setState(mockStore, true); // Replace entire store
});
```

### 7.2 Test Store Actions
```typescript
// src/stores/__tests__/appStore.test.ts
import { useAppStore } from '../appStore';

describe('App Store', () => {
  beforeEach(() => {
    useAppStore.getState().actions.resetGameSession();
  });

  it('should start game correctly', () => {
    const { actions, gameSession } = useAppStore.getState();
    
    actions.startGame({
      teamName: 'Test Team',
      opponentName: 'Test Opponent',
      gameDate: '2024-03-15',
    });
    
    const updatedSession = useAppStore.getState().gameSession;
    expect(updatedSession.gameStatus).toBe('inProgress');
    expect(updatedSession.teamName).toBe('Test Team');
    expect(updatedSession.isTimerRunning).toBe(true);
  });

  it('should manage player field state', () => {
    const { actions } = useAppStore.getState();
    const testPlayer = { id: '1', name: 'Test Player' };
    
    actions.addPlayerToField(testPlayer, { x: 0.5, y: 0.5 });
    
    const { field } = useAppStore.getState();
    expect(field.playersOnField).toHaveLength(1);
    expect(field.playersOnField[0].relX).toBe(0.5);
    expect(field.playersOnField[0].relY).toBe(0.5);
  });

  it('should manage modal state', () => {
    const { actions, modals } = useAppStore.getState();
    
    expect(modals.gameSettings).toBe(false);
    
    actions.openModal('gameSettings');
    expect(useAppStore.getState().modals.gameSettings).toBe(true);
    
    actions.closeModal('gameSettings');
    expect(useAppStore.getState().modals.gameSettings).toBe(false);
  });
});
```

### 7.3 Integration Testing
```typescript
// src/__tests__/integration/StateManagement.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import HomePage from '@/components/HomePage';

describe('State Management Integration', () => {
  it('should handle complete game flow with Zustand', async () => {
    render(<HomePage />);
    
    // Start game
    fireEvent.click(screen.getByText('New Game'));
    
    const teamInput = screen.getByLabelText('Team Name');
    fireEvent.change(teamInput, { target: { value: 'Test Team' } });
    
    fireEvent.click(screen.getByText('Start Game'));
    
    // Verify state updates
    expect(screen.getByText('Test Team vs')).toBeInTheDocument();
    expect(screen.getByText('Period 1')).toBeInTheDocument();
    
    // Test player addition
    const player = screen.getByText('Test Player');
    const field = screen.getByTestId('soccer-field');
    
    fireEvent.dragStart(player);
    fireEvent.drop(field);
    
    // Verify store state
    const store = useAppStore.getState();
    expect(store.field.playersOnField).toHaveLength(1);
  });
});
```

## Step 8: Performance Optimization (2 hours)

### 8.1 Add Selective Subscriptions
```typescript
// Avoid unnecessary re-renders with specific selectors
// Instead of:
const store = useAppStore(); // Subscribes to entire store

// Use:
const gameStatus = useAppStore(state => state.gameSession.gameStatus); // Only re-renders when gameStatus changes
```

### 8.2 Implement React.memo for Store Consumers
```typescript
// src/components/GameTimer.tsx
import React from 'react';
import { useGameTimer } from '@/stores/selectors';

const GameTimer = React.memo(() => {
  const { timeRemaining, isTimerRunning } = useGameTimer();
  
  return (
    <div className="game-timer">
      {formatTime(timeRemaining)}
      {isTimerRunning && <span className="running-indicator">●</span>}
    </div>
  );
});

GameTimer.displayName = 'GameTimer';
export default GameTimer;
```

### 8.3 Store Subscription Optimization
```typescript
// src/stores/appStore.ts
// Add computed selectors for expensive operations
export const useExpensiveComputation = () => useAppStore(
  state => {
    // Only recompute when dependencies change
    const { gameEvents, playersOnField } = state.gameSession;
    return useMemo(() => {
      return computeExpensiveStats(gameEvents, playersOnField);
    }, [gameEvents, playersOnField]);
  }
);
```

## Step 9: Cleanup and Documentation (2 hours)

### 9.1 Remove Old State Management
- [ ] Remove ModalProvider and related files
- [ ] Remove useState/useReducer from components
- [ ] Remove prop drilling patterns
- [ ] Clean up unused imports
- [ ] Update TypeScript interfaces

### 9.2 Update Documentation
```typescript
// Add JSDoc to store
/**
 * Main application store using Zustand
 * 
 * Manages:
 * - Game session state (timer, score, events)
 * - Field state (players, drawings)
 * - UI state (loading, selections)
 * - Modal state (visibility)
 * 
 * Features:
 * - Persistence of game state
 * - DevTools integration
 * - Immer for immutable updates
 * - Selective subscriptions
 * 
 * @example
 * ```tsx
 * const gameStatus = useGameStatus();
 * const { startGame } = useGameActions();
 * ```
 */
export const useAppStore = create<AppStore>()(...);
```

## Migration Validation Checklist

### Functionality Preservation
- [ ] All game functions work identically
- [ ] Modal opening/closing works
- [ ] Player field management works
- [ ] Timer and scoring work
- [ ] Data persistence works
- [ ] Settings are preserved

### Performance Validation
- [ ] No performance regression
- [ ] Reduced unnecessary re-renders
- [ ] Bundle size not significantly increased
- [ ] Memory usage stable

### Code Quality
- [ ] Eliminated prop drilling
- [ ] Reduced component complexity
- [ ] Improved testability
- [ ] Better TypeScript typing
- [ ] Consistent state management patterns

### Testing
- [ ] All existing tests updated and passing
- [ ] New store tests added
- [ ] Integration tests verify state flow
- [ ] Mock setup simplified

## Benefits Achieved

### Developer Experience
- **Simplified State**: Single source of truth for client state
- **Better DevTools**: Zustand DevTools for state debugging
- **Type Safety**: Full TypeScript support
- **Less Boilerplate**: No action creators or reducers needed

### Performance
- **Selective Subscriptions**: Components only re-render when needed
- **No Context Re-renders**: Zustand doesn't suffer from context re-render issues
- **Smaller Bundle**: Less state management code

### Maintainability
- **Clear Boundaries**: Server state (React Query) vs Client state (Zustand)
- **Easier Testing**: Direct store access in tests
- **Predictable Updates**: Immer ensures immutable updates

## Common Migration Issues

### Issue 1: Stale Closures
```typescript
// Problem: Action references stale state
const handleClick = () => {
  const currentState = useAppStore.getState();
  // ... logic using currentState
};

// Solution: Use store subscription or selector
const handleClick = () => {
  const { gameStatus } = useAppStore.getState();
  // Always gets fresh state
};
```

### Issue 2: Async Action Handling
```typescript
// Problem: Actions with async operations
const asyncAction = async () => {
  setLoading(true);
  try {
    const result = await api.call();
    updateData(result);
  } finally {
    setLoading(false);
  }
};

// Solution: Create async action in store
actions: {
  performAsyncOperation: async () => {
    const { setLoading, updateData } = get().actions;
    setLoading(true);
    try {
      const result = await api.call();
      updateData(result);
    } finally {
      setLoading(false);
    }
  }
}
```

### Issue 3: Component Re-render Optimization
```typescript
// Problem: Component re-renders too often
const Component = () => {
  const store = useAppStore(); // Subscribes to entire store
  return <div>{store.gameSession.teamName}</div>;
};

// Solution: Use specific selector
const Component = () => {
  const teamName = useAppStore(state => state.gameSession.teamName);
  return <div>{teamName}</div>;
};
```

This migration guide provides a comprehensive approach to modernizing the state management architecture, resulting in more maintainable, performant, and testable code.