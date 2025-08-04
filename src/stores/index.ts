/**
 * Store Index - Centralized exports for all Zustand stores
 * 
 * This file provides a single entry point for all store imports,
 * making it easier to manage and maintain the store architecture.
 */

// Core stores
export { 
  useGameStore,
  useGameSession,
  useFieldState,
  useGameTimer,
  useGameScore,
  usePlayersOnField,
  type GameStore,
  type GameSessionState,
  type FieldState
} from './gameStore';

export { 
  useUIStore,
  useModalState,
  useViewState,
  useNotifications,
  useModal,
  useTacticsBoard,
  useDrawingMode,
  usePlayerSelection,
  useGameView,
  useDrawingTools,
  useSelectionState,
  useNotificationActions,
  type UIStore,
  type ModalState,
  type ViewState,
  type NotificationState
} from './uiStore';

export { 
  usePersistenceStore,
  useSavedGames,
  useMasterRoster,
  useAppSettings,
  useUserData,
  useDataIntegrity,
  useLoadingStates,
  type PersistenceStore,
  type AppSettings,
  type UserData,
  type DataIntegrity
} from './persistenceStore';

// Store utilities and helpers
export const resetAllStores = () => {
  // Reset all stores to their default state
  const gameStore = require('./gameStore').useGameStore;
  const uiStore = require('./uiStore').useUIStore;
  
  gameStore.getState().resetGameSession();
  gameStore.getState().resetField();
  // Note: UIStore resetAll method needs to be implemented
  // uiStore.getState().resetAll();
  // Note: PersistenceStore intentionally not reset to preserve user data
};

export const getStoreStates = () => {
  // Get current state from all stores (useful for debugging/export)
  const gameStore = require('./gameStore').useGameStore;
  const uiStore = require('./uiStore').useUIStore;
  const persistenceStore = require('./persistenceStore').usePersistenceStore;
  
  return {
    game: gameStore.getState(),
    ui: uiStore.getState(),
    persistence: persistenceStore.getState(),
  };
};

// Type exports for store state
export type AllStoreStates = ReturnType<typeof getStoreStates>;