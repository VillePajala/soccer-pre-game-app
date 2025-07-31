import { renderHook, act } from '@testing-library/react';
import React from 'react';
import useModalManager from '../useModalManager';
import { ModalProvider } from '@/contexts/ModalProvider';

jest.mock('@/utils/appSettings', () => ({
  __esModule: true,
  saveHasSeenAppGuide: jest.fn(),
  getAppSettings: jest.fn(),
  updateAppSettings: jest.fn(),
}));
import { getAppSettings } from '@/utils/appSettings';

jest.mock('@/utils/fullBackup', () => ({
  __esModule: true,
  exportFullBackup: jest.fn(),
}));

jest.mock('@/utils/sendBackupEmail', () => ({
  __esModule: true,
  sendBackupEmail: jest.fn(),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ModalProvider>{children}</ModalProvider>
);

describe('useModalManager', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('toggles goal log modal state', () => {
    const { result } = renderHook(() => useModalManager(), { wrapper });

    act(() => {
      result.current.handlers.toggleGoalLogModal();
    });
    expect(result.current.states.isGoalLogModalOpen).toBe(true);

    act(() => {
      result.current.handlers.toggleGoalLogModal();
    });
    expect(result.current.states.isGoalLogModalOpen).toBe(false);
  });

  test('openSettingsModal loads settings', async () => {
    (getAppSettings as jest.MockedFunction<typeof getAppSettings>).mockResolvedValue({
      autoBackupEnabled: true,
      autoBackupIntervalHours: 6,
      lastBackupTime: undefined,
      backupEmail: 'test@example.com',
      currentGameId: '',
    });
    const { result } = renderHook(() => useModalManager(), { wrapper });

    await act(async () => {
      await result.current.handlers.openSettingsModal();
    });

    expect(result.current.states.isSettingsModalOpen).toBe(true);
    expect(result.current.states.autoBackupEnabled).toBe(true);
    expect(result.current.states.backupIntervalHours).toBe(6);
    expect(result.current.states.backupEmail).toBe('test@example.com');
  });
});

