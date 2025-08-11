# Software Requirements Specification (SRS)

## System Design
- Mobile-first PWA for roster management, live stat tracking and tactical drawing
- Interactive drag-and-drop UI with full touch support
- Inline drawing tools on the field or in a dedicated tactics board
- Scoreboard with timer, period tracking and substitution alerts
- Offline-first with multi-layer persistence (Supabase + IndexedDB cache + localStorage fallback)

## Architecture pattern
- **Next.js** App Router with primarily client components
- React 19 functional components with hooks
- **Zustand** for client state; **React Query** for async/server/cache state
- Modular component and hook architecture
- Canvas-based rendering for field and drawings

## State management
- Zustand store for core client state and UI flows
- React Query for roster, seasons, tournaments, saved games, and Supabase-backed data
- Undo/Redo stack maintained via a dedicated hook
- Context providers for modal state and toasts

## Data flow
- All data is read and written through utility functions / storage managers
- Player, game and settings data persisted via Supabase when enabled with IndexedDB cache; localStorage as fallback
- Game events update the score and player stats in real time
- Undo/Redo operations update in-memory state and history
- Core features work offline; sync occurs when online

## Technical Stack
- **Framework:** Next.js 15
- **Language:** TypeScript / React 19
- **Canvas:** HTML5 Canvas API
- **Styling:** Tailwind CSS
- **State:** Zustand + React Query
- **Persistence:** Supabase + IndexedDB cache + localStorage fallback
- **Internationalization:** i18next

## Authentication Process
- **Supabase Auth** – secure sessions with optional cloud sync

## Route Design
- `/` : Main app interface
- Auth and API routes handled by Next.js as needed

## API Design
- Supabase client for CRUD on players, seasons, tournaments, games, events, assessments
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

