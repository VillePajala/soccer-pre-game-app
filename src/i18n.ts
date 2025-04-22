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
fiTranslations.timerOverlay.startButton = "Aloita";
fiTranslations.timerOverlay.pauseButton = "Tauko";
fiTranslations.timerOverlay.resumeButton = "Jatka";
fiTranslations.timerOverlay.startPeriodButton = "Aloita Jakso {{period}}";
fiTranslations.timerOverlay.gameOverButton = "Peli Ohi";
fiTranslations.timerOverlay.editOpponentNameTitle = "Klikkaa muokataksesi vastustajan nimeä";
fiTranslations.timerOverlay.timeSinceLastSubCombined = "Viim. vaihto:";
fiTranslations.timerOverlay.gameNotStarted = "Ottelu ei ole alkanut";
fiTranslations.timerOverlay.halfTimeInProgress = "Puoliaika {{currentPeriod}}/2";
fiTranslations.timerOverlay.gameEnded = "Peli Päättynyt";
fiTranslations.timerOverlay.halfTimeEnded = "Puoliaika {{currentPeriod}} Päättynyt";
fiTranslations.timerOverlay.resetButton = "Nollaa";
fiTranslations.timerOverlay.periodsLabel = "Jaksot";
fiTranslations.timerOverlay.durationLabel = "Kesto";
fiTranslations.timerOverlay.subIntervalLabel = "Vaihtoväli";
fiTranslations.timerOverlay.confirmSubButton = "Vaihto tehty";
fiTranslations.timerOverlay.historyTitle = "Peliaikahistoria";
fiTranslations.timerOverlay.intervalLogFormat = "P{{period}}: {{duration}}";

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

// Add new game setup modal translations
if (!fiTranslations.newGameSetupModal) {
  fiTranslations.newGameSetupModal = {};
}
fiTranslations.newGameSetupModal.title = "Uuden Pelin Asetukset";
fiTranslations.newGameSetupModal.opponentLabel = "Vastustajan Nimi:";
fiTranslations.newGameSetupModal.opponentPlaceholder = "Syötä vastustajan nimi";
fiTranslations.newGameSetupModal.dateLabel = "Pelin Päivämäärä:";
fiTranslations.newGameSetupModal.gameTypeLabel = "Pelin Tyyppi:";
fiTranslations.newGameSetupModal.gameTypeSeason = "Sarjaottelu";
fiTranslations.newGameSetupModal.gameTypeTournament = "Turnaus";
fiTranslations.newGameSetupModal.skipButton = "Ohita";
fiTranslations.newGameSetupModal.startButton = "Aloita Peli";
fiTranslations.newGameSetupModal.opponentRequiredAlert = "Syötä vastustajan nimi.";
// Add location and time translations
fiTranslations.newGameSetupModal.locationLabel = "Paikka (Valinnainen)";
fiTranslations.newGameSetupModal.locationPlaceholder = "esim. Kotikenttä, Stadion X";
fiTranslations.newGameSetupModal.timeLabel = "Aika (TT:MM) (Valinnainen)";
fiTranslations.newGameSetupModal.hourPlaceholder = "TT";
fiTranslations.newGameSetupModal.minutePlaceholder = "MM";
fiTranslations.newGameSetupModal.invalidTimeAlert = "Anna kelvollinen aika (Tunti 0-23, Minuutti 0-59) tai jätä molemmat kentät tyhjiksi.";

