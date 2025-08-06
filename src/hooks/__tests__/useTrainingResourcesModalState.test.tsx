import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  useTrainingResourcesModalState,
  useTrainingResourcesModalWithHandlers,
  useTrainingResourcesModalSelector 
} from '../useTrainingResourcesModalState';
import { useUIStore } from '@/stores/uiStore';
// import { useModalContext } from '@/contexts/{}';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/stores/uiStore');

const mockUseMigrationSafety = jest.fn();
const mockUseModalContext = jest.fn();
const mockUseUIStore = jest.fn();

describe('useTrainingResourcesModalState', () => {
  describe('Zustand Implementation', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
      });

      // Mock context for safety (always called by hooks)
      mockUseModalContext.mockReturnValue({
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const mockStore = {
        modals: { trainingResourcesModal: false },
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
      const { result } = renderHook(() => useTrainingResourcesModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should open modal when open is called', () => {
      const mockOpenModal = jest.fn();
      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { trainingResourcesModal: false },
          openModal: mockOpenModal,
          closeModal: jest.fn(),
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      // Ensure context is mocked for this test
      mockUseModalContext.mockReturnValue({
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const { result } = renderHook(() => useTrainingResourcesModalState());

      act(() => {
        result.current.open();
      });

      expect(mockOpenModal).toHaveBeenCalledWith('trainingResourcesModal');
    });

    it('should close modal when close is called', () => {
      const mockCloseModal = jest.fn();
      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { trainingResourcesModal: true },
          openModal: jest.fn(),
          closeModal: mockCloseModal,
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      // Ensure context is mocked for this test
      mockUseModalContext.mockReturnValue({
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const { result } = renderHook(() => useTrainingResourcesModalState());

      act(() => {
        result.current.close();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('trainingResourcesModal');
    });
  });

  describe('Context Implementation (Legacy)', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      mockUseModalContext.mockReturnValue({
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });
    });

    it('should use context state when legacy mode is enabled', () => {
      const { result } = renderHook(() => useTrainingResourcesModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should call context setter when opening modal', () => {
      const mockSetIsOpen = jest.fn();
      mockUseModalContext.mockReturnValue({
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: mockSetIsOpen,
        // Add other required context properties with mocks
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const { result } = renderHook(() => useTrainingResourcesModalState());

      act(() => {
        result.current.open();
      });

      expect(mockSetIsOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('useTrainingResourcesModalWithHandlers', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
      });

      // Mock context for safety (always called by hooks)
      mockUseModalContext.mockReturnValue({
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const mockStore = {
        modals: { trainingResourcesModal: false },
        openModal: jest.fn(),
        closeModal: jest.fn(),
      };

      mockUseUIStore.mockImplementation((selector: any) => {
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });
    });

    it('should provide enhanced handlers', () => {
      const { result } = renderHook(() => useTrainingResourcesModalWithHandlers());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.handleOpen).toBe('function');
      expect(typeof result.current.handleClose).toBe('function');
      expect(typeof result.current.handleToggle).toBe('function');
      expect(typeof result.current.onOpen).toBe('function');
      expect(typeof result.current.onClose).toBe('function');
      expect(typeof result.current.onToggle).toBe('function');
      // Test legacy naming aliases
      expect(typeof result.current.openTrainingResourcesModal).toBe('function');
      expect(typeof result.current.closeTrainingResourcesModal).toBe('function');
      expect(typeof result.current.toggleTrainingResources).toBe('function');
    });
  });

  describe('useTrainingResourcesModalSelector', () => {
    it('should return Zustand state when not in legacy mode', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
      });

      mockUseModalContext.mockReturnValue({
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = { modals: { trainingResourcesModal: true } };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      const { result } = renderHook(() => useTrainingResourcesModalSelector());

      expect(result.current.isOpen).toBe(true);
      expect(result.current.migrationStatus).toBe('zustand');
    });

    it('should return context state when in legacy mode', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      mockUseModalContext.mockReturnValue({
        isTrainingResourcesOpen: true,
        setIsTrainingResourcesOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
        isGameStatsModalOpen: false,
        setIsGameStatsModalOpen: jest.fn(),
        isNewGameSetupModalOpen: false,
        setIsNewGameSetupModalOpen: jest.fn(),
        isSeasonTournamentModalOpen: false,
        setIsSeasonTournamentModalOpen: jest.fn(),
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const { result } = renderHook(() => useTrainingResourcesModalSelector());

      expect(result.current.isOpen).toBe(true);
      expect(result.current.migrationStatus).toBe('legacy');
    });
  });
});