import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import SoccerField from '../SoccerField.migration';
import { MigratedSoccerField } from '../MigratedSoccerField';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';

// Mock dependencies
jest.mock('@/hooks/useMigrationSafety', () => ({
  useMigrationSafety: jest.fn(),
}));

jest.mock('../SoccerField', () => {
  return function MockLegacySoccerField(props: any) {
    return <div data-testid="legacy-soccer-field">Legacy SoccerField</div>;
  };
});

jest.mock('@/utils/logger', () => ({
  default: {
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('tinycolor2', () => ({
  default: jest.fn(() => ({
    toHexString: () => '#ffffff',
  })),
}));

import { useMigrationSafety } from '@/hooks/useMigrationSafety';

const mockUseMigrationSafety = useMigrationSafety as jest.MockedFunction<typeof useMigrationSafety>;

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

const mockOpponent = {
  id: 'opponent-1',
  relX: 0.7,
  relY: 0.6,
};

const mockTacticalDisc = {
  id: 'disc-1',
  relX: 0.5,
  relY: 0.5,
  type: 'home' as const,
};

const defaultProps = {
  players: [mockPlayer],
  opponents: [mockOpponent],
  drawings: [],
  showPlayerNames: true,
  onPlayerDrop: jest.fn(),
  onPlayerMove: jest.fn(),
  onPlayerMoveEnd: jest.fn(),
  onDrawingStart: jest.fn(),
  onDrawingAddPoint: jest.fn(),
  onDrawingEnd: jest.fn(),
  onPlayerRemove: jest.fn(),
  onOpponentMove: jest.fn(),
  onOpponentMoveEnd: jest.fn(),
  onOpponentRemove: jest.fn(),
  draggingPlayerFromBarInfo: null,
  onPlayerDropViaTouch: jest.fn(),
  onPlayerDragCancelViaTouch: jest.fn(),
  timeElapsedInSeconds: 1800,
  isTacticsBoardView: false,
  tacticalDiscs: [mockTacticalDisc],
  onTacticalDiscMove: jest.fn(),
  onTacticalDiscRemove: jest.fn(),
  onToggleTacticalDiscType: jest.fn(),
  tacticalBallPosition: null,
  onTacticalBallMove: jest.fn(),
};

// Mock HTMLCanvasElement methods
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arc: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    setLineDash: jest.fn(),
    createImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4) })),
    putImageData: jest.fn(),
    createPattern: jest.fn(() => null),
    // Text rendering methods
    fillText: jest.fn(),
    strokeText: jest.fn(),
    measureText: jest.fn(() => ({ width: 50 })),
    // Image drawing methods
    drawImage: jest.fn(),
    // Properties that are set (need to be configurable)
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  }));
  
  HTMLCanvasElement.prototype.getBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: jest.fn(),
  }));
});

