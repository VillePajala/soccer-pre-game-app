import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import {
  saveHasSeenAppGuide,
  resetAppSettings as utilResetAppSettings,
  saveLastHomeTeamName as utilSaveLastHomeTeamName,
  updateAppSettings as utilUpdateAppSettings,
} from '@/utils/appSettings';
import { exportFullBackup } from '@/utils/fullBackup';
import { sendBackupEmail } from '@/utils/sendBackupEmail';
import logger from '@/utils/logger';

interface UseAppSettingsManagerProps {
  setIsSettingsModalOpen: (open: boolean) => void;
  setIsInstructionsModalOpen: (open: boolean) => void;
}

/**
 * Custom hook that manages all application settings and related functionality.
 * Handles language switching, backup settings, app guide, and hard reset functionality.
 */
export const useAppSettingsManager = ({
  setIsSettingsModalOpen,
  setIsInstructionsModalOpen,
}: UseAppSettingsManagerProps) => {
  const { t } = useTranslation();

  // --- Settings State ---
  const [appLanguage, setAppLanguage] = useState<string>(i18n.language);
  const [defaultTeamNameSetting, setDefaultTeamNameSetting] = useState<string>('');
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(false);
  const [backupIntervalHours, setBackupIntervalHours] = useState<number>(24);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [backupEmail, setBackupEmail] = useState<string>('');

  // --- Language Management ---
  useEffect(() => {
    // Only update if language actually changed
    if (i18n.language !== appLanguage) {
      i18n.changeLanguage(appLanguage);
      utilUpdateAppSettings({ language: appLanguage }).catch(() => {});
    }
  }, [appLanguage]);

  // --- App Guide Handler ---
  const handleShowAppGuide = useCallback(() => {
    saveHasSeenAppGuide(false);
    setIsSettingsModalOpen(false);
    setIsInstructionsModalOpen(true);
  }, [setIsSettingsModalOpen, setIsInstructionsModalOpen]);

  // --- Hard Reset Handler ---
  const handleHardResetApp = useCallback(async () => {
    if (window.confirm(t('controlBar.hardResetConfirmation', 'Are you sure you want to completely reset the application? All saved data (players, stats, positions) will be permanently lost.'))) {
      try {
        logger.log("Performing hard reset using utility...");
        await utilResetAppSettings(); // Use utility function
        window.location.reload();
      } catch (error) {
        logger.error("Error during hard reset:", error);
        alert("Failed to reset application data.");
      }
    }
  }, [t]);

  // --- Backup Handlers ---
  const handleCreateAndSendBackup = useCallback(async () => {
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
      } else {
        // Download backup if no email is set
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `soccer-app-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      logger.error("Error creating backup:", error);
      alert(t('settingsModal.backupError', 'Failed to create backup.'));
    }
  }, [backupEmail, t]);

  // --- Settings Change Handlers ---
  const handleLanguageChange = useCallback((lang: string) => {
    setAppLanguage(lang);
  }, []);

  const handleDefaultTeamNameChange = useCallback((name: string) => {
    setDefaultTeamNameSetting(name);
    utilSaveLastHomeTeamName(name);
  }, []);

  const handleAutoBackupEnabledChange = useCallback((enabled: boolean) => {
    setAutoBackupEnabled(enabled);
    utilUpdateAppSettings({ autoBackupEnabled: enabled }).catch(() => {});
  }, []);

  const handleBackupIntervalChange = useCallback((hours: number) => {
    const val = Math.max(1, hours);
    setBackupIntervalHours(val);
    utilUpdateAppSettings({ autoBackupIntervalHours: val }).catch(() => {});
  }, []);

  const handleLastBackupTimeChange = useCallback((time: string) => {
    setLastBackupTime(time);
    utilUpdateAppSettings({ lastBackupTime: time }).catch(() => {});
  }, []);

  const handleBackupEmailChange = useCallback((email: string) => {
    setBackupEmail(email);
    utilUpdateAppSettings({ backupEmail: email }).catch(() => {});
  }, []);

  return {
    // State
    appLanguage,
    defaultTeamNameSetting,
    autoBackupEnabled,
    backupIntervalHours,
    lastBackupTime,
    backupEmail,
    
    // Settings setters (for initial load)
    setAppLanguage,
    setDefaultTeamNameSetting,
    setAutoBackupEnabled,
    setBackupIntervalHours,
    setLastBackupTime,
    setBackupEmail,
    
    // Handlers
    handleShowAppGuide,
    handleHardResetApp,
    handleCreateAndSendBackup,
    handleLanguageChange,
    handleDefaultTeamNameChange,
    handleAutoBackupEnabledChange,
    handleBackupIntervalChange,
    handleLastBackupTimeChange,
    handleBackupEmailChange,
  };
};

export default useAppSettingsManager;