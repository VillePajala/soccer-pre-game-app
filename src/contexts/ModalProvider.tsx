import React, { createContext, useContext, useState } from 'react';

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
}

const ModalContext = createContext<ModalContextValue | undefined>(undefined);

export const ModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [isGameSettingsModalOpen, setIsGameSettingsModalOpen] = useState(false);
  const [isLoadGameModalOpen, setIsLoadGameModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isSeasonTournamentModalOpen, setIsSeasonTournamentModalOpen] = useState(false);
  const [isTrainingResourcesOpen, setIsTrainingResourcesOpen] = useState(false);
  const [isGoalLogModalOpen, setIsGoalLogModalOpen] = useState(false);
  const [isGameStatsModalOpen, setIsGameStatsModalOpen] = useState(false);
  const [isNewGameSetupModalOpen, setIsNewGameSetupModalOpen] = useState(false);

  const value: ModalContextValue = {
    isGameSettingsModalOpen,
    setIsGameSettingsModalOpen,
    isLoadGameModalOpen,
    setIsLoadGameModalOpen,
    isRosterModalOpen,
    setIsRosterModalOpen,
    isSeasonTournamentModalOpen,
    setIsSeasonTournamentModalOpen,
    isTrainingResourcesOpen,
    setIsTrainingResourcesOpen,
    isGoalLogModalOpen,
    setIsGoalLogModalOpen,
    isGameStatsModalOpen,
    setIsGameStatsModalOpen,
    isNewGameSetupModalOpen,
    setIsNewGameSetupModalOpen,
  };

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
};

export const useModalContext = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) {
    throw new Error('useModalContext must be used within ModalProvider');
  }
  return ctx;
};

export default ModalProvider;