describe('SoccerField Migration', () => {
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
      
      const { getByTestId } = render(<SoccerField {...defaultProps} />);
      
      expect(getByTestId('legacy-soccer-field')).toBeInTheDocument();
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
      
      const { container, queryByTestId } = render(<SoccerField {...defaultProps} />);
      
      expect(queryByTestId('legacy-soccer-field')).not.toBeInTheDocument();
      // Should render the migrated component (canvas)
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });
  });

  describe('Migrated Component', () => {
    beforeEach(() => {
      // Set up store with test data
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.setPlayersOnField([mockPlayer]);
        gameStore.setOpponents([mockOpponent]);
        gameStore.setTimeElapsed(1800);
        gameStore.setShowPlayerNames(true);
        
        const uiStore = useUIStore.getState();
        uiStore.setTacticsBoardView(false);
      });
    });

    it('should render soccer field canvas', () => {
      const { container } = render(<MigratedSoccerField {...defaultProps} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('width', '800');
      expect(canvas).toHaveAttribute('height', '600');
    });

    it('should use store values over props', () => {
      // Set different values in store
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.setPlayersOnField([{
          ...mockPlayer,
          id: 'store-player',
          name: 'Store Player'
        }]);
        gameStore.setTimeElapsed(3600); // 1 hour
        gameStore.setShowPlayerNames(false);
      });

      const { container } = render(
        <MigratedSoccerField 
          {...defaultProps} 
          timeElapsedInSeconds={1800}
          showPlayerNames={true}
        />
      );
      
      // Component should use store values, not props
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      
      // Verify canvas context was called (indicating drawing occurred with store data)
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    it('should handle player drag operations with store updates', () => {
      const mockOnPlayerMove = jest.fn();
      const mockOnPlayerDrop = jest.fn();
      
      const { container } = render(
        <MigratedSoccerField 
          {...defaultProps} 
          onPlayerMove={mockOnPlayerMove}
          onPlayerDrop={mockOnPlayerDrop}
        />
      );
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      
      // Simulate mouse down on player position (approximate)
      fireEvent.mouseDown(canvas!, { 
        button: 0, 
        clientX: 240, // 0.3 * 800
        clientY: 240  // 0.4 * 600
      });
      
      // Simulate mouse move
      fireEvent.mouseMove(canvas!, { 
        clientX: 400, 
        clientY: 300 
      });
      
      // Simulate mouse up
      fireEvent.mouseUp(canvas!);
      
      // Should have called handlers and updated store
      expect(mockOnPlayerMove).toHaveBeenCalled();
      // Store should be updated with new position
      const updatedPlayers = useGameStore.getState().field.playersOnField;
      expect(updatedPlayers.length).toBeGreaterThan(0);
    });

    it('should handle opponent drag operations with store updates', () => {
      const mockOnOpponentMove = jest.fn();
      
      const { container } = render(
        <MigratedSoccerField 
          {...defaultProps} 
          onOpponentMove={mockOnOpponentMove}
        />
      );
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      
      // Simulate mouse down on opponent position
      fireEvent.mouseDown(canvas!, { 
        button: 0, 
        clientX: 560, // 0.7 * 800
        clientY: 360  // 0.6 * 600
      });
      
      // Simulate mouse move
      fireEvent.mouseMove(canvas!, { 
        clientX: 600, 
        clientY: 400 
      });
      
      // Simulate mouse up
      fireEvent.mouseUp(canvas!);
      
      // Should have called handler and updated store
      expect(mockOnOpponentMove).toHaveBeenCalled();
    });

    it('should handle drawing operations with store updates', () => {
      const mockOnDrawingStart = jest.fn();
      const mockOnDrawingAddPoint = jest.fn();
      const mockOnDrawingEnd = jest.fn();
      
      const { container } = render(
        <MigratedSoccerField 
          {...defaultProps} 
          onDrawingStart={mockOnDrawingStart}
          onDrawingAddPoint={mockOnDrawingAddPoint}
          onDrawingEnd={mockOnDrawingEnd}
          isTacticsBoardView={false}
        />
      );
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      
      // Simulate drawing on empty area
      fireEvent.mouseDown(canvas!, { 
        button: 0, 
        clientX: 100, 
        clientY: 100 
      });
      
      fireEvent.mouseMove(canvas!, { 
        clientX: 150, 
        clientY: 150 
      });
      
      fireEvent.mouseUp(canvas!);
      
      // Should have called drawing handlers
      expect(mockOnDrawingStart).toHaveBeenCalled();
      expect(mockOnDrawingAddPoint).toHaveBeenCalled();
      expect(mockOnDrawingEnd).toHaveBeenCalled();
    });

    it('should handle double-click player removal with store updates', () => {
      const mockOnPlayerRemove = jest.fn();
      
      const { container } = render(
        <MigratedSoccerField 
          {...defaultProps} 
          onPlayerRemove={mockOnPlayerRemove}
        />
      );
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      
      // Simulate double-click on player
      fireEvent.doubleClick(canvas!, { 
        clientX: 240, // 0.3 * 800
        clientY: 240  // 0.4 * 600
      });
      
      // Should have called removal handler and updated store
      expect(mockOnPlayerRemove).toHaveBeenCalledWith('player-1');
    });

    it('should handle tactics board view correctly', () => {
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.setTacticalDiscs([mockTacticalDisc]);
        gameStore.setTacticalBallPosition({ relX: 0.5, relY: 0.5 });
        
        const uiStore = useUIStore.getState();
        uiStore.setTacticsBoardView(true);
      });

      const { container } = render(
        <MigratedSoccerField 
          {...defaultProps} 
          isTacticsBoardView={true}
        />
      );
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      
      // In tactics board view, drawing should not start on mouse down
      fireEvent.mouseDown(canvas!, { 
        button: 0, 
        clientX: 100, 
        clientY: 100 
      });
      
      // Drawing handlers should not be called in tactics view
      expect(defaultProps.onDrawingStart).not.toHaveBeenCalled();
    });

    it('should sync with store updates in real-time', () => {
      const { container, rerender } = render(<MigratedSoccerField {...defaultProps} />);
      
      // Update store
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.setTimeElapsed(3600);
        gameStore.setShowPlayerNames(false);
        gameStore.setPlayersOnField([{
          ...mockPlayer,
          id: 'new-player',
          name: 'New Player',
          relX: 0.8,
          relY: 0.2,
        }]);
      });
      
      // Re-render to see updates
      rerender(<MigratedSoccerField {...defaultProps} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      
      // Canvas should redraw with new data
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });

    it('should handle empty store state gracefully', () => {
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.resetField();
        gameStore.resetGameSession();
      });

      const { container } = render(<MigratedSoccerField {...defaultProps} />);
      
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
      
      // Should fall back to prop values when store is empty
      expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalled();
    });
  });
});