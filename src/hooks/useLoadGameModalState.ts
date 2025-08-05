/**
 * Load Game Modal State Hook - Zustand Integration
 * 
 * This hook provides a Zustand-based alternative to the React Context modal state
 * for the LoadGameModal. It maintains the same interface as the Context-based
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

export interface LoadGameModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook for managing LoadGameModal state with Zustand
 * Provides automatic fallback to Context-based state management
 */
export function useLoadGameModalState(): LoadGameModalState {
  const { shouldUseLegacy } = useMigrationSafety('LoadGameModal');
  
  // 🔧 PERFORMANCE FIX: Single store subscription instead of 3 separate ones
  const { isOpen: zustandIsOpen, openModal: zustandOpenModal, closeModal: zustandCloseModal } = useUIStore(
    (state) => ({
      isOpen: state.modals.loadGameModal,
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
    logger.debug('[LoadGameModal] Opening via Zustand');
    zustandOpenModal('loadGameModal');
  }, [zustandOpenModal]);
  
  const zustandClose = useCallback(() => {
    logger.debug('[LoadGameModal] Closing via Zustand');
    zustandCloseModal('loadGameModal');
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
    logger.debug('[LoadGameModal] Opening via Context');
    contextModalState.setIsLoadGameModalOpen(true);
  }, [contextModalState]);
  
  const contextClose = useCallback(() => {
    logger.debug('[LoadGameModal] Closing via Context');
    contextModalState.setIsLoadGameModalOpen(false);
  }, [contextModalState]);
  
  const contextToggle = useCallback(() => {
    if (contextModalState.isLoadGameModalOpen) {
      contextClose();
    } else {
      contextOpen();
    }
  }, [contextModalState.isLoadGameModalOpen, contextOpen, contextClose]);
  
  // Return appropriate implementation based on migration status
  if (shouldUseLegacy) {
    return {
      isOpen: contextModalState.isLoadGameModalOpen,
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
 * @deprecated Use useLoadGameModalState instead
 */
export function useLoadGameModal() {
  return useLoadGameModalState();
}

/**
 * Hook that provides both modal state and common handlers
 * Extends the basic modal state with utility functions
 */
export function useLoadGameModalWithHandlers() {
  const modalState = useLoadGameModalState();
  
  // Create combined handlers that include common modal operations
  const openModal = useCallback(() => {
    logger.info('[LoadGameModal] Opening modal');
    modalState.open();
  }, [modalState]);
  
  const closeModal = useCallback(() => {
    logger.info('[LoadGameModal] Closing modal');
    modalState.close();
  }, [modalState]);
  
  const handleClose = useCallback(() => {
    // Add any cleanup logic here if needed
    // For LoadGame modal, we might want to clear any loading states
    closeModal();
  }, [closeModal]);
  
  const handleOpen = useCallback(() => {
    // Add any setup logic here if needed
    // For LoadGame modal, we might want to refresh games list
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
    // Legacy naming for load-game-specific handlers
    openLoadGameModal: handleOpen,
    closeLoadGameModal: handleClose,
  };
}

/**
 * Performance-optimized selector hook
 * Only re-renders when the specific modal state changes
 */
export function useLoadGameModalSelector() {
  const { shouldUseLegacy } = useMigrationSafety('LoadGameModal');
  
  // Always call hooks in the same order
  const contextState = useModalContext();
  const zustandIsOpen = useUIStore((state) => state.modals.loadGameModal);
  
  if (shouldUseLegacy) {
    return {
      isOpen: contextState.isLoadGameModalOpen,
      migrationStatus: 'legacy' as const,
    };
  }
  
  return {
    isOpen: zustandIsOpen,
    migrationStatus: 'zustand' as const,
  };
}