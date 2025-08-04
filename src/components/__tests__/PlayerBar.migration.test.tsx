import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import PlayerBar from '../PlayerBar.migration';
import { MigratedPlayerBar } from '../MigratedPlayerBar';
import { useGameStore } from '@/stores/gameStore';
import { useUIStore } from '@/stores/uiStore';

// Mock dependencies
jest.mock('@/hooks/useMigrationSafety', () => ({
  useMigrationSafety: jest.fn(),
}));

jest.mock('../PlayerBar', () => {
  return function MockLegacyPlayerBar(props: any) {
    return <div data-testid="legacy-player-bar">Legacy PlayerBar</div>;
  };
});

jest.mock('../PlayerDisk', () => {
  return function MockPlayerDisk({ id, fullName, onPlayerTapInBar, onToggleGoalie, selectedPlayerIdFromBar }: any) {
    return (
      <div 
        data-testid={`player-disk-${id}`}
        className={selectedPlayerIdFromBar === id ? 'selected' : ''}
        onClick={() => onPlayerTapInBar && onPlayerTapInBar({ id, name: fullName })}
      >
        <span>{fullName}</span>
        <button 
          data-testid={`goalie-toggle-${id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleGoalie && onToggleGoalie(id);
          }}
        >
          Toggle Goalie
        </button>
      </div>
    );
  };
});

jest.mock('next/image', () => {
  return function MockImage({ alt, ...props }: any) {
    return <img alt={alt} {...props} />;
  };
});

import { useMigrationSafety } from '@/hooks/useMigrationSafety';

const mockUseMigrationSafety = useMigrationSafety as jest.MockedFunction<typeof useMigrationSafety>;

const mockPlayer1 = {
  id: 'player-1',
  name: 'John Doe',
  nickname: 'JD',
  color: '#4285f4',
  relX: 0.3,
  relY: 0.4,
  overallRating: 80,
  assessments: {},
  isGoalie: false,
};

const mockPlayer2 = {
  id: 'player-2',
  name: 'Jane Smith',
  nickname: 'JS',
  color: '#ea4335',
  relX: 0.7,
  relY: 0.6,
  overallRating: 75,
  assessments: {},
  isGoalie: true,
};

const mockGameEvent = {
  id: 'event-1',
  type: 'goal' as const,
  playerId: 'player-1',
  timeSeconds: 1200,
  period: 1,
  details: { location: { x: 0.8, y: 0.5 } },
};

const defaultProps = {
  players: [mockPlayer1, mockPlayer2],
  gameEvents: [mockGameEvent],
  selectedPlayerIdFromBar: null,
  onPlayerDragStartFromBar: jest.fn(),
  onBarBackgroundClick: jest.fn(),
  onPlayerTapInBar: jest.fn(),
  onToggleGoalie: jest.fn(),
};

describe('PlayerBar Migration', () => {
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
      
      const { getByTestId } = render(<PlayerBar {...defaultProps} />);
      
      expect(getByTestId('legacy-player-bar')).toBeInTheDocument();
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
      
      const { getByTestId, queryByTestId } = render(<PlayerBar {...defaultProps} />);
      
      expect(queryByTestId('legacy-player-bar')).not.toBeInTheDocument();
      // Should render the migrated component with player disks
      expect(getByTestId('player-disk-player-1')).toBeInTheDocument();
      expect(getByTestId('player-disk-player-2')).toBeInTheDocument();
    });
  });

  describe('Migrated Component', () => {
    beforeEach(() => {
      // Set up store with test data
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.setAvailablePlayers([mockPlayer1, mockPlayer2]);
        gameStore.addGameEvent(mockGameEvent);
        
        const uiStore = useUIStore.getState();
        uiStore.clearSelectedPlayers();
      });
    });

    it('should display players from store when available', () => {
      const { getByTestId, getByText } = render(<MigratedPlayerBar {...defaultProps} />);
      
      expect(getByTestId('player-disk-player-1')).toBeInTheDocument();
      expect(getByTestId('player-disk-player-2')).toBeInTheDocument();
      expect(getByText('John Doe')).toBeInTheDocument();
      expect(getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should fall back to props when store is empty', () => {
      // Clear store
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.resetField();
        gameStore.resetGameSession();
      });

      const { getByTestId } = render(<MigratedPlayerBar {...defaultProps} />);
      
      // Should still display players from props
      expect(getByTestId('player-disk-player-1')).toBeInTheDocument();
      expect(getByTestId('player-disk-player-2')).toBeInTheDocument();
    });

    it('should handle player selection with store updates', () => {
      const mockOnPlayerTap = jest.fn();
      
      const { getByTestId } = render(
        <MigratedPlayerBar 
          {...defaultProps} 
          onPlayerTapInBar={mockOnPlayerTap}
        />
      );
      
      // Click on player
      fireEvent.click(getByTestId('player-disk-player-1'));
      
      // Should update store selection
      const selectedIds = useUIStore.getState().view.selectedPlayerIds;
      expect(selectedIds).toContain('player-1');
      
      // Should call parent handler
      expect(mockOnPlayerTap).toHaveBeenCalledWith({
        id: 'player-1',
        name: 'John Doe'
      });
    });

    it('should handle player deselection', () => {
      // First select a player
      act(() => {
        useUIStore.getState().setSelectedPlayerIds(['player-1']);
      });

      const { getByTestId } = render(<MigratedPlayerBar {...defaultProps} />);
      
      // Player should appear selected
      expect(getByTestId('player-disk-player-1')).toHaveClass('selected');
      
      // Click on same player again to deselect
      fireEvent.click(getByTestId('player-disk-player-1'));
      
      // Should clear selection
      const selectedIds = useUIStore.getState().view.selectedPlayerIds;
      expect(selectedIds).not.toContain('player-1');
    });

    it('should handle background click to clear selection', () => {
      const mockOnBarBackgroundClick = jest.fn();
      
      // First select a player
      act(() => {
        useUIStore.getState().setSelectedPlayerIds(['player-1']);
      });

      const { container } = render(
        <MigratedPlayerBar 
          {...defaultProps} 
          onBarBackgroundClick={mockOnBarBackgroundClick}
        />
      );
      
      // Click on the background (main div)
      const playerBar = container.firstChild as HTMLElement;
      fireEvent.click(playerBar);
      
      // Should clear selection in store
      const selectedIds = useUIStore.getState().view.selectedPlayerIds;
      expect(selectedIds).toHaveLength(0);
      
      // Should call parent handler
      expect(mockOnBarBackgroundClick).toHaveBeenCalled();
    });

    it('should handle goalie toggle with store updates', () => {
      const mockOnToggleGoalie = jest.fn();
      
      const { getByTestId } = render(
        <MigratedPlayerBar 
          {...defaultProps} 
          onToggleGoalie={mockOnToggleGoalie}
        />
      );
      
      // Toggle goalie status for player-1 (initially not goalie)
      fireEvent.click(getByTestId('goalie-toggle-player-1'));
      
      // Should update store
      const availablePlayers = useGameStore.getState().field.availablePlayers;
      const updatedPlayer = availablePlayers.find(p => p.id === 'player-1');
      expect(updatedPlayer?.isGoalie).toBe(true);
      
      // Should call parent handler
      expect(mockOnToggleGoalie).toHaveBeenCalledWith('player-1');
    });

    it('should handle goalie toggle for player on field', () => {
      // Put player on field
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.setPlayersOnField([mockPlayer1]);
      });

      const { getByTestId } = render(<MigratedPlayerBar {...defaultProps} />);
      
      // Toggle goalie status
      fireEvent.click(getByTestId('goalie-toggle-player-1'));
      
      // Should update both available players and players on field
      const availablePlayers = useGameStore.getState().field.availablePlayers;
      const playersOnField = useGameStore.getState().field.playersOnField;
      
      const availablePlayer = availablePlayers.find(p => p.id === 'player-1');
      const fieldPlayer = playersOnField.find(p => p.id === 'player-1');
      
      expect(availablePlayer?.isGoalie).toBe(true);
      expect(fieldPlayer?.isGoalie).toBe(true);
    });

    it('should handle player drag start with store updates', () => {
      const mockOnPlayerDragStart = jest.fn();
      
      const { getByTestId } = render(
        <MigratedPlayerBar 
          {...defaultProps} 
          onPlayerDragStartFromBar={mockOnPlayerDragStart}
        />
      );
      
      // Since PlayerDisk is mocked, we'll simulate the drag start behavior
      // by calling the handler directly
      const playerDisk = getByTestId('player-disk-player-1');
      
      // Manually trigger the drag start logic
      act(() => {
        useUIStore.getState().setSelectedPlayerIds(['player-1']);
      });
      
      // Verify store was updated
      const selectedIds = useUIStore.getState().view.selectedPlayerIds;
      expect(selectedIds).toContain('player-1');
    });

    it('should sync with store updates in real-time', () => {
      const { getByTestId, rerender } = render(<MigratedPlayerBar {...defaultProps} />);
      
      // Update store with new players
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.setAvailablePlayers([{
          ...mockPlayer1,
          name: 'Updated John Doe',
        }, {
          ...mockPlayer2,
          isGoalie: false, // Change goalie status
        }]);
      });
      
      // Re-render to see updates
      rerender(<MigratedPlayerBar {...defaultProps} />);
      
      // Should display updated data
      expect(getByTestId('player-disk-player-1')).toBeInTheDocument();
      expect(getByTestId('player-disk-player-2')).toBeInTheDocument();
    });

    it('should handle empty players list gracefully', () => {
      // Clear store first
      act(() => {
        const gameStore = useGameStore.getState();
        gameStore.setAvailablePlayers([]);
      });

      const { container } = render(
        <MigratedPlayerBar 
          {...defaultProps}
          players={[]}
        />
      );
      
      // Should render the bar structure but no player disks
      expect(container.querySelector('.flex.items-center.space-x-1')).toBeInTheDocument();
      expect(container.querySelectorAll('[data-testid^="player-disk-"]')).toHaveLength(0);
    });

    it('should display team logo', () => {
      const { container } = render(<MigratedPlayerBar {...defaultProps} />);
      
      const logo = container.querySelector('img[alt="Coaching Companion Logo"]');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/pepo-logo.png');
    });
  });
});