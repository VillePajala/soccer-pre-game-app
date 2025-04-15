import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fiTranslations from './locales/fi.json'; // Import fi translations directly
import enTranslations from './locales/en.json'; // Import en translations

// Generate a cache-busting version number
// const cacheVersion = new Date().getTime();

// Only initialize once
if (!i18n.isInitialized) {
  i18n
    // Remove HttpApi use
    // .use(HttpApi) 
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
      lng: "fi", // default language
      fallbackLng: "en", // Add fallback language
      // Remove ns and defaultNS
      // ns: ['common'], 
      // defaultNS: 'common',

      // Remove backend config
      // backend: {
      //   loadPath: `/locales/{{lng}}/{{ns}}.json?v=${cacheVersion}`,
      // },

      // Add resources directly
      resources: {
        fi: {
          translation: fiTranslations // Use 'translation' as the default NS key
        },
        en: { // Add English resources
          translation: enTranslations
        }
      },

      interpolation: {
        escapeValue: false // react already safes from xss
      },
      
      debug: false,
      
      react: {
        useSuspense: false,
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed',
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p', 'span']
      }
    });
}

export default i18n; 