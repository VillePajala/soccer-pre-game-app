/**
 * Season Tournament Modal State Hook - Zustand Integration
 * 
 * This hook provides a Zustand-based alternative to the React Context modal state
 * for the SeasonTournamentManagementModal. It maintains the same interface as the Context-based
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

export interface SeasonTournamentModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Hook for managing SeasonTournamentModal state with Zustand
 * Provides automatic fallback to Context-based state management
 */
export function useSeasonTournamentModalState(): SeasonTournamentModalState {
  const { shouldUseLegacy } = useMigrationSafety('SeasonTournamentModal');
  
  // Zustand-based implementation
  const zustandIsOpen = useUIStore((state) => state.modals.seasonTournamentModal);
  const zustandOpenModal = useUIStore((state) => state.openModal);
  const zustandCloseModal = useUIStore((state) => state.closeModal);
  
  // Context-based fallback
  const contextModalState = useModalContext();
  
  // Zustand actions
  const zustandOpen = useCallback(() => {
    logger.debug('[SeasonTournamentModal] Opening via Zustand');
    zustandOpenModal('seasonTournamentModal');
  }, [zustandOpenModal]);
  
  const zustandClose = useCallback(() => {
    logger.debug('[SeasonTournamentModal] Closing via Zustand');
    zustandCloseModal('seasonTournamentModal');
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
    logger.debug('[SeasonTournamentModal] Opening via Context');
    contextModalState.setIsSeasonTournamentModalOpen(true);
  }, [contextModalState]);
  
  const contextClose = useCallback(() => {
    logger.debug('[SeasonTournamentModal] Closing via Context');
    contextModalState.setIsSeasonTournamentModalOpen(false);
  }, [contextModalState]);
  
  const contextToggle = useCallback(() => {
    if (contextModalState.isSeasonTournamentModalOpen) {
      contextClose();
    } else {
      contextOpen();
    }
  }, [contextModalState.isSeasonTournamentModalOpen, contextOpen, contextClose]);
  
  // Return appropriate implementation based on migration status
  if (shouldUseLegacy) {
    return {
      isOpen: contextModalState.isSeasonTournamentModalOpen,
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
 * @deprecated Use useSeasonTournamentModalState instead
 */
export function useSeasonTournamentModal() {
  return useSeasonTournamentModalState();
}

/**
 * Hook that provides both modal state and common handlers
 * Extends the basic modal state with utility functions
 */
export function useSeasonTournamentModalWithHandlers() {
  const modalState = useSeasonTournamentModalState();
  
  // Create combined handlers that include common modal operations
  const openModal = useCallback(() => {
    logger.info('[SeasonTournamentModal] Opening modal');
    modalState.open();
  }, [modalState]);
  
  const closeModal = useCallback(() => {
    logger.info('[SeasonTournamentModal] Closing modal');
    modalState.close();
  }, [modalState]);
  
  const handleClose = useCallback(() => {
    // Add any cleanup logic here if needed
    // For SeasonTournament modal, we might want to clear form state
    closeModal();
  }, [closeModal]);
  
  const handleOpen = useCallback(() => {
    // Add any setup logic here if needed
    // For SeasonTournament modal, we might want to refresh seasons/tournaments
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
    // Legacy naming for season-tournament-specific handlers
    openSeasonTournamentModal: handleOpen,
    closeSeasonTournamentModal: handleClose,
  };
}

/**
 * Performance-optimized selector hook
 * Only re-renders when the specific modal state changes
 */
export function useSeasonTournamentModalSelector() {
  const { shouldUseLegacy } = useMigrationSafety('SeasonTournamentModal');
  
  // Always call hooks in the same order
  const contextState = useModalContext();
  const zustandIsOpen = useUIStore((state) => state.modals.seasonTournamentModal);
  
  if (shouldUseLegacy) {
    return {
      isOpen: contextState.isSeasonTournamentModalOpen,
      migrationStatus: 'legacy' as const,
    };
  }
  
  return {
    isOpen: zustandIsOpen,
    migrationStatus: 'zustand' as const,
  };
}