import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import { GameControls } from '../GameControls.migration';
import { MigratedGameControls } from '../MigratedGameControls';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';

// Mock dependencies
jest.mock('@/hooks/useMigrationSafety', () => ({
  useMigrationSafety: jest.fn(),
}));

jest.mock('../GameControls', () => ({
  GameControls: function MockLegacyGameControls(props: any) {
    return <div data-testid="legacy-game-controls">Legacy GameControls</div>;
  },
}));

jest.mock('@/components/ControlBar', () => {
  return function MockControlBar({
    onUndo,
    onRedo,
    canUndo,
    canRedo,
    onResetField,
    onClearDrawings,
    onAddOpponent,
    onPlaceAllPlayers,
    onToggleGoalLogModal,
    onToggleGameStatsModal,
    onOpenLoadGameModal,
    onStartNewGame,
    onOpenRosterModal,
    onToggleTacticsBoard,
    onAddHomeDisc,
    onAddOpponentDisc,
    isTacticsBoardView,
    isGameLoaded,
    onQuickSave,
    onOpenGameSettingsModal,
    onToggleInstructionsModal,
    onOpenSettingsModal,
    ...props
  }: any) {
    return (
      <div data-testid="control-bar">
        <button data-testid="undo-btn" onClick={onUndo} disabled={!canUndo}>
          Undo {canUndo ? '(enabled)' : '(disabled)'}
        </button>
        <button data-testid="redo-btn" onClick={onRedo} disabled={!canRedo}>
          Redo {canRedo ? '(enabled)' : '(disabled)'}
        </button>
        <button data-testid="reset-field-btn" onClick={onResetField}>Reset Field</button>
        <button data-testid="clear-drawings-btn" onClick={onClearDrawings}>Clear Drawings</button>
        <button data-testid="add-opponent-btn" onClick={onAddOpponent}>Add Opponent</button>
        <button data-testid="place-all-players-btn" onClick={onPlaceAllPlayers}>Place All Players</button>
        <button data-testid="toggle-goal-log-btn" onClick={onToggleGoalLogModal}>Goal Log</button>
        <button data-testid="toggle-game-stats-btn" onClick={onToggleGameStatsModal}>Game Stats</button>
        <button data-testid="open-load-game-btn" onClick={onOpenLoadGameModal}>Load Game</button>
        <button data-testid="start-new-game-btn" onClick={onStartNewGame}>New Game</button>
        <button data-testid="open-roster-btn" onClick={onOpenRosterModal}>Roster</button>
        <button data-testid="toggle-tactics-btn" onClick={onToggleTacticsBoard}>
          Tactics: {isTacticsBoardView ? 'ON' : 'OFF'}
        </button>
        <button data-testid="add-home-disc-btn" onClick={onAddHomeDisc}>Add Home Disc</button>
        <button data-testid="add-opponent-disc-btn" onClick={onAddOpponentDisc}>Add Opponent Disc</button>
        <button data-testid="quick-save-btn" onClick={onQuickSave}>Quick Save</button>
        <button data-testid="game-settings-btn" onClick={onOpenGameSettingsModal}>Game Settings</button>
        <button data-testid="instructions-btn" onClick={onToggleInstructionsModal}>Instructions</button>
        <button data-testid="settings-btn" onClick={onOpenSettingsModal}>Settings</button>
        <span data-testid="game-loaded-indicator">{isGameLoaded ? 'Game Loaded' : 'No Game'}</span>
      </div>
    );
  };
});

import { useMigrationSafety } from '@/hooks/useMigrationSafety';

const mockUseMigrationSafety = useMigrationSafety as jest.MockedFunction<typeof useMigrationSafety>;

const mockGameEvent = {
  id: 'event-1',
  type: 'goal' as const,
  playerId: 'player-1',
  timeSeconds: 1200,
  period: 1,
  details: { location: { x: 0.8, y: 0.5 } },
};

const mockPlayer = {
  id: 'player-1',
  name: 'John Doe',
  color: '#4285f4',
  relX: 0.3,
  relY: 0.4,
  overallRating: 80,
  assessments: {},
  isGoalie: false,
};

