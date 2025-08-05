/**
 * 🔧 CUTOVER: Pure Zustand GameStatsModal Hook
 */

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import logger from '@/utils/logger';

export interface GameStatsModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useGameStatsModalState(): GameStatsModalState {
  const isOpen = useUIStore((state) => state.modals.gameStatsModal);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  
  const open = useCallback(() => {
    logger.debug('[GameStatsModal] Opening via Zustand');
    openModal('gameStatsModal');
  }, [openModal]);
  
  const close = useCallback(() => {
    logger.debug('[GameStatsModal] Closing via Zustand');
    closeModal('gameStatsModal');
  }, [closeModal]);
  
  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);
  
  return { isOpen, open, close, toggle };
}

export function useGameStatsModalWithHandlers() {
  const modalState = useGameStatsModalState();
  
  // 🔥 FLICKERING FIX: Depend on stable functions, not modalState object
  const handleClose = useCallback(() => {
    logger.info('[GameStatsModal] Closing modal');
    modalState.close();
  }, [modalState.close]);
  
  const handleOpen = useCallback(() => {
    logger.info('[GameStatsModal] Opening modal');
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
    onOpen: handleOpen,
    onClose: handleClose,
    onToggle: handleToggle,
  };
}

export const useGameStatsModal = useGameStatsModalState;