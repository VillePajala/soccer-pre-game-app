import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  useLoadGameModalState,
  useLoadGameModalWithHandlers,
  useLoadGameModalSelector 
} from '../useLoadGameModalState';
import { useMigrationSafety } from '../useMigrationSafety';
import { useUIStore } from '@/stores/uiStore';
import { useModalContext } from '@/contexts/ModalProvider.migration';

// Mock dependencies
jest.mock('../useMigrationSafety', () => ({
  useMigrationSafety: jest.fn(),
}));

jest.mock('@/stores/uiStore', () => ({
  useUIStore: jest.fn(),
}));

jest.mock('@/contexts/ModalProvider.migration', () => ({
  useModalContext: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

const mockUseMigrationSafety = useMigrationSafety as jest.MockedFunction<typeof useMigrationSafety>;
const mockUseUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>;
const mockUseModalContext = useModalContext as jest.MockedFunction<typeof useModalContext>;

describe('useLoadGameModalState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Zustand Implementation', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
      });

      // Mock context for safety (always called by hooks)
      mockUseModalContext.mockReturnValue({
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
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
        modals: { loadGameModal: false },
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
      const { result } = renderHook(() => useLoadGameModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should open modal when open is called', () => {
      const mockOpenModal = jest.fn();
      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { loadGameModal: false },
          openModal: mockOpenModal,
          closeModal: jest.fn(),
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      // Ensure context is mocked for this test
      mockUseModalContext.mockReturnValue({
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
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

      const { result } = renderHook(() => useLoadGameModalState());

      act(() => {
        result.current.open();
      });

      expect(mockOpenModal).toHaveBeenCalledWith('loadGameModal');
    });

    it('should close modal when close is called', () => {
      const mockCloseModal = jest.fn();
      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { loadGameModal: true },
          openModal: jest.fn(),
          closeModal: mockCloseModal,
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      // Ensure context is mocked for this test
      mockUseModalContext.mockReturnValue({
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
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

      const { result } = renderHook(() => useLoadGameModalState());

      act(() => {
        result.current.close();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('loadGameModal');
    });
  });

  describe('Context Implementation (Legacy)', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      mockUseModalContext.mockReturnValue({
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
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
      const { result } = renderHook(() => useLoadGameModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should call context setter when opening modal', () => {
      const mockSetIsOpen = jest.fn();
      mockUseModalContext.mockReturnValue({
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: mockSetIsOpen,
        // Add other required context properties with mocks
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
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

      const { result } = renderHook(() => useLoadGameModalState());

      act(() => {
        result.current.open();
      });

      expect(mockSetIsOpen).toHaveBeenCalledWith(true);
    });
  });

  describe('useLoadGameModalWithHandlers', () => {
    beforeEach(() => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
      });

      // Mock context for safety (always called by hooks)
      mockUseModalContext.mockReturnValue({
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
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
        modals: { loadGameModal: false },
        openModal: jest.fn(),
        closeModal: jest.fn(),
      };

      mockUseUIStore.mockImplementation((selector: any) => {
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });
    });

    it('should provide enhanced handlers', () => {
      const { result } = renderHook(() => useLoadGameModalWithHandlers());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.handleOpen).toBe('function');
      expect(typeof result.current.handleClose).toBe('function');
      expect(typeof result.current.handleToggle).toBe('function');
      expect(typeof result.current.onOpen).toBe('function');
      expect(typeof result.current.onClose).toBe('function');
      expect(typeof result.current.onToggle).toBe('function');
      // Test legacy naming aliases
      expect(typeof result.current.openLoadGameModal).toBe('function');
      expect(typeof result.current.closeLoadGameModal).toBe('function');
    });
  });

  describe('useLoadGameModalSelector', () => {
    it('should return Zustand state when not in legacy mode', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: false,
      });

      mockUseModalContext.mockReturnValue({
        isLoadGameModalOpen: false,
        setIsLoadGameModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
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
        const mockStore = { modals: { loadGameModal: true } };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      const { result } = renderHook(() => useLoadGameModalSelector());

      expect(result.current.isOpen).toBe(true);
      expect(result.current.migrationStatus).toBe('zustand');
    });

    it('should return context state when in legacy mode', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      mockUseModalContext.mockReturnValue({
        isLoadGameModalOpen: true,
        setIsLoadGameModalOpen: jest.fn(),
        // Add other required context properties
        isGameSettingsModalOpen: false,
        setIsGameSettingsModalOpen: jest.fn(),
        isRosterModalOpen: false,
        setIsRosterModalOpen: jest.fn(),
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

      const { result } = renderHook(() => useLoadGameModalSelector());

      expect(result.current.isOpen).toBe(true);
      expect(result.current.migrationStatus).toBe('legacy');
    });
  });
});