'use client';

import React from 'react';
// Remove direct import of I18nextProvider and i18n instance
// import { I18nextProvider } from 'react-i18next';
// import i18n from '../i18n';
import I18nInitializer from './I18nInitializer';
import InstallPrompt from './InstallPrompt';
import ServiceWorkerRegistration from './ServiceWorkerRegistration';
import { ToastProvider } from '@/contexts/ToastProvider';

const ClientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <I18nInitializer>
      <ServiceWorkerRegistration />
      <ToastProvider>
        {children}
        <InstallPrompt />
      </ToastProvider>
    </I18nInitializer>
  );
};

export default ClientWrapper; 