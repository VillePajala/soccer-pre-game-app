import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  useGoalLogModalState,
  useGoalLogModalWithHandlers,
  useGoalLogModalSelector 
} from '../useGoalLogModalState';
import { useUIStore } from '@/stores/uiStore';
// import { useModalContext } from '@/contexts/{}';

// Mock dependencies

  describe('Zustand Implementation', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
      });

      // Mock context for safety (always called by hooks)
      mockUseModalContext.mockReturnValue({
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
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
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const mockStore = {
        modals: { goalLogModal: false },
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
      const { result } = renderHook(() => useGoalLogModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should open modal when open is called', () => {
      const mockOpenModal = jest.fn();
      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { goalLogModal: false },
          openModal: mockOpenModal,
          closeModal: jest.fn(),
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      // Ensure context is mocked for this test
      mockUseModalContext.mockReturnValue({
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
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
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const { result } = renderHook(() => useGoalLogModalState());

      act(() => {
        result.current.open();
      });

      expect(mockOpenModal).toHaveBeenCalledWith('goalLogModal');
    });

    it('should close modal when close is called', () => {
      const mockCloseModal = jest.fn();
      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { goalLogModal: true },
          openModal: jest.fn(),
          closeModal: mockCloseModal,
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      // Ensure context is mocked for this test
      mockUseModalContext.mockReturnValue({
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
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
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const { result } = renderHook(() => useGoalLogModalState());

      act(() => {
        result.current.close();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('goalLogModal');
    });
  });

  describe('Context Implementation (Legacy)', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      mockUseModalContext.mockReturnValue({
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
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
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });
    });

    it('should use context state when legacy mode is enabled', () => {
      const { result } = renderHook(() => useGoalLogModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should call context setter when opening modal', () => {
      const mockSetIsOpen = jest.fn();
      mockUseModalContext.mockReturnValue({
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: mockSetIsOpen,
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
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const { result } = renderHook(() => useGoalLogModalState());

      act(() => {
        result.current.open();
      });

      expect(mockSetIsOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('useGoalLogModalWithHandlers', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
      });

      // Mock context for safety (always called by hooks)
      mockUseModalContext.mockReturnValue({
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
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
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const mockStore = {
        modals: { goalLogModal: false },
        openModal: jest.fn(),
        closeModal: jest.fn(),
      };

      mockUseUIStore.mockImplementation((selector: any) => {
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });
    });

    it('should provide enhanced handlers', () => {
      const { result } = renderHook(() => useGoalLogModalWithHandlers());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.handleOpen).toBe('function');
      expect(typeof result.current.handleClose).toBe('function');
      expect(typeof result.current.handleToggle).toBe('function');
      expect(typeof result.current.onOpen).toBe('function');
      expect(typeof result.current.onClose).toBe('function');
      expect(typeof result.current.onToggle).toBe('function');
      // Test legacy naming aliases
      expect(typeof result.current.openGoalLogModal).toBe('function');
      expect(typeof result.current.closeGoalLogModal).toBe('function');
      expect(typeof result.current.toggleGoalLogModal).toBe('function');
    });
  });

  describe('useGoalLogModalSelector', () => {
    it('should return Zustand state when not in legacy mode', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
      });

      mockUseModalContext.mockReturnValue({
        isGoalLogModalOpen: false,
        setIsGoalLogModalOpen: jest.fn(),
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
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = { modals: { goalLogModal: true } };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      const { result } = renderHook(() => useGoalLogModalSelector());

      expect(result.current.isOpen).toBe(true);
      expect(result.current.migrationStatus).toBe('zustand');
    });

    it('should return context state when in legacy mode', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      mockUseModalContext.mockReturnValue({
        isGoalLogModalOpen: true,
        setIsGoalLogModalOpen: jest.fn(),
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
        isTrainingResourcesOpen: false,
        setIsTrainingResourcesOpen: jest.fn(),
        isSettingsModalOpen: false,
        setIsSettingsModalOpen: jest.fn(),
        isPlayerAssessmentModalOpen: false,
        setIsPlayerAssessmentModalOpen: jest.fn(),
      });

      const { result } = renderHook(() => useGoalLogModalSelector());

      expect(result.current.isOpen).toBe(true);
      expect(result.current.migrationStatus).toBe('legacy');
    });
  });
});