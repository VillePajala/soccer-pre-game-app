/**
 * Advanced Modal Interaction Tests - Week 4 Coverage Enhancement
 * 
 * Comprehensive testing of complex modal interactions, accessibility,
 * and edge cases to achieve 85%+ coverage targets for Week 4.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameSettingsModal } from '../GameSettingsModal';
import { NewGameSetupModal } from '../NewGameSetupModal';
import { LoadGameModal } from '../LoadGameModal';
import { SettingsModal } from '../SettingsModal';
import { AuthModal } from '../auth/AuthModal';
import type { AppState, Player } from '@/types';

// Enhanced test utilities
const createMockAppState = (overrides?: Partial<AppState>): AppState => ({
  gameId: 'test-game',
  teamName: 'Test Team',
  opponentName: 'Test Opponent',
  gameDate: '2025-01-15',
  gameLocation: 'Test Stadium',
  gameStatus: 'notStarted',
  isPlayed: false,
  homeScore: 0,
  awayScore: 0,
  timeElapsedInSeconds: 0,
  currentPeriod: 1,
  playersOnField: [],
  opponents: [],
  availablePlayers: [],
  gameEvents: [],
  drawings: [],
  tacticalDrawings: [],
  tacticalDiscs: [],
  tacticalBallPosition: null,
  showPlayerNames: true,
  selectedPlayerIds: [],
  homeOrAway: 'home',
  numberOfPeriods: 2,
  periodDurationMinutes: 45,
  subIntervalMinutes: 15,
  completedIntervalDurations: [],
  lastSubConfirmationTimeSeconds: 0,
  gameNotes: '',
  ageGroup: 'U16',
  tournamentLevel: 'Regional',
  demandFactor: 1.0,
  seasonId: null,
  tournamentId: null,
  isTimerRunning: false,
  ...overrides,
});

const createMockPlayers = (count: number): Player[] => 
  Array.from({ length: count }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i + 1}`,
    number: i + 1,
    position: { x: i * 10, y: i * 20 },
    isActive: true,
    stats: {},
  }));

// Mock dependencies
jest.mock('@/lib/i18n', () => ({
  __esModule: true,
  default: {
    t: (key: string) => key,
    language: 'en',
    changeLanguage: jest.fn(),
  },
}));

jest.mock('@/stores/gameStore', () => ({
  useGameStore: jest.fn(() => ({
    // Game state
    gameState: createMockAppState(),
    setGameState: jest.fn(),
    updateGameSettings: jest.fn(),
    
    // Players
    availablePlayers: createMockPlayers(15),
    setAvailablePlayers: jest.fn(),
    
    // Game management
    startNewGame: jest.fn(),
    loadGame: jest.fn(),
    saveGame: jest.fn(),
    
    // UI state
    currentModal: null,
    setCurrentModal: jest.fn(),
  })),
}));

jest.mock('@/stores/uiStore', () => ({
  useUIStore: jest.fn(() => ({
    // Modal state
    currentModal: null,
    setCurrentModal: jest.fn(),
    closeModal: jest.fn(),
    
    // Screen state
    screenSize: 'desktop',
    isMobile: false,
    
    // Loading states
    isLoading: false,
    setLoading: jest.fn(),
  })),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    resetPassword: jest.fn(),
    isLoading: false,
    error: null,
  })),
}));

jest.mock('@/stores/persistenceStore', () => ({
  usePersistenceStore: jest.fn(() => ({
    savedGames: {},
    getSavedGames: jest.fn(() => ({})),
    loadGame: jest.fn(),
    deleteGame: jest.fn(),
    settings: {
      language: 'en',
      theme: 'auto',
      enableAnimations: true,
    },
    updateSettings: jest.fn(),
  })),
}));

describe('Advanced Modal Interactions', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal Opening and Closing Behaviors', () => {
    it('should handle rapid modal opening and closing', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      const { rerender } = render(
        <GameSettingsModal isOpen={false} onClose={onClose} onSave={jest.fn()} />
      );
      
      // Rapidly toggle modal state
      for (let i = 0; i < 5; i++) {
        rerender(
          <GameSettingsModal isOpen={true} onClose={onClose} onSave={jest.fn()} />
        );
        
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument();
        });
        
        rerender(
          <GameSettingsModal isOpen={false} onClose={onClose} onSave={jest.fn()} />
        );
        
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      }
      
      expect(onClose).not.toHaveBeenCalled(); // Should not trigger close handlers
    });

    it('should handle escape key in nested modals', async () => {
      const user = userEvent.setup();
      const parentOnClose = jest.fn();
      const childOnClose = jest.fn();
      
      render(
        <div>
          <GameSettingsModal isOpen={true} onClose={parentOnClose} onSave={jest.fn()} />
          <SettingsModal isOpen={true} onClose={childOnClose} />
        </div>
      );
      
      // Press escape - should close the top-most modal
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(childOnClose).toHaveBeenCalled();
        expect(parentOnClose).not.toHaveBeenCalled();
      });
    });

    it('should handle modal focus trapping correctly', async () => {
      const user = userEvent.setup();
      
      render(
        <GameSettingsModal isOpen={true} onClose={jest.fn()} onSave={jest.fn()} />
      );
      
      const modal = screen.getByRole('dialog');
      const inputs = screen.getAllByRole('textbox');
      const buttons = screen.getAllByRole('button');
      
      // Focus should be trapped within modal
      expect(modal).toHaveFocus();
      
      // Tab through all interactive elements
      for (let i = 0; i < inputs.length + buttons.length + 2; i++) {
        await user.tab();
      }
      
      // Focus should cycle back to first element
      const focusedElement = document.activeElement;
      expect(modal.contains(focusedElement)).toBe(true);
    });
  });

  describe('Complex Form Interactions', () => {
    it('should handle complex validation scenarios in GameSettingsModal', async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      
      render(
        <GameSettingsModal isOpen={true} onClose={jest.fn()} onSave={onSave} />
      );
      
      // Fill out form with various validation scenarios
      const teamNameInput = screen.getByLabelText(/team.*name/i);
      const opponentInput = screen.getByLabelText(/opponent.*name/i);
      const dateInput = screen.getByLabelText(/game.*date/i);
      
      // Test invalid data first
      await user.clear(teamNameInput);
      await user.type(teamNameInput, 'A'); // Too short
      
      await user.clear(opponentInput);
      await user.type(opponentInput, ''); // Empty
      
      // Set past date
      await user.clear(dateInput);
      await user.type(dateInput, '2020-01-01');
      
      // Try to save - should show validation errors
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText(/team.*name.*short/i)).toBeInTheDocument();
        expect(screen.getByText(/opponent.*required/i)).toBeInTheDocument();
        expect(screen.getByText(/date.*past/i)).toBeInTheDocument();
      });
      
      expect(onSave).not.toHaveBeenCalled();
      
      // Fix validation errors
      await user.clear(teamNameInput);
      await user.type(teamNameInput, 'Valid Team Name');
      
      await user.clear(opponentInput);
      await user.type(opponentInput, 'Valid Opponent');
      
      await user.clear(dateInput);
      await user.type(dateInput, '2025-12-31');
      
      // Save should now work
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
          teamName: 'Valid Team Name',
          opponentName: 'Valid Opponent',
          gameDate: '2025-12-31',
        }));
      });
    });

    it('should handle player selection in NewGameSetupModal', async () => {
      const user = userEvent.setup();
      const onStartGame = jest.fn();
      
      render(
        <NewGameSetupModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onStartGame={onStartGame}
          availablePlayers={createMockPlayers(20)}
        />
      );
      
      // Select individual players
      const playerCheckboxes = screen.getAllByRole('checkbox');
      
      // Select first 11 players
      for (let i = 0; i < 11; i++) {
        await user.click(playerCheckboxes[i]);
      }
      
      // Verify selection count
      expect(screen.getByText(/11.*selected/i)).toBeInTheDocument();
      
      // Test select all functionality
      const selectAllButton = screen.getByRole('button', { name: /select.*all/i });
      await user.click(selectAllButton);
      
      expect(screen.getByText(/20.*selected/i)).toBeInTheDocument();
      
      // Test deselect all
      const deselectAllButton = screen.getByRole('button', { name: /deselect.*all/i });
      await user.click(deselectAllButton);
      
      expect(screen.getByText(/0.*selected/i)).toBeInTheDocument();
      
      // Select exactly 11 players and start game
      for (let i = 0; i < 11; i++) {
        await user.click(playerCheckboxes[i]);
      }
      
      const startGameButton = screen.getByRole('button', { name: /start.*game/i });
      await user.click(startGameButton);
      
      await waitFor(() => {
        expect(onStartGame).toHaveBeenCalledWith(
          expect.arrayContaining(
            Array.from({ length: 11 }, (_, i) => 
              expect.objectContaining({ id: `player-${i}` })
            )
          )
        );
      });
    });
  });

  describe('Accessibility and Keyboard Navigation', () => {
    it('should support full keyboard navigation in LoadGameModal', async () => {
      const user = userEvent.setup();
      const onLoadGame = jest.fn();
      
      const mockSavedGames = {
        'game-1': createMockAppState({ gameId: 'game-1', teamName: 'Team A' }),
        'game-2': createMockAppState({ gameId: 'game-2', teamName: 'Team B' }),
        'game-3': createMockAppState({ gameId: 'game-3', teamName: 'Team C' }),
      };
      
      render(
        <LoadGameModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onLoadGame={onLoadGame}
          savedGames={mockSavedGames}
        />
      );
      
      // Navigate through games using arrow keys
      const gameItems = screen.getAllByRole('button', { name: /load.*game/i });
      
      // Focus first game
      gameItems[0].focus();
      expect(gameItems[0]).toHaveFocus();
      
      // Navigate down
      await user.keyboard('{ArrowDown}');
      expect(gameItems[1]).toHaveFocus();
      
      // Navigate to last item
      await user.keyboard('{End}');
      expect(gameItems[gameItems.length - 1]).toHaveFocus();
      
      // Navigate to first item
      await user.keyboard('{Home}');
      expect(gameItems[0]).toHaveFocus();
      
      // Select with Enter
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(onLoadGame).toHaveBeenCalledWith('game-1');
      });
    });

    it('should provide proper ARIA labels and descriptions', () => {
      render(
        <GameSettingsModal isOpen={true} onClose={jest.fn()} onSave={jest.fn()} />
      );
      
      const modal = screen.getByRole('dialog');
      
      // Check ARIA attributes
      expect(modal).toHaveAttribute('aria-labelledby');
      expect(modal).toHaveAttribute('aria-describedby');
      
      // Check form labels
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach(input => {
        expect(input).toHaveAccessibleName();
      });
      
      // Check button accessibility
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should handle screen reader announcements', async () => {
      const user = userEvent.setup();
      
      render(
        <AuthModal isOpen={true} onClose={jest.fn()} />
      );
      
      // Check for live regions
      const statusElement = screen.getByRole('status', { hidden: true });
      expect(statusElement).toBeInTheDocument();
      
      // Trigger an error state
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /sign.*in/i });
      
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);
      
      // Check that error is announced
      await waitFor(() => {
        expect(statusElement).toHaveTextContent(/invalid.*email/i);
      });
    });
  });

  describe('Performance and Resource Management', () => {
    it('should handle large datasets efficiently in LoadGameModal', async () => {
      const user = userEvent.setup();
      
      // Create a large number of saved games
      const largeSavedGames = Object.fromEntries(
        Array.from({ length: 1000 }, (_, i) => [
          `game-${i}`,
          createMockAppState({ 
            gameId: `game-${i}`, 
            teamName: `Team ${i}`,
            opponentName: `Opponent ${i}`,
          })
        ])
      );
      
      const startTime = performance.now();
      
      render(
        <LoadGameModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onLoadGame={jest.fn()}
          savedGames={largeSavedGames}
        />
      );
      
      const endTime = performance.now();
      
      // Should render efficiently even with large datasets
      expect(endTime - startTime).toBeLessThan(500);
      
      // Search should work with large datasets
      const searchInput = screen.getByRole('textbox', { name: /search/i });
      await user.type(searchInput, 'Team 100');
      
      await waitFor(() => {
        const filteredItems = screen.getAllByText(/Team 100/);
        expect(filteredItems.length).toBeGreaterThan(0);
        expect(filteredItems.length).toBeLessThan(20); // Should be filtered
      });
    });

    it('should cleanup event listeners and timers', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(
        <GameSettingsModal isOpen={true} onClose={jest.fn()} onSave={jest.fn()} />
      );
      
      expect(addEventListenerSpy).toHaveBeenCalled();
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle save failures gracefully', async () => {
      const user = userEvent.setup();
      const onSave = jest.fn().mockRejectedValue(new Error('Save failed'));
      
      render(
        <GameSettingsModal isOpen={true} onClose={jest.fn()} onSave={onSave} />
      );
      
      // Fill out valid form
      const teamNameInput = screen.getByLabelText(/team.*name/i);
      await user.type(teamNameInput, 'Valid Team');
      
      // Try to save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/save.*failed/i)).toBeInTheDocument();
      });
      
      // Form should remain open and editable
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(teamNameInput).toBeEnabled();
    });

    it('should handle network timeouts', async () => {
      const user = userEvent.setup();
      const onSave = jest.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      
      render(
        <GameSettingsModal isOpen={true} onClose={jest.fn()} onSave={onSave} />
      );
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      // Should show loading state
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
      
      // Wait for timeout
      await waitFor(() => {
        expect(screen.getByText(/timeout/i)).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    it('should handle corrupted data gracefully', () => {
      const corruptedSavedGames = {
        'valid-game': createMockAppState({ gameId: 'valid-game' }),
        'corrupted-game': null, // Corrupted entry
        'partial-game': { gameId: 'partial-game' }, // Missing required fields
      };
      
      expect(() => {
        render(
          <LoadGameModal 
            isOpen={true} 
            onClose={jest.fn()} 
            onLoadGame={jest.fn()}
            savedGames={corruptedSavedGames as any}
          />
        );
      }).not.toThrow();
      
      // Should only show valid games
      expect(screen.getByText(/valid-game/i)).toBeInTheDocument();
      expect(screen.queryByText(/corrupted-game/i)).not.toBeInTheDocument();
    });

    it('should handle modal stacking correctly', () => {
      render(
        <div>
          <GameSettingsModal isOpen={true} onClose={jest.fn()} onSave={jest.fn()} />
          <SettingsModal isOpen={true} onClose={jest.fn()} />
          <AuthModal isOpen={true} onClose={jest.fn()} />
        </div>
      );
      
      const modals = screen.getAllByRole('dialog');
      expect(modals).toHaveLength(3);
      
      // Check z-index stacking
      modals.forEach((modal, index) => {
        const zIndex = window.getComputedStyle(modal).zIndex;
        expect(parseInt(zIndex)).toBeGreaterThan(index * 10);
      });
    });
  });

  describe('Mobile and Responsive Behavior', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });
      
      render(
        <GameSettingsModal isOpen={true} onClose={jest.fn()} onSave={jest.fn()} />
      );
      
      const modal = screen.getByRole('dialog');
      
      // Check mobile-specific styling
      expect(modal).toHaveClass(/mobile|fullscreen|max-w-full/i);
    });

    it('should handle touch interactions', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      
      render(
        <GameSettingsModal isOpen={true} onClose={onClose} onSave={jest.fn()} />
      );
      
      const modal = screen.getByRole('dialog');
      const backdrop = modal.parentElement;
      
      // Simulate touch outside modal (should close)
      if (backdrop) {
        fireEvent.touchStart(backdrop, {
          touches: [{ clientX: 0, clientY: 0 }],
        });
        fireEvent.touchEnd(backdrop);
      }
      
      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should handle orientation changes', () => {
      const { rerender } = render(
        <LoadGameModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onLoadGame={jest.fn()}
          savedGames={{}}
        />
      );
      
      // Simulate orientation change
      fireEvent(window, new Event('orientationchange'));
      
      rerender(
        <LoadGameModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onLoadGame={jest.fn()}
          savedGames={{}}
        />
      );
      
      // Modal should remain functional
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Integration with State Management', () => {
    it('should sync with global state properly', async () => {
      const user = userEvent.setup();
      const mockUpdateGameSettings = jest.fn();
      
      // Mock store with specific implementation
      require('@/stores/gameStore').useGameStore.mockReturnValue({
        gameState: createMockAppState(),
        updateGameSettings: mockUpdateGameSettings,
        setCurrentModal: jest.fn(),
      });
      
      render(
        <GameSettingsModal isOpen={true} onClose={jest.fn()} onSave={jest.fn()} />
      );
      
      const teamNameInput = screen.getByLabelText(/team.*name/i);
      await user.type(teamNameInput, 'Updated Team');
      
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);
      
      await waitFor(() => {
        expect(mockUpdateGameSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            teamName: 'Updated Team',
          })
        );
      });
    });

    it('should handle concurrent modal updates', async () => {
      const { rerender } = render(
        <GameSettingsModal isOpen={true} onClose={jest.fn()} onSave={jest.fn()} />
      );
      
      // Simulate rapid prop updates
      for (let i = 0; i < 10; i++) {
        rerender(
          <GameSettingsModal 
            isOpen={i % 2 === 0} 
            onClose={jest.fn()} 
            onSave={jest.fn()} 
          />
        );
      }
      
      // Should handle updates gracefully without errors
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});