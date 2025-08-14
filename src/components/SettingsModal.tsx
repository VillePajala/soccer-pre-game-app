'use client';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import packageJson from '../../package.json';
import { HiOutlineArrowRightOnRectangle } from 'react-icons/hi2';
import { HiOutlineTrash } from 'react-icons/hi2';
import { HiOutlineArrowDownTray, HiOutlineArrowUpTray } from 'react-icons/hi2';
import { HiOutlineChartBarSquare } from 'react-icons/hi2';
import AccountDeletionModal from './AccountDeletionModal';
import { useAuth } from '@/context/AuthContext';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { useRouter } from 'next/navigation';

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
  const { user, globalSignOut } = useAuth() as unknown as { user?: unknown; globalSignOut?: () => Promise<{ error: unknown | null }> };
  const { isAdmin, isLoading: isAdminLoading } = useAdminAuth();
  const router = useRouter();
  const [teamName, setTeamName] = useState(defaultTeamName);
  const [resetConfirm, setResetConfirm] = useState('');
  const [isAccountDeletionModalOpen, setIsAccountDeletionModalOpen] = useState(false);

  useEffect(() => {
    setTeamName(defaultTeamName);
  }, [defaultTeamName]);

  const handleExport = async () => {
    try {
      const data = await storageManager.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
      a.download = `SoccerApp_Backup_${timestamp}.json`;

      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Export successful - no UI feedback for now
    } catch (error) {
      console.error('Export error:', error);
    }
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
            {/* General Settings */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-200">
                {t('settingsModal.generalTitle', 'General')}
              </h3>
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
            </div>
            {onSignOut && (
              <div className="pt-2 border-t border-slate-700/40 space-y-2">
                <h3 className="text-lg font-semibold text-slate-200">
                  {t('settingsModal.accountTitle', 'Account')}
                </h3>
                <p className="text-sm text-slate-400">
                  {t('settingsModal.signOutDescription', 'Sign out of your account and return to the login screen.')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
                  <button
                    onClick={async () => {
                      if (!globalSignOut) return onSignOut?.();
                      if (window.confirm(t('settingsModal.globalSignOutConfirm', 'Sign out everywhere? This will log you out from all devices.'))) {
                        await globalSignOut();
                        onClose();
                      }
                    }}
                    className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg border border-slate-600 hover:border-slate-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <HiOutlineArrowRightOnRectangle className="w-4 h-4 rotate-180" />
                    {t('settingsModal.globalSignOut', 'Sign Out Everywhere')}
                  </button>
                  <button
                    onClick={() => setIsAccountDeletionModalOpen(true)}
                    className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 text-red-100 rounded-lg border border-red-600 hover:border-red-500 transition-colors flex items-center justify-center gap-2"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                    {t('settingsModal.deleteAccount', 'Delete Account')}
                  </button>
                </div>
                <p className="text-sm text-slate-400">
                  {t('settingsModal.deleteAccountDescription', 'Permanently delete your account and all data. This action cannot be undone.')}
                </p>
              </div>
            )}
            {/* Admin Tools - Only for admins */}
            {!isAdminLoading && isAdmin && (
              <div className="pt-2 border-t border-slate-700/40 space-y-2">
                <h3 className="text-lg font-semibold text-slate-200">
                  {t('settingsModal.adminTitle', 'Admin Tools')}
                </h3>
                <p className="text-sm text-slate-400">
                  {t('settingsModal.adminDescription', 'Administrative tools and monitoring.')}
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      // PWA-friendly navigation - close modal and navigate with Next.js router
                      onClose();
                      router.push('/admin/monitoring');
                    }}
                    className="w-full px-4 py-2 bg-gradient-to-b from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <HiOutlineChartBarSquare className="w-4 h-4" />
                    {t('settingsModal.adminMonitoring', 'System Monitoring')}
                  </button>
                </div>
              </div>
            )}
            {/* Data Management */}
            {!!user && (
              <div className="pt-2 border-t border-slate-700/40 space-y-2">
                <h3 className="text-lg font-semibold text-slate-200">
                  {t('settingsModal.dataManagementTitle', 'Data Management')}
                </h3>
                <p className="text-sm text-slate-400">
                  {t('settingsModal.dataManagementDescription', 'Export your data for backup or import data from a previous backup.')}
                </p>

                <div className="space-y-2">
                  <button
                    onClick={handleExport}
                    className="w-full px-4 py-2 bg-gradient-to-b from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <HiOutlineArrowDownTray className="w-4 h-4" />
                    {t('settings.exportBackup', 'Export Backup')}
                  </button>
                  
                  <button
                    onClick={() => {
                      // PWA-friendly navigation - close modal and navigate to import page
                      onClose();
                      router.push('/import-backup');
                    }}
                    className="w-full px-4 py-2 bg-gradient-to-b from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <HiOutlineArrowUpTray className="w-4 h-4" />
                    {t('settings.importBackup', 'Import Backup')}
                  </button>
                </div>
              </div>
            )}
            {/* About */}
            <div className="pt-2 border-t border-slate-700/40 space-y-2">
              <h3 className="text-lg font-semibold text-slate-200">
                {t('settingsModal.aboutTitle', 'About')}
              </h3>
              <p className="text-sm text-slate-300">
                {t('settingsModal.appVersion', 'App Version')}: {packageJson.version}
              </p>
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-slate-200">
                  {t('settingsModal.legalTitle', 'Legal Information')}
                </h4>
                <div className="flex flex-col space-y-1">
                  <a
                    href="/privacy-policy.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-400 underline"
                  >
                    {t('settingsModal.privacyPolicyLink', 'Privacy Policy')}
                  </a>
                  <a
                    href="/terms-of-service.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-indigo-400 underline"
                  >
                    {t('settingsModal.termsOfServiceLink', 'Terms of Service')}
                  </a>
                </div>
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

            {/* Danger Zone */}
            <div className="pt-2 border-t border-slate-700/40 space-y-2">
              <h3 className="text-lg font-semibold text-red-300">
                {t('settingsModal.dangerZoneTitle', 'Danger Zone')}
              </h3>
              <p className="text-sm text-red-200">
                {t('settingsModal.hardResetDescription', 'Erase all players, games, seasons, tournaments and settings for this account. This action cannot be undone.')}
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
      {/* Account Deletion Modal - only render when needed */}
      {isAccountDeletionModalOpen && (
        <AccountDeletionModal
          isOpen={isAccountDeletionModalOpen}
          onClose={() => setIsAccountDeletionModalOpen(false)}
        />
      )}
    </div>
  );
};

export default SettingsModal;
