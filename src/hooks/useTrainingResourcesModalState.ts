/**
 * Training Resources Modal State Hook - Zustand Integration
 * 
 * This hook provides a Zustand-based alternative to the React Context modal state
 * for the TrainingResourcesModal. It maintains the same interface as the Context-based
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

export interface TrainingResourcesModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook for managing TrainingResourcesModal state with Zustand
 * Provides automatic fallback to Context-based state management
 */
export function useTrainingResourcesModalState(): TrainingResourcesModalState {
  const { shouldUseLegacy } = useMigrationSafety('TrainingResourcesModal');
  
  // 🔧 PERFORMANCE FIX: Separate selectors to avoid object creation
  const zustandIsOpen = useUIStore((state) => state.modals.trainingResourcesModal);
  const zustandOpenModal = useUIStore((state) => state.openModal);
  const zustandCloseModal = useUIStore((state) => state.closeModal);
  
  // Context-based fallback
  const contextModalState = useModalContext();
  
  // Zustand actions
  const zustandOpen = useCallback(() => {
    logger.debug('[TrainingResourcesModal] Opening via Zustand');
    zustandOpenModal('trainingResourcesModal');
  }, [zustandOpenModal]);
  
  const zustandClose = useCallback(() => {
    logger.debug('[TrainingResourcesModal] Closing via Zustand');
    zustandCloseModal('trainingResourcesModal');
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
    logger.debug('[TrainingResourcesModal] Opening via Context');
    contextModalState.setIsTrainingResourcesOpen(true);
  }, [contextModalState]);
  
  const contextClose = useCallback(() => {
    logger.debug('[TrainingResourcesModal] Closing via Context');
    contextModalState.setIsTrainingResourcesOpen(false);
  }, [contextModalState]);
  
  const contextToggle = useCallback(() => {
    if (contextModalState.isTrainingResourcesOpen) {
      contextClose();
    } else {
      contextOpen();
    }
  }, [contextModalState.isTrainingResourcesOpen, contextOpen, contextClose]);
  
  // Return appropriate implementation based on migration status
  if (shouldUseLegacy) {
    return {
      isOpen: contextModalState.isTrainingResourcesOpen,
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
 * @deprecated Use useTrainingResourcesModalState instead
 */
export function useTrainingResourcesModal() {
  return useTrainingResourcesModalState();
}

/**
 * Hook that provides both modal state and common handlers
 * Extends the basic modal state with utility functions
 */
export function useTrainingResourcesModalWithHandlers() {
  const modalState = useTrainingResourcesModalState();
  
  // Create combined handlers that include common modal operations
  const openModal = useCallback(() => {
    logger.info('[TrainingResourcesModal] Opening modal');
    modalState.open();
  }, [modalState]);
  
  const closeModal = useCallback(() => {
    logger.info('[TrainingResourcesModal] Closing modal');
    modalState.close();
  }, [modalState]);
  
  const handleClose = useCallback(() => {
    // Add any cleanup logic here if needed
    // For TrainingResources modal, we might want to reset scroll position
    closeModal();
  }, [closeModal]);
  
  const handleOpen = useCallback(() => {
    // Add any setup logic here if needed
    // For TrainingResources modal, we might want to track analytics
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
    // Legacy naming for training-resources-specific handlers
    openTrainingResourcesModal: handleOpen,
    closeTrainingResourcesModal: handleClose,
    toggleTrainingResources: handleToggle,
  };
}

/**
 * Performance-optimized selector hook
 * Only re-renders when the specific modal state changes
 */
export function useTrainingResourcesModalSelector() {
  const { shouldUseLegacy } = useMigrationSafety('TrainingResourcesModal');
  
  // Always call hooks in the same order
  const contextState = useModalContext();
  const zustandIsOpen = useUIStore((state) => state.modals.trainingResourcesModal);
  
  if (shouldUseLegacy) {
    return {
      isOpen: contextState.isTrainingResourcesOpen,
      migrationStatus: 'legacy' as const,
    };
  }
  
  return {
    isOpen: zustandIsOpen,
    migrationStatus: 'zustand' as const,
  };
}