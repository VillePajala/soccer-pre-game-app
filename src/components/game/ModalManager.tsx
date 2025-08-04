'use client';

import React from 'react';
import GoalLogModal from '@/components/GoalLogModal';
import { ModalManagerProps } from '@/types/gameComponents';
import { useGameStateContext } from './GameStateProvider';
import { Player, GameEvent } from '@/types';

// Lazy load heavy modals for better performance
const GameStatsModal = React.lazy(() => import('@/components/GameStatsModal'));
const GameSettingsModal = React.lazy(() => import('@/components/GameSettingsModal')); 
const TrainingResourcesModal = React.lazy(() => import('@/components/TrainingResourcesModal'));
const LoadGameModal = React.lazy(() => import('@/components/LoadGameModal'));
const NewGameSetupModal = React.lazy(() => import('@/components/NewGameSetupModal'));
const RosterSettingsModal = React.lazy(() => import('@/components/RosterSettingsModal'));
const SettingsModal = React.lazy(() => import('@/components/SettingsModal'));
const SeasonTournamentManagementModal = React.lazy(() => import('@/components/SeasonTournamentManagementModal'));
const InstructionsModal = React.lazy(() => import('@/components/InstructionsModal'));
const PlayerAssessmentModal = React.lazy(() => import('@/components/PlayerAssessmentModal'));

// Skeletons
import { GameStatsModalSkeleton, LoadGameModalSkeleton, RosterModalSkeleton, ModalSkeleton } from '@/components/ui/ModalSkeleton';

interface ExtendedModalManagerProps extends Partial<ModalManagerProps> {
  // Additional modal states not in interface
  isTrainingResourcesOpen?: boolean;
  isInstructionsModalOpen?: boolean;
  
  // Additional data not in interface
  newGameDemandFactor?: number;
  playerIdsForNewGame?: string[] | null;
  selectedPlayerForStats?: unknown;
  playersForCurrentGame?: unknown[];
  isRosterUpdating?: boolean;
  rosterError?: string | null;
  playerAssessments?: unknown[];
  appLanguage?: string;
  defaultTeamNameSetting?: string;
  MigrationModalComponent?: React.ReactNode;
  
  // Additional handlers
  handleToggleTrainingResources?: () => void;
  handleToggleInstructionsModal?: () => void;
  handleAddGoalEvent?: (event: unknown) => void;
  handleLogOpponentGoal?: (timeInSeconds: number) => void;
  handleUpdateGameEvent?: (eventId: string, updates: unknown) => void;
  handleDeleteGameEvent?: (eventId: string) => void;
  handleExportOneJsonWrapper?: (gameId: string) => void;
  handleExportOneCsvWrapper?: (gameId: string) => void;
  handleExportAggregateJson?: () => void;
  handleExportAggregateCsv?: () => void;
  handleGameLogClick?: (gameId: string) => void;
  handleCloseLoadGameModal?: () => void;
  handleStartNewGameWithSetup?: (...args: unknown[]) => void;
  handleCancelNewGameSetup?: () => void;
  setNewGameDemandFactor?: (factor: number) => void;
  closeRosterModal?: () => void;
  handleRenamePlayerForModal?: (playerId: string, newName: string) => void;
  handleSetJerseyNumberForModal?: (playerId: string, jerseyNumber: string) => void;
  handleSetPlayerNotesForModal?: (playerId: string, notes: string) => void;
  handleRemovePlayerForModal?: (playerId: string) => void;
  handleAddPlayerForModal?: (player: unknown) => void;
  handleTogglePlayerSelection?: (playerId: string) => void;
  handleOpenPlayerStats?: (player: unknown) => void;
  handleCloseSeasonTournamentModal?: () => void;
  handleCloseGameSettingsModal?: () => void;
  handleTeamNameChange?: (name: string) => void;
  handleOpponentNameChange?: (name: string) => void;
  handleGameDateChange?: (date: string) => void;
  handleGameLocationChange?: (location: string) => void;
  handleGameTimeChange?: (time: string) => void;
  handleSetAgeGroup?: (ageGroup: string) => void;
  handleSetTournamentLevel?: (level: string) => void;
  handleAwardFairPlayCard?: (playerId: string) => void;
  handleSetNumberOfPeriods?: (periods: number) => void;
  handleSetPeriodDuration?: (duration: number) => void;
  handleSetDemandFactor?: (factor: number) => void;
  handleSetSeasonId?: (seasonId: string) => void;
  handleSetTournamentId?: (tournamentId: string) => void;
  handleSetHomeOrAway?: (homeOrAway: 'home' | 'away') => void;
  handleSetIsPlayed?: (isPlayed: boolean) => void;
  updateGameDetailsMutation?: unknown;
  handleCloseSettingsModal?: () => void;
  handleLanguageChange?: (language: string) => void;
  handleDefaultTeamNameChange?: (name: string) => void;
  handleShowAppGuide?: () => void;
  handleHardResetApp?: () => void;
  closePlayerAssessmentModal?: () => void;
  handleSavePlayerAssessment?: (assessment: unknown) => void;
  handleDeletePlayerAssessment?: (assessmentId: string) => void;
  signOut?: () => void;
  
