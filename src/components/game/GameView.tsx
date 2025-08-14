'use client';

import React from 'react';
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import GameInfoBar from '@/components/GameInfoBar';
import TimerOverlay from '@/components/TimerOverlay';
import { GameViewProps } from '@/types/gameComponents';
import { useGameStateContext } from './GameStateProvider';
import { Point, TacticalDisc, Opponent } from '@/types';

interface ExtendedGameViewProps extends Partial<GameViewProps> {
  // UI state
  showLargeTimerOverlay?: boolean;
  isTacticsBoardView?: boolean;

  // Timer and game state
  timeElapsedInSeconds?: number;
  isTimerRunning?: boolean;
  subAlertLevel?: number;
  lastSubConfirmationTimeSeconds?: number;

  // Tactical board state
  tacticalDrawings?: unknown[];
  tacticalDiscs?: unknown[];
  tacticalBallPosition?: unknown;

  // Style
  barStyle?: string;

  // Additional handlers from HomePage
  handlePlayerDragStartFromBar?: (player: unknown) => void;
  handleDeselectPlayer?: () => void;
  handlePlayerTapInBar?: (player: unknown) => void;
  handleToggleGoalie?: (playerId: string) => void;
  handleTeamNameChange?: (name: string) => void;
  handleOpponentNameChange?: (name: string) => void;
  handlePlayerMove?: (playerId: string, position: unknown) => void;
  handlePlayerMoveEnd?: (playerId: string, position: unknown) => void;
  handlePlayerRemove?: (playerId: string) => void;
  handleOpponentMove?: (opponentId: string, position: unknown) => void;
  handleOpponentMoveEnd?: (opponentId: string, position: unknown) => void;
  handleOpponentRemove?: (opponentId: string) => void;
  handleDropOnField?: (player: unknown, position: unknown) => void;
  handleDrawingStart?: (position: unknown) => void;
  handleDrawingAddPoint?: (position: unknown) => void;
  handleDrawingEnd?: () => void;
  handleTacticalDrawingStart?: (position: unknown) => void;
  handleTacticalDrawingAddPoint?: (position: unknown) => void;
  handleTacticalDrawingEnd?: () => void;
  handlePlayerDropViaTouch?: (player: unknown, position: unknown) => void;
  handlePlayerDragCancelViaTouch?: () => void;
  handleTacticalDiscMove?: (discId: string, position: unknown) => void;
  handleTacticalDiscRemove?: (discId: string) => void;
  handleToggleTacticalDiscType?: (discId: string) => void;
  handleTacticalBallMove?: (position: unknown) => void;

  // Timer overlay handlers
  handleSubstitutionMade?: () => void;
  handleSetSubInterval?: (minutes: number) => void;
  handleStartPauseTimer?: () => void;
  handleResetTimer?: () => void;
  handleToggleGoalLogModal?: () => void;
  handleLogOpponentGoal?: (timeInSeconds: number) => void;
  handleToggleLargeTimerOverlay?: () => void;

  // Loading state
  initialLoadComplete?: boolean;
}

/**
 * GameView component handles the visual game interface:
 * - Player bar (top)
 * - Game info bar (top) 
 * - Soccer field (center)
 * - Timer overlay (when active)
 * 
 * This component focuses purely on rendering the game view and
 * delegating interactions to parent handlers.
 */
