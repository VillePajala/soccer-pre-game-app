'use client';

import React, { useEffect } from 'react';
// Remove direct import of I18nextProvider and i18n instance
// import { I18nextProvider } from 'react-i18next';
// import i18n from '../i18n';
import I18nInitializer from './I18nInitializer';
import InstallPrompt from './InstallPrompt';
import EnhancedServiceWorkerRegistration from './EnhancedServiceWorkerRegistration';
import { ToastProvider } from '@/contexts/ToastProvider';
import { UpdateProvider } from '@/contexts/UpdateContext';
import i18n from '@/i18n';

const ClientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Keep <html lang> in sync with i18n for A11y/SEO
  useEffect(() => {
    const applyLang = () => {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', i18n.language || 'en');
      }
    };
    applyLang();
    i18n.on('languageChanged', applyLang);
    return () => {
      i18n.off('languageChanged', applyLang);
    };
  }, []);

  return (
    <I18nInitializer>
      <UpdateProvider>
        <EnhancedServiceWorkerRegistration />
        <ToastProvider>
          {children}
          <InstallPrompt />
        </ToastProvider>
      </UpdateProvider>
    </I18nInitializer>
  );
};

export default ClientWrapper; 