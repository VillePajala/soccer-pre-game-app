import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// Keep imports for reference but don't use them directly
import fiTranslationsFile from './locales/fi.json'; 
import enTranslationsFile from './locales/en.json';

// ADD DEBUG LOG HERE
// Log the entire object now, without truncation
//console.log('[i18n.ts] Imported fiTranslations:', JSON.stringify(fiTranslationsFile));
//console.log('[i18n.ts] Imported enTranslations:', JSON.stringify(enTranslationsFile));

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
fiTranslations.newGameSetupModal.opponentNameLabel = "Vastustajan Nimi: *";
fiTranslations.newGameSetupModal.opponentPlaceholder = "Syötä vastustajan nimi";
fiTranslations.newGameSetupModal.gameDateLabel = "Pelin Päivämäärä:";
fiTranslations.newGameSetupModal.gameTypeLabel = "Pelin Tyyppi:";
fiTranslations.newGameSetupModal.gameTypeSeason = "Sarjaottelu";
fiTranslations.newGameSetupModal.gameTypeTournament = "Turnaus";
fiTranslations.newGameSetupModal.skipButton = "Ohita";
fiTranslations.newGameSetupModal.startButton = "Aloita Peli";
fiTranslations.newGameSetupModal.opponentRequiredAlert = "Syötä vastustajan nimi.";
fiTranslations.newGameSetupModal.gameLocationLabel = "Paikka (Valinnainen):";
fiTranslations.newGameSetupModal.locationPlaceholder = "esim. Kotikenttä, Stadion X";
fiTranslations.newGameSetupModal.gameTimeLabel = "Aika (Valinnainen):";
fiTranslations.newGameSetupModal.hourPlaceholder = "TT";
fiTranslations.newGameSetupModal.minutePlaceholder = "MM";
fiTranslations.newGameSetupModal.invalidTimeAlert = "Anna kelvollinen aika (Tunti 0-23, Minuutti 0-59) tai jätä molemmat kentät tyhjiksi.";
fiTranslations.newGameSetupModal.seasonLabel = "Kausi:";
fiTranslations.newGameSetupModal.tournamentLabel = "Turnaus:";
fiTranslations.newGameSetupModal.createSeason = "Luo Kausi";
fiTranslations.newGameSetupModal.createTournament = "Luo Turnaus";
fiTranslations.newGameSetupModal.creating = "Luodaan...";
fiTranslations.newGameSetupModal.selectSeasonOption = "-- Valitse Kausi --";
fiTranslations.newGameSetupModal.selectTournamentOption = "-- Valitse Turnaus --";
fiTranslations.newGameSetupModal.newSeasonPlaceholder = "Syötä uuden kauden nimi...";
fiTranslations.newGameSetupModal.newTournamentPlaceholder = "Syötä uuden turnauksen nimi...";
fiTranslations.newGameSetupModal.addButton = "Lisää";
fiTranslations.newGameSetupModal.cancelButton = "Peruuta";
fiTranslations.newGameSetupModal.newSeasonNameRequired = "Anna uuden kauden nimi tai valitse olemassa oleva.";
fiTranslations.newGameSetupModal.newTournamentNameRequired = "Anna uuden turnauksen nimi tai valitse olemassa oleva.";
fiTranslations.newGameSetupModal.duplicateSeasonName = "Tämän niminen kausi on jo olemassa.";
fiTranslations.newGameSetupModal.duplicateTournamentName = "Tämän niminen turnaus on jo olemassa.";
fiTranslations.newGameSetupModal.errorAddingSeason = "Virhe uuden kauden lisäämisessä.";
fiTranslations.newGameSetupModal.errorAddingTournament = "Virhe uuden turnauksen lisäämisessä.";
fiTranslations.newGameSetupModal.createNewSeasonTitle = "Luo Uusi Kausi";
fiTranslations.newGameSetupModal.createNewTournamentTitle = "Luo Uusi Turnaus";
fiTranslations.newGameSetupModal.cancelAddTitle = "Peruuta Lisäys";
fiTranslations.newGameSetupModal.periodsLabel = "Jaksot";
fiTranslations.newGameSetupModal.numPeriodsLabel = "Jaksojen Määrä:";
fiTranslations.newGameSetupModal.durationLabel = "Kesto (min)";
fiTranslations.newGameSetupModal.periodDurationLabel = "Jakson Kesto (min):";
fiTranslations.newGameSetupModal.homeOrAwayLabel = "Joukkueesi on:";
fiTranslations.newGameSetupModal.confirmAndStart = "Vahvista & Aloita Peli";