// Add game stats modal translations
if (!fiTranslations.gameStatsModal) {
  fiTranslations.gameStatsModal = {};
}
fiTranslations.gameStatsModal.title = "Ottelutilastot";
fiTranslations.gameStatsModal.gameInfoTitle = "Ottelun Tiedot";
fiTranslations.gameStatsModal.closeButton = "Sulje";
fiTranslations.gameStatsModal.notesTitle = "Ottelun Muistiinpanot";
fiTranslations.gameStatsModal.playerStatsTitle = "Pelaajatilastot";
fiTranslations.gameStatsModal.tab_current = "Nykyinen";
fiTranslations.gameStatsModal.tab_season = "Kausi";
fiTranslations.gameStatsModal.tab_tournament = "Turnaus";
fiTranslations.gameStatsModal.tab_all = "Kaikki";
fiTranslations.gameStatsModal.fairPlayTooltip = "Reilun Pelin Kortti";
fiTranslations.gameStatsModal.fairPlayAwardNone = "- Ei Valittu -";
fiTranslations.gameStatsModal.playerHeader = "PELAAJA";
fiTranslations.gameStatsModal.filterPlaceholder = "Suodata pelaajia...";
fiTranslations.gameStatsModal.goalsHeader = "M";
fiTranslations.gameStatsModal.assistsHeader = "S";
fiTranslations.gameStatsModal.totalHeader = "YHT";
fiTranslations.gameStatsModal.timeHeader = "Aika";
fiTranslations.gameStatsModal.fairPlayHeader = "RP";
fiTranslations.gameStatsModal.goalLogTitle = "Maaliloki";
fiTranslations.gameStatsModal.noGoalsLogged = "Ei maaleja.";
fiTranslations.gameStatsModal.gamesPlayed = "Pelatut ottelut:";
fiTranslations.gameStatsModal.record = "Tulos (V-H-T):";
fiTranslations.gameStatsModal.goalsFor = "Tehdyt maalit:";
fiTranslations.gameStatsModal.goalsAgainst = "Päästetyt maalit:";
fiTranslations.gameStatsModal.noPlayersMatchFilter = "Ei pelaajia suodattimen mukaan";
fiTranslations.gameStatsModal.noPlayersYet = "Ei pelaajia saatavilla";
fiTranslations.gameStatsModal.seasonTeamStatsTitle = "Kauden Joukkuetilastot";
fiTranslations.gameStatsModal.seasonPlayerStatsTitle = "Kauden Pelaajatilastot";
fiTranslations.gameStatsModal.noSeasonGames = "Ei kauden pelejä tallennettu.";
fiTranslations.gameStatsModal.tournamentTeamStatsTitle = "Turnauksen Joukkuetilastot";
fiTranslations.gameStatsModal.tournamentPlayerStatsTitle = "Turnauksen Pelaajatilastot";
fiTranslations.gameStatsModal.noTournamentGames = "Ei turnauspelejä tallennettu.";
fiTranslations.gameStatsModal.allTeamStatsTitle = "Kaikki Joukkuetilastot";
fiTranslations.gameStatsModal.allPlayerStatsTitle = "Kaikki Pelaajatilastot";
fiTranslations.gameStatsModal.noSavedGames = "Ei tallennettuja pelejä.";
fiTranslations.gameStatsModal.exportJsonButton = 'Export JSON';
fiTranslations.gameStatsModal.exportCsvButton = 'Export CSV';
fiTranslations.gameStatsModal.resetStatsButton = 'Nollaa';
fiTranslations.gameStatsModal.levelScoreButton = 'Taso';
fiTranslations.gameStatsModal.editGoalButton = 'Edit Goal';
fiTranslations.gameStatsModal.saveButton = 'Save';
fiTranslations.gameStatsModal.opponentPlaceholder = 'Opponent';
fiTranslations.gameStatsModal.typeHeader = 'Type';
fiTranslations.gameStatsModal.scorerHeader = 'Scorer';
fiTranslations.gameStatsModal.assisterHeader = 'Assister';
fiTranslations.gameStatsModal.exportJsonButtonCurrent = 'Vie Nykyinen JSON';
fiTranslations.gameStatsModal.exportJsonButton_season = 'Vie Kausi JSON';
fiTranslations.gameStatsModal.exportJsonButton_tournament = 'Vie Turnaus JSON';
fiTranslations.gameStatsModal.exportJsonButton_all = 'Vie Kaikki JSON';
fiTranslations.gameStatsModal.exportCsvButtonCurrent = 'Vie Nykyinen CSV';
fiTranslations.gameStatsModal.exportCsvButton_season = 'Vie Kausi CSV';
fiTranslations.gameStatsModal.exportCsvButton_tournament = 'Vie Turnaus CSV';
fiTranslations.gameStatsModal.exportCsvButton_all = 'Vie Kaikki CSV';

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
fiTranslations.controlBar.saveGame = "Tallenna";

