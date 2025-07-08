import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// Use the comprehensive translation files
import fi from './locales/fi/translation.json';
import en from './locales/en/translation.json';

export const resources = {
  fi: { translation: fi },
  en: { translation: en },
} as const;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    lng: 'fi',
    fallbackLng: 'en',
    resources,
    interpolation: { escapeValue: false },
    debug: false,
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p', 'span'],
    },
  });
}

export default i18n;
