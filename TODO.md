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
- [ ] Implement player addition/naming (tapping disk in the bar?).
- [ ] Implement dragging players from the bar to the field.
- [ ] Implement repositioning players already on the field.
- [ ] Implement freehand drawing on the field canvas.
- [ ] Implement Undo/Redo functionality for movements and drawings.
- [ ] Implement the "Toggle Player Names" feature.
- [ ] Implement persistence using `localStorage` for player names and potentially positions/drawings.

**Styling & Refinements**
- [ ] Apply Tailwind CSS styling according to the UID (field appearance, disk colors, controls).
- [ ] Ensure responsive design for mobile, tablet, and desktop.
- [ ] Implement visual feedback for interactions (e.g., dragging).
- [ ] Address accessibility considerations (contrast, touch target size).

**Optional/Future**
- [ ] Implement "Reset Field" functionality.
- [ ] Implement saving/loading formations. 