// Add common namespace if missing
if (!fiTranslations.common) {
  fiTranslations.common = {};
}
fiTranslations.common.cancelButton = "Peruuta";
fiTranslations.common.cancelEdit = "Peruuta";
// ADD missing common keys used in GameSettingsModal labels with actual Finnish
fiTranslations.common.opponent = "Vastustaja";
fiTranslations.common.date = "Päivämäärä";
fiTranslations.common.location = "Paikka";
fiTranslations.common.time = "Aika";
fiTranslations.common.home = "Koti";
fiTranslations.common.away = "Vieras";
fiTranslations.common.notSet = "Ei asetettu";
fiTranslations.common.close = "Sulje";
fiTranslations.common.saveChanges = "Tallenna";

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
enTranslations.timerOverlay.startButton = "Start";
enTranslations.timerOverlay.pauseButton = "Pause";
enTranslations.timerOverlay.resumeButton = "Resume";
enTranslations.timerOverlay.startPeriodButton = "Start Period {{period}}";
enTranslations.timerOverlay.gameOverButton = "Game Over";
enTranslations.timerOverlay.editOpponentNameTitle = "Click to edit opponent name";
enTranslations.timerOverlay.timeSinceLastSubCombined = "Last sub:";
enTranslations.timerOverlay.gameNotStarted = "Game not started";
enTranslations.timerOverlay.halfTimeInProgress = "Half Time {{currentPeriod}}/2";
enTranslations.timerOverlay.gameEnded = "Game Ended";
enTranslations.timerOverlay.halfTimeEnded = "End of Half Time {{currentPeriod}}";
enTranslations.timerOverlay.resetButton = "Reset";
enTranslations.timerOverlay.periodsLabel = "Periods";
enTranslations.timerOverlay.durationLabel = "Duration";
enTranslations.timerOverlay.subIntervalLabel = "Sub Interval";
enTranslations.timerOverlay.confirmSubButton = "Confirm Sub";
enTranslations.timerOverlay.historyTitle = "Play Time History";
enTranslations.timerOverlay.intervalLogFormat = "P{{period}}: {{duration}}";

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

// Add new game setup modal translations for English
if (!enTranslations.newGameSetupModal) {
  enTranslations.newGameSetupModal = {};
}
enTranslations.newGameSetupModal.title = "New Game Setup";
enTranslations.newGameSetupModal.opponentLabel = "Opponent Name:";
enTranslations.newGameSetupModal.opponentPlaceholder = "Enter opponent name";
enTranslations.newGameSetupModal.dateLabel = "Game Date:";
enTranslations.newGameSetupModal.gameTypeLabel = "Game Type:";
enTranslations.newGameSetupModal.gameTypeSeason = "Season";
enTranslations.newGameSetupModal.gameTypeTournament = "Tournament";
enTranslations.newGameSetupModal.skipButton = "Skip";
enTranslations.newGameSetupModal.startButton = "Start Game";
enTranslations.newGameSetupModal.opponentRequiredAlert = "Please enter an opponent name.";
// Add location and time translations
enTranslations.newGameSetupModal.locationLabel = "Location (Optional)";
enTranslations.newGameSetupModal.locationPlaceholder = "e.g., Home Field, Stadium X";
enTranslations.newGameSetupModal.timeLabel = "Time (HH:MM) (Optional)";
enTranslations.newGameSetupModal.hourPlaceholder = "HH";
enTranslations.newGameSetupModal.minutePlaceholder = "MM";
enTranslations.newGameSetupModal.invalidTimeAlert = "Please enter a valid time (Hour 0-23, Minute 0-59) or leave both fields empty.";

