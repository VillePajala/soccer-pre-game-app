# High Priority Improvements (Month 1)

## Overview

These improvements address significant architectural and performance issues that impact developer productivity and application stability. Implementation should begin after completing the critical issues.

**Timeline**: 4 weeks (Month 1)  
**Priority**: 🔥 HIGH  
**Estimated Effort**: 80-120 hours

## Improvement 1: Unified State Management

### Problem Assessment
- **Current State**: Mixed patterns (useState, useReducer, React Query, localStorage)
- **Impact**: Developer confusion, unpredictable data flow, difficult debugging
- **Complexity**: Multiple sources of truth causing synchronization issues

### Detailed Implementation Plan

#### Step 1.1: Analyze Current State Patterns (4 hours)
1. **Audit state management usage**:
   ```bash
   # Count different state management patterns
   grep -r "useState" src/ --include="*.tsx" --include="*.ts" | wc -l
   grep -r "useReducer" src/ --include="*.tsx" --include="*.ts" | wc -l
   grep -r "useQuery" src/ --include="*.tsx" --include="*.ts" | wc -l
   grep -r "localStorage" src/ --include="*.tsx" --include="*.ts" | wc -l
   ```

2. **Map state domains**:
   ```typescript
   // Create state audit document
   interface StateAudit {
     gameSession: 'useReducer';    // Game timer, score, periods
     modals: 'useState[]';         // 10+ modal states
     serverData: 'React Query';    // Players, seasons, tournaments
     settings: 'localStorage';     // App preferences
     fieldState: 'useState';       // Player positions, drawings
   }
   ```

#### Step 1.2: Choose State Management Strategy (2 hours)
**Recommended**: Zustand for client state + React Query for server state

**Decision Matrix**:
| Solution | Pros | Cons | Fit Score |
|----------|------|------|-----------|
| Zustand | Lightweight, TypeScript-friendly, minimal boilerplate | Less ecosystem | 9/10 |
| Redux Toolkit | Mature, DevTools, Large ecosystem | More boilerplate, steeper learning curve | 7/10 |
| Jotai | Atomic approach, granular updates | Different mental model | 6/10 |

#### Step 1.3: Install and Configure Zustand (2 hours)
1. **Install dependencies**:
   ```bash
   npm install zustand
   npm install @types/zustand --save-dev
   ```

2. **Create store structure**:
   ```typescript
   // src/stores/gameStore.ts
   import { create } from 'zustand';
   import { devtools } from 'zustand/middleware';
   import type { GameSessionState } from '@/hooks/useGameSessionReducer';
   import type { Player } from '@/types';

   interface GameState {
     // Game session
     session: GameSessionState;
     
     // Field state
     playersOnField: Player[];
     opponents: Player[];
     drawings: any[];
     
     // UI state
     modals: {
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
     };
   }

   interface GameActions {
     // Session actions
     updateSession: (update: Partial<GameSessionState>) => void;
     resetSession: () => void;
     
     // Field actions
     updatePlayersOnField: (players: Player[]) => void;
     addPlayerToField: (player: Player) => void;
     removePlayerFromField: (playerId: string) => void;
     
     // Modal actions
     openModal: (modal: keyof GameState['modals']) => void;
     closeModal: (modal: keyof GameState['modals']) => void;
     closeAllModals: () => void;
   }

   type GameStore = GameState & GameActions;

   export const useGameStore = create<GameStore>()(
     devtools(
       (set, get) => ({
         // Initial state
         session: initialGameSessionState,
         playersOnField: [],
         opponents: [],
         drawings: [],
         modals: {
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
         },

         // Actions
         updateSession: (update) =>
           set((state) => ({
             session: { ...state.session, ...update }
           }), false, 'updateSession'),

         resetSession: () =>
           set({ session: initialGameSessionState }, false, 'resetSession'),

         updatePlayersOnField: (players) =>
           set({ playersOnField: players }, false, 'updatePlayersOnField'),

         addPlayerToField: (player) =>
           set((state) => ({
             playersOnField: [...state.playersOnField, player]
           }), false, 'addPlayerToField'),

         removePlayerFromField: (playerId) =>
           set((state) => ({
             playersOnField: state.playersOnField.filter(p => p.id !== playerId)
           }), false, 'removePlayerFromField'),

         openModal: (modal) =>
           set((state) => ({
             modals: { ...state.modals, [modal]: true }
           }), false, `openModal:${modal}`),

         closeModal: (modal) =>
           set((state) => ({
             modals: { ...state.modals, [modal]: false }
           }), false, `closeModal:${modal}`),

         closeAllModals: () =>
           set((state) => ({
             modals: Object.keys(state.modals).reduce((acc, key) => {
               acc[key as keyof typeof acc] = false;
               return acc;
             }, {} as GameState['modals'])
           }), false, 'closeAllModals'),
       }),
       { name: 'game-store' }
     )
   );
   ```

