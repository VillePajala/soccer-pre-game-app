import { useEffect } from 'react';
import { getAppSettings, updateAppSettings } from '@/utils/appSettings';
import { exportFullBackup } from '@/utils/fullBackup';
import { sendBackupEmail } from '@/utils/sendBackupEmail';
import logger from '@/utils/logger';

const useAutoBackup = (): void => {
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;
    let cancelled = false;

    const schedule = async () => {
      const settings = await getAppSettings();
      const enabled = settings.autoBackupEnabled ?? false;
      if (!enabled) return;

      const intervalHours = settings.autoBackupIntervalHours ?? 24;
      const intervalMs = intervalHours * 60 * 60 * 1000;
      const last = settings.lastBackupTime ? Date.parse(settings.lastBackupTime) : 0;
      const now = Date.now();
      const delay = Math.max(0, intervalMs - (now - last));

      const run = async () => {
        try {
          const json = await exportFullBackup();
          if (settings.backupEmail) {
            await sendBackupEmail(json, settings.backupEmail);
          }
          await updateAppSettings({ lastBackupTime: new Date().toISOString() });
        } catch (err) {
          logger.error('Automatic backup failed:', err);
        }
        if (!cancelled) schedule();
      };

      timeout = setTimeout(run, delay);
    };

    schedule();

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, []);
};

export default useAutoBackup;
