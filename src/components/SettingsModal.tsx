'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import packageJson from '../../package.json';
import { HiOutlineArrowRightOnRectangle, HiOutlineDocumentArrowDown, HiOutlineDocumentArrowUp } from 'react-icons/hi2';
import { exportFullBackup, importFullBackup } from '@/utils/fullBackup';
import { importBackupToSupabase } from '@/utils/supabaseBackupImport';
import { authAwareStorageManager as storageManager } from '@/lib/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  defaultTeamName: string;
  onDefaultTeamNameChange: (name: string) => void;
  onResetGuide: () => void;
  onHardResetApp: () => void;
  onSignOut?: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  onLanguageChange,
  defaultTeamName,
  onDefaultTeamNameChange,
  onResetGuide,
  onHardResetApp,
  onSignOut,
}) => {
  const { t } = useTranslation();
  const [teamName, setTeamName] = useState(defaultTeamName);
  const [resetConfirm, setResetConfirm] = useState('');
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTeamName(defaultTeamName);
  }, [defaultTeamName]);

  // Manual backup/restore handlers
  const handleManualBackup = () => {
    exportFullBackup();
  };

  const handleManualRestore = () => {
    // Clear the file input value to ensure onChange fires even for same file
    if (restoreFileInputRef.current) {
      restoreFileInputRef.current.value = '';
    }
    restoreFileInputRef.current?.click();
  };
  
  const handleRestoreFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const jsonContent = e.target?.result as string;
      if (jsonContent) {
        // Check if we're using Supabase
        const providerName = storageManager.getProviderName?.() || 'localStorage';
        
        if (providerName === 'supabase') {
          try {
            // Use the new Supabase-aware import
            const result = await importBackupToSupabase(jsonContent);
            if (result.success) {
              alert(result.message);
              // Reload to refresh all data (same as localStorage import)
              setTimeout(() => {
                window.location.reload();
              }, 500);
            } else {
              alert(t('settingsModal.importError', { defaultValue: 'Import failed: ' }) + result.message);
            }
          } catch (error) {
            alert(t('settingsModal.importError', { defaultValue: 'Import failed: ' }) + (error instanceof Error ? error.message : 'Unknown error'));
          }
        } else {
          // Use the old localStorage import for backwards compatibility
          importFullBackup(jsonContent);
        }
      } else {
        alert(t('settingsModal.importReadError', 'Error reading file content.'));
      }
    };
    reader.onerror = () => {
      alert(t('settingsModal.importReadError', 'Error reading file content.'));
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  if (!isOpen) return null;

  const modalContainerStyle =
    'bg-slate-800 rounded-none shadow-xl flex flex-col border-0 overflow-hidden';
  const titleStyle =
    'text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg';
  const labelStyle = 'text-sm font-medium text-slate-300 mb-1';
  const inputStyle =
    'block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 sm:text-sm text-white';
  const buttonStyle =
    'px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed';
  const primaryButtonStyle =
    `${buttonStyle} bg-gradient-to-b from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-lg`;
  const dangerButtonStyle =
    `${buttonStyle} bg-gradient-to-b from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 shadow-lg`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className={`${modalContainerStyle} bg-noise-texture relative overflow-hidden h-full w-full`}>
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
        <div className="absolute -inset-[50px] bg-sky-400/5 blur-2xl top-0 opacity-50" />
        <div className="absolute -inset-[50px] bg-indigo-600/5 blur-2xl bottom-0 opacity-50" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-center items-center pt-10 pb-4 px-6 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20 flex-shrink-0">
            <h2 className={titleStyle}>{t('settingsModal.title', 'App Settings')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">
            <div>
              <label htmlFor="language-select" className={labelStyle}>{t('settingsModal.languageLabel', 'Language')}</label>
              <select
                id="language-select"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value)}
                className={inputStyle}
              >
                <option value="en">English</option>
                <option value="fi">Suomi</option>
              </select>
            </div>
            <div>
              <label htmlFor="team-name-input" className={labelStyle}>{t('settingsModal.defaultTeamNameLabel', 'Default Team Name')}</label>
              <input
                id="team-name-input"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onBlur={() => onDefaultTeamNameChange(teamName)}
                className={inputStyle}
              />
            </div>
            <div className="pt-2 border-t border-slate-700/40 space-y-2">
              <h3 className="text-lg font-semibold text-slate-200">
                {t('settingsModal.manualBackupTitle', 'Manual Backup & Restore')}
              </h3>
              <p className="text-sm text-slate-300">
                {t('settingsModal.manualBackupDescription', 'Create a backup file to save on your device or restore data from a backup file.')}
              </p>
              
              {/* Hidden file input for restore */}
              <input
                type="file"
                ref={restoreFileInputRef}
                onChange={handleRestoreFileSelected}
                accept=".json"
                style={{ display: "none" }}
                data-testid="restore-backup-input"
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleManualBackup}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg font-medium shadow-lg shadow-indigo-500/25 transition-all duration-200 hover:scale-105"
                >
                  <HiOutlineDocumentArrowDown className="h-5 w-5" />
                  {t('settingsModal.createBackupButton', 'Create Backup')}
                </button>
                <button
                  onClick={handleManualRestore}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-lg font-medium shadow-lg shadow-slate-500/25 transition-all duration-200 hover:scale-105"
                >
                  <HiOutlineDocumentArrowUp className="h-5 w-5" />
                  {t('settingsModal.restoreBackupButton', 'Restore Backup')}
                </button>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('settingsModal.backupNote', 'Backup files contain all your games, teams, seasons, tournaments, and settings. Keep them safe!')}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-700/40 space-y-2">
              <h3 className="text-lg font-semibold text-slate-200">
                {t('settingsModal.aboutTitle', 'About')}
              </h3>
              <p className="text-sm text-slate-300">
                {t('settingsModal.appVersion', 'App Version')}: {packageJson.version}
              </p>
              <div className="space-y-1">
                <a
                  href="https://github.com/VillePajala/soccer-pre-game-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-400 underline"
                >
                  {t('settingsModal.documentationLink', 'Documentation')}
                </a>
                <p className="text-sm text-slate-300">
                  {t(
                    'settingsModal.documentationDescription',
                    'Read the full user guide and troubleshooting tips.'
                  )}
                </p>
              </div>
              <div className="space-y-1">
                <button onClick={onResetGuide} className={primaryButtonStyle}>
                  {t('settingsModal.resetGuideButton', 'Reset App Guide')}
                </button>
                <p className="text-sm text-slate-300">
                  {t(
                    'settingsModal.resetGuideDescription',
                    'Show the onboarding guide again the next time you open the app.'
                  )}
                </p>
              </div>
            </div>
            {onSignOut && (
              <div className="pt-2 border-t border-slate-700/40 space-y-2">
                <h3 className="text-lg font-semibold text-slate-200">
                  {t('settingsModal.accountTitle', 'Account')}
                </h3>
                <p className="text-sm text-slate-400">
                  {t('settingsModal.signOutDescription', 'Sign out of your account and return to the login screen.')}
                </p>
                <button
                  onClick={() => {
                    onSignOut();
                    onClose();
                  }}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors flex items-center justify-center gap-2"
                >
                  <HiOutlineArrowRightOnRectangle className="w-4 h-4 rotate-180" />
                  {t('auth.signOut')}
                </button>
              </div>
            )}
            <div className="pt-2 border-t border-slate-700/40 space-y-2">
              <h3 className="text-lg font-semibold text-red-300">
                {t('settingsModal.dangerZoneTitle', 'Danger Zone')}
              </h3>
              <p className="text-sm text-red-200">
                {t(
                  'settingsModal.hardResetDescription',
                  'Erase all saved teams, games and settings. This action cannot be undone.'
                )}
              </p>
              <label htmlFor="hard-reset-confirm" className={labelStyle}>
                {t('settingsModal.confirmResetLabel', 'Type RESET to confirm')}
              </label>
              <input
                id="hard-reset-confirm"
                type="text"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                className={inputStyle}
              />
              <button
                onClick={() => {
                  onHardResetApp();
                  setResetConfirm('');
                }}
                className={dangerButtonStyle}
                disabled={resetConfirm !== 'RESET'}
              >
                {t('settingsModal.hardResetButton', 'Hard Reset App')}
              </button>
            </div>
          </div>
          <div className="p-4 border-t border-slate-700/20 backdrop-blur-sm bg-slate-900/20 flex-shrink-0">
            <button onClick={onClose} className={primaryButtonStyle}>
              {t('settingsModal.doneButton', 'Done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
