/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/context/AuthContext';

import SettingsModal from './SettingsModal';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

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
    render(
      <AuthProvider>
        <SettingsModal {...defaultProps} />
      </AuthProvider>
    );
    expect(screen.getByText('App Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Default Team Name')).toBeInTheDocument();
  });

  test('renders settings sections', async () => {
    render(
      <AuthProvider>
        <SettingsModal {...defaultProps} />
      </AuthProvider>
    );
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText(/App Version/)).toBeInTheDocument();
  });

  test('calls onClose when Done clicked', () => {
    render(
      <AuthProvider>
        <SettingsModal {...defaultProps} />
      </AuthProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Done/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  test('requires typing RESET before Hard Reset', () => {
    render(
      <AuthProvider>
        <SettingsModal {...defaultProps} />
      </AuthProvider>
    );
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
    render(
      <AuthProvider>
        <SettingsModal {...defaultProps} />
      </AuthProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /Reset App Guide/i }));
    expect(defaultProps.onResetGuide).toHaveBeenCalled();
  });


  test('does not auto focus team name input on open', () => {
    render(
      <AuthProvider>
        <SettingsModal {...defaultProps} />
      </AuthProvider>
    );
    const input = screen.getByLabelText('Default Team Name');
    expect(input).not.toHaveFocus();
  });
});
