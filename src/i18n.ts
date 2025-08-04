import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Dynamic import function for translation resources
const loadTranslationResource = async (language: string) => {
  try {
    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      // Server-side: load from filesystem
      const fs = await import('fs');
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'public', 'locales', language, 'common.json');
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } else {
      // Client-side: fetch from public API
      const response = await fetch(`/locales/${language}/common.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${language} translations`);
      }
      return await response.json();
    }
  } catch (error) {
    console.warn(`Failed to load ${language} translations:`, error);
    return {};
  }
};

// Initialize with minimal resources - load only default language initially
const initializeI18n = async () => {
  if (i18n.isInitialized) return i18n;

  // Load only Finnish (default) initially to reduce bundle size
  const fiTranslations = await loadTranslationResource('fi');
  
  await i18n.use(initReactI18next).init({
    lng: 'fi',
    fallbackLng: 'en',
    resources: {
      fi: { translation: fiTranslations },
      // English will be loaded dynamically when needed
    },
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

  return i18n;
};

// Load additional language resources dynamically
export const loadLanguage = async (language: string) => {
  // Check if language is already loaded
  if (i18n.hasResourceBundle(language, 'translation')) {
    await i18n.changeLanguage(language);
    return;
  }

  // Load the language resource dynamically
  const translations = await loadTranslationResource(language);
  i18n.addResourceBundle(language, 'translation', translations);
  await i18n.changeLanguage(language);
};

// Initialize i18n on module load
initializeI18n().catch(error => {
  console.error('Failed to initialize i18n:', error);
});

export default i18n;