// <<< Add translations for Home Team Name field >>>
fiTranslations.newGameSetupModal.homeTeamLabel = "Oman joukkueen nimi: *";
fiTranslations.newGameSetupModal.homeTeamName = "Oman Joukkueen Nimi";
fiTranslations.newGameSetupModal.homeTeamPlaceholder = "Syötä oman joukkueen nimi";
fiTranslations.newGameSetupModal.homeTeamRequiredAlert = "Syötä oman joukkueen nimi.";

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
fiTranslations.gameStatsModal.titleOverall = 'Kokonaistilastot';
fiTranslations.gameStatsModal.editNotes = 'Edit Notes';
fiTranslations.gameStatsModal.confirmDeleteEvent = "Haluatko varmasti poistaa tämän tapahtuman?";

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
fiTranslations.controlBar.manageRoster = "Hallinnoi Kokoonpanoa";
fiTranslations.controlBar.gameSettingsTooltip = "Peliasetukset";
fiTranslations.controlBar.exportData = "Vie Tiedot";
fiTranslations.controlBar.enterFullscreen = "Koko Näyttö";
fiTranslations.controlBar.exitFullscreen = "Poistu Koko Näytöltä";
fiTranslations.controlBar.newGameButton = "Uusi Peli";
fiTranslations.controlBar.gameSettingsButton = "Otteluasetukset";
fiTranslations.controlBar.toggleLanguage = "Vaihda Englantiin";
fiTranslations.controlBar.coachingMaterials = "Valmennusmateriaalit";
fiTranslations.controlBar.manageSeasonsAndTournaments = "Hallinnoi Kausia & Turnauksia";
fiTranslations.controlBar.rules = "Säännöt";
fiTranslations.controlBar.toggleTacticsBoardShow = "Näytä taktiikkataulu";
fiTranslations.controlBar.toggleTacticsBoardHide = "Näytä pelaajat";
fiTranslations.controlBar.addHomeDisc = "Lisää kotijoukkueen pelaaja";
fiTranslations.controlBar.addOpponentDisc = "Lisää vastustajan pelaaja";

