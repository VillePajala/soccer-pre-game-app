/**
 * Game Settings Modal State Hook - Zustand Integration
 * 
 * This hook provides a Zustand-based alternative to the React Context modal state
 * for the GameSettingsModal. It maintains the same interface as the Context-based
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

export interface GameSettingsModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook for managing GameSettingsModal state with Zustand
 * Provides automatic fallback to Context-based state management
 */
export function useGameSettingsModalState(): GameSettingsModalState {
  const { shouldUseLegacy } = useMigrationSafety('GameSettingsModal');
  
  // 🔧 PERFORMANCE FIX: Single store subscription instead of 3 separate ones
  const { isOpen: zustandIsOpen, openModal: zustandOpenModal, closeModal: zustandCloseModal } = useUIStore(
    (state) => ({
      isOpen: state.modals.gameSettingsModal,
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
    logger.debug('[GameSettingsModal] Opening via Zustand');
    zustandOpenModal('gameSettingsModal');
  }, [zustandOpenModal]);
  
  const zustandClose = useCallback(() => {
    logger.debug('[GameSettingsModal] Closing via Zustand');
    zustandCloseModal('gameSettingsModal');
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
    logger.debug('[GameSettingsModal] Opening via Context');
    contextModalState.setIsGameSettingsModalOpen(true);
  }, [contextModalState]);
  
  const contextClose = useCallback(() => {
    logger.debug('[GameSettingsModal] Closing via Context');
    contextModalState.setIsGameSettingsModalOpen(false);
  }, [contextModalState]);
  
  const contextToggle = useCallback(() => {
    if (contextModalState.isGameSettingsModalOpen) {
      contextClose();
    } else {
      contextOpen();
    }
  }, [contextModalState.isGameSettingsModalOpen, contextOpen, contextClose]);
  
  // Return appropriate implementation based on migration status
  if (shouldUseLegacy) {
    return {
      isOpen: contextModalState.isGameSettingsModalOpen,
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
 * @deprecated Use useGameSettingsModalState instead
 */
export function useGameSettingsModal() {
  return useGameSettingsModalState();
}

/**
 * Hook that provides both modal state and common handlers
 * Extends the basic modal state with utility functions
 */
export function useGameSettingsModalWithHandlers() {
  const modalState = useGameSettingsModalState();
  
  // Create combined handlers that include common modal operations
  const openModal = useCallback(() => {
    logger.info('[GameSettingsModal] Opening modal');
    modalState.open();
  }, [modalState]);
  
  const closeModal = useCallback(() => {
    logger.info('[GameSettingsModal] Closing modal');
    modalState.close();
  }, [modalState]);
  
  const handleClose = useCallback(() => {
    // Add any cleanup logic here if needed
    closeModal();
  }, [closeModal]);
  
  const handleOpen = useCallback(() => {
    // Add any setup logic here if needed
    openModal();
  }, [openModal]);
  
  return {
    ...modalState,
    handleOpen,
    handleClose,
    // Alias for common naming patterns
    onOpen: handleOpen,
    onClose: handleClose,
  };
}

/**
 * Performance-optimized selector hook
 * Only re-renders when the specific modal state changes
 */
export function useGameSettingsModalSelector() {
  const { shouldUseLegacy } = useMigrationSafety('GameSettingsModal');
  
  // Always call hooks in the same order
  const contextState = useModalContext();
  const zustandIsOpen = useUIStore((state) => state.modals.gameSettingsModal);
  
  if (shouldUseLegacy) {
    return {
      isOpen: contextState.isGameSettingsModalOpen,
      migrationStatus: 'legacy' as const,
    };
  }
  
  return {
    isOpen: zustandIsOpen,
    migrationStatus: 'zustand' as const,
  };
}