#### Step 1.4: Create Store Selectors (3 hours)
1. **Create selector utilities**:
   ```typescript
   // src/stores/selectors.ts
   import { useGameStore } from './gameStore';
   import { useMemo } from 'react';

   // Game session selectors
   export const useGameSession = () => useGameStore(state => state.session);
   export const useGameStatus = () => useGameStore(state => state.session.gameStatus);
   export const useGameTimer = () => useGameStore(state => ({
     timeRemaining: state.session.timeRemaining,
     isTimerRunning: state.session.isTimerRunning,
     currentPeriod: state.session.currentPeriod,
   }));

   // Field selectors
   export const useFieldPlayers = () => useGameStore(state => state.playersOnField);
   export const useOpponents = () => useGameStore(state => state.opponents);

   // Modal selectors
   export const useModalState = (modal: keyof GameState['modals']) =>
     useGameStore(state => state.modals[modal]);

   export const useAnyModalOpen = () =>
     useGameStore(state => Object.values(state.modals).some(isOpen => isOpen));

   // Computed selectors
   export const useGameStats = () => {
     return useGameStore(state => {
       const { gameEvents } = state.session;
       return useMemo(() => {
         const goals = gameEvents.filter(e => e.type === 'goal').length;
         const assists = gameEvents.filter(e => e.type === 'goal' && e.assisterId).length;
         return { goals, assists };
       }, [gameEvents]);
     });
   };
   ```

#### Step 1.5: Migrate Modal Management (8 hours)
1. **Replace ModalProvider with Zustand**:
   ```typescript
   // Before: src/contexts/ModalProvider.tsx (100+ lines)
   // After: Integrated into game store (much simpler)

   // Update components to use store selectors
   // src/components/GameSettingsModal.tsx
   import { useModalState, useGameStore } from '@/stores';

   export default function GameSettingsModal() {
     const isOpen = useModalState('gameSettings');
     const closeModal = useGameStore(state => state.closeModal);

     if (!isOpen) return null;

     return (
       <Modal onClose={() => closeModal('gameSettings')}>
         {/* modal content */}
       </Modal>
     );
   }
   ```

2. **Update all modal components**:
   - [ ] GameSettingsModal
   - [ ] GameStatsModal  
   - [ ] LoadGameModal
   - [ ] NewGameSetupModal
   - [ ] RosterSettingsModal
   - [ ] SettingsModal
   - [ ] SeasonTournamentManagementModal
   - [ ] InstructionsModal
   - [ ] PlayerAssessmentModal
   - [ ] GoalLogModal

#### Step 1.6: Migrate Game Session State (10 hours)
1. **Replace useReducer with Zustand actions**:
   ```typescript
   // Before: Multiple useState and useReducer calls
   const [gameSessionState, gameSessionDispatch] = useReducer(/* ... */);

   // After: Clean store usage
   const session = useGameSession();
   const updateSession = useGameStore(state => state.updateSession);

   // Action examples
   const startGame = () => {
     updateSession({
       gameStatus: 'inProgress',
       isTimerRunning: true,
       startTime: new Date().toISOString(),
     });
   };

   const pauseGame = () => {
     updateSession({
       isTimerRunning: false,
     });
   };
   ```

