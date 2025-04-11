import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';

// Removed hardcoded resources
// const resources = { ... };

i18n
  .use(HttpApi) // Use backend to load translations
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // Removed 'resources' option
    lng: "en", // default language
    fallbackLng: "en", // use en if detected lng is not available
    ns: ['common'], // Define namespace(s)
    defaultNS: 'common',

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', // Path to translation files
    },

    interpolation: {
      escapeValue: false // react already safes from xss
    },
    debug: true // Log i18n state to console in development
  });

export default i18n; 