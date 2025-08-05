/**
 * 🔧 CUTOVER: Pure Zustand RosterSettingsModal Hook
 */

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import logger from '@/utils/logger';

export interface RosterSettingsModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useRosterSettingsModalState(): RosterSettingsModalState {
  const isOpen = useUIStore((state) => state.modals.rosterSettingsModal);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  
  const open = useCallback(() => {
    logger.debug('[RosterSettingsModal] Opening via Zustand');
    openModal('rosterSettingsModal');
  }, [openModal]);
  
  const close = useCallback(() => {
    logger.debug('[RosterSettingsModal] Closing via Zustand');
    closeModal('rosterSettingsModal');
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

export function useRosterSettingsModalWithHandlers() {
  const modalState = useRosterSettingsModalState();
  
  const handleClose = useCallback(() => {
    logger.info('[RosterSettingsModal] Closing modal');
    modalState.close();
  }, [modalState]);
  
  const handleOpen = useCallback(() => {
    logger.info('[RosterSettingsModal] Opening modal');
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

export const useRosterSettingsModal = useRosterSettingsModalState;