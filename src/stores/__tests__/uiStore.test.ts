/**
 * UIStore Integration Tests
 * 
 * Comprehensive tests for the centralized UI state management store
 * to ensure modal, view, and notification management works correctly.
 */

import { renderHook, act } from '@testing-library/react';
import { 
  useUIStore, 
  useModal, 
  useTacticsBoard, 
  useDrawingMode, 
  usePlayerSelection,
  useNotificationActions 
} from '../uiStore';

// Mock logger to avoid console output during tests
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('UIStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useUIStore.getState().resetAll();
    });
  });

  describe('Modal Management', () => {
    it('should initialize with all modals closed', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.modals.saveGameModal).toBe(false);
      expect(result.current.modals.loadGameModal).toBe(false);
      expect(result.current.modals.gameStatsModal).toBe(false);
      expect(result.current.modals.settingsModal).toBe(false);
      expect(result.current.modals.authModal).toBe(false);
    });

    it('should open and close modals correctly', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.openModal('saveGameModal');
      });
      
      expect(result.current.modals.saveGameModal).toBe(true);
      expect(result.current.isModalOpen('saveGameModal')).toBe(true);
      
      act(() => {
        result.current.closeModal('saveGameModal');
      });
      
      expect(result.current.modals.saveGameModal).toBe(false);
      expect(result.current.isModalOpen('saveGameModal')).toBe(false);
    });

    it('should toggle modals correctly', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Initially closed
      expect(result.current.modals.gameStatsModal).toBe(false);
      
      // Toggle to open
      act(() => {
        result.current.toggleModal('gameStatsModal');
      });
      
      expect(result.current.modals.gameStatsModal).toBe(true);
      
      // Toggle to close
      act(() => {
        result.current.toggleModal('gameStatsModal');
      });
      
      expect(result.current.modals.gameStatsModal).toBe(false);
    });

    it('should close all modals at once', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Open multiple modals
      act(() => {
        result.current.openModal('saveGameModal');
        result.current.openModal('loadGameModal');
        result.current.openModal('settingsModal');
      });
      
      expect(result.current.modals.saveGameModal).toBe(true);
      expect(result.current.modals.loadGameModal).toBe(true);
      expect(result.current.modals.settingsModal).toBe(true);
      
      // Close all
      act(() => {
        result.current.closeAllModals();
      });
      
      expect(result.current.modals.saveGameModal).toBe(false);
      expect(result.current.modals.loadGameModal).toBe(false);
      expect(result.current.modals.settingsModal).toBe(false);
    });

    it('should work with modal hook', () => {
      const { result } = renderHook(() => useModal('authModal'));
      
      expect(result.current.isOpen).toBe(false);
      
      act(() => {
        result.current.open();
      });
      
      expect(result.current.isOpen).toBe(true);
      
      act(() => {
        result.current.toggle();
      });
      
      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('View State Management', () => {
    it('should initialize with default view state', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.view.isTacticsBoardView).toBe(false);
      expect(result.current.view.isDrawingMode).toBe(false);
      expect(result.current.view.isPlayerSelectionMode).toBe(false);
      expect(result.current.view.showPlayerNames).toBe(true);
      expect(result.current.view.selectedPlayerIds).toEqual([]);
    });

    it('should handle tactics board view correctly', () => {
      const { result } = renderHook(() => useTacticsBoard());
      
      expect(result.current.isEnabled).toBe(false);
      
      act(() => {
        result.current.enable();
      });
      
      expect(result.current.isEnabled).toBe(true);
      
      act(() => {
        result.current.toggle();
      });
      
      expect(result.current.isEnabled).toBe(false);
    });

    it('should handle drawing mode with exclusive states', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Enable player selection mode first
      act(() => {
        result.current.setPlayerSelectionMode(true);
      });
      
      expect(result.current.view.isPlayerSelectionMode).toBe(true);
      expect(result.current.view.isDrawingMode).toBe(false);
      
      // Enable drawing mode (should disable player selection)
      act(() => {
        result.current.setDrawingMode(true);
      });
      
      expect(result.current.view.isDrawingMode).toBe(true);
      expect(result.current.view.isPlayerSelectionMode).toBe(false);
    });

    it('should handle field edit mode with exclusive states', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Enable drawing and selection modes
      act(() => {
        result.current.setDrawingMode(true);
        result.current.setPlayerSelectionMode(true);
      });
      
      // Only selection should be active (last set)
      expect(result.current.view.isPlayerSelectionMode).toBe(true);
      expect(result.current.view.isDrawingMode).toBe(false);
      
      // Enable field edit mode (should disable others)
      act(() => {
        result.current.setFieldEditMode(true);
      });
      
      expect(result.current.view.isFieldEditMode).toBe(true);
      expect(result.current.view.isDrawingMode).toBe(false);
      expect(result.current.view.isPlayerSelectionMode).toBe(false);
    });

    it('should handle display preferences', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setShowPlayerNames(false);
        result.current.setShowPlayerNumbers(true);
        result.current.setShowOpponents(false);
      });
      
      expect(result.current.view.showPlayerNames).toBe(false);
      expect(result.current.view.showPlayerNumbers).toBe(true);
      expect(result.current.view.showOpponents).toBe(false);
    });
  });

  describe('Drawing Tool Management', () => {
    it('should handle drawing tool selection', () => {
      const { result } = renderHook(() => useDrawingMode());
      
      expect(result.current.tool).toBeNull();
      expect(result.current.color).toBe('#000000');
      expect(result.current.thickness).toBe(2);
      
      act(() => {
        result.current.setTool('pen');
        result.current.setColor('#FF0000');
        result.current.setThickness(5);
      });
      
      expect(result.current.tool).toBe('pen');
      expect(result.current.color).toBe('#FF0000');
      expect(result.current.thickness).toBe(5);
    });

    it('should handle all drawing tool types', () => {
      const { result } = renderHook(() => useUIStore());
      
      const tools = ['pen', 'line', 'arrow', 'circle', 'eraser'] as const;
      
      tools.forEach(tool => {
        act(() => {
          result.current.setDrawingTool(tool);
        });
        
        expect(result.current.view.selectedDrawingTool).toBe(tool);
      });
      
      // Test clearing tool
      act(() => {
        result.current.setDrawingTool(null);
      });
      
      expect(result.current.view.selectedDrawingTool).toBeNull();
    });
  });

  describe('Player Selection Management', () => {
    it('should handle player selection correctly', () => {
      const { result } = renderHook(() => usePlayerSelection());
      
      expect(result.current.selectedIds).toEqual([]);
      
      act(() => {
        result.current.selectPlayer('player-1');
        result.current.selectPlayer('player-2');
      });
      
      expect(result.current.selectedIds).toEqual(['player-1', 'player-2']);
    });

    it('should prevent duplicate player selection', () => {
      const { result } = renderHook(() => usePlayerSelection());
      
      act(() => {
        result.current.selectPlayer('player-1');
        result.current.selectPlayer('player-1'); // Duplicate
      });
      
      expect(result.current.selectedIds).toEqual(['player-1']);
    });

    it('should handle player deselection', () => {
      const { result } = renderHook(() => usePlayerSelection());
      
      // Select multiple players
      act(() => {
        result.current.setSelection(['player-1', 'player-2', 'player-3']);
      });
      
      expect(result.current.selectedIds).toEqual(['player-1', 'player-2', 'player-3']);
      
      // Deselect one player
      act(() => {
        result.current.deselectPlayer('player-2');
      });
      
      expect(result.current.selectedIds).toEqual(['player-1', 'player-3']);
    });

    it('should clear all selections', () => {
      const { result } = renderHook(() => usePlayerSelection());
      
      act(() => {
        result.current.setSelection(['player-1', 'player-2', 'player-3']);
      });
      
      expect(result.current.selectedIds).toHaveLength(3);
      
      act(() => {
        result.current.clearSelection();
      });
      
      expect(result.current.selectedIds).toEqual([]);
    });
  });

  describe('Notification Management', () => {
    beforeEach(() => {
      // Clear any existing notifications
      act(() => {
        useUIStore.getState().clearNotifications();
      });
    });

    it('should add notifications correctly', () => {
      const { result } = renderHook(() => useNotificationActions());
      
      act(() => {
        result.current.showSuccess('Success', 'Operation completed successfully');
      });
      
      const notifications = useUIStore.getState().notifications.notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('success');
      expect(notifications[0].title).toBe('Success');
      expect(notifications[0].message).toBe('Operation completed successfully');
    });

    it('should handle different notification types', () => {
      const { result } = renderHook(() => useNotificationActions());
      
      act(() => {
        result.current.showSuccess('Success', 'Success message');
        result.current.showError('Error', 'Error message');
        result.current.showWarning('Warning', 'Warning message');
        result.current.showInfo('Info', 'Info message');
      });
      
      const notifications = useUIStore.getState().notifications.notifications;
      expect(notifications).toHaveLength(4);
      
      const types = notifications.map(n => n.type);
      expect(types).toContain('success');
      expect(types).toContain('error');
      expect(types).toContain('warning');
      expect(types).toContain('info');
    });

    it('should remove specific notifications', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Add a notification
      act(() => {
        result.current.addNotification({
          type: 'info',
          title: 'Test',
          message: 'Test message',
          duration: 0, // Don't auto-remove
        });
      });
      
      const notifications = result.current.notifications.notifications;
      expect(notifications).toHaveLength(1);
      
      const notificationId = notifications[0].id;
      
      // Remove the notification
      act(() => {
        result.current.removeNotification(notificationId);
      });
      
      expect(result.current.notifications.notifications).toHaveLength(0);
    });

    it('should clear all notifications', () => {
      const { result } = renderHook(() => useNotificationActions());
      
      act(() => {
        result.current.showSuccess('Success 1', 'Message 1');
        result.current.showError('Error 1', 'Message 2');
        result.current.showInfo('Info 1', 'Message 3');
      });
      
      expect(useUIStore.getState().notifications.notifications).toHaveLength(3);
      
      act(() => {
        result.current.clear();
      });
      
      expect(useUIStore.getState().notifications.notifications).toHaveLength(0);
    });

    it('should auto-remove notifications after duration', (done) => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.addNotification({
          type: 'info',
          title: 'Auto Remove',
          message: 'This should disappear',
          duration: 100, // 100ms for testing
        });
      });
      
      expect(result.current.notifications.notifications).toHaveLength(1);
      
      // Check that notification is removed after duration
      setTimeout(() => {
        expect(useUIStore.getState().notifications.notifications).toHaveLength(0);
        done();
      }, 150);
    });
  });

  describe('Store Reset Functionality', () => {
    it('should reset view state correctly', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Set some non-default values
      act(() => {
        result.current.setTacticsBoardView(true);
        result.current.setDrawingMode(true);
        result.current.setSelectedPlayerIds(['player-1', 'player-2']);
        result.current.setDrawingTool('pen');
      });
      
      // Reset view
      act(() => {
        result.current.resetView();
      });
      
      const view = result.current.view;
      expect(view.isTacticsBoardView).toBe(false);
      expect(view.isDrawingMode).toBe(false);
      expect(view.selectedPlayerIds).toEqual([]);
      expect(view.selectedDrawingTool).toBeNull();
    });

    it('should reset all UI state correctly', () => {
      const { result } = renderHook(() => useUIStore());
      
      // Set various states
      act(() => {
        result.current.openModal('saveGameModal');
        result.current.openModal('settingsModal');
        result.current.setTacticsBoardView(true);
        result.current.addNotification({
          type: 'info',
          title: 'Test',
          message: 'Test message',
        });
      });
      
      // Verify states are set
      expect(result.current.modals.saveGameModal).toBe(true);
      expect(result.current.view.isTacticsBoardView).toBe(true);
      expect(result.current.notifications.notifications).toHaveLength(1);
      
      // Reset all
      act(() => {
        result.current.resetAll();
      });
      
      // Verify everything is reset
      expect(result.current.modals.saveGameModal).toBe(false);
      expect(result.current.modals.settingsModal).toBe(false);
      expect(result.current.view.isTacticsBoardView).toBe(false);
      expect(result.current.notifications.notifications).toHaveLength(0);
    });
  });

  describe('Cross-Hook State Consistency', () => {
    it('should maintain consistency between different hook selectors', () => {
      const { result: storeResult } = renderHook(() => useUIStore());
      const { result: modalResult } = renderHook(() => useModal('gameStatsModal'));
      const { result: tacticsResult } = renderHook(() => useTacticsBoard());
      
      // Change state through store
      act(() => {
        storeResult.current.openModal('gameStatsModal');
        storeResult.current.setTacticsBoardView(true);
      });
      
      // Verify consistency across hooks
      expect(modalResult.current.isOpen).toBe(true);
      expect(tacticsResult.current.isEnabled).toBe(true);
      
      // Change state through specific hooks
      act(() => {
        modalResult.current.close();
        tacticsResult.current.disable();
      });
      
      // Verify consistency
      expect(storeResult.current.modals.gameStatsModal).toBe(false);
      expect(storeResult.current.view.isTacticsBoardView).toBe(false);
    });
  });
});