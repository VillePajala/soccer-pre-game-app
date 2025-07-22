import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useModalContext } from '@/contexts/ModalProvider';
import { saveHasSeenAppGuide, getAppSettings, updateAppSettings } from '@/utils/appSettings';
import { exportFullBackup } from '@/utils/fullBackup';
import { sendBackupEmail } from '@/utils/sendBackupEmail';
import logger from '@/utils/logger';

/**
 * Hook that centralizes all modal open/close logic and related preparation.
 */
export const useModalManager = () => {
  const { t } = useTranslation();
  const {
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
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isPlayerAssessmentModalOpen,
    setIsPlayerAssessmentModalOpen,
  } = useModalContext();

  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [backupIntervalHours, setBackupIntervalHours] = useState(24);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [backupEmail, setBackupEmail] = useState('');

  // --- Generic toggles ---
  const toggleGoalLogModal = useCallback(
    () => setIsGoalLogModalOpen(v => !v),
    [setIsGoalLogModalOpen],
  );

  const toggleGameStatsModal = useCallback(
    () => setIsGameStatsModalOpen(v => !v),
    [setIsGameStatsModalOpen],
  );

  const toggleTrainingResources = useCallback(
    () => setIsTrainingResourcesOpen(v => !v),
    [setIsTrainingResourcesOpen],
  );

  const toggleNewGameSetupModal = useCallback(
    () => setIsNewGameSetupModalOpen(v => !v),
    [setIsNewGameSetupModalOpen],
  );

  const openLoadGameModal = useCallback(() => {
    logger.log('Opening Load Game Modal...');
    setIsLoadGameModalOpen(true);
  }, [setIsLoadGameModalOpen]);

  const closeLoadGameModal = useCallback(
    () => setIsLoadGameModalOpen(false),
    [setIsLoadGameModalOpen],
  );

  const openSeasonTournamentModal = useCallback(
    () => setIsSeasonTournamentModalOpen(true),
    [setIsSeasonTournamentModalOpen],
  );

  const closeSeasonTournamentModal = useCallback(
    () => setIsSeasonTournamentModalOpen(false),
    [setIsSeasonTournamentModalOpen],
  );

  const openRosterModal = useCallback(
    () => setIsRosterModalOpen(true),
    [setIsRosterModalOpen],
  );

  const closeRosterModal = useCallback(
    () => setIsRosterModalOpen(false),
    [setIsRosterModalOpen],
  );

  const openPlayerAssessmentModal = useCallback(
    () => setIsPlayerAssessmentModalOpen(true),
    [setIsPlayerAssessmentModalOpen],
  );

  const closePlayerAssessmentModal = useCallback(
    () => setIsPlayerAssessmentModalOpen(false),
    [setIsPlayerAssessmentModalOpen],
  );

  const openGameSettingsModal = useCallback(
    () => setIsGameSettingsModalOpen(true),
    [setIsGameSettingsModalOpen],
  );

  const closeGameSettingsModal = useCallback(
    () => setIsGameSettingsModalOpen(false),
    [setIsGameSettingsModalOpen],
  );

  const openSettingsModal = useCallback(() => {
    getAppSettings().then(s => {
      setAutoBackupEnabled(s.autoBackupEnabled ?? false);
      setBackupIntervalHours(s.autoBackupIntervalHours ?? 24);
      setLastBackupTime(s.lastBackupTime ?? null);
      setBackupEmail(s.backupEmail ?? '');
    });
    setIsSettingsModalOpen(true);
  }, [setIsSettingsModalOpen]);

  const closeSettingsModal = useCallback(
    () => setIsSettingsModalOpen(false),
    [setIsSettingsModalOpen],
  );

  const toggleInstructionsModal = useCallback(() => {
    if (isInstructionsModalOpen) {
      saveHasSeenAppGuide(true);
    }
    setIsInstructionsModalOpen(!isInstructionsModalOpen);
  }, [isInstructionsModalOpen]);

  const showAppGuide = useCallback(() => {
    saveHasSeenAppGuide(false);
    setIsSettingsModalOpen(false);
    setIsInstructionsModalOpen(true);
  }, [setIsSettingsModalOpen]);

  const createAndSendBackup = useCallback(async () => {
    try {
      const json = await exportFullBackup();
      if (backupEmail) {
        const confirmSend = window.confirm(
          t('settingsModal.sendBackupPrompt', 'Send backup via email?'),
        );
        if (confirmSend) {
          await sendBackupEmail(json, backupEmail);
          alert(t('settingsModal.sendBackupSuccess', 'Backup sent successfully.'));
        }
      }
      const iso = new Date().toISOString();
      setLastBackupTime(iso);
      updateAppSettings({ lastBackupTime: iso }).catch(() => {});
    } catch (err) {
      logger.error('Failed to send backup', err);
      const message = err instanceof Error ? err.message : String(err);
      alert(
        `${t('settingsModal.sendBackupError', 'Failed to send backup.')}: ${message}`,
      );
    }
  }, [backupEmail, t]);

  return {
    states: {
      isGameSettingsModalOpen,
      isLoadGameModalOpen,
      isRosterModalOpen,
      isSeasonTournamentModalOpen,
      isTrainingResourcesOpen,
      isGoalLogModalOpen,
      isGameStatsModalOpen,
      isNewGameSetupModalOpen,
      isSettingsModalOpen,
      isPlayerAssessmentModalOpen,
      isInstructionsModalOpen,
      autoBackupEnabled,
      backupIntervalHours,
      lastBackupTime,
      backupEmail,
    },
    handlers: {
      toggleGoalLogModal,
      toggleGameStatsModal,
      toggleTrainingResources,
      toggleNewGameSetupModal,
      openLoadGameModal,
      closeLoadGameModal,
      openSeasonTournamentModal,
      closeSeasonTournamentModal,
      openRosterModal,
      closeRosterModal,
      openPlayerAssessmentModal,
      closePlayerAssessmentModal,
      openGameSettingsModal,
      closeGameSettingsModal,
      openSettingsModal,
      closeSettingsModal,
      toggleInstructionsModal,
      showAppGuide,
      createAndSendBackup,
    },
    setters: {
      setBackupEmail,
      setBackupIntervalHours,
      setAutoBackupEnabled,
    },
  } as const;
};

export type UseModalManagerReturn = ReturnType<typeof useModalManager>;
export default useModalManager;
