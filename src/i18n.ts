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
fiTranslations.newGameSetupModal.selectPlayers = "Valitse Pelaajat";
fiTranslations.newGameSetupModal.playersSelected = "valittu";
fiTranslations.newGameSetupModal.selectAll = "Valitse Kaikki";
fiTranslations.newGameSetupModal.noPlayersInRoster = "Ei pelaajia kokoonpanossa. Lisää pelaajia Joukkueen Hallinta -näkymässä.";

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
fiTranslations.gameStatsModal.tabs = {
    currentGame: "Nykyinen",
    season: "Kausi",
    tournament: "Turnaus",
    overall: "Kaikki"
};
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
fiTranslations.controlBar.exitFullscreen = "Poistu Koko Näyöltä";
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
fiTranslations.common.cancel = "Peruuta";
fiTranslations.common.clear = "Tyhjennä";
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
fiTranslations.common.save = "Tallenna";
fiTranslations.common.edit = "Muokkaa";
fiTranslations.common.remove = "Poista";
fiTranslations.common.actions = "TOIMINNOT"; // Event log header
fiTranslations.common.doneButton = "Valmis";
fiTranslations.common.player = "PELAAJA";
fiTranslations.common.assist = "Syöttö";
fiTranslations.common.filterByName = "Suodata nimellä...";
fiTranslations.common.scorer = "Maalintekijä";
fiTranslations.common.select = "Valitse...";
fiTranslations.common.none = "Ei mitään";

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
enTranslations.newGameSetupModal.noPlayersInRoster = "No players in roster. Add players in Roster Settings.";

// Add game stats modal translations for English
if (!enTranslations.gameStatsModal) {
  enTranslations.gameStatsModal = {};
}
enTranslations.gameStatsModal.title = "Game Statistics";
enTranslations.gameStatsModal.gameInfoTitle = "Game Information";
enTranslations.gameStatsModal.closeButton = "Close";
enTranslations.gameStatsModal.notesTitle = "Game Notes";
enTranslations.gameStatsModal.playerStatsTitle = "Player Statistics";
enTranslations.gameStatsModal.tabs = {
    currentGame: "Current",
    season: "Season",
    tournament: "Tournament",
    overall: "All"
};
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
enTranslations.common.clear = "Clear";
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
enTranslations.common.player = "Player";
enTranslations.common.assist = "Assist";
enTranslations.common.filterByName = "Filter by name...";
enTranslations.common.scorer = "Scorer";
enTranslations.common.select = "Select...";
enTranslations.common.none = "None";

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
fiTranslations.rosterSettingsModal.totalPlayersShort = "Pelaajaa";
fiTranslations.rosterSettingsModal.selectedPlayersShort = "Valittu";
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
fiTranslations.rosterSettingsModal.confirmAddPlayer = "Lisää Pelaaja";

// Add game settings modal translations if section doesn't exist
if (!fiTranslations.gameSettingsModal) {
  fiTranslations.gameSettingsModal = {};
}

