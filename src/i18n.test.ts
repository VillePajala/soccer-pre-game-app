import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// import HttpApi from 'i18next-http-backend'; // Remove unused import

// Define minimal resources inline for tests
const testResources = {
  en: {
    translation: {
      "gameStatsModal.title": "Game Statistics",
      "gameStatsModal.gameInfoTitle": "Game Info",
      "gameStatsModal.playerStatsTitle": "Player Statistics",
      "gameStatsModal.eventLogTitle": "Event Log",
      "gameStatsModal.notesTitle": "Game Notes",
      "gameStatsModal.tabs.currentGame": "Current Game",
      "gameStatsModal.tabs.season": "Season",
      "gameStatsModal.tabs.tournament": "Tournament",
      "gameStatsModal.tabs.overall": "Overall",
      "gameStatsModal.filterPlaceholder": "Filter...",
      "gameStatsModal.editGoalTooltip": "Edit Goal",
      "gameStatsModal.deleteGoalTooltip": "Delete Goal",
      "gameStatsModal.saveGoalTooltip": "Save Goal",
      "gameStatsModal.cancelEditGoalTooltip": "Cancel Edit", "gameStatsModal.confirmDeleteEvent": "Are you sure you want to delete this event? This cannot be undone.",
      "common.opponent": "Opponent",
      "common.date": "Date",
      "common.location": "Location",
      "common.time": "Time",
      "common.home": "Home",
      "common.away": "Away",
      "common.score": "Score",
      "common.edit": "Edit",
      "common.save": "Save",
      "common.cancel": "Cancel",
      "common.close": "Close",
      "common.exportJson": "Export JSON",
      "common.exportCsv": "Export CSV",
      "common.player": "Player",
      "common.gp": "GP",
      "common.g": "G",
      "common.a": "A",
      "common.p": "P",
      "common.fp": "FP",
      "common.goal": "Goal",
      "common.opponentGoal": "Opponent Goal",
      "common.assist": "Assist: {{player}}",
      "common.notSet": "Not Set",
      "playerStats.totalsRow": "Totals"
      // Add any other keys used in GameStatsModal or its tests
    }
  },
  fi: {
    translation: {
      "gameStatsModal.title": "Ottelutilastot",
      "gameStatsModal.gameInfoTitle": "Ottelun Tiedot",
      "gameStatsModal.playerStatsTitle": "Pelaajatilastot",
      "gameStatsModal.eventLogTitle": "Maaliloki",
      "gameStatsModal.notesTitle": "Muistiinpanot",
      "gameStatsModal.tabs.currentGame": "Nykyinen",
      "gameStatsModal.tabs.season": "Kausi",
      "gameStatsModal.tabs.tournament": "Turnaus",
      "gameStatsModal.tabs.overall": "Kaikki",
      "gameStatsModal.filterPlaceholder": "Suodata...",
      "gameStatsModal.editGoalTooltip": "Muokkaa Maalia",
      "gameStatsModal.deleteGoalTooltip": "Poista Maali",
      "gameStatsModal.saveGoalTooltip": "Tallenna Maali",
      "gameStatsModal.cancelEditGoalTooltip": "Peruuta Muokkaus", "gameStatsModal.confirmDeleteEvent": "Haluatko varmasti poistaa tämän tapahtuman?",
      "common.opponent": "Vastustaja",
      "common.date": "PÃ¤ivÃ¤mÃ¤Ã¤rÃ¤",
      "common.location": "Paikka",
      "common.time": "Aika",
      "common.home": "Koti",
      "common.away": "Vieras",
      "common.score": "Tulos",
      "common.edit": "Muokkaa",
      "common.save": "Tallenna",
      "common.cancel": "Peruuta",
      "common.close": "Sulje",
      "common.exportJson": "Vie JSON",
      "common.exportCsv": "Vie CSV",
      "common.player": "Pelaaja",
      "common.gp": "OP",
      "common.g": "M",
      "common.a": "S",
      "common.p": "P",
      "common.fp": "FP",
      "common.goal": "Maali",
      "common.opponentGoal": "Vastustajan Maali",
      "common.assist": "SyÃ¶ttÃ¤jÃ¤: {{player}}",
      "common.notSet": "Ei asetettu",
      "playerStats.totalsRow": "Yhteensä",
    }
  },
  // Add other languages if needed for specific tests
};

i18n
  .use(initReactI18next)
  .init({
    resources: testResources,
    lng: 'fi', // Set default language to Finnish for tests
    fallbackLng: 'en', // Keep English as fallback
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;

describe('i18n initialization', () => {
  it('should initialize without errors', () => {
    expect(i18n).toBeDefined();
  });
}); 
