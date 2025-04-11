'use client';

import React from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';

const ClientWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <I18nextProvider i18n={i18n}>
      {children}
    </I18nextProvider>
  );
};

export default ClientWrapper; 