2. **Create action creators for complex operations**:
   ```typescript
   // src/stores/gameActions.ts
   import { useGameStore } from './gameStore';

   export const useGameActions = () => {
     const store = useGameStore();

     return {
       startNewGame: (config: GameConfig) => {
         store.resetSession();
         store.updateSession({
           gameStatus: 'inProgress',
           teamName: config.teamName,
           opponentName: config.opponentName,
           gameDate: config.gameDate,
           gameLocation: config.gameLocation,
         });
         store.closeAllModals();
       },

       endGame: () => {
         store.updateSession({
           gameStatus: 'gameEnd',
           isTimerRunning: false,
           endTime: new Date().toISOString(),
         });
       },

       addGoal: (playerId: string, assisterId?: string) => {
         const currentEvents = store.session.gameEvents;
         const newEvent = {
           id: generateId(),
           type: 'goal' as const,
           playerId,
           assisterId,
           timestamp: new Date().toISOString(),
           period: store.session.currentPeriod,
         };
         
         store.updateSession({
           gameEvents: [...currentEvents, newEvent],
         });
       },
     };
   };
   ```

### Success Criteria
- [ ] Single source of truth for client state
- [ ] Modal management simplified (10+ useState → single store)
- [ ] Game session state centralized
- [ ] DevTools integration working
- [ ] All components using store selectors
- [ ] No useState for global state

---

## Improvement 2: Performance Optimization

### Problem Assessment
- **Bundle Size**: Large initial bundle due to poor code splitting
- **Runtime Performance**: Excessive re-renders, memory leaks
- **Data Fetching**: Over-fetching and inefficient queries

### Detailed Implementation Plan

#### Step 2.1: Bundle Analysis (2 hours)
1. **Analyze current bundle**:
   ```bash
   # Install bundle analyzer
   npm install --save-dev @next/bundle-analyzer

   # Add to next.config.ts
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   });

   # Analyze bundle
   ANALYZE=true npm run build
   ```

2. **Identify optimization opportunities**:
   ```bash
   # Look for large dependencies
   npm ls --depth=0 --long
   
   # Check for duplicate dependencies
   npm ls --depth=0 | grep -E "\b\w+@.*\b.*\b\w+@"
   ```

#### Step 2.2: Implement Code Splitting (6 hours)
1. **Split routes with dynamic imports**:
   ```typescript
   // src/app/import-backup/page.tsx
   'use client';
   import dynamic from 'next/dynamic';

   const BackupImport = dynamic(() => import('@/components/BackupImport'), {
     loading: () => <div>Loading...</div>,
     ssr: false, // Disable SSR for heavy components
   });

   export default function ImportBackupPage() {
     return <BackupImport />;
   }
   ```

2. **Split heavy utilities**:
   ```typescript
   // Before: Import large utilities directly
   import { exportAggregateJson, exportAggregateCsv } from '@/utils/exportGames';

   // After: Dynamic import when needed
   const handleExportJson = async () => {
     const { exportAggregateJson } = await import('@/utils/exportGames');
     return exportAggregateJson(games);
   };
   ```

3. **Split component features**:
   ```typescript
   // src/components/GameStatsModal/index.tsx
   import dynamic from 'next/dynamic';

   const PlayerStats = dynamic(() => import('./PlayerStats'), {
     loading: () => <Skeleton className="h-32" />,
   });

   const SeasonStats = dynamic(() => import('./SeasonStats'), {
     loading: () => <Skeleton className="h-32" />,
   });
   ```

#### Step 2.3: Optimize Re-renders (8 hours)
1. **Add React.memo to pure components**:
   ```typescript
   // src/components/PlayerDisk.tsx
   import React from 'react';

   interface PlayerDiskProps {
     player: Player;
     onDrag: (player: Player) => void;
   }

   const PlayerDisk = React.memo<PlayerDiskProps>(({ player, onDrag }) => {
     return (
       <div className="player-disk">
         {player.name}
       </div>
     );
   });

   PlayerDisk.displayName = 'PlayerDisk';
   export default PlayerDisk;
   ```

