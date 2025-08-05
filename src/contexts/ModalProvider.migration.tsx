'use client';

import React, { createContext, useContext, useMemo } from 'react';
import { ModalProvider as LegacyModalProvider, useModalContext as useLegacyModalContext } from './ModalProvider';
import { useUIStore, type ModalState } from '@/stores/uiStore';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import logger from '@/utils/logger';

// Modal context interface that matches legacy interface
interface ModalContextValue {
  isGameSettingsModalOpen: boolean;
  setIsGameSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadGameModalOpen: boolean;
  setIsLoadGameModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isRosterModalOpen: boolean;
  setIsRosterModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSeasonTournamentModalOpen: boolean;
  setIsSeasonTournamentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isTrainingResourcesOpen: boolean;
  setIsTrainingResourcesOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isGoalLogModalOpen: boolean;
  setIsGoalLogModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isGameStatsModalOpen: boolean;
  setIsGameStatsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isNewGameSetupModalOpen: boolean;
  setIsNewGameSetupModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isPlayerAssessmentModalOpen: boolean;
  setIsPlayerAssessmentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// Create unified context for both legacy and migrated providers
const UnifiedModalContext = createContext<ModalContextValue | undefined>(undefined);

// Modal mapping between legacy names and Zustand store names (for reference)
// const MODAL_MAPPING: Record<string, keyof ModalState> = {
//   isGameSettingsModalOpen: 'gameSettingsModal',
//   isLoadGameModalOpen: 'loadGameModal',
//   isRosterModalOpen: 'rosterSettingsModal',
//   isSeasonTournamentModalOpen: 'seasonTournamentModal',
//   isTrainingResourcesOpen: 'trainingResourcesModal',
//   isGoalLogModalOpen: 'goalLogModal',
//   isGameStatsModalOpen: 'gameStatsModal',
//   isNewGameSetupModalOpen: 'newGameSetupModal',
//   isSettingsModalOpen: 'settingsModal',
//   isPlayerAssessmentModalOpen: 'playerAssessmentModal',
// };

/**
 * Migrated ModalProvider that uses Zustand store
 */
function MigratedModalProvider({ children }: { children: React.ReactNode }) {
  const uiStore = useUIStore();
  
  // Create context value that matches legacy interface
  const contextValue: ModalContextValue = useMemo(() => {
    // Create setter functions that map to Zustand actions
    const createSetter = (modalName: keyof ModalState) => {
      return (value: boolean | ((prev: boolean) => boolean)) => {
        const newValue = typeof value === 'function' ? value(uiStore.modals[modalName]) : value;
        if (newValue) {
          uiStore.openModal(modalName);
        } else {
          uiStore.closeModal(modalName);
        }
      };
    };

    return {
      // Map Zustand state to legacy interface names
      isGameSettingsModalOpen: uiStore.modals.gameSettingsModal,
      setIsGameSettingsModalOpen: createSetter('gameSettingsModal'),
      
      isLoadGameModalOpen: uiStore.modals.loadGameModal,
      setIsLoadGameModalOpen: createSetter('loadGameModal'),
      
      isRosterModalOpen: uiStore.modals.rosterSettingsModal,
      setIsRosterModalOpen: createSetter('rosterSettingsModal'),
      
      isSeasonTournamentModalOpen: uiStore.modals.seasonTournamentModal,
      setIsSeasonTournamentModalOpen: createSetter('seasonTournamentModal'),
      
      isTrainingResourcesOpen: uiStore.modals.trainingResourcesModal,
      setIsTrainingResourcesOpen: createSetter('trainingResourcesModal'),
      
      isGoalLogModalOpen: uiStore.modals.goalLogModal,
      setIsGoalLogModalOpen: createSetter('goalLogModal'),
      
      isGameStatsModalOpen: uiStore.modals.gameStatsModal,
      setIsGameStatsModalOpen: createSetter('gameStatsModal'),
      
      isNewGameSetupModalOpen: uiStore.modals.newGameSetupModal,
      setIsNewGameSetupModalOpen: createSetter('newGameSetupModal'),
      
      isSettingsModalOpen: uiStore.modals.settingsModal,
      setIsSettingsModalOpen: createSetter('settingsModal'),
      
      isPlayerAssessmentModalOpen: uiStore.modals.playerAssessmentModal,
      setIsPlayerAssessmentModalOpen: createSetter('playerAssessmentModal'),
    };
  }, [uiStore]);
  
  return (
    <UnifiedModalContext.Provider value={contextValue}>
      {children}
    </UnifiedModalContext.Provider>
  );
}

/**
 * Context forwarder for legacy provider
 */
function LegacyContextForwarder({ children }: { children: React.ReactNode }) {
  const legacyContext = useLegacyModalContext();
  
  return (
    <UnifiedModalContext.Provider value={legacyContext}>
      {children}
    </UnifiedModalContext.Provider>
  );
}

/**
 * Migration wrapper that chooses between legacy and migrated providers
 */
export function ModalProviderMigrationWrapper({ children }: { children: React.ReactNode }) {
  const { shouldUseLegacy, withSafety } = useMigrationSafety('ModalProvider');
  
  return withSafety(
    // Legacy implementation
    () => {
      logger.debug('[ModalProvider] Using legacy Context-based provider');
      return (
        <LegacyModalProvider>
          <LegacyContextForwarder>
            {children}
          </LegacyContextForwarder>
        </LegacyModalProvider>
      );
    },
    // New implementation  
    () => {
      logger.debug('[ModalProvider] Using migrated Zustand-based provider');
      return <MigratedModalProvider>{children}</MigratedModalProvider>;
    }
  );
}

/**
 * Unified hook that works with both legacy and migrated providers
 */
export function useModalContext() {
  const context = useContext(UnifiedModalContext);
  if (!context) {
    throw new Error('useModalContext must be used within ModalProvider or ModalProviderMigrationWrapper');
  }
  return context;
}

// Export migration wrapper as default
export default ModalProviderMigrationWrapper;

// Named exports for direct access if needed
export { 
  ModalProviderMigrationWrapper as ModalProvider,
  MigratedModalProvider,
  LegacyModalProvider as LegacyModalProvider,
};

/**
 * Hook factory for individual modal management
 * Provides a cleaner API for components that only need one modal
 */
export function useModalState(modalKey: keyof ModalContextValue) {
  const context = useModalContext();
  
  // Map modal keys to their setter names
  const setterMap: Record<string, keyof ModalContextValue> = {
    'isGameSettingsModalOpen': 'setIsGameSettingsModalOpen',
    'isLoadGameModalOpen': 'setIsLoadGameModalOpen',
    'isRosterModalOpen': 'setIsRosterModalOpen',
    'isSeasonTournamentModalOpen': 'setIsSeasonTournamentModalOpen',
    'isTrainingResourcesOpen': 'setIsTrainingResourcesOpen',
    'isGoalLogModalOpen': 'setIsGoalLogModalOpen',
    'isGameStatsModalOpen': 'setIsGameStatsModalOpen',
    'isNewGameSetupModalOpen': 'setIsNewGameSetupModalOpen',
    'isSettingsModalOpen': 'setIsSettingsModalOpen',
    'isPlayerAssessmentModalOpen': 'setIsPlayerAssessmentModalOpen',
  };
  
  const setterName = setterMap[modalKey];
  const isOpen = context[modalKey] as boolean;
  const setIsOpen = context[setterName] as React.Dispatch<React.SetStateAction<boolean>>;
  
  return {
    isOpen,
    setIsOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}

/**
 * Convenience hooks for common modals
 */
export const useGameSettingsModal = () => useModalState('isGameSettingsModalOpen');
export const useLoadGameModal = () => useModalState('isLoadGameModalOpen');
export const useRosterModal = () => useModalState('isRosterModalOpen');
export const useSeasonTournamentModal = () => useModalState('isSeasonTournamentModalOpen');
export const useTrainingResourcesModal = () => useModalState('isTrainingResourcesOpen');
export const useGoalLogModal = () => useModalState('isGoalLogModalOpen');
export const useGameStatsModal = () => useModalState('isGameStatsModalOpen');
export const useNewGameSetupModal = () => useModalState('isNewGameSetupModalOpen');
export const useSettingsModal = () => useModalState('isSettingsModalOpen');
export const usePlayerAssessmentModal = () => useModalState('isPlayerAssessmentModalOpen');