// Add common namespace if missing
if (!fiTranslations.common) {
  fiTranslations.common = {};
}
fiTranslations.common.avgPointsShort = "KA";
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
fiTranslations.common.edit = "Muokkaa";
fiTranslations.common.remove = "Poista";
fiTranslations.common.actions = "Toiminnot"; // Event log header
fiTranslations.common.doneButton = "Valmis";

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
// --- Add Missing English Translations ---
enTranslations.newGameSetupModal.seasonLabel = "Season:";
enTranslations.newGameSetupModal.tournamentLabel = "Tournament:";
enTranslations.newGameSetupModal.createButton = "Create New";
enTranslations.newGameSetupModal.selectSeasonOption = "-- Select Season --";
enTranslations.newGameSetupModal.selectTournamentOption = "-- Select Tournament --";
enTranslations.newGameSetupModal.newSeasonPlaceholder = "Enter new season name...";
enTranslations.newGameSetupModal.newTournamentPlaceholder = "Enter new tournament name...";
enTranslations.newGameSetupModal.addButton = "Add";
enTranslations.newGameSetupModal.cancelButton = "Cancel";
enTranslations.newGameSetupModal.newSeasonNameRequired = "Please enter a name for the new season or select an existing one.";
enTranslations.newGameSetupModal.newTournamentNameRequired = "Please enter a name for the new tournament or select an existing one.";
enTranslations.newGameSetupModal.duplicateSeasonName = "A season with this name already exists.";
enTranslations.newGameSetupModal.duplicateTournamentName = "A tournament with this name already exists.";
enTranslations.newGameSetupModal.errorAddingSeason = "Error adding new season.";
enTranslations.newGameSetupModal.errorAddingTournament = "Error adding new tournament.";
enTranslations.newGameSetupModal.createNewSeasonTitle = "Create New Season";
enTranslations.newGameSetupModal.createNewTournamentTitle = "Create New Tournament";
enTranslations.newGameSetupModal.cancelAddTitle = "Cancel Add";
enTranslations.newGameSetupModal.periodsLabel = "Periods";
enTranslations.newGameSetupModal.durationLabel = "Duration (min)";
enTranslations.newGameSetupModal.homeOrAwayLabel = "Your Team is:";
enTranslations.newGameSetupModal.confirmAndStart = "Confirm & Start Game";

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
enTranslations.gameStatsModal.titleOverall = 'Overall Stats';
enTranslations.gameStatsModal.editNotes = 'Edit Notes';
enTranslations.gameStatsModal.confirmDeleteEvent = "Are you sure you want to delete this event?";

// Add control bar menu translations for English
if (!enTranslations.controlBar) {
  enTranslations.controlBar = {};
}
enTranslations.controlBar.saveGameAs = "Save Game As...";
enTranslations.controlBar.loadGame = "Load Game";
enTranslations.controlBar.startNewMatch = "Start New Match";
enTranslations.controlBar.stats = "Stats";
enTranslations.controlBar.training = "Training";
enTranslations.controlBar.coachingMaterials = "Coaching Materials";
enTranslations.controlBar.tasoLink = "Taso";
enTranslations.controlBar.tulospalveluLink = "Results Service";
enTranslations.controlBar.appGuide = "App Guide";
enTranslations.controlBar.language = "Language";
enTranslations.controlBar.hardReset = "Hard Reset";
enTranslations.controlBar.backButton = "Back";
enTranslations.controlBar.tulospalveluP9 = "P9 Region Level 1";
enTranslations.controlBar.tulospalveluP9EK = "P/T 9 EK Block (2016)";
enTranslations.controlBar.saveGame = "Save";
enTranslations.controlBar.manageRoster = "Manage Roster";
enTranslations.controlBar.gameSettingsTooltip = "Game Settings";
enTranslations.controlBar.exportData = "Export Data";
enTranslations.controlBar.enterFullscreen = "Enter Fullscreen";
enTranslations.controlBar.exitFullscreen = "Exit Fullscreen";
enTranslations.controlBar.newGameButton = "New Game";
enTranslations.controlBar.gameSettingsButton = "Game Settings";
enTranslations.controlBar.toggleLanguage = "Switch to Finnish";
enTranslations.controlBar.manageSeasonsAndTournaments = "Manage Seasons & Tournaments";
enTranslations.controlBar.rules = "Rules";
enTranslations.controlBar.toggleTacticsBoardShow = "Show Tactics Board";
enTranslations.controlBar.toggleTacticsBoardHide = "Show Players";
enTranslations.controlBar.addHomeDisc = "Add Home Disc";
enTranslations.controlBar.addOpponentDisc = "Add Opponent Disc";

