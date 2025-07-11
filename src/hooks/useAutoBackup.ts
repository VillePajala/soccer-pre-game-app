import { useEffect, useRef } from 'react';
import { exportFullBackup } from '@/utils/fullBackup';
import {
  getAutoBackupSettings,
  saveAutoBackupSettings
} from '@/utils/appSettings';

export function useAutoBackup() {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const setup = async () => {
      const { enabled, intervalDays, lastBackupAt } = await getAutoBackupSettings();
      if (!enabled) return;
      const last = lastBackupAt ? new Date(lastBackupAt).getTime() : 0;
      const intervalMs = intervalDays * 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (now - last >= intervalMs) {
        await exportFullBackup();
        await saveAutoBackupSettings(true, intervalDays, new Date().toISOString());
      }
      timerRef.current = setInterval(async () => {
        await exportFullBackup();
        await saveAutoBackupSettings(true, intervalDays, new Date().toISOString());
      }, intervalMs);
    };
    setup();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
}
