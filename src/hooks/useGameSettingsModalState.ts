/**
 * 🔧 CUTOVER: Pure Zustand GameSettingsModal Hook
 */

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import logger from '@/utils/logger';

export interface GameSettingsModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useGameSettingsModalState(): GameSettingsModalState {
  const isOpen = useUIStore((state) => state.modals.gameSettingsModal);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  
  const open = useCallback(() => {
    logger.debug('[GameSettingsModal] Opening via Zustand');
    openModal('gameSettingsModal');
  }, [openModal]);
  
  const close = useCallback(() => {
    logger.debug('[GameSettingsModal] Closing via Zustand');
    closeModal('gameSettingsModal');
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

export function useGameSettingsModalWithHandlers() {
  const modalState = useGameSettingsModalState();
  
  // 🔥 FLICKERING FIX: Depend on stable functions, not modalState object
  const handleClose = useCallback(() => {
    logger.info('[GameSettingsModal] Closing modal');
    modalState.close();
  }, [modalState.close]);
  
  const handleOpen = useCallback(() => {
    logger.info('[GameSettingsModal] Opening modal');
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

export const useGameSettingsModal = useGameSettingsModalState;