// Add game stats modal translations for English
if (!enTranslations.gameStatsModal) {
  enTranslations.gameStatsModal = {};
}
enTranslations.gameStatsModal.title = "Game Statistics";
enTranslations.gameStatsModal.gameInfoTitle = "Game Information";
enTranslations.gameStatsModal.closeButton = "Close";
enTranslations.gameStatsModal.notesTitle = "Game Notes";
enTranslations.gameStatsModal.playerStatsTitle = "Player Statistics";
enTranslations.gameStatsModal.tab_current = "Current";
enTranslations.gameStatsModal.tab_season = "Season";
enTranslations.gameStatsModal.tab_tournament = "Tournament";
enTranslations.gameStatsModal.tab_all = "All";
enTranslations.gameStatsModal.fairPlayTooltip = "Fair Play Card";
enTranslations.gameStatsModal.fairPlayAwardNone = "- None -";
enTranslations.gameStatsModal.playerHeader = "PLAYER";
enTranslations.gameStatsModal.filterPlaceholder = "Filter players...";
enTranslations.gameStatsModal.goalsHeader = "G";
enTranslations.gameStatsModal.assistsHeader = "A";
enTranslations.gameStatsModal.totalHeader = "PTS";
enTranslations.gameStatsModal.timeHeader = "Time";
enTranslations.gameStatsModal.fairPlayHeader = "FP";
enTranslations.gameStatsModal.goalLogTitle = "Goal Log";
enTranslations.gameStatsModal.noGoalsLogged = "No goals logged yet.";
enTranslations.gameStatsModal.gamesPlayed = "Games Played:";
enTranslations.gameStatsModal.record = "Record (W-L-D):";
enTranslations.gameStatsModal.goalsFor = "Goals For:";
enTranslations.gameStatsModal.goalsAgainst = "Goals Against:";
enTranslations.gameStatsModal.noPlayersMatchFilter = "No players match filter";
enTranslations.gameStatsModal.noPlayersYet = "No players available";
enTranslations.gameStatsModal.seasonTeamStatsTitle = "Season Team Stats";
enTranslations.gameStatsModal.seasonPlayerStatsTitle = "Season Player Stats";
enTranslations.gameStatsModal.noSeasonGames = "No season games saved.";
enTranslations.gameStatsModal.tournamentTeamStatsTitle = "Tournament Team Stats";
enTranslations.gameStatsModal.tournamentPlayerStatsTitle = "Tournament Player Stats";
enTranslations.gameStatsModal.noTournamentGames = "No tournament games saved.";
enTranslations.gameStatsModal.allTeamStatsTitle = "All Team Stats";
enTranslations.gameStatsModal.allPlayerStatsTitle = "All Player Stats";
enTranslations.gameStatsModal.noSavedGames = "No saved games.";
enTranslations.gameStatsModal.exportJsonButton = 'Export JSON';
enTranslations.gameStatsModal.exportCsvButton = 'Export CSV';
enTranslations.gameStatsModal.resetStatsButton = 'Reset Stats';
enTranslations.gameStatsModal.levelScoreButton = 'Level Score';
enTranslations.gameStatsModal.editGoalButton = 'Edit Goal';
enTranslations.gameStatsModal.saveButton = 'Save';
enTranslations.gameStatsModal.opponentPlaceholder = 'Opponent';
enTranslations.gameStatsModal.typeHeader = 'Type';
enTranslations.gameStatsModal.scorerHeader = 'Scorer';
enTranslations.gameStatsModal.assisterHeader = 'Assister';
enTranslations.gameStatsModal.exportJsonButtonCurrent = 'Export Current JSON';
enTranslations.gameStatsModal.exportJsonButton_season = 'Export Season JSON';
enTranslations.gameStatsModal.exportJsonButton_tournament = 'Export Tournament JSON';
enTranslations.gameStatsModal.exportJsonButton_all = 'Export All JSON';
enTranslations.gameStatsModal.exportCsvButtonCurrent = 'Export Current CSV';
enTranslations.gameStatsModal.exportCsvButton_season = 'Export Season CSV';
enTranslations.gameStatsModal.exportCsvButton_tournament = 'Export Tournament CSV';
enTranslations.gameStatsModal.exportCsvButton_all = 'Export All CSV';

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
enTranslations.controlBar.saveGame = "Save";

