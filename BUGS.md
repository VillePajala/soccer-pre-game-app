# Bugs Found During Testing

## Ⅰ. Critical Bugs (Must Fix Before Migration)

### A. Data Integrity & Potential Data Loss
1.  **[CRITICAL] Goal events reset when logging goals from timer modal after using goal logging modal.**
    *   *Original note:* Important! If goals a re logged with the goal loggin modal to the game and then you add more goals via the timer modal - in some cases the adding of goals from timer modal resets goa events completely. We need to make sure we dont' loose game events!
    *   *Impact:* Potential loss of critical game data. This is the top priority.
2.  **Player creation allows duplicate names/numbers without warning.**
    *   *Original note:* we shuold prevent creating players wth duplicate names or numbers (or at least prompt user if that is the case)
    *   *Impact:* Data inconsistency, potential issues with player identification and data integrity during migration.
3.  **Incorrect players available for selection when logging goals/assists.**
    *   *Original note:* When loggin a goal, the the available players for goals and assists are all possible players when they should only be the ones selcted to that particular game
    *   *Impact:* Incorrect data entry for goals and assists, compromising game statistics.

### B. Core Functionality Impacting Data/Migration
1.  **Player selection during new game setup does not work.**
    *   *Original note:* When creating a new game there is a player selction possibilities. This does not work and is not reflected on the app.
    *   *Impact:* Prevents correct setup of game rosters, affecting game data accuracy and usefulness.
2.  **Season/Tournament cannot be changed or unselected in game settings.**
    *   *Original note:* in game settings, currently the season/rounament cannot be changed or be unselcted.
    *   *Impact:* Affects game organization and data categorization, which is important for structured data in a new backend.
3.  **Default language is Finnish (i18n issue), needs to be English by default.**
    *   *Original note:* The default language of the app is Finnish. THis is done with i18 and the app is now full with english texts by default and we need to change that.
    *   *Impact:* User experience for the majority of users; ensures consistency before any backend integration that might involve language settings.

## Ⅱ. High Priority Bugs

### A. Core Functionality
1.  **Timer modal sometimes resets on mobile if you switch apps.**
    *   *Original note:* The timer modal sometimes resets on mobile if you switch apps. Could another techincal soluton be applied to the timer?
2.  **Sub interval should be possible to change mid-game.**
    *   *Original note:* Sub interval should be possible to change mid-game
3.  **Manual edits to game events (scorers/assisters) not reflected on player discs in top player bar.**
    *   *Original note:* If manually editing the game events (goals scorers or ssisters), they are not reflected on the UI in the player discs in the top player bar.

### B. UI/UX Issues
1.  **Unclear meaning of question mark on some saved game cards.**
    *   *Original note:* Why does some saved game cards have a question mark on them?
    *   *Note:* Investigate if this indicates an underlying data issue; if so, elevate priority.
2.  **Score color coding in timer modal does not reflect "My Team" (Home/Away status).**
    *   *Original note:* the timer modal shows the other score as red and the other on green, the colo coding is from a time where we did not have home / way changin possibility so the score color coding should reflect that the "MY team" is the green. The timer modal obvisoulsy is not aware of which team is the "my team" or howm/away
3.  **Game stats player ordering needs refinement: players with no games in filter should be below those with games.**
    *   *Original note:* in games stats the palyers are correctly orders by points. We should refine the filter so that players that have not played any games according to that filter will always be below any player that has games

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

The following bugs are critical to resolve before migrating to Clerk/Supabase to ensure data integrity, correct core functionality related to data, and a stable foundation:

*   **Data Integrity & Potential Data Loss:**
    1.  Goal events resetting (Top Priority).
    2.  Duplicate player names/numbers allowed.
    3.  Incorrect player list for goal/assist logging.
*   **Core Functionality Impacting Data/Migration:**
    1.  Player selection in new game setup not working.
    2.  Season/Tournament unchangeable in game settings.
    3.  Default application language being Finnish instead of English.
---