// Add common namespace if missing
if (!enTranslations.common) {
  enTranslations.common = {};
}
enTranslations.common.avgPointsShort = "AVG";
enTranslations.common.cancelButton = "Cancel";
enTranslations.common.cancelEdit = "Cancel";
// ADD missing common keys for English
enTranslations.common.opponent = "Opponent";
enTranslations.common.date = "Date";
enTranslations.common.location = "Location";
enTranslations.common.time = "Time";
enTranslations.common.home = "Home";
enTranslations.common.away = "Away";
enTranslations.common.notSet = "Not Set";
enTranslations.common.close = "Close";
enTranslations.common.saveChanges = "Save";
enTranslations.common.edit = "Edit";
enTranslations.common.remove = "Remove";
enTranslations.common.actions = "Actions";
enTranslations.common.doneButton = "Done";

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
fiTranslations.loadGameModal.backupButton = "Varmuuskopioi Kaikki Tiedot";
fiTranslations.loadGameModal.restoreButton = "Palauta Varmuuskopiosta";

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
enTranslations.loadGameModal.backupButton = "Backup All Data";
enTranslations.loadGameModal.restoreButton = "Restore from Backup";

// Add RosterSettingsModal translations if section doesn't exist
if (!fiTranslations.rosterSettingsModal) {
  fiTranslations.rosterSettingsModal = {};
}
fiTranslations.rosterSettingsModal.title = "Joukkueen Hallinta";
fiTranslations.rosterSettingsModal.teamNameLabel = "Joukkueen Nimi:";
// Add other keys as needed
fiTranslations.rosterSettingsModal.selectHeader = "VAL";
fiTranslations.rosterSettingsModal.goalieHeader = "MV";
fiTranslations.rosterSettingsModal.nameHeader = "Nimi";
fiTranslations.rosterSettingsModal.jerseyHeader = "Numero";
fiTranslations.rosterSettingsModal.fairPlayHeader = "FP";
fiTranslations.rosterSettingsModal.actions = "Toiminnot";
fiTranslations.rosterSettingsModal.playerNamePlaceholder = "Pelaajan Nimi";
fiTranslations.rosterSettingsModal.nicknamePlaceholder = "Lempinimi (näytöllä)";
fiTranslations.rosterSettingsModal.nameRequired = "Pelaajan nimi ei voi olla tyhjä.";
fiTranslations.rosterSettingsModal.notesPlaceholder = "Pelaajan muistiinpanot...";
fiTranslations.rosterSettingsModal.addPlayerButton = "Lisää Pelaaja";
fiTranslations.rosterSettingsModal.toggleSelection = "Valitse/Poista valinta otteluun";
fiTranslations.rosterSettingsModal.unsetGoalie = "Poista MV-status";
fiTranslations.rosterSettingsModal.setGoalie = "Aseta Maalivahdiksi";
fiTranslations.rosterSettingsModal.hasNotes = "Muistiinpanoja";

// ADD GameSettingsModal translations (Ensure object exists first)
if (!fiTranslations.gameSettingsModal) {
  fiTranslations.gameSettingsModal = {};
}
// Now assign keys with actual Finnish
fiTranslations.gameSettingsModal.title = "Pelin Asetukset";
fiTranslations.gameSettingsModal.gameInfoTitle = "Ottelun Tiedot";
fiTranslations.gameSettingsModal.fairPlayTitle = "Fair Play -kortti";
fiTranslations.gameSettingsModal.awardFairPlayLabel = "Palkittu Pelaaja:";
fiTranslations.gameSettingsModal.awardFairPlayNone = "- Ei Valittu -";
fiTranslations.gameSettingsModal.notesTitle = "Muistiinpanot";
fiTranslations.gameSettingsModal.notesPlaceholder = "Kirjoita muistiinpanoja...";
fiTranslations.gameSettingsModal.noNotes = "Ei muistiinpanoja.";
fiTranslations.gameSettingsModal.eventLogTitle = "Muokkaa Tapahtumia";
fiTranslations.gameSettingsModal.noGoalsLogged = "Ei kirjattuja maaleja.";
fiTranslations.gameSettingsModal.invalidTimeFormat = "Virheellinen aika (MM:SS)";
fiTranslations.gameSettingsModal.scorerRequired = "Maalintekijä vaaditaan.";
// Add missing keys for the GameSettingsModal
fiTranslations.gameSettingsModal.periodsLabel = "Jaksot";
fiTranslations.gameSettingsModal.durationLabel = "Kesto (min)";
fiTranslations.gameSettingsModal.seasonLabel = "Kausi";
fiTranslations.gameSettingsModal.tournamentLabel = "Turnaus";
fiTranslations.gameSettingsModal.association = "Linkitä";
fiTranslations.gameSettingsModal.selectSeason = "- Valitse Kausi -";
fiTranslations.gameSettingsModal.selectTournament = "- Valitse Turnaus -";
fiTranslations.gameSettingsModal.noPlayerSelected = "- Valitse Pelaaja -";
fiTranslations.gameSettingsModal.confirmDeleteEvent = "Haluatko varmasti poistaa tämän tapahtuman?";
fiTranslations.gameSettingsModal.invalidDuration = "Keston täytyy olla positiivinen luku.";
fiTranslations.gameSettingsModal.locationPlaceholder = "Esim. Kaupunki, Kenttä";

