# Bugs Found During Testing

## Ⅰ. Critical Bugs (Must Fix Before Migration)

### A. Data Integrity & Potential Data Loss
1.  **[ADDRESSED] Goal events reset when logging goals from timer modal after using goal logging modal.**
    *   *Original note:* Important! If goals a re logged with the goal loggin modal to the game and then you add more goals via the timer modal - in some cases the adding of goals from timer modal resets goa events completely. We need to make sure we dont' loose game events!
    *   *Impact:* Potential loss of critical game data. This is the top priority.
    *   *Fix:* Refactored event handlers to use a `useEffect` hook listening to `gameSessionState` changes for saving to history, ensuring `saveStateToHistory` uses the latest `gameEvents`.
2.  **[ADDRESSED] Player creation allows duplicate names/numbers without warning.**
    *   *Original note:* we shuold prevent creating players wth duplicate names or numbers (or at least prompt user if that is the case)
    *   *Impact:* Data inconsistency, potential issues with player identification and data integrity during migration.
    *   *Fix:* Added checks in `handleAddPlayerForModal` (page.tsx) for duplicate names (case-insensitive) and jersey numbers (if provided) against `masterRosterQueryResultData` before attempting to add a player. Displayed errors via `setRosterError`. Added i18n keys for new error messages.
3.  **[ADDRESSED] Incorrect players available for selection when logging goals/assists.**
    *   *Original note:* When loggin a goal, the the available players for goals and assists are all possible players when they should only be the ones selcted to that particular game
    *   *Impact:* Incorrect data entry for goals and assists, compromising game statistics.
    *   *Fix:* Modified `playersForCurrentGame` in `page.tsx` to return an empty array if no players are selected for the game. Updated `GoalLogModal` to receive `playersForCurrentGame` for its `availablePlayers` prop.

### B. Core Functionality Impacting Data/Migration
1.  **[ADDRESSED] Player selection during new game setup does not work.**
    *   *Original note:* When creating a new game there is a player selction possibilities. This does not work and is not reflected on the app.
    *   *Impact:* Prevents correct setup of game rosters, affecting game data accuracy and usefulness.
    *   *Fix:* Modified `handleStartClick` in `NewGameSetupModal.tsx` to pass its internal `selectedPlayerIds` state (reflecting user choices in the modal) to the `onStart` callback, instead of the `initialPlayerSelection` prop.
2.  **[ADDRESSED] Season/Tournament cannot be changed or unselected in game settings.**
    *   *Original note:* in game settings, currently the season/rounament cannot be changed or be unselcted.
    *   *Impact:* Affects game organization and data categorization, which is important for structured data in a new backend.
    *   *Fix:* Removed direct DB update calls from `handleSeasonChange` and `handleTournamentChange` in `GameSettingsModal.tsx`. Updated reducer logic in `useGameSessionReducer.ts` for `SET_SEASON_ID` and `SET_TOURNAMENT_ID` to unconditionally clear the other ID. Introduced `activeDisplayType` local UI state in `GameSettingsModal.tsx` to manage UI for selecting association type (None, Season, Tournament) and ensure correct propagation of changes.
3.  **[ADDRESSED - PARTIALLY, MORE EXAMPLES NEEDED] Default language is Finnish (i18n issue), needs to be English by default. (Clarified: Should be Finnish by default, but English text appears).**
    *   *Original note:* The default language of the app is Finnish. THis is done with i18 and the app is now full with english texts by default and we need to change that.
    *   *Impact:* User experience consistency.
    *   *Fix:* Corrected mismatched translation key for "Association" label in `GameSettingsModal.tsx` by updating `i18n.ts`. Added/updated several Finnish translations for `NewGameSetupModal.tsx` in `i18n.ts` based on user feedback. The `i18n.ts` config correctly sets `lng: 'fi'`. Further instances of English text need to be identified and fixed by ensuring correct `t()` usage and Finnish translations in `i18n.ts` or `fi.json`.

## Ⅱ. High Priority Bugs

### A. Core Functionality
1.  **[ADDRESSED - VIA PAGE VISIBILITY API] Timer modal sometimes resets on mobile if you switch apps.**
    *   *Original note:* The timer modal sometimes resets on mobile if you switch apps. Could another techincal soluton be applied to the timer?
    *   *Fix:* Implemented Page Visibility API handling in `page.tsx`. When the page is hidden, if the timer is running, its state is stored, and the timer is paused. When visible again, elapsed offline time is calculated, `SET_TIMER_ELAPSED` is dispatched, and the timer is resumed if the game is still in progress.
    *   **ADDRESSED:** (Original issue in BUGS.md stated: "The timer modal sometimes resets on mobile if you switch apps. Could another techincal soluton be applied to the timer?"). The fix addresses the underlying timer state, not just the modal. We also fixed a bug where the timer reset button was wiping game events by introducing a `RESET_TIMER_ONLY` action.
