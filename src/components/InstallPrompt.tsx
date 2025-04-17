'use client';

import React, { useState, useEffect } from 'react';
import styles from './InstallPrompt.module.css';

// Define proper interfaces for better type safety
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Define an interface for iOS navigator with standalone property
interface IosNavigator extends Navigator {
  standalone?: boolean;
}

// This component shows a prompt to install the PWA when available
const InstallPrompt: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only run this in the browser
    if (typeof window === 'undefined') return;

    // Check if app is already installed (PWA or iOS)
    const isAppInstalled = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.matchMedia('(display-mode: fullscreen)').matches || 
      (window.navigator as IosNavigator).standalone === true;

    if (isAppInstalled) {
      return; // Don't show prompt if already installed
    }

    // Check localStorage to see if the user dismissed the prompt recently
    const lastPromptTime = localStorage.getItem('installPromptDismissed');
    if (lastPromptTime && Date.now() - Number(lastPromptTime) < 24 * 60 * 60 * 1000) {
      return; // Don't show prompt if dismissed in the last 24 hours
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the browser's default install prompt
      event.preventDefault();
      
      // Store the event for later use
      const promptEvent = event as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
        // Store the time when dismissed to avoid showing it again too soon
        localStorage.setItem('installPromptDismissed', Date.now().toString());
      }
    } catch (error) {
      console.error('Error showing install prompt:', error);
    }

    setInstallPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('installPromptDismissed', Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className={styles.installPrompt} style={{ zIndex: 100 }}>
      <p className={styles.installPromptText}>
        Install this app on your device for a better experience!
      </p>
      <div className={styles.installPromptButtons}>
        <button 
          className={styles.installButton} 
          onClick={handleInstall}
        >
          Install
        </button>
        <button 
          className={styles.dismissButton} 
          onClick={handleDismiss}
        >
          Not now
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt; 