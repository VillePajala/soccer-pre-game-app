# Project TODO List

**Project Setup & Basic Structure**
- [x] Initialize Next.js project (TypeScript, Tailwind, App Router)
- [x] Set up Git repository and push initial commit
- [x] Create `.docs` folder and add documentation
- [x] Update `README.md`
- [x] Set up basic page structure in `app/page.tsx`

**UI Layout & Components**
- [x] Create the main layout: Full-screen field canvas, top player bar, bottom control bar.
- [x] Implement the `SoccerField` component (Canvas) - Basic structure created.
- [x] Implement the `PlayerDisk` component (draggable, named circles) - Basic structure created.
- [x] Implement the `PlayerBar` component (holds available player disks) - Basic structure created.
- [x] Implement the `ControlBar` component (buttons for actions) - Basic structure created.

**Core Functionality**
- [x] Implement player addition/naming (tapping disk in the bar?). (Inline rename done)
- [x] Implement dragging players from the bar to the field.
- [x] Implement repositioning players already on the field. (Basic mouse drag done)
- [x] Implement freehand drawing on the field canvas. (Basic implementation done)
- [x] Implement Undo/Redo functionality for movements and drawings. (Basic implementation done)
- [x] Implement the "Toggle Player Names" feature. (Basic implementation done)
- [x] Implement persistence using `localStorage` for player names and potentially positions/drawings.
- [x] Implement player removal from field (double-click).
- [x] Implement opponent markers (add/drag/remove).
- [x] Implement game timer with start/pause/reset.
- [x] Implement large timer overlay with substitution alerts and interval history.
- [x] Add static field markings (lines, circles, arcs) to canvas background.

**Styling & Refinements**
- [x] Apply Tailwind CSS styling according to the UID (field appearance, disk colors, controls).
- [x] Ensure responsive design for mobile, tablet, and desktop.
- [x] Implement visual feedback for interactions (e.g., dragging).
- [x] Improve canvas rendering (non-distorting disks, distinct drawing colors).
- [ ] Address accessibility considerations (contrast, touch target size).
- [x] Implement persistence using `localStorage`. (History and index saved)

**Optional/Future**
- [x] Implement "Reset Field" functionality.
- [x] Implement "Clear Drawings" functionality.
- [ ] Implement saving/loading formations. 
- [ ] Implement exporting field view as an image. 
- [ ] Advanced touch interaction refinement.
- [ ] Code cleanup (e.g., shared utilities). 

## Game Stats Modal Improvements

- [ ] Add Totals Row to Player Stats table (code is commented out).
- [ ] Enhanced Sorting/Filtering:
  - [x] Allow sorting Player Stats table by clicking column headers (Name, G, A, Pts). (Implemented)
  - [x] Add filter input for Player Stats table. (Implemented)
- [x] Goal Log Improvements:
  - [x] Allow editing goal log entries (scorer, assister, time). (Implemented)
  - [ ] Add filtering options to the goal log.
- [x] Add Export Functionality (JSON/CSV). (Implemented)
- [ ] Basic Visualizations (e.g., bar chart for player points).
- [ ] Track More Stats (e.g., substitutions, cards - more complex).

## Testing Plan (2024)

### Test Infrastructure Setup
- [ ] Install Jest, React Testing Library, and related dependencies
- [ ] Configure Jest for Next.js and TypeScript
- [ ] Set up GitHub Actions CI for automated testing
- [ ] Add test scripts to package.json

### Unit Tests
- [ ] Create tests for utility functions:
  - [ ] Time formatting
  - [ ] CSV/data export functions
  - [ ] Game event processing

### Component Tests
- [ ] Test critical UI components:
  - [ ] PlayerBar component
  - [ ] GameStatsModal component
  - [ ] SoccerField component
  - [ ] TimerOverlay component

### Integration Tests
- [ ] Test core workflows:
  - [ ] Game creation and setup
  - [ ] Game saving and loading
  - [ ] Player management
  - [ ] Goal logging and statistics

### Testing Guidelines
- [ ] Create test documentation for contributors
- [ ] Establish test coverage targets
- [ ] Implement pre-commit hooks for running tests

## Near-Term Enhancements (Next Iteration)

### Team Customization
- [ ] Team logo upload functionality
- [ ] Customizable color schemes
- [ ] Team-specific settings persistence

### PWA Improvements
- [ ] Enhanced offline capabilities
- [ ] Installation prompts and guides
- [ ] Home screen icon customization

### User Experience Refinements
- [ ] Onboarding tour for new users
- [ ] Contextual help tooltips
- [ ] Performance optimization for mobile devices

## Future Enhancements (Brainstorm - 2024)

### Game/Session Management
*   **Save/Load Multiple Games:** ✅ Implemented
*   **Import Game Data:** ✅ Implemented
*   **Multiple Team Support:** Allow managing multiple teams in one app

### Enhanced Statistics & Tracking
*   **Player On-Pitch Time Calculation:** Track and display the total time each player was on the field during the match.
*   **Log More Event Types:** Consider adding logging for corners, shots, fouls, etc.
*   **Visual Event Timeline:** Display game events (goals) on a visual timeline relative to game duration in the stats modal.
*   **Team Season Statistics:** Track performance across multiple games/season

### Tactics Board Improvements
*   **Ball Marker:** Add a draggable ball marker.
*   **Advanced Drawing:** Arrows, basic shapes, different colors for drawings.
*   **Formation Templates:** Quick buttons to set common formations.
*   **Save/Load Formations:** Save/load player positional arrangements independently.
*   **Animation Tools:** Simple movement animations for explaining tactics

### UI/UX Refinements
*   **Player Bar Status Indication:** Visually differentiate players on the field vs. available in the top bar.
*   **Responsive Design Review:** Thoroughly check modal layouts (Timer, Stats) on smaller mobile screens.
*   **Accessibility Audit:** Review color contrast, keyboard navigation, and screen reader support. 
*   **Localization Expansion:** Support for additional languages 