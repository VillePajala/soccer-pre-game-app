import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import "@/i18n";
import InstallPrompt from "./InstallPrompt";
import * as pwaSettings from '@/utils/pwaSettings';

// Mock the PWA settings module
jest.mock('@/utils/pwaSettings', () => ({
  getPWASettings: jest.fn(),
  setInstallPromptDismissed: jest.fn(),
}));

interface TestInstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  preventDefault: () => void;
}

function dispatchInstallEvent(promptMock: jest.Mock) {
  const event = new Event("beforeinstallprompt") as TestInstallEvent;
  event.preventDefault = jest.fn();
  event.prompt = promptMock;
  event.userChoice = Promise.resolve({ outcome: "accepted" });
  window.dispatchEvent(event);
}

describe("InstallPrompt", () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }),
    });
    
    // Mock PWA settings functions
    (pwaSettings.getPWASettings as jest.Mock).mockResolvedValue({
      installPromptCount: 0,
      installPromptLastDismissed: null,
      appUsageCount: 0,
      installPromptDismissed: null,
    });
    (pwaSettings.setInstallPromptDismissed as jest.Mock).mockResolvedValue(undefined);
  });

  it("shows and handles install prompt", async () => {
    const promptMock = jest.fn().mockResolvedValue(undefined);
    await act(async () => {
      render(<InstallPrompt />);
    });

    act(() => {
      dispatchInstallEvent(promptMock);
    });

    const installBtn = await screen.findByText("Asenna");
    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(promptMock).toHaveBeenCalled();
  });

  it("dismisses the prompt", async () => {
    await act(async () => {
      render(<InstallPrompt />);
    });
    act(() => {
      dispatchInstallEvent(jest.fn());
    });
    const dismissBtn = await screen.findByText("Ei nyt");
    await act(async () => {
      fireEvent.click(dismissBtn);
    });
    
    // Check that setInstallPromptDismissed was called
    expect(pwaSettings.setInstallPromptDismissed).toHaveBeenCalledWith(expect.any(Number));
  });
});
