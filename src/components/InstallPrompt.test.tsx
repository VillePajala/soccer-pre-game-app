import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import "@/i18n";
import InstallPrompt from "./InstallPrompt";

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
    expect(localStorage.getItem("installPromptDismissed")).not.toBeNull();
  });
});