const defaultProps = {
  canUndo: false,
  canRedo: false,
  isTacticsBoardView: false,
  highlightRosterButton: false,
  isGameLoaded: false,
  showLargeTimerOverlay: false,
  onUndo: jest.fn(),
  onRedo: jest.fn(),
  onResetField: jest.fn(),
  onClearDrawings: jest.fn(),
  onAddOpponent: jest.fn(),
  onToggleTrainingResources: jest.fn(),
  onToggleTacticsBoard: jest.fn(),
  onAddHomeDisc: jest.fn(),
  onAddOpponentDisc: jest.fn(),
  onPlaceAllPlayers: jest.fn(),
  onSignOut: jest.fn(),
  onToggleLargeTimerOverlay: jest.fn(),
  onToggleGoalLogModal: jest.fn(),
  onToggleGameStatsModal: jest.fn(),
  onOpenLoadGameModal: jest.fn(),
  onStartNewGame: jest.fn(),
  onOpenRosterModal: jest.fn(),
  onQuickSave: jest.fn(),
  onOpenGameSettingsModal: jest.fn(),
  onOpenSeasonTournamentModal: jest.fn(),
  onToggleInstructionsModal: jest.fn(),
  onOpenSettingsModal: jest.fn(),
};

describe('GameControls Migration', () => {
  beforeEach(() => {
    // Reset stores
    act(() => {
      useGameStore.getState().resetGameSession();
      useGameStore.getState().resetField();
      useUIStore.getState().resetView();
    });
    
    jest.clearAllMocks();
  });

  describe('Migration Wrapper', () => {
    it('should use legacy component when migration is disabled', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
        componentStatus: {
          useLegacy: true,
          isMigrated: false,
          hasFailed: false,
          lastError: null,
        },
        migrationStatus: {} as any,
        withSafety: jest.fn(),
        markMigrated: jest.fn(),
        markFailed: jest.fn(),
        isMigrationInProgress: false,
        canUseMigratedState: false,
      });
      
      const { getByTestId } = render(<GameControls {...defaultProps} />);
      
      expect(getByTestId('legacy-game-controls')).toBeInTheDocument();
    });
    
    it('should use migrated component when migration is enabled', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
        componentStatus: {
          useLegacy: false,
          isMigrated: true,
          hasFailed: false,
          lastError: null,
        },
        migrationStatus: {} as any,
        withSafety: jest.fn(),
        markMigrated: jest.fn(),
        markFailed: jest.fn(),
        isMigrationInProgress: true,
        canUseMigratedState: true,
      });
      
      const { getByTestId, queryByTestId } = render(<GameControls {...defaultProps} />);
      
      expect(queryByTestId('legacy-game-controls')).not.toBeInTheDocument();
      expect(getByTestId('control-bar')).toBeInTheDocument();
    });
  });

  describe('Migrated Component', () => {
    beforeEach(() => {
      // Set up store with test data
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.setGameId('test-game-1');
        gameStore.addGameEvent(mockGameEvent);
        gameStore.setAvailablePlayers([mockPlayer]);
        
        const uiStore = useUIStore.getState();
        uiStore.setTacticsBoardView(false);
      });
    });

    it('should render control bar with all buttons', () => {
      const { getByTestId } = render(<MigratedGameControls {...defaultProps} />);
      
      expect(getByTestId('control-bar')).toBeInTheDocument();
      expect(getByTestId('undo-btn')).toBeInTheDocument();
      expect(getByTestId('redo-btn')).toBeInTheDocument();
      expect(getByTestId('reset-field-btn')).toBeInTheDocument();
      expect(getByTestId('clear-drawings-btn')).toBeInTheDocument();
      expect(getByTestId('add-opponent-btn')).toBeInTheDocument();
      expect(getByTestId('place-all-players-btn')).toBeInTheDocument();
    });

    it('should use store values over props for state indicators', () => {
      const { getByTestId } = render(
        <MigratedGameControls 
          {...defaultProps}
          isGameLoaded={false}
          isTacticsBoardView={true}
        />
      );
      
      // Should show game loaded (from store gameId)
      expect(getByTestId('game-loaded-indicator')).toHaveTextContent('Game Loaded');
      
      // Should show tactics OFF (from store, not prop)
      expect(getByTestId('toggle-tactics-btn')).toHaveTextContent('Tactics: OFF');
    });

    it('should enable undo when game events exist in store', () => {
      const { getByTestId } = render(
        <MigratedGameControls {...defaultProps} canUndo={false} />
      );
      
      // Should be enabled due to game event in store
      expect(getByTestId('undo-btn')).toHaveTextContent('Undo (enabled)');
      expect(getByTestId('undo-btn')).not.toBeDisabled();
    });

    it('should handle undo action with store updates', () => {
      const mockOnUndo = jest.fn();
      
      const { getByTestId } = render(
        <MigratedGameControls {...defaultProps} onUndo={mockOnUndo} />
      );
      
      // Click undo button
      fireEvent.click(getByTestId('undo-btn'));
      
      // Should remove game event from store
      const gameEvents = useGameStore.getState().gameSession.gameEvents;
      expect(gameEvents).toHaveLength(0);
      
      // Should call parent handler
      expect(mockOnUndo).toHaveBeenCalled();
    });

    it('should handle field reset with store updates', () => {
      const mockOnResetField = jest.fn();
      
      // Add some field data first
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.setPlayersOnField([mockPlayer]);
        gameStore.addDrawing([{ relX: 0.5, relY: 0.5 }]);
      });
      
      const { getByTestId } = render(
        <MigratedGameControls {...defaultProps} onResetField={mockOnResetField} />
      );
      
      // Click reset field button
      fireEvent.click(getByTestId('reset-field-btn'));
      
      // Should clear field data in store
      const field = useGameStore.getState().field;
      expect(field.playersOnField).toHaveLength(0);
      expect(field.drawings).toHaveLength(0);
      
      // Should call parent handler
      expect(mockOnResetField).toHaveBeenCalled();
    });

    it('should handle clear drawings with store updates', () => {
      const mockOnClearDrawings = jest.fn();
      
      // Add drawings first
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.addDrawing([{ relX: 0.5, relY: 0.5 }]);
        gameStore.addDrawing([{ relX: 0.3, relY: 0.3 }]);
      });
      
      const { getByTestId } = render(
        <MigratedGameControls {...defaultProps} onClearDrawings={mockOnClearDrawings} />
      );
      
      // Click clear drawings button
      fireEvent.click(getByTestId('clear-drawings-btn'));
      
      // Should clear drawings in store
      const drawings = useGameStore.getState().field.drawings;
      expect(drawings).toHaveLength(0);
      
      // Should call parent handler
      expect(mockOnClearDrawings).toHaveBeenCalled();
    });

    it('should handle tactics board toggle with store updates', () => {
      const mockOnToggleTactics = jest.fn();
      
      const { getByTestId } = render(
        <MigratedGameControls {...defaultProps} onToggleTacticsBoard={mockOnToggleTactics} />
      );
      
      // Initially should be OFF
      expect(getByTestId('toggle-tactics-btn')).toHaveTextContent('Tactics: OFF');
      
      // Click toggle button
      fireEvent.click(getByTestId('toggle-tactics-btn'));
      
      // Should update store
      const isTacticsBoardView = useUIStore.getState().view.isTacticsBoardView;
      expect(isTacticsBoardView).toBe(true);
      
      // Should call parent handler
      expect(mockOnToggleTactics).toHaveBeenCalled();
    });

    it('should handle add tactical discs with store updates', () => {
      const mockOnAddHomeDisc = jest.fn();
      const mockOnAddOpponentDisc = jest.fn();
      
      const { getByTestId } = render(
        <MigratedGameControls 
          {...defaultProps} 
          onAddHomeDisc={mockOnAddHomeDisc}
          onAddOpponentDisc={mockOnAddOpponentDisc}
        />
      );
      
      // Add home disc
      fireEvent.click(getByTestId('add-home-disc-btn'));
      
      // Should add disc to store
      let tacticalDiscs = useGameStore.getState().field.tacticalDiscs;
      expect(tacticalDiscs).toHaveLength(1);
      expect(tacticalDiscs[0].type).toBe('home');
      expect(mockOnAddHomeDisc).toHaveBeenCalled();
      
      // Add opponent disc
      fireEvent.click(getByTestId('add-opponent-disc-btn'));
      
      // Should add second disc to store
      tacticalDiscs = useGameStore.getState().field.tacticalDiscs;
      expect(tacticalDiscs).toHaveLength(2);
      expect(tacticalDiscs[1].type).toBe('opponent');
      expect(mockOnAddOpponentDisc).toHaveBeenCalled();
    });

    it('should handle place all players with formation positioning', () => {
      const mockOnPlaceAll = jest.fn();
      
      // Add more players to available list
      const players = Array.from({ length: 11 }, (_, i) => ({
        ...mockPlayer,
        id: `player-${i + 1}`,
        name: `Player ${i + 1}`,
      }));
      
      act(() => {
        useGameStore.getState().setAvailablePlayers(players);
      });
      
      const { getByTestId } = render(
        <MigratedGameControls {...defaultProps} onPlaceAllPlayers={mockOnPlaceAll} />
      );
      
      // Click place all players button
      fireEvent.click(getByTestId('place-all-players-btn'));
      
      // Should place players on field in formation
      const playersOnField = useGameStore.getState().field.playersOnField;
      expect(playersOnField).toHaveLength(11);
      
      // First player should be goalkeeper (left side)
      expect(playersOnField[0].relX).toBe(0.1);
      expect(playersOnField[0].relY).toBe(0.5);
      
      // Should call parent handler
      expect(mockOnPlaceAll).toHaveBeenCalled();
    });

    it('should handle modal operations through UI store', () => {
      const mockOnGoalLog = jest.fn();
      const mockOnGameStats = jest.fn();
      const mockOnLoadGame = jest.fn();
      
      const { getByTestId } = render(
        <MigratedGameControls 
          {...defaultProps} 
          onToggleGoalLogModal={mockOnGoalLog}
          onToggleGameStatsModal={mockOnGameStats}
          onOpenLoadGameModal={mockOnLoadGame}
        />
      );
      
      // Toggle goal log modal
      fireEvent.click(getByTestId('toggle-goal-log-btn'));
      expect(useUIStore.getState().modals.goalLogModal).toBe(true);
      expect(mockOnGoalLog).toHaveBeenCalled();
      
      // Toggle game stats modal
      fireEvent.click(getByTestId('toggle-game-stats-btn'));
      expect(useUIStore.getState().modals.gameStatsModal).toBe(true);
      expect(mockOnGameStats).toHaveBeenCalled();
      
      // Open load game modal
      fireEvent.click(getByTestId('open-load-game-btn'));
      expect(useUIStore.getState().modals.loadGameModal).toBe(true);
      expect(mockOnLoadGame).toHaveBeenCalled();
    });

    it('should handle add opponent with store updates', () => {
      const mockOnAddOpponent = jest.fn();
      
      const { getByTestId } = render(
        <MigratedGameControls {...defaultProps} onAddOpponent={mockOnAddOpponent} />
      );
      
      // Click add opponent button
      fireEvent.click(getByTestId('add-opponent-btn'));
      
      // Should add opponent to store
      const opponents = useGameStore.getState().field.opponents;
      expect(opponents).toHaveLength(1);
      expect(opponents[0].relX).toBe(0.8);
      expect(opponents[0].relY).toBe(0.5);
      
      // Should call parent handler
      expect(mockOnAddOpponent).toHaveBeenCalled();
    });

    it('should sync with store updates in real-time', () => {
      const { getByTestId, rerender } = render(<MigratedGameControls {...defaultProps} />);
      
      // Update store
      act(() => {
        const uiStore = useUIStore.getState();
        uiStore.setTacticsBoardView(true);
        
        const gameStore = useGameStore.getState();
        gameStore.setGameId(null); // Clear game ID
      });
      
      // Re-render to see updates
      rerender(<MigratedGameControls {...defaultProps} />);
      
      // Should reflect store changes
      expect(getByTestId('toggle-tactics-btn')).toHaveTextContent('Tactics: ON');
      expect(getByTestId('game-loaded-indicator')).toHaveTextContent('No Game');
    });

    it('should handle empty store state gracefully', () => {
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.resetGameSession();
        gameStore.resetField();
      });

      const { getByTestId } = render(<MigratedGameControls {...defaultProps} />);
      
      // Should disable undo when no events
      expect(getByTestId('undo-btn')).toHaveTextContent('Undo (disabled)');
      expect(getByTestId('undo-btn')).toBeDisabled();
      
      // Should show no game loaded
      expect(getByTestId('game-loaded-indicator')).toHaveTextContent('No Game');
    });
  });
});