// <<< ADD MISSING GAME INFO LABELS >>>
fiTranslations.gameSettingsModal.gameInfo = "Ottelun Tiedot";
fiTranslations.gameSettingsModal.opponent = "Vastustaja";
fiTranslations.gameSettingsModal.date = "Päivämäärä";
fiTranslations.gameSettingsModal.location = "Paikka";
fiTranslations.gameSettingsModal.time = "Aika";
fiTranslations.gameSettingsModal.periods = "Jaksot"; // Key used in component
fiTranslations.gameSettingsModal.duration = "Kesto"; // Key used in component
fiTranslations.gameSettingsModal.fairPlayCard = "Fair Play"; // Key used in component
// Add keys for association buttons/labels if they don't exist
fiTranslations.gameSettingsModal.associationNone = "Ei Mikään";
fiTranslations.gameSettingsModal.associationSeason = "Kausi/Sarja";
fiTranslations.gameSettingsModal.associationTournament = "Turnaus";
fiTranslations.gameSettingsModal.noneAwarded = "-- Ei Palkittu --"; // For Fair Play dropdown


// <<< ADD MISSING GAME NOTES & EVENT LOG LABELS >>>
fiTranslations.gameSettingsModal.notes = "Muistiinpanot"; // Title for Game Notes
fiTranslations.gameSettingsModal.eventLog = "Tapahtumaloki"; // Title for Event Log
fiTranslations.gameSettingsModal.logTime = "Aika"; // Event log header
fiTranslations.gameSettingsModal.logType = "Tyyppi"; // Event log header
fiTranslations.gameSettingsModal.logScorer = "Tekijä"; // Event log header (more general than Scorer)
fiTranslations.gameSettingsModal.logAssister = "Syöttäjä"; // Event log header
fiTranslations.gameSettingsModal.logTypeGoal = "Maali"; // Event type text
fiTranslations.gameSettingsModal.logTypeOpponentGoal = "Vast. Maali"; // Event type text
fiTranslations.gameSettingsModal.selectScorer = "Valitse Tekijä..."; // Dropdown placeholder
fiTranslations.gameSettingsModal.selectAssister = "Valitse Syöttäjä (Valinnainen)..."; // Dropdown placeholder
fiTranslations.gameSettingsModal.unknownPlayer = "Tuntematon Pelaaja"; // Fallback text

