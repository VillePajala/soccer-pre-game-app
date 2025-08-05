/**
 * 🔧 CUTOVER: Pure Zustand LoadGameModal Hook
 * 
 * Simplified modal state hook that uses ONLY Zustand - no migration complexity.
 * This replaces the complex dual-system approach with clean, direct Zustand usage.
 */

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import logger from '@/utils/logger';

export interface LoadGameModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Pure Zustand hook for LoadGameModal state
 * Simple, direct, no migration complexity
 */
export function useLoadGameModalState(): LoadGameModalState {
  // Direct Zustand selectors - no migration logic
  const isOpen = useUIStore((state) => state.modals.loadGameModal);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  
  // Simple actions
  const open = useCallback(() => {
    logger.debug('[LoadGameModal] Opening via Zustand');
    openModal('loadGameModal');
  }, [openModal]);
  
  const close = useCallback(() => {
    logger.debug('[LoadGameModal] Closing via Zustand');
    closeModal('loadGameModal');
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
export function useLoadGameModalWithHandlers() {
  const modalState = useLoadGameModalState();
  
  const handleClose = useCallback(() => {
    logger.info('[LoadGameModal] Closing modal');
    modalState.close();
  }, [modalState]);
  
  const handleOpen = useCallback(() => {
    logger.info('[LoadGameModal] Opening modal');
    modalState.open();
  }, [modalState]);
  
  const handleToggle = useCallback(() => {
    modalState.toggle();
  }, [modalState]);
  
  return {
    ...modalState,
    handleOpen,
    handleClose,
    handleToggle,
    // Legacy aliases for compatibility
    onOpen: handleOpen,
    onClose: handleClose,
    onToggle: handleToggle,
    openLoadGameModal: handleOpen,
    closeLoadGameModal: handleClose,
  };
}

// Legacy compatibility
export const useLoadGameModal = useLoadGameModalState;