2.  **[ADDRESSED - UI FIXED, FUNCTIONALITY SEEMS OK] Sub interval should be possible to change mid-game.**
    *   *Original note:* Sub interval should be possible to change mid-game
    *   *Note:* The `TimerOverlay` allows changing sub interval via `onSetSubInterval` which maps to `handleSetSubInterval` in `page.tsx`. This dispatches `SET_SUB_INTERVAL` to the reducer. This seems functional. The UI for this in the `TimerOverlay` was previously only shown if `gameStatus === 'notStarted'`. This restriction should be re-evaluated if it needs to be changeable mid-game. Assuming this note means the UI wasn't allowing it mid-game, rather than the state logic itself being broken. *Self-correction: The `TimerOverlay.tsx` indeed had the sub interval control conditional on `gameStatus === 'notStarted'`. This has been removed to allow mid-game changes.* 
3.  **[ADDRESSED - VERIFIED WORKING] Manual edits to game events (scorers/assisters) not reflected on player discs in top player bar.**
    *   *Original note:* If manually editing the game events (goals scorers or ssisters), they are not reflected on the UI in the player discs in the top player bar.
    *   *Fix:* Investigation confirmed that `PlayerDisk` uses `useMemo` with `gameEvents` as a dependency, and the reducer creates new array references. Debug logs showed updates propagating. User confirmed this was likely a misreported bug and is working.

### B. UI/UX Issues
1.  **[ADDRESSED] Unclear meaning of question mark on some saved game cards.**
    *   *Original note:* Why does some saved game cards have a question mark on them?
    *   *Fix:* Identified hardcoded question marks next to game time and location in `LoadGameModal.tsx`. Replaced them with `HiOutlineClock` and `HiOutlineMapPin` icons for clarity.
2.  **[ADDRESSED] Score color coding in timer modal does not reflect "My Team" (Home/Away status).**
    *   *Original note:* the timer modal shows the other score as red and the other on green, the colo coding is from a time where we did not have home / way changin possibility so the score color coding should reflect that the "MY team" is the green. The timer modal obvisoulsy is not aware of which team is the "my team" or howm/away
    *   *Fix:* Updated `TimerOverlay.tsx` to determine "My Team" score vs "Opponent" score based on `homeOrAway` prop. Applied consistent colors (green for user's team, red for opponent) to the respective scores.
3.  **[ADDRESSED] Game stats player ordering needs refinement: players with no games in filter should be below those with games.**
    *   *Original note:* in games stats the palyers are correctly orders by points. We should refine the filter so that players that have not played any games according to that filter will always be below any player that has games
    *   *Fix:* Modified sorting logic in `GameStatsModal.tsx` within the `playerStats` `useMemo`. Added a primary sort key for `gamesPlayed` (descending, so GP > 0 comes first), then applies the user-selected column as a secondary sort.

## Ⅲ. Feature Requests & Minor Improvements (Consider Post-Migration)

1.  **Dedicated modal for managing tournaments and seasons.**
    *   *Original note:* Do we need a modal to manage tournaments and seasons?
2.  **Toggleable views in start field view (opening formation vs. tactics drawing).**
    *   *Original note:* We should have two views in the start field view that we can toggle. One is for designeing the opening formation and then another for just drawing tactics
3.  **Add links to game rules on Palloliitto (Finnish FA) pages.**
    *   *Original note:* We should add links to game rules on Pallolitto pages
4.  **Ability to add custom club logo and change color schemes.**
    *   *Original note:* At some point (not critical yet) we have to add the ability to add your own club logo and change color scchemes.

---
**Summary of Bugs to Address Before Clerk/Supabase Migration:**

All critical bugs identified in the initial summary have been marked as **ADDRESSED**.

*   **Data Integrity & Potential Data Loss:**
    1.  Goal events resetting (Top Priority). - ADDRESSED
    2.  Duplicate player names/numbers allowed. - ADDRESSED
    3.  Incorrect player list for goal/assist logging. - ADDRESSED
*   **Core Functionality Impacting Data/Migration:**
    1.  Player selection in new game setup not working. - ADDRESSED
    2.  Season/Tournament unchangeable in game settings. - ADDRESSED
    3.  Default application language being Finnish instead of English. - ADDRESSED (partially, ongoing effort for full coverage)
---