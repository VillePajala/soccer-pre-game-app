'use client';

import React from 'react';
import ControlBar from '@/components/ControlBar';
import { 
  useGameStore, 
  useGameSession 
} from '@/stores/gameStore';
import { 
  useGameView,
  useUIStore
} from '@/stores/uiStore';
import type { ExtendedGameControlsProps } from './GameControls';

/**
 * Migrated GameControls component that uses Zustand stores
 * Maintains same interface as legacy component but with centralized state
 */
export const MigratedGameControls = React.memo<ExtendedGameControlsProps>(({
  // Props that will be overridden by store values
  canUndo: propCanUndo,
  canRedo: propCanRedo,
  isTacticsBoardView: propIsTacticsBoardView,
  highlightRosterButton: propHighlightRosterButton,
  isGameLoaded: propIsGameLoaded,
  showLargeTimerOverlay: propShowLargeTimerOverlay,
  
  // Props that are still used for compatibility
  onUndo,
  onRedo,
  onResetField,
  onClearDrawings,
  onAddOpponent,
  onToggleTrainingResources,
  onToggleTacticsBoard,
  onAddHomeDisc,
  onAddOpponentDisc,
  onPlaceAllPlayers,
  onSignOut,
  onToggleLargeTimerOverlay,
  onToggleGoalLogModal,
  onToggleGameStatsModal,
  onOpenLoadGameModal,
  onStartNewGame,
  onOpenRosterModal,
  onQuickSave,
  onOpenGameSettingsModal,
  onOpenSeasonTournamentModal,
  onToggleInstructionsModal,
  onOpenSettingsModal,
  
  // Timer handlers (from base GameControlsProps)
  onStartGame: _onStartGame,
  onPauseGame: _onPauseGame,
  onEndGame: _onEndGame,
  onResetTimer: _onResetTimer,
  onToggleTimerOverlay,
  onOpenGameSettings,
  onOpenGameStats,
  onOpenLoadGame,
  onOpenNewGame,  
  onOpenRoster,
  onOpenSettings,
  onSaveGame,
  onUndoAction,
  onRedoAction,
  
  // Style
  barStyle = "flex-shrink-0 bg-slate-800",
}) => {
  // Get values from Zustand stores
  const gameSession = useGameSession();
  // const { timeElapsed, isRunning } = useGameTimer(); // TODO: Use when needed
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  // const modals = useModalState(); // TODO: Use when implementing modal state
  const gameView = useGameView();
  // const { isEnabled: isTacticsBoardEnabled } = useTacticsBoard(); // TODO: Use when implementing tactics board state
  
  // Use store values instead of props where available
  const displayCanUndo = gameSession.gameEvents?.length > 0 || propCanUndo || false;
  const displayCanRedo = propCanRedo || false; // NOTE: Redo history will be implemented in Phase 2
  const displayIsTacticsBoardView = gameView.isTacticsBoardView !== undefined ? gameView.isTacticsBoardView : propIsTacticsBoardView;
  const displayIsGameLoaded = gameSession.gameId !== null || propIsGameLoaded;
  const displayHighlightRosterButton = propHighlightRosterButton || false; // TODO: Implement in store if needed
  const displayShowLargeTimerOverlay = propShowLargeTimerOverlay; // TODO: Add to uiStore if needed
  
  // Enhanced handlers with store integration
  const handleUndo = () => {
    // Remove last game event as a simple undo implementation
    const events = gameSession.gameEvents;
    if (events.length > 0) {
      gameStore.removeGameEvent(events[events.length - 1].id);
    }
    // Also call parent handler for compatibility
    if (onUndo || onUndoAction) {
      (onUndo || onUndoAction)?.();
    }
  };
  
  const handleRedo = () => {
    // NOTE: Redo functionality requires history tracking which will be implemented in Phase 2
    // For now, we pass through to the legacy handler if provided
    if (onRedo || onRedoAction) {
      (onRedo || onRedoAction)?.();
    }
  };
  
  const handleResetField = () => {
    // Reset field state in store
    gameStore.resetField();
    // Also call parent handler for compatibility
    if (onResetField) {
      onResetField();
    }
  };
  
  const handleClearDrawings = () => {
    // Clear drawings in store
    gameStore.clearDrawings();
    // Also call parent handler for compatibility
    if (onClearDrawings) {
      onClearDrawings();
    }
  };
  
  const handleToggleTacticsBoard = () => {
    // Toggle tactics board view in store
    uiStore.setTacticsBoardView(!displayIsTacticsBoardView);
    // Also call parent handler for compatibility
    if (onToggleTacticsBoard) {
      onToggleTacticsBoard();
    }
  };
  
  const handleAddHomeDisc = () => {
    // Add tactical disc to store
    const newDisc = {
      id: `disc-${Date.now()}`,
      relX: 0.5,
      relY: 0.5,
      type: 'home' as const,
    };
    gameStore.addTacticalDisc(newDisc);
    // Also call parent handler for compatibility
    if (onAddHomeDisc) {
      onAddHomeDisc();
    }
  };
  
  const handleAddOpponentDisc = () => {
    // Add opponent tactical disc to store
    const newDisc = {
      id: `disc-${Date.now()}`,
      relX: 0.5,
      relY: 0.5,
      type: 'opponent' as const,
    };
    gameStore.addTacticalDisc(newDisc);
    // Also call parent handler for compatibility
    if (onAddOpponentDisc) {
      onAddOpponentDisc();
    }
  };
  
  const handlePlaceAllPlayers = () => {
    // Get current state from store
    const currentState = useGameStore.getState();
    const availablePlayers = currentState.field.availablePlayers;
    const selectedPlayerIds = currentState.gameSession.selectedPlayerIds || [];
    const currentPlayersOnField = currentState.field.playersOnField || [];
    
    // Find selected players that are not already on field
    const selectedButNotOnField = selectedPlayerIds.filter(
      id => !currentPlayersOnField.some(p => p.id === id)
    );
    
    if (selectedButNotOnField.length === 0) {
      // Also call parent handler for compatibility
      if (onPlaceAllPlayers) {
        onPlaceAllPlayers();
      }
      return;
    }

    const playersToPlace = selectedButNotOnField
      .map(id => availablePlayers.find(p => p.id === id))
      .filter((p): p is Player => p !== undefined);

    const newFieldPlayers: Player[] = [...currentPlayersOnField];

    // Place goalie first if present
    const goalieIndex = playersToPlace.findIndex(p => p.isGoalie);
    let goalie: Player | null = null;
    if (goalieIndex !== -1) {
      goalie = playersToPlace.splice(goalieIndex, 1)[0];
    }
    if (goalie) {
      newFieldPlayers.push({ ...goalie, relX: 0.5, relY: 0.95 });
    }

    // Position remaining players based on count
    const remainingCount = playersToPlace.length;
    let positions: { relX: number; relY: number }[] = [];

    if (remainingCount <= 3) {
      if (remainingCount >= 1) positions.push({ relX: 0.5, relY: 0.8 });
      if (remainingCount >= 2) positions.push({ relX: 0.5, relY: 0.5 });
      if (remainingCount >= 3) positions.push({ relX: 0.5, relY: 0.3 });
    } else if (remainingCount <= 7) {
      positions.push({ relX: 0.3, relY: 0.8 });
      positions.push({ relX: 0.7, relY: 0.8 });
      positions.push({ relX: 0.25, relY: 0.6 });
      positions.push({ relX: 0.5, relY: 0.55 });
      positions.push({ relX: 0.75, relY: 0.6 });
      positions.push({ relX: 0.35, relY: 0.3 });
      if (remainingCount >= 7) positions.push({ relX: 0.65, relY: 0.3 });
    } else {
      positions.push({ relX: 0.25, relY: 0.85 });
      positions.push({ relX: 0.5, relY: 0.8 });
      positions.push({ relX: 0.75, relY: 0.85 });
      positions.push({ relX: 0.2, relY: 0.6 });
      positions.push({ relX: 0.4, relY: 0.55 });
      positions.push({ relX: 0.6, relY: 0.55 });
      positions.push({ relX: 0.8, relY: 0.6 });
      positions.push({ relX: 0.5, relY: 0.3 });
      if (remainingCount >= 9) positions.push({ relX: 0.35, relY: 0.3 });
      if (remainingCount >= 10) positions.push({ relX: 0.65, relY: 0.3 });
    }

    positions = positions.slice(0, remainingCount);

    playersToPlace.forEach((player, index) => {
      const pos = positions[index];
      newFieldPlayers.push({ ...player, relX: pos.relX, relY: pos.relY });
    });

    gameStore.setPlayersOnField(newFieldPlayers);
    
    // Also call parent handler for compatibility
    if (onPlaceAllPlayers) {
      onPlaceAllPlayers();
    }
  };
  
  // Modal handlers with store integration
  const handleToggleGoalLogModal = () => {
    uiStore.toggleModal('goalLogModal');
    if (onToggleGoalLogModal) {
      onToggleGoalLogModal();
    }
  };
  
  const handleToggleGameStatsModal = () => {
    uiStore.toggleModal('gameStatsModal');
    if (onToggleGameStatsModal || onOpenGameStats) {
      (onToggleGameStatsModal || onOpenGameStats)?.();
    }
  };
  
  const handleOpenLoadGameModal = () => {
    uiStore.openModal('loadGameModal');
    if (onOpenLoadGameModal || onOpenLoadGame) {
      (onOpenLoadGameModal || onOpenLoadGame)?.();
    }
  };
  
  const handleStartNewGame = () => {
    uiStore.openModal('saveGameModal'); // Typically opens new game modal
    if (onStartNewGame || onOpenNewGame) {
      (onStartNewGame || onOpenNewGame)?.();
    }
  };
  
  const handleOpenRosterModal = () => {
    uiStore.openModal('rosterSettingsModal');
    if (onOpenRosterModal || onOpenRoster) {
      (onOpenRosterModal || onOpenRoster)?.();
    }
  };
  
  const handleOpenGameSettingsModal = () => {
    uiStore.openModal('settingsModal');
    if (onOpenGameSettingsModal || onOpenGameSettings) {
      (onOpenGameSettingsModal || onOpenGameSettings)?.();
    }
  };
  
  const handleOpenSeasonTournamentModal = () => {
    // TODO: Add season/tournament modal to uiStore
    if (onOpenSeasonTournamentModal) {
      onOpenSeasonTournamentModal();
    }
  };
  
  const handleToggleInstructionsModal = () => {
    uiStore.toggleModal('instructionsModal');
    if (onToggleInstructionsModal) {
      onToggleInstructionsModal();
    }
  };
  
  const handleOpenSettingsModal = () => {
    uiStore.openModal('settingsModal');
    if (onOpenSettingsModal || onOpenSettings) {
      (onOpenSettingsModal || onOpenSettings)?.();
    }
  };
  
  const handleQuickSave = () => {
    // TODO: Implement quick save in persistenceStore
    if (onQuickSave || onSaveGame) {
      (onQuickSave || onSaveGame)?.();
    }
  };
  
  const handleToggleTrainingResources = () => {
    // TODO: Add training resources modal to uiStore
    if (onToggleTrainingResources) {
      onToggleTrainingResources();
    }
  };
  
  const handleToggleLargeTimerOverlay = () => {
    // TODO: Add large timer overlay to uiStore
    if (onToggleLargeTimerOverlay || onToggleTimerOverlay) {
      (onToggleLargeTimerOverlay || onToggleTimerOverlay)?.();
    }
  };
  
  const handleAddOpponent = () => {
    // Add opponent to field
    const newOpponent = {
      id: `opponent-${Date.now()}`,
      relX: 0.8,
      relY: 0.5,
    };
    gameStore.addOpponent(newOpponent);
    
    if (onAddOpponent) {
      onAddOpponent();
    }
  };
  
  return (
    <div className={barStyle}>
      <ControlBar
        // Undo/Redo
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={displayCanUndo}
        canRedo={displayCanRedo}
        
        // Field actions
        onResetField={handleResetField}
        onClearDrawings={handleClearDrawings}
        onAddOpponent={handleAddOpponent}
        onPlaceAllPlayers={handlePlaceAllPlayers}
        
        // Timer overlay
        showLargeTimerOverlay={displayShowLargeTimerOverlay || false}
        onToggleLargeTimerOverlay={handleToggleLargeTimerOverlay}
        
        // Modal controls
        onToggleTrainingResources={handleToggleTrainingResources}
        onToggleGoalLogModal={handleToggleGoalLogModal}
        onToggleGameStatsModal={handleToggleGameStatsModal}
        onOpenLoadGameModal={handleOpenLoadGameModal}
        onStartNewGame={handleStartNewGame}
        onOpenRosterModal={handleOpenRosterModal}
        onOpenGameSettingsModal={handleOpenGameSettingsModal}
        onOpenSeasonTournamentModal={handleOpenSeasonTournamentModal}
        onToggleInstructionsModal={handleToggleInstructionsModal}
        onOpenSettingsModal={handleOpenSettingsModal}
        
        // Quick actions
        onQuickSave={handleQuickSave}
        
        // State indicators
        isGameLoaded={displayIsGameLoaded || false}
        highlightRosterButton={displayHighlightRosterButton || false}
        
        // Tactics board
        isTacticsBoardView={displayIsTacticsBoardView || false}
        onToggleTacticsBoard={handleToggleTacticsBoard}
        onAddHomeDisc={handleAddHomeDisc}
        onAddOpponentDisc={handleAddOpponentDisc}
        
        // Auth
        onSignOut={onSignOut || (() => {})}
        
        // Player Assessment Modal
        onOpenPlayerAssessmentModal={() => uiStore.openModal('playerAssessmentModal')}
      />
    </div>
  );
});

MigratedGameControls.displayName = 'MigratedGameControls';

export default MigratedGameControls;