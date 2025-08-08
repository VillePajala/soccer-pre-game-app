/**
 * Comprehensive Modal State Mocks
 * 
 * This file provides centralized mocking for all modal state management hooks
 * to resolve the common openModal/closeModal function issues across tests.
 */

// Mock the UI store with proper modal management functions
export const mockUIStore = {
  modals: {
    loadGameModal: false,
    gameSettingsModal: false,
    rosterSettingsModal: false,
    gameStatsModal: false,
    seasonTournamentModal: false,
    trainingResourcesModal: false,
    goalLogModal: false,
    newGameSetupModal: false,
    settingsModal: false,
    playerAssessmentModal: false,
  },
  openModal: jest.fn(),
  closeModal: jest.fn(),
  toggleModal: jest.fn(),
  isModalOpen: jest.fn(() => false),
  setModalData: jest.fn(),
  getModalData: jest.fn(() => ({})),
  clearModalData: jest.fn(),
};

// Mock migration safety to use Zustand by default
export const mockMigrationSafety = {
  shouldUseLegacy: false,
  migrationStatus: 'zustand' as const,
};

// Setup function to apply mocks consistently
export function setupModalStateMocks() {
  // Mock UI store
  jest.mock('@/stores/uiStore', () => ({
    useUIStore: jest.fn((selector) => {
      if (typeof selector === 'function') {
        return selector(mockUIStore);
      }
      return mockUIStore;
    }),
  }));

  // Mock migration safety
  jest.mock('@/hooks/useMigrationSafety', () => ({
    useMigrationSafety: jest.fn(() => mockMigrationSafety),
  }));

  // Mock logger
  jest.mock('@/utils/logger', () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }));
}

// Reset function for between tests
export function resetModalStateMocks() {
  mockUIStore.openModal.mockClear();
  mockUIStore.closeModal.mockClear();
  mockUIStore.toggleModal.mockClear();
  mockUIStore.isModalOpen.mockClear();
  mockUIStore.setModalData.mockClear();
  mockUIStore.getModalData.mockClear();
  mockUIStore.clearModalData.mockClear();
}