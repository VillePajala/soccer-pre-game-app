import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InstallPrompt from './InstallPrompt';

interface TestInstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  preventDefault: () => void;
}

function dispatchInstallEvent(promptMock: jest.Mock) {
  const event = new Event('beforeinstallprompt') as TestInstallEvent;
  event.preventDefault = jest.fn();
  event.prompt = promptMock;
  event.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(event);
}

describe('InstallPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockReturnValue({ matches: false, addListener: jest.fn(), removeListener: jest.fn() }),
    });
  });

  it('shows and handles install prompt', async () => {
    const promptMock = jest.fn().mockResolvedValue(undefined);
    render(<InstallPrompt />);

    dispatchInstallEvent(promptMock);
    // Install button should appear
    const installBtn = await screen.findByText('Install');
    fireEvent.click(installBtn);

    expect(promptMock).toHaveBeenCalled();
  });

  it('dismisses the prompt', async () => {
    render(<InstallPrompt />);
    dispatchInstallEvent(jest.fn());
    const dismissBtn = await screen.findByText('Not now');
    fireEvent.click(dismissBtn);
    expect(localStorage.getItem('installPromptDismissed')).not.toBeNull();
  });
});