2. **Optimize callback functions**:
   ```typescript
   // Before: New function on every render
   <PlayerDisk 
     onDrag={(player) => handlePlayerDrag(player)}
   />

   // After: Stable callback reference
   const handlePlayerDragCallback = useCallback((player: Player) => {
     handlePlayerDrag(player);
   }, [handlePlayerDrag]);

   <PlayerDisk 
     onDrag={handlePlayerDragCallback}
   />
   ```

3. **Use useMemo for expensive calculations**:
   ```typescript
   // Before: Recalculated on every render
   const playerStats = calculatePlayerStats(gameEvents);

   // After: Memoized calculation
   const playerStats = useMemo(() => {
     return calculatePlayerStats(gameEvents);
   }, [gameEvents]);
   ```

#### Step 2.4: Optimize Data Fetching (6 hours)
1. **Increase stale times for static data**:
   ```typescript
   // src/hooks/useGameDataQueries.ts
   const masterRoster = useQuery<Player[], Error>({
     queryKey: queryKeys.masterRoster,
     queryFn: getMasterRoster,
     staleTime: 10 * 60 * 1000, // 10 minutes instead of 2
     cacheTime: 30 * 60 * 1000, // 30 minutes
   });

   const seasons = useQuery<Season[], Error>({
     queryKey: queryKeys.seasons,
     queryFn: getSeasons,
     staleTime: 15 * 60 * 1000, // 15 minutes
     cacheTime: 60 * 60 * 1000, // 1 hour
   });
   ```

2. **Implement query prefetching**:
   ```typescript
   // src/hooks/useGameDataQueries.ts
   import { useQueryClient } from '@tanstack/react-query';

   export const usePrefetchGameData = () => {
     const queryClient = useQueryClient();

     const prefetchMasterRoster = useCallback(() => {
       queryClient.prefetchQuery({
         queryKey: queryKeys.masterRoster,
         queryFn: getMasterRoster,
         staleTime: 10 * 60 * 1000,
       });
     }, [queryClient]);

     return { prefetchMasterRoster };
   };

   // Use in HomePage after initial load
   useEffect(() => {
     if (initialLoadComplete) {
       prefetchMasterRoster();
     }
   }, [initialLoadComplete, prefetchMasterRoster]);
   ```

3. **Add background refetch optimization**:
   ```typescript
   const savedGames = useQuery<SavedGamesCollection, Error>({
     queryKey: queryKeys.savedGames,
     queryFn: getSavedGames,
     refetchOnWindowFocus: false, // Prevent excessive refetching
     refetchOnMount: false,       // Only fetch when data is stale
     staleTime: 5 * 60 * 1000,   // 5 minutes
   });
   ```

### Success Criteria
- [ ] Bundle size reduced by 30%
- [ ] Initial page load improved by 500ms+
- [ ] React DevTools showing fewer re-renders
- [ ] Lighthouse performance score > 90
- [ ] No memory leaks in Chrome DevTools

---

## Improvement 3: Testing Enhancement

### Problem Assessment
- **Coverage**: 35-39% is inadequate for production
- **Quality**: Missing integration tests for critical user flows
- **Maintenance**: Tests don't prevent regressions

### Detailed Implementation Plan

#### Step 3.1: Increase Unit Test Coverage (10 hours)
1. **Identify critical paths**:
   ```bash
   # Generate coverage report
   npm test -- --coverage --coverageReporters=html
   open coverage/lcov-report/index.html
   ```

2. **Focus on high-impact, low-coverage files**:
   ```typescript
   // Priority order for testing:
   // 1. Storage operations (critical for data integrity)
   // 2. Game session logic (core functionality)  
   // 3. Component interactions (user experience)
   // 4. Utility functions (used everywhere)
   ```

