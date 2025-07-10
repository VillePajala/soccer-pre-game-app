# Software Requirements Specification (SRS)

## System Design
- Mobile-first PWA for roster management, live stat tracking and tactical drawing
- Interactive drag-and-drop UI with full touch support
- Inline drawing tools on the field or in a dedicated tactics board
- Scoreboard with timer, period tracking and substitution alerts
- Works completely offline using browser `localStorage`

## Architecture pattern
- **Next.js** App Router with primarily client components
- React 19 functional components with hooks
- TanStack Query for data loading from localStorage
- Modular component and hook architecture
- Canvas-based rendering for field and drawings

## State management
- React `useState` and `useReducer` with custom hooks
- TanStack Query caching for roster, seasons, tournaments and saved games
- Undo/Redo stack maintained via a dedicated hook
- Context providers for modal state and toasts

## Data flow
- All data is read and written through utility functions
- Player, game and settings data persisted in `localStorage`
- Game events update the score and player stats in real time
- Undo/Redo operations update in-memory state and history
- No network requests are required for core features

## Technical Stack
- **Framework:** Next.js 15
- **Language:** TypeScript / React 19
- **Canvas:** HTML5 Canvas API
- **Styling:** Tailwind CSS
- **State:** React hooks with TanStack Query
- **Persistence:** Browser `localStorage`
- **Internationalization:** i18next

## Authentication Process
- **None** – single user, offline first

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

