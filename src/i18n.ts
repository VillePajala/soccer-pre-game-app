import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// Keep imports for reference but don't use them directly
import fiTranslationsFile from './locales/fi.json'; 
import enTranslationsFile from './locales/en.json';

// ADD DEBUG LOG HERE
// Log the entire object now, without truncation
console.log('[i18n.ts] Imported fiTranslations:', JSON.stringify(fiTranslationsFile));
console.log('[i18n.ts] Imported enTranslations:', JSON.stringify(enTranslationsFile));

// Create a complete translation object by merging imported and hardcoded values
const fiTranslations = JSON.parse(JSON.stringify(fiTranslationsFile));
const enTranslations = JSON.parse(JSON.stringify(enTranslationsFile));

// Add missing Finnish translations
if (!fiTranslations.goalLogModal) {
  fiTranslations.goalLogModal = {};
}

// Ensure these specific keys are set for Finnish
fiTranslations.goalLogModal.title = "Kirjaa Maalitapahtuma";
fiTranslations.goalLogModal.timeLabel = "Aika";
fiTranslations.goalLogModal.scorerLabel = "Maalintekijä";
fiTranslations.goalLogModal.selectPlaceholder = "-- Valitse Maalintekijä --";
fiTranslations.goalLogModal.assisterLabel = "Syöttäjä (Valinnainen)";
fiTranslations.goalLogModal.noAssisterPlaceholder = "-- Ei Syöttäjää --";
fiTranslations.goalLogModal.logOpponentGoalButton = "Kirjaa Vast. Maali";
fiTranslations.goalLogModal.logOpponentGoalButtonShort = "Vastustaja + 1";
fiTranslations.goalLogModal.logGoalButton = "Kirjaa Maali";
fiTranslations.goalLogModal.closeButton = "Sulje";
fiTranslations.goalLogModal.cancelButton = "Peruuta";

// Add timer overlay translations
if (!fiTranslations.timerOverlay) {
  fiTranslations.timerOverlay = {};
}
fiTranslations.timerOverlay.teamGoalButton = "Kirjaa maali";
fiTranslations.timerOverlay.opponentGoalButton = "Vastustaja +1";

// Add save game modal translations
if (!fiTranslations.saveGameModal) {
  fiTranslations.saveGameModal = {};
}
fiTranslations.saveGameModal.title = "Tallenna Peli Nimellä...";
fiTranslations.saveGameModal.label = "Pelin Nimi:";
fiTranslations.saveGameModal.placeholder = "esim. vs Lapa FC (Koti)";
fiTranslations.saveGameModal.gameTypeLabel = "Pelin Tyyppi:";
fiTranslations.saveGameModal.gameTypeSeason = "Sarjaottelu";
fiTranslations.saveGameModal.gameTypeTournament = "Turnaus";
fiTranslations.saveGameModal.cancelButton = "Peruuta";
fiTranslations.saveGameModal.saveButton = "Tallenna Peli";

// Add control bar menu translations
if (!fiTranslations.controlBar) {
  fiTranslations.controlBar = {};
}
fiTranslations.controlBar.saveGameAs = "Tallenna Peli Nimellä...";
fiTranslations.controlBar.loadGame = "Lataa Peli";
fiTranslations.controlBar.startNewMatch = "Aloita Uusi Ottelu";
fiTranslations.controlBar.stats = "Tilastot";
fiTranslations.controlBar.training = "Harjoittelu";
fiTranslations.controlBar.tasoLink = "Taso";
fiTranslations.controlBar.tulospalveluLink = "Tulospalvelu";
fiTranslations.controlBar.appGuide = "Sovelluksen Opas";
fiTranslations.controlBar.language = "Kieli";
fiTranslations.controlBar.hardReset = "Nollaa Sovellus";
fiTranslations.controlBar.backButton = "Takaisin";
fiTranslations.controlBar.tulospalveluP9 = "P9 Alue Taso 1";
fiTranslations.controlBar.tulospalveluP9EK = "P/T 9 EK Kortteli (2016)";

// Add common namespace if missing
if (!fiTranslations.common) {
  fiTranslations.common = {};
}
fiTranslations.common.cancelButton = "Peruuta";

// Add missing English translations
if (!enTranslations.goalLogModal) {
  enTranslations.goalLogModal = {};
}

// Ensure these specific keys are set for English
enTranslations.goalLogModal.logGoalButton = "Log Goal";
enTranslations.goalLogModal.logOpponentGoalButton = "Log Opponent Goal";
enTranslations.goalLogModal.logOpponentGoalButtonShort = "Opponent + 1";
enTranslations.goalLogModal.cancelButton = "Cancel";

// Add timer overlay translations
if (!enTranslations.timerOverlay) {
  enTranslations.timerOverlay = {};
}
enTranslations.timerOverlay.teamGoalButton = "Log Goal";
enTranslations.timerOverlay.opponentGoalButton = "Opponent +1";

// Add save game modal translations for English
if (!enTranslations.saveGameModal) {
  enTranslations.saveGameModal = {};
}
enTranslations.saveGameModal.title = "Save Game As...";
enTranslations.saveGameModal.label = "Game Name:";
enTranslations.saveGameModal.placeholder = "e.g., vs Lapa FC (Home)";
enTranslations.saveGameModal.gameTypeLabel = "Game Type:";
enTranslations.saveGameModal.gameTypeSeason = "Season";
enTranslations.saveGameModal.gameTypeTournament = "Tournament";
enTranslations.saveGameModal.cancelButton = "Cancel";
enTranslations.saveGameModal.saveButton = "Save Game";

// Add control bar menu translations for English
if (!enTranslations.controlBar) {
  enTranslations.controlBar = {};
}
enTranslations.controlBar.saveGameAs = "Save Game As...";
enTranslations.controlBar.loadGame = "Load Game";
enTranslations.controlBar.startNewMatch = "Start New Match";
enTranslations.controlBar.stats = "Stats";
enTranslations.controlBar.training = "Training";
enTranslations.controlBar.tasoLink = "Taso";
enTranslations.controlBar.tulospalveluLink = "Tulospalvelu";
enTranslations.controlBar.appGuide = "App Guide";
enTranslations.controlBar.language = "Language";
enTranslations.controlBar.hardReset = "Hard Reset";
enTranslations.controlBar.backButton = "Back";
enTranslations.controlBar.tulospalveluP9 = "P9 Alue Taso 1";
enTranslations.controlBar.tulospalveluP9EK = "P/T 9 EK Kortteli (2016)";

// Add common namespace if missing
if (!enTranslations.common) {
  enTranslations.common = {};
}
enTranslations.common.cancelButton = "Cancel";

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
          translation: fiTranslations // Use our hardcoded version
        },
        en: { 
          translation: enTranslations // Use our enhanced version for English
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