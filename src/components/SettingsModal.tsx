'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatBytes } from '@/utils/bytes';
import packageJson from '../../package.json';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  defaultTeamName: string;
  onDefaultTeamNameChange: (name: string) => void;
  onResetGuide: () => void;
  onHardResetApp: () => void;
  autoBackupEnabled: boolean;
  backupIntervalHours: number;
  lastBackupTime?: string | null;
  onAutoBackupEnabledChange: (enabled: boolean) => void;
  onBackupIntervalChange: (hours: number) => void;
  backupEmail: string;
  onBackupEmailChange: (email: string) => void;
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
  autoBackupEnabled,
  backupIntervalHours,
  lastBackupTime,
  onAutoBackupEnabledChange,
  onBackupIntervalChange,
  backupEmail,
  onBackupEmailChange,
}) => {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [teamName, setTeamName] = useState(defaultTeamName);
  const [emailValue, setEmailValue] = useState(backupEmail);
  const [resetConfirm, setResetConfirm] = useState('');
  const [storageEstimate, setStorageEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const MAX_LOCAL_STORAGE = 5 * 1024 * 1024; // 5 MB assumption for localStorage

  useEffect(() => {
    setTeamName(defaultTeamName);
  }, [defaultTeamName]);

  useEffect(() => {
    setEmailValue(backupEmail);
  }, [backupEmail]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      if (navigator.storage?.estimate) {
        navigator.storage
          .estimate()
          .then(res =>
            setStorageEstimate({ usage: res.usage || 0, quota: MAX_LOCAL_STORAGE })
          )
          .catch(() => setStorageEstimate(null));
      } else {
        setStorageEstimate(null);
      }
    }
  }, [isOpen, MAX_LOCAL_STORAGE]);

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
                ref={inputRef}
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                onBlur={() => onDefaultTeamNameChange(teamName)}
                className={inputStyle}
              />
            </div>
            <div className="pt-2 border-t border-slate-700/40 space-y-2">
              <h3 className="text-lg font-semibold text-slate-200">
                {t('settingsModal.backupTitle', 'Automatic Backup')}
              </h3>
              <label className="inline-flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoBackupEnabled}
                  onChange={(e) => onAutoBackupEnabledChange(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-indigo-600 bg-slate-600 border-slate-500 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-300">
                  {t('settingsModal.autoBackupLabel', 'Enable Automatic Backup')}
                </span>
              </label>
              <div>
                <label htmlFor="backup-interval" className={labelStyle}>{t('settingsModal.backupIntervalLabel', 'Backup Interval (hours)')}</label>
                <input
                  id="backup-interval"
                  type="number"
                  min={1}
                  value={backupIntervalHours}
                  onChange={(e) => onBackupIntervalChange(Number(e.target.value))}
                  className={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="backup-email" className={labelStyle}>{t('settingsModal.backupEmailLabel', 'Backup Email')}</label>
                <input
                  id="backup-email"
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  onBlur={() => onBackupEmailChange(emailValue)}
                  className={inputStyle}
                />
              </div>
              <p className="text-sm text-slate-300">
                {t('settingsModal.lastBackupLabel', 'Last Backup')}: {lastBackupTime ? new Date(lastBackupTime).toLocaleString() : t('settingsModal.never', 'Never')}
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
                <label className={labelStyle}>{t('settingsModal.storageUsageLabel', 'Storage Usage')}</label>
                  <p className="text-sm text-slate-300">
                    {storageEstimate
                      ? t('settingsModal.storageUsageDetails', {
                          used: formatBytes(storageEstimate.usage),
                          quota: formatBytes(MAX_LOCAL_STORAGE),
                        })
                      : t(
                          'settingsModal.storageUsageUnavailable',
                          'Storage usage information unavailable.'
                        )}
                  </p>
                {storageEstimate && (
                  <div className="w-full bg-slate-700 rounded-md h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-2"
                      style={{ width: `${Math.min(100, (storageEstimate.usage / MAX_LOCAL_STORAGE) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
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