3. **Add tests for storage operations**:
   ```typescript
   // src/lib/storage/__tests__/storageManager.integration.test.ts
   import { StorageManager } from '../storageManager';
   import type { Player, Season } from '@/types';

   describe('StorageManager Integration', () => {
     let storageManager: StorageManager;

     beforeEach(() => {
       storageManager = new StorageManager({
         provider: 'localStorage',
         fallbackToLocalStorage: true,
       });
     });

     afterEach(() => {
       // Clean up test data
       localStorage.clear();
     });

     describe('Master Roster Operations', () => {
       it('should save and retrieve master roster', async () => {
         const testRoster: Player[] = [
           { id: '1', name: 'Test Player 1' },
           { id: '2', name: 'Test Player 2' },
         ];

         await storageManager.saveMasterRoster(testRoster);
         const retrieved = await storageManager.getMasterRoster();

         expect(retrieved).toEqual(testRoster);
       });

       it('should handle empty roster gracefully', async () => {
         const retrieved = await storageManager.getMasterRoster();
         expect(Array.isArray(retrieved)).toBe(true);
         expect(retrieved).toHaveLength(0);
       });

       it('should validate roster data structure', async () => {
         // Test invalid data handling
         localStorage.setItem('masterRoster', 'invalid-json');
         
         await expect(storageManager.getMasterRoster()).rejects.toThrow();
       });
     });
   });
   ```

4. **Add tests for game session logic**:
   ```typescript
   // src/hooks/__tests__/useGameSessionReducer.integration.test.ts
   import { renderHook, act } from '@testing-library/react';
   import { gameSessionReducer, initialGameSessionState } from '../useGameSessionReducer';

   describe('Game Session Reducer Integration', () => {
     it('should handle complete game flow', () => {
       let state = initialGameSessionState;

       // Start game
       act(() => {
         state = gameSessionReducer(state, {
           type: 'START_GAME',
           payload: { teamName: 'Test Team', opponentName: 'Opponent' }
         });
       });

       expect(state.gameStatus).toBe('inProgress');
       expect(state.isTimerRunning).toBe(true);
       expect(state.teamName).toBe('Test Team');

       // Add goal
       act(() => {
         state = gameSessionReducer(state, {
           type: 'ADD_GOAL',
           payload: { playerId: 'player1', timestamp: new Date().toISOString() }
         });
       });

       expect(state.gameEvents).toHaveLength(1);
       expect(state.gameEvents[0].type).toBe('goal');

       // End game
       act(() => {
         state = gameSessionReducer(state, {
           type: 'END_GAME',
           payload: { endTime: new Date().toISOString() }
         });
       });

       expect(state.gameStatus).toBe('gameEnd');
       expect(state.isTimerRunning).toBe(false);
     });
   });
   ```

#### Step 3.2: Add Integration Tests (12 hours)
1. **Test critical user flows**:
   ```typescript
   // src/components/__tests__/GameFlow.integration.test.tsx
   import { render, screen, fireEvent, waitFor } from '@testing-library/react';
   import { QueryClient, QueryProvider } from '@tanstack/react-query';
   import HomePage from '../HomePage';

   const createTestQueryClient = () => new QueryClient({
     defaultOptions: {
       queries: { retry: false },
       mutations: { retry: false },
     },
   });

   const renderWithProviders = (component: React.ReactElement) => {
     const queryClient = createTestQueryClient();
     return render(
       <QueryProvider client={queryClient}>
         {component}
       </QueryProvider>
     );
   };

   describe('Game Flow Integration', () => {
     it('should complete new game creation flow', async () => {
       renderWithProviders(<HomePage />);

       // Start new game
       const newGameButton = await screen.findByText('New Game');
       fireEvent.click(newGameButton);

       // Fill game details
       const teamNameInput = await screen.findByLabelText('Team Name');
       fireEvent.change(teamNameInput, { target: { value: 'Test Team' } });

       const opponentInput = await screen.findByLabelText('Opponent');
       fireEvent.change(opponentInput, { target: { value: 'Test Opponent' } });

       // Start game
       const startButton = await screen.findByText('Start Game');
       fireEvent.click(startButton);

       // Verify game started
       await waitFor(() => {
         expect(screen.getByText('Test Team vs Test Opponent')).toBeInTheDocument();
         expect(screen.getByText('Period 1')).toBeInTheDocument();
       });
     });

     it('should handle player management flow', async () => {
       renderWithProviders(<HomePage />);

       // Add player to field
       const playerInBar = await screen.findByTestId('available-player-1');
       const soccerField = await screen.findByTestId('soccer-field');

       // Simulate drag and drop
       fireEvent.dragStart(playerInBar);
       fireEvent.dragOver(soccerField);
       fireEvent.drop(soccerField);

       // Verify player added to field
       await waitFor(() => {
         expect(screen.getByTestId('field-player-1')).toBeInTheDocument();
       });
     });
   });
   ```

