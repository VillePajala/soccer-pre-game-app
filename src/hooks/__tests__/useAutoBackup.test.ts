import { renderHook, act } from '@testing-library/react';
import useAutoBackup from '../useAutoBackup';
jest.mock('@/utils/fullBackup', () => ({
  __esModule: true,
  exportFullBackup: jest.fn(),
}));
import { exportFullBackup } from '@/utils/fullBackup';

jest.mock('@/utils/appSettings', () => ({
  __esModule: true,
  getAppSettings: jest.fn(),
  updateAppSettings: jest.fn(),
}));
import { getAppSettings, updateAppSettings } from '@/utils/appSettings';

jest.useFakeTimers();

describe('useAutoBackup', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('triggers backup after remaining interval', async () => {
    (getAppSettings as jest.Mock).mockResolvedValue({
      currentGameId: null,
      autoBackupEnabled: true,
      autoBackupIntervalHours: 1,
      lastBackupTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    } as any);
    const updateSpy = updateAppSettings as jest.Mock;
    updateSpy.mockResolvedValue({} as any);
    const exportSpy = exportFullBackup as jest.Mock;
    exportSpy.mockResolvedValue(undefined);

    renderHook(() => useAutoBackup());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(30 * 60 * 1000);
    });

    expect(getAppSettings).toHaveBeenCalled();
    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith({ lastBackupTime: expect.any(String) });
  });

  it('does nothing when disabled', async () => {
    (getAppSettings as jest.Mock).mockResolvedValue({
      currentGameId: null,
      autoBackupEnabled: false,
      autoBackupIntervalHours: 1,
    } as any);
    const exportSpy = exportFullBackup as jest.Mock;
    exportSpy.mockResolvedValue(undefined);

    renderHook(() => useAutoBackup());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(60 * 60 * 1000);
    });

    expect(exportSpy).not.toHaveBeenCalled();
  });
});
