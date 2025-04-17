'use client';

import React, { useState, useEffect } from 'react';
import { HiOutlineDownload } from 'react-icons/hi';

// Define the BeforeInstallPromptEvent interface
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// This component shows a prompt to install the PWA when available
const InstallPrompt: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Handler for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setInstallPrompt(e);
      // Show our custom install button/banner
      setIsVisible(true);
      
      console.log('[PWA] Install prompt is available');
    };

    // Check if the app is already installed
    if (typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches || 
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (window.navigator as any).standalone === true)) { // For iOS with type assertion
      console.log('[PWA] App is already installed');
      setIsVisible(false);
      return;
    }

    // Check if install was previously deferred (within the last week)
    const lastPrompt = localStorage.getItem('pwaPromptDismissed');
    if (lastPrompt) {
      const lastPromptDate = new Date(parseInt(lastPrompt, 10));
      const now = new Date();
      // If less than 7 days have passed since last dismissed, don't show
      if (now.getTime() - lastPromptDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
        console.log('[PWA] Prompt was recently dismissed');
        setIsVisible(false);
        return;
      }
    }

    // Register the event listener - cast to unknown first to work around TypeScript's event type constraints
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as unknown as EventListener);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as unknown as EventListener);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    try {
      // Show the browser's install prompt
      await installPrompt.prompt();
      
      // Wait for the user to respond to the prompt
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt');
      } else {
        console.log('[PWA] User dismissed the install prompt');
      }
    } catch (error) {
      console.error('[PWA] Error showing install prompt:', error);
    } finally {
      // Always hide our custom prompt after interaction
      setIsVisible(false);
      // We've used the prompt, so we can't use it again
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Store the timestamp when user dismissed the prompt
    localStorage.setItem('pwaPromptDismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 mx-auto w-11/12 max-w-md bg-indigo-600 text-white p-4 rounded-lg shadow-lg flex items-center justify-between z-[100]">
      <div className="flex-1">
        <h3 className="font-semibold">Install PEPO App</h3>
        <p className="text-sm text-indigo-100">Install this app on your device for the best experience</p>
      </div>
      <div className="flex space-x-2">
        <button 
          onClick={handleInstallClick}
          className="bg-white text-indigo-700 px-3 py-1.5 rounded-md font-medium text-sm flex items-center"
        >
          <HiOutlineDownload className="mr-1 h-4 w-4" />
          Install
        </button>
        <button 
          onClick={handleDismiss}
          className="text-indigo-200 hover:text-white px-2 py-1.5 rounded-md text-sm"
        >
          Later
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt; 