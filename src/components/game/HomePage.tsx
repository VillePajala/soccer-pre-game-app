'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AppLoadingSkeleton } from '@/components/ui/AppSkeleton';
import { GameStateProvider } from './GameStateProvider';
import { GameView } from './GameView';
import { GameControls } from './GameControls';
import { ModalManager } from './ModalManager';
import { HomePageProps } from '@/types/gameComponents';
import logger from '@/utils/logger';

// Hook imports (from original HomePage)
import useAppSettingsManager from '@/hooks/useAppSettingsManager';
import useMigrationTrigger from '@/hooks/useMigrationTrigger';
import { useModalContext } from '@/contexts/ModalProvider';

// Utilities and constants
import { DEFAULT_GAME_ID } from '@/config/constants';

/**
 * Simplified HomePage Orchestrator
 * 
 * This component has been refactored from a 2,081-line monolith into a clean orchestrator 
 * that coordinates between extracted components:
 * - GameStateProvider: Manages central game state
 * - GameView: Handles visual game interface (field, players, timers)
 * - GameControls: Manages control bar and actions
 * - ModalManager: Handles all modal components
 * 
 * The orchestrator's primary responsibilities:
 * 1. Initialize application state and data loading
 * 2. Coordinate between components through handlers
 * 3. Manage component lifecycle and error states
 * 4. Provide a clean separation of concerns
 */
