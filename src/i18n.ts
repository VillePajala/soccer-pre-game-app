import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';

// Generate a cache-busting version number
const cacheVersion = new Date().getTime();

// Only initialize once
if (!i18n.isInitialized) {
  i18n
    .use(HttpApi) // Use backend to load translations
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
      lng: "fi", // default language
      fallbackLng: "en", // use en if detected lng is not available
      ns: ['common'], // Define namespace(s)
      defaultNS: 'common',

      backend: {
        loadPath: `/locales/{{lng}}/{{ns}}.json?v=${cacheVersion}`, // Path with cache busting
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