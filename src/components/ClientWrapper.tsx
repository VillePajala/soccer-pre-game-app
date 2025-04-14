'use client';

import React from 'react';
// Remove direct import of I18nextProvider and i18n instance
// import { I18nextProvider } from 'react-i18next';
// import i18n from '../i18n';
import I18nInitializer from './I18nInitializer'; // Import the initializer component

const ClientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    // Use the I18nInitializer to handle waiting for translations
    <I18nInitializer>
      {children}
    </I18nInitializer>
  );
};

export default ClientWrapper; 