// Ensure common namespace exists before adding key
if (!fiTranslations.common) {
  fiTranslations.common = {};
}
fiTranslations.common.cancelEdit = "Peruuta"; 
// ADD missing common keys used in GameSettingsModal labels with actual Finnish
fiTranslations.common.opponent = "Vastustaja"; // Already exists
fiTranslations.common.date = "Päivämäärä"; // Already exists
fiTranslations.common.location = "Paikka"; // Already exists
fiTranslations.common.time = "Aika"; // Already exists
fiTranslations.common.home = "Koti"; // Already exists
fiTranslations.common.away = "Vieras"; // Already exists
fiTranslations.common.notSet = "Ei asetettu"; // Already exists
fiTranslations.common.none = "Ei mikään";  // Already exists
fiTranslations.common.save = "Tallenna"; // Already exists
fiTranslations.common.cancel = "Peruuta"; // Already exists
fiTranslations.common.delete = "Poista"; // Already exists
fiTranslations.common.close = "Sulje"; // Already exists
fiTranslations.common.edit = "Muokkaa"; // Already exists
fiTranslations.common.scorer = "Maalintekijä"; // Already exists
fiTranslations.common.assist = "Syöttäjä"; // Already exists
fiTranslations.common.selectPlayer = "Valitse pelaaja..."; // Already exists
fiTranslations.common.noAssist = "Ei syöttäjää"; // Already exists
fiTranslations.common.goal = "Maali"; // Already exists
fiTranslations.common.opponentGoal = "Vast. Maali"; // Already exists
fiTranslations.common.type = "Tyyppi"; // Already exists
fiTranslations.common.saveError = "Virhe tallennettaessa muutoksia."; // Already exists

// <<< ADD MISSING COMMON LABELS >>>
fiTranslations.common.score = "Tulos";
fiTranslations.common.minutesShort = "min";
fiTranslations.common.hourShort = "TT";
fiTranslations.common.minuteShort = "MM";
fiTranslations.common.optional = "(Valinnainen)";
fiTranslations.common.actions = "Toiminnot"; // Event log header

if (!fiTranslations.seasonTournamentModal) {
  fiTranslations.seasonTournamentModal = {};
}
fiTranslations.seasonTournamentModal.title = "Hallinnoi Kausia & Turnauksia";
fiTranslations.seasonTournamentModal.seasons = "Kaudet";
fiTranslations.seasonTournamentModal.tournaments = "Turnaukset";
fiTranslations.seasonTournamentModal.createNew = "Luo Uusi";
fiTranslations.seasonTournamentModal.newSeasonPlaceholder = "Uuden kauden nimi...";
fiTranslations.seasonTournamentModal.newTournamentPlaceholder = "Uuden turnauksen nimi...";
fiTranslations.seasonTournamentModal.confirmDelete = "Haluatko varmasti poistaa \"{{name}}\"? Tätä ei voi perua.";

if (!fiTranslations.playerStats) {
  fiTranslations.playerStats = {};
}
fiTranslations.playerStats.title = "Pelaajan Tilastot";

if (!fiTranslations.stats) {
  fiTranslations.stats = {};
}
fiTranslations.stats.gamesPlayed = "Pelatut pelit";
fiTranslations.stats.goals = "Maalit";
fiTranslations.stats.assists = "Syötöt";
fiTranslations.stats.gameLog = "Pelihistoria";
fiTranslations.stats.vs = "vs";
fiTranslations.stats.goals_short = "M";
fiTranslations.stats.assists_short = "S";
fiTranslations.stats.noGames = "Ei pelitietoja saatavilla.";
fiTranslations.stats.perGame = "/ peli";
fiTranslations.stats.points = "Pisteet";

if (!enTranslations.playerStats) {
  enTranslations.playerStats = {};
}
enTranslations.playerStats.title = "Player Statistics";

if (!enTranslations.stats) {
  enTranslations.stats = {};
}
enTranslations.stats.gamesPlayed = "Games Played";
enTranslations.stats.goals = "Goals";
enTranslations.stats.assists = "Assists";
enTranslations.stats.gameLog = "Game Log";
enTranslations.stats.vs = "vs";
enTranslations.stats.goals_short = "G";
enTranslations.stats.assists_short = "A";
enTranslations.stats.noGames = "No game data available.";
enTranslations.stats.perGame = "/ game";
enTranslations.stats.points = "Points";

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