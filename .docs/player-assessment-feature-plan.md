# Player Assessment Modal Incremental Implementation Plan

## 1. Review Existing Docs & Code
- The roadmap mentions adding a modal with ten sliders for rating players and generating player profiles【F:.docs/TODO.md†L196-L203】.
- The detailed design document describes storing evaluations in `AppState` and displaying them in a new modal accessible after a game【F:.docs/player-performance-assessment-modal-plan.md†L7-L21】.

## 2. Extend Data Model
1. Add `PlayerAssessment` interface matching the Firestore model:
   ```ts
   interface PlayerAssessment {
     overall: number;
     sliders: { intensity: number; courage: number; duels: number; technique: number; creativity: number; decisions: number; awareness: number; teamwork: number; fair_play: number; impact: number; };
     notes: string;
     minutesPlayed: number;
     createdAt: FirebaseTimestamp;
     createdBy: string;
   }
   ```
2. Update `AppState` to include optional `assessments?: { [playerId: string]: PlayerAssessment }` as described in the design doc【F:.docs/player-performance-assessment-modal-plan.md†L16-L18】.
3. Add this structure to the Firestore game schema under `/games/{gameId}`【F:.docs/player-performance-assessment-modal-plan.md†L26-L35】.

## 3. Modal UI Components
1. Create reusable components:
   - `OverallRatingSelector` – segmented buttons 1‒10.
   - `AssessmentSlider` – vertical slider with ±0.5 step.
   - Multiline notes `TextInput` with character count.
2. Build `PlayerAssessmentCard` showing player avatar, name, jersey number, goal/assist counts and status icon.
3. Follow modal styling rules in `.docs/STYLE_GUIDE.md` for container, header, body and footer classes.
4. When a card expands, render the sliders and Save button. Disable Save until all fields are valid (ratings filled, notes ≤280 chars).

## 4. Player Assessment Modal
1. Create `PlayerAssessmentModal` that lists `selectedPlayerIds` in collapsed cards.
2. Header displays progress: “Assessed n/total players”. Show ✔ when all players saved.
3. Saving a card calls `updateDoc` (merge) for that player’s assessment and collapses the card. Unsaved cards remain marked ✖.
4. Closing the modal leaves unsaved cards untouched.
5. Derive `minutesPlayed` from existing game events when saving.

## 5. Application State & Hooks
1. Add modal open state to `ModalProvider` similar to other modals.
2. Provide a hook `usePlayerAssessments(gameId)` to read and update assessments in Firestore/local storage.
3. Include validation helpers for rating ranges.

## 6. Integration Points
1. Add **Assess Players** button on the game screen (e.g., ControlBar or GameStatsModal) visible after a game ends.
2. Update translations (`public/locales/*/common.json`) with new keys for modal text and tooltips. Run `npm run generate:i18n-types` when translation files change.
3. Show aggregated ratings in `PlayerStatsView` under a “Performance Ratings” section as suggested in the design doc【F:.docs/player-performance-assessment-modal-plan.md†L40-L44】.

## 7. Testing Strategy
1. Add unit tests for `usePlayerAssessments` and for each new component’s basic rendering and validation logic.
2. Extend integration tests to open the modal, save an assessment and ensure it persists in local storage/Firestore.
3. Update manual testing checklist to include opening the Player Assessment modal and saving ratings.

## 8. Incremental Delivery Steps
1. **Data layer** – implement `PlayerAssessment` type, AppState updates and Firestore helpers. ✅
2. **Modal skeleton** – create modal component with simple Save per player, using dummy sliders. ✅
3. **UI components** – build sliders and rating selector, integrate into cards. ✅
4. **Persistence** – wire up `updateDoc` and local state with validation. ✅
5. **Statistics integration** – display averages in PlayerStatsView and GameStatsModal. ✅
6. **Polish & translations** – finalize tooltips, accessibility labels and translation keys. ✅
7. **Testing & docs** – add unit/integration tests and update documentation. ✅

### Manual Testing Suggestions
- Open a finished game and select **Assess Players** from the menu. Verify the modal appears and each card expands/collapses with a tooltip.
- Enter slider values and notes for a player, press **Save** and confirm the header progress updates.
- Close and reopen the modal to ensure saved players show a check mark and notes persist.
- Open Player Stats and verify averages appear after saving assessments.
- Check Game Stats modal shows team rating averages.
