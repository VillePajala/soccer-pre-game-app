/**
 * 🔧 CUTOVER: Pure Zustand SeasonTournamentModal Hook
 */

import { useCallback } from 'react';
import { useUIStore } from '@/stores/uiStore';
import logger from '@/utils/logger';

export interface SeasonTournamentModalState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useSeasonTournamentModalState(): SeasonTournamentModalState {
  const isOpen = useUIStore((state) => state.modals.seasonTournamentModal);
  const openModal = useUIStore((state) => state.openModal);
  const closeModal = useUIStore((state) => state.closeModal);
  
  const open = useCallback(() => {
    logger.debug('[SeasonTournamentModal] Opening via Zustand');
    openModal('seasonTournamentModal');
  }, [openModal]);
  
  const close = useCallback(() => {
    logger.debug('[SeasonTournamentModal] Closing via Zustand');
    closeModal('seasonTournamentModal');
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

export function useSeasonTournamentModalWithHandlers() {
  const modalState = useSeasonTournamentModalState();
  
  // 🔥 FLICKERING FIX: Depend on stable functions, not modalState object
  const handleClose = useCallback(() => {
    logger.info('[SeasonTournamentModal] Closing modal');
    modalState.close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalState.close]);
  
  const handleOpen = useCallback(() => {
    logger.info('[SeasonTournamentModal] Opening modal');
    modalState.open();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalState.open]);
  
  const handleToggle = useCallback(() => {
    modalState.toggle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

export const useSeasonTournamentModal = useSeasonTournamentModalState;