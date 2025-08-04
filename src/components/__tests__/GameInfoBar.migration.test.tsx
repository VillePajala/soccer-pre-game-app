import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import GameInfoBar from '../GameInfoBar.migration';
import { MigratedGameInfoBar } from '../MigratedGameInfoBar';
import { useGameStore } from '@/stores/gameStore';

// Mock dependencies
jest.mock('@/hooks/useMigrationSafety', () => ({
  useMigrationSafety: jest.fn(),
}));

jest.mock('../GameInfoBar', () => {
  return function MockLegacyGameInfoBar(props: any) {
    return <div data-testid="legacy-game-info-bar">Legacy GameInfoBar</div>;
  };
});

import { useMigrationSafety } from '@/hooks/useMigrationSafety';

const mockUseMigrationSafety = useMigrationSafety as jest.MockedFunction<typeof useMigrationSafety>;

const defaultProps = {
  teamName: 'Arsenal FC',
  opponentName: 'Chelsea FC',
  homeScore: 2,
  awayScore: 1,
  onTeamNameChange: jest.fn(),
  onOpponentNameChange: jest.fn(),
  homeOrAway: 'home' as const,
};

describe('GameInfoBar Migration', () => {
  beforeEach(() => {
    // Reset stores
    act(() => {
      useGameStore.getState().resetGameSession();
      useGameStore.getState().resetField();
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
      
      const { getByTestId } = render(<GameInfoBar {...defaultProps} />);
      
      expect(getByTestId('legacy-game-info-bar')).toBeInTheDocument();
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
      
      const { queryByTestId, getByText } = render(<GameInfoBar {...defaultProps} />);
      
      expect(queryByTestId('legacy-game-info-bar')).not.toBeInTheDocument();
      // Should render the migrated component with score
      expect(getByText('2 - 1')).toBeInTheDocument();
    });
  });

  describe('Migrated Component', () => {
    beforeEach(() => {
      // Set up store with test data
      act(() => {
        const store = useGameStore.getState();
        store.setTeamName('Arsenal FC');
        store.setOpponentName('Chelsea FC');
        store.setHomeScore(2);
        store.setAwayScore(1);
      });
    });

    it('should display team names and scores from store', () => {
      const { getByText } = render(<MigratedGameInfoBar {...defaultProps} />);
      
      expect(getByText('Arsenal FC')).toBeInTheDocument();
      expect(getByText('Chelsea FC')).toBeInTheDocument();
      expect(getByText('2 - 1')).toBeInTheDocument();
    });

    it('should handle home team layout correctly', () => {
      const { getByText } = render(
        <MigratedGameInfoBar {...defaultProps} homeOrAway="home" />
      );
      
      // When home: left should be team name, right should be opponent
      const leftTeam = getByText('Arsenal FC');
      const rightTeam = getByText('Chelsea FC');
      
      expect(leftTeam).toBeInTheDocument();
      expect(rightTeam).toBeInTheDocument();
      
      // Score should be home - away (2 - 1)
      expect(getByText('2 - 1')).toBeInTheDocument();
    });

    it('should handle away team layout correctly', () => {
      const { getByText } = render(
        <MigratedGameInfoBar {...defaultProps} homeOrAway="away" />
      );
      
      // When away: left should be opponent name, right should be team name
      const leftTeam = getByText('Chelsea FC');
      const rightTeam = getByText('Arsenal FC');
      
      expect(leftTeam).toBeInTheDocument();
      expect(rightTeam).toBeInTheDocument();
      
      // Score should still be home - away (2 - 1) but teams are swapped
      expect(getByText('2 - 1')).toBeInTheDocument();
    });

    it('should handle team name editing (left side when home)', () => {
      const mockOnTeamChange = jest.fn();
      
      const { getByText, getByDisplayValue } = render(
        <MigratedGameInfoBar 
          {...defaultProps} 
          homeOrAway="home"
          onTeamNameChange={mockOnTeamChange}
        />
      );
      
      // Double-click on left team name (our team when home)
      fireEvent.doubleClick(getByText('Arsenal FC'));
      
      // Should show input field
      const input = getByDisplayValue('Arsenal FC');
      expect(input).toBeInTheDocument();
      
      // Edit the name
      fireEvent.change(input, { target: { value: 'Manchester United' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Should update store and call handler
      expect(useGameStore.getState().gameSession.teamName).toBe('Manchester United');
      expect(mockOnTeamChange).toHaveBeenCalledWith('Manchester United');
    });

    it('should handle opponent name editing (right side when home)', () => {
      const mockOnOpponentChange = jest.fn();
      
      const { getByText, getByDisplayValue } = render(
        <MigratedGameInfoBar 
          {...defaultProps} 
          homeOrAway="home"
          onOpponentNameChange={mockOnOpponentChange}
        />
      );
      
      // Double-click on right team name (opponent when home)
      fireEvent.doubleClick(getByText('Chelsea FC'));
      
      // Should show input field
      const input = getByDisplayValue('Chelsea FC');
      expect(input).toBeInTheDocument();
      
      // Edit the name
      fireEvent.change(input, { target: { value: 'Liverpool FC' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Should update store and call handler
      expect(useGameStore.getState().gameSession.opponentName).toBe('Liverpool FC');
      expect(mockOnOpponentChange).toHaveBeenCalledWith('Liverpool FC');
    });

    it('should handle editing when away team', () => {
      const mockOnTeamChange = jest.fn();
      const mockOnOpponentChange = jest.fn();
      
      const { getByText, getByDisplayValue } = render(
        <MigratedGameInfoBar 
          {...defaultProps} 
          homeOrAway="away"
          onTeamNameChange={mockOnTeamChange}
          onOpponentNameChange={mockOnOpponentChange}
        />
      );
      
      // When away: left is opponent, right is team
      // Edit left side (opponent when away)
      fireEvent.doubleClick(getByText('Chelsea FC'));
      
      let input = getByDisplayValue('Chelsea FC');
      fireEvent.change(input, { target: { value: 'Liverpool FC' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockOnOpponentChange).toHaveBeenCalledWith('Liverpool FC');
      
      // Edit right side (team when away)
      fireEvent.doubleClick(getByText('Arsenal FC'));
      
      input = getByDisplayValue('Arsenal FC');
      fireEvent.change(input, { target: { value: 'Manchester United' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(mockOnTeamChange).toHaveBeenCalledWith('Manchester United');
    });

    it('should handle touch events for mobile editing', () => {
      jest.useFakeTimers();
      
      const { getByText, getByDisplayValue } = render(
        <MigratedGameInfoBar {...defaultProps} />
      );
      
      const teamName = getByText('Arsenal FC');
      
      // First tap
      fireEvent.touchEnd(teamName);
      
      // Second tap within double-tap delay (should trigger edit)
      jest.advanceTimersByTime(100);
      fireEvent.touchEnd(teamName);
      
      // Should show input field
      const input = getByDisplayValue('Arsenal FC');
      expect(input).toBeInTheDocument();
      
      jest.useRealTimers();
    });

    it('should cancel editing on escape key', () => {
      const { getByText, getByDisplayValue, queryByDisplayValue } = render(
        <MigratedGameInfoBar {...defaultProps} />
      );
      
      // Start editing
      fireEvent.doubleClick(getByText('Arsenal FC'));
      
      const input = getByDisplayValue('Arsenal FC');
      fireEvent.change(input, { target: { value: 'Changed Name' } });
      
      // Cancel with escape key
      fireEvent.keyDown(input, { key: 'Escape' });
      
      // Should stop editing and revert
      expect(queryByDisplayValue('Changed Name')).not.toBeInTheDocument();
      expect(getByText('Arsenal FC')).toBeInTheDocument();
    });

    it('should handle empty input gracefully', () => {
      const mockOnTeamChange = jest.fn();
      
      const { getByText, getByDisplayValue } = render(
        <MigratedGameInfoBar 
          {...defaultProps} 
          onTeamNameChange={mockOnTeamChange}
        />
      );
      
      // Start editing
      fireEvent.doubleClick(getByText('Arsenal FC'));
      
      const input = getByDisplayValue('Arsenal FC');
      fireEvent.change(input, { target: { value: '   ' } }); // Only whitespace
      fireEvent.keyDown(input, { key: 'Enter' });
      
      // Should not call the handler for empty/whitespace-only input
      expect(mockOnTeamChange).not.toHaveBeenCalled();
      // Should keep original name
      expect(useGameStore.getState().gameSession.teamName).toBe('Arsenal FC');
    });

    it('should sync with store updates', () => {
      const { getByText, rerender } = render(<MigratedGameInfoBar {...defaultProps} />);
      
      // Update store directly
      act(() => {
        useGameStore.getState().setTeamName('Liverpool FC');
        useGameStore.getState().setOpponentName('Everton FC');
        useGameStore.getState().setHomeScore(3);
        useGameStore.getState().setAwayScore(0);
      });
      
      // Re-render to see updates
      rerender(<MigratedGameInfoBar {...defaultProps} />);
      
      expect(getByText('Liverpool FC')).toBeInTheDocument();
      expect(getByText('Everton FC')).toBeInTheDocument();
      expect(getByText('3 - 0')).toBeInTheDocument();
    });
  });
});