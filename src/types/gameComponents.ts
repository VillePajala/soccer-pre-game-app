/**
 * TypeScript interfaces for HomePage component refactoring
 * 
 * This file defines the interfaces for communication between the extracted
 * components in the HomePage refactoring effort.
 */

import { Player, Season, Tournament, GameEvent, AppState } from './index';
import { GameSessionState } from '@/hooks/useGameSessionReducer';
import { SavedGamesCollection } from './index';

// ============================================================================
// Core Game State Management
// ============================================================================

export interface GameStateContextType {
  // Core game session state
  gameState: GameSessionState;
  dispatch: React.Dispatch<any>; // GameSessionAction from useGameSessionReducer
  
  // Players state
  availablePlayers: Player[];
  playersOnField: Player[];
  
  // Data loading states
  isLoading: boolean;
  error: string | null;
  
  // State update functions
  updateGameState: (update: Partial<GameSessionState>) => void;
  updatePlayers: (players: Player[]) => void;
  resetGame: () => void;
  
  // Game status
  isGameActive: boolean;
  timeElapsedInSeconds: number;
}

// ============================================================================
// Game View Component
// ============================================================================

export interface Position {
  x: number;
  y: number;
}

export interface DragInfo {
  id: string;
  name: string;
  position: Position;
}

export interface GameViewProps {
  // State from context
  gameState: GameSessionState;
  availablePlayers: Player[];
  playersOnField: Player[];
  
  // UI state
  showPlayerNames: boolean;
  draggingPlayerFromBarInfo?: DragInfo | null;
  
  // Event handlers
  onPlayerDragStartFromBar: (player: Player) => void;
  onPlayerDragFromField: (playerId: string, position: Position) => void;
  onPlayerTapInBar: (player: Player) => void;
  onPlayerTapOnField: (playerId: string) => void;
  onBarBackgroundClick: () => void;
  onFieldClick: (position: Position) => void;
  
  // Field interaction handlers
  onDeselectPlayer: () => void;
  onUpdatePlayerPosition: (playerId: string, position: Position) => void;
}

// ============================================================================
// Game Controls Component
// ============================================================================

export interface GameControlsProps {
  // State from context
  gameState: GameSessionState;
  timeElapsedInSeconds: number;
  isGameActive: boolean;
  
  // Timer state
  showLargeTimerOverlay: boolean;
  
  // Control handlers
  onStartGame: () => void;
  onPauseGame: () => void;
  onEndGame: () => void;
  onResetTimer: () => void;
  onToggleTimerOverlay: () => void;
  
  // Modal opening handlers
  onOpenGameSettings: () => void;
  onOpenGameStats: () => void;
  onOpenLoadGame: () => void;
  onOpenNewGame: () => void;
  onOpenRoster: () => void;
  onOpenSettings: () => void;
  
  // Quick actions
  onSaveGame: () => void;
  onUndoAction: () => void;
  onRedoAction: () => void;
}

// ============================================================================
// Modal Manager Component
// ============================================================================

export interface ModalStates {
  isGameStatsModalOpen: boolean;
  isGameSettingsModalOpen: boolean;
  isLoadGameModalOpen: boolean;
  isNewGameSetupModalOpen: boolean;
  isRosterModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isSeasonTournamentModalOpen: boolean;
  isInstructionsModalOpen: boolean;
  isPlayerAssessmentModalOpen: boolean;
  isTrainingResourcesModalOpen: boolean;
  isGoalLogModalOpen: boolean;
}

export interface ModalData {
  // Core game data
  gameState: GameSessionState;
  availablePlayers: Player[];
  savedGames: SavedGamesCollection;
  
  // Reference data
  seasons: Season[];
  tournaments: Tournament[];
  
  // Selected items
  selectedPlayerForStats: Player | null;
  playerIdsForNewGame: string[] | null;
  
  // Settings
  appLanguage: string;
  defaultTeamNameSetting: string;
  
  // Loading states
  isGameLoading: boolean;
  isRosterUpdating: boolean;
  isLoadingGamesList: boolean;
  processingGameId: string | null;
  
  // Error states
  gameLoadError: string | null;
  rosterError: string | null;
  loadGamesListError: string | null;
}

export interface ModalManagerProps {
  // Modal states
  modalStates: ModalStates;
  
  // Modal data
  modalData: ModalData;
  
  // Modal control handlers
  onCloseModal: (modalType: keyof ModalStates) => void;
  onOpenModal: (modalType: keyof ModalStates) => void;
  
  // Modal-specific handlers
  onLoadGame: (gameId: string) => void;
  onDeleteGame: (gameId: string) => void;
  onStartNewGame: (config: NewGameConfig) => void;
  onSaveGame: () => void;
  onUpdateGameSettings: (settings: Partial<GameSessionState>) => void;
  onPlayerAction: (action: string, playerId: string, data?: any) => void;
  onSeasonTournamentAction: (action: string, type: 'season' | 'tournament', data: any) => void;
}

export interface NewGameConfig {
  selectedPlayerIds: string[];
  demandFactor: number;
  teamName?: string;
  seasonId?: string;
  tournamentId?: string;
}

// ============================================================================
// Data Sync Manager Component
// ============================================================================

export interface DataSyncManagerProps {
  // Current game state
  gameState: GameSessionState;
  currentGameId: string | null;
  
  // Auto-save settings
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // in milliseconds
  
  // Data mutation handlers
  onGameSave: (gameData: AppState) => Promise<void>;
  onGameLoad: (gameId: string) => Promise<AppState>;
  onGameDelete: (gameId: string) => Promise<void>;
  
  // Sync status callbacks
  onSyncStart: () => void;
  onSyncComplete: () => void;
  onSyncError: (error: string) => void;
  
  // Backup handlers
  onBackupCreate: () => Promise<void>;
  onBackupRestore: (backupData: any) => Promise<void>;
}

// ============================================================================
// Error Boundary Component
// ============================================================================

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// ============================================================================
// HomePage Orchestrator
// ============================================================================

export interface HomePageProps {
  initialAction?: string;
  skipInitialSetup?: boolean;
}

export interface HomePageState {
  // Component readiness
  isInitialized: boolean;
  hasError: boolean;
  
  // Loading states
  isLoadingData: boolean;
  isLoadingGame: boolean;
  
  // Error states
  initializationError: string | null;
  criticalError: string | null;
}

// ============================================================================
// Utility Types
// ============================================================================

export type ComponentName = 
  | 'GameStateProvider'
  | 'GameView' 
  | 'GameControls'
  | 'ModalManager'
  | 'DataSyncManager'
  | 'ErrorBoundary';

export interface ComponentStatus {
  name: ComponentName;
  isLoaded: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export interface RefactoringProgress {
  componentsExtracted: ComponentName[];
  totalComponents: number;
  linesReduced: number;
  testsAdded: number;
  isComplete: boolean;
}