// Add Finnish translations
fiTranslations.gameSettingsModal.title = 'Pelin Asetukset';
fiTranslations.gameSettingsModal.teamName = 'Oman Joukkueen Nimi';
fiTranslations.gameSettingsModal.teamNamePlaceholder = 'Syötä joukkueen nimi';
fiTranslations.gameSettingsModal.opponentName = 'Vastustajan Nimi';
fiTranslations.gameSettingsModal.opponentNamePlaceholder = 'Syötä vastustajan nimi';
fiTranslations.gameSettingsModal.gameInfo = 'Pelin Tiedot';
fiTranslations.gameSettingsModal.gameDateLabel = 'Pelin Päivämäärä';
fiTranslations.gameSettingsModal.gameTimeLabel = 'Aika (Vapaaehtoinen)';
fiTranslations.gameSettingsModal.hourPlaceholder = 'HH';
fiTranslations.gameSettingsModal.minutePlaceholder = 'MM';
fiTranslations.gameSettingsModal.locationLabel = 'Paikka (Vapaaehtoinen)';
fiTranslations.gameSettingsModal.locationPlaceholder = 'esim. Keskuspuiston kenttä 2';
fiTranslations.gameSettingsModal.homeOrAwayLabel = 'Koti / Vieras';
fiTranslations.gameSettingsModal.home = 'Koti';
fiTranslations.gameSettingsModal.away = 'Vieras';
fiTranslations.gameSettingsModal.periodsLabel = 'Erät';
fiTranslations.gameSettingsModal.numPeriodsLabel = 'Erien määrä';
fiTranslations.gameSettingsModal.periodDurationLabel = 'Erän pituus (minuuttia)';
fiTranslations.gameSettingsModal.linkita = 'Linkitä';
fiTranslations.gameSettingsModal.eiMitaan = 'Ei mitään';
fiTranslations.gameSettingsModal.kausi = 'Kausi';
fiTranslations.gameSettingsModal.turnaus = 'Turnaus';
fiTranslations.gameSettingsModal.selectSeason = '-- Valitse kausi --';
fiTranslations.gameSettingsModal.createSeason = 'Luo uusi kausi';
fiTranslations.gameSettingsModal.cancelCreate = 'Peruuta luonti';
fiTranslations.gameSettingsModal.newSeasonPlaceholder = 'Syötä uuden kauden nimi...';
fiTranslations.gameSettingsModal.creating = 'Luodaan...';
fiTranslations.gameSettingsModal.addButton = 'Lisää';
fiTranslations.gameSettingsModal.selectTournament = '-- Valitse turnaus --';
fiTranslations.gameSettingsModal.createTournament = 'Luo uusi turnaus';
fiTranslations.gameSettingsModal.newTournamentPlaceholder = 'Syötä uuden turnauksen nimi...';
fiTranslations.gameSettingsModal.selectPlayers = 'Valitse Pelaajat';
fiTranslations.gameSettingsModal.playersSelected = 'valittu';
fiTranslations.gameSettingsModal.selectAll = 'Valitse kaikki';
fiTranslations.gameSettingsModal.noPlayersInRoster = 'Pelaajia ei ole kokoonpanossa. Lisää pelaajia Rosterin Asetuksissa.';
fiTranslations.gameSettingsModal.eventLogTitle = 'Tapahtumaloki';
fiTranslations.gameSettingsModal.timeFormatPlaceholder = 'MM:SS';
fiTranslations.gameSettingsModal.selectScorer = 'Valitse maalintekijä...';
fiTranslations.gameSettingsModal.selectAssister = 'Valitse syöttäjä (Vapaaehtoinen)...';
fiTranslations.gameSettingsModal.unknownPlayer = 'Tuntematon pelaaja';
fiTranslations.gameSettingsModal.logTypeOpponentGoal = 'Vastustajan maali';
fiTranslations.gameSettingsModal.logTypePeriodEnd = 'Erä päättyi';
fiTranslations.gameSettingsModal.logTypeGameEnd = 'Peli päättyi';
fiTranslations.gameSettingsModal.logTypeUnknown = 'Tuntematon tapahtuma';
fiTranslations.gameSettingsModal.noGoalsLogged = 'Maaleja ei ole vielä kirjattu.';
fiTranslations.gameSettingsModal.notesTitle = 'Pelin Muistiinpanot';
fiTranslations.gameSettingsModal.notesPlaceholder = 'Kirjoita muistiinpanoja...';
fiTranslations.gameSettingsModal.noNotes = 'Ei muistiinpanoja vielä. Klikkaa lisätäksesi.';
fiTranslations.gameSettingsModal.confirmDeleteEvent = 'Haluatko varmasti poistaa tämän tapahtuman? Toimintoa ei voi kumota.';
fiTranslations.gameSettingsModal.invalidTimeFormat = 'Virheellinen aikamuoto. Käytä MM:SS.';
fiTranslations.gameSettingsModal.teamNameRequired = 'Joukkueen nimi ei voi olla tyhjä.';
fiTranslations.gameSettingsModal.opponentNameRequired = 'Vastustajan nimi ei voi olla tyhjä.';
fiTranslations.gameSettingsModal.invalidDateFormat = 'Virheellinen päivämäärämuoto. Käytä VVVV-KK-PP.';
fiTranslations.gameSettingsModal.invalidTimeFormatInline = 'Virheellinen aikamuoto. Käytä HH:MM (24h).';
fiTranslations.gameSettingsModal.invalidDurationFormat = 'Erän keston on oltava positiivinen luku.';
fiTranslations.gameSettingsModal.newSeasonNameRequired = 'Anna uudelle kaudelle nimi.';
fiTranslations.gameSettingsModal.newTournamentNameRequired = 'Anna uudelle turnaukselle nimi.';
fiTranslations.gameSettingsModal.errors = {
  missingGoalId: 'Maalin ID tai pelin ID puuttuu. Ei voi tallentaa.',
  updateFailed: 'Tapahtuman päivitys epäonnistui. Yritä uudelleen.',
  eventNotFound: 'Alkuperäistä tapahtumaa ei löytynyt tallenusta varten.',
  genericSaveError: 'Tapahtumaa tallennettaessa tapahtui odottamaton virhe.',
  missingDeleteHandler: 'Tapahtumaa ei voi poistaa: Kriittinen määritys puuttuu.',
  eventNotFoundDelete: 'Poistettavaa tapahtumaa ei löytynyt.',
  deleteFailed: 'Tapahtuman poistaminen epäonnistui. Yritä uudelleen.',
  genericDeleteError: 'Tapahtumaa poistettaessa tapahtui odottamaton virhe.',
  missingGameIdInline: 'Ei voi tallentaa: Pelin ID puuttuu.',
  genericInlineSaveError: 'Muutosten tallentamisessa tapahtui virhe. Yritä uudelleen.'
};

// Add English translations if section doesn't exist
if (!enTranslations.gameSettingsModal) {
  enTranslations.gameSettingsModal = {};
}

