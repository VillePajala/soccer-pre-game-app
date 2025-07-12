/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import SettingsModal from './SettingsModal';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: any) => {
      if (typeof fallbackOrOpts === 'string') return fallbackOrOpts;
      if (key === 'settingsModal.storageUsageDetails' && fallbackOrOpts) {
        return `${fallbackOrOpts.used} of ${fallbackOrOpts.quota} used`;
      }
      return fallbackOrOpts || key;
    },
  }),
}));

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  language: 'en',
  onLanguageChange: jest.fn(),
  defaultTeamName: 'My Team',
  onDefaultTeamNameChange: jest.fn(),
  onResetGuide: jest.fn(),
  onHardResetApp: jest.fn(),
  autoBackupEnabled: true,
  backupIntervalHours: 24,
  lastBackupTime: '2024-01-01T00:00:00.000Z',
  onAutoBackupEnabledChange: jest.fn(),
  onBackupIntervalChange: jest.fn(),
};

describe('<SettingsModal />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: {
        estimate: jest.fn().mockResolvedValue({ usage: 1048576, quota: 5242880 }),
      },
    });
  });

  test('renders when open', () => {
    render(<SettingsModal {...defaultProps} />);
    expect(screen.getByText('App Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Default Team Name')).toBeInTheDocument();
  });

  test('displays storage usage when available', async () => {
    render(<SettingsModal {...defaultProps} />);
    expect(await screen.findByText('Storage Usage')).toBeInTheDocument();
    expect(await screen.findByText(/1\.0 MB.*5\.0 MB/)).toBeInTheDocument();
  });

  test('displays usage in KB when below 1 MB', async () => {
    (navigator.storage.estimate as jest.Mock).mockResolvedValueOnce({
      usage: 512 * 1024,
      quota: 2 * 1048576,
    });
    render(<SettingsModal {...defaultProps} />);
    expect(await screen.findByText(/512\.0 KB.*5\.0 MB/)).toBeInTheDocument();
  });

  test('calls onClose when Done clicked', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Done/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test('requires typing RESET before Hard Reset', () => {
    render(<SettingsModal {...defaultProps} />);
    const resetBtn = screen.getByRole('button', { name: /Hard Reset App/i });
    expect(resetBtn).toBeDisabled();
    fireEvent.change(
      screen.getByLabelText('Type RESET to confirm'),
      { target: { value: 'RESET' } }
    );
    fireEvent.click(resetBtn);
    expect(defaultProps.onHardResetApp).toHaveBeenCalled();
  });

  test('calls onResetGuide when Reset App Guide clicked', () => {
    render(<SettingsModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Reset App Guide/i }));
    expect(defaultProps.onResetGuide).toHaveBeenCalled();
  });

  test('backup controls trigger callbacks', () => {
    render(<SettingsModal {...defaultProps} />);
    const checkbox = screen.getByLabelText('Enable Automatic Backup');
    fireEvent.click(checkbox);
    expect(defaultProps.onAutoBackupEnabledChange).toHaveBeenCalledWith(false);

    const intervalInput = screen.getByLabelText('Backup Interval (hours)');
    fireEvent.change(intervalInput, { target: { value: '12' } });
    expect(defaultProps.onBackupIntervalChange).toHaveBeenCalledWith(12);
  });
});
