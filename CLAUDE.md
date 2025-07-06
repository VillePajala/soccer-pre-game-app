# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server (Next.js)
- `npm run build` - Build for production (includes manifest generation)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run all Jest tests
- `npm run test:unit` - Run unit tests specifically

### Build Process
The build process includes a custom manifest generation step that runs before Next.js build:
- `node scripts/generate-manifest.mjs` - Generates PWA manifest based on branch
- Manifest configuration varies by branch (master vs development) for different app names and themes

## Architecture Overview

### Tech Stack
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **PWA** with custom service worker
- **Browser localStorage** for data persistence
- **React Query** for state management
- **i18next** for internationalization (English/Finnish)

### Core Architecture

**Data Flow**: The app uses a combination of localStorage for persistence and React state for UI reactivity. The main state is managed in `src/app/page.tsx` with a custom hook `useGameState` that handles field interactions.

**PWA Structure**: The app is a full PWA with:
- Custom service worker (`public/sw.js`)
- Dynamic manifest generation based on git branch
- Install prompts and update notifications

**State Management**: 
- Main app state in `src/app/page.tsx` 
- Game state hook in `src/hooks/useGameState.ts`
- Game session reducer in `src/hooks/useGameSessionReducer.ts`
- Master roster management in `src/utils/masterRosterManager.ts`

**Key Components**:
- `SoccerField` - Interactive drag-and-drop field
- `PlayerBar` - Player roster management
- `ControlBar` - Main app controls
- Various modals for game settings, stats, and management

**Data Persistence**: All data is stored in browser localStorage with async wrappers in `src/utils/localStorage.ts`. Key data includes:
- Player roster (`src/utils/masterRosterManager.ts`)
- Game saves (`src/utils/savedGames.ts`)
- Seasons and tournaments (`src/utils/seasons.ts`, `src/utils/tournaments.ts`)
- App settings (`src/utils/appSettings.ts`)

**Testing**: Jest with React Testing Library, configured for Next.js with custom setup in `jest.config.js`

## Key Files to Understand

- `src/app/page.tsx` - Main app component with primary state management
- `src/hooks/useGameState.ts` - Field interaction and game state logic
- `src/types/index.ts` - Core TypeScript interfaces (Player, Season, Tournament)
- `src/utils/masterRosterManager.ts` - Player roster CRUD operations
- `src/components/SoccerField.tsx` - Interactive field with drag-and-drop
- `src/utils/localStorage.ts` - Async localStorage wrapper utilities

## Development Notes

### Data Storage
All data is stored in browser localStorage. The app includes backup/restore functionality through `src/utils/fullBackup.ts`.

### Internationalization
The app supports English and Finnish with i18next. Translation files are in `src/locales/` and `public/locales/`.

### PWA Features
The app includes install prompts, update notifications, and works offline. The service worker is updated during build to trigger cache updates.

### Testing Strategy
- Unit tests for utilities and components
- Test files are co-located with source files (`.test.tsx` suffix)
- Jest configuration excludes Playwright specs in `/tests/` directory