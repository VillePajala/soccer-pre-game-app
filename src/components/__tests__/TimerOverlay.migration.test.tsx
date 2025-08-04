import React from 'react';
import { render, act, fireEvent } from '@testing-library/react';
import TimerOverlay from '../TimerOverlay.migration';
import { MigratedTimerOverlay } from '../MigratedTimerOverlay';
import { useGameStore } from '@/stores/gameStore';

// Mock dependencies
jest.mock('@/hooks/useMigrationSafety', () => ({
  useMigrationSafety: jest.fn(),
}));

jest.mock('../TimerOverlay', () => {
  return function MockLegacyTimerOverlay(props: any) {
    return <div data-testid="legacy-timer-overlay">Legacy Timer</div>;
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
  }),
}));

jest.mock('@/utils/time', () => ({
  formatTime: (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`,
}));

jest.mock('@/utils/logger', () => ({
  default: {
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

import { useMigrationSafety } from '@/hooks/useMigrationSafety';

const mockUseMigrationSafety = useMigrationSafety as jest.MockedFunction<typeof useMigrationSafety>;

const defaultProps = {
  timeElapsedInSeconds: 1800,
  subAlertLevel: 'none' as const,
  onSubstitutionMade: jest.fn(),
  completedIntervalDurations: [],
  subIntervalMinutes: 5,
  onSetSubInterval: jest.fn(),
  isTimerRunning: false,
  onStartPauseTimer: jest.fn(),
  onResetTimer: jest.fn(),
  onToggleGoalLogModal: jest.fn(),
  onRecordOpponentGoal: jest.fn(),
  teamName: 'Arsenal FC',
  opponentName: 'Chelsea FC',
  homeScore: 2,
  awayScore: 1,
  homeOrAway: 'home' as const,
  numberOfPeriods: 2 as const,
  periodDurationMinutes: 45,
  currentPeriod: 1,
  gameStatus: 'inProgress' as const,
  lastSubTime: null,
  onOpponentNameChange: jest.fn(),
  isLoaded: true,
};

describe('TimerOverlay Migration', () => {
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
      
      const { getByTestId } = render(<TimerOverlay {...defaultProps} />);
      
      expect(getByTestId('legacy-timer-overlay')).toBeInTheDocument();
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
      
      const { queryByTestId, getByText } = render(<TimerOverlay {...defaultProps} />);
      
      expect(queryByTestId('legacy-timer-overlay')).not.toBeInTheDocument();
      // Should render the migrated component
      expect(getByText('30:00')).toBeInTheDocument(); // formatTime(1800)
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
        store.setTimeElapsed(1800);
        store.setCurrentPeriod(1);
      });
    });

    it('should display game information from store', () => {
      const { getByText } = render(<MigratedTimerOverlay {...defaultProps} />);
      
      expect(getByText('Arsenal FC')).toBeInTheDocument();
      expect(getByText('Chelsea FC')).toBeInTheDocument();
      expect(getByText('2 - 1')).toBeInTheDocument();
      expect(getByText('30:00')).toBeInTheDocument();
      expect(getByText('Period 1/2')).toBeInTheDocument();
    });

    it('should handle timer controls', () => {
      const mockOnStartPause = jest.fn();
      const mockOnReset = jest.fn();
      
      const { getByRole } = render(
        <MigratedTimerOverlay 
          {...defaultProps} 
          onStartPauseTimer={mockOnStartPause}
          onResetTimer={mockOnReset}
        />
      );
      
      // Find play/pause button (should show play icon when not running)
      const playButton = getByRole('button', { name: /play|pause/i }) || 
                        document.querySelector('button svg[data-icon="play"], button svg[data-icon="pause"]')?.closest('button');
      
      if (playButton) {
        fireEvent.click(playButton);
        expect(mockOnStartPause).toHaveBeenCalled();
        // Should also update store
        expect(useGameStore.getState().gameSession.isTimerRunning).toBe(true);
      }
    });

    it('should handle goal recording', () => {
      const mockOnGoalLog = jest.fn();
      const mockOnOpponentGoal = jest.fn();
      
      const { getByText } = render(
        <MigratedTimerOverlay 
          {...defaultProps} 
          onToggleGoalLogModal={mockOnGoalLog}
          onRecordOpponentGoal={mockOnOpponentGoal}
        />
      );
      
      // Click our goal button
      fireEvent.click(getByText('Our Goal'));
      expect(mockOnGoalLog).toHaveBeenCalled();
      // Should increment home score when we're home team
      expect(useGameStore.getState().gameSession.homeScore).toBe(3);
      
      // Click opponent goal button
      fireEvent.click(getByText('Opponent Goal'));
      expect(mockOnOpponentGoal).toHaveBeenCalled();
      // Should increment away score when we're home team
      expect(useGameStore.getState().gameSession.awayScore).toBe(2);
    });

    it('should handle opponent name editing', () => {
      const mockOnOpponentChange = jest.fn();
      
      const { getByText, getByDisplayValue } = render(
        <MigratedTimerOverlay 
          {...defaultProps} 
          onOpponentNameChange={mockOnOpponentChange}
        />
      );
      
      // Click on opponent name to start editing
      fireEvent.click(getByText('Chelsea FC'));
      
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

    it('should show substitution alert when due', () => {
      const mockOnSubMade = jest.fn();
      
      const { getByText } = render(
        <MigratedTimerOverlay 
          {...defaultProps} 
          subAlertLevel="due"
          onSubstitutionMade={mockOnSubMade}
        />
      );
      
      const subButton = getByText('Sub Made');
      expect(subButton).toBeInTheDocument();
      expect(subButton).toHaveClass('animate-pulse');
      
      fireEvent.click(subButton);
      expect(mockOnSubMade).toHaveBeenCalled();
    });

    it('should show loading state when not loaded', () => {
      const { getByText } = render(
        <MigratedTimerOverlay {...defaultProps} isLoaded={false} />
      );
      
      expect(getByText('Loading...')).toBeInTheDocument();
    });

    it('should show game end state', () => {
      act(() => {
        useGameStore.getState().setGameStatus('completed');
      });

      const { getByText, queryByText } = render(
        <MigratedTimerOverlay {...defaultProps} gameStatus="gameEnd" />
      );
      
      expect(getByText('Game End')).toBeInTheDocument();
      expect(queryByText('Period 1/2')).not.toBeInTheDocument();
    });

    it('should handle close button', () => {
      const mockOnClose = jest.fn();
      
      const { getByLabelText } = render(
        <MigratedTimerOverlay {...defaultProps} onClose={mockOnClose} />
      );
      
      fireEvent.click(getByLabelText('Close'));
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});