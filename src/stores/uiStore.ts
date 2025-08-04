/**
 * UI State Store - Centralized modal and view state management
 * 
 * This store replaces the distributed useState calls for UI-related state:
 * - Modal visibility and state
 * - View modes (tactics board, settings, etc.)
 * - Drawing and interaction states
 * - Temporary UI state that doesn't need persistence
 * 
 * Migration Strategy: Consolidate 15+ modal state variables and view states
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Modal state interface - covers all app modals
export interface ModalState {
  // Game management modals
  saveGameModal: boolean;
  loadGameModal: boolean;
  gameStatsModal: boolean;
  goalLogModal: boolean;
  
  // Player management modals
  addPlayerModal: boolean;
  playerDetailsModal: boolean;
  substitutePlayerModal: boolean;
  
  // Settings and configuration modals
  settingsModal: boolean;
  languageModal: boolean;
  aboutModal: boolean;
  helpModal: boolean;
  
  // Authentication modals
  authModal: boolean;
  profileModal: boolean;
  accountModal: boolean;
}

// View state interface - covers app view modes
export interface ViewState {
  // Main view modes
  isTacticsBoardView: boolean;
  isDrawingMode: boolean;
  isPlayerSelectionMode: boolean;
  isFieldEditMode: boolean;
  
  // Display preferences
  showPlayerNames: boolean;
  showPlayerNumbers: boolean;
  showOpponents: boolean;
  showTacticalElements: boolean;
  
  // Drawing and tactical states
  selectedDrawingTool: 'pen' | 'line' | 'arrow' | 'circle' | 'eraser' | null;
  drawingColor: string;
  drawingThickness: number;
  
  // Selection states
  selectedPlayerIds: string[];
  selectedOpponentIds: string[];
  selectedTacticalElements: string[];
}

// Notification/Toast state
export interface NotificationState {
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    timestamp: number;
  }>;
}

// Combined UI store interface
export interface UIStore {
  // State
  modals: ModalState;
  view: ViewState;
  notifications: NotificationState;
  
  // Modal actions
  openModal: (modalName: keyof ModalState) => void;
  closeModal: (modalName: keyof ModalState) => void;
  toggleModal: (modalName: keyof ModalState) => void;
  closeAllModals: () => void;
  isModalOpen: (modalName: keyof ModalState) => boolean;
  
  // View actions
  setTacticsBoardView: (enabled: boolean) => void;
  setDrawingMode: (enabled: boolean) => void;
  setPlayerSelectionMode: (enabled: boolean) => void;
  setFieldEditMode: (enabled: boolean) => void;
  
  // Display preference actions
  setShowPlayerNames: (show: boolean) => void;
  setShowPlayerNumbers: (show: boolean) => void;
  setShowOpponents: (show: boolean) => void;
  setShowTacticalElements: (show: boolean) => void;
  
  // Drawing tool actions
  setDrawingTool: (tool: ViewState['selectedDrawingTool']) => void;
  setDrawingColor: (color: string) => void;
  setDrawingThickness: (thickness: number) => void;
  
  // Selection actions
  setSelectedPlayerIds: (ids: string[]) => void;
  addSelectedPlayerId: (id: string) => void;
  removeSelectedPlayerId: (id: string) => void;
  clearSelectedPlayers: () => void;
  
  setSelectedOpponentIds: (ids: string[]) => void;
  addSelectedOpponentId: (id: string) => void;
  removeSelectedOpponentId: (id: string) => void;
  clearSelectedOpponents: () => void;
  
  setSelectedTacticalElements: (ids: string[]) => void;
  addSelectedTacticalElement: (id: string) => void;
  removeSelectedTacticalElement: (id: string) => void;
  clearSelectedTacticalElements: () => void;
  
  // Notification actions
  addNotification: (notification: Omit<NotificationState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Utility actions
  resetView: () => void;
  resetAll: () => void;
}

// Default state values
const defaultModalState: ModalState = {
  saveGameModal: false,
  loadGameModal: false,
  gameStatsModal: false,
  goalLogModal: false,
  addPlayerModal: false,
  playerDetailsModal: false,
  substitutePlayerModal: false,
  settingsModal: false,
  languageModal: false,
  aboutModal: false,
  helpModal: false,
  authModal: false,
  profileModal: false,
  accountModal: false,
};

const defaultViewState: ViewState = {
  isTacticsBoardView: false,
  isDrawingMode: false,
  isPlayerSelectionMode: false,
  isFieldEditMode: false,
  showPlayerNames: true,
  showPlayerNumbers: false,
  showOpponents: true,
  showTacticalElements: true,
  selectedDrawingTool: null,
  drawingColor: '#000000',
  drawingThickness: 2,
  selectedPlayerIds: [],
  selectedOpponentIds: [],
  selectedTacticalElements: [],
};

const defaultNotificationState: NotificationState = {
  notifications: [],
};

// Create the UI store with Zustand
export const useUIStore = create<UIStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      modals: defaultModalState,
      view: defaultViewState,
      notifications: defaultNotificationState,
      
      // Modal actions
      openModal: (modalName) => set(
        (state) => ({ 
          modals: { ...state.modals, [modalName]: true } 
        }),
        false,
        `openModal:${modalName}`
      ),
      
      closeModal: (modalName) => set(
        (state) => ({ 
          modals: { ...state.modals, [modalName]: false } 
        }),
        false,
        `closeModal:${modalName}`
      ),
      
      toggleModal: (modalName) => set(
        (state) => ({ 
          modals: { ...state.modals, [modalName]: !state.modals[modalName] } 
        }),
        false,
        `toggleModal:${modalName}`
      ),
      
      closeAllModals: () => set(
        { modals: defaultModalState },
        false,
        'closeAllModals'
      ),
      
      isModalOpen: (modalName) => get().modals[modalName],
      
      // View actions
      setTacticsBoardView: (enabled) => set(
        (state) => ({ 
          view: { ...state.view, isTacticsBoardView: enabled } 
        }),
        false,
        'setTacticsBoardView'
      ),
      
      setDrawingMode: (enabled) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isDrawingMode: enabled,
            // Clear selection modes when entering drawing mode
            isPlayerSelectionMode: enabled ? false : state.view.isPlayerSelectionMode,
            isFieldEditMode: enabled ? false : state.view.isFieldEditMode,
          } 
        }),
        false,
        'setDrawingMode'
      ),
      
      setPlayerSelectionMode: (enabled) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isPlayerSelectionMode: enabled,
            // Clear other modes when entering selection mode
            isDrawingMode: enabled ? false : state.view.isDrawingMode,
            isFieldEditMode: enabled ? false : state.view.isFieldEditMode,
          } 
        }),
        false,
        'setPlayerSelectionMode'
      ),
      
      setFieldEditMode: (enabled) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            isFieldEditMode: enabled,
            // Clear other modes when entering field edit mode
            isDrawingMode: enabled ? false : state.view.isDrawingMode,
            isPlayerSelectionMode: enabled ? false : state.view.isPlayerSelectionMode,
          } 
        }),
        false,
        'setFieldEditMode'
      ),
      
      // Display preference actions
      setShowPlayerNames: (show) => set(
        (state) => ({ 
          view: { ...state.view, showPlayerNames: show } 
        }),
        false,
        'setShowPlayerNames'
      ),
      
      setShowPlayerNumbers: (show) => set(
        (state) => ({ 
          view: { ...state.view, showPlayerNumbers: show } 
        }),
        false,
        'setShowPlayerNumbers'
      ),
      
      setShowOpponents: (show) => set(
        (state) => ({ 
          view: { ...state.view, showOpponents: show } 
        }),
        false,
        'setShowOpponents'
      ),
      
      setShowTacticalElements: (show) => set(
        (state) => ({ 
          view: { ...state.view, showTacticalElements: show } 
        }),
        false,
        'setShowTacticalElements'
      ),
      
      // Drawing tool actions
      setDrawingTool: (tool) => set(
        (state) => ({ 
          view: { ...state.view, selectedDrawingTool: tool } 
        }),
        false,
        'setDrawingTool'
      ),
      
      setDrawingColor: (color) => set(
        (state) => ({ 
          view: { ...state.view, drawingColor: color } 
        }),
        false,
        'setDrawingColor'
      ),
      
      setDrawingThickness: (thickness) => set(
        (state) => ({ 
          view: { ...state.view, drawingThickness: thickness } 
        }),
        false,
        'setDrawingThickness'
      ),
      
      // Selection actions
      setSelectedPlayerIds: (ids) => set(
        (state) => ({ 
          view: { ...state.view, selectedPlayerIds: ids } 
        }),
        false,
        'setSelectedPlayerIds'
      ),
      
      addSelectedPlayerId: (id) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            selectedPlayerIds: state.view.selectedPlayerIds.includes(id) 
              ? state.view.selectedPlayerIds 
              : [...state.view.selectedPlayerIds, id]
          } 
        }),
        false,
        'addSelectedPlayerId'
      ),
      
      removeSelectedPlayerId: (id) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            selectedPlayerIds: state.view.selectedPlayerIds.filter(playerId => playerId !== id)
          } 
        }),
        false,
        'removeSelectedPlayerId'
      ),
      
      clearSelectedPlayers: () => set(
        (state) => ({ 
          view: { ...state.view, selectedPlayerIds: [] } 
        }),
        false,
        'clearSelectedPlayers'
      ),
      
      setSelectedOpponentIds: (ids) => set(
        (state) => ({ 
          view: { ...state.view, selectedOpponentIds: ids } 
        }),
        false,
        'setSelectedOpponentIds'
      ),
      
      addSelectedOpponentId: (id) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            selectedOpponentIds: state.view.selectedOpponentIds.includes(id) 
              ? state.view.selectedOpponentIds 
              : [...state.view.selectedOpponentIds, id]
          } 
        }),
        false,
        'addSelectedOpponentId'
      ),
      
      removeSelectedOpponentId: (id) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            selectedOpponentIds: state.view.selectedOpponentIds.filter(opponentId => opponentId !== id)
          } 
        }),
        false,
        'removeSelectedOpponentId'
      ),
      
      clearSelectedOpponents: () => set(
        (state) => ({ 
          view: { ...state.view, selectedOpponentIds: [] } 
        }),
        false,
        'clearSelectedOpponents'
      ),
      
      setSelectedTacticalElements: (ids) => set(
        (state) => ({ 
          view: { ...state.view, selectedTacticalElements: ids } 
        }),
        false,
        'setSelectedTacticalElements'
      ),
      
      addSelectedTacticalElement: (id) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            selectedTacticalElements: state.view.selectedTacticalElements.includes(id) 
              ? state.view.selectedTacticalElements 
              : [...state.view.selectedTacticalElements, id]
          } 
        }),
        false,
        'addSelectedTacticalElement'
      ),
      
      removeSelectedTacticalElement: (id) => set(
        (state) => ({ 
          view: { 
            ...state.view, 
            selectedTacticalElements: state.view.selectedTacticalElements.filter(elementId => elementId !== id)
          } 
        }),
        false,
        'removeSelectedTacticalElement'
      ),
      
      clearSelectedTacticalElements: () => set(
        (state) => ({ 
          view: { ...state.view, selectedTacticalElements: [] } 
        }),
        false,
        'clearSelectedTacticalElements'
      ),
      
      // Notification actions
      addNotification: (notification) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = Date.now();
        
        set(
          (state) => ({ 
            notifications: {
              ...state.notifications,
              notifications: [
                ...state.notifications.notifications,
                { ...notification, id, timestamp }
              ]
            }
          }),
          false,
          'addNotification'
        );
        
        // Auto-remove notification after duration (default 5 seconds)
        const duration = notification.duration || 5000;
        if (duration > 0) {
          setTimeout(() => {
            set(
              (state) => ({
                notifications: {
                  ...state.notifications,
                  notifications: state.notifications.notifications.filter(n => n.id !== id)
                }
              }),
              false,
              'autoRemoveNotification'
            );
          }, duration);
        }
      },
      
      removeNotification: (id) => set(
        (state) => ({
          notifications: {
            ...state.notifications,
            notifications: state.notifications.notifications.filter(n => n.id !== id)
          }
        }),
        false,
        'removeNotification'
      ),
      
      clearNotifications: () => set(
        { notifications: defaultNotificationState },
        false,
        'clearNotifications'
      ),
      
      // Utility actions
      resetView: () => set(
        { view: defaultViewState },
        false,
        'resetView'
      ),
      
      resetAll: () => set(
        {
          modals: defaultModalState,
          view: defaultViewState,
          notifications: defaultNotificationState,
        },
        false,
        'resetAll'
      ),
    }),
    {
      name: 'UIStore', // DevTools name
    }
  )
);

// Selector hooks for performance optimization
export const useModalState = () => useUIStore((state) => state.modals);
export const useViewState = () => useUIStore((state) => state.view);
export const useNotifications = () => useUIStore((state) => state.notifications);

// Specific modal hooks for common usage patterns
export const useModal = (modalName: keyof ModalState) => {
  const isOpen = useUIStore((state) => state.modals[modalName]);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  const toggleModal = useUIStore((state) => state.toggleModal);
  
  return {
    isOpen,
    open: () => openModal(modalName),
    close: () => closeModal(modalName),
    toggle: () => toggleModal(modalName),
  };
};

// View mode hooks
export const useTacticsBoard = () => {
  const isEnabled = useUIStore((state) => state.view.isTacticsBoardView);
  const setTacticsBoardView = useUIStore((state) => state.setTacticsBoardView);
  
  return {
    isEnabled,
    enable: () => setTacticsBoardView(true),
    disable: () => setTacticsBoardView(false),
    toggle: () => setTacticsBoardView(!isEnabled),
  };
};

export const useDrawingMode = () => {
  const isEnabled = useUIStore((state) => state.view.isDrawingMode);
  const tool = useUIStore((state) => state.view.selectedDrawingTool);
  const color = useUIStore((state) => state.view.drawingColor);
  const thickness = useUIStore((state) => state.view.drawingThickness);
  const setDrawingMode = useUIStore((state) => state.setDrawingMode);
  const setDrawingTool = useUIStore((state) => state.setDrawingTool);
  const setDrawingColor = useUIStore((state) => state.setDrawingColor);
  const setDrawingThickness = useUIStore((state) => state.setDrawingThickness);
  
  return {
    isEnabled,
    tool,
    color,
    thickness,
    enable: () => setDrawingMode(true),
    disable: () => setDrawingMode(false),
    setTool: setDrawingTool,
    setColor: setDrawingColor,
    setThickness: setDrawingThickness,
  };
};

export const usePlayerSelection = () => {
  const isEnabled = useUIStore((state) => state.view.isPlayerSelectionMode);
  const selectedIds = useUIStore((state) => state.view.selectedPlayerIds);
  const setPlayerSelectionMode = useUIStore((state) => state.setPlayerSelectionMode);
  const addSelectedPlayerId = useUIStore((state) => state.addSelectedPlayerId);
  const removeSelectedPlayerId = useUIStore((state) => state.removeSelectedPlayerId);
  const clearSelectedPlayers = useUIStore((state) => state.clearSelectedPlayers);
  const setSelectedPlayerIds = useUIStore((state) => state.setSelectedPlayerIds);
  
  return {
    isEnabled,
    selectedIds,
    enable: () => setPlayerSelectionMode(true),
    disable: () => setPlayerSelectionMode(false),
    selectPlayer: addSelectedPlayerId,
    deselectPlayer: removeSelectedPlayerId,
    clearSelection: clearSelectedPlayers,
    setSelection: setSelectedPlayerIds,
  };
};

// Notification helper hook
export const useNotificationActions = () => {
  const addNotification = useUIStore((state) => state.addNotification);
  const removeNotification = useUIStore((state) => state.removeNotification);
  const clearNotifications = useUIStore((state) => state.clearNotifications);
  
  return {
    showSuccess: (title: string, message: string) => addNotification({ type: 'success', title, message }),
    showError: (title: string, message: string) => addNotification({ type: 'error', title, message }),
    showWarning: (title: string, message: string) => addNotification({ type: 'warning', title, message }),
    showInfo: (title: string, message: string) => addNotification({ type: 'info', title, message }),
    remove: removeNotification,
    clear: clearNotifications,
  };
};