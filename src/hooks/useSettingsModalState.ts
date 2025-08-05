/**
 * Settings Modal State Hook - Zustand Integration
 * 
 * This hook provides a Zustand-based alternative to the React Context modal state
 * for the SettingsModal. It maintains the same interface as the Context-based
 * approach but uses centralized Zustand state management.
 * 
 * Migration Strategy:
 * - Replace Context-based modal state with Zustand store state
 * - Maintain identical API for seamless integration
 * - Add migration safety with automatic rollback
 * - Provide performance benefits through optimized selectors
 */

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import { useModalContext } from '@/contexts/ModalProvider.migration';
import logger from '@/utils/logger';

export interface SettingsModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook for managing SettingsModal state with Zustand
 * Provides automatic fallback to Context-based state management
 */
export function useSettingsModalState(): SettingsModalState {
  const { shouldUseLegacy } = useMigrationSafety('SettingsModal');
  
  // 🔧 PERFORMANCE FIX: Single store subscription instead of 3 separate ones
  const { isOpen: zustandIsOpen, openModal: zustandOpenModal, closeModal: zustandCloseModal } = useUIStore(
    (state) => ({
      isOpen: state.modals.settingsModal,
      openModal: state.openModal,
      closeModal: state.closeModal,
    }),
    // 🔧 PERFORMANCE: Use shallow comparison to prevent unnecessary re-renders
    (prev, curr) => prev.isOpen === curr.isOpen
  );
  
  // Context-based fallback
  const contextModalState = useModalContext();
  
  // Zustand actions
  const zustandOpen = useCallback(() => {
    logger.debug('[SettingsModal] Opening via Zustand');
    zustandOpenModal('settingsModal');
  }, [zustandOpenModal]);
  
  const zustandClose = useCallback(() => {
    logger.debug('[SettingsModal] Closing via Zustand');
    zustandCloseModal('settingsModal');
  }, [zustandCloseModal]);
  
  const zustandToggle = useCallback(() => {
    if (zustandIsOpen) {
      zustandClose();
    } else {
      zustandOpen();
    }
  }, [zustandIsOpen, zustandOpen, zustandClose]);
  
  // Context actions
  const contextOpen = useCallback(() => {
    logger.debug('[SettingsModal] Opening via Context');
    contextModalState.setIsSettingsModalOpen(true);
  }, [contextModalState]);
  
  const contextClose = useCallback(() => {
    logger.debug('[SettingsModal] Closing via Context');
    contextModalState.setIsSettingsModalOpen(false);
  }, [contextModalState]);
  
  const contextToggle = useCallback(() => {
    if (contextModalState.isSettingsModalOpen) {
      contextClose();
    } else {
      contextOpen();
    }
  }, [contextModalState.isSettingsModalOpen, contextOpen, contextClose]);
  
  // Return appropriate implementation based on migration status
  if (shouldUseLegacy) {
    return {
      isOpen: contextModalState.isSettingsModalOpen,
      open: contextOpen,
      close: contextClose,
      toggle: contextToggle,
    };
  }
  
  return {
    isOpen: zustandIsOpen,
    open: zustandOpen,
    close: zustandClose,
    toggle: zustandToggle,
  };
}

/**
 * Legacy hook for backward compatibility
 * @deprecated Use useSettingsModalState instead
 */
export function useSettingsModal() {
  return useSettingsModalState();
}

/**
 * Hook that provides both modal state and common handlers
 * Extends the basic modal state with utility functions
 */
export function useSettingsModalWithHandlers() {
  const modalState = useSettingsModalState();
  
  // Create combined handlers that include common modal operations
  const openModal = useCallback(() => {
    logger.info('[SettingsModal] Opening modal');
    modalState.open();
  }, [modalState]);
  
  const closeModal = useCallback(() => {
    logger.info('[SettingsModal] Closing modal');
    modalState.close();
  }, [modalState]);
  
  const handleClose = useCallback(() => {
    // Add any cleanup logic here if needed
    // For Settings modal, we might want to save any pending changes
    closeModal();
  }, [closeModal]);
  
  const handleOpen = useCallback(() => {
    // Add any setup logic here if needed
    // For Settings modal, we might want to load current settings
    openModal();
  }, [openModal]);
  
  const handleToggle = useCallback(() => {
    if (modalState.isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  }, [modalState.isOpen, handleOpen, handleClose]);
  
  return {
    ...modalState,
    handleOpen,
    handleClose,
    handleToggle,
    // Alias for common naming patterns
    onOpen: handleOpen,
    onClose: handleClose,
    onToggle: handleToggle,
    // Legacy naming for settings-specific handlers
    openSettingsModal: handleOpen,
    closeSettingsModal: handleClose,
  };
}

/**
 * Performance-optimized selector hook
 * Only re-renders when the specific modal state changes
 */
export function useSettingsModalSelector() {
  const { shouldUseLegacy } = useMigrationSafety('SettingsModal');
  
  // Always call hooks in the same order
  const contextState = useModalContext();
  const zustandIsOpen = useUIStore((state) => state.modals.settingsModal);
  
  if (shouldUseLegacy) {
    return {
      isOpen: contextState.isSettingsModalOpen,
      migrationStatus: 'legacy' as const,
    };
  }
  
  return {
    isOpen: zustandIsOpen,
    migrationStatus: 'zustand' as const,
  };
}