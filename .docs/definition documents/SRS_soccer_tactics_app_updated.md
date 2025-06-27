# Software Requirements Specification (SRS)

## System Design
- Mobile-first soccer strategy visualization app
- Interactive drag-and-drop UI with touch support
- Inline drawing support on canvas for strategy sketching
- Name visibility toggle for simplifying visuals
- Minimalist, local-only architecture—no external database

## Architecture pattern
- **Client-side SPA** using Next.js with CSR (Client Side Rendering)
- Modular component architecture
- Local storage for persistence
- Canvas-based rendering for field and drawings

## State management
- React `useState` and `useReducer` for:
  - Player positions
  - Drawing history
  - Undo/Redo stack
  - Name visibility toggle
- Context API for global access to shared state (optional)

## Data flow
- Player names initialized from `localStorage`
- Actions like add/move/draw/toggleNameVisibility trigger state updates
- Undo/Redo affects in-memory state and optionally localStorage
- Drawing and player positions never leave the client

## Technical Stack
- **Framework:** Next.js (with React 18+)
- **Canvas:** HTML5 Canvas API
- **Styling:** Tailwind CSS or CSS Modules
- **Persistence:** Browser `localStorage`
- **Optional Libraries:** 
  - `zustand` or `redux` (for state, if needed)
  - `fabric.js` (for drawing, optional)

## Authentication Process
- **None required** – single-user, offline-first application

## Route Design
- `/` : Main app interface
- No additional routes needed for MVP

## API Design
- No external API calls
- Local helper functions handle:
  - Saving/loading player names
  - Managing undo/redo history
  - Managing name visibility toggle

## Database Design ERD
- No external database
- Data structure (in-memory/localStorage):
```js
{
  players: [
    { id: "p1", name: "Jooa", x: 120, y: 240 },
    ...
  ],
  drawings: [
    { path: [...points], color: "#000" },
    ...
  ],
  showNames: true,
  history: {
    undoStack: [...],
    redoStack: [...]
  }
}
```