export const GameView = React.memo<ExtendedGameViewProps>(({
  // UI state
  showLargeTimerOverlay = true,
  isTacticsBoardView = false,
  barStyle = "flex-shrink-0 bg-slate-800",

  // Timer and game state
  timeElapsedInSeconds = 0,
  isTimerRunning = false,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  subAlertLevel = 0,
  lastSubConfirmationTimeSeconds = 0,

  // Tactical board state
  tacticalDrawings = [],
  tacticalDiscs = [],
  tacticalBallPosition = null,

  // Loading state
  initialLoadComplete = true,

  // Event handlers (required)
  handlePlayerDragStartFromBar,
  handleDeselectPlayer,
  handlePlayerTapInBar,
  handleToggleGoalie,
  handleTeamNameChange,
  handleOpponentNameChange,
  handlePlayerMove,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handlePlayerMoveEnd,
  handlePlayerRemove,
  handleOpponentMove,
  handleOpponentMoveEnd,
  handleOpponentRemove,
  handleDropOnField,
  handleDrawingStart,
  handleDrawingAddPoint,
  handleDrawingEnd,
  handleTacticalDrawingStart,
  handleTacticalDrawingAddPoint,
  handleTacticalDrawingEnd,
  handlePlayerDropViaTouch,
  handlePlayerDragCancelViaTouch,
  handleTacticalDiscMove,
  handleTacticalDiscRemove,
  handleToggleTacticalDiscType,
  handleTacticalBallMove,

  // Timer overlay handlers
  handleSubstitutionMade,
  handleSetSubInterval,
  handleStartPauseTimer,
  handleResetTimer,
  handleToggleGoalLogModal,
  handleLogOpponentGoal,
  handleToggleLargeTimerOverlay,
}: ExtendedGameViewProps) => {
  // Get state from context
  const {
    gameState,
    availablePlayers,
    playersOnField,
    opponents,
    drawings,
  } = useGameStateContext();

  // Placeholder for dragging info - will be implemented later
  const draggingPlayerFromBarInfo = null;

  // Determine which players are available for the current game based on selected IDs
  const playersForCurrentGame = availablePlayers.filter(player =>
    gameState.selectedPlayerIds.includes(player.id)
  );

  return (
    <>
      {/* Top Section: Player Bar, Game Info */}
      <div className={barStyle}>
        <PlayerBar
          players={playersForCurrentGame}
          playersOnField={playersOnField}
          onPlayerDragStartFromBar={handlePlayerDragStartFromBar}
          selectedPlayerIdFromBar={null}
          onBarBackgroundClick={handleDeselectPlayer}
          gameEvents={gameState.gameEvents}
          onPlayerTapInBar={handlePlayerTapInBar}
          onToggleGoalie={handleToggleGoalie}
        />
        <GameInfoBar
          teamName={gameState.teamName}
          opponentName={gameState.opponentName}
          homeScore={gameState.homeScore}
          awayScore={gameState.awayScore}
          onTeamNameChange={handleTeamNameChange || (() => { })}
          onOpponentNameChange={handleOpponentNameChange || (() => { })}
          homeOrAway={gameState.homeOrAway}
        />
      </div>

      {/* Main Content: Soccer Field */}
      <div className="flex-grow relative bg-black">
        {/* Timer Overlay */}
        {showLargeTimerOverlay && (
          <TimerOverlay
            timeElapsedInSeconds={timeElapsedInSeconds}
            subAlertLevel={'none' as 'none' | 'warning' | 'due'}
            onSubstitutionMade={handleSubstitutionMade || (() => { })}
            completedIntervalDurations={gameState.completedIntervalDurations || []}
            subIntervalMinutes={gameState.subIntervalMinutes}
            onSetSubInterval={handleSetSubInterval || (() => { })}
            isTimerRunning={isTimerRunning}
            onStartPauseTimer={handleStartPauseTimer || (() => { })}
            onResetTimer={handleResetTimer || (() => { })}
            onToggleGoalLogModal={handleToggleGoalLogModal}
            onRecordOpponentGoal={() => handleLogOpponentGoal?.(timeElapsedInSeconds)}
            teamName={gameState.teamName}
            opponentName={gameState.opponentName}
            homeScore={gameState.homeScore}
            awayScore={gameState.awayScore}
            homeOrAway={gameState.homeOrAway}
            lastSubTime={lastSubConfirmationTimeSeconds}
            numberOfPeriods={gameState.numberOfPeriods}
            periodDurationMinutes={gameState.periodDurationMinutes}
            currentPeriod={gameState.currentPeriod}
            gameStatus={gameState.gameStatus}
            onOpponentNameChange={handleOpponentNameChange || (() => { })}
            onClose={handleToggleLargeTimerOverlay}
            isLoaded={initialLoadComplete}
          />
        )}

        {/* Soccer Field */}
        <SoccerField
          players={playersOnField}
          opponents={opponents as Opponent[]}
          drawings={(isTacticsBoardView ? tacticalDrawings : drawings) as Point[][]}
          onPlayerMove={handlePlayerMove ? (playerId: string, relX: number, relY: number) => handlePlayerMove(playerId, { relX, relY }) : (() => { })}
          onPlayerMoveEnd={() => { }}
          onPlayerRemove={handlePlayerRemove || (() => { })}
          onOpponentMove={handleOpponentMove ? (opponentId: string, relX: number, relY: number) => handleOpponentMove(opponentId, { relX, relY }) : (() => { })}
          onOpponentMoveEnd={handleOpponentMoveEnd ? (opponentId: string) => handleOpponentMoveEnd(opponentId, { relX: 0, relY: 0 }) : (() => { })}
          onOpponentRemove={handleOpponentRemove || (() => { })}
          onPlayerDrop={handleDropOnField || (() => { })}
          showPlayerNames={gameState.showPlayerNames}
          onDrawingStart={(isTacticsBoardView ? handleTacticalDrawingStart : handleDrawingStart) || (() => { })}
          onDrawingAddPoint={(isTacticsBoardView ? handleTacticalDrawingAddPoint : handleDrawingAddPoint) || (() => { })}
          onDrawingEnd={(isTacticsBoardView ? handleTacticalDrawingEnd : handleDrawingEnd) || (() => { })}
          draggingPlayerFromBarInfo={draggingPlayerFromBarInfo}
          onPlayerDropViaTouch={handlePlayerDropViaTouch || (() => { })}
          onPlayerDragCancelViaTouch={handlePlayerDragCancelViaTouch || (() => { })}
          timeElapsedInSeconds={timeElapsedInSeconds}
          isTacticsBoardView={isTacticsBoardView}
          tacticalDiscs={(tacticalDiscs as TacticalDisc[]) || []}
          onTacticalDiscMove={handleTacticalDiscMove || (() => { })}
          onTacticalDiscRemove={handleTacticalDiscRemove || (() => { })}
          onToggleTacticalDiscType={handleToggleTacticalDiscType || (() => { })}
          tacticalBallPosition={(tacticalBallPosition as Point) || null}
          onTacticalBallMove={handleTacticalBallMove || (() => { })}
        />
      </div>
    </>
  );
});

GameView.displayName = 'GameView';