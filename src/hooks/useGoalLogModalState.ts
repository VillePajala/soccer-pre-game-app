/**
 * Goal Log Modal State Hook - Zustand Integration
 * 
 * This hook provides a Zustand-based alternative to the React Context modal state
 * for the GoalLogModal. It maintains the same interface as the Context-based
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

export interface GoalLogModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook for managing GoalLogModal state with Zustand
 * Provides automatic fallback to Context-based state management
 */
export function useGoalLogModalState(): GoalLogModalState {
  const { shouldUseLegacy } = useMigrationSafety('GoalLogModal');
  
  // 🔧 PERFORMANCE FIX: Single store subscription instead of 3 separate ones
  const { isOpen: zustandIsOpen, openModal: zustandOpenModal, closeModal: zustandCloseModal } = useUIStore(
    (state) => ({
      isOpen: state.modals.goalLogModal,
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
    logger.debug('[GoalLogModal] Opening via Zustand');
    zustandOpenModal('goalLogModal');
  }, [zustandOpenModal]);
  
  const zustandClose = useCallback(() => {
    logger.debug('[GoalLogModal] Closing via Zustand');
    zustandCloseModal('goalLogModal');
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
    logger.debug('[GoalLogModal] Opening via Context');
    contextModalState.setIsGoalLogModalOpen(true);
  }, [contextModalState]);
  
  const contextClose = useCallback(() => {
    logger.debug('[GoalLogModal] Closing via Context');
    contextModalState.setIsGoalLogModalOpen(false);
  }, [contextModalState]);
  
  const contextToggle = useCallback(() => {
    if (contextModalState.isGoalLogModalOpen) {
      contextClose();
    } else {
      contextOpen();
    }
  }, [contextModalState.isGoalLogModalOpen, contextOpen, contextClose]);
  
  // Return appropriate implementation based on migration status
  if (shouldUseLegacy) {
    return {
      isOpen: contextModalState.isGoalLogModalOpen,
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
 * @deprecated Use useGoalLogModalState instead
 */
export function useGoalLogModal() {
  return useGoalLogModalState();
}

/**
 * Hook that provides both modal state and common handlers
 * Extends the basic modal state with utility functions
 */
export function useGoalLogModalWithHandlers() {
  const modalState = useGoalLogModalState();
  
  // Create combined handlers that include common modal operations
  const openModal = useCallback(() => {
    logger.info('[GoalLogModal] Opening modal');
    modalState.open();
  }, [modalState]);
  
  const closeModal = useCallback(() => {
    logger.info('[GoalLogModal] Closing modal');
    modalState.close();
  }, [modalState]);
  
  const handleClose = useCallback(() => {
    // Add any cleanup logic here if needed
    // For GoalLog modal, we might want to reset form state
    closeModal();
  }, [closeModal]);
  
  const handleOpen = useCallback(() => {
    // Add any setup logic here if needed
    // For GoalLog modal, we might want to initialize with current game time
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
    // Legacy naming for goal-log-specific handlers
    openGoalLogModal: handleOpen,
    closeGoalLogModal: handleClose,
    toggleGoalLogModal: handleToggle,
  };
}

/**
 * Performance-optimized selector hook
 * Only re-renders when the specific modal state changes
 */
export function useGoalLogModalSelector() {
  const { shouldUseLegacy } = useMigrationSafety('GoalLogModal');
  
  // Always call hooks in the same order
  const contextState = useModalContext();
  const zustandIsOpen = useUIStore((state) => state.modals.goalLogModal);
  
  if (shouldUseLegacy) {
    return {
      isOpen: contextState.isGoalLogModalOpen,
      migrationStatus: 'legacy' as const,
    };
  }
  
  return {
    isOpen: zustandIsOpen,
    migrationStatus: 'zustand' as const,
  };
}