  // Mutation objects
  addSeasonMutation?: unknown;
  addTournamentMutation?: unknown;
  updateSeasonMutation?: unknown;
  deleteSeasonMutation?: unknown;
  updateTournamentMutation?: unknown;
  deleteTournamentMutation?: unknown;
}

/**
 * ModalManager component handles all modal components in the app:
 * - Game Stats Modal
 * - Game Settings Modal  
 * - Load Game Modal
 * - New Game Setup Modal
 * - Roster Settings Modal
 * - Settings Modal
 * - Season/Tournament Management Modal
 * - Instructions Modal
 * - Training Resources Modal
 * - Goal Log Modal
 * - Player Assessment Modal
 * 
 * This component centralizes modal rendering and management,
 * using React.Suspense for lazy loading and proper error boundaries.
 */
export function ModalManager({
  // Modal states
  modalStates = {
    isGameStatsModalOpen: false,
    isGameSettingsModalOpen: false,
    isLoadGameModalOpen: false,
    isNewGameSetupModalOpen: false,
    isRosterModalOpen: false,
    isSettingsModalOpen: false,
    isSeasonTournamentModalOpen: false,
    isInstructionsModalOpen: false,
    isPlayerAssessmentModalOpen: false,
    isTrainingResourcesModalOpen: false,
    isGoalLogModalOpen: false,
  },
  
  // Additional modal states not in interface
  isTrainingResourcesOpen = false,
  isInstructionsModalOpen = false,
  
  // Modal data
  modalData,
  
  // Modal handlers
  onCloseModal,
  onLoadGame,
  onDeleteGame,
  onStartNewGame: _onStartNewGame,
  onSaveGame: _onSaveGame,
  onUpdateGameSettings: _onUpdateGameSettings,
  onPlayerAction,
  onSeasonTournamentAction: _onSeasonTournamentAction,
  
  // Extended handlers
  handleToggleTrainingResources,
  handleToggleInstructionsModal,
  handleAddGoalEvent,
  handleLogOpponentGoal,
  handleUpdateGameEvent,
  handleDeleteGameEvent,
  handleExportOneJsonWrapper,
  handleExportOneCsvWrapper,
  handleExportAggregateJson,
  handleExportAggregateCsv,
  handleGameLogClick,
  handleCloseLoadGameModal,
  handleStartNewGameWithSetup,
  handleCancelNewGameSetup,
  setNewGameDemandFactor,
  newGameDemandFactor = 1,
  playerIdsForNewGame,
  closeRosterModal,
  handleRenamePlayerForModal,
  handleSetJerseyNumberForModal,
  handleSetPlayerNotesForModal,
  handleRemovePlayerForModal,
  handleAddPlayerForModal,
  handleTogglePlayerSelection,
  handleOpenPlayerStats,
  isRosterUpdating = false,
  rosterError,
  handleCloseSeasonTournamentModal,
  handleCloseGameSettingsModal,
  handleTeamNameChange,
  handleOpponentNameChange,
  handleGameDateChange,
  handleGameLocationChange,
  handleGameTimeChange,
  handleSetAgeGroup,
  handleSetTournamentLevel,
  handleAwardFairPlayCard,
  handleSetNumberOfPeriods,
  handleSetPeriodDuration,
  handleSetDemandFactor,
  handleSetSeasonId,
  handleSetTournamentId,
  handleSetHomeOrAway,
  handleSetIsPlayed,
  updateGameDetailsMutation,
  handleCloseSettingsModal,
  handleLanguageChange,
  handleDefaultTeamNameChange,
  handleShowAppGuide,
  handleHardResetApp,
  closePlayerAssessmentModal,
  handleSavePlayerAssessment,
  handleDeletePlayerAssessment,
  signOut,
  selectedPlayerForStats,
  playersForCurrentGame = [],
  playerAssessments = [],
  appLanguage = 'en',
  defaultTeamNameSetting = '',
  MigrationModalComponent,
  
  // Mutations
  addSeasonMutation,
  addTournamentMutation,
  updateSeasonMutation,
  deleteSeasonMutation,
  updateTournamentMutation,
  deleteTournamentMutation,
}: ExtendedModalManagerProps) {
  // Suppress unused variable warnings for handlers not yet fully integrated
  void _onStartNewGame;
  void _onSaveGame;
  void _onUpdateGameSettings;
  void _onSeasonTournamentAction;
  
  // Get state from context
  const { gameState, timeElapsedInSeconds, availablePlayers } = useGameStateContext();
  
  // Use modal data from props or fall back to context
  const gameData = modalData?.gameState || gameState;
  const players = modalData?.availablePlayers || availablePlayers;
  const savedGames = modalData?.savedGames || {};
  const seasons = modalData?.seasons || [];
  const tournaments = modalData?.tournaments || [];
  
  return (
    <>
      {/* Training Resources Modal */}
      <React.Suspense fallback={<ModalSkeleton title="Training Resources" />}>
        <TrainingResourcesModal
          isOpen={modalStates.isTrainingResourcesModalOpen || isTrainingResourcesOpen}
          onClose={handleToggleTrainingResources || (() => onCloseModal?.('isTrainingResourcesModalOpen'))}
        />
      </React.Suspense>
      
      {/* Instructions Modal */}
      <React.Suspense fallback={<ModalSkeleton title="Instructions" />}>
        <InstructionsModal
          isOpen={modalStates.isInstructionsModalOpen || isInstructionsModalOpen}
          onClose={handleToggleInstructionsModal || (() => onCloseModal?.('isInstructionsModalOpen'))}
        />
      </React.Suspense>
      
      {/* Goal Log Modal */}
      <GoalLogModal 
        isOpen={modalStates.isGoalLogModalOpen}
        onClose={() => onCloseModal?.('isGoalLogModalOpen')}
        onLogGoal={handleAddGoalEvent || (() => {})}
        onLogOpponentGoal={handleLogOpponentGoal || (() => {})}
        availablePlayers={playersForCurrentGame.filter(p => p && typeof p === 'object' && 'name' in p) as Player[]}
        currentTime={timeElapsedInSeconds}
      />
      
      {/* Game Stats Modal */}
      {modalStates.isGameStatsModalOpen && (
        <React.Suspense fallback={<GameStatsModalSkeleton />}>
          <GameStatsModal
            isOpen={modalStates.isGameStatsModalOpen}
            onClose={() => onCloseModal?.('isGameStatsModalOpen')}
            teamName={gameData.teamName}
            opponentName={gameData.opponentName}
            gameDate={gameData.gameDate}
            homeScore={gameData.homeScore}
            awayScore={gameData.awayScore}
            homeOrAway={gameData.homeOrAway}
            gameLocation={gameData.gameLocation}
            gameTime={gameData.gameTime}
            numPeriods={gameData.numberOfPeriods}
            periodDurationMinutes={gameData.periodDurationMinutes}
            availablePlayers={players}
            gameEvents={gameData.gameEvents}
            gameNotes={gameData.gameNotes}
            onUpdateGameEvent={handleUpdateGameEvent ? (updatedEvent: GameEvent) => handleUpdateGameEvent(updatedEvent.id, updatedEvent) : undefined}
            selectedPlayerIds={gameData.selectedPlayerIds}
            savedGames={savedGames}
            currentGameId={modalData?.processingGameId || null}
            onDeleteGameEvent={handleDeleteGameEvent}
            onExportOneJson={handleExportOneJsonWrapper}
            onExportOneCsv={handleExportOneCsvWrapper}
            onExportAggregateJson={handleExportAggregateJson}
            onExportAggregateCsv={handleExportAggregateCsv}
            initialSelectedPlayerId={(selectedPlayerForStats as Record<string, unknown>)?.id as string | undefined}
            onGameClick={handleGameLogClick}
          />
        </React.Suspense>
      )}
      
      {/* Load Game Modal */}
      <React.Suspense fallback={<LoadGameModalSkeleton />}>
        <LoadGameModal 
          isOpen={modalStates.isLoadGameModalOpen}
          onClose={handleCloseLoadGameModal || (() => onCloseModal?.('isLoadGameModalOpen'))}
          savedGames={savedGames} 
          onLoad={onLoadGame || (() => {})}
          onDelete={onDeleteGame || (() => {})}
          onExportOneJson={handleExportOneJsonWrapper || (() => {})}
          onExportOneCsv={handleExportOneCsvWrapper || (() => {})}
          currentGameId={modalData?.processingGameId || undefined}
          isLoadingGamesList={modalData?.isLoadingGamesList}
          loadGamesListError={modalData?.loadGamesListError}
          isGameLoading={modalData?.isGameLoading}
          gameLoadError={modalData?.gameLoadError}
          processingGameId={modalData?.processingGameId}
        />
      </React.Suspense>

      {/* New Game Setup Modal */}
      {modalStates.isNewGameSetupModalOpen && (
        <React.Suspense fallback={<ModalSkeleton title="New Game Setup" />}>
          <NewGameSetupModal
            isOpen={modalStates.isNewGameSetupModalOpen}
            initialPlayerSelection={playerIdsForNewGame || null}
            availablePlayers={players}
            demandFactor={newGameDemandFactor}
            onDemandFactorChange={setNewGameDemandFactor || (() => {})}
            onStart={handleStartNewGameWithSetup as (...args: unknown[]) => Promise<void> || (async (): Promise<void> => {})}
            onCancel={handleCancelNewGameSetup || (() => {})}
            addSeasonMutation={addSeasonMutation as any} // eslint-disable-line @typescript-eslint/no-explicit-any
            addTournamentMutation={addTournamentMutation as any} // eslint-disable-line @typescript-eslint/no-explicit-any
            isAddingSeason={(addSeasonMutation as Record<string, unknown>)?.isPending as boolean}
            isAddingTournament={(addTournamentMutation as Record<string, unknown>)?.isPending as boolean}
          />
        </React.Suspense>
      )}

      {/* Roster Settings Modal */}
      <React.Suspense fallback={<RosterModalSkeleton />}>
        <RosterSettingsModal
          isOpen={modalStates.isRosterModalOpen}
          onClose={closeRosterModal || (() => onCloseModal?.('isRosterModalOpen'))}
          availablePlayers={players}
          onRenamePlayer={handleRenamePlayerForModal ? (playerId: string, playerData: { name: string; nickname: string }) => handleRenamePlayerForModal(playerId, playerData.name) : (() => {})}
          onSetJerseyNumber={handleSetJerseyNumberForModal || (() => {})}
          onSetPlayerNotes={handleSetPlayerNotesForModal || (() => {})}
          onRemovePlayer={handleRemovePlayerForModal || (() => {})} 
          onAddPlayer={handleAddPlayerForModal || (() => {})}
          selectedPlayerIds={gameData.selectedPlayerIds}
          onTogglePlayerSelection={handleTogglePlayerSelection || (() => {})}
          teamName={gameData.teamName}
          onTeamNameChange={handleTeamNameChange || (() => {})}
          isRosterUpdating={isRosterUpdating}
          rosterError={rosterError}
          onOpenPlayerStats={handleOpenPlayerStats || (() => {})}
        />
      </React.Suspense>

      {/* Season/Tournament Management Modal */}
      <React.Suspense fallback={<ModalSkeleton title="Season & Tournament Management" />}>
        <SeasonTournamentManagementModal
          isOpen={modalStates.isSeasonTournamentModalOpen}
          onClose={handleCloseSeasonTournamentModal || (() => onCloseModal?.('isSeasonTournamentModalOpen'))}
          seasons={seasons}
          tournaments={tournaments}
          availablePlayers={players}
          addSeasonMutation={addSeasonMutation as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          addTournamentMutation={addTournamentMutation as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          updateSeasonMutation={updateSeasonMutation as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          deleteSeasonMutation={deleteSeasonMutation as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          updateTournamentMutation={updateTournamentMutation as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          deleteTournamentMutation={deleteTournamentMutation as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        />
      </React.Suspense>
      
      {/* Game Settings Modal */}
      <React.Suspense fallback={<ModalSkeleton title="Game Settings" />}>
        <GameSettingsModal
          isOpen={modalStates.isGameSettingsModalOpen}
          onClose={handleCloseGameSettingsModal || (() => onCloseModal?.('isGameSettingsModalOpen'))}
          currentGameId={modalData?.processingGameId || null}
          teamName={gameData.teamName}
          opponentName={gameData.opponentName}
          gameDate={gameData.gameDate}
          gameLocation={gameData.gameLocation}
          gameTime={gameData.gameTime}
          gameNotes={gameData.gameNotes}
          ageGroup={gameData.ageGroup}
          tournamentLevel={gameData.tournamentLevel}
          gameEvents={gameData.gameEvents}
          availablePlayers={players}
          selectedPlayerIds={gameData.selectedPlayerIds}
          onSelectedPlayersChange={(playerIds: string[]) => onPlayerAction?.('updateSelected', '', playerIds)}
          numPeriods={gameData.numberOfPeriods}
          periodDurationMinutes={gameData.periodDurationMinutes}
          demandFactor={gameData.demandFactor}
          onTeamNameChange={handleTeamNameChange || (() => {})}
          onOpponentNameChange={handleOpponentNameChange || (() => {})}
          onGameDateChange={handleGameDateChange || (() => {})}
          onGameLocationChange={handleGameLocationChange || (() => {})}
          onGameTimeChange={handleGameTimeChange || (() => {})}
          onAgeGroupChange={handleSetAgeGroup || (() => {})}
          onTournamentLevelChange={handleSetTournamentLevel || (() => {})}
          onUpdateGameEvent={handleUpdateGameEvent ? (updatedEvent: GameEvent) => handleUpdateGameEvent(updatedEvent.id, updatedEvent) : (() => {})}
          onAwardFairPlayCard={handleAwardFairPlayCard ? (playerId: string | null) => handleAwardFairPlayCard(playerId || '') : (() => {})}
          onDeleteGameEvent={handleDeleteGameEvent}
          onNumPeriodsChange={handleSetNumberOfPeriods || (() => {})}
          onPeriodDurationChange={handleSetPeriodDuration || (() => {})}
          onDemandFactorChange={handleSetDemandFactor || (() => {})}
          seasonId={gameData.seasonId}
          tournamentId={gameData.tournamentId}
          onSeasonIdChange={handleSetSeasonId ? (seasonId: string | undefined) => handleSetSeasonId(seasonId || '') : (() => {})}
          onTournamentIdChange={handleSetTournamentId ? (tournamentId: string | undefined) => handleSetTournamentId(tournamentId || '') : (() => {})}
          homeOrAway={gameData.homeOrAway}
          onSetHomeOrAway={handleSetHomeOrAway || (() => {})}
          isPlayed={false}
          onIsPlayedChange={handleSetIsPlayed || (() => {})}
          addSeasonMutation={addSeasonMutation as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          addTournamentMutation={addTournamentMutation as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          isAddingSeason={(addSeasonMutation as Record<string, unknown>)?.isPending as boolean}
          isAddingTournament={(addTournamentMutation as Record<string, unknown>)?.isPending as boolean}
          timeElapsedInSeconds={timeElapsedInSeconds}
          updateGameDetailsMutation={updateGameDetailsMutation as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        />
      </React.Suspense>

      {/* Settings Modal */}
      <React.Suspense fallback={<ModalSkeleton title="Settings" />}>
        <SettingsModal
          isOpen={modalStates.isSettingsModalOpen}
          onClose={handleCloseSettingsModal || (() => onCloseModal?.('isSettingsModalOpen'))}
          language={modalData?.appLanguage || appLanguage}
          onLanguageChange={handleLanguageChange || (() => {})}
          defaultTeamName={modalData?.defaultTeamNameSetting || defaultTeamNameSetting}
          onDefaultTeamNameChange={handleDefaultTeamNameChange || (() => {})}
          onResetGuide={handleShowAppGuide || (() => {})}
          onHardResetApp={handleHardResetApp || (() => {})}
          onSignOut={signOut}
        />
      </React.Suspense>

      {/* Player Assessment Modal */}
      <React.Suspense fallback={<ModalSkeleton title="Player Assessment" />}>
        <PlayerAssessmentModal
          isOpen={modalStates.isPlayerAssessmentModalOpen}
          onClose={closePlayerAssessmentModal || (() => onCloseModal?.('isPlayerAssessmentModalOpen'))}
          selectedPlayerIds={gameData.selectedPlayerIds}
          availablePlayers={players}
          assessments={playerAssessments as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          onSave={handleSavePlayerAssessment || (() => {})}
          onDelete={handleDeletePlayerAssessment}
        />
      </React.Suspense>
      
      {/* Migration Modal */}
      {MigrationModalComponent}
    </>
  );
}