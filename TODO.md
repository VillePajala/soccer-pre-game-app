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