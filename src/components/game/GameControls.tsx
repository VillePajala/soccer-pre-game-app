'use client';

import React from 'react';
import ControlBar from '@/components/ControlBar';
import { GameControlsProps } from '@/types/gameComponents';
import { useGameStateContext } from './GameStateProvider';

export interface ExtendedGameControlsProps extends Partial<GameControlsProps> {
  // Additional control state from HomePage
  canUndo?: boolean;
  canRedo?: boolean;
  isTacticsBoardView?: boolean;
  highlightRosterButton?: boolean;
  isGameLoaded?: boolean;
  
  // Extended handlers from HomePage
  onUndo?: () => void;
  onRedo?: () => void;
  onResetField?: () => void;
  onClearDrawings?: () => void;
  onAddOpponent?: () => void;
  onToggleTrainingResources?: () => void;
  onToggleTacticsBoard?: () => void;
  onAddHomeDisc?: () => void;
  onAddOpponentDisc?: () => void;
  onPlaceAllPlayers?: () => void;
  onSignOut?: () => void;
  
  // Missing modal handlers
  onToggleLargeTimerOverlay?: () => void;
  onToggleGoalLogModal?: () => void;
  onToggleGameStatsModal?: () => void;
  onOpenLoadGameModal?: () => void;
  onStartNewGame?: () => void;
  onOpenRosterModal?: () => void;
  onQuickSave?: () => void;
  onOpenGameSettingsModal?: () => void;
  onOpenSeasonTournamentModal?: () => void;
  onToggleInstructionsModal?: () => void;
  onOpenSettingsModal?: () => void;
  
  // Style
  barStyle?: string;
}

/**
 * GameControls component handles all game control UI:
 * - Timer controls (start/pause/reset)
 * - Game actions (save, load, new game)
 * - Modal opening controls
 * - Field actions (undo/redo, reset, clear drawings)
 * - Tactics board controls
 * 
 * This component focuses on rendering controls and delegating
 * actions to parent handlers.
 */
export const GameControls = React.memo<ExtendedGameControlsProps>(({
  // UI state
  showLargeTimerOverlay = false,
  canUndo = false,
  canRedo = false,
  isTacticsBoardView = false,
  highlightRosterButton = false,
  isGameLoaded = false,
  barStyle = "flex-shrink-0 bg-slate-800",
  
  // Timer handlers (not currently used in this iteration)
  onStartGame: _onStartGame,
  onPauseGame: _onPauseGame,
  onEndGame: _onEndGame,
  onResetTimer: _onResetTimer,
  onToggleTimerOverlay,
  
  // Modal handlers
  onOpenGameSettings,
  onOpenGameStats,
  onOpenLoadGame,
  onOpenNewGame,
  onOpenRoster,
  onOpenSettings,
  
  // Quick actions
  onSaveGame,
  onUndoAction,
  onRedoAction: onRedo,
  
  // Extended handlers
  onUndo,
  onResetField,
  onClearDrawings,
  onAddOpponent,
  onToggleTrainingResources,
  onToggleLargeTimerOverlay,
  onToggleGoalLogModal,
  onToggleGameStatsModal,
  onOpenLoadGameModal,
  onStartNewGame,
  onOpenRosterModal,
  onQuickSave,
  onOpenGameSettingsModal,
  onPlaceAllPlayers,
  onOpenSeasonTournamentModal,
  onToggleTacticsBoard,
  onAddHomeDisc,
  onAddOpponentDisc,
  onToggleInstructionsModal,
  onOpenSettingsModal,
  onSignOut,
}: ExtendedGameControlsProps) => {
  // Get state from context (currently not used but available for future implementation)
  const { gameState: _gameState, timeElapsedInSeconds: _timeElapsedInSeconds, isGameActive: _isGameActive } = useGameStateContext();
  
  // Suppress unused variable warnings - these will be used when full integration is complete
  void _onStartGame;
  void _onPauseGame;
  void _onEndGame;
  void _onResetTimer;
  void _gameState;
  void _timeElapsedInSeconds;
  void _isGameActive;
  
  return (
    <div className={barStyle}>
      <ControlBar
        // Undo/Redo
        onUndo={onUndo || onUndoAction || (() => {})}
        onRedo={onRedo || (() => {})}
        canUndo={canUndo}
        canRedo={canRedo}
        
        // Field actions
        onResetField={onResetField || (() => {})}
        onClearDrawings={onClearDrawings || (() => {})}
        onAddOpponent={onAddOpponent || (() => {})}
        onPlaceAllPlayers={onPlaceAllPlayers || (() => {})}
        
        // Timer overlay
        showLargeTimerOverlay={showLargeTimerOverlay}
        onToggleLargeTimerOverlay={onToggleLargeTimerOverlay || onToggleTimerOverlay || (() => {})}
        
        // Modal controls
        onToggleTrainingResources={onToggleTrainingResources || (() => {})}
        onToggleGoalLogModal={onToggleGoalLogModal || (() => {})}
        onToggleGameStatsModal={onToggleGameStatsModal || onOpenGameStats || (() => {})}
        onOpenLoadGameModal={onOpenLoadGameModal || onOpenLoadGame || (() => {})}
        onStartNewGame={onStartNewGame || onOpenNewGame || (() => {})}
        onOpenRosterModal={onOpenRosterModal || onOpenRoster || (() => {})}
        onOpenGameSettingsModal={onOpenGameSettingsModal || onOpenGameSettings || (() => {})}
        onOpenSeasonTournamentModal={onOpenSeasonTournamentModal || (() => {})}
        onToggleInstructionsModal={onToggleInstructionsModal || (() => {})}
        onOpenSettingsModal={onOpenSettingsModal || onOpenSettings || (() => {})}
        
        // Quick actions
        onQuickSave={onQuickSave || onSaveGame || (() => {})}
        
        // State indicators
        isGameLoaded={isGameLoaded}
        highlightRosterButton={highlightRosterButton}
        
        // Tactics board
        isTacticsBoardView={isTacticsBoardView}
        onToggleTacticsBoard={onToggleTacticsBoard || (() => {})}
        onAddHomeDisc={onAddHomeDisc || (() => {})}
        onAddOpponentDisc={onAddOpponentDisc || (() => {})}
        
        // Auth
        onSignOut={onSignOut || (() => {})}
        
        // Player Assessment Modal (missing property)
        onOpenPlayerAssessmentModal={() => {}}
      />
    </div>
  );
});

GameControls.displayName = 'GameControls';