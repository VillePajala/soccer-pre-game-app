import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';

// Removed hardcoded resources
// const resources = { ... };

// Only initialize once
if (!i18n.isInitialized) {
  i18n
    .use(HttpApi) // Use backend to load translations
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
      // Removed 'resources' option
      lng: "fi", // default language
      fallbackLng: "en", // use en if detected lng is not available
      ns: ['common'], // Define namespace(s)
      defaultNS: 'common',

      backend: {
        loadPath: '/locales/{{lng}}/{{ns}}.json', // Path to translation files
      },

      interpolation: {
        escapeValue: false // react already safes from xss
      },
      
      // Disable debug mode for production
      debug: false,
      
      // Prevent i18next from blocking rendering
      react: {
        useSuspense: false,
        // Prevent hydration issues
        bindI18n: 'languageChanged',
        bindI18nStore: '',
        transEmptyNodeValue: '',
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p', 'span']
      }
    });
}

export default i18n; 