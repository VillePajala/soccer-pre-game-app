/**
 * 🔧 CUTOVER: Pure Zustand TrainingResourcesModal Hook
 */

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import logger from '@/utils/logger';

export interface TrainingResourcesModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useTrainingResourcesModalState(): TrainingResourcesModalState {
  const isOpen = useUIStore((state) => state.modals.trainingResourcesModal);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  
  const open = useCallback(() => {
    logger.debug('[TrainingResourcesModal] Opening via Zustand');
    openModal('trainingResourcesModal');
  }, [openModal]);
  
  const close = useCallback(() => {
    logger.debug('[TrainingResourcesModal] Closing via Zustand');
    closeModal('trainingResourcesModal');
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

export function useTrainingResourcesModalWithHandlers() {
  const modalState = useTrainingResourcesModalState();
  
  const handleClose = useCallback(() => {
    logger.info('[TrainingResourcesModal] Closing modal');
    modalState.close();
  }, [modalState]);
  
  const handleOpen = useCallback(() => {
    logger.info('[TrainingResourcesModal] Opening modal');
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

export const useTrainingResourcesModal = useTrainingResourcesModalState;