/**
 * 🔧 CUTOVER: Pure Zustand NewGameSetupModal Hook
 * 
 * Simplified modal state hook that uses ONLY Zustand - no migration complexity.
 * This replaces the complex dual-system approach with clean, direct Zustand usage.
 */

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import logger from '@/utils/logger';

export interface NewGameSetupModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Pure Zustand hook for NewGameSetupModal state
 * Simple, direct, no migration complexity
 */
export function useNewGameSetupModalState(): NewGameSetupModalState {
  // Direct Zustand selectors - no migration logic
  const isOpen = useUIStore((state) => state.modals.newGameSetupModal);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  
  // Simple actions
  const open = useCallback(() => {
    logger.debug('[NewGameSetupModal] Opening via Zustand');
    openModal('newGameSetupModal');
  }, [openModal]);
  
  const close = useCallback(() => {
    logger.debug('[NewGameSetupModal] Closing via Zustand');
    closeModal('newGameSetupModal');
  }, [closeModal]);
  
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);
  
  return {
    isOpen,
    open,
    close,
    toggle,
  };
}

/**
 * Extended hook with handler utilities
 * Maintains API compatibility with existing code
 */
export function useNewGameSetupModalWithHandlers() {
  const modalState = useNewGameSetupModalState();
  
  // 🔥 FLICKERING FIX: Depend on stable functions, not modalState object
  const handleClose = useCallback(() => {
    logger.info('[NewGameSetupModal] Closing modal');
    modalState.close();
  }, [modalState.close]);
  
  const handleOpen = useCallback(() => {
    logger.info('[NewGameSetupModal] Opening modal');
    modalState.open();
  }, [modalState.open]);
  
  const handleToggle = useCallback(() => {
    modalState.toggle();
  }, [modalState.toggle]);
  
  return {
    ...modalState,
    handleOpen,
    handleClose,
    handleToggle,
    // Legacy aliases for compatibility
    onOpen: handleOpen,
    onClose: handleClose,
    onToggle: handleToggle,
    openNewGameSetupModal: handleOpen,
    closeNewGameSetupModal: handleClose,
  };
}

// Legacy compatibility
export const useNewGameSetupModal = useNewGameSetupModalState;