// Add common namespace if missing
if (!enTranslations.common) {
  enTranslations.common = {};
}
enTranslations.common.cancelButton = "Cancel";

// Add load game modal translations if section doesn't exist
if (!fiTranslations.loadGameModal) {
  fiTranslations.loadGameModal = {};
}

// Add the filter translations for Finnish
fiTranslations.loadGameModal.filter_all = "Kaikki";
fiTranslations.loadGameModal.filter_season = "Sarja";
fiTranslations.loadGameModal.filter_tournament = "Turnaus";
fiTranslations.loadGameModal.filterPlaceholder = "Suodata nimellä/päivämäärällä...";
fiTranslations.loadGameModal.loadButton = "Lataa Peli";
fiTranslations.loadGameModal.noFilterResults = "Ei hakutuloksia.";

// Add load game modal translations if section doesn't exist for English
if (!enTranslations.loadGameModal) {
  enTranslations.loadGameModal = {};
}

// Add the filter translations for English
enTranslations.loadGameModal.filter_all = "All";
enTranslations.loadGameModal.filter_season = "Season";
enTranslations.loadGameModal.filter_tournament = "Tournament";
enTranslations.loadGameModal.filterPlaceholder = "Filter by name/date...";
enTranslations.loadGameModal.loadButton = "Load Game";
enTranslations.loadGameModal.noFilterResults = "No games match the current filter.";

// Add RosterSettingsModal translations if section doesn't exist
if (!fiTranslations.rosterSettingsModal) {
  fiTranslations.rosterSettingsModal = {};
}
fiTranslations.rosterSettingsModal.title = "Joukkueen Hallinta";
fiTranslations.rosterSettingsModal.teamNameLabel = "Joukkueen Nimi:";

// ADD GameSettingsModal translations (Ensure object exists first)
if (!fiTranslations.gameSettingsModal) {
  fiTranslations.gameSettingsModal = {};
}
// Now assign keys with actual Finnish
fiTranslations.gameSettingsModal.title = "Pelin Asetukset";
fiTranslations.gameSettingsModal.gameInfoTitle = "Ottelun Tiedot";
fiTranslations.gameSettingsModal.fairPlayTitle = "RFair Play -kortti";
fiTranslations.gameSettingsModal.awardFairPlayLabel = "Palkittu Pelaaja:";
fiTranslations.gameSettingsModal.awardFairPlayNone = "- Ei Valittu -";
fiTranslations.gameSettingsModal.notesTitle = "Muistiinpanot";
fiTranslations.gameSettingsModal.notesPlaceholder = "Kirjoita muistiinpanoja...";
fiTranslations.gameSettingsModal.noNotes = "Ei muistiinpanoja.";
fiTranslations.gameSettingsModal.eventLogTitle = "Muokkaa Tapahtumia";
fiTranslations.gameSettingsModal.noGoalsLogged = "Ei kirjattuja maaleja.";
fiTranslations.gameSettingsModal.invalidTimeFormat = "Virheellinen aika (MM:SS)";
fiTranslations.gameSettingsModal.scorerRequired = "Maalintekijä vaaditaan.";

// Ensure common namespace exists before adding key
if (!fiTranslations.common) {
  fiTranslations.common = {};
}
fiTranslations.common.cancelEdit = "Peruuta"; 
// ADD missing common keys used in GameSettingsModal labels with actual Finnish
fiTranslations.common.opponent = "Vastustaja";
fiTranslations.common.date = "Päivämäärä";
fiTranslations.common.location = "Paikka";
fiTranslations.common.time = "Aika";
fiTranslations.common.home = "Koti";
fiTranslations.common.away = "Vieras";
fiTranslations.common.notSet = "Ei asetettu";

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