2. **Test modal interactions**:
   ```typescript
   // src/components/__tests__/ModalInteractions.integration.test.tsx
   describe('Modal Interactions', () => {
     it('should open and close game settings modal', async () => {
       renderWithProviders(<HomePage />);

       // Open modal
       const settingsButton = await screen.findByText('Game Settings');
       fireEvent.click(settingsButton);

       await waitFor(() => {
         expect(screen.getByRole('dialog')).toBeInTheDocument();
         expect(screen.getByText('Game Configuration')).toBeInTheDocument();
       });

       // Close modal
       const closeButton = screen.getByLabelText('Close');
       fireEvent.click(closeButton);

       await waitFor(() => {
         expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
       });
     });
   });
   ```

#### Step 3.3: Add Performance Tests (6 hours)
1. **Component render performance**:
   ```typescript
   // src/components/__tests__/Performance.test.tsx
   import { render } from '@testing-library/react';
   import { performance } from 'perf_hooks';
   import HomePage from '../HomePage';

   describe('Performance Tests', () => {
     it('should render HomePage within acceptable time', () => {
       const start = performance.now();
       
       render(<HomePage />);
       
       const end = performance.now();
       const renderTime = end - start;

       // Should render within 100ms
       expect(renderTime).toBeLessThan(100);
     });

     it('should not have memory leaks in component mounting/unmounting', () => {
       const { unmount } = render(<HomePage />);
       
       // Force garbage collection if available
       if (global.gc) {
         global.gc();
       }

       const initialMemory = process.memoryUsage().heapUsed;

       // Mount and unmount multiple times
       for (let i = 0; i < 10; i++) {
         const { unmount: unmountInstance } = render(<HomePage />);
         unmountInstance();
       }

       if (global.gc) {
         global.gc();
       }

       const finalMemory = process.memoryUsage().heapUsed;
       const memoryIncrease = finalMemory - initialMemory;

       // Memory increase should be less than 1MB
       expect(memoryIncrease).toBeLessThan(1024 * 1024);
     });
   });
   ```

#### Step 3.4: Update Jest Configuration (2 hours)
1. **Increase coverage thresholds**:
   ```javascript
   // jest.config.js - Update coverage thresholds
   coverageThreshold: {
     global: {
       branches: 60,    // Increased from 35
       functions: 65,   // Increased from 39
       lines: 65,       // Increased from 39
       statements: 65,  // Increased from 39
     },
     // Specific thresholds for critical files
     './src/lib/storage/**/*.ts': {
       branches: 80,
       functions: 80,
       lines: 80,
       statements: 80,
     },
     './src/hooks/**/*.ts': {
       branches: 70,
       functions: 70,
       lines: 70,
       statements: 70,
     },
   },
   ```

2. **Add test utilities**:
   ```typescript
   // src/__tests__/test-utils.tsx
   import React from 'react';
   import { render } from '@testing-library/react';
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

   const createTestQueryClient = () => new QueryClient({
     defaultOptions: {
       queries: {
         retry: false,
         cacheTime: 0,
       },
       mutations: {
         retry: false,
       },
     },
   });

   export const renderWithProviders = (
     ui: React.ReactElement,
     options = {}
   ) => {
     const queryClient = createTestQueryClient();

     const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
       <QueryClientProvider client={queryClient}>
         {children}
       </QueryClientProvider>
     );

     return render(ui, { wrapper: Wrapper, ...options });
   };

   export * from '@testing-library/react';
   export { renderWithProviders as render };
   ```

### Success Criteria
- [ ] Test coverage increased to 65%
- [ ] Integration tests for 5+ critical user flows
- [ ] Performance tests preventing regressions
- [ ] All new code has corresponding tests
- [ ] CI pipeline fails on test failures

---

## Improvement 4: Error Handling Standardization

### Problem Assessment  
- **Inconsistency**: Mix of alert(), console.error, and proper error handling
- **User Experience**: Poor error messaging and recovery
- **Production Issues**: Errors not properly logged or monitored

