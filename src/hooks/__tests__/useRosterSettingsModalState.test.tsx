import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  useRosterSettingsModalState,
  useRosterSettingsModalWithHandlers,
  useRosterSettingsModalSelector 
} from '../useRosterSettingsModalState';
import { useUIStore } from '@/stores/uiStore';
// import { useModalContext } from '@/contexts/{}';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/stores/uiStore');

const mockUseMigrationSafety = jest.fn();
const mockUseModalContext = jest.fn();
const mockUseUIStore = jest.fn();

describe('useRosterSettingsModalState', () => {
  describe('Zustand Implementation', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
      });

      // Mock context for safety (always called by hooks)
      mockUseModalContext.mockReturnValue({
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const mockStore = {
        modals: { rosterSettingsModal: false },
        openModal: jest.fn(),
        closeModal: jest.fn(),
      };

      mockUseUIStore.mockImplementation((selector: any) => {
        if (typeof selector === 'function') {
          return selector(mockStore);
        }
        return mockStore;
      });
    });

    it('should return closed state initially', () => {
      const { result } = renderHook(() => useRosterSettingsModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should open modal when open is called', () => {
      const mockOpenModal = jest.fn();
      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { rosterSettingsModal: false },
          openModal: mockOpenModal,
          closeModal: jest.fn(),
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      // Ensure context is mocked for this test
      mockUseModalContext.mockReturnValue({
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const { result } = renderHook(() => useRosterSettingsModalState());

      act(() => {
        result.current.open();
      });

      expect(mockOpenModal).toHaveBeenCalledWith('rosterSettingsModal');
    });

    it('should close modal when close is called', () => {
      const mockCloseModal = jest.fn();
      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { rosterSettingsModal: true },
          openModal: jest.fn(),
          closeModal: mockCloseModal,
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      // Ensure context is mocked for this test
      mockUseModalContext.mockReturnValue({
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const { result } = renderHook(() => useRosterSettingsModalState());

      act(() => {
        result.current.close();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('rosterSettingsModal');
    });
  });

  describe('Context Implementation (Legacy)', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      mockUseModalContext.mockReturnValue({
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });
    });

    it('should use context state when legacy mode is enabled', () => {
      const { result } = renderHook(() => useRosterSettingsModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should call context setter when opening modal', () => {
      const mockSetIsOpen = jest.fn();
      mockUseModalContext.mockReturnValue({
        isRosterModalOpen: false,
        setIsRosterModalOpen: mockSetIsOpen,
        // Add other required context properties with mocks
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const { result } = renderHook(() => useRosterSettingsModalState());

      act(() => {
        result.current.open();
      });

      expect(mockSetIsOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('useRosterSettingsModalWithHandlers', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
      });

      // Mock context for safety (always called by hooks)
      mockUseModalContext.mockReturnValue({
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const mockStore = {
        modals: { rosterSettingsModal: false },
        openModal: jest.fn(),
        closeModal: jest.fn(),
      };

      mockUseUIStore.mockImplementation((selector: any) => {
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });
    });

    it('should provide enhanced handlers', () => {
      const { result } = renderHook(() => useRosterSettingsModalWithHandlers());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.handleOpen).toBe('function');
      expect(typeof result.current.handleClose).toBe('function');
      expect(typeof result.current.handleToggle).toBe('function');
      expect(typeof result.current.onOpen).toBe('function');
      expect(typeof result.current.onClose).toBe('function');
      expect(typeof result.current.onToggle).toBe('function');
      // Test legacy naming aliases
      expect(typeof result.current.openRosterModal).toBe('function');
      expect(typeof result.current.closeRosterModal).toBe('function');
    });
  });

  describe('useRosterSettingsModalSelector', () => {
    it('should return Zustand state when not in legacy mode', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
      });

      mockUseModalContext.mockReturnValue({
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = { modals: { rosterSettingsModal: true } };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      const { result } = renderHook(() => useRosterSettingsModalSelector());

      expect(result.current.isOpen).toBe(true);
      expect(result.current.migrationStatus).toBe('zustand');
    });

    it('should return context state when in legacy mode', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      mockUseModalContext.mockReturnValue({
        isRosterModalOpen: true,
        setIsRosterModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const { result } = renderHook(() => useRosterSettingsModalSelector());

      expect(result.current.isOpen).toBe(true);
      expect(result.current.migrationStatus).toBe('legacy');
    });
  });
});