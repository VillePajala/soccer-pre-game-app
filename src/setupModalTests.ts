/**
 * Global Modal Test Setup
 * 
 * This file provides a comprehensive jest setup to automatically fix all modal state
 * test issues by mocking the common dependencies consistently across all test files.
 */

// Mock uiStore globally for all modal state tests
const mockUIStore = {
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
  isModalOpen: jest.fn().mockReturnValue(false),
  setModalData: jest.fn(),
  getModalData: jest.fn().mockReturnValue({}),
  clearModalData: jest.fn(),
};

// Mock migration safety globally
const mockMigrationSafety = {
  shouldUseLegacy: false,
  migrationStatus: 'zustand' as const,
};

// Global beforeEach to reset mocks
beforeEach(() => {
  // Clear wrapped actions
  wrappedStoreActions.openModal.mockClear();
  wrappedStoreActions.closeModal.mockClear();
  wrappedStoreActions.toggleModal.mockClear();
  wrappedStoreActions.isModalOpen.mockClear();
  wrappedStoreActions.setModalData.mockClear();
  wrappedStoreActions.getModalData.mockClear();
  wrappedStoreActions.clearModalData.mockClear();
  
  // Clear original mock actions
  mockUIStore.openModal.mockClear();
  mockUIStore.closeModal.mockClear();
  mockUIStore.toggleModal.mockClear();
  mockUIStore.isModalOpen.mockClear();
  mockUIStore.setModalData.mockClear();
  mockUIStore.getModalData.mockClear();
  mockUIStore.clearModalData.mockClear();
  
  // Reset modal state to closed
  mockUIStore.modals = {
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
  };
  
  // Reset listeners
  storeListeners = [];
});

// Create a reactive mock store implementation  
let storeListeners: (() => void)[] = [];
const notifyStoreListeners = () => {
  storeListeners.forEach(listener => listener());
};

// Wrap store actions to notify listeners
const wrappedStoreActions = {
  openModal: jest.fn((modalName: string) => {
    mockUIStore.modals[modalName as keyof typeof mockUIStore.modals] = true;
    notifyStoreListeners();
  }),
  closeModal: jest.fn((modalName: string) => {
    mockUIStore.modals[modalName as keyof typeof mockUIStore.modals] = false;
    notifyStoreListeners();
  }),
  toggleModal: jest.fn((modalName: string) => {
    const current = mockUIStore.modals[modalName as keyof typeof mockUIStore.modals];
    mockUIStore.modals[modalName as keyof typeof mockUIStore.modals] = !current;
    notifyStoreListeners();
  }),
  isModalOpen: jest.fn((modalName: string) => {
    return mockUIStore.modals[modalName as keyof typeof mockUIStore.modals] || false;
  }),
  setModalData: jest.fn(),
  getModalData: jest.fn(() => ({})),
  clearModalData: jest.fn(),
};

// Create the reactive UIStore mock
const mockUIStoreWithActions = { ...mockUIStore, ...wrappedStoreActions };

// Set up global mocks
jest.mock('@/stores/uiStore', () => ({
  useUIStore: jest.fn((selector: any) => {
    if (typeof selector === 'function') {
      return selector(mockUIStoreWithActions);
    }
    return mockUIStoreWithActions;
  }),
}));

jest.mock('@/hooks/useMigrationSafety', () => ({
  useMigrationSafety: jest.fn(() => mockMigrationSafety),
}));

jest.mock('@/utils/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  debug: jest.fn(),
  info: jest.fn(), 
  warn: jest.fn(),
  error: jest.fn(),
}));

// Export for use in specific tests if needed
export { mockUIStore, mockMigrationSafety };