### Detailed Implementation Plan

#### Step 4.1: Create Error Handling Standards (4 hours)
1. **Document error handling patterns**:
   ```typescript
   // src/utils/errorHandling.ts
   import logger from './logger';
   import { sanitizeErrorForUI } from './errorSanitization';

   export enum ErrorSeverity {
     LOW = 'low',
     MEDIUM = 'medium',
     HIGH = 'high',
     CRITICAL = 'critical',
   }

   export interface AppError {
     message: string;
     severity: ErrorSeverity;
     code?: string;
     context?: Record<string, unknown>;
     recoverable?: boolean;
   }

   export class AppErrorHandler {
     static handle(error: unknown, context?: Record<string, unknown>): AppError {
       const appError = this.normalizeError(error, context);
       
       // Log the error
       logger.error('Application error:', {
         message: appError.message,
         severity: appError.severity,
         code: appError.code,
         context: appError.context,
       });

       // Return sanitized error for UI
       return {
         ...appError,
         message: sanitizeErrorForUI(error),
       };
     }

     private static normalizeError(error: unknown, context?: Record<string, unknown>): AppError {
       if (error instanceof Error) {
         return {
           message: error.message,
           severity: this.determineSeverity(error),
           code: this.getErrorCode(error),
           context,
           recoverable: this.isRecoverable(error),
         };
       }

       return {
         message: 'An unexpected error occurred',
         severity: ErrorSeverity.MEDIUM,
         context,
         recoverable: true,
       };
     }

     private static determineSeverity(error: Error): ErrorSeverity {
       if (error.name === 'NetworkError') return ErrorSeverity.HIGH;
       if (error.name === 'ValidationError') return ErrorSeverity.LOW;
       if (error.message.includes('storage')) return ErrorSeverity.HIGH;
       return ErrorSeverity.MEDIUM;
     }

     private static getErrorCode(error: Error): string | undefined {
       // Extract error codes from known error types
       if ('code' in error) return error.code as string;
       return undefined;
     }

     private static isRecoverable(error: Error): boolean {
       // Determine if error allows for recovery
       return !['CRITICAL_STORAGE_ERROR', 'AUTH_FAILURE'].includes(error.name);
     }
   }
   ```

#### Step 4.2: Implement Toast Notification System (6 hours)
1. **Enhance existing ToastProvider**:
   ```typescript
   // src/contexts/ToastProvider.tsx (enhance existing)
   import React, { createContext, useContext, useState, useCallback } from 'react';
   import type { AppError, ErrorSeverity } from '@/utils/errorHandling';

   interface Toast {
     id: string;
     message: string;
     type: 'success' | 'error' | 'warning' | 'info';
     severity?: ErrorSeverity;
     action?: {
       label: string;
       onClick: () => void;
     };
     autoClose?: boolean;
     duration?: number;
   }

   interface ToastContextType {
     toasts: Toast[];
     showToast: (toast: Omit<Toast, 'id'>) => void;
     showError: (error: AppError) => void;
     removeToast: (id: string) => void;
     clearAllToasts: () => void;
   }

   export const useToast = () => {
     const context = useContext(ToastContext);
     if (!context) {
       throw new Error('useToast must be used within ToastProvider');
     }
     return context;
   };

   export function ToastProvider({ children }: { children: React.ReactNode }) {
     const [toasts, setToasts] = useState<Toast[]>([]);

     const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
       const id = `toast-${Date.now()}-${Math.random()}`;
       const newToast: Toast = {
         id,
         autoClose: true,
         duration: 5000,
         ...toast,
       };

       setToasts(current => [...current, newToast]);

       if (newToast.autoClose) {
         setTimeout(() => {
           removeToast(id);
         }, newToast.duration);
       }
     }, []);

     const showError = useCallback((error: AppError) => {
       showToast({
         message: error.message,
         type: 'error',
         severity: error.severity,
         autoClose: error.recoverable,
         duration: error.severity === ErrorSeverity.HIGH ? 10000 : 5000,
         action: error.recoverable ? {
           label: 'Retry',
           onClick: () => {
             // Retry logic would be passed in
           },
         } : undefined,
       });
     }, [showToast]);

     const removeToast = useCallback((id: string) => {
       setToasts(current => current.filter(toast => toast.id !== id));
     }, []);

     const clearAllToasts = useCallback(() => {
       setToasts([]);
     }, []);

     return (
       <ToastContext.Provider value={{
         toasts,
         showToast,
         showError,
         removeToast,
         clearAllToasts,
       }}>
         {children}
         <ToastContainer toasts={toasts} onRemove={removeToast} />
       </ToastContext.Provider>
     );
   }
   ```

#### Step 4.3: Replace Alert/Console Usage (8 hours)
1. **Create replacement utility**:
   ```typescript
   // src/utils/userNotifications.ts
   import { useToast } from '@/contexts/ToastProvider';
   import { AppErrorHandler } from './errorHandling';

   export const useUserNotifications = () => {
     const { showToast, showError } = useToast();

     return {
       success: (message: string) => {
         showToast({ message, type: 'success' });
       },

       info: (message: string) => {
         showToast({ message, type: 'info' });
       },

       warning: (message: string) => {
         showToast({ message, type: 'warning' });
       },

       error: (error: unknown, context?: Record<string, unknown>) => {
         const appError = AppErrorHandler.handle(error, context);
         showError(appError);
       },

       // For user confirmations (replaces alert/confirm)
       confirm: (message: string): Promise<boolean> => {
         return new Promise((resolve) => {
           showToast({
             message,
             type: 'warning',
             autoClose: false,
             action: {
               label: 'Confirm',
               onClick: () => resolve(true),
             },
           });
           
           // Add cancel logic (would need modal or enhanced toast)
           setTimeout(() => resolve(false), 10000);
         });
       },
     };
   };
   ```

2. **Replace usage throughout codebase**:
   ```bash
   # Find all alert/console.error usage
   grep -r "alert\(" src/ --include="*.ts" --include="*.tsx"
   grep -r "console\.error" src/ --include="*.ts" --include="*.tsx"
   ```

   ```typescript
   // Before:
   try {
     await updateSeason(seasonData);
     alert('Season updated successfully!');
   } catch (error) {
     console.error('Failed to update season:', error);
     alert(`Error: ${error.message}`);
   }

   // After:
   const notifications = useUserNotifications();

   try {
     await updateSeason(seasonData);
     notifications.success('Season updated successfully!');
   } catch (error) {
     notifications.error(error, { operation: 'updateSeason', seasonId: seasonData.id });
   }
   ```

### Success Criteria
- [ ] Zero alert() calls in production code
- [ ] All errors logged through error handler
- [ ] Toast notifications for all user feedback
- [ ] Error recovery patterns implemented
- [ ] Consistent error messaging across app

---

## Progress Tracking

### Week 1 Checklist
- [ ] State management strategy chosen and configured
- [ ] Zustand store created with basic structure  
- [ ] Modal management migrated to store
- [ ] Bundle analysis completed
- [ ] Initial code splitting implemented

### Week 2 Checklist
- [ ] Game session state migrated to Zustand
- [ ] Store selectors created and documented
- [ ] Performance optimizations (memoization) added
- [ ] Test coverage audit completed
- [ ] Critical path tests added

### Week 3 Checklist
- [ ] Integration tests for main user flows
- [ ] Error handling standards documented
- [ ] Toast notification system enhanced
- [ ] 50% of alert/console usage replaced

### Week 4 Checklist
- [ ] All state management unified
- [ ] Bundle size optimized (30% reduction)
- [ ] Test coverage at 60%+
- [ ] All error handling standardized
- [ ] Performance metrics improved

### Validation Commands
```bash
# Test coverage
npm test -- --coverage

# Bundle analysis  
ANALYZE=true npm run build

# Performance benchmarks
npm run lighthouse

# Error handling audit
grep -r "alert\|console\." src/ --include="*.ts" --include="*.tsx" || echo "Clean!"
```

---

**Next**: After completing this plan, proceed to [Quality Enhancements](QUALITY_ENHANCEMENTS.md)