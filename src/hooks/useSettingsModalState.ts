/**
 * 🔧 CUTOVER: Pure Zustand SettingsModal Hook
 */

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import logger from '@/utils/logger';

export interface SettingsModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useSettingsModalState(): SettingsModalState {
  const isOpen = useUIStore((state) => state.modals.settingsModal);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  
  const open = useCallback(() => {
    logger.debug('[SettingsModal] Opening via Zustand');
    openModal('settingsModal');
  }, [openModal]);
  
  const close = useCallback(() => {
    logger.debug('[SettingsModal] Closing via Zustand');
    closeModal('settingsModal');
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

export function useSettingsModalWithHandlers() {
  const modalState = useSettingsModalState();
  
  const handleClose = useCallback(() => {
    logger.info('[SettingsModal] Closing modal');
    modalState.close();
  }, [modalState]);
  
  const handleOpen = useCallback(() => {
    logger.info('[SettingsModal] Opening modal');
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
    onOpen: handleOpen,
    onClose: handleClose,
    onToggle: handleToggle,
  };
}

export const useSettingsModal = useSettingsModalState;