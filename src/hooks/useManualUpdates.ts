import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { checkForUpdates, forceAppUpdate, isInstalledPWA, UpdateCheckResult } from '@/utils/serviceWorkerUtils';
import logger from '@/utils/logger';

interface UseManualUpdatesReturn {
  isChecking: boolean;
  lastCheckResult: UpdateCheckResult | null;
  checkForUpdates: () => Promise<void>;
  forceUpdate: () => Promise<void>;
  showUpdateOption: boolean;
  setLastCheckResult: (result: UpdateCheckResult | null) => void;
}

/**
 * Hook for manual PWA update management in the UI
 */
export const useManualUpdates = (): UseManualUpdatesReturn => {
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckResult, setLastCheckResult] = useState<UpdateCheckResult | null>(null);

  // Show update option for installed PWAs or always in development
  const showUpdateOption = isInstalledPWA() || process.env.NODE_ENV === 'development';

  const handleCheckForUpdates = useCallback(async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    logger.log('[Manual Updates] User initiated update check');
    
    try {
      const result = await checkForUpdates();
      setLastCheckResult(result);
      
      logger.log('[Manual Updates] Update check result:', result);
      logger.log('[Manual Updates] Result analysis:', {
        hasUpdateAvailable: result.updateAvailable,
        hasError: !!result.error,
        currentVersion: result.currentVersion
      });
      
      if (result.updateAvailable) {
        // Show success message
        const message = t('updateCheck.updateAvailable', 'Update available! Click "Refresh App" to get the latest version.');
        alert(message);
      } else if (result.error && result.error !== 'No service worker registered' && result.error !== 'Service Worker not supported') {
        // Show error message only for actual errors, not for expected cases like no SW in dev
        logger.warn('[Manual Updates] Update check error:', result.error);
        const message = t('updateCheck.checkFailed', `Update check failed: ${result.error}`);
        alert(message);
      } else {
        // Show up-to-date message for: no updates available, no SW registered, or SW not supported
        const versionInfo = result.currentVersion ? ` (v${result.currentVersion})` : '';
        let message;
        
        if (result.error === 'No service worker registered' || result.error === 'Service Worker not supported') {
          // In development or browsers without SW support
          message = t('updateCheck.upToDate', 'App is up to date!') + versionInfo + ' ' + t('updateCheck.noServiceWorker', '(Service worker not active)');
        } else {
          // Normal case - no updates available
          message = t('updateCheck.upToDate', 'App is up to date!') + versionInfo;
        }
        
        alert(message);
        logger.log('[Manual Updates] App is up to date');
      }
    } catch (error) {
      logger.error('[Manual Updates] Update check exception:', error);
      const message = t('updateCheck.checkError', 'Failed to check for updates. Please try again.');
      alert(message);
      setLastCheckResult({
        updateAvailable: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, t]);

  const handleForceUpdate = useCallback(async () => {
    logger.log('[Manual Updates] User initiated force update');
    
    const message = t('updateCheck.confirmRefresh', 'This will refresh the app to get the latest version. Continue?');
    if (!window.confirm(message)) {
      return;
    }
    
    try {
      await forceAppUpdate();
    } catch (error) {
      logger.error('[Manual Updates] Force update failed:', error);
      const errorMessage = t('updateCheck.refreshFailed', 'Failed to refresh app. Please try again.');
      alert(errorMessage);
    }
  }, [t]);

  return {
    isChecking,
    lastCheckResult,
    checkForUpdates: handleCheckForUpdates,
    forceUpdate: handleForceUpdate,
    showUpdateOption,
    setLastCheckResult,
  };
};