// Add English translations
enTranslations.gameSettingsModal.title = "Game Settings";
enTranslations.gameSettingsModal.teamName = "Your Team Name";
enTranslations.gameSettingsModal.teamNamePlaceholder = "Enter team name";
enTranslations.gameSettingsModal.opponentName = "Opponent Name";
enTranslations.gameSettingsModal.opponentNamePlaceholder = "Enter opponent name";
enTranslations.gameSettingsModal.gameInfo = "Game Info";
enTranslations.gameSettingsModal.gameDateLabel = "Game Date";
enTranslations.gameSettingsModal.gameTimeLabel = "Time (Optional)";
enTranslations.gameSettingsModal.hourPlaceholder = "HH";
enTranslations.gameSettingsModal.minutePlaceholder = "MM";
enTranslations.gameSettingsModal.locationLabel = "Location (Optional)";
enTranslations.gameSettingsModal.locationPlaceholder = "e.g., Central Park Field 2";
enTranslations.gameSettingsModal.periodsLabel = "Periods";
enTranslations.gameSettingsModal.numPeriodsLabel = "Number of Periods";
enTranslations.gameSettingsModal.periodDurationLabel = "Period Duration (minutes)";
enTranslations.gameSettingsModal.linkita = "Link";
enTranslations.gameSettingsModal.eiMitaan = "None";
enTranslations.gameSettingsModal.kausi = "Season";
enTranslations.gameSettingsModal.turnaus = "Tournament";
enTranslations.gameSettingsModal.selectSeason = "-- Select Season --";
enTranslations.gameSettingsModal.selectTournament = "-- Select Tournament --";
enTranslations.gameSettingsModal.newSeasonNameRequired = "Please enter a name for the new season.";
enTranslations.gameSettingsModal.newTournamentNameRequired = "Please enter a name for the new tournament.";
enTranslations.gameSettingsModal.newSeasonPlaceholder = "Enter new season name...";
enTranslations.gameSettingsModal.newTournamentPlaceholder = "Enter new tournament name...";
enTranslations.gameSettingsModal.creating = "Creating...";
enTranslations.gameSettingsModal.addButton = "Add";
enTranslations.gameSettingsModal.cancelCreate = "Cancel creation";
enTranslations.gameSettingsModal.createSeason = "Create new season";
enTranslations.gameSettingsModal.createTournament = "Create new tournament";
enTranslations.gameSettingsModal.selectPlayers = "Select Players";
enTranslations.gameSettingsModal.playersSelected = "selected";
enTranslations.gameSettingsModal.selectAll = "Select All";
enTranslations.gameSettingsModal.noPlayersInRoster = "No players in roster. Add players in Roster Settings.";
enTranslations.gameSettingsModal.notesTitle = "Game Notes";
enTranslations.gameSettingsModal.notesPlaceholder = "Write notes...";
enTranslations.gameSettingsModal.noNotes = "No notes yet. Click to add.";
enTranslations.gameSettingsModal.teamNameRequired = "Team name cannot be empty.";
enTranslations.gameSettingsModal.opponentNameRequired = "Opponent name cannot be empty.";
enTranslations.gameSettingsModal.invalidDateFormat = "Invalid date format. Use YYYY-MM-DD.";
enTranslations.gameSettingsModal.invalidTimeFormat = "Invalid time format. Use MM:SS";
enTranslations.gameSettingsModal.invalidTimeFormatInline = "Invalid time format. Use HH:MM (24-hour).";
enTranslations.gameSettingsModal.invalidDurationFormat = "Period duration must be a positive number.";
enTranslations.gameSettingsModal.errors = {
    missingGoalId: 'Goal ID or Game ID is missing. Cannot save.',
    updateFailed: 'Failed to update event. Please try again.',
    eventNotFound: 'Original event not found for saving.',
    genericSaveError: 'An unexpected error occurred while saving the event.',
    missingDeleteHandler: 'Cannot delete event: Critical configuration missing.',
    eventNotFoundDelete: 'Event to delete not found.',
    deleteFailed: 'Failed to delete event. Please try again.',
    genericDeleteError: 'An unexpected error occurred while deleting the event.',
    missingGameIdInline: "Cannot save: Game ID missing.",
    genericInlineSaveError: "Error saving changes. Please try again."
};

// Add Finnish translations for Fair Play Card section
fiTranslations.gameSettingsModal.fairPlayCardTitle = 'Fair Play Kortti';
fiTranslations.gameSettingsModal.fairPlayCardDescription = 'Valitse pelaaja, jolle myönnetään Fair Play kortti, tai poista nykyinen valinta.';
fiTranslations.gameSettingsModal.selectPlayerForFairPlay = '-- Valitse Pelaaja --';
fiTranslations.gameSettingsModal.currentFairPlayHolder = 'Nykyinen';
fiTranslations.gameSettingsModal.clearFairPlayCard = 'Poista Fair Play kortti';

// Add English translations for Fair Play Card section
enTranslations.gameSettingsModal.fairPlayCardTitle = 'Fair Play Card';
enTranslations.gameSettingsModal.fairPlayCardDescription = 'Select a player to award the Fair Play Card, or clear the current selection.';
enTranslations.gameSettingsModal.selectPlayerForFairPlay = '-- Select Player --';
enTranslations.gameSettingsModal.currentFairPlayHolder = 'Current';
enTranslations.gameSettingsModal.clearFairPlayCard = 'Clear Fair Play Card';

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