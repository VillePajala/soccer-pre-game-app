import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// We'll load translations from static JSON files later
// For now, let's define some basic ones directly
const resources = {
  en: {
    translation: {
      "controlBar.help": "Help",
      "instructionsModal.title": "How to Use"
    }
  },
  fi: {
    translation: {
      "controlBar.help": "Ohje",
      "instructionsModal.title": "Käyttöohjeet"
    }
  }
};

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en", // use en if detected lng is not available

    interpolation: {
      escapeValue: false // react already safes from xss
    },
    debug: true // Log i18n state to console in development
  });

export default i18n; 