import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { 
  ModalProviderMigrationWrapper,
  useModalContext,
  useGameSettingsModal,
  useLoadGameModal,
} from '../ModalProvider.migration';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import { useUIStore } from '@/stores/uiStore';

// Mock the migration safety hook
jest.mock('@/hooks/useMigrationSafety', () => ({
  useMigrationSafety: jest.fn(),
}));

// Mock the UI store
jest.mock('@/stores/uiStore', () => ({
  useUIStore: jest.fn(),
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
}));

const mockUseMigrationSafety = useMigrationSafety as jest.MockedFunction<typeof useMigrationSafety>;
const mockUseUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>;

describe('ModalProvider Migration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Migration Wrapper', () => {
    const TestComponent = () => {
      const context = useModalContext();
      return (
        <div>
          <div data-testid="game-settings-open">
            {context.isGameSettingsModalOpen.toString()}
          </div>
          <button
            data-testid="toggle-game-settings"
            onClick={() => context.setIsGameSettingsModalOpen(prev => !prev)}
          >
            Toggle
          </button>
        </div>
      );
    };

    it('should use legacy provider when migration disabled', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
        withSafety: (fn: () => React.ReactElement) => fn(),
      });

      render(
        <ModalProviderMigrationWrapper>
          <TestComponent />
        </ModalProviderMigrationWrapper>
      );

      expect(screen.getByTestId('game-settings-open')).toHaveTextContent('false');
      
      // Test that legacy context works
      act(() => {
        fireEvent.click(screen.getByTestId('toggle-game-settings'));
      });
      
      expect(screen.getByTestId('game-settings-open')).toHaveTextContent('true');
    });

    it('should use migrated provider when migration enabled', () => {
      const mockStore = {
        modals: {
          gameSettingsModal: false,
          loadGameModal: false,
          rosterSettingsModal: false,
          seasonTournamentModal: false,
          trainingResourcesModal: false,
          goalLogModal: false,
          gameStatsModal: false,
          newGameSetupModal: false,
          settingsModal: false,
          playerAssessmentModal: false,
          saveGameModal: false,
          authModal: false,
          migrationModal: false,
          syncProgressModal: false,
        },
        openModal: jest.fn(),
        closeModal: jest.fn(),
      };

      mockUseUIStore.mockReturnValue(mockStore as any);
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
        withSafety: (fn: () => React.ReactElement) => fn(),
      });

      render(
        <ModalProviderMigrationWrapper>
          <TestComponent />
        </ModalProviderMigrationWrapper>
      );

      expect(screen.getByTestId('game-settings-open')).toHaveTextContent('false');
      
      // Test that Zustand store integration works
      act(() => {
        fireEvent.click(screen.getByTestId('toggle-game-settings'));
      });
      
      expect(mockStore.openModal).toHaveBeenCalledWith('gameSettingsModal');
    });

    it('should handle migration safety errors', () => {
      const mockWithSafety = jest.fn().mockImplementation((fn) => {
        try {
          return fn();
        } catch (error) {
          // Simulate error handling
          return <div data-testid="error">Migration Error</div>;
        }
      });

      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
        withSafety: mockWithSafety,
      });

      mockUseUIStore.mockImplementation(() => {
        throw new Error('Store not available');
      });

      render(
        <ModalProviderMigrationWrapper>
          <TestComponent />
        </ModalProviderMigrationWrapper>
      );

      expect(mockWithSafety).toHaveBeenCalled();
    });
  });

  describe('Convenience Hooks', () => {
    const TestHookComponent = () => {
      const gameSettings = useGameSettingsModal();
      const loadGame = useLoadGameModal();
      
      return (
        <div>
          <div data-testid="game-settings">{gameSettings.isOpen.toString()}</div>
          <div data-testid="load-game">{loadGame.isOpen.toString()}</div>
          <button data-testid="open-settings" onClick={gameSettings.open}>
            Open Settings
          </button>
          <button data-testid="close-settings" onClick={gameSettings.close}>
            Close Settings
          </button>
          <button data-testid="toggle-load" onClick={loadGame.toggle}>
            Toggle Load
          </button>
        </div>
      );
    };

    it('should provide convenient modal management through hooks', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
        withSafety: (fn: () => React.ReactElement) => fn(),
      });

      render(
        <ModalProviderMigrationWrapper>
          <TestHookComponent />
        </ModalProviderMigrationWrapper>
      );

      expect(screen.getByTestId('game-settings')).toHaveTextContent('false');
      expect(screen.getByTestId('load-game')).toHaveTextContent('false');

      // Test open
      act(() => {
        fireEvent.click(screen.getByTestId('open-settings'));
      });
      expect(screen.getByTestId('game-settings')).toHaveTextContent('true');

      // Test close
      act(() => {
        fireEvent.click(screen.getByTestId('close-settings'));
      });
      expect(screen.getByTestId('game-settings')).toHaveTextContent('false');

      // Test toggle
      act(() => {
        fireEvent.click(screen.getByTestId('toggle-load'));
      });
      expect(screen.getByTestId('load-game')).toHaveTextContent('true');

      act(() => {
        fireEvent.click(screen.getByTestId('toggle-load'));
      });
      expect(screen.getByTestId('load-game')).toHaveTextContent('false');
    });
  });

  describe('Context Integration', () => {
    it('should throw error when used outside provider', () => {
      const TestComponent = () => {
        useModalContext();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useModalContext must be used within ModalProvider or ModalProviderMigrationWrapper');

      consoleSpy.mockRestore();
    });

    it('should provide consistent interface regardless of implementation', () => {
      const TestComponent = () => {
        const context = useModalContext();
        
        // Test that all expected properties exist
        const requiredProps = [
          'isGameSettingsModalOpen', 'setIsGameSettingsModalOpen',
          'isLoadGameModalOpen', 'setIsLoadGameModalOpen',
          'isRosterModalOpen', 'setIsRosterModalOpen',
          'isSeasonTournamentModalOpen', 'setIsSeasonTournamentModalOpen',
          'isTrainingResourcesOpen', 'setIsTrainingResourcesOpen',
          'isGoalLogModalOpen', 'setIsGoalLogModalOpen',
          'isGameStatsModalOpen', 'setIsGameStatsModalOpen',
          'isNewGameSetupModalOpen', 'setIsNewGameSetupModalOpen',
          'isSettingsModalOpen', 'setIsSettingsModalOpen',
          'isPlayerAssessmentModalOpen', 'setIsPlayerAssessmentModalOpen',
        ];
        
        return (
          <div>
            {requiredProps.map(prop => (
              <div key={prop} data-testid={`prop-${prop}`}>
                {typeof context[prop as keyof typeof context]}
              </div>
            ))}
          </div>
        );
      };

      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
        withSafety: (fn: () => React.ReactElement) => fn(),
      });

      render(
        <ModalProviderMigrationWrapper>
          <TestComponent />
        </ModalProviderMigrationWrapper>
      );

      // Verify all boolean props exist
      const booleanProps = [
        'isGameSettingsModalOpen', 'isLoadGameModalOpen', 'isRosterModalOpen',
        'isSeasonTournamentModalOpen', 'isTrainingResourcesOpen', 'isGoalLogModalOpen',
        'isGameStatsModalOpen', 'isNewGameSetupModalOpen', 'isSettingsModalOpen',
        'isPlayerAssessmentModalOpen'
      ];

      booleanProps.forEach(prop => {
        expect(screen.getByTestId(`prop-${prop}`)).toHaveTextContent('boolean');
      });

      // Verify all setter props exist
      const setterProps = [
        'setIsGameSettingsModalOpen', 'setIsLoadGameModalOpen', 'setIsRosterModalOpen',
        'setIsSeasonTournamentModalOpen', 'setIsTrainingResourcesOpen', 'setIsGoalLogModalOpen',
        'setIsGameStatsModalOpen', 'setIsNewGameSetupModalOpen', 'setIsSettingsModalOpen',
        'setIsPlayerAssessmentModalOpen'
      ];

      setterProps.forEach(prop => {
        expect(screen.getByTestId(`prop-${prop}`)).toHaveTextContent('function');
      });
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const renderCount = { count: 0 };
      
      const TestComponent = () => {
        renderCount.count++;
        const { isGameSettingsModalOpen } = useModalContext();
        return <div data-testid="render-count">{renderCount.count}</div>;
      };

      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
        withSafety: (fn: () => React.ReactElement) => fn(),
      });

      const { rerender } = render(
        <ModalProviderMigrationWrapper>
          <TestComponent />
        </ModalProviderMigrationWrapper>
      );

      expect(screen.getByTestId('render-count')).toHaveTextContent('1');

      // Rerender with same props should not increase render count unnecessarily
      rerender(
        <ModalProviderMigrationWrapper>
          <TestComponent />
        </ModalProviderMigrationWrapper>
      );

      // Component should only render twice (initial + rerender due to test setup)
      expect(parseInt(screen.getByTestId('render-count').textContent || '0')).toBeLessThanOrEqual(3);
    });
  });
});