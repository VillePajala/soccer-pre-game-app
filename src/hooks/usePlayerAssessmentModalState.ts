/**
 * 🔧 CUTOVER: Pure Zustand PlayerAssessmentModal Hook
 */

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import logger from '@/utils/logger';

export interface PlayerAssessmentModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function usePlayerAssessmentModalState(): PlayerAssessmentModalState {
  const isOpen = useUIStore((state) => state.modals.playerAssessmentModal);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  
  const open = useCallback(() => {
    logger.debug('[PlayerAssessmentModal] Opening via Zustand');
    openModal('playerAssessmentModal');
  }, [openModal]);
  
  const close = useCallback(() => {
    logger.debug('[PlayerAssessmentModal] Closing via Zustand');
    closeModal('playerAssessmentModal');
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

export function usePlayerAssessmentModalWithHandlers() {
  const modalState = usePlayerAssessmentModalState();
  
  const handleClose = useCallback(() => {
    logger.info('[PlayerAssessmentModal] Closing modal');
    modalState.close();
  }, [modalState]);
  
  const handleOpen = useCallback(() => {
    logger.info('[PlayerAssessmentModal] Opening modal');
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

export const usePlayerAssessmentModal = usePlayerAssessmentModalState;