export function HomePage({ 
  initialAction, 
  skipInitialSetup = false 
}: HomePageProps) {
  // UI state
  const [showLargeTimerOverlay, setShowLargeTimerOverlay] = useState(false);
  const [isTacticsBoardView, setIsTacticsBoardView] = useState(false);
  const [highlightRosterButton] = useState(false);
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<unknown>(null);
  const [playerIdsForNewGame] = useState<string[] | null>(null);
  const [newGameDemandFactor, setNewGameDemandFactor] = useState(1);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Game lifecycle state
  const [currentGameId] = useState<string | null>(DEFAULT_GAME_ID);
  const hasSkippedInitialSetup = skipInitialSetup;
  
  // App settings and language
  const {
    appLanguage,
    defaultTeamNameSetting,
    handleLanguageChange,
    handleDefaultTeamNameChange,
    handleShowAppGuide,
    handleHardResetApp,
    signOut,
  } = useAppSettingsManager();
  
  // Modal context
  const {
    isGameSettingsModalOpen,
    setIsGameSettingsModalOpen,
    isLoadGameModalOpen,
    setIsLoadGameModalOpen,
    isRosterModalOpen,
    setIsRosterModalOpen,
    isSeasonTournamentModalOpen,
    setIsSeasonTournamentModalOpen,
    isGoalLogModalOpen,
    setIsGoalLogModalOpen,
    isGameStatsModalOpen,
    setIsGameStatsModalOpen,
    isNewGameSetupModalOpen,
    setIsNewGameSetupModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isPlayerAssessmentModalOpen,
    setIsPlayerAssessmentModalOpen,
  } = useModalContext();
  
  // Additional modal states not in context
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false);
  const [isTrainingResourcesOpen, setIsTrainingResourcesOpen] = useState(false);
  
  // Migration trigger
  const { MigrationModalComponent } = useMigrationTrigger();
  
  // Initialize app and handle initial actions
  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.debug('[HomePage] Initializing application...');
        
        // Handle initial action if provided
        if (initialAction && !hasSkippedInitialSetup) {
          switch (initialAction) {
            case 'newGame':
              setIsNewGameSetupModalOpen(true);
              break;
            case 'loadGame':
              setIsLoadGameModalOpen(true);
              break;
            case 'resumeGame':
              // Resume logic handled by GameStateProvider
              break;
            case 'season':
              setIsSeasonTournamentModalOpen(true);
              break;
            case 'stats':
              setIsGameStatsModalOpen(true);
              break;
            default:
              break;
          }
        }
        
        setInitialLoadComplete(true);
        logger.debug('[HomePage] Application initialized successfully');
      } catch (error) {
        logger.error('[HomePage] Failed to initialize application:', error);
      }
    };
    
    initializeApp();
  }, [initialAction, hasSkippedInitialSetup, setIsNewGameSetupModalOpen, setIsLoadGameModalOpen, setIsSeasonTournamentModalOpen, setIsGameStatsModalOpen]);
  
  // Timer and overlay handlers
  const handleToggleLargeTimerOverlay = useCallback(() => {
    setShowLargeTimerOverlay(!showLargeTimerOverlay);
  }, [showLargeTimerOverlay]);
  
  // Tactics board handlers
  const handleToggleTacticsBoard = useCallback(() => {
    setIsTacticsBoardView(!isTacticsBoardView);
  }, [isTacticsBoardView]);
  
  // Modal handlers
  const handleToggleTrainingResources = useCallback(() => {
    setIsTrainingResourcesOpen(!isTrainingResourcesOpen);
  }, [isTrainingResourcesOpen]);
  
  const handleToggleInstructionsModal = useCallback(() => {
    setIsInstructionsModalOpen(!isInstructionsModalOpen);
  }, [isInstructionsModalOpen]);
  
  const handleToggleGoalLogModal = useCallback(() => {
    setIsGoalLogModalOpen(!isGoalLogModalOpen);
  }, [isGoalLogModalOpen, setIsGoalLogModalOpen]);
  
  const handleToggleGameStatsModal = useCallback(() => {
    if (isGameStatsModalOpen) {
      setSelectedPlayerForStats(null);
    }
    setIsGameStatsModalOpen(!isGameStatsModalOpen);
  }, [isGameStatsModalOpen, setIsGameStatsModalOpen]);
  
  // Game control handlers
  const handleStartNewGame = useCallback(() => {
    setIsNewGameSetupModalOpen(true);
  }, [setIsNewGameSetupModalOpen]);
  
  const handleOpenLoadGameModal = useCallback(() => {
    setIsLoadGameModalOpen(true);
  }, [setIsLoadGameModalOpen]);
  
  const handleOpenGameSettingsModal = useCallback(() => {
    setIsGameSettingsModalOpen(true);
  }, [setIsGameSettingsModalOpen]);
  
  const handleOpenSeasonTournamentModal = useCallback(() => {
    setIsSeasonTournamentModalOpen(true);
  }, [setIsSeasonTournamentModalOpen]);
  
  const handleOpenSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, [setIsSettingsModalOpen]);
  
  // Modal states for ModalManager
  const modalStates = useMemo(() => ({
    isGameStatsModalOpen,
    isGameSettingsModalOpen,
    isLoadGameModalOpen,
    isNewGameSetupModalOpen,
    isRosterModalOpen,
    isSettingsModalOpen,
    isSeasonTournamentModalOpen,
    isInstructionsModalOpen,
    isPlayerAssessmentModalOpen,
    isTrainingResourcesModalOpen: isTrainingResourcesOpen,
    isGoalLogModalOpen,
  }), [
    isGameStatsModalOpen,
    isGameSettingsModalOpen,
    isLoadGameModalOpen,
    isNewGameSetupModalOpen,
    isRosterModalOpen,
    isSettingsModalOpen,
    isSeasonTournamentModalOpen,
    isInstructionsModalOpen,
    isPlayerAssessmentModalOpen,
    isTrainingResourcesOpen,
    isGoalLogModalOpen,
  ]);
  
  // Show loading skeleton while initializing
  if (!initialLoadComplete) {
    return <AppLoadingSkeleton />;
  }
  
  return (
    <GameStateProvider
      initialGameId={currentGameId}
      initialState={{}}
    >
      <main className="flex flex-col h-screen bg-black text-white overflow-hidden">
        {/* Game View Section */}
        <GameView
          showLargeTimerOverlay={showLargeTimerOverlay}
          isTacticsBoardView={isTacticsBoardView}
          initialLoadComplete={initialLoadComplete}
          
          // Timer overlay handlers
          handleToggleLargeTimerOverlay={handleToggleLargeTimerOverlay}
          
          // Placeholder handlers - these will be properly connected
          handlePlayerDragStartFromBar={() => {}}
          handleDeselectPlayer={() => {}}
          handlePlayerTapInBar={() => {}}
          handleToggleGoalieForModal={() => {}}
          handleTeamNameChange={() => {}}
          handleOpponentNameChange={() => {}}
          handlePlayerMove={() => {}}
          handlePlayerMoveEnd={() => {}}
          handlePlayerRemove={() => {}}
          handleOpponentMove={() => {}}
          handleOpponentMoveEnd={() => {}}
          handleOpponentRemove={() => {}}
          handleDropOnField={() => {}}
          handleDrawingStart={() => {}}
          handleDrawingAddPoint={() => {}}
          handleDrawingEnd={() => {}}
          handleTacticalDrawingStart={() => {}}
          handleTacticalDrawingAddPoint={() => {}}
          handleTacticalDrawingEnd={() => {}}
          handlePlayerDropViaTouch={() => {}}
          handlePlayerDragCancelViaTouch={() => {}}
          handleTacticalDiscMove={() => {}}
          handleTacticalDiscRemove={() => {}}
          handleToggleTacticalDiscType={() => {}}
          handleTacticalBallMove={() => {}}
          handleSubstitutionMade={() => {}}
          handleSetSubInterval={() => {}}
          handleStartPauseTimer={() => {}}
          handleResetTimer={() => {}}
          handleToggleGoalLogModal={handleToggleGoalLogModal}
          handleLogOpponentGoal={() => {}}
        />
        
        {/* Game Controls Section */}
        <GameControls
          showLargeTimerOverlay={showLargeTimerOverlay}
          
          // Modal handlers
          onToggleLargeTimerOverlay={handleToggleLargeTimerOverlay}
          onToggleTrainingResources={handleToggleTrainingResources}
          onToggleGoalLogModal={handleToggleGoalLogModal}
          onToggleGameStatsModal={handleToggleGameStatsModal}
          onOpenLoadGameModal={handleOpenLoadGameModal}
          onStartNewGame={handleStartNewGame}
          onOpenGameSettingsModal={handleOpenGameSettingsModal}
          onOpenSeasonTournamentModal={handleOpenSeasonTournamentModal}
          onToggleInstructionsModal={handleToggleInstructionsModal}
          onOpenSettingsModal={handleOpenSettingsModal}
          onToggleTacticsBoard={handleToggleTacticsBoard}
          onSignOut={signOut}
          
          // Placeholder handlers - these will be properly connected
          onUndo={() => {}}
          onRedo={() => {}}
          onResetField={() => {}}
          onClearDrawings={() => {}}
          onAddOpponent={() => {}}
          onPlaceAllPlayers={() => {}}
          onOpenRosterModal={() => setIsRosterModalOpen(true)}
          onQuickSave={() => {}}
          onAddHomeDisc={() => {}}
          onAddOpponentDisc={() => {}}
          
          // State
          isGameLoaded={!!currentGameId && currentGameId !== DEFAULT_GAME_ID}
          highlightRosterButton={highlightRosterButton}
          isTacticsBoardView={isTacticsBoardView}
        />
        
        {/* Modal Manager */}
        <ModalManager
          modalStates={modalStates}
          
          // Additional modal states
          isTrainingResourcesOpen={isTrainingResourcesOpen}
          isInstructionsModalOpen={isInstructionsModalOpen}
          
          // Modal handlers
          handleToggleTrainingResources={handleToggleTrainingResources}
          handleToggleInstructionsModal={handleToggleInstructionsModal}
          
          // Additional data
          newGameDemandFactor={newGameDemandFactor}
          setNewGameDemandFactor={setNewGameDemandFactor}
          playerIdsForNewGame={playerIdsForNewGame}
          selectedPlayerForStats={selectedPlayerForStats}
          appLanguage={appLanguage}
          defaultTeamNameSetting={defaultTeamNameSetting}
          MigrationModalComponent={MigrationModalComponent}
          
          // Settings handlers
          handleLanguageChange={handleLanguageChange}
          handleDefaultTeamNameChange={handleDefaultTeamNameChange}
          handleShowAppGuide={handleShowAppGuide}
          handleHardResetApp={handleHardResetApp}
          signOut={signOut}
          
          // Placeholder handlers - these will be properly connected
          onCloseModal={(modalType) => {
            switch (modalType) {
              case 'isGameStatsModalOpen':
                setIsGameStatsModalOpen(false);
                setSelectedPlayerForStats(null);
                break;
              case 'isGameSettingsModalOpen':
                setIsGameSettingsModalOpen(false);
                break;
              case 'isLoadGameModalOpen':
                setIsLoadGameModalOpen(false);
                break;
              case 'isNewGameSetupModalOpen':
                setIsNewGameSetupModalOpen(false);
                break;
              case 'isRosterModalOpen':
                setIsRosterModalOpen(false);
                break;
              case 'isSettingsModalOpen':
                setIsSettingsModalOpen(false);
                break;
              case 'isSeasonTournamentModalOpen':
                setIsSeasonTournamentModalOpen(false);
                break;
              case 'isPlayerAssessmentModalOpen':
                setIsPlayerAssessmentModalOpen(false);
                break;
              default:
                break;
            }
          }}
          onLoadGame={() => {}}
          onDeleteGame={() => {}}
          onStartNewGame={() => {}}
          onSaveGame={() => {}}
          onUpdateGameSettings={() => {}}
          onPlayerAction={() => {}}
          onSeasonTournamentAction={() => {}}
        />
      </main>
    </GameStateProvider>
  );
}

export default HomePage;