'use client';

import React, { useState, useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n'; // Import the initialized i18n instance

// This component ensures i18n initialization happens on the client
const I18nInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isI18nInitialized, setIsI18nInitialized] = useState(i18n.isInitialized);

  useEffect(() => {
    // Check if i18n is already initialized, if not wait for it
    if (!i18n.isInitialized) {
      const handleInitialized = () => {
        setIsI18nInitialized(true);
      };
      
      i18n.on('initialized', handleInitialized);
      return () => {
        i18n.off('initialized', handleInitialized);
      };
    }
  }, []);

  if (!isI18nInitialized) {
    // Show a minimal loading state
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nInitializer; 