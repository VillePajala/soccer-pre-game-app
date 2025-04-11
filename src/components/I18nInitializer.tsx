'use client';

import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n'; // Import the initialized i18n instance

// This component ensures i18n initialization happens on the client
const I18nInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Although i18n is initialized in i18n.ts, running it through the provider ensures context is set up.
  // We don't necessarily need useEffect if i18n.ts already calls .init()
  // useEffect(() => {
  //   // Re-initializing here is usually not needed if i18n.